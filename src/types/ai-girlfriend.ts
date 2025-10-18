export interface PersonalityTraits {
  confidence: number;
  romantic_intensity: number;
  playfulness: number;
  vulnerability: number;
  assertiveness: number;
  curiosity: number;
  empathy: number;
  spontaneity: number;
  possessiveness: number;
  loyalty: number;
  sensuality: number;
  intelligence: number;
  humor: number;
  emotional_intensity: number;
  independence: number;
}

export type RelationshipStage = "new" | "comfortable" | "intimate" | "established";

export interface RelationshipState {
  stage: RelationshipStage;
  interactionCount: number;
  positiveInteractions: number;
  negativeInteractions: number;
  trustLevel: number;
  intimacyLevel: number;
  communicationQuality: number;
  sexualChemistry: number;
  emotionalBond: number;
  milestones: Milestone[];
  significantMoments: SignificantMoment[];
}

export interface Milestone {
  type: string;
  description: string;
  achievedAt: string;
  interactionNumber: number;
}

export interface SignificantMoment {
  type: string;
  description: string;
  timestamp: string;
  emotionalContext: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  emotionalState?: EmotionalState;
  topics?: string[];
  sentiment?: number;
  bursts?: MessageBurst[];
  personalitySnapshot?: PersonalityTraits;
}

export interface MessageBurst {
  text: string;
  wait_ms: number;
  emotion?: string;
}

export interface EmotionalState {
  primary: EmotionType;
  intensity: number;
  secondary?: EmotionType[];
  triggers?: string[];
  supportNeeded?: string;
}

export type EmotionType =
  | "happy"
  | "sad"
  | "angry"
  | "anxious"
  | "stressed"
  | "excited"
  | "lonely"
  | "confused"
  | "neutral";

export interface ConversationContext {
  userId: string;
  sessionId: string;
  userName?: string;
  userAge?: number;
  relationshipState: RelationshipState;
  personalityState: PersonalityTraits;
  currentMood?: MoodState;
  recentTopics: string[];
  unfinishedTopics: string[];
  insideJokes: string[];
  userPreferences: Record<string, any>;
  emotionalMoments: EmotionalMoment[];
  lastInteractionTime?: string;
  timePeriod: TimePeriod;
  energyLevel: EnergyLevel;
}

export interface MoodState {
  name: string;
  modifiers: Partial<PersonalityTraits>;
  expiresAt: string;
}

export interface EmotionalMoment {
  timestamp: string;
  description: string;
  emotion: EmotionType;
  intensity: number;
  resolved: boolean;
}

export type TimePeriod =
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "late_night";

export type EnergyLevel = "low" | "medium" | "high";

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  credits: number;
  totalCreditsUsed: number;
  subscriptionStatus: "free" | "premium" | "enterprise";
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  messageCount: number;
  sessionCount: number;
}

export interface AIResponse {
  bursts: MessageBurst[];
  fallback_probe?: string;
  emotionalContext?: EmotionalState;
  personalityUpdate?: Partial<PersonalityTraits>;
  relationshipUpdate?: Partial<RelationshipState>;
  memoryUpdates?: MemoryUpdate[];
}

export interface MemoryUpdate {
  type: "preference" | "joke" | "topic" | "moment" | "fact";
  action: "add" | "update" | "remove";
  content: any;
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  messages: Message[];
  context: ConversationContext;
}

export interface Analytics {
  eventId: string;
  userId: string;
  eventType: AnalyticsEventType;
  eventData: any;
  timestamp: string;
}

export type AnalyticsEventType =
  | "session_start"
  | "session_end"
  | "message_sent"
  | "message_received"
  | "credits_used"
  | "emotion_detected"
  | "relationship_milestone"
  | "personality_shift"
  | "error_occurred";

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalCreditsUsed: number;
  averageSessionLength: number;
  topEmotions: { emotion: EmotionType; count: number }[];
  relationshipDistribution: { stage: RelationshipStage; count: number }[];
  userActivity: { date: string; count: number }[];
  creditUsage: { date: string; amount: number }[];
}

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
}

export interface CreditTransaction {
  transactionId: string;
  userId: string;
  amount: number;
  type: "debit" | "credit";
  reason: string;
  timestamp: string;
  balance: number;
}
