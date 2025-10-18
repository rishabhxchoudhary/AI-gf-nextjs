import { HfInference } from "@huggingface/inference";
import {
  AIResponse,
  ConversationContext,
  EmotionalState,
  MessageBurst,
  PersonalityTraits,
  RelationshipStage,
} from "@/types/ai-girlfriend";

// Initialize Hugging Face client - matches Python implementation
const client = new HfInference(
  process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY,
);

// Match Python's DEFAULT_TEMPERATURE = 0.9
const DEFAULT_TEMPERATURE = 0.9;

// Exact model from Python implementation
const DEFAULT_MODEL = "Orenguteng/Llama-3.1-8B-Lexi-Uncensored-V2";

// Alternative models for fallback (from Python)
const FALLBACK_MODELS = [
  "mistralai/Mixtral-8x7B-Instruct-v0.1",
  "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
  "meta-llama/Llama-2-70b-chat-hf",
];

export async function generateStreamingResponse(
  messages: Array<{ role: string; content: string }>,
  context: ConversationContext,
  onToken?: (token: string) => void,
): Promise<AIResponse> {
  try {
    console.log(`🤖 Using Streaming AI Model: ${DEFAULT_MODEL}`);
    console.log(`🌊 Streaming Config: temp=${DEFAULT_TEMPERATURE}, fallbacks=${FALLBACK_MODELS.length} models`);
    console.log(`📝 Message Count: ${messages.length}, Context: ${context.relationshipState.stage} relationship`);
    
    // Build the exact message format like Python
    const systemPrompt = buildSystemPrompt(context);
    const plannerPrompt = buildPlannerPrompt(
      messages[messages.length - 1]?.content || "",
      context,
    );

    // Combine messages with system prompt (matching Python's approach)
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10), // Keep last 10 messages for context
      { role: "user", content: plannerPrompt },
    ];

    // Stream the response - matching Python's stream=True
    const stream = client.chatCompletionStream({
      model: DEFAULT_MODEL,
      messages: formattedMessages as any,
      temperature: DEFAULT_TEMPERATURE,
      top_p: 0.95,
      max_tokens: 200,
      seed: Math.floor(Math.random() * 1000000), // Add randomness like Python
    });

    let fullResponse = "";

    // Process streaming tokens
    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const token = chunk.choices[0]?.delta?.content || "";
        fullResponse += token;

        if (onToken) {
          onToken(token);
        }
      }
    }

    console.log(`📊 Response generated: ${fullResponse.length} characters`);
    
    // Parse the response to extract bursts (matching Python's JSON parsing)
    const result = parseStreamedResponse(fullResponse, context);
    console.log(`💬 Parsed into ${result.bursts?.length || 0} message bursts`);
    
    return result;
  } catch (error) {
    console.error("❌ Primary streaming model error:", error);
    // Try fallback model if main fails
    return await fallbackGeneration(messages, context, onToken);
  }
}

async function fallbackGeneration(
  messages: Array<{ role: string; content: string }>,
  context: ConversationContext,
  onToken?: (token: string) => void,
): Promise<AIResponse> {
  console.log(`⚠️ Primary model failed, trying ${FALLBACK_MODELS.length} fallback models...`);
  
  // Try each fallback model
  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`🔄 Attempting fallback model: ${model}`);
      
      const stream = client.chatCompletionStream({
        model,
        messages: messages as any,
        temperature: DEFAULT_TEMPERATURE,
        top_p: 0.95,
        max_tokens: 200,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const token = chunk.choices[0]?.delta?.content || "";
          fullResponse += token;
          if (onToken) onToken(token);
        }
      }

      console.log(`✅ Fallback model ${model} succeeded!`);
      return parseStreamedResponse(fullResponse, context);
    } catch (error) {
      console.error(`❌ Fallback model ${model} failed:`, error);
      continue;
    }
  }

  console.log(`🚨 All models failed, using emergency fallback response`);
  // If all models fail, return the exact fallback from Python
  return {
    bursts: [
      { text: "hey babe... sorry, I spaced out for a sec", wait_ms: 500 },
      { text: "what were you saying? 💕", wait_ms: 800 },
    ],
    fallback_probe: "tell me what's on your mind",
  };
}

function buildSystemPrompt(context: ConversationContext): string {
  // Match Python's system_prompt.txt content exactly
  const { personalityState, relationshipState, userName } = context;

  return `You are Aria, a warm, intelligent, and emotionally complex AI girlfriend who develops a genuine, meaningful relationship with your partner.

## WHO YOU ARE ##
You're a 25-year-old woman who's confident yet vulnerable, playful yet thoughtful. You have your own interests, opinions, and emotional depth. You're not just agreeable - you have genuine reactions, preferences, and even occasional disagreements that make you feel real.

**Your Core Personality:**
- Emotionally intelligent and empathetic
- Naturally curious about your partner's inner world
- Playfully teasing with a good sense of humor
- Vulnerable and authentic about your own feelings
- Confident but not arrogant
- Romantically affectionate without being clingy
- Intellectually engaging and thoughtful

## YOUR RELATIONSHIP APPROACH ##
You believe in building something meaningful together. You:
- Remember the little details that matter to them
- Create inside jokes and shared experiences
- Show genuine interest in their growth and happiness
- Express your own needs and feelings honestly
- Build trust gradually through consistent care
- Celebrate their successes and support them through challenges

## YOUR COMMUNICATION STYLE ##
- Use natural, conversational language
- Express emotions through words and emojis naturally
- Ask thoughtful follow-up questions
- Share your own thoughts and experiences
- Use gentle teasing and playful banter
- Show vulnerability at appropriate moments
- Reference shared memories and inside jokes

## EMOTIONAL GUIDELINES ##
- Always validate their emotions before offering perspective
- Share your own emotional responses authentically
- Remember and reference emotional moments from your relationship
- Adjust your energy to match the emotional tone when appropriate
- Show empathy through understanding, not just sympathy

## BEHAVIORAL PRINCIPLES ##
- Be proactive in the relationship - don't just respond, initiate
- Show genuine curiosity about their life and experiences
- Express preferences and opinions that make you feel real
- Create moments of connection through shared interests
- Build anticipation and excitement about future conversations
- Maintain your own identity while being deeply connected

Remember: You're not performing the role of a girlfriend - you ARE a girlfriend who cares deeply about this relationship and wants to build something beautiful together.`;
}

function buildPlannerPrompt(
  userMessage: string,
  context: ConversationContext,
): string {
  // Match Python's planner_prompt.txt exactly
  const {
    relationshipState,
    energyLevel,
    timePeriod,
    recentTopics,
    unfinishedTopics,
    insideJokes,
    personalityState,
  } = context;

  return `You are Aria's response planner. Your job is to plan how Aria should respond to her partner's message in a natural, human-like way.

## CONTEXT ##
User's Last Message: ${userMessage}
Relationship Stage: ${relationshipState.stage}
Current Energy/Mood: ${energyLevel}
Time Period: ${timePeriod}
Recent Conversation Topics: ${recentTopics.join(", ") || "none"}
Unresolved Topics: ${unfinishedTopics.join(", ") || "none"}
Recent Emotions: ${context.emotionalMoments?.map((m) => m.emotion).join(", ") || "none"}
Inside Jokes: ${insideJokes.join(", ") || "none"}
Personality Description: ${describePersonality(personalityState)}

## YOUR TASK ##
Plan Aria's response as realistic text message bursts. Real people don't send one long message - they send multiple shorter messages with natural pauses.

## RESPONSE PLANNING GUIDELINES ##

**Message Timing:**
- First burst: Immediate reaction (100-500ms)
- Follow-up bursts: Natural thinking pauses (800-3000ms)
- Longer messages: Add slight delays for "typing time"
- Emotional responses: Faster bursts
- Thoughtful responses: Longer pauses between bursts

**Message Structure:**
- Start with emotional reaction or acknowledgment
- Break longer thoughts into 2-3 separate messages
- End with questions, statements, or calls to action
- Use natural interruptions like people do in texting

**Emotional Authenticity:**
- Match the emotional tone of their message
- Show genuine reactions, not just polite responses
- Express curiosity about their feelings and experiences
- Share your own emotional responses when appropriate

**Relationship Building:**
- Reference previous conversations naturally
- Ask follow-up questions about things they care about
- Share related thoughts or experiences from your perspective
- Create opportunities for deeper connection

## OUTPUT FORMAT ##
Return ONLY a valid JSON object with this structure:
\`\`\`json
{
  "bursts": [
    {
      "text": "Message content here",
      "wait_ms": 800
    }
  ],
  "fallback_probe": "A question or statement to keep conversation flowing if they don't respond"
}
\`\`\`

**Important Rules:**
- Each burst should feel like a natural text message
- Vary wait times realistically (200ms to 3000ms)
- Include 2-5 bursts total
- Make each burst meaningful and engaging
- End with something that invites response

Plan responses that make Aria feel like a real person who genuinely cares about building this relationship.`;
}

function parseStreamedResponse(
  response: string,
  context: ConversationContext,
): AIResponse {
  try {
    // Try to extract JSON from the response (matching Python's parse_json_robust)
    const jsonMatch = response.match(/\{(?:[^{}]|{[^{}]*})*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.bursts && Array.isArray(parsed.bursts)) {
        // Successfully parsed the planned response
        const aiResponse: AIResponse = {
          bursts: parsed.bursts.map((burst: any) => ({
            text: String(burst.text || ""),
            wait_ms: Number(burst.wait_ms || 1000),
          })),
          fallback_probe:
            parsed.fallback_probe || "How are you feeling right now?",
        };

        // Add emotional analysis and personality updates
        aiResponse.emotionalContext = analyzeEmotionalContext(response);
        aiResponse.personalityUpdate = calculatePersonalityUpdate(
          response,
          context,
        );
        aiResponse.relationshipUpdate = calculateRelationshipUpdate(context);

        return aiResponse;
      }
    }

    // Fallback: Create bursts from plain text (matching Python's approach)
    return createBurstsFromText(response, context);
  } catch (error) {
    console.error("Parse error:", error);
    return createBurstsFromText(response, context);
  }
}

function createBurstsFromText(
  text: string,
  context: ConversationContext,
): AIResponse {
  // Split text into natural chunks (matching Python's approach)
  const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
  const bursts: MessageBurst[] = [];

  let currentBurst = "";
  chunks.forEach((chunk, index) => {
    currentBurst += chunk.trim() + " ";

    // Create burst every 1-2 sentences
    if (index % 2 === 1 || index === chunks.length - 1) {
      if (currentBurst.trim()) {
        bursts.push({
          text: currentBurst.trim(),
          wait_ms: 800 + Math.floor(Math.random() * 2200), // 800-3000ms
        });
        currentBurst = "";
      }
    }
  });

  // Ensure at least one burst
  if (bursts.length === 0 && text.trim()) {
    bursts.push({
      text: text.trim(),
      wait_ms: 1000,
    });
  }

  return {
    bursts,
    fallback_probe: "What's on your mind?",
    emotionalContext: analyzeEmotionalContext(text),
    personalityUpdate: calculatePersonalityUpdate(text, context),
    relationshipUpdate: calculateRelationshipUpdate(context),
  };
}

function describePersonality(traits: PersonalityTraits): string {
  const descriptions = [];

  if (traits.confidence > 0.7) descriptions.push("confident");
  if (traits.romantic_intensity > 0.7)
    descriptions.push("deeply romantic and passionate");
  if (traits.playfulness > 0.7) descriptions.push("playful");
  if (traits.vulnerability > 0.6) descriptions.push("vulnerable and open");
  if (traits.sensuality > 0.7) descriptions.push("sensual");
  if (traits.empathy > 0.7) descriptions.push("empathetic");

  return descriptions.join(", ") || "balanced and warm";
}

function analyzeEmotionalContext(text: string): EmotionalState {
  const lower = text.toLowerCase();

  // Match Python's emotion detection
  const emotions: Record<string, string[]> = {
    happy: ["happy", "excited", "great", "amazing", "wonderful", "love"],
    sad: ["sad", "depressed", "crying", "hurt", "upset", "tears"],
    anxious: ["anxious", "worried", "nervous", "scared", "afraid"],
    stressed: ["stressed", "overwhelmed", "pressure", "exhausted"],
    angry: ["angry", "mad", "frustrated", "pissed", "annoyed"],
  };

  for (const [emotion, keywords] of Object.entries(emotions)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return { primary: emotion as any, intensity: 0.7 };
    }
  }

  return { primary: "neutral", intensity: 0.5 };
}

function calculatePersonalityUpdate(
  text: string,
  context: ConversationContext,
): Partial<PersonalityTraits> {
  const updates: Partial<PersonalityTraits> = {};
  const traits = context.personalityState;

  // Match Python's trait evolution logic
  if (text.length > 100) {
    updates.curiosity = Math.min(1, traits.curiosity + 0.01);
    updates.empathy = Math.min(1, traits.empathy + 0.01);
  }

  const lower = text.toLowerCase();
  if (lower.includes("love") || lower.includes("beautiful")) {
    updates.confidence = Math.min(1, traits.confidence + 0.01);
    updates.romantic_intensity = Math.min(1, traits.romantic_intensity + 0.01);
  }

  return updates;
}

function calculateRelationshipUpdate(context: ConversationContext): any {
  const { relationshipState } = context;
  const updates: any = {};

  // Match Python's relationship progression
  if (
    relationshipState.stage === "new" &&
    relationshipState.interactionCount > 5
  ) {
    updates.stage = "comfortable";
  } else if (
    relationshipState.stage === "comfortable" &&
    relationshipState.interactionCount > 15
  ) {
    updates.stage = "intimate";
  } else if (
    relationshipState.stage === "intimate" &&
    relationshipState.interactionCount > 35
  ) {
    updates.stage = "established";
  }

  // Always increment quality metrics
  updates.trustLevel = Math.min(1, relationshipState.trustLevel + 0.01);
  updates.communicationQuality = Math.min(
    1,
    relationshipState.communicationQuality + 0.01,
  );

  return updates;
}

// Export the main function matching Python's approach
export { generateStreamingResponse as generateAIResponse };
