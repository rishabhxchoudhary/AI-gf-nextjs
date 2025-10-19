import type {
  ConversationContext,
  EmotionalState,
  PersonalityTraits,
  RelationshipState,
} from "@/types/ai-girlfriend";
import { PersonalityManager } from "./personality-manager";
import { RelationshipTracker } from "./relationship-tracker";
import { TemporalEngine } from "./temporal-engine";
import { AgenticBehaviorEngine } from "./agentic-behaviors";
import { EmotionalIntelligence } from "./emotional-intelligence";
import { ConversationFlowManager } from "./conversation-flow";
import { DeepMemoryManager } from "./deep-memory";
import { ProactiveBehaviorEngine } from "./proactive-behaviors";
import { PersonalityQuirks } from "./personality-quirks";
import { RealisticTypingEngine } from "./realistic-typing";

interface Memory {
  user_name?: string;
  user_age?: number;
  user_location?: string;
  user_preferences?: Record<string, any>;
  relationship_status?: string;
  personality_traits?: Record<string, any>;
  conversation_style?: string;
  interests?: string[];
  last_conversation_time?: string;
  total_conversations?: number;
  favorite_topics?: string[];
  emotional_patterns?: Record<string, any>;
}

interface ConversationEntry {
  timestamp: string;
  speaker: string;
  message: string;
  metadata?: Record<string, any>;
}

export class AgenticMemoryManager {
  memory: Memory;
  conversations: ConversationEntry[];
  personalityManager: PersonalityManager;
  relationshipTracker: RelationshipTracker;
  temporalEngine: TemporalEngine;
  behaviorEngine: AgenticBehaviorEngine;
  emotionalIntelligence: EmotionalIntelligence;
  conversationFlow: ConversationFlowManager;
  deepMemory: DeepMemoryManager;
  proactiveBehaviors: ProactiveBehaviorEngine;
  personalityQuirks: PersonalityQuirks;
  realisticTyping: RealisticTypingEngine;

  // Enhanced memory categories
  userPreferences: Record<string, any>;
  insideJokes: string[];
  unresolved_topics: string[];
  conversation_themes: string[];
  emotional_moments: Array<{
    timestamp: string;
    description: string;
    emotion: string;
    context?: string;
    intensity: number;
    resolved: boolean;
  }>;

  // Track cum sessions (from Python)
  cumSessions: number;
  lastCumTime: string | null;

  constructor() {
    this.memory = {};
    this.conversations = [];

    // Initialize agentic components - exact from Python
    this.personalityManager = new PersonalityManager();
    this.relationshipTracker = new RelationshipTracker();
    this.temporalEngine = new TemporalEngine();
    this.behaviorEngine = new AgenticBehaviorEngine();

    // Initialize new human-like interaction components
    this.emotionalIntelligence = new EmotionalIntelligence();
    this.conversationFlow = new ConversationFlowManager();
    this.deepMemory = new DeepMemoryManager();
    this.proactiveBehaviors = new ProactiveBehaviorEngine();
    this.personalityQuirks = new PersonalityQuirks();
    this.realisticTyping = new RealisticTypingEngine();

    // Enhanced memory categories
    this.userPreferences = {};
    this.insideJokes = [];
    this.unresolved_topics = [];
    this.conversation_themes = [];
    this.emotional_moments = [];

    // New: Track cum sessions
    this.cumSessions = 0;
    this.lastCumTime = null;

    this.loadData();
  }

  loadData(): void {
    // In browser environment, we'd load from localStorage or API
    // For now, initialize with defaults
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    this.memory = {};
    this.userPreferences = {};
    this.insideJokes = [];
    this.unresolved_topics = [];
    this.conversation_themes = [];
    this.emotional_moments = [];
    this.cumSessions = 0;
    this.lastCumTime = null;
  }

  saveData(): void {
    // In browser, save to localStorage or send to API
    const saveData = {
      basic_memory: this.memory,
      user_preferences: this.userPreferences,
      inside_jokes: this.insideJokes,
      unresolved_topics: this.unresolved_topics,
      conversation_themes: this.conversation_themes,
      emotional_moments: this.emotional_moments,
      personality_manager: this.personalityManager.toDict(),
      relationship_tracker: this.relationshipTracker.toDict(),
      conversation_flow: this.conversationFlow.toDict(),
      deep_memory: this.deepMemory.toDict(),
      personality_quirks: this.personalityQuirks.toDict(),
      cum_sessions: this.cumSessions,
      last_cum_time: this.lastCumTime,
      last_updated: new Date().toISOString(),
    };

    // Save logic here
    if (typeof window !== "undefined") {
      localStorage.setItem("ai_gf_memory", JSON.stringify(saveData));
    }
  }

  analyzeAndUpdateFromText(text: string, context?: any): void {
    const textLower = text.toLowerCase();

    // Extract basic info
    this.extractBasicInfo(text);

    // Analyze themes
    const themes = this.analyzeConversationThemes(text);
    themes.forEach((theme) => {
      if (!this.conversation_themes.includes(theme)) {
        this.conversation_themes.push(theme);
      }
    });

    // Analyze emotional context
    const emotionalContext = this.analyzeEmotionalContext(text);
    if (emotionalContext.intensity > 0.5) {
      this.emotional_moments.push({
        timestamp: new Date().toISOString(),
        description: text.substring(0, 100),
        emotion: emotionalContext.primary,
        context: text.substring(0, 100),
        intensity: emotionalContext.intensity,
        resolved: false,
      });

      // Keep only last 50 emotional moments
      if (this.emotional_moments.length > 50) {
        this.emotional_moments = this.emotional_moments.slice(-50);
      }
    }

    // Build interaction context for personality updates
    const interactionContext = this.buildInteractionContext(text, context);

    // Update personality based on interaction
    this.personalityManager.updateTraitsFromInteraction(interactionContext);

    // Record interaction in relationship tracker
    this.relationshipTracker.recordInteraction("message", interactionContext);

    // Track user activity for temporal patterns
    this.temporalEngine.trackUserActivity(new Date().toISOString());

    // Check for cum session mentions (from Python)
    if (
      textLower.includes("cum") ||
      textLower.includes("came") ||
      textLower.includes("orgasm")
    ) {
      this.cumSessions++;
      this.lastCumTime = new Date().toISOString();
    }

    // Update deep memory
    this.deepMemory.storeMemory(
      text,
      "conversation",
      emotionalContext.primary,
      emotionalContext.intensity,
    );

    this.saveData();
  }

  private extractBasicInfo(text: string): void {
    const textLower = text.toLowerCase();

    // Extract name
    const nameMatch = text.match(
      /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+)/i,
    );
    if (nameMatch && nameMatch[1]) {
      this.memory.user_name = nameMatch[1];
    }

    // Extract age
    const ageMatch = text.match(
      /(?:i'm|i am|im)\s+(\d{1,2})\s+(?:years old|yo)/i,
    );
    if (ageMatch && ageMatch[1]) {
      this.memory.user_age = parseInt(ageMatch[1]);
    }

    // Extract location
    const locationMatch = text.match(
      /(?:i'm from|i live in|from|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    );
    if (locationMatch && locationMatch[1]) {
      this.memory.user_location = locationMatch[1];
    }

    // Extract interests
    const interestKeywords = [
      "like",
      "love",
      "enjoy",
      "interested in",
      "passionate about",
    ];
    interestKeywords.forEach((keyword) => {
      const regex = new RegExp(`(?:i ${keyword})\\s+(.+?)(?:\\.|,|!|$)`, "gi");
      const matches = text.matchAll(regex);
      for (const match of matches) {
        if (!match[1]) continue;
        const interest = match[1].trim();
        if (!this.memory.interests) {
          this.memory.interests = [];
        }
        if (!this.memory.interests.includes(interest)) {
          this.memory.interests.push(interest);
        }
      }
    });
  }

  private analyzeConversationThemes(text: string): string[] {
    const themes: string[] = [];
    const textLower = text.toLowerCase();

    const themeKeywords: Record<string, string[]> = {
      work: [
        "work",
        "job",
        "boss",
        "colleague",
        "office",
        "project",
        "meeting",
      ],
      relationships: [
        "girlfriend",
        "boyfriend",
        "dating",
        "love",
        "relationship",
        "partner",
      ],
      family: ["family", "mom", "dad", "mother", "father", "sister", "brother"],
      health: ["health", "sick", "doctor", "hospital", "pain", "medical"],
      emotions: ["happy", "sad", "angry", "stressed", "anxious", "excited"],
      future: ["future", "plan", "goal", "dream", "hope", "want"],
      past: ["remember", "used to", "before", "memory", "past"],
      sexual: [
        "sex",
        "horny",
        "hot",
        "kiss",
        "touch",
        "want you",
        "bed",
        "fuck",
      ],
      daily_life: ["today", "yesterday", "morning", "evening", "weekend"],
      hobbies: ["music", "movie", "book", "game", "sport", "hobby"],
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some((keyword) => textLower.includes(keyword))) {
        themes.push(theme);
      }
    }

    return themes;
  }

  private analyzeEmotionalContext(text: string): EmotionalState {
    const textLower = text.toLowerCase();

    const emotionPatterns: Record<string, string[]> = {
      happy: [
        "happy",
        "joy",
        "excited",
        "amazing",
        "wonderful",
        "great",
        "awesome",
        "love",
      ],
      sad: ["sad", "cry", "tears", "depressed", "down", "upset", "hurt"],
      angry: ["angry", "mad", "pissed", "furious", "annoyed", "frustrated"],
      anxious: ["anxious", "worried", "nervous", "scared", "afraid", "panic"],
      stressed: ["stressed", "overwhelmed", "pressure", "exhausted", "tired"],
      lonely: ["lonely", "alone", "miss", "isolated", "empty"],
      excited: ["excited", "can't wait", "thrilled", "pumped", "eager"],
    };

    for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
      const matches = patterns.filter((pattern) => textLower.includes(pattern));
      if (matches.length > 0) {
        return {
          primary: emotion as any,
          intensity: Math.min(1.0, 0.3 + matches.length * 0.2),
          triggers: matches,
        };
      }
    }

    return { primary: "neutral", intensity: 0.5 };
  }

  private buildInteractionContext(text: string, baseContext?: any): any {
    const context = baseContext || {};

    context.positive_user_response = this.isPositiveResponse(text);
    context.user_shared_personal = this.containsPersonalSharing(text);
    context.sexual_content = this.containsSexualContent(text);
    context.user_affection = this.containsAffection(text);
    context.user_distant = this.seemsDistant(text);
    context.main_topic = this.extractMainTopic(text);
    context.content_category = this.categorizeContent(text);
    context.conversation_length = this.conversations.length;
    context.message_length = text.length;

    return context;
  }

  private isPositiveResponse(text: string): boolean {
    const positiveIndicators = [
      "yes",
      "yeah",
      "sure",
      "okay",
      "great",
      "awesome",
      "love",
      "like",
      "good",
      "nice",
      "wonderful",
      "amazing",
    ];
    return positiveIndicators.some((indicator) =>
      text.toLowerCase().includes(indicator),
    );
  }

  private containsPersonalSharing(text: string): boolean {
    const personalIndicators = [
      "i feel",
      "i think",
      "my life",
      "i am",
      "i'm",
      "when i",
      "i was",
      "i remember",
    ];
    return personalIndicators.some((indicator) =>
      text.toLowerCase().includes(indicator),
    );
  }

  private containsSexualContent(text: string): boolean {
    const sexualIndicators = [
      "sex",
      "horny",
      "fuck",
      "kiss",
      "touch",
      "naked",
      "bed",
      "hot",
      "wet",
      "hard",
      "cum",
    ];
    return sexualIndicators.some((indicator) =>
      text.toLowerCase().includes(indicator),
    );
  }

  private containsAffection(text: string): boolean {
    const affectionIndicators = [
      "love you",
      "miss you",
      "care about you",
      "adore",
      "sweetheart",
      "baby",
      "babe",
      "darling",
    ];
    return affectionIndicators.some((indicator) =>
      text.toLowerCase().includes(indicator),
    );
  }

  private seemsDistant(text: string): boolean {
    const distantIndicators = [
      "k",
      "ok",
      "whatever",
      "sure",
      "i guess",
      "maybe",
      "idk",
      "don't know",
    ];
    return (
      text.length < 10 ||
      distantIndicators.some((indicator) => text.toLowerCase() === indicator)
    );
  }

  private extractMainTopic(text: string): string {
    // Simple topic extraction
    const sentences = text.split(/[.!?]/);
    if (sentences.length > 0) {
      const mainSentence = sentences[0]?.trim();
      if (!mainSentence) return "general conversation";
      const words = mainSentence.split(" ");

      // Find noun-like words (simplified)
      const topics = words.filter(
        (word) =>
          word.length > 3 &&
          ![
            "what",
            "when",
            "where",
            "why",
            "how",
            "that",
            "this",
            "have",
            "been",
            "will",
          ].includes(word.toLowerCase()),
      );

      return topics.slice(0, 3).join(" ") || "general conversation";
    }
    return "general conversation";
  }

  private categorizeContent(text: string): string {
    if (this.containsSexualContent(text)) return "sexual";
    if (this.containsAffection(text)) return "affectionate";
    if (text.includes("?")) return "question";
    if (text.length > 100) return "story";
    return "casual";
  }

  getAgenticContext(): ConversationContext {
    const timePeriod = this.temporalEngine.getCurrentTimePeriod();

    return {
      userId: "",
      sessionId: "",
      userName: this.memory.user_name,
      userAge: this.memory.user_age,
      relationshipState: this.relationshipTracker.getCurrentState(),
      personalityState: this.personalityManager.getEffectiveTraits(),
      currentMood: this.personalityManager.getCurrentMood(),
      recentTopics: this.conversation_themes.slice(-5),
      unfinishedTopics: this.unresolved_topics.slice(-3),
      insideJokes: this.insideJokes.slice(-5),
      userPreferences: this.userPreferences,
      emotionalMoments: this.emotional_moments.slice(-10).map((moment) => ({
        timestamp: moment.timestamp,
        description: moment.description,
        emotion: moment.emotion as any,
        intensity: moment.intensity,
        resolved: moment.resolved,
      })),
      lastInteractionTime:
        this.conversations.length > 0
          ? this.conversations[this.conversations.length - 1]?.timestamp
          : undefined,
      timePeriod: timePeriod as any,
      energyLevel: this.temporalEngine.getEnergyLevel(timePeriod) as any,
    };
  }

  addConversationEntry(speaker: string, message: string, metadata?: any): void {
    this.conversations.push({
      timestamp: new Date().toISOString(),
      speaker,
      message,
      metadata,
    });

    // Keep only last 200 conversations
    if (this.conversations.length > 200) {
      this.conversations = this.conversations.slice(-200);
    }
  }
}
