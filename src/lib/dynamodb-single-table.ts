import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const dynamoDB = DynamoDBDocumentClient.from(client);

// Single table name
export const TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || "ai-girlfriend-table";

// Entity types for better type safety
export const EntityType = {
  USER: "USER",
  SESSION: "SESSION",
  MESSAGE: "MESSAGE",
  ANALYTICS: "ANALYTICS",
  PERSONALITY: "PERSONALITY",
  CREDITS: "CREDITS",
  DAILY_STATS: "DAILY_STATS",
  USER_ANALYTICS: "USER_ANALYTICS",
} as const;

// Helper functions for key generation
const keys = {
  user: (userId: string) => ({
    pk: `USER#${userId}`,
    sk: "METADATA",
  }),
  userCredits: (userId: string) => ({
    pk: `USER#${userId}`,
    sk: "CREDITS",
  }),
  userPersonality: (userId: string) => ({
    pk: `USER#${userId}`,
    sk: "PERSONALITY",
  }),
  session: (userId: string, sessionId: string) => ({
    pk: `USER#${userId}`,
    sk: `SESSION#${sessionId}`,
  }),
  message: (sessionId: string, timestamp: string, messageId: string) => ({
    pk: `SESSION#${sessionId}`,
    sk: `MSG#${timestamp}#${messageId}`,
  }),
  analytics: (date: string, timestamp: string, eventId: string) => ({
    pk: `ANALYTICS#${date}`,
    sk: `EVENT#${timestamp}#${eventId}`,
  }),
  userAnalytics: (userId: string, timestamp: string, eventId: string) => ({
    pk: `USER#${userId}`,
    sk: `ANALYTICS#${timestamp}#${eventId}`,
  }),
  dailyStats: (date: string, statType: string) => ({
    pk: `STATS#${date}`,
    sk: `TYPE#${statType}`,
  }),
};

// ===========================
// USER MANAGEMENT
// ===========================

export async function createUser(userId: string, email: string, name?: string) {
  const timestamp = new Date().toISOString();
  const { pk, sk } = keys.user(userId);

  // Use transaction to create user with initial credits atomically
  const transactItems = [
    // User metadata
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          pk,
          sk,
          entityType: EntityType.USER,
          userId,
          email,
          name: name || "User",
          createdAt: timestamp,
          updatedAt: timestamp,
          lastActiveAt: timestamp,
          messageCount: 0,
          sessionCount: 0,
          subscriptionStatus: "free",
          // GSI1: Query all users
          gsi1pk: "USERS",
          gsi1sk: `USER#${timestamp}#${userId}`,
          // GSI2: Query by activity
          gsi2pk: "ACTIVE_USERS",
          gsi2sk: timestamp,
        },
      },
    },
    // User credits
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          pk: keys.userCredits(userId).pk,
          sk: keys.userCredits(userId).sk,
          entityType: EntityType.CREDITS,
          credits: 100, // Initial free credits
          totalCreditsUsed: 0,
          lastUpdated: timestamp,
        },
      },
    },
    // User personality
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          pk: keys.userPersonality(userId).pk,
          sk: keys.userPersonality(userId).sk,
          entityType: EntityType.PERSONALITY,
          ...getDefaultPersonalityState(),
          updatedAt: timestamp,
        },
      },
    },
  ];

  await dynamoDB.send(
    new TransactWriteCommand({ TransactItems: transactItems }),
  );
}

export async function getUser(userId: string) {
  const { pk, sk } = keys.user(userId);
  const response = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
    }),
  );
  return response.Item;
}

export async function getUserWithCredits(userId: string) {
  // Get both user and credits in parallel for better performance
  const [userResponse, creditsResponse] = await Promise.all([
    dynamoDB.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: keys.user(userId),
      }),
    ),
    dynamoDB.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: keys.userCredits(userId),
      }),
    ),
  ]);

  const user = userResponse.Item;
  const credits = creditsResponse.Item; // No fallback - return actual data

  if (!user || !credits) {
    return null; // User or credits not found
  }

  return { ...user, ...credits };
}

// ===========================
// CREDIT MANAGEMENT
// ===========================

export async function getUserCredits(userId: string) {
  const { pk, sk } = keys.userCredits(userId);
  const response = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
    }),
  );

  // Return actual credits from database or null if not found
  return response.Item || null;
}

export async function addCredits(userId: string, creditsToAdd: number) {
  const { pk, sk } = keys.userCredits(userId);
  const timestamp = new Date().toISOString();

  const response = await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
      UpdateExpression: "ADD credits :add SET lastUpdated = :now",
      ExpressionAttributeValues: {
        ":add": creditsToAdd,
        ":now": timestamp,
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  return response.Attributes;
}

export async function updateUserCredits(userId: string, creditsUsed: number) {
  const { pk, sk } = keys.userCredits(userId);
  const timestamp = new Date().toISOString();

  try {
    const response = await dynamoDB.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
        UpdateExpression:
          "ADD credits :negUsed, totalCreditsUsed :used SET lastUpdated = :now",
        ConditionExpression: "credits >= :minCredits",
        ExpressionAttributeValues: {
          ":negUsed": -creditsUsed, // Subtract credits by adding negative value
          ":used": creditsUsed,
          ":now": timestamp,
          ":minCredits": creditsUsed, // Ensure user has enough credits
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    // Also update user's last active timestamp
    await dynamoDB.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: keys.user(userId),
        UpdateExpression: "SET lastActiveAt = :now ADD messageCount :one",
        ExpressionAttributeValues: {
          ":now": timestamp,
          ":one": 1,
        },
      }),
    );

    return response.Attributes;
  } catch (error: any) {
    // Handle conditional check failed error
    if (error.name === "ConditionalCheckFailedException") {
      // Get current credits to provide better error info
      const currentCredits = await getUserCredits(userId);
      const creditsAmount = currentCredits?.credits ?? 0;
      throw new Error(
        `Insufficient credits. Current: ${creditsAmount}, Required: ${creditsUsed}`,
      );
    }
    // Re-throw other errors
    throw error;
  }
}

// ===========================
// SESSION MANAGEMENT
// ===========================

export async function createSession(userId: string, sessionId: string) {
  const timestamp = new Date().toISOString();
  const { pk, sk } = keys.session(userId, sessionId);

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk,
        entityType: EntityType.SESSION,
        sessionId,
        userId,
        startedAt: timestamp,
        lastMessageAt: timestamp,
        messageCount: 0,
        relationshipStage: "new",
        interactionCount: 0,
        positiveInteractions: 0,
        // GSI1: Query all sessions
        gsi1pk: "SESSIONS",
        gsi1sk: `SESSION#${timestamp}#${sessionId}`,
        // GSI2: Query sessions by user and time
        gsi2pk: `USER_SESSIONS#${userId}`,
        gsi2sk: timestamp,
      },
    }),
  );

  // Update user's session count
  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.user(userId),
      UpdateExpression: "ADD sessionCount :one",
      ExpressionAttributeValues: {
        ":one": 1,
      },
    }),
  );
}

export async function getSession(userId: string, sessionId: string) {
  const { pk, sk } = keys.session(userId, sessionId);
  const response = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
    }),
  );
  return response.Item;
}

export async function getUserSessions(userId: string, limit = 10) {
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER_SESSIONS#${userId}`,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    }),
  );
  return response.Items || [];
}

// ===========================
// MESSAGE MANAGEMENT
// ===========================

export async function saveMessage(
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: any,
) {
  const timestamp = new Date().toISOString();
  const messageId = nanoid();
  const { pk, sk } = keys.message(sessionId, timestamp, messageId);

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk,
        entityType: EntityType.MESSAGE,
        messageId,
        sessionId,
        userId,
        role,
        content,
        timestamp,
        metadata: metadata || {},
        // GSI1: Query all messages by user
        gsi1pk: `USER_MESSAGES#${userId}`,
        gsi1sk: `${timestamp}#${messageId}`,
        // GSI2: Query by timestamp globally
        gsi2pk: "ALL_MESSAGES",
        gsi2sk: timestamp,
      },
    }),
  );

  // Update session's last message time
  await dynamoDB.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.session(userId, sessionId),
      UpdateExpression: "SET lastMessageAt = :now ADD messageCount :one",
      ExpressionAttributeValues: {
        ":now": timestamp,
        ":one": 1,
      },
    }),
  );

  return messageId;
}

export async function getSessionMessages(sessionId: string, limit = 20) {
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionId}`,
        ":skPrefix": "MSG#",
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    }),
  );

  // Reverse to get chronological order
  return (response.Items || []).reverse();
}

export async function getUserMessages(userId: string, limit = 50) {
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER_MESSAGES#${userId}`,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return response.Items || [];
}

// ===========================
// PERSONALITY STATE MANAGEMENT
// ===========================

export async function getPersonalityState(userId: string) {
  const { pk, sk } = keys.userPersonality(userId);
  const response = await dynamoDB.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
    }),
  );
  return response.Item || getDefaultPersonalityState();
}

export async function updatePersonalityState(userId: string, updates: any) {
  const { pk, sk } = keys.userPersonality(userId);
  const timestamp = new Date().toISOString();

  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk,
        entityType: EntityType.PERSONALITY,
        ...updates,
        updatedAt: timestamp,
      },
    }),
  );
}

function getDefaultPersonalityState() {
  return {
    traits: {
      confidence: 0.7,
      romantic_intensity: 0.8,
      playfulness: 0.6,
      vulnerability: 0.4,
      assertiveness: 0.5,
      curiosity: 0.6,
      empathy: 0.7,
      spontaneity: 0.5,
      possessiveness: 0.3,
      loyalty: 0.8,
      sensuality: 0.8,
      intelligence: 0.7,
      humor: 0.6,
      emotional_intensity: 0.7,
      independence: 0.5,
    },
    relationshipStage: "new",
    interactionCount: 0,
    positiveInteractions: 0,
    insideJokes: [],
    userPreferences: {},
    emotionalMoments: [],
    unfinishedTopics: [],
  };
}

// ===========================
// ANALYTICS
// ===========================

export async function trackAnalytics(
  userId: string,
  eventType: string,
  eventData: any,
) {
  const timestamp = new Date().toISOString();
  const date = timestamp.split("T")[0];
  const eventId = nanoid();

  // Validate date is defined
  if (!date) {
    throw new Error("Failed to extract date from timestamp");
  }

  // Store analytics event
  const { pk, sk } = keys.analytics(date, timestamp, eventId);
  await dynamoDB.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk,
        entityType: EntityType.ANALYTICS,
        eventId,
        userId,
        eventType,
        eventData,
        timestamp,
        date,
        // GSI1: Query by event type
        gsi1pk: `EVENT_TYPE#${eventType}`,
        gsi1sk: `${timestamp}#${eventId}`,
        // GSI2: Query by user
        gsi2pk: `USER_ANALYTICS#${userId}`,
        gsi2sk: timestamp,
      },
    }),
  );

  // Update daily statistics
  await updateDailyStats(date, eventType);
}

async function updateDailyStats(date: string, eventType: string) {
  if (!date) {
    throw new Error("Date is required for updating daily stats");
  }
  const { pk, sk } = keys.dailyStats(date, eventType);

  try {
    await dynamoDB.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
        UpdateExpression:
          "SET #count = if_not_exists(#count, :zero) + :one, entityType = :type",
        ExpressionAttributeNames: {
          "#count": "count",
        },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":type": EntityType.DAILY_STATS,
        },
      }),
    );
  } catch (error) {
    // If update fails, create the record
    await dynamoDB.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk,
          sk,
          entityType: EntityType.DAILY_STATS,
          date,
          eventType,
          count: 1,
        },
      }),
    );
  }
}

// ===========================
// DASHBOARD QUERIES
// ===========================

export async function getAllUsers(limit = 100) {
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :pk",
      ExpressionAttributeValues: {
        ":pk": "USERS",
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return response.Items || [];
}

export async function getRecentAnalytics(limit = 100) {
  const today = new Date().toISOString().split("T")[0];
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `ANALYTICS#${today}`,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return response.Items || [];
}

export async function getUserAnalytics(userId: string, limit = 100) {
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER_ANALYTICS#${userId}`,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return response.Items || [];
}

export async function getDailyStats(date: string) {
  const response = await dynamoDB.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `STATS#${date}`,
      },
    }),
  );
  return response.Items || [];
}

export async function getDateRangeStats(startDate: string, endDate: string) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  const promises = dates
    .filter((date): date is string => date != null)
    .map((date) => getDailyStats(date));
  const results = await Promise.all(promises);

  return results.flat();
}

// ===========================
// BATCH OPERATIONS
// ===========================

export async function batchGetItems(keys: Array<{ pk: string; sk: string }>) {
  // DynamoDB BatchGet has a limit of 100 items
  const chunks = [];
  for (let i = 0; i < keys.length; i += 100) {
    chunks.push(keys.slice(i, i + 100));
  }

  const results = [];
  for (const chunk of chunks) {
    const response = await dynamoDB.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((key) => ({
            DeleteRequest: {
              Key: { pk: key.pk, sk: key.sk },
            },
          })),
        },
      }),
    );

    const commandOutput = response as any;
    results.push(...(commandOutput.UnprocessedItems?.[TABLE_NAME] || []));
  }

  return results;
}

// Export helper functions for migrations
export { keys };
