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
  getUserCredits,
  getUserSessions,
} from "@/lib/dynamodb";
import { generateAIResponse } from "@/lib/huggingface-streaming";
import { createAgenticHandler, type AgenticHandler } from "@/lib/components/agentic-handler";
import type { AgenticMemoryManager } from "@/lib/components/agentic-memory-manager";
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

  // Send a message and get AI response (using new agentic system)
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

      // Check credits first
      const credits = await getUserCredits(userId);
      if (credits.credits < CREDITS_PER_MESSAGE) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits",
        });
      }

      // Get user for name info
      const user = await getUser(userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND", 
          message: "User not found",
        });
      }

      // Get or create conversation
      let conversation = await getConversation(userId, sessionId);
      if (!conversation) {
        await createConversation(userId, sessionId);
        conversation = await getConversation(userId, sessionId);
      }

      // Create agentic handler with optimized settings
      const agenticHandler = createAgenticHandler({
        model: "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2",
        temperature: 0.85,
        maxTokens: 800,
        useStreaming: true,
      });

      // Initialize agentic handler with user context
      await agenticHandler.initialize(userId, sessionId);

      // Get recent messages for conversation history
      const recentMessages = await getMessages(
        userId,
        sessionId,
        MAX_HISTORY_LENGTH,
      );

      // Format messages for agentic system
      const conversationHistory: Message[] = recentMessages.map((msg) => ({
        id: msg.id || nanoid(),
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
        metadata: msg.metadata,
      }));

      // Add current user message to history
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      conversationHistory.push(userMessage);

      // Save user message to database
      await saveMessage(userId, sessionId, "user", message, {
        timestamp: userMessage.timestamp,
      });

      // Deduct credits BEFORE processing AI response (prevents negative credits)
      await updateUserCredits(userId, CREDITS_PER_MESSAGE);

      console.log(`🤖 Generating agentic AI response for user: ${userId}`);

      // Generate AI response using agentic system
      const aiResponse = await agenticHandler.generateResponse(
        message,
        conversationHistory
      );

      // Combine all message bursts into a single response for storage
      const fullResponse = aiResponse.bursts.map((b) => b.text).join(" ");

      // Save AI response to database
      await saveMessage(userId, sessionId, "assistant", fullResponse, {
        bursts: aiResponse.bursts,
        timestamp: new Date().toISOString(),
      });

      // Get updated memory context for analytics
      const agenticContext = agenticHandler.getContext();

      // Track analytics
      await trackAnalytics(userId, "message_sent", {
        sessionId,
        messageLength: message.length,
        responseLength: fullResponse.length,
        agenticSystem: true,
        relationshipStage: agenticContext.relationship_stage,
        creditsUsed: CREDITS_PER_MESSAGE,
      });

      console.log(`✅ Agentic response completed for user: ${userId}`);

      return {
        response: aiResponse.bursts,
        creditsRemaining: credits.credits - CREDITS_PER_MESSAGE,
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

  // Get user's recent sessions
  getUserSessions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const sessions = await getUserSessions(userId, input.limit);

      return {
        sessions: sessions.map((session) => ({
          sessionId: session.sessionId,
          createdAt: session.createdAt,
          lastMessageAt: session.lastMessageAt,
          messageCount: session.messageCount || 0,
        })),
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
      relationshipStage: personalityState?.relationshipStage || "comfortable",
      interactionCount: personalityState?.interactionCount || 0,
      personalityTraits: personalityState?.traits || getDefaultTraits(),
    };
  }),

  // Legacy sendMessage for fallback (using old streaming system)
  sendMessageLegacy: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
        sessionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { message, sessionId } = input;

      // Check credits first
      const credits = await getUserCredits(userId);
      if (credits.credits < CREDITS_PER_MESSAGE) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits",
        });
      }

      // Get user for name info
      const user = await getUser(userId);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND", 
          message: "User not found",
        });
      }

      // Get or create conversation
      let conversation = await getConversation(userId, sessionId);
      if (!conversation) {
        await createConversation(userId, sessionId);
        conversation = await getConversation(userId, sessionId);
      }

      // Get recent messages for context
      const recentMessages = await getMessages(
        userId,
        sessionId,
        MAX_HISTORY_LENGTH,
      );

      // Build basic conversation context (legacy format)
      const context: ConversationContext = {
        userId,
        sessionId,
        userName: user.name,
        relationshipState: {
          stage: "comfortable",
          interactionCount: conversation?.messageCount || 0,
          positiveInteractions: 0,
          negativeInteractions: 0,
          trustLevel: 0.7,
          intimacyLevel: 0.6,
          communicationQuality: 0.8,
          sexualChemistry: 0.5,
          emotionalBond: 0.7,
          milestones: [],
          significantMoments: [],
        },
        personalityState: getDefaultTraits(),
        recentTopics: [],
        unfinishedTopics: [],
        insideJokes: [],
        userPreferences: {},
        emotionalMoments: [],
        timePeriod: "evening",
        energyLevel: "medium",
      };

      // Save user message
      await saveMessage(userId, sessionId, "user", message, {
        timestamp: new Date().toISOString(),
      });

      // Deduct credits BEFORE processing
      await updateUserCredits(userId, CREDITS_PER_MESSAGE);

      // Format messages for Hugging Face
      const formattedMessages = recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      formattedMessages.push({
        role: "user",
        content: message,
      });

      // Generate AI response using legacy streaming
      const aiResponse = await generateAIResponse(formattedMessages, context);

      // Combine all message bursts into a single response
      const fullResponse = aiResponse.bursts.map((b) => b.text).join(" ");

      // Save AI response
      await saveMessage(userId, sessionId, "assistant", fullResponse, {
        bursts: aiResponse.bursts,
        timestamp: new Date().toISOString(),
      });

      // Track analytics
      await trackAnalytics(userId, "message_sent", {
        sessionId,
        messageLength: message.length,
        responseLength: fullResponse.length,
        agenticSystem: false,
        creditsUsed: CREDITS_PER_MESSAGE,
      });

      return {
        response: aiResponse.bursts,
        creditsRemaining: credits.credits - CREDITS_PER_MESSAGE,
        emotionalContext: aiResponse.emotionalContext,
        relationshipUpdate: aiResponse.relationshipUpdate,
      };
    }),

  // Get current credits
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const credits = await getUserCredits(userId);
    const user = await getUser(userId);

    return {
      credits: credits?.credits || 0,
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
