import { AgenticMemoryManager } from "./agentic-memory-manager";
import { AgenticResponseGenerator } from "./agentic-response-generator";
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

  constructor(options: AgenticHandlerOptions = {}) {
    this.memoryManager = new AgenticMemoryManager();
    this.responseGenerator = new AgenticResponseGenerator(this.memoryManager, options);
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

  getContext() {
    return this.memoryManager.getAgenticContext();
  }
}

// Export singleton instance for convenience
export const createAgenticHandler = (options?: AgenticHandlerOptions) => {
  return new AgenticHandler(options);
};