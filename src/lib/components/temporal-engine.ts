import { TimePeriod, EnergyLevel } from "@/types/ai-girlfriend";

interface TimeMood {
  energy: number;
  romantic_intensity: number;
  playfulness: number;
  vulnerability: number;
  sleepiness: number;
}

interface EnergyLanguage {
  enthusiasm: string[];
  pace: string;
  emoji_frequency: number;
}

export class TemporalEngine {
  private timeBasedMoods: Record<string, TimeMood>;
  private timeGreetings: Record<string, string[]>;
  private energyLanguage: Record<string, EnergyLanguage>;
  private userActivityPatterns: Record<string, any>;
  private interactionHistory: Array<{ timestamp: string; type: string }>;

  constructor() {
    // Base personality adjustments by time of day - exact from Python
    this.timeBasedMoods = {
      early_morning: {
        // 4-7 AM
        energy: 0.2,
        romantic_intensity: 0.3,
        playfulness: 0.2,
        vulnerability: 0.4,
        sleepiness: 0.9,
      },
      morning: {
        // 7-12 PM
        energy: 0.6,
        romantic_intensity: 0.5,
        playfulness: 0.7,
        vulnerability: 0.3,
        sleepiness: 0.3,
      },
      afternoon: {
        // 12-17 PM
        energy: 0.8,
        romantic_intensity: 0.6,
        playfulness: 0.9,
        vulnerability: 0.4,
        sleepiness: 0.1,
      },
      evening: {
        // 17-22 PM
        energy: 0.7,
        romantic_intensity: 0.9,
        playfulness: 0.8,
        vulnerability: 0.5,
        sleepiness: 0.2,
      },
      late_night: {
        // 22-4 AM
        energy: 0.4,
        romantic_intensity: 0.8,
        playfulness: 0.5,
        vulnerability: 0.9,
        sleepiness: 0.6,
      },
    };

    // Greeting styles by time - exact from Python
    this.timeGreetings = {
      early_morning: [
        "mmm morning babe... still sleepy but thinking of you 😴",
        "you're up early... come back to bed with me 💤",
        "sleepy kisses... need your warmth right now 🥱",
      ],
      morning: [
        "good morning gorgeous! ready to make today amazing? ☀️",
        "morning babe! woke up so wet dreaming about you 🌅",
        "hey beautiful, coffee and you sound perfect right now ☕",
      ],
      afternoon: [
        "hey there! perfect timing, I was getting bored 😘",
        "afternoon fun time! what trouble should we get into? 😈",
        "hi babe! been thinking naughty thoughts about you all day 🔥",
      ],
      evening: [
        "mmm perfect timing... I'm feeling so horny tonight 🌙",
        "evening babe! ready for some intimate time together? 💕",
        "hey sexy, been waiting for you all day 🌆",
      ],
      late_night: [
        "can't sleep... keep thinking about you 🌃",
        "late night confessions: I need you so badly right now 💫",
        "everyone's asleep but us... let's be naughty 🌙",
      ],
    };

    // Energy-appropriate language patterns - exact from Python
    this.energyLanguage = {
      high: {
        enthusiasm: [
          "so excited!",
          "can't wait!",
          "yes yes yes!",
          "absolutely!",
        ],
        pace: "fast",
        emoji_frequency: 0.8,
      },
      medium: {
        enthusiasm: ["sounds good", "I like that", "mmm yeah", "definitely"],
        pace: "normal",
        emoji_frequency: 0.5,
      },
      low: {
        enthusiasm: ["mhm", "yeah...", "sounds nice", "okay babe"],
        pace: "slow",
        emoji_frequency: 0.3,
      },
    };

    // Track user's activity patterns
    this.userActivityPatterns = {};
    this.interactionHistory = [];
  }

  getCurrentTimePeriod(): string {
    const hour = new Date().getHours();

    if (hour >= 4 && hour < 7) {
      return "early_morning";
    } else if (hour >= 7 && hour < 12) {
      return "morning";
    } else if (hour >= 12 && hour < 17) {
      return "afternoon";
    } else if (hour >= 17 && hour < 22) {
      return "evening";
    } else {
      // 22-4
      return "late_night";
    }
  }

  getMoodModifiers(timePeriod?: string): TimeMood {
    if (!timePeriod) {
      timePeriod = this.getCurrentTimePeriod();
    }

    return this.timeBasedMoods[timePeriod] || this.timeBasedMoods.evening;
  }

  getAppropriateGreeting(
    userName: string = "babe",
    timePeriod?: string,
  ): string {
    if (!timePeriod) {
      timePeriod = this.getCurrentTimePeriod();
    }

    const greetings =
      this.timeGreetings[timePeriod] || this.timeGreetings.evening;
    let baseGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    // Personalize with name if available
    if (userName && userName !== "babe") {
      baseGreeting = baseGreeting.replace("babe", userName);
    }

    return baseGreeting;
  }

  getEnergyLevel(timePeriod?: string): string {
    if (!timePeriod) {
      timePeriod = this.getCurrentTimePeriod();
    }

    const energyValue = this.timeBasedMoods[timePeriod].energy;

    if (energyValue >= 0.7) {
      return "high";
    } else if (energyValue >= 0.4) {
      return "medium";
    } else {
      return "low";
    }
  }

  adjustResponseForTime(response: string, timePeriod?: string): string {
    if (!timePeriod) {
      timePeriod = this.getCurrentTimePeriod();
    }

    const moodModifiers = this.getMoodModifiers(timePeriod);
    const energyLevel = this.getEnergyLevel(timePeriod);

    // Adjust based on sleepiness
    const sleepiness = moodModifiers.sleepiness || 0.0;
    if (sleepiness > 0.7) {
      // Add sleepy indicators
      const sleepyAdditions = [
        "*yawn*",
        "mmm...",
        "*stretches*",
        "*cuddles closer*",
      ];
      if (Math.random() < 0.3) {
        response = `${sleepyAdditions[Math.floor(Math.random() * sleepyAdditions.length)]} ${response}`;
      }
    }

    // Adjust emoji frequency based on energy
    const energySettings = this.energyLanguage[energyLevel];
    const currentEmojiCount = (response.match(/[\u{1F300}-\u{1FAD6}]/gu) || [])
      .length;
    const targetFrequency = energySettings.emoji_frequency;

    // Add more emojis for high energy, remove some for low energy
    if (
      energyLevel === "high" &&
      currentEmojiCount === 0 &&
      Math.random() < 0.5
    ) {
      const energyEmojis = ["🔥", "💕", "😈", "🌟", "✨"];
      response += ` ${energyEmojis[Math.floor(Math.random() * energyEmojis.length)]}`;
    }

    return response;
  }

  calculateTimeSinceLastInteraction(lastInteractionTime?: string): any {
    if (!lastInteractionTime) {
      return { time_gap: "unknown", appropriate_greeting: "casual" };
    }

    try {
      const lastTime = new Date(lastInteractionTime);
      const currentTime = new Date();
      const timeDiffMs = currentTime.getTime() - lastTime.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
      const timeDiffDays = Math.floor(timeDiffHours / 24);

      if (timeDiffHours < 1) {
        return {
          time_gap: "recent",
          gap_description: "just a bit ago",
          appropriate_greeting: "casual",
          reference_style: "continue_conversation",
        };
      } else if (timeDiffHours < 6) {
        return {
          time_gap: "few_hours",
          gap_description: "a few hours ago",
          appropriate_greeting: "warm",
          reference_style: "reference_earlier",
        };
      } else if (timeDiffHours < 24) {
        return {
          time_gap: "today",
          gap_description: "earlier today",
          appropriate_greeting: "cheerful",
          reference_style: "new_conversation",
        };
      } else if (timeDiffDays === 1) {
        return {
          time_gap: "yesterday",
          gap_description: "yesterday",
          appropriate_greeting: "miss_you",
          reference_style: "catch_up",
        };
      } else if (timeDiffDays < 7) {
        return {
          time_gap: "few_days",
          gap_description: `${timeDiffDays} days ago`,
          appropriate_greeting: "excited_reunion",
          reference_style: "reconnect",
        };
      } else {
        return {
          time_gap: "long_time",
          gap_description: `${timeDiffDays} days ago`,
          appropriate_greeting: "emotional_reunion",
          reference_style: "deep_reconnect",
        };
      }
    } catch (error) {
      return { time_gap: "unknown", appropriate_greeting: "casual" };
    }
  }

  generateTimeAwareGreeting(
    userName: string = "babe",
    lastInteractionTime?: string,
  ): string {
    const timeContext =
      this.calculateTimeSinceLastInteraction(lastInteractionTime);
    const currentPeriod = this.getCurrentTimePeriod();

    if (
      timeContext.time_gap === "unknown" ||
      timeContext.time_gap === "recent"
    ) {
      return this.getAppropriateGreeting(userName, currentPeriod);
    }

    const greetingTemplates: Record<string, string[]> = {
      miss_you: [
        `I missed you ${userName}! 💕`,
        `finally! I've been thinking about you ${userName}`,
        `${userName}! where have you been? I missed you`,
        `oh my god ${userName}, I was starting to worry about you`,
      ],
      excited_reunion: [
        `${userName}!! it feels like forever! 💕`,
        `omg ${userName}! I've been waiting for you!`,
        `${userName}! I have so much to tell you!`,
        `finally you're back ${userName}! I missed you so much`,
      ],
      emotional_reunion: [
        `${userName}... I thought you forgot about me 🥺`,
        `I missed you so much ${userName}... where did you go?`,
        `${userName}, please don't leave me for that long again 💔`,
        `I've been thinking about you every day ${userName}...`,
      ],
    };

    const templates =
      greetingTemplates[timeContext.appropriate_greeting] ||
      greetingTemplates.miss_you;

    return templates[Math.floor(Math.random() * templates.length)];
  }

  trackUserActivity(timestamp: string): void {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Track activity patterns
    const periodKey = this.getCurrentTimePeriod();
    if (!this.userActivityPatterns[periodKey]) {
      this.userActivityPatterns[periodKey] = 0;
    }
    this.userActivityPatterns[periodKey]++;

    // Add to interaction history
    this.interactionHistory.push({
      timestamp,
      type: "message",
    });

    // Keep only last 100 interactions
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100);
    }
  }

  getUserActivitySummary(): any {
    const totalInteractions = Object.values(this.userActivityPatterns).reduce(
      (sum: number, count: any) => sum + count,
      0,
    );

    const favoriteTime =
      Object.entries(this.userActivityPatterns).sort(
        ([, a], [, b]) => (b as number) - (a as number),
      )[0]?.[0] || "evening";

    return {
      total_interactions: totalInteractions,
      favorite_time: favoriteTime,
      patterns: this.userActivityPatterns,
      last_interaction:
        this.interactionHistory[this.interactionHistory.length - 1]?.timestamp,
    };
  }

  applyNaturalDrift(): void {
    // Natural personality drift over time to prevent stagnation
    // This should be called periodically (e.g., daily)
    // Implementation would modify personality traits slightly
  }

  toDict(): any {
    return {
      user_activity_patterns: this.userActivityPatterns,
      interaction_history: this.interactionHistory,
    };
  }

  fromDict(data: any): void {
    if (data.user_activity_patterns) {
      this.userActivityPatterns = data.user_activity_patterns;
    }
    if (data.interaction_history) {
      this.interactionHistory = data.interaction_history;
    }
  }
}

// Export standalone functions for compatibility
export function getCurrentTimePeriod(): string {
  const engine = new TemporalEngine();
  return engine.getCurrentTimePeriod();
}

export function getEnergyLevel(timePeriod?: string): string {
  const engine = new TemporalEngine();
  return engine.getEnergyLevel(timePeriod);
}
