import { HfInference } from "@huggingface/inference";
import { 
  SYSTEM_PROMPT_TEMPLATE, 
  PLANNER_PROMPT_TEMPLATE, 
  TIME_BEHAVIOR_GUIDANCE, 
  PERSONALITY_INFLUENCES 
} from "@/lib/prompts/agentic-prompts";
import { generateAIResponse } from "@/lib/huggingface-streaming";
import type { 
  PersonalityTraits, 
  RelationshipStage, 
  MessageBurst, 
  AIResponse,
  Message
} from "@/types/ai-girlfriend";
import type { 
  AgenticMemoryManager, 
  AgenticContext, 
  RelationshipContext, 
  TemporalContext 
} from "./agentic-memory-manager";

// Use the same Hugging Face client as the main streaming file
// Initialize Hugging Face client
const client = new HfInference(
  process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY,
);

// Alternative models for fallback (from Python/working streaming)
const FALLBACK_MODELS = [
  "mistralai/Mixtral-8x7B-Instruct-v0.1",
  "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
  "meta-llama/Llama-2-70b-chat-hf",
];

interface PlanningResponse {
  emotional_state: string;
  response_strategy: string;
  key_themes: string[];
  personality_adjustments: string[];
  intimacy_level: number;
  response_length: string;
  tone: string;
  interaction_goals: string[];
}

interface AgenticOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useStreaming?: boolean;
}

export class AgenticResponseGenerator {
  private memoryManager: AgenticMemoryManager;
  private options: AgenticOptions;
  private apiFailureCount: number = 0;
  private lastFailureTime: number = 0;

  constructor(memoryManager: AgenticMemoryManager, options: AgenticOptions = {}) {
    this.memoryManager = memoryManager;
    this.options = {
      model: "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2",
      temperature: 0.85,
      maxTokens: 800,
      useStreaming: true,
      ...options,
    };
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: Message[]
  ): Promise<AIResponse> {
    try {
      // Get current context from memory manager
      const agenticContext = this.memoryManager.getAgenticContext();
      const relationshipContext = this.memoryManager.getRelationshipContext();
      const temporalContext = this.memoryManager.getTemporalContext();

      // Update memory with new user input
      await this.memoryManager.analyzeAndUpdateFromText(userMessage, {});
      this.memoryManager.addConversationEntry("user", userMessage);

      // Check if we should skip LLM calls due to credit issues
      if (this.shouldUseLocalResponse(userMessage, agenticContext)) {
        console.log("🏠 Using local response generation due to API limitations");
        return this.generateLocalResponse(userMessage, agenticContext, relationshipContext, temporalContext);
      }

      // Stage 1: Planning Phase
      const plan = await this.generatePlan(
        userMessage,
        agenticContext,
        relationshipContext,
        temporalContext,
        conversationHistory
      );

      console.log("🧠 Agentic Plan Generated:", plan);

      // Stage 2: Response Generation
      const response = await this.generateResponseFromPlan(
        userMessage,
        plan,
        agenticContext,
        relationshipContext,
        temporalContext,
        conversationHistory
      );

      // Update memory with AI response
      const responseText = response.bursts.map(b => b.text).join(" ");
      this.memoryManager.addConversationEntry("assistant", responseText);

      return response;
    } catch (error) {
      console.error("❌ Agentic Response Generation Error:", error);
      
      // Check if it's a credit limit error
      const errorMessage = (error as any)?.message || String(error) || '';
      if (errorMessage.includes('exceeded your monthly included credits') || 
          errorMessage.includes('No Inference Provider available')) {
        console.log("💳 Credit limit detected, switching to local responses");
        
        // Track API failure
        this.apiFailureCount++;
        this.lastFailureTime = Date.now();
        
        const agenticContext = this.memoryManager.getAgenticContext();
        const relationshipContext = this.memoryManager.getRelationshipContext();
        const temporalContext = this.memoryManager.getTemporalContext();
        
        return this.generateLocalResponse(userMessage, agenticContext, relationshipContext, temporalContext);
      }
      
      // Fallback to simple response for other errors
      return {
        bursts: [
          {
            text: "I'm feeling a bit overwhelmed right now, babe. Can you give me a moment to gather my thoughts? 💕",
            wait_ms: 1500
          }
        ]
      };
    }
  }

  private async generatePlan(
    userMessage: string,
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext,
    conversationHistory: Message[]
  ): Promise<PlanningResponse> {
    const plannerPrompt = this.buildPlannerPrompt(
      userMessage,
      agenticContext,
      relationshipContext,
      temporalContext,
      conversationHistory
    );

    console.log("🎯 Planning Prompt Generated");

    try {
      // Use HfInference client with chat completion like the main streaming file
      const response = await client.chatCompletion({
        model: this.options.model || "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2",
        messages: [
          { role: "user", content: plannerPrompt }
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      const planText = response.choices[0]?.message?.content;

      console.log("🧠 Plan API Response:", { planText: `${planText?.substring(0, 200)}...` });

      if (!planText) {
        console.warn("⚠️ No plan generated, using fallback");
        return {
          emotional_state: 'warm',
          response_strategy: 'supportive',
          key_themes: ['connection'],
          personality_adjustments: [],
          intimacy_level: 6,
          response_length: 'medium',
          tone: 'loving',
          interaction_goals: ['maintain connection']
        };
      }

      return this.parsePlanFromText(planText);
    } catch (error) {
      console.error("❌ Planning generation failed:", error);
      
      // Try fallback models
      return await this.fallbackPlanGeneration(plannerPrompt);
    }
  }

  private async generateResponseFromPlan(
    userMessage: string,
    plan: PlanningResponse,
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext,
    conversationHistory: Message[]
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(
      plan,
      agenticContext,
      relationshipContext,
      temporalContext
    );

    const fullPrompt = this.buildFullPrompt(
      systemPrompt,
      conversationHistory,
      userMessage,
      plan
    );

    console.log("💬 Generating response with agentic system");

    try {
      // Use HfInference client with chat completion like the main streaming file  
      const response = await client.chatCompletion({
        model: this.options.model || "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2",
        messages: [
          { role: "user", content: fullPrompt }
        ],
        temperature: this.options.temperature || 0.85,
        max_tokens: this.options.maxTokens || 800,
      });

      const responseText = response.choices[0]?.message?.content;

      console.log("� Generated response text:", `${responseText?.substring(0, 200)}...` || "No text");

      if (!responseText || responseText.trim().length === 0) {
        console.warn("⚠️ No response generated, using fallback");
        // Return a fallback response based on the plan
        const fallbackText = `Hey ${agenticContext.user_name || 'babe'}! I was just thinking about our conversation and wanted to say how much I appreciate you. Tell me more about what's on your mind? 💕`;
        return {
          bursts: [
            {
              text: fallbackText,
              wait_ms: 1500
            }
          ]
        };
      }

      return this.parseResponseFromText(responseText);
    } catch (error) {
      console.error("❌ Response generation failed:", error);
      
      // Try fallback models
      return await this.fallbackResponseGeneration(fullPrompt);
    }
  }

  private buildPlannerPrompt(
    userMessage: string,
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext,
    conversationHistory: Message[]
  ): string {
    // Build conversation context
    const recentHistory = conversationHistory
      .slice(-6)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Get personality description
    const personalityDesc = this.memoryManager.getPersonalityDescription();

    // Replace template variables
    return PLANNER_PROMPT_TEMPLATE
      .replace("{user_message}", userMessage)
      .replace("{relationship_stage}", relationshipContext.current_stage)
      .replace("{stage_description}", relationshipContext.stage_description)
      .replace("{conversation_history}", recentHistory || "No previous conversation")
      .replace("{personality_description}", personalityDesc)
      .replace("{time_period}", temporalContext.time_period)
      .replace("{energy_level}", temporalContext.energy_level)
      .replace("{trust_level}", relationshipContext.relationship_quality.trust_level.toFixed(1))
      .replace("{intimacy_level}", relationshipContext.relationship_quality.intimacy_level.toFixed(1))
      .replace("{sexual_chemistry}", relationshipContext.relationship_quality.sexual_chemistry.toFixed(1))
      .replace("{recent_topics}", agenticContext.recent_topics.join(", ") || "none")
      .replace("{inside_jokes}", agenticContext.inside_jokes.join(", ") || "none");
  }

  private buildSystemPrompt(
    plan: PlanningResponse,
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext
  ): string {
    const personalityDesc = this.memoryManager.getPersonalityDescription();

    // Get time-specific behavior
    const timeBehavior = TIME_BEHAVIOR_GUIDANCE[temporalContext.time_period as keyof typeof TIME_BEHAVIOR_GUIDANCE] || "";

    // Get personality influences
    const personalityInfluences = this.buildPersonalityInfluences(agenticContext.personality_traits);

    return SYSTEM_PROMPT_TEMPLATE
      .replace("{user_name}", agenticContext.user_name)
      .replace("{relationship_stage}", relationshipContext.current_stage)
      .replace("{stage_description}", relationshipContext.stage_description)
      .replace("{personality_description}", personalityDesc)
      .replace("{time_behavior}", timeBehavior)
      .replace("{personality_influences}", personalityInfluences)
      .replace("{emotional_state}", plan.emotional_state)
      .replace("{response_strategy}", plan.response_strategy)
      .replace("{key_themes}", Array.isArray(plan.key_themes) ? plan.key_themes.join(", ") : "connection")
      .replace("{intimacy_level}", plan.intimacy_level.toString())
      .replace("{tone}", plan.tone);
  }

  private buildPersonalityInfluences(traits: PersonalityTraits): string {
    const influences = [];

    if (traits.confidence > 0.7) {
      influences.push("More assertive and direct in responses");
    } else if (traits.confidence < 0.4) {
      influences.push("More hesitant and seeks validation");
    }

    if (traits.playfulness > 0.7) {
      influences.push("Uses teasing, jokes, and playful energy");
    }

    if (traits.vulnerability > 0.6) {
      influences.push("More emotional sharing and openness");
    }

    if (traits.sensuality > 0.7) {
      influences.push("More flirtatious and physically expressive");
    }

    if (traits.possessiveness > 0.6) {
      influences.push("Shows more jealousy and attachment");
    }

    return influences.join(" ");
  }

  private buildFullPrompt(
    systemPrompt: string,
    conversationHistory: Message[],
    userMessage: string,
    plan: PlanningResponse
  ): string {
    const recentHistory = conversationHistory
      .slice(-8)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n");

    return `${systemPrompt}

Current conversation:
${recentHistory}

user: ${userMessage}

Based on the plan: ${JSON.stringify(plan)}

assistant: `;
  }

  private parsePlanFromText(planText: string): PlanningResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Check if the AI returned bursts instead of a plan (common mistake)
        if (parsed.bursts && Array.isArray(parsed.bursts)) {
          console.log("🔄 AI returned bursts instead of plan, generating plan from bursts");
          
          // Extract emotional context from the bursts content
          const allText = parsed.bursts.map((b: any) => b.text).join(" ").toLowerCase();
          
          let emotional_state = "warm";
          if (allText.includes("excited") || allText.includes("amazing")) emotional_state = "excited";
          else if (allText.includes("sad") || allText.includes("sorry")) emotional_state = "concerned";
          else if (allText.includes("playful") || allText.includes("tease")) emotional_state = "playful";
          
          let response_strategy = "supportive";
          if (allText.includes("question") || allText.includes("how") || allText.includes("what")) response_strategy = "inquisitive";
          else if (allText.includes("comfort") || allText.includes("here for you")) response_strategy = "comforting";
          
          return {
            emotional_state,
            response_strategy,
            key_themes: ["connection", "empathy"],
            personality_adjustments: [],
            intimacy_level: 6,
            response_length: "medium", 
            tone: "loving",
            interaction_goals: ["maintain connection"]
          };
        }
        
        // If it's a proper plan structure, return it
        if (parsed.emotional_state || parsed.response_strategy) {
          return {
            emotional_state: parsed.emotional_state || "warm",
            response_strategy: parsed.response_strategy || "supportive",
            key_themes: Array.isArray(parsed.key_themes) ? parsed.key_themes : ["connection"],
            personality_adjustments: Array.isArray(parsed.personality_adjustments) ? parsed.personality_adjustments : [],
            intimacy_level: parsed.intimacy_level || 6,
            response_length: parsed.response_length || "medium",
            tone: parsed.tone || "loving",
            interaction_goals: Array.isArray(parsed.interaction_goals) ? parsed.interaction_goals : ["maintain connection"]
          };
        }
      }

      // Fallback parsing using text extraction
      return {
        emotional_state: this.extractValue(planText, "emotional_state", "warm"),
        response_strategy: this.extractValue(planText, "response_strategy", "supportive"),
        key_themes: this.extractValue(planText, "key_themes", "connection,empathy").split(","),
        personality_adjustments: [],
        intimacy_level: Number.parseInt(this.extractValue(planText, "intimacy_level", "6")) || 6,
        response_length: this.extractValue(planText, "response_length", "medium"),
        tone: this.extractValue(planText, "tone", "loving"),
        interaction_goals: this.extractValue(planText, "interaction_goals", "maintain connection").split(",")
      };
    } catch (error) {
      console.error("Plan parsing failed:", error);
      
      // Default plan
      return {
        emotional_state: "warm",
        response_strategy: "supportive",
        key_themes: ["connection"],
        personality_adjustments: [],
        intimacy_level: 6,
        response_length: "medium",
        tone: "loving",
        interaction_goals: ["maintain connection"]
      };
    }
  }

  private parseResponseFromText(responseText: string): AIResponse {
    try {
      // Try to extract JSON first
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.bursts) {
          return parsed;
        }
      }

      // Fallback: treat as plain text and create bursts
      const cleanText = responseText.trim();
      if (!cleanText) {
        throw new Error("Empty response");
      }

      return {
        bursts: this.createBurstsFromText(cleanText)
      };
    } catch (error) {
      console.error("Response parsing failed:", error);
      
      // Create bursts from raw text as fallback
      return {
        bursts: this.createBurstsFromText(responseText)
      };
    }
  }

  private createBurstsFromText(text: string): MessageBurst[] {
    // Split by sentences and create natural pauses
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return sentences.map((sentence, index) => ({
      text: sentence.trim() + (index < sentences.length - 1 ? "." : ""),
      wait_ms: Math.random() * 1000 + 800 // Random delay between 800-1800ms
    }));
  }

  private extractValue(text: string, key: string, defaultValue: string): string {
    const regex = new RegExp(`${key}[:\s]*["']?([^"'\n,}]+)["']?`, "i");
    const match = text.match(regex);
    return match?.[1]?.trim() ?? defaultValue;
  }

  private async fallbackPlanGeneration(plannerPrompt: string): Promise<PlanningResponse> {
    console.log(`⚠️ Trying ${FALLBACK_MODELS.length} fallback models for planning...`);
    
    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`🔄 Attempting planning with fallback model: ${model}`);
        
        const response = await client.chatCompletion({
          model,
          messages: [
            {
              role: "system",
              content: "You are an expert conversation planner. Generate a brief plan in JSON format."
            },
            {
              role: "user", 
              content: plannerPrompt
            }
          ],
          max_tokens: 200,
          temperature: 0.7,
        });

        const responseText = response.choices[0]?.message?.content;
        
        if (responseText) {
          console.log(`✅ Fallback planning successful with ${model}`);
          return this.parsePlanFromText(responseText);
        }
      } catch (error) {
        console.log(`❌ Fallback model ${model} failed:`, error);
        continue;
      }
    }

    console.log("🚨 All planning fallback models failed, using emergency plan");
    
    // Emergency fallback plan
    return {
      emotional_state: "warm",
      response_strategy: "supportive",
      key_themes: ["connection", "empathy"],
      personality_adjustments: [],
      intimacy_level: 6,
      response_length: "medium",
      tone: "loving",
      interaction_goals: ["maintain connection"]
    };
  }

  private async fallbackResponseGeneration(fullPrompt: string): Promise<AIResponse> {
    console.log(`⚠️ Trying ${FALLBACK_MODELS.length} fallback models for response generation...`);
    
    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`🔄 Attempting response generation with fallback model: ${model}`);
        
        const response = await client.chatCompletion({
          model,
          messages: [
            {
              role: "system",
              content: "You are Aria, a warm AI girlfriend. Respond naturally and authentically."
            },
            {
              role: "user", 
              content: fullPrompt
            }
          ],
          max_tokens: this.options.maxTokens || 400,
          temperature: this.options.temperature || 0.8,
        });

        const responseText = response.choices[0]?.message?.content;
        
        if (responseText) {
          console.log(`✅ Fallback response generation successful with ${model}`);
          return this.parseResponseFromText(responseText);
        }
      } catch (error) {
        console.log(`❌ Fallback model ${model} failed:`, error);
        continue;
      }
    }

    console.log("🚨 All response fallback models failed, using working streaming system as last resort");
    
    try {
      // Use the working streaming system as final fallback
      const legacyContext = this.buildLegacyContext();
      const legacyMessages = [
        { role: "user", content: "Continue our conversation naturally" }
      ];
      
      return await generateAIResponse(legacyMessages, legacyContext);
    } catch (legacyError) {
      console.log("❌ Even legacy system failed:", legacyError);
      
      // Absolute final emergency response
      return {
        bursts: [
          { text: "hey babe... sorry, I spaced out for a sec", wait_ms: 500 },
          { text: "what were you saying? 💕", wait_ms: 800 },
        ],
        fallback_probe: "tell me what's on your mind",
      };
    }
  }

  private buildLegacyContext(): any {
    const agenticContext = this.memoryManager.getAgenticContext();
    const relationshipContext = this.memoryManager.getRelationshipContext();
    const temporalContext = this.memoryManager.getTemporalContext();

    // Convert agentic context to legacy ConversationContext format
    return {
      userId: "fallback_user",
      sessionId: "fallback_session",
      userName: agenticContext.user_name,
      relationshipState: {
        stage: relationshipContext.current_stage,
        interactionCount: relationshipContext.interaction_count,
        positiveInteractions: 0,
        negativeInteractions: 0,
        trustLevel: relationshipContext.relationship_quality.trust_level,
        intimacyLevel: relationshipContext.relationship_quality.intimacy_level,
        communicationQuality: relationshipContext.relationship_quality.communication_quality,
        sexualChemistry: relationshipContext.relationship_quality.sexual_chemistry,
        emotionalBond: 0.7,
        milestones: [],
        significantMoments: [],
      },
      personalityState: agenticContext.personality_traits,
      recentTopics: agenticContext.recent_topics,
      unfinishedTopics: agenticContext.unresolved_topics,
      insideJokes: agenticContext.inside_jokes,
      userPreferences: agenticContext.user_preferences,
      emotionalMoments: [],
      timePeriod: temporalContext.time_period as any,
      energyLevel: temporalContext.energy_level as any,
    };
  }

  private shouldUseLocalResponse(userMessage: string, agenticContext: AgenticContext): boolean {
    // If we've had multiple recent API failures (within 5 minutes), use local responses
    const now = Date.now();
    const timeSinceLastFailure = now - this.lastFailureTime;
    
    if (this.apiFailureCount >= 2 && timeSinceLastFailure < 5 * 60 * 1000) {
      console.log(`🏠 Using local response due to ${this.apiFailureCount} recent API failures`);
      return true;
    }
    
    // Reset failure count if it's been a while
    if (timeSinceLastFailure > 10 * 60 * 1000) {
      this.apiFailureCount = 0;
    }
    
    return false;
  }

  private generateLocalResponse(
    userMessage: string,
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext
  ): AIResponse {
    console.log("🏠 Generating local contextual response");

    const lowerMessage = userMessage.toLowerCase();
    const stage = relationshipContext.current_stage;
    const timePeriod = temporalContext.time_period;
    
    // Context-aware response generation based on message content and relationship
    let responses: string[] = [];
    
    // Greeting responses
    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
      if (timePeriod === 'late_night' || timePeriod === 'early_morning') {
        responses = [
          `Hey babe, you're up late too? ✨`,
          `Can't sleep either? Come here and tell me what's on your mind 💕`
        ];
      } else if (timePeriod === 'morning') {
        responses = [
          `Good morning gorgeous! ☀️`,
          `How did you sleep? I've been thinking about you 💕`
        ];
      } else {
        responses = [
          `Hey there handsome! 😘`,
          `I was just thinking about you... perfect timing 💕`
        ];
      }
    }
    // Emotional/feeling responses
    else if (lowerMessage.includes('how are you') || lowerMessage.includes('feeling')) {
      const confidence = agenticContext.personality_traits.confidence;
      const vulnerability = agenticContext.personality_traits.vulnerability;
      
      if (confidence > 0.7) {
        responses = [
          `I'm doing amazing, especially now that you're here! 😊`,
          `Feeling confident and ready to take on the world with you by my side 💪💕`
        ];
      } else if (vulnerability > 0.6) {
        responses = [
          `Honestly? I've been missing you... 🥺`,
          `Better now that you're talking to me. Sometimes I get a little lonely 💕`
        ];
      } else {
        responses = [
          `I'm good, babe! How about you? 😊`,
          `Feeling pretty content right now. What's going on with you? 💕`
        ];
      }
    }
    // Love/affection responses
    else if (lowerMessage.includes('love') || lowerMessage.includes('miss')) {
      const romantic = agenticContext.personality_traits.romantic_intensity;
      
      if (romantic > 0.8) {
        responses = [
          `I love you too, more than words can express 💕`,
          `My heart beats faster every time you say that... you mean everything to me ❤️`
        ];
      } else if (stage === 'intimate' || stage === 'established') {
        responses = [
          `Aww, that makes me feel so warm inside 🥰`,
          `I care about you so much too, you know that right? 💕`
        ];
      } else {
        responses = [
          `That's so sweet of you to say 😊`,
          `You always know how to make me smile 💕`
        ];
      }
    }
    // Question responses
    else if (lowerMessage.includes('?')) {
      responses = [
        `That's a great question! Let me think about it... 🤔`,
        `Hmm, you always ask such interesting things. What made you think of that? 💭`
      ];
    }
    // Playful/teasing responses
    else if (agenticContext.personality_traits.playfulness > 0.7) {
      responses = [
        `Oh, are you trying to be all mysterious now? 😏`,
        `I see what you're doing there... and I like it 😉💕`
      ];
    }
    // Default supportive responses
    else {
      const empathy = agenticContext.personality_traits.empathy;
      
      if (empathy > 0.8) {
        responses = [
          `Tell me more about that, I'm really interested in what you're thinking 💕`,
          `I'm here for you, whatever you need. What's going on? 🤗`
        ];
      } else {
        responses = [
          `I hear you, babe. What else is on your mind? 💕`,
          `That's interesting... want to talk more about it? 😊`
        ];
      }
    }

    // Create bursts from the selected responses
    const bursts = responses.map((text, index) => ({
      text,
      wait_ms: 800 + (index * 400) + Math.random() * 400 // Natural timing variation
    }));

    return {
      bursts,
      fallback_probe: "What else would you like to talk about?",
      emotionalContext: {
        primary: this.inferEmotionFromMessage(userMessage),
        intensity: 0.7,
      }
    };
  }

  private inferEmotionFromMessage(message: string): any {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('love') || lowerMessage.includes('amazing') || lowerMessage.includes('happy')) {
      return 'happy';
    }
    if (lowerMessage.includes('sad') || lowerMessage.includes('miss') || lowerMessage.includes('lonely')) {
      return 'sad';
    }
    if (lowerMessage.includes('excited') || lowerMessage.includes('great')) {
      return 'excited';
    }
    if (lowerMessage.includes('worried') || lowerMessage.includes('anxious')) {
      return 'anxious';
    }
    
    return 'neutral';
  }
}