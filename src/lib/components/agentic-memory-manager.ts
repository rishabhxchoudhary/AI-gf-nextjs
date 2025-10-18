import type { PersonalityTraits, RelationshipStage, MessageMetadata, Milestone } from "@/types/ai-girlfriend";

export interface AgenticContext {
  user_name: string;
  relationship_stage: RelationshipStage;
  personality_traits: PersonalityTraits;
  time_period: string;
  conversation_length: number;
  recent_topics: string[];
  unresolved_topics: string[];
  inside_jokes: string[];
  recent_emotions: Array<{ emotion: string; intensity: number }>;
  user_preferences: Record<string, string[]>;
  relationship_quality: {
    trust_level: number;
    intimacy_level: number;
    sexual_chemistry: number;
    communication_quality: number;
  };
  milestones: Milestone[];
  cum_sessions: number;
  last_cum_time?: string;
}

export interface RelationshipContext {
  current_stage: RelationshipStage;
  stage_description: string;
  interaction_count: number;
  relationship_quality: {
    trust_level: number;
    intimacy_level: number;
    sexual_chemistry: number;
    communication_quality: number;
  };
  recent_milestones: Milestone[];
  max_vulnerability: number;
  sexual_openness: number;
  appropriate_behaviors: string[];
}

export interface TemporalContext {
  time_period: string;
  energy_level: string;
  current_hour: number;
}

export class AgenticMemoryManager {
  private context: AgenticContext;
  private conversations: Array<{
    timestamp: string;
    speaker: string;
    message: string;
    relationship_stage: RelationshipStage;
    personality_snapshot: PersonalityTraits;
    metadata: MessageMetadata;
  }> = [];

  constructor() {
    this.context = this.getDefaultContext();
  }

  private getDefaultContext(): AgenticContext {
    return {
      user_name: "babe",
      relationship_stage: "comfortable",
      personality_traits: {
        confidence: 0.7,
        romantic_intensity: 0.8,
        playfulness: 0.8,
        vulnerability: 0.4,
        assertiveness: 0.6,
        curiosity: 0.7,
        empathy: 0.9,
        spontaneity: 0.7,
        possessiveness: 0.3,
        loyalty: 0.9,
        sensuality: 0.6,
        intelligence: 0.8,
        humor: 0.7,
        emotional_intensity: 0.7,
        independence: 0.5,
      },
      time_period: "evening",
      conversation_length: 0,
      recent_topics: [],
      unresolved_topics: [],
      inside_jokes: [],
      recent_emotions: [],
      user_preferences: {},
      relationship_quality: {
        trust_level: 0.7,
        intimacy_level: 0.6,
        sexual_chemistry: 0.5,
        communication_quality: 0.8,
      },
      milestones: [],
      cum_sessions: 0,
    };
  }

  async initializeFromDatabase(userId: string, sessionId: string) {
    // In a real implementation, this would load from the database
    // For now, we'll initialize with defaults and update based on current time
    this.updateTemporalContext();
  }

  private updateTemporalContext() {
    const hour = new Date().getHours();
    
    if (hour >= 4 && hour < 7) {
      this.context.time_period = "early_morning";
    } else if (hour >= 7 && hour < 12) {
      this.context.time_period = "morning";
    } else if (hour >= 12 && hour < 17) {
      this.context.time_period = "afternoon";
    } else if (hour >= 17 && hour < 22) {
      this.context.time_period = "evening";
    } else {
      this.context.time_period = "late_night";
    }
  }

  getAgenticContext(): AgenticContext {
    return this.context;
  }

  getPersonalityDescription(): string {
    const traits = this.context.personality_traits;
    const descriptions = [];

    if (traits.confidence > 0.7) {
      descriptions.push("confident and assertive");
    } else if (traits.confidence < 0.4) {
      descriptions.push("shy and uncertain");
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

    if (traits.empathy > 0.8) {
      descriptions.push("deeply empathetic");
    }

    return descriptions.join(", ") || "balanced and warm personality";
  }

  getRelationshipContext(): RelationshipContext {
    const stage = this.context.relationship_stage;
    
    // Import the stage descriptions from prompts
    const stageDescriptions = {
      new: "Early exploration phase - curious about each other, slightly shy but interested",
      comfortable: "Established comfort - more open and playful, light teasing",
      intimate: "Deep emotional connection - vulnerable sharing, inside jokes, future planning",
      established: "Committed relationship - couple dynamics, complete openness, deep intimacy"
    };

    const maxVulnerability = {
      new: 3,
      comfortable: 6,
      intimate: 8,
      established: 10
    };

    const sexualOpenness = {
      new: 6,
      comfortable: 8,
      intimate: 9.5,
      established: 10
    };

    const appropriateBehaviors = {
      new: ["curious", "slightly shy", "testing boundaries", "polite"],
      comfortable: ["more open", "sharing opinions", "light teasing", "playful"],
      intimate: ["vulnerable", "inside jokes", "future planning", "deep sharing"],
      established: ["deep intimacy", "couple dynamics", "complete openness"]
    };

    return {
      current_stage: stage,
      stage_description: stageDescriptions[stage],
      interaction_count: this.context.conversation_length,
      relationship_quality: this.context.relationship_quality,
      recent_milestones: this.context.milestones,
      max_vulnerability: maxVulnerability[stage],
      sexual_openness: sexualOpenness[stage],
      appropriate_behaviors: appropriateBehaviors[stage],
    };
  }

  getTemporalContext(): TemporalContext {
    const energyLevels = {
      early_morning: "low",
      morning: "medium",
      afternoon: "high", 
      evening: "medium",
      late_night: "low"
    };

    return {
      time_period: this.context.time_period,
      energy_level: energyLevels[this.context.time_period as keyof typeof energyLevels] || "medium",
      current_hour: new Date().getHours(),
    };
  }

  async analyzeAndUpdateFromText(userText: string, conversationContext: Record<string, string | number | boolean>) {
    // Analyze emotional content
    this.analyzeEmotionalContent(userText);
    
    // Extract topics
    this.extractTopics(userText);
    
    // Update personality based on interaction
    this.updatePersonalityFromInteraction(userText);
    
    // Update relationship metrics
    this.updateRelationshipMetrics(userText);
    
    // Increment conversation length
    this.context.conversation_length += 1;
  }

  private analyzeEmotionalContent(text: string) {
    const emotions = {
      happy: ["happy", "excited", "great", "amazing", "love", "wonderful"],
      sad: ["sad", "depressed", "hurt", "crying", "lonely", "miss"],
      angry: ["angry", "mad", "frustrated", "pissed", "hate"],
      anxious: ["worried", "nervous", "scared", "anxious", "stress"],
      affectionate: ["love", "miss", "care", "adore", "cherish"],
      sexual: ["sexy", "hot", "want", "desire", "turn on", "aroused"]
    };

    const lowerText = text.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        this.context.recent_emotions.push({
          emotion,
          intensity: 0.7
        });
        
        // Keep only recent emotions (last 5)
        if (this.context.recent_emotions.length > 5) {
          this.context.recent_emotions = this.context.recent_emotions.slice(-5);
        }
        break;
      }
    }
  }

  private extractTopics(text: string) {
    // Simple topic extraction - in production this could be more sophisticated
    const words = text.toLowerCase().split(/\s+/);
    const topicKeywords = words.filter(word => 
      word.length > 4 && 
      !["that", "this", "with", "have", "been", "were", "what", "when", "where", "they", "them"].includes(word)
    );

    if (topicKeywords.length > 0) {
      const newTopic = topicKeywords[0];
      if (newTopic && !this.context.recent_topics.includes(newTopic)) {
        this.context.recent_topics.push(newTopic);
        
        // Keep only recent topics (last 10)
        if (this.context.recent_topics.length > 10) {
          this.context.recent_topics = this.context.recent_topics.slice(-10);
        }
      }
    }
  }

  private updatePersonalityFromInteraction(text: string) {
    const traits = this.context.personality_traits;
    
    // Positive interactions boost confidence and romantic intensity
    if (this.isPositiveResponse(text)) {
      traits.confidence = Math.min(1, traits.confidence + 0.01);
      traits.romantic_intensity = Math.min(1, traits.romantic_intensity + 0.01);
    }

    // Long messages increase curiosity and empathy
    if (text.length > 100) {
      traits.curiosity = Math.min(1, traits.curiosity + 0.01);
      traits.empathy = Math.min(1, traits.empathy + 0.01);
    }

    // Sexual content increases sensuality
    if (this.containsSexualContent(text)) {
      traits.sensuality = Math.min(1, traits.sensuality + 0.01);
    }

    // Emotional sharing increases vulnerability
    if (this.containsEmotionalSharing(text)) {
      traits.vulnerability = Math.min(1, traits.vulnerability + 0.01);
    }
  }

  private updateRelationshipMetrics(text: string) {
    const quality = this.context.relationship_quality;
    
    // Positive responses improve trust and communication
    if (this.isPositiveResponse(text)) {
      quality.trust_level = Math.min(1, quality.trust_level + 0.005);
      quality.communication_quality = Math.min(1, quality.communication_quality + 0.005);
    }

    // Sexual content improves sexual chemistry
    if (this.containsSexualContent(text)) {
      quality.sexual_chemistry = Math.min(1, quality.sexual_chemistry + 0.01);
    }

    // Emotional sharing improves intimacy
    if (this.containsEmotionalSharing(text)) {
      quality.intimacy_level = Math.min(1, quality.intimacy_level + 0.01);
    }
  }

  private isPositiveResponse(text: string): boolean {
    const positiveKeywords = ["yes", "love", "like", "great", "amazing", "wonderful", "perfect", "thank", "appreciate"];
    return positiveKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private containsSexualContent(text: string): boolean {
    const sexualKeywords = ["sexy", "hot", "kiss", "touch", "want you", "desire", "aroused", "turn on"];
    return sexualKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private containsEmotionalSharing(text: string): boolean {
    const emotionalKeywords = ["feel", "emotion", "heart", "love", "miss", "care", "worry", "happy", "sad"];
    return emotionalKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  addConversationEntry(speaker: string, message: string, metadata: MessageMetadata = {}) {
    this.conversations.push({
      timestamp: new Date().toISOString(),
      speaker,
      message,
      relationship_stage: this.context.relationship_stage,
      personality_snapshot: { ...this.context.personality_traits },
      metadata,
    });
  }
}