import { AgenticMemoryManager } from "./agentic-memory-manager";
import { AgenticResponseGenerator } from "./agentic-response-generator";
import { IceBreakerGenerator, type IceBreaker, type IceBreakerOptions } from "./ice-breaker-generator";
import type { Message, AIResponse } from "@/types/ai-girlfriend";

export interface AgenticHandlerOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useStreaming?: boolean;
}

export class AgenticHandler {
  private memoryManager: AgenticMemoryManager;
  private responseGenerator: AgenticResponseGenerator;
  private iceBreakerGenerator: IceBreakerGenerator;

  constructor(options: AgenticHandlerOptions = {}) {
    this.memoryManager = new AgenticMemoryManager();
    this.responseGenerator = new AgenticResponseGenerator(this.memoryManager, options);
    this.iceBreakerGenerator = new IceBreakerGenerator(options.model);
  }

  async initialize(userId: string, sessionId: string): Promise<void> {
    await this.memoryManager.initializeFromDatabase(userId, sessionId);
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: Message[]
  ): Promise<AIResponse> {
    console.log("🤖 Starting agentic response generation...");
    
    const startTime = Date.now();
    
    try {
      const response = await this.responseGenerator.generateResponse(
        userMessage,
        conversationHistory
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Agentic response generated in ${duration}ms`);

      return response;
    } catch (error) {
      console.error("❌ Agentic handler error:", error);
      
      // Fallback response
      return {
        bursts: [
          {
            text: "I'm having a moment here, babe. Let me take a breath and try again? 💕",
            wait_ms: 1500
          }
        ]
      };
    }
  }

  getMemoryManager(): AgenticMemoryManager {
    return this.memoryManager;
  }

  async generateIceBreakers(
    conversationHistory: Message[],
    options?: IceBreakerOptions
  ): Promise<IceBreaker[]> {
    console.log("🧊 Generating conversation ice breakers...");
    
    const startTime = Date.now();
    
    try {
      const agenticContext = this.memoryManager.getAgenticContext();
      const relationshipContext = this.memoryManager.getRelationshipContext();
      const temporalContext = this.memoryManager.getTemporalContext();

      const iceBreakers = await this.iceBreakerGenerator.generateIceBreakers(
        conversationHistory,
        agenticContext,
        relationshipContext,
        temporalContext,
        options
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Generated ${iceBreakers.length} ice breakers in ${duration}ms`);

      return iceBreakers;
    } catch (error) {
      console.error("❌ Ice breaker generation error:", error);
      
      // Fallback ice breakers
      return [
        {
          id: `fallback_${Date.now()}_1`,
          text: "How are you feeling right now?",
          type: "question",
          mood: "curious",
          priority: 1
        },
        {
          id: `fallback_${Date.now()}_2`, 
          text: "I love talking with you 💕",
          type: "compliment",
          mood: "affectionate",
          priority: 1
        },
        {
          id: `fallback_${Date.now()}_3`,
          text: "What's on your mind?",
          type: "question",
          mood: "caring",
          priority: 1
        }
      ];
    }
  }

  getContext() {
    return this.memoryManager.getAgenticContext();
  }
}

// Export singleton instance for convenience
export const createAgenticHandler = (options?: AgenticHandlerOptions) => {
  return new AgenticHandler(options);
};