import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { getAllUsers, getAllAnalytics, getUserAnalytics } from "@/lib/dynamodb";
import type {
  DashboardStats,
  EmotionType,
  RelationshipStage,
} from "@/types/ai-girlfriend";

export const dashboardRouter = createTRPCRouter({
  // Get overall dashboard statistics
  getStats: publicProcedure.query(async () => {
    try {
      // Get all users
      const users = await getAllUsers();
      const analytics = await getAllAnalytics();

      // Calculate basic stats
      const totalUsers = users.length;
      const activeUsers = users.filter((u) => {
        const lastActive = new Date(u.lastActiveAt);
        const daysSinceActive =
          (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= 7; // Active in last 7 days
      }).length;

      const totalMessages = users.reduce(
        (sum, u) => sum + (u.messageCount || 0),
        0,
      );
      const totalCreditsUsed = users.reduce(
        (sum, u) => sum + (u.totalCreditsUsed || 0),
        0,
      );

      // Calculate average session length
      const sessionEvents = analytics.filter(
        (e) => e.eventType === "session_start" || e.eventType === "session_end",
      );
      const sessionDurations: number[] = [];
      const sessionStarts = new Map<string, string>();

      sessionEvents.forEach((event) => {
        const key = `${event.userId}_${event.eventData?.sessionId}`;
        if (event.eventType === "session_start") {
          sessionStarts.set(key, event.timestamp);
        } else if (
          event.eventType === "session_end" &&
          sessionStarts.has(key)
        ) {
          const start = new Date(sessionStarts.get(key)!).getTime();
          const end = new Date(event.timestamp).getTime();
          const duration = (end - start) / (1000 * 60); // Convert to minutes
          if (duration > 0 && duration < 1440) {
            // Filter out invalid durations
            sessionDurations.push(duration);
          }
        }
      });

      const averageSessionLength =
        sessionDurations.length > 0
          ? sessionDurations.reduce((a, b) => a + b, 0) /
            sessionDurations.length
          : 0;

      // Analyze emotions from messages
      const emotionCounts = new Map<EmotionType, number>();
      analytics
        .filter(
          (e) =>
            e.eventType === "message_sent" && e.eventData?.emotionalContext,
        )
        .forEach((event) => {
          const emotion = event.eventData.emotionalContext
            .primary as EmotionType;
          emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
        });

      const topEmotions = Array.from(emotionCounts.entries())
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Relationship stage distribution
      const relationshipCounts = new Map<RelationshipStage, number>();
      const stages: RelationshipStage[] = [
        "new",
        "comfortable",
        "intimate",
        "established",
      ];
      stages.forEach((stage) => relationshipCounts.set(stage, 0));

      // This would need to be tracked better in production
      // For now, we'll estimate based on interaction counts
      users.forEach((user) => {
        const interactions = user.messageCount || 0;
        let stage: RelationshipStage = "new";
        if (interactions > 35) stage = "established";
        else if (interactions > 15) stage = "intimate";
        else if (interactions > 5) stage = "comfortable";

        relationshipCounts.set(stage, (relationshipCounts.get(stage) || 0) + 1);
      });

      const relationshipDistribution = Array.from(
        relationshipCounts.entries(),
      ).map(([stage, count]) => ({ stage, count }));

      // User activity over time (last 30 days)
      const userActivity: { date: string; count: number }[] = [];
      const activityMap = new Map<string, number>();

      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        if (dateStr) {
          activityMap.set(dateStr, 0);
        }
      }

      analytics
        .filter((e) => e.eventType === "session_start")
        .forEach((event) => {
          const date = new Date(event.timestamp).toISOString().split("T")[0];
          if (date && activityMap.has(date)) {
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
          }
        });

      activityMap.forEach((count, date) => {
        userActivity.push({ date, count });
      });

      // Credit usage over time (last 30 days)
      const creditUsage: { date: string; amount: number }[] = [];
      const creditMap = new Map<string, number>();

      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        if (dateStr) {
          creditMap.set(dateStr, 0);
        }
      }

      analytics
        .filter(
          (e) => e.eventType === "message_sent" && e.eventData?.creditsUsed,
        )
        .forEach((event) => {
          const date = new Date(event.timestamp).toISOString().split("T")[0];
          if (date && creditMap.has(date)) {
            creditMap.set(
              date,
              (creditMap.get(date) || 0) + event.eventData.creditsUsed,
            );
          }
        });

      creditMap.forEach((amount, date) => {
        creditUsage.push({ date, amount });
      });

      const stats: DashboardStats = {
        totalUsers,
        activeUsers,
        totalMessages,
        totalCreditsUsed,
        averageSessionLength: Math.round(averageSessionLength * 100) / 100,
        topEmotions,
        relationshipDistribution,
        userActivity,
        creditUsage,
      };

      return stats;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Return default stats on error
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalMessages: 0,
        totalCreditsUsed: 0,
        averageSessionLength: 0,
        topEmotions: [],
        relationshipDistribution: [],
        userActivity: [],
        creditUsage: [],
      };
    }
  }),

  // Get detailed user list with stats
  getUserList: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        sortBy: z
          .enum(["createdAt", "lastActiveAt", "credits", "messageCount"])
          .default("createdAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ input }) => {
      try {
        const users = await getAllUsers();

        // Sort users based on input
        users.sort((a, b) => {
          let aVal, bVal;
          switch (input.sortBy) {
            case "createdAt":
              aVal = new Date(a.createdAt).getTime();
              bVal = new Date(b.createdAt).getTime();
              break;
            case "lastActiveAt":
              aVal = new Date(a.lastActiveAt).getTime();
              bVal = new Date(b.lastActiveAt).getTime();
              break;
            case "credits":
              aVal = a.credits || 0;
              bVal = b.credits || 0;
              break;
            case "messageCount":
              aVal = a.messageCount || 0;
              bVal = b.messageCount || 0;
              break;
            default:
              aVal = 0;
              bVal = 0;
          }

          return input.order === "asc" ? aVal - bVal : bVal - aVal;
        });

        // Limit results
        const limitedUsers = users.slice(0, input.limit);

        // Add additional calculated fields
        const usersWithStats = limitedUsers.map((user) => {
          const lastActive = new Date(user.lastActiveAt);
          const daysSinceActive = Math.floor(
            (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
          );

          return {
            ...user,
            daysSinceActive,
            isActive: daysSinceActive <= 7,
            averageCreditsPerMessage:
              user.messageCount > 0
                ? Math.round(
                    (user.totalCreditsUsed / user.messageCount) * 100,
                  ) / 100
                : 0,
          };
        });

        return {
          users: usersWithStats,
          total: users.length,
        };
      } catch (error) {
        console.error("Error fetching user list:", error);
        return {
          users: [],
          total: 0,
        };
      }
    }),

  // Get analytics events
  getAnalyticsEvents: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        eventType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      try {
        let events;

        if (input.userId) {
          events = await getUserAnalytics(input.userId);
        } else {
          events = await getAllAnalytics();
        }

        // Filter by event type if specified
        if (input.eventType) {
          events = events.filter((e) => e.eventType === input.eventType);
        }

        // Sort by timestamp (newest first)
        events.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        // Limit results
        const limitedEvents = events.slice(0, input.limit);

        return {
          events: limitedEvents,
          total: events.length,
        };
      } catch (error) {
        console.error("Error fetching analytics events:", error);
        return {
          events: [],
          total: 0,
        };
      }
    }),

  // Get real-time activity feed
  getActivityFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      try {
        const analytics = await getAllAnalytics();

        // Filter for interesting events
        const interestingEventTypes = [
          "session_start",
          "session_end",
          "user_created",
          "credits_added",
          "relationship_milestone",
        ];

        const events = analytics
          .filter((e) => interestingEventTypes.includes(e.eventType))
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
          .slice(0, input.limit)
          .map((event) => ({
            ...event,
            description: getEventDescription(event),
          }));

        return events;
      } catch (error) {
        console.error("Error fetching activity feed:", error);
        return [];
      }
    }),
});

// Helper function to generate human-readable event descriptions
function getEventDescription(event: any): string {
  switch (event.eventType) {
    case "user_created":
      return `New user joined: ${event.eventData?.name || "Anonymous"}`;
    case "session_start":
      return `User started a chat session`;
    case "session_end":
      return `Chat session ended`;
    case "credits_added":
      return `Added ${event.eventData?.amount || 0} credits`;
    case "relationship_milestone":
      return `Reached relationship milestone: ${event.eventData?.milestone || "Unknown"}`;
    default:
      return `${event.eventType} occurred`;
  }
}
