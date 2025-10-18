// Re-export all functions from single table implementation
export {
  dynamoDB,
  // User management
  createUser,
  getUser,
  getUserWithCredits,
  updateUserCredits,
  // Credit management
  getUserCredits,
  addCredits,
  // Session management
  createSession as createConversation,
  getSession as getConversation,
  getUserSessions,
  // Message management
  saveMessage,
  getSessionMessages,
  getUserMessages,
  // Personality management
  getPersonalityState,
  updatePersonalityState,
  // Analytics
  trackAnalytics,
  getAllUsers,
  getRecentAnalytics as getAllAnalytics,
  getUserAnalytics,
  getDailyStats,
  getDateRangeStats,
  // Batch operations
  batchGetItems,
  // Helper exports
  keys,
  EntityType,
} from "./dynamodb-single-table";

// For backward compatibility, create a TABLES object that maps old table names
export const TABLES = {
  USERS: process.env.DYNAMODB_TABLE_NAME || "ai-girlfriend-table",
  CONVERSATIONS: process.env.DYNAMODB_TABLE_NAME || "ai-girlfriend-table",
  MESSAGES: process.env.DYNAMODB_TABLE_NAME || "ai-girlfriend-table",
  ANALYTICS: process.env.DYNAMODB_TABLE_NAME || "ai-girlfriend-table",
  PERSONALITY_STATE: process.env.DYNAMODB_TABLE_NAME || "ai-girlfriend-table",
};

// Compatibility wrapper for getMessages to work with sessionId instead of userId
export async function getMessages(
  userId: string,
  sessionId: string,
  limit = 20,
) {
  const { getSessionMessages } = await import("./dynamodb-single-table");
  return getSessionMessages(sessionId, limit);
}
