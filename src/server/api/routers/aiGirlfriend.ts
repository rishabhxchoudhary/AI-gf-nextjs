import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  getUser,
  getUserWithCredits,
  createUser,
  updateUserCredits,
  createConversation,
  getConversation,
  saveMessage,
  getMessages,
  getPersonalityState,
  updatePersonalityState,
  trackAnalytics,
} from "@/lib/dynamodb";
import { generateAIResponse } from "@/lib/huggingface-streaming";
import { AgenticMemoryManager } from "@/lib/components/memory-manager";
import {
  getCurrentTimePeriod,
  getEnergyLevel,
} from "@/lib/components/temporal-engine";
import type {
  ConversationContext,
  Message,
  RelationshipState,
  PersonalityTraits,
} from "@/types/ai-girlfriend";

const CREDITS_PER_MESSAGE = 1;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_LENGTH = 20;
const SILENCE_CHECK_SECONDS = 45;
const DEFAULT_TEMPERATURE = 0.9;

export const aiGirlfriendRouter = createTRPCRouter({
  // Initialize user if they don't exist
  initializeUser: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const email = ctx.session.user.email || "";
    const name = ctx.session.user.name || "User";

    // Check if user exists
    let user = await getUserWithCredits(userId);

    if (!user) {
      // Create new user with 100 free credits
      await createUser(userId, email, name);
      user = await getUserWithCredits(userId);

      // Track analytics
      await trackAnalytics(userId, "user_created", {
        email,
        name,
        initialCredits: 100,
      });
    }

    return {
      user,
      isNew: !user,
    };
  }),

  // Start a new chat session
  startSession: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const sessionId = nanoid();

    // Create conversation record
    await createConversation(userId, sessionId);

    // Track analytics
    await trackAnalytics(userId, "session_start", {
      sessionId,
      timestamp: new Date().toISOString(),
    });

    return {
      sessionId,
      startedAt: new Date().toISOString(),
    };
  }),

  // Send a message and get AI response
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { message, sessionId } = input;

      // Get user and check credits
      const user = await getUserWithCredits(userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.credits < CREDITS_PER_MESSAGE) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits",
        });
      }

      // Get or create conversation
      let conversation = await getConversation(userId, sessionId);
      if (!conversation) {
        await createConversation(userId, sessionId);
        conversation = await getConversation(userId, sessionId);
      }

      // Initialize memory manager for this user
      const memoryManager = new AgenticMemoryManager();

      // Load user's personality state from DB
      const personalityState = await getPersonalityState(userId);

      // Set memory manager state
      if (personalityState) {
        memoryManager.personalityManager.fromDict(personalityState);
        memoryManager.memory.user_name = user.name;
      }

      // Get recent messages for context
      const recentMessages = await getMessages(
        userId,
        sessionId,
        MAX_HISTORY_LENGTH,
      );

      // Analyze and update memory from user message
      memoryManager.analyzeAndUpdateFromText(message, {
        user_initiated: true,
        message_count: conversation?.messageCount || 0,
      });

      // Build conversation context using memory manager
      const context = memoryManager.getAgenticContext();

      // Override with current session info
      context.userId = userId;
      context.sessionId = sessionId;

      // Get temporal context
      const temporalEngine = memoryManager.temporalEngine;
      const timePeriod = temporalEngine.getCurrentTimePeriod();
      // Context is already built by memory manager

      // Save user message
      await saveMessage(userId, sessionId, "user", message, {
        timestamp: new Date().toISOString(),
      });

      // Format messages for Hugging Face (matching Python)
      const formattedMessages = recentMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add current user message
      formattedMessages.push({
        role: "user",
        content: message,
      });

      // Generate AI response using streaming Hugging Face (matching Python)
      const aiResponse = await generateAIResponse(formattedMessages, context);

      // Combine all message bursts into a single response
      const fullResponse = aiResponse.bursts.map((b) => b.text).join(" ");

      // Save AI response
      await saveMessage(userId, sessionId, "assistant", fullResponse, {
        bursts: aiResponse.bursts,
        emotionalContext: aiResponse.emotionalContext,
        timestamp: new Date().toISOString(),
      });

      // Update user credits
      await updateUserCredits(userId, CREDITS_PER_MESSAGE);

      // Update personality state and save to database
      if (aiResponse.personalityUpdate) {
        const updatedState = {
          ...personalityState,
          traits: {
            ...personalityState.traits,
            ...aiResponse.personalityUpdate,
          },
          interactionCount: (personalityState.interactionCount || 0) + 1,
          recentTopics: memoryManager.conversation_themes.slice(-10),
          unfinishedTopics: memoryManager.unresolved_topics,
          insideJokes: memoryManager.insideJokes,
          userPreferences: memoryManager.userPreferences,
          emotionalMoments: memoryManager.emotional_moments,
          cumSessions: memoryManager.cumSessions,
          lastCumTime: memoryManager.lastCumTime,
        };
        await updatePersonalityState(userId, updatedState);
      }

      // Save memory state
      memoryManager.addConversationEntry("You", message);
      memoryManager.addConversationEntry("Aria", fullResponse, {
        bursts: aiResponse.bursts,
        emotionalContext: aiResponse.emotionalContext,
      });
      memoryManager.saveData();

      // Track analytics
      await trackAnalytics(userId, "message_sent", {
        sessionId,
        messageLength: message.length,
        responseLength: fullResponse.length,
        emotionalContext: aiResponse.emotionalContext,
        creditsUsed: CREDITS_PER_MESSAGE,
      });

      return {
        response: aiResponse.bursts,
        creditsRemaining: user.credits - CREDITS_PER_MESSAGE,
        emotionalContext: aiResponse.emotionalContext,
        relationshipUpdate: aiResponse.relationshipUpdate,
      };
    }),

  // Get conversation history
  getConversationHistory: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const messages = await getMessages(userId, input.sessionId, input.limit);

      return {
        messages,
        sessionId: input.sessionId,
      };
    }),

  // Get user profile and credits
  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await getUserWithCredits(userId);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const personalityState = await getPersonalityState(userId);

    return {
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        credits: user.credits,
        totalCreditsUsed: user.totalCreditsUsed,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        messageCount: user.messageCount,
        sessionCount: user.sessionCount,
      },
      relationshipStage: personalityState.relationshipStage || "new",
      interactionCount: personalityState.interactionCount || 0,
      personalityTraits: personalityState.traits || getDefaultTraits(),
    };
  }),

  // Get current credits
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await getUserWithCredits(userId);

    return {
      credits: user?.credits || 0,
      subscriptionStatus: user?.subscriptionStatus || "free",
    };
  }),

  // End chat session
  endSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Track analytics
      await trackAnalytics(userId, "session_end", {
        sessionId: input.sessionId,
        timestamp: new Date().toISOString(),
      });

      return {
        sessionId: input.sessionId,
        endedAt: new Date().toISOString(),
      };
    }),

  // Add credits (for testing - in production this would be handled by payment processor)
  addCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // This is a simplified version - in production, this would be tied to payment processing
      const user = await getUserWithCredits(userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Add credits (negative value to increase)
      await updateUserCredits(userId, -input.amount);

      await trackAnalytics(userId, "credits_added", {
        amount: input.amount,
        timestamp: new Date().toISOString(),
      });

      return {
        newBalance: user.credits + input.amount,
      };
    }),
});

// Helper function for default personality traits
function getDefaultTraits(): PersonalityTraits {
  return {
    confidence: 0.7,
    romantic_intensity: 0.8,
    playfulness: 0.6,
    vulnerability: 0.4,
    assertiveness: 0.5,
    curiosity: 0.6,
    empathy: 0.7,
    spontaneity: 0.5,
    possessiveness: 0.3,
    loyalty: 0.8,
    sensuality: 0.8,
    intelligence: 0.7,
    humor: 0.6,
    emotional_intensity: 0.7,
    independence: 0.5,
  };
}
