import { HfInference } from "@huggingface/inference";
import { 
  SYSTEM_PROMPT_TEMPLATE, 
  PLANNER_PROMPT_TEMPLATE, 
  TIME_BEHAVIOR_GUIDANCE, 
  PERSONALITY_INFLUENCES 
} from "@/lib/prompts/agentic-prompts";
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
const client = new HfInference(
  process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY,
);

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

  constructor(memoryManager: AgenticMemoryManager, options: AgenticOptions = {}) {
    this.memoryManager = memoryManager;
    this.options = {
      model: "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2",
      temperature: 0.9,
      maxTokens: 3000,
      useStreaming: false,
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
      
      // Fallback to simple response
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
      
      // Fallback plan
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
      
      // Fallback response
      return {
        bursts: [
          {
            text: "Sorry babe, I'm having trouble finding the right words right now. Can you tell me more about what you're thinking? 💕",
            wait_ms: 1500
          }
        ]
      };
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
}