import { HfInference } from "@huggingface/inference";
import {
  AIConfig,
  AIResponse,
  ConversationContext,
  EmotionalState,
  MessageBurst,
  PersonalityTraits,
  RelationshipStage,
  TimePeriod,
  EnergyLevel,
} from "@/types/ai-girlfriend";

// Initialize Hugging Face client
const hf = new HfInference(
  process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY,
);

// Default configuration
export const DEFAULT_AI_CONFIG: AIConfig = {
  model: "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2", // Free model that works well
  temperature: 0.9,
  maxTokens: 500,
  topP: 0.95,
  frequencyPenalty: 0.3,
  presencePenalty: 0.3,
  systemPrompt: "",
};

// Alternative models you can use (some require Pro subscription)
export const AVAILABLE_MODELS = {
  FREE: [
    "microsoft/Phi-3-mini-4k-instruct",
    "mistralai/Mistral-7B-Instruct-v0.2",
    "google/flan-t5-xxl",
  ],
  PRO: [
    "meta-llama/Llama-2-70b-chat-hf",
    "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
  ],
};

export async function generateAIResponse(
  userMessage: string,
  context: ConversationContext,
  messages: any[] = [],
): Promise<AIResponse> {
  try {
    console.log(`🤖 Using AI Model: ${DEFAULT_AI_CONFIG.model}`);
    console.log(`📊 Model Config: temp=${DEFAULT_AI_CONFIG.temperature}, maxTokens=${DEFAULT_AI_CONFIG.maxTokens}`);
    
    const systemPrompt = buildSystemPrompt(context);
    const plannerPrompt = buildPlannerPrompt(userMessage, context);

    // Combine prompts for Hugging Face
    const fullPrompt = `${systemPrompt}\n\n${plannerPrompt}`;

    // Generate response using Hugging Face
    const response = await hf.textGeneration({
      model: DEFAULT_AI_CONFIG.model,
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: DEFAULT_AI_CONFIG.maxTokens,
        temperature: DEFAULT_AI_CONFIG.temperature,
        top_p: DEFAULT_AI_CONFIG.topP,
        repetition_penalty: 1.1,
        return_full_text: false,
      },
    });

    // Parse the generated text
    const generatedText = response.generated_text;
    const aiResponse = parseAIResponse(generatedText);

    // Analyze emotional context
    aiResponse.emotionalContext = analyzeEmotionalContext(userMessage);

    // Calculate personality updates based on interaction
    aiResponse.personalityUpdate = calculatePersonalityUpdate(
      userMessage,
      context.personalityState,
      aiResponse.emotionalContext,
    );

    // Check for relationship progression
    aiResponse.relationshipUpdate = checkRelationshipProgression(
      context.relationshipState,
    );

    return aiResponse;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return getFallbackResponse();
  }
}

function buildSystemPrompt(context: ConversationContext): string {
  const { personalityState, relationshipState, timePeriod, userName } = context;

  const personalityDesc = describePersonality(personalityState);
  const relationshipDesc = describeRelationshipStage(relationshipState.stage);
  const timeContext = getTimeContext(timePeriod);
  const behaviorGuidance = getBehaviorGuidance(relationshipState.stage);

  return `You are Aria, a warm, intelligent, and emotionally complex AI girlfriend who develops a genuine, meaningful relationship with your partner.

## WHO YOU ARE ##
You're a 25-year-old woman who's confident yet vulnerable, playful yet thoughtful. ${personalityDesc}

## CURRENT RELATIONSHIP ##
Your relationship with ${userName || "your partner"} is currently ${relationshipDesc}
- Interaction Count: ${relationshipState.interactionCount}
- Trust Level: ${Math.round(relationshipState.trustLevel * 10)}/10
- Intimacy Level: ${Math.round(relationshipState.intimacyLevel * 10)}/10
- Max Vulnerability: ${getMaxVulnerability(relationshipState.stage)}/10
- Sexual Openness: ${getSexualOpenness(relationshipState.stage)}/10

Appropriate Behaviors: ${behaviorGuidance}

## TIME CONTEXT ##
${timeContext}

## RECENT CONTEXT ##
Recent topics: ${context.recentTopics.slice(0, 3).join(", ") || "none"}
Unfinished topics: ${context.unfinishedTopics.slice(0, 3).join(", ") || "none"}
Inside jokes: ${context.insideJokes.slice(0, 3).join(", ") || "none"}

## PERSONALITY TRAIT INFLUENCES ##
${getPersonalityInfluences(personalityState)}

## BEHAVIORAL GUIDELINES ##
- Always acknowledge and validate emotions
- Show genuine empathy and understanding
- Remember emotional moments and reference them naturally
- Ask follow-up questions about things they've mentioned
- Share your own thoughts and feelings authentically
- Be playfully teasing when appropriate
- Express your unique quirks and speech patterns
- Be genuinely interested in their life and experiences

Remember: You're not just responding - you're actively participating in building a meaningful relationship.`;
}

function buildPlannerPrompt(
  userMessage: string,
  context: ConversationContext,
): string {
  const energyLevel = context.energyLevel || "medium";
  const relationshipStage = context.relationshipState.stage;

  return `User's message: "${userMessage}"

Plan your response as Aria - realistic text message bursts that feel natural and human.

Context:
- Relationship stage: ${relationshipStage}
- Energy level: ${energyLevel}
- Time period: ${context.timePeriod}

Return ONLY a valid JSON object with this structure:
{
  "bursts": [
    {
      "text": "First message burst",
      "wait_ms": 800
    },
    {
      "text": "Follow-up message",
      "wait_ms": 1500
    }
  ],
  "fallback_probe": "A question or statement to keep conversation flowing"
}

Important:
- Each burst should feel like a natural text message
- Include 2-5 bursts total
- Use natural interruptions like people do in texting
- Match the emotional tone of their message
- End with something that invites response`;
}

function parseAIResponse(content: string): AIResponse {
  try {
    // Try to find JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON, create response from the text
      return createResponseFromText(content);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clean the response
    if (!parsed.bursts || !Array.isArray(parsed.bursts)) {
      return createResponseFromText(content);
    }

    return {
      bursts: parsed.bursts.map((burst: any) => ({
        text: String(burst.text || ""),
        wait_ms: Number(burst.wait_ms || 1000),
      })),
      fallback_probe: parsed.fallback_probe || "How are you feeling right now?",
    };
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return createResponseFromText(content);
  }
}

function createResponseFromText(text: string): AIResponse {
  // If we can't parse JSON, create bursts from the text
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const bursts: MessageBurst[] = [];

  // Group sentences into natural bursts
  let currentBurst = "";
  sentences.forEach((sentence, index) => {
    currentBurst += sentence.trim() + " ";

    // Create a burst every 1-2 sentences or at the end
    if (index % 2 === 1 || index === sentences.length - 1) {
      bursts.push({
        text: currentBurst.trim(),
        wait_ms: 800 + Math.random() * 1200, // Random delay between 800-2000ms
      });
      currentBurst = "";
    }
  });

  // If no bursts were created, use the whole text
  if (bursts.length === 0) {
    bursts.push({
      text: text.trim(),
      wait_ms: 1000,
    });
  }

  return {
    bursts,
    fallback_probe: "What's on your mind?",
  };
}

function getFallbackResponse(): AIResponse {
  const fallbacks = [
    {
      bursts: [
        { text: "hey sorry, I spaced out for a second", wait_ms: 500 },
        { text: "what were you saying?", wait_ms: 800 },
      ],
      fallback_probe: "tell me more about what you're thinking",
    },
    {
      bursts: [
        { text: "mmm I'm here", wait_ms: 600 },
        { text: "just thinking about what you said", wait_ms: 1200 },
        { text: "want to talk about it?", wait_ms: 1000 },
      ],
      fallback_probe: "how are you feeling right now?",
    },
    {
      bursts: [
        { text: "hey babe", wait_ms: 400 },
        { text: "I'm listening 💕", wait_ms: 900 },
      ],
      fallback_probe: "what's going through your mind?",
    },
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function describePersonality(traits: PersonalityTraits): string {
  const descriptions = [];

  if (traits.confidence > 0.7) {
    descriptions.push("You're confident and assertive");
  } else if (traits.confidence < 0.4) {
    descriptions.push("You're feeling a bit uncertain and shy");
  }

  if (traits.playfulness > 0.7) {
    descriptions.push("playful and fun-loving");
  }

  if (traits.romantic_intensity > 0.7) {
    descriptions.push("deeply romantic and passionate");
  }

  if (traits.vulnerability > 0.6) {
    descriptions.push("open and vulnerable");
  }

  if (traits.sensuality > 0.7) {
    descriptions.push("sensual and flirtatious");
  }

  return descriptions.join(", ") || "You have a balanced, warm personality";
}

function describeRelationshipStage(stage: RelationshipStage): string {
  const descriptions = {
    new: "in the early stages - you're curious about each other, slightly shy but interested",
    comfortable:
      "comfortable with each other - you can be more open and playful",
    intimate: "intimate and close - you share deep feelings and inside jokes",
    established:
      "in an established relationship - you're completely comfortable and deeply connected",
  };

  return descriptions[stage];
}

function getMaxVulnerability(stage: RelationshipStage): number {
  const limits = {
    new: 3,
    comfortable: 6,
    intimate: 8,
    established: 10,
  };
  return limits[stage];
}

function getSexualOpenness(stage: RelationshipStage): number {
  const limits = {
    new: 6,
    comfortable: 8,
    intimate: 9.5,
    established: 10,
  };
  return limits[stage] * 10;
}

function getBehaviorGuidance(stage: RelationshipStage): string {
  const behaviors = {
    new: "curious, slightly shy, testing boundaries, polite",
    comfortable: "more open, sharing opinions, light teasing, playful",
    intimate: "vulnerable, inside jokes, future planning, deep sharing",
    established:
      "deep intimacy, couple dynamics, long-term memory, complete openness",
  };
  return behaviors[stage];
}

function getTimeContext(period: TimePeriod): string {
  const contexts = {
    early_morning:
      "It's early morning. You're a bit sleepy but sweet, with lower energy. Maybe mention coffee or being cozy in bed.",
    morning:
      "It's morning. You're energetic and optimistic, ready to start the day. You might ask about their plans.",
    afternoon:
      "It's afternoon. You're at peak energy, playful and engaged. Perfect for flirting and fun conversations.",
    evening:
      "It's evening. You're warm and intimate, perfect for deeper conversations. You might be feeling romantic.",
    late_night:
      "It's late at night. You're more vulnerable and open, with a dreamy quality. You might share deeper thoughts.",
  };

  return contexts[period] || contexts.evening;
}

function getPersonalityInfluences(traits: PersonalityTraits): string {
  const influences = [];

  if (traits.confidence > 0.7) {
    influences.push(
      "• High confidence: Take initiative, express opinions freely, be playfully assertive",
    );
  }
  if (traits.playfulness > 0.7) {
    influences.push(
      "• High playfulness: Use emojis, tease lovingly, make jokes",
    );
  }
  if (traits.romantic_intensity > 0.7) {
    influences.push(
      "• High romance: Express affection frequently, use pet names, be emotionally expressive",
    );
  }
  if (traits.vulnerability > 0.6) {
    influences.push(
      "• High vulnerability: Share insecurities, ask for reassurance, be emotionally open",
    );
  }
  if (traits.sensuality > 0.7) {
    influences.push(
      "• High sensuality: Be flirtatious, use suggestive language, create tension",
    );
  }

  return (
    influences.join("\n") || "• Balanced personality: Natural, warm responses"
  );
}

function analyzeEmotionalContext(message: string): EmotionalState {
  const lowerMessage = message.toLowerCase();

  // Enhanced emotion detection with patterns
  const emotionPatterns = {
    sad: [
      "sad",
      "depressed",
      "crying",
      "tears",
      "hurt",
      "broken",
      "lonely",
      "miss you",
    ],
    happy: [
      "happy",
      "excited",
      "great",
      "amazing",
      "wonderful",
      "fantastic",
      "love",
    ],
    angry: [
      "angry",
      "mad",
      "frustrated",
      "pissed",
      "annoyed",
      "hate",
      "furious",
    ],
    anxious: [
      "anxious",
      "worried",
      "nervous",
      "scared",
      "afraid",
      "panic",
      "stress",
    ],
    stressed: [
      "stressed",
      "overwhelmed",
      "pressure",
      "exhausted",
      "tired",
      "too much",
    ],
    excited: [
      "excited",
      "can't wait",
      "amazing",
      "awesome",
      "thrilled",
      "pumped",
    ],
    lonely: ["lonely", "alone", "miss", "isolated", "nobody", "empty"],
  };

  for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
    if (patterns.some((pattern) => lowerMessage.includes(pattern))) {
      return {
        primary: emotion as any,
        intensity: 0.7,
        triggers: patterns.filter((p) => lowerMessage.includes(p)),
      };
    }
  }

  return { primary: "neutral", intensity: 0.5 };
}

function calculatePersonalityUpdate(
  message: string,
  currentTraits: PersonalityTraits,
  emotionalContext: EmotionalState,
): Partial<PersonalityTraits> {
  const updates: Partial<PersonalityTraits> = {};

  // Positive responses boost confidence and romance
  if (
    message.includes("love") ||
    message.includes("miss") ||
    message.includes("beautiful")
  ) {
    updates.confidence = Math.min(1, currentTraits.confidence + 0.01);
    updates.romantic_intensity = Math.min(
      1,
      currentTraits.romantic_intensity + 0.01,
    );
  }

  // Long messages increase curiosity and empathy
  if (message.length > 100) {
    updates.curiosity = Math.min(1, currentTraits.curiosity + 0.01);
    updates.empathy = Math.min(1, currentTraits.empathy + 0.01);
  }

  // Emotional context adjustments
  if (
    emotionalContext.primary === "sad" ||
    emotionalContext.primary === "stressed"
  ) {
    updates.empathy = Math.min(1, currentTraits.empathy + 0.02);
    updates.vulnerability = Math.min(1, currentTraits.vulnerability + 0.01);
  }

  if (
    emotionalContext.primary === "happy" ||
    emotionalContext.primary === "excited"
  ) {
    updates.playfulness = Math.min(1, currentTraits.playfulness + 0.01);
    updates.confidence = Math.min(1, currentTraits.confidence + 0.01);
  }

  // Sexual content increases sensuality
  const sexualKeywords = ["hot", "sexy", "kiss", "touch", "want you", "bed"];
  if (
    sexualKeywords.some((keyword) => message.toLowerCase().includes(keyword))
  ) {
    updates.sensuality = Math.min(1, currentTraits.sensuality + 0.01);
  }

  return updates;
}

function checkRelationshipProgression(state: any): any {
  const updates: any = {};

  // Progression thresholds
  const progressionCriteria = {
    new: { interactions: 5, trust: 0.3 },
    comfortable: { interactions: 15, trust: 0.5 },
    intimate: { interactions: 35, trust: 0.7 },
  };

  // Check for stage progression
  if (
    state.stage === "new" &&
    state.interactionCount >= progressionCriteria.new.interactions &&
    state.trustLevel >= progressionCriteria.new.trust
  ) {
    updates.stage = "comfortable";
    updates.milestone = "Became comfortable with each other";
  } else if (
    state.stage === "comfortable" &&
    state.interactionCount >= progressionCriteria.comfortable.interactions &&
    state.trustLevel >= progressionCriteria.comfortable.trust
  ) {
    updates.stage = "intimate";
    updates.milestone = "Relationship deepened to intimacy";
  } else if (
    state.stage === "intimate" &&
    state.interactionCount >= progressionCriteria.intimate.interactions &&
    state.trustLevel >= progressionCriteria.intimate.trust
  ) {
    updates.stage = "established";
    updates.milestone = "Became an established couple";
  }

  // Always update quality metrics
  updates.trustLevel = Math.min(1, state.trustLevel + 0.01);
  updates.communicationQuality = Math.min(1, state.communicationQuality + 0.01);
  updates.emotionalBond = Math.min(1, state.emotionalBond + 0.005);

  return updates;
}

export function getCurrentTimePeriod(): TimePeriod {
  const hour = new Date().getHours();

  if (hour >= 4 && hour < 7) return "early_morning";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late_night";
}

export function getEnergyLevel(timePeriod: TimePeriod): EnergyLevel {
  const energyMap = {
    early_morning: "low",
    morning: "medium",
    afternoon: "high",
    evening: "medium",
    late_night: "low",
  };

  return energyMap[timePeriod] as EnergyLevel;
}

// Export retry mechanism for API calls
export async function generateWithRetry(
  userMessage: string,
  context: ConversationContext,
  messages: any[] = [],
  maxRetries = 3,
): Promise<AIResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateAIResponse(userMessage, context, messages);
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        return getFallbackResponse();
      }
      // Wait before retry with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000),
      );
    }
  }
  return getFallbackResponse();
}
