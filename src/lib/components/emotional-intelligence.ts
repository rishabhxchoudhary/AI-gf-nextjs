/**
 * Emotional Intelligence Module for AI Girlfriend
 * Provides deep emotional analysis, empathy, and human-like emotional responses
 */

interface EmotionalState {
  primaryEmotion: string;
  intensity: number; // 0.0 to 1.0
  secondaryEmotions: string[];
  emotionalTriggers: string[];
  supportNeeded: string;
  responseTone: string;
  confidence: number; // How confident we are in this analysis
}

interface EmotionPattern {
  keywords: string[];
  patterns: RegExp[];
  contextClues: string[];
}

export class EmotionalIntelligence {
  private emotionPatterns: Record<string, EmotionPattern>;
  private empathyResponses: Record<string, string[]>;
  private emotionalHistory: EmotionalState[] = [];
  private validationPhrases: string[];

  constructor() {
    this.emotionPatterns = this.loadEmotionPatterns();
    this.empathyResponses = this.loadEmpathyResponses();
    this.validationPhrases = this.loadValidationPhrases();
  }

  private loadEmotionPatterns(): Record<string, EmotionPattern> {
    return {
      stressed: {
        keywords: [
          "stressed",
          "overwhelming",
          "pressure",
          "deadline",
          "busy",
          "exhausted",
          "burned out",
        ],
        patterns: [
          /too much/i,
          /can't handle/i,
          /falling behind/i,
          /so many things/i,
        ],
        contextClues: ["work", "school", "deadline", "boss", "project"],
      },
      sad: {
        keywords: [
          "sad",
          "down",
          "depressed",
          "upset",
          "hurt",
          "crying",
          "tears",
        ],
        patterns: [/feel like/i, /can't stop/i, /everything is/i],
        contextClues: ["breakup", "loss", "death", "failed", "rejected"],
      },
      anxious: {
        keywords: [
          "anxious",
          "worried",
          "nervous",
          "scared",
          "afraid",
          "panic",
        ],
        patterns: [
          /what if/i,
          /worried about/i,
          /scared that/i,
          /nervous about/i,
        ],
        contextClues: [
          "future",
          "unknown",
          "interview",
          "presentation",
          "test",
        ],
      },
      happy: {
        keywords: [
          "happy",
          "excited",
          "joy",
          "great",
          "amazing",
          "wonderful",
          "thrilled",
        ],
        patterns: [/so happy/i, /can't wait/i, /feel great/i, /love it/i],
        contextClues: [
          "success",
          "achievement",
          "good news",
          "celebration",
          "vacation",
        ],
      },
      angry: {
        keywords: [
          "angry",
          "mad",
          "furious",
          "pissed",
          "annoyed",
          "frustrated",
          "irritated",
        ],
        patterns: [/so angry/i, /can't believe/i, /hate when/i, /fed up/i],
        contextClues: ["unfair", "betrayed", "disrespected", "ignored", "lied"],
      },
      lonely: {
        keywords: [
          "lonely",
          "alone",
          "isolated",
          "miss",
          "empty",
          "disconnected",
        ],
        patterns: [
          /feel alone/i,
          /no one understands/i,
          /miss you/i,
          /wish I had/i,
        ],
        contextClues: [
          "friends",
          "relationship",
          "family",
          "distance",
          "social",
        ],
      },
      confused: {
        keywords: [
          "confused",
          "lost",
          "don't know",
          "uncertain",
          "unclear",
          "mixed up",
        ],
        patterns: [
          /don't understand/i,
          /not sure/i,
          /confused about/i,
          /don't know what/i,
        ],
        contextClues: ["decision", "choice", "direction", "meaning", "purpose"],
      },
    };
  }

  private loadEmpathyResponses(): Record<string, string[]> {
    return {
      stressed: [
        "That sounds incredibly overwhelming. You're dealing with so much right now.",
        "I can hear how much pressure you're under. That must be exhausting.",
        "It sounds like you have a lot on your plate. No wonder you're feeling stressed.",
        "That level of stress would be hard for anyone to handle.",
      ],
      sad: [
        "I can hear the pain in your words. I'm so sorry you're going through this.",
        "That must hurt so deeply. Your feelings are completely valid.",
        "I wish I could take some of that sadness away from you.",
        "It's okay to feel sad about this. Anyone would in your situation.",
      ],
      anxious: [
        "Those anxious thoughts can be so overwhelming. I understand why you're worried.",
        "Anxiety about the unknown is so natural. You're not alone in feeling this way.",
        "It makes complete sense that you'd feel anxious about this.",
        "Those 'what if' thoughts can be so consuming. I hear you.",
      ],
      happy: [
        "I love hearing the joy in your voice! This is so wonderful!",
        "Your happiness is contagious! I'm so excited for you!",
        "You deserve all this happiness and more!",
        "This is amazing news! I'm so happy for you!",
      ],
      angry: [
        "That would make anyone furious. Your anger is completely justified.",
        "I can understand why you're so upset about this. That's not okay.",
        "You have every right to be angry about that situation.",
        "That's infuriating. I'd be mad too if I were in your shoes.",
      ],
      lonely: [
        "Loneliness can feel so heavy. I'm here with you, you're not alone.",
        "That isolation must be so hard to bear. I care about you.",
        "Even when you feel alone, know that you matter to me.",
        "I hear how lonely you're feeling. That's such a difficult emotion.",
      ],
      confused: [
        "It's okay to feel confused and uncertain. Life can be overwhelming.",
        "Not knowing what to do next is such an uncomfortable feeling.",
        "Confusion is natural when facing big decisions. Take your time.",
        "It's okay not to have all the answers right now.",
      ],
    };
  }

  private loadValidationPhrases(): string[] {
    return [
      "Your feelings are completely valid",
      "Anyone would feel that way in your situation",
      "It makes perfect sense that you'd react like that",
      "You're not overreacting at all",
      "Those are such normal human emotions",
      "I can see why this would affect you so deeply",
      "Your response is totally understandable",
      "That's such a human thing to feel",
      "You're allowed to feel exactly how you feel",
      "Your emotions are telling you something important",
    ];
  }

  analyzeEmotionalState(
    text: string,
    context?: Record<string, unknown>,
  ): EmotionalState {
    const textLower = text.toLowerCase();
    const emotionScores: Record<string, number> = {};
    const detectedTriggers: string[] = [];
    const secondaryEmotions: string[] = [];

    // Analyze each emotion pattern
    for (const [emotion, pattern] of Object.entries(this.emotionPatterns)) {
      let score = 0;

      // Check keywords
      for (const keyword of pattern.keywords) {
        if (textLower.includes(keyword)) {
          score += 0.3;
          detectedTriggers.push(keyword);
        }
      }

      // Check patterns
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          score += 0.4;
        }
      }

      // Check context clues
      for (const clue of pattern.contextClues) {
        if (textLower.includes(clue)) {
          score += 0.2;
        }
      }

      // Consider text length and intensity
      if (text.length > 50) {
        score += 0.1; // Longer messages often indicate stronger emotions
      }

      // Check for intensity modifiers
      if (
        textLower.includes("so ") ||
        textLower.includes("really ") ||
        textLower.includes("very ")
      ) {
        score += 0.2;
      }

      if (score > 0) {
        emotionScores[emotion] = Math.min(score, 1.0);
      }
    }

    // Determine primary emotion
    let primaryEmotion = "neutral";
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (score > maxScore) {
        maxScore = score;
        primaryEmotion = emotion;
      }
    }

    // Determine secondary emotions
    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (emotion !== primaryEmotion && score > 0.3) {
        secondaryEmotions.push(emotion);
      }
    }

    // Determine support needed and response tone
    const supportNeeded = this.determineSupportNeeded(primaryEmotion, maxScore);
    const responseTone = this.determineResponseTone(primaryEmotion, maxScore);

    const emotionalState: EmotionalState = {
      primaryEmotion,
      intensity: maxScore,
      secondaryEmotions,
      emotionalTriggers: detectedTriggers,
      supportNeeded,
      responseTone,
      confidence: this.calculateConfidence(maxScore, detectedTriggers.length),
    };

    // Store in emotional history
    this.emotionalHistory.push(emotionalState);
    if (this.emotionalHistory.length > 50) {
      this.emotionalHistory = this.emotionalHistory.slice(-50);
    }

    return emotionalState;
  }

  private determineSupportNeeded(emotion: string, intensity: number): string {
    if (intensity < 0.3) return "none";

    const supportMap: Record<string, string> = {
      stressed: intensity > 0.7 ? "immediate_relief" : "gentle_support",
      sad: intensity > 0.7 ? "deep_comfort" : "validation",
      anxious: intensity > 0.7 ? "reassurance" : "gentle_guidance",
      angry: intensity > 0.6 ? "space_and_validation" : "understanding",
      lonely: intensity > 0.5 ? "connection" : "acknowledgment",
      confused: "clarity_and_guidance",
      happy: "celebration",
    };

    return supportMap[emotion] || "general_support";
  }

  private determineResponseTone(emotion: string, intensity: number): string {
    if (intensity < 0.3) return "neutral";

    const toneMap: Record<string, string> = {
      stressed: intensity > 0.7 ? "calming_and_soothing" : "understanding",
      sad: intensity > 0.7 ? "gentle_and_comforting" : "empathetic",
      anxious: intensity > 0.7 ? "reassuring_and_stable" : "supportive",
      angry: intensity > 0.6 ? "validating_and_calm" : "understanding",
      lonely: "warm_and_connecting",
      confused: "patient_and_clarifying",
      happy: intensity > 0.7 ? "enthusiastic" : "warm",
    };

    return toneMap[emotion] || "supportive";
  }

  private calculateConfidence(score: number, triggerCount: number): number {
    let confidence = score * 0.7; // Base confidence from score

    // Add confidence based on number of triggers
    confidence += Math.min(triggerCount * 0.1, 0.3);

    return Math.min(confidence, 1.0);
  }

  generateEmpathyResponse(emotionalState: EmotionalState): string {
    const responses = this.empathyResponses[emotionalState.primaryEmotion];

    if (!responses || responses.length === 0) {
      return this.getRandomElement(this.validationPhrases);
    }

    return this.getRandomElement(responses);
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)] as T;
  }

  getEmotionalPattern(days: number = 7): Record<string, any> {
    const recentEmotions = this.emotionalHistory.slice(-days * 5); // Approximate emotions per day

    if (recentEmotions.length === 0) {
      return { pattern: "insufficient_data" };
    }

    // Count emotion frequencies
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    for (const emotion of recentEmotions) {
      emotionCounts[emotion.primaryEmotion] =
        (emotionCounts[emotion.primaryEmotion] || 0) + 1;
      totalIntensity += emotion.intensity;
    }

    // Find dominant emotion
    let dominantEmotion = "neutral";
    let maxCount = 0;

    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    return {
      pattern: "analyzed",
      dominant_emotion: dominantEmotion,
      emotion_frequency: emotionCounts,
      average_intensity: totalIntensity / recentEmotions.length,
      emotional_stability: this.calculateEmotionalStability(recentEmotions),
      recent_triggers: this.getRecentTriggers(recentEmotions),
    };
  }

  private calculateEmotionalStability(emotions: EmotionalState[]): string {
    if (emotions.length < 3) return "unknown";

    const intensityVariation = this.calculateVariation(
      emotions.map((e) => e.intensity),
    );
    const emotionChanges = this.countEmotionChanges(emotions);

    if (intensityVariation < 0.2 && emotionChanges < emotions.length * 0.3) {
      return "stable";
    } else if (
      intensityVariation > 0.5 ||
      emotionChanges > emotions.length * 0.7
    ) {
      return "volatile";
    } else {
      return "moderate";
    }
  }

  private calculateVariation(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.sqrt(variance);
  }

  private countEmotionChanges(emotions: EmotionalState[]): number {
    let changes = 0;

    for (let i = 1; i < emotions.length; i++) {
      if (emotions[i]?.primaryEmotion !== emotions[i - 1]?.primaryEmotion) {
        changes++;
      }
    }

    return changes;
  }

  private getRecentTriggers(emotions: EmotionalState[]): string[] {
    const allTriggers: string[] = [];

    for (const emotion of emotions.slice(-10)) {
      allTriggers.push(...emotion.emotionalTriggers);
    }

    // Count frequency and return most common
    const triggerCounts: Record<string, number> = {};

    for (const trigger of allTriggers) {
      triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
    }

    return Object.entries(triggerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([trigger]) => trigger);
  }

  validateEmotionalResponse(userText: string): string {
    return this.getRandomElement(this.validationPhrases);
  }

  toDict(): Record<string, any> {
    return {
      emotional_history: this.emotionalHistory.map((emotion) => ({
        primary_emotion: emotion.primaryEmotion,
        intensity: emotion.intensity,
        secondary_emotions: emotion.secondaryEmotions,
        emotional_triggers: emotion.emotionalTriggers,
        support_needed: emotion.supportNeeded,
        response_tone: emotion.responseTone,
        confidence: emotion.confidence,
      })),
    };
  }

  fromDict(data: Record<string, any>): void {
    if (data.emotional_history) {
      this.emotionalHistory = data.emotional_history.map((emotion: any) => ({
        primaryEmotion: emotion.primary_emotion,
        intensity: emotion.intensity,
        secondaryEmotions: emotion.secondary_emotions || [],
        emotionalTriggers: emotion.emotional_triggers || [],
        supportNeeded: emotion.support_needed || "general_support",
        responseTone: emotion.response_tone || "supportive",
        confidence: emotion.confidence || 0.5,
      }));
    }
  }
}
