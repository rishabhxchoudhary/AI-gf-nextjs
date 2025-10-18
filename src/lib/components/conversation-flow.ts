/**
 * Conversation Flow Manager for AI Girlfriend
 * Handles natural conversation patterns, follow-ups, validations, and topic transitions
 */

interface ConversationThread {
  topic: string;
  status: "ongoing" | "resolved" | "needs_followup" | "waiting_for_user";
  lastMentioned: string; // ISO string
  importance: number; // 0.0 to 1.0
  context: string;
  userEngagement: number; // How engaged the user seemed with this topic
}

interface ConversationSuggestion {
  type: "followup" | "exploration" | "support";
  text: string;
  priority: "high" | "medium" | "low";
}

interface ConversationSuggestions {
  type: "suggestion";
  options: ConversationSuggestion[];
}

interface ConversationContinuity {
  activeThreads: number;
  totalThreads: number;
  recentTopics: string[];
  highPriorityThreads: string[];
  needsFollowup: string[];
}

interface ConversationPattern {
  pattern: string;
  avgMessageLength?: number;
  engagementLevel?: "high" | "medium" | "low";
  emotionalContent?: number;
  questionFrequency?: number;
  conversationDepth?: "deep" | "surface";
}

interface ConversationContext {
  user_shared_personal?: boolean;
  user_emotion?: string;
  [key: string]: unknown;
}

interface ConversationThreadData {
  topic: string;
  status: string;
  lastMentioned: string;
  importance: number;
  context: string;
  userEngagement: number;
}

interface ConversationData {
  conversation_threads?: Record<string, ConversationThreadData>;
  recent_topics?: string[];
}

export class ConversationFlowManager {
  private conversationThreads: Map<string, ConversationThread> = new Map();
  private recentTopics: string[] = [];
  private questionPatterns: Record<string, string[]>;
  private transitionPhrases: Record<string, string[]>;
  private validationResponses: string[];
  private followUpPatterns: Record<string, string[]>;

  constructor() {
    this.questionPatterns = this.loadQuestionPatterns();
    this.transitionPhrases = this.loadTransitionPhrases();
    this.validationResponses = this.loadValidationResponses();
    this.followUpPatterns = this.loadFollowupPatterns();
  }

  private getRandomElement<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot get random element from empty array");
    }
    return array[Math.floor(Math.random() * array.length)] as T;
  }

  private loadQuestionPatterns(): Record<string, string[]> {
    return {
      emotional_support: [
        "How are you feeling about it now?",
        "What's going through your mind?",
        "Do you want to talk about what's bothering you?",
        "Is there anything I can do to help?",
        "How long have you been feeling this way?"
      ],
      story_continuation: [
        "What happened next?",
        "How did that make you feel?",
        "What did you do then?",
        "Tell me more about that",
        "That sounds intense - what was going through your head?"
      ],
      clarification: [
        "Can you help me understand what you mean?",
        "I want to make sure I get this right - are you saying...?",
        "Wait, back up - tell me more about that part",
        "I'm following you, but can you explain...?"
      ],
      deeper_exploration: [
        "What's the most challenging part about that?",
        "How do you think that affected you?",
        "What would you change if you could?",
        "What's your gut feeling telling you?",
        "What matters most to you in this situation?"
      ],
      validation_seeking: [
        "That makes perfect sense to me",
        "You're absolutely right to feel that way",
        "Anyone would react like that",
        "Your feelings are completely valid",
        "I can see why that would be important to you"
      ]
    };
  }

  private loadTransitionPhrases(): Record<string, string[]> {
    return {
      gentle_redirect: [
        "Speaking of {topic}, how was...",
        "That reminds me - you mentioned...",
        "On a related note...",
        "Actually, that makes me think of...",
        "Oh, and about what you said earlier..."
      ],
      time_based: [
        "Earlier you mentioned...",
        "Yesterday you were telling me about...",
        "I've been thinking about what you said...",
        "Remember when you told me...?"
      ],
      emotional_bridge: [
        "I can see this is really affecting you. It reminds me of when you...",
        "This seems to connect to something deeper...",
        "I'm hearing some similar feelings to when you..."
      ],
      natural_flow: [
        "You know what's interesting?",
        "That actually brings up something I've been curious about...",
        "Can I ask you something related to that?",
        "This might be random, but..."
      ]
    };
  }

  private loadValidationResponses(): string[] {
    return [
      "That sounds really hard",
      "I can hear how much this means to you",
      "Your feelings make complete sense",
      "Anyone would feel that way",
      "That's such a normal reaction",
      "You're handling this so well",
      "I can see why that would be difficult",
      "That takes a lot of strength",
      "You're not alone in feeling this way",
      "That's really insightful of you"
    ];
  }

  private loadFollowupPatterns(): Record<string, string[]> {
    return {
      work_stress: [
        "How did that meeting go?",
        "Did you get through that deadline okay?",
        "Is work still overwhelming?",
        "How are things with your boss now?"
      ],
      relationship_issues: [
        "How are things with them now?",
        "Did you end up talking to them?",
        "How are you feeling about the situation?",
        "Any updates on that situation?"
      ],
      health_concerns: [
        "How are you feeling today?",
        "Did you get a chance to see the doctor?",
        "Are you taking care of yourself?",
        "How's your energy level been?"
      ],
      family_drama: [
        "How did things go with your family?",
        "Have you talked to them since?",
        "How are you processing all of that?",
        "Are things any better at home?"
      ],
      future_plans: [
        "Have you thought more about that decision?",
        "Any progress on those plans?",
        "How are you feeling about that choice now?",
        "What's your next step going to be?"
      ]
    };
  }

  trackConversationThread(topic: string, userText: string, userEngagement = 0.5): void {
    const importance = this.calculateTopicImportance(topic, userText);
    const status = this.determineThreadStatus(topic, userText, userEngagement);

    const thread: ConversationThread = {
      topic,
      status,
      lastMentioned: new Date().toISOString(),
      importance,
      context: userText.substring(0, 200), // Store context excerpt
      userEngagement
    };

    this.conversationThreads.set(topic, thread);

    // Add to recent topics
    if (!this.recentTopics.includes(topic)) {
      this.recentTopics.push(topic);
    }

    // Keep recent topics manageable
    if (this.recentTopics.length > 15) {
      this.recentTopics = this.recentTopics.slice(-15);
    }
  }

  private calculateTopicImportance(topic: string, userText: string): number {
    let importance = 0.5; // Base importance

    // Length of message indicates investment
    if (userText.length > 100) {
      importance += 0.2;
    } else if (userText.length > 200) {
      importance += 0.3;
    }

    // Emotional words increase importance
    const emotionalWords = ["feel", "hurt", "happy", "scared", "worried", "excited", "love", "hate"];
    const emotionCount = emotionalWords.filter(word => userText.toLowerCase().includes(word)).length;
    importance += Math.min(emotionCount * 0.1, 0.3);

    // Personal pronouns indicate personal investment
    const personalWords = ["my", "me", "I", "myself"];
    const personalCount = personalWords.filter(word => userText.toLowerCase().includes(word)).length;
    importance += Math.min(personalCount * 0.05, 0.2);

    // Certain topics are inherently important
    const importantTopics = ["work", "family", "health", "relationship", "future", "career"];
    if (importantTopics.some(impTopic => topic.toLowerCase().includes(impTopic))) {
      importance += 0.2;
    }

    return Math.min(importance, 1.0);
  }

  private determineThreadStatus(topic: string, userText: string, engagement: number): ConversationThread["status"] {
    // Check for resolution indicators
    const resolutionWords = ["resolved", "better now", "figured it out", "all good", "worked out"];
    if (resolutionWords.some(word => userText.toLowerCase().includes(word))) {
      return "resolved";
    }

    // Check for continuation indicators
    const continuationWords = ["still", "continue", "ongoing", "more", "also", "and"];
    if (continuationWords.some(word => userText.toLowerCase().includes(word))) {
      return "ongoing";
    }

    // Low engagement might mean user doesn't want to continue
    if (engagement < 0.3) {
      return "waiting_for_user";
    }

    // High engagement means followup is welcome
    if (engagement > 0.7) {
      return "needs_followup";
    }

    return "ongoing";
  }

  generateFollowUpQuestion(topic: string, context = ""): string | null {
    const thread = this.conversationThreads.get(topic);
    
    if (!thread) {
      return null;
    }

    // Don't follow up on resolved topics
    if (thread.status === "resolved") {
      return null;
    }

    // Don't follow up too frequently
    const timeSinceMention = Date.now() - new Date(thread.lastMentioned).getTime();
    const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    if (timeSinceMention < twoHours) {
      return null;
    }

    // Choose appropriate follow-up based on topic category
    const category = this.categorizeTopic(topic);
    const followups = this.followUpPatterns[category];

    if (!followups || followups.length === 0) {
      // Generic follow-ups
      const genericFollowups = [
        `How did that ${topic} situation work out?`,
        `Any updates on the ${topic} thing?`,
        `I've been thinking about what you said about ${topic}...`,
        `How are you feeling about ${topic} now?`
      ];
      return this.getRandomElement(genericFollowups);
    }

    return this.getRandomElement(followups);
  }

  private categorizeTopic(topic: string): string {
    const topicLower = topic.toLowerCase();

    if (["work", "job", "boss", "career", "deadline"].some(word => topicLower.includes(word))) {
      return "work_stress";
    }
    if (["relationship", "friend", "dating", "breakup"].some(word => topicLower.includes(word))) {
      return "relationship_issues";
    }
    if (["health", "doctor", "sick", "pain"].some(word => topicLower.includes(word))) {
      return "health_concerns";
    }
    if (["family", "mom", "dad", "sister", "brother"].some(word => topicLower.includes(word))) {
      return "family_drama";
    }
    if (["future", "plan", "decision", "choice"].some(word => topicLower.includes(word))) {
      return "future_plans";
    }
    return "general";
  }

  generateNaturalTransition(currentTopic: string, newTopic: string): string {
    const transitionTypes = ["gentle_redirect", "natural_flow"];
    const transitionType = this.getRandomElement(transitionTypes);
    const transitions = this.transitionPhrases[transitionType] || [];

    if (transitionType === "gentle_redirect" && transitions.length > 0) {
      const template = this.getRandomElement(transitions);
      return template.replace("{topic}", newTopic);
    }
    
    if (transitions.length > 0) {
      return this.getRandomElement(transitions);
    }
    
    return "That reminds me...";
  }

  generateValidationResponse(userEmotion = ""): string {
    if (["sad", "stressed", "anxious"].includes(userEmotion)) {
      const validations = [
        "That sounds really overwhelming",
        "I can hear how hard this is for you",
        "Your feelings are completely valid",
        "Anyone would struggle with that"
      ];
      return this.getRandomElement(validations);
    }
    if (["happy", "excited"].includes(userEmotion)) {
      const validations = [
        "I love hearing the excitement in your voice!",
        "That's such wonderful news!",
        "You deserve to feel happy about this",
        "I'm so happy for you!"
      ];
      return this.getRandomElement(validations);
    }
    return this.getRandomElement(this.validationResponses);
  }

  suggestConversationDirection(context: ConversationContext): ConversationSuggestions {
    const suggestions: ConversationSuggestions = {
      type: "suggestion",
      options: []
    };

    // Check for unresolved threads that need follow-up
    const unresolvedThreads = Array.from(this.conversationThreads.values()).filter(
      thread => ["needs_followup", "ongoing"].includes(thread.status) && thread.importance > 0.6
    );

    if (unresolvedThreads.length > 0) {
      // Sort by importance
      const thread = unresolvedThreads.reduce((prev, current) => 
        prev.importance > current.importance ? prev : current
      );
      
      suggestions.options.push({
        type: "followup",
        text: `Earlier you mentioned ${thread.topic}. How did that go?`,
        priority: "high"
      });
    }

    // Suggest deeper exploration if user shared something personal
    if (context.user_shared_personal) {
      const questions = this.questionPatterns.deeper_exploration;
      if (questions && questions.length > 0) {
        suggestions.options.push({
          type: "exploration",
          text: this.getRandomElement(questions),
          priority: "medium"
        });
      }
    }

    // Suggest emotional support if user seems distressed
    if (["sad", "stressed", "anxious"].includes(context.user_emotion || "")) {
      const questions = this.questionPatterns.emotional_support;
      if (questions && questions.length > 0) {
        suggestions.options.push({
          type: "support",
          text: this.getRandomElement(questions),
          priority: "high"
        });
      }
    }

    return suggestions;
  }

  getConversationContinuity(): ConversationContinuity {
    const activeThreads = Array.from(this.conversationThreads.values()).filter(
      thread => ["ongoing", "needs_followup"].includes(thread.status)
    );

    return {
      activeThreads: activeThreads.length,
      totalThreads: this.conversationThreads.size,
      recentTopics: this.recentTopics.slice(-5),
      highPriorityThreads: activeThreads
        .filter(thread => thread.importance > 0.7)
        .map(thread => thread.topic),
      needsFollowup: activeThreads
        .filter(thread => thread.status === "needs_followup")
        .map(thread => thread.topic)
    };
  }

  cleanupOldThreads(daysOld = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldThreads: string[] = [];
    
    this.conversationThreads.forEach((thread, topic) => {
      const threadDate = new Date(thread.lastMentioned);
      if (threadDate < cutoffDate && thread.importance < 0.5) {
        oldThreads.push(topic);
      }
    });

    for (const topic of oldThreads) {
      this.conversationThreads.delete(topic);
    }
  }

  detectConversationPatterns(recentMessages: string[]): ConversationPattern {
    if (recentMessages.length < 3) {
      return { pattern: "insufficient_data" };
    }

    // Analyze message lengths
    const lengths = recentMessages.map(msg => msg.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;

    // Analyze emotional content
    const emotionalMessages = recentMessages.filter(msg => this.containsEmotions(msg)).length;

    // Analyze question frequency
    const questions = recentMessages.filter(msg => msg.includes("?")).length;

    return {
      pattern: "analyzed",
      avgMessageLength: avgLength,
      engagementLevel: avgLength > 50 ? "high" : avgLength > 20 ? "medium" : "low",
      emotionalContent: emotionalMessages / recentMessages.length,
      questionFrequency: questions / recentMessages.length,
      conversationDepth: emotionalMessages > recentMessages.length * 0.6 ? "deep" : "surface"
    };
  }

  private containsEmotions(text: string): boolean {
    const emotionWords = [
      "feel", "emotion", "happy", "sad", "angry", "excited", "worried",
      "stressed", "anxious", "love", "hate", "frustrated", "grateful"
    ];
    return emotionWords.some(word => text.toLowerCase().includes(word));
  }

  toDict(): ConversationData {
    const conversationThreads: Record<string, ConversationThreadData> = {};
    
    this.conversationThreads.forEach((thread, topic) => {
      conversationThreads[topic] = {
        topic: thread.topic,
        status: thread.status,
        lastMentioned: thread.lastMentioned,
        importance: thread.importance,
        context: thread.context,
        userEngagement: thread.userEngagement
      };
    });

    return {
      conversation_threads: conversationThreads,
      recent_topics: this.recentTopics
    };
  }

  fromDict(data: ConversationData): void {
    if (data.conversation_threads) {
      this.conversationThreads.clear();
      
      for (const [topic, threadData] of Object.entries(data.conversation_threads)) {
        this.conversationThreads.set(topic, {
          topic: threadData.topic,
          status: threadData.status as ConversationThread["status"],
          lastMentioned: threadData.lastMentioned,
          importance: threadData.importance,
          context: threadData.context,
          userEngagement: threadData.userEngagement
        });
      }
    }

    if (data.recent_topics) {
      this.recentTopics = data.recent_topics;
    }
  }
}