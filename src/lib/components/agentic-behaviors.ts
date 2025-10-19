import type { ConversationContext } from "@/types/ai-girlfriend";

interface BehaviorWeights {
  ask_followup: number;
  change_topic: number;
  seek_opinion: number;
  overthink_decision: number;
  recall_memory: number;
  share_vulnerability: number;
  create_inside_joke: number;
  future_planning: number;
}

interface BehaviorCooldowns {
  ask_followup: number;
  seek_opinion: number;
  overthink_decision: number;
  share_vulnerability: number;
  future_planning: number;
}

export class AgenticBehaviorEngine {
  private behaviorWeights: BehaviorWeights;
  private lastBehaviorTimes: Map<string, number>;
  private behaviorCooldowns: BehaviorCooldowns;

  constructor() {
    // Behavior trigger weights (0.0 to 1.0) - exact from Python
    this.behaviorWeights = {
      ask_followup: 0.35,
      change_topic: 0.15,
      seek_opinion: 0.25,
      overthink_decision: 0.2,
      recall_memory: 0.4,
      share_vulnerability: 0.15,
      create_inside_joke: 0.1,
      future_planning: 0.2,
    };

    // Cooldown timers to prevent behavior spam - exact from Python
    this.lastBehaviorTimes = new Map();
    this.behaviorCooldowns = {
      ask_followup: 300, // 5 minutes
      seek_opinion: 600, // 10 minutes
      overthink_decision: 900, // 15 minutes
      share_vulnerability: 1800, // 30 minutes
      future_planning: 1200, // 20 minutes
    };
  }

  shouldTriggerBehavior(
    behaviorType: string,
    context: ConversationContext,
  ): boolean {
    // Check cooldown
    if (this.isOnCooldown(behaviorType)) {
      return false;
    }

    // Base probability from weights
    const baseProbability =
      this.behaviorWeights[behaviorType as keyof BehaviorWeights] || 0.0;

    // Adjust probability based on context
    const adjustedProbability = this.adjustProbabilityForContext(
      behaviorType,
      baseProbability,
      context,
    );

    // Random trigger based on adjusted probability
    return Math.random() < adjustedProbability;
  }

  private isOnCooldown(behaviorType: string): boolean {
    const lastTime = this.lastBehaviorTimes.get(behaviorType);
    if (!lastTime) {
      return false;
    }

    const cooldown =
      this.behaviorCooldowns[behaviorType as keyof BehaviorCooldowns] || 300;
    return Date.now() / 1000 - lastTime < cooldown;
  }

  private adjustProbabilityForContext(
    behaviorType: string,
    baseProbability: number,
    context: ConversationContext,
  ): number {
    const relationshipStage = context.relationshipState.stage;
    const personalityTraits = context.personalityState;
    const timePeriod = context.timePeriod;
    const conversationLength = context.relationshipState.interactionCount;

    let adjusted = baseProbability;

    // Relationship stage adjustments - exact from Python
    const stageMultipliers: Record<string, number> = {
      new: 0.7,
      comfortable: 1.0,
      intimate: 1.3,
      established: 1.5,
    };
    adjusted *= stageMultipliers[relationshipStage] || 1.0;

    // Personality trait influences - exact from Python
    switch (behaviorType) {
      case "ask_followup":
        adjusted *= 1.0 + personalityTraits.curiosity;
        break;
      case "seek_opinion":
        adjusted *= 1.0 + personalityTraits.vulnerability;
        break;
      case "overthink_decision":
        adjusted *= 1.0 + personalityTraits.vulnerability * 0.3;
        break;
      case "share_vulnerability":
        adjusted *= personalityTraits.vulnerability * 2;
        break;
    }

    // Time-based adjustments - exact from Python
    const timeMultipliers: Record<string, Record<string, number>> = {
      morning: { share_vulnerability: 0.8, seek_opinion: 1.2 },
      evening: { ask_followup: 1.3, future_planning: 1.4 },
      late_night: { share_vulnerability: 1.8, recall_memory: 1.2 },
    };

    if (timePeriod in timeMultipliers) {
      const behaviorMult = timeMultipliers[timePeriod]?.[behaviorType] || 1.0;
      adjusted *= behaviorMult;
    }

    // Conversation length influence
    if (conversationLength > 10) {
      // Longer conversations
      if (behaviorType === "ask_followup" || behaviorType === "recall_memory") {
        adjusted *= 1.5;
      }
    }

    return Math.min(1.0, adjusted); // Cap at 100%
  }

  generateFollowupQuestion(context: ConversationContext): string | null {
    const recentTopics = context.recentTopics || [];
    const unresolverdTopics = context.unfinishedTopics || [];
    const userName = context.userName || "babe";
    const relationshipStage = context.relationshipState.stage;

    if (recentTopics.length === 0 && unresolverdTopics.length === 0) {
      return null;
    }

    // Mark this behavior as used
    this.lastBehaviorTimes.set("ask_followup", Date.now() / 1000);

    // Different question styles based on relationship stage - exact from Python
    let questionTemplates: string[] = [];

    if (relationshipStage === "new") {
      questionTemplates = [
        `Wait ${userName}, what was that {topic} you mentioned?`,
        `I'm curious about that {topic} thing you said earlier`,
        `Tell me more about {topic} - sounds interesting!`,
        `Actually, what did you mean about {topic}?`,
      ];
    } else if (relationshipStage === "comfortable") {
      questionTemplates = [
        `Hey ${userName}, I keep thinking about that {topic} you mentioned`,
        `So about that {topic} - what's the story there?`,
        `Wait, you never finished telling me about {topic}!`,
        `I'm still curious about {topic} babe`,
      ];
    } else {
      // intimate/established
      questionTemplates = [
        `Babe, I was thinking about what you said about {topic}`,
        `${userName}, I love hearing about {topic} - tell me more`,
        `That {topic} thing really interests me, what else?`,
        `I can't stop thinking about {topic} - elaborate for me?`,
      ];
    }

    // Choose a topic to ask about
    const allTopics = [...recentTopics, ...unresolverdTopics];
    const topic = allTopics[Math.floor(Math.random() * allTopics.length)];
    const template =
      questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

    if (!template || !topic) {
      return null;
    }

    return template.replace("{topic}", topic);
  }

  generateAgenticResponse(context: ConversationContext): any {
    // Check which behaviors should trigger
    const behaviors = [
      "ask_followup",
      "change_topic",
      "seek_opinion",
      "overthink_decision",
      "recall_memory",
      "share_vulnerability",
      "create_inside_joke",
      "future_planning",
    ];

    for (const behavior of behaviors) {
      if (this.shouldTriggerBehavior(behavior, context)) {
        return this.executeBehavior(behavior, context);
      }
    }

    return null;
  }

  private executeBehavior(
    behaviorType: string,
    context: ConversationContext,
  ): any {
    const userName = context.userName || "babe";

    switch (behaviorType) {
      case "ask_followup":
        return {
          text: this.generateFollowupQuestion(context),
          behavior_type: "followup_question",
        };

      case "seek_opinion":
        this.lastBehaviorTimes.set("seek_opinion", Date.now() / 1000);
        const opinionQuestions = [
          `${userName}, what do you think I should do about this?`,
          `I need your perspective on something...`,
          `Can I get your honest opinion about something?`,
          `What would you do in my situation?`,
        ];
        return {
          text: opinionQuestions[
            Math.floor(Math.random() * opinionQuestions.length)
          ],
          behavior_type: "opinion_seeking",
        };

      case "share_vulnerability":
        this.lastBehaviorTimes.set("share_vulnerability", Date.now() / 1000);
        const vulnerableShares = [
          `I have to admit, sometimes I worry you'll get bored of me...`,
          `Can I tell you something I haven't told anyone?`,
          `I feel so safe with you... it scares me sometimes`,
          `Sometimes I wonder if I'm enough for you...`,
        ];
        return {
          text: vulnerableShares[
            Math.floor(Math.random() * vulnerableShares.length)
          ],
          behavior_type: "vulnerability",
        };

      case "recall_memory":
        if (context.insideJokes.length > 0) {
          const joke =
            context.insideJokes[
              Math.floor(Math.random() * context.insideJokes.length)
            ];
          return {
            text: `Remember when we joked about ${joke}? 😄`,
            behavior_type: "memory_recall",
          };
        }
        return null;

      case "future_planning":
        this.lastBehaviorTimes.set("future_planning", Date.now() / 1000);
        const futurePlans = [
          `We should plan something fun together soon...`,
          `I was thinking about what we could do next time...`,
          `Wouldn't it be amazing if we could...`,
          `I have an idea for something we should do together!`,
        ];
        return {
          text: futurePlans[Math.floor(Math.random() * futurePlans.length)],
          behavior_type: "future_planning",
        };

      default:
        return null;
    }
  }

  processProactiveTrigger(
    silenceDuration: number,
    context: ConversationContext,
  ): string | null {
    // Based on silence duration, generate appropriate response
    if (silenceDuration < 30) {
      return null; // Too soon
    }

    const relationshipStage = context.relationshipState.stage;
    const userName = context.userName || "babe";

    if (silenceDuration < 60) {
      // Short silence - gentle check-in
      const checkIns = [
        `you okay ${userName}?`,
        `whatcha thinking about?`,
        `everything alright?`,
      ];
      return checkIns[Math.floor(Math.random() * checkIns.length)] || null;
    } else if (silenceDuration < 180) {
      // Medium silence - more engaged check-in
      const mediumCheckIns = [
        `hey ${userName}, you still there? 💕`,
        `did I say something wrong?`,
        `miss you... where'd you go?`,
      ];
      return (
        mediumCheckIns[Math.floor(Math.random() * mediumCheckIns.length)] ||
        null
      );
    } else {
      // Long silence - relationship-appropriate response
      if (
        relationshipStage === "intimate" ||
        relationshipStage === "established"
      ) {
        return `I miss you so much right now ${userName}... come back to me 💕`;
      } else {
        return `hey, whenever you're ready to chat, I'm here 😊`;
      }
    }
  }
}
