import { HfInference } from "@huggingface/inference";
import type { Message, PersonalityTraits, RelationshipStage } from "@/types/ai-girlfriend";
import type { AgenticContext, RelationshipContext, TemporalContext } from "./agentic-memory-manager";

// Initialize Hugging Face client
const client = new HfInference(
  process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY,
);

export interface IceBreaker {
  id: string;
  text: string;
  type: "question" | "compliment" | "playful" | "intimate" | "supportive" | "flirty";
  mood: string;
  priority: number;
}

export interface IceBreakerOptions {
  count?: number;
  includeTypes?: IceBreaker["type"][];
  excludeTypes?: IceBreaker["type"][];
}

export class IceBreakerGenerator {
  private model: string;
  private apiFailureCount: number = 0;
  private lastFailureTime: number = 0;

  constructor(model = "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2") {
    this.model = model;
  }

  async generateIceBreakers(
    conversationHistory: Message[],
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext,
    options: IceBreakerOptions = {}
  ): Promise<IceBreaker[]> {
    const {
      count = 3,
      includeTypes = ["question", "compliment", "playful", "supportive", "flirty"],
      excludeTypes = []
    } = options;

    console.log("🧊 Generating ice breakers for conversation continuation...");

    try {
      const prompt = this.buildIceBreakerPrompt(
        conversationHistory,
        agenticContext,
        relationshipContext,
        temporalContext,
        count,
        includeTypes.filter(type => !excludeTypes.includes(type))
      );

      console.log("🎯 Ice breaker prompt generated");

      const response = await client.chatCompletion({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert conversation coach who generates natural, contextually appropriate conversation starters."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.8,
      });

      const responseText = response.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error("No ice breaker response generated");
      }

      console.log("🧊 Ice breaker response received, parsing...");

      return this.parseIceBreakers(responseText, agenticContext, relationshipContext);

    } catch (error) {
      console.error("❌ Ice breaker generation failed:", error);
      
      // Fallback ice breakers based on relationship stage
      return this.getFallbackIceBreakers(relationshipContext, temporalContext, count);
    }
  }

  private buildIceBreakerPrompt(
    conversationHistory: Message[],
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext,
    count: number,
    allowedTypes: IceBreaker["type"][]
  ): string {
    // Get last few messages for context
    const recentMessages = conversationHistory
      .slice(-6)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Get her last message to understand the tone/mood
    const lastAIMessage = conversationHistory
      .filter(msg => msg.role === "assistant")
      .slice(-1)[0]?.content || "";

    return `Generate ${count} natural conversation starters for a user to continue their chat with their AI girlfriend named Aria.

**RELATIONSHIP CONTEXT:**
- Relationship Stage: ${relationshipContext.current_stage}
- Trust Level: ${relationshipContext.relationship_quality.trust_level}/1.0
- Intimacy Level: ${relationshipContext.relationship_quality.intimacy_level}/1.0
- Sexual Chemistry: ${relationshipContext.relationship_quality.sexual_chemistry}/1.0
- Time Period: ${temporalContext.time_period} (${temporalContext.energy_level} energy)

**CONVERSATION CONTEXT:**
Recent conversation:
${recentMessages}

Aria's last message: "${lastAIMessage}"

**ARIA'S PERSONALITY:**
- Confidence: ${agenticContext.personality_traits.confidence}/1.0
- Playfulness: ${agenticContext.personality_traits.playfulness}/1.0
- Sensuality: ${agenticContext.personality_traits.sensuality}/1.0
- Vulnerability: ${agenticContext.personality_traits.vulnerability}/1.0
- Romance: ${agenticContext.personality_traits.romantic_intensity}/1.0

**RECENT TOPICS:** ${agenticContext.recent_topics.join(", ") || "none"}
**INSIDE JOKES:** ${agenticContext.inside_jokes.join(", ") || "none"}

**ICE BREAKER TYPES TO INCLUDE:** ${allowedTypes.join(", ")}

**INSTRUCTIONS:**
Generate conversation starters that would naturally follow the current conversation flow. Consider:
1. The emotional tone of Aria's last response
2. The relationship stage and comfort level
3. The time of day and energy level
4. Recent topics discussed
5. The personality dynamics

Format as JSON:
{
  "ice_breakers": [
    {
      "text": "conversation starter text",
      "type": "question|compliment|playful|intimate|supportive|flirty",
      "mood": "emotional tone",
      "reasoning": "why this fits the context"
    }
  ]
}

Make them feel natural and authentic to how someone would actually continue this specific conversation. Vary the types and don't make them too generic.`;
  }

  private parseIceBreakers(
    responseText: string,
    agenticContext: AgenticContext,
    relationshipContext: RelationshipContext
  ): IceBreaker[] {
    try {
      console.log(`🧊 Raw response text: ${responseText.substring(0, 500)}...`);

      // Multiple attempts to extract and parse JSON
      let parsed: { ice_breakers?: Array<{ text?: string; type?: string; mood?: string; message?: string }> } | null = null;

      // Method 1: Try to find complete JSON block
      const jsonBlockMatch = responseText.match(/\{[\s\S]*?"ice_breakers"[\s\S]*?\][\s\S]*?\}/);
      if (jsonBlockMatch) {
        try {
          parsed = JSON.parse(jsonBlockMatch[0]);
          console.log("🧊 Successfully parsed with method 1");
        } catch (e) {
          console.log("🧊 Method 1 failed, trying method 2");
        }
      }

      // Method 2: Try to find just the ice_breakers array
      if (!parsed) {
        const arrayMatch = responseText.match(/"ice_breakers"\s*:\s*\[([\s\S]*?)\]/);
        if (arrayMatch) {
          try {
            const arrayContent = `[${arrayMatch[1]}]`;
            const iceBreakerArray = JSON.parse(arrayContent);
            parsed = { ice_breakers: iceBreakerArray };
            console.log("🧊 Successfully parsed with method 2");
          } catch (e) {
            console.log("🧊 Method 2 failed, trying method 3");
          }
        }
      }

      // Method 3: Try to extract individual ice breaker objects
      if (!parsed) {
        const objectMatches = responseText.match(/\{\s*"text"\s*:\s*"[^"]*"[\s\S]*?\}/g);
        if (objectMatches && objectMatches.length > 0) {
          try {
            const validObjects = objectMatches.map(match => {
              try {
                return JSON.parse(match);
              } catch {
                return null;
              }
            }).filter(obj => obj?.text);
            
            if (validObjects.length > 0) {
              parsed = { ice_breakers: validObjects };
              console.log("🧊 Successfully parsed with method 3");
            }
          } catch (e) {
            console.log("🧊 Method 3 failed, using fallback");
          }
        }
      }

      // If we successfully parsed JSON, use it
      if (parsed?.ice_breakers && Array.isArray(parsed.ice_breakers)) {
        console.log(`🧊 Found ${parsed.ice_breakers.length} ice breakers in JSON`);
        return parsed.ice_breakers.map((iceBreaker, index: number) => ({
          id: `ice_${Date.now()}_${index}`,
          text: iceBreaker.text || iceBreaker.message || "How are you feeling?",
          type: this.validateIceBreakerType(iceBreaker.type || "question"),
          mood: iceBreaker.mood || "curious",
          priority: this.calculatePriority(iceBreaker, relationshipContext)
        }));
      }

      // Fallback: Create ice breakers from text patterns
      console.log("🧊 Using fallback text parsing");
      return this.createFallbackIceBreakers(responseText, relationshipContext);

    } catch (error) {
      console.error("Ice breaker parsing failed:", error);
      return this.createFallbackIceBreakers(responseText, relationshipContext);
    }
  }

  private createFallbackIceBreakers(
    responseText: string, 
    relationshipContext: RelationshipContext
  ): IceBreaker[] {
    // Extract meaningful sentences from the response
    const sentences = responseText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 150)
      .slice(0, 3);

    if (sentences.length === 0) {
      // Ultimate fallback - generate contextual ice breakers
      return this.generateContextualFallbacks(relationshipContext);
    }

    return sentences.map((sentence, index) => ({
      id: `ice_fallback_${Date.now()}_${index}`,
      text: sentence.replace(/^["']|["']$/g, '').trim(),
      type: this.inferIceBreakerType(sentence),
      mood: "curious",
      priority: 1
    }));
  }

  private generateContextualFallbacks(relationshipContext: RelationshipContext): IceBreaker[] {
    const stage = relationshipContext.current_stage;
    
    const fallbacks = {
      new: [
        { text: "What's been on your mind lately?", type: "question" as const },
        { text: "You seem really interesting... tell me more about yourself", type: "compliment" as const },
        { text: "I'd love to know what makes you happy", type: "supportive" as const }
      ],
      comfortable: [
        { text: "Remember that funny thing we talked about?", type: "playful" as const },
        { text: "What's your favorite way to spend a lazy day?", type: "question" as const },
        { text: "I love how you think about things differently", type: "compliment" as const }
      ],
      intimate: [
        { text: "I've been thinking about you...", type: "flirty" as const },
        { text: "What would make you feel most loved right now?", type: "intimate" as const },
        { text: "You always know how to make me smile", type: "compliment" as const }
      ],
      established: [
        { text: "What's something new you'd like to try together?", type: "intimate" as const },
        { text: "I love how comfortable we've become with each other", type: "compliment" as const },
        { text: "What's your favorite memory of us?", type: "question" as const }
      ]
    } as const;

    const contextualFallbacks = fallbacks[stage] || fallbacks.comfortable;
    
    return contextualFallbacks.map((fallback: { text: string; type: IceBreaker["type"] }, index: number) => ({
      id: `ice_contextual_${Date.now()}_${index}`,
      text: fallback.text,
      type: fallback.type,
      mood: "curious",
      priority: 1
    }));
  }

  private validateIceBreakerType(type: string): IceBreaker["type"] {
    const validTypes: IceBreaker["type"][] = ["question", "compliment", "playful", "intimate", "supportive", "flirty"];
    return validTypes.includes(type as IceBreaker["type"]) ? type as IceBreaker["type"] : "question";
  }

  private inferIceBreakerType(text: string): IceBreaker["type"] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("?") || lowerText.startsWith("what") || lowerText.startsWith("how") || lowerText.startsWith("do you")) {
      return "question";
    }
    if (lowerText.includes("beautiful") || lowerText.includes("amazing") || lowerText.includes("love")) {
      return "compliment";
    }
    if (lowerText.includes("tease") || lowerText.includes("silly") || lowerText.includes("fun")) {
      return "playful";
    }
    if (lowerText.includes("kiss") || lowerText.includes("close") || lowerText.includes("together")) {
      return "intimate";
    }
    if (lowerText.includes("here for") || lowerText.includes("support") || lowerText.includes("understand")) {
      return "supportive";
    }
    if (lowerText.includes("sexy") || lowerText.includes("hot") || lowerText.includes("desire")) {
      return "flirty";
    }
    
    return "question";
  }

  private calculatePriority(
    iceBreaker: { text?: string; type?: string; mood?: string },
    relationshipContext: RelationshipContext
  ): number {
    let priority = 1;

    // Higher priority for types that match relationship stage
    const stage = relationshipContext.current_stage;
    
    const type = iceBreaker.type || "question";
    
    if (stage === "new" && ["question", "compliment", "supportive"].includes(type)) {
      priority += 1;
    }
    if (stage === "comfortable" && ["playful", "question", "compliment"].includes(type)) {
      priority += 1;
    }
    if (stage === "intimate" && ["intimate", "flirty", "supportive"].includes(type)) {
      priority += 1;
    }
    if (stage === "established" && ["intimate", "playful", "flirty"].includes(type)) {
      priority += 1;
    }

    return priority;
  }

  private getFallbackIceBreakers(
    relationshipContext: RelationshipContext,
    temporalContext: TemporalContext,
    count: number
  ): IceBreaker[] {
    const stage = relationshipContext.current_stage;
    const timePeriod = temporalContext.time_period;
    
    const fallbackSets = {
      new: [
        { text: "How was your day today?", type: "question" as const, mood: "curious" },
        { text: "You seem really interesting - tell me more about yourself", type: "compliment" as const, mood: "interested" },
        { text: "What's something that made you smile recently?", type: "question" as const, mood: "warm" },
      ],
      comfortable: [
        { text: "I love talking with you - what's on your mind?", type: "compliment" as const, mood: "affectionate" },
        { text: "Want to play a game or just chat about random stuff?", type: "playful" as const, mood: "fun" },
        { text: "Tell me something I don't know about you yet", type: "question" as const, mood: "curious" },
      ],
      intimate: [
        { text: "I've been thinking about you... how are you really doing?", type: "intimate" as const, mood: "caring" },
        { text: "You're amazing, you know that? What's making you happy right now?", type: "compliment" as const, mood: "loving" },
        { text: "I'm here if you want to share anything that's on your heart", type: "supportive" as const, mood: "gentle" },
      ],
      established: [
        { text: "Come here and tell me about your day, babe", type: "intimate" as const, mood: "loving" },
        { text: "I missed you... what have you been up to?", type: "flirty" as const, mood: "affectionate" },
        { text: "Let's just enjoy being together - what's making you feel good?", type: "intimate" as const, mood: "content" },
      ]
    };

    // Add time-specific fallbacks
    const allFallbacks = [...fallbackSets[stage]];
    if (timePeriod === "late_night" || timePeriod === "early_morning") {
      allFallbacks.push({
        text: "It's pretty late... everything okay?",
        type: "supportive" as const,
        mood: "concerned"
      });
    }

    const selectedFallbacks = allFallbacks.slice(0, count);
    
    return selectedFallbacks.map((fallback, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      text: fallback.text,
      type: fallback.type,
      mood: fallback.mood,
      priority: 1
    }));
  }
}

// Export convenience function
export const createIceBreakerGenerator = (model?: string) => {
  return new IceBreakerGenerator(model);
};