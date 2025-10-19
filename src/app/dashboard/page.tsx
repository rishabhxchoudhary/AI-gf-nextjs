"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Progress,
  Avatar,
  Button,
  Tabs,
  Tab,
  ScrollShadow,
  Divider,
} from "@nextui-org/react";
import {
  Users,
  MessageCircle,
  Zap,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  Heart,
  Sparkles,
  User,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/loading-skeletons";
import type {
  DashboardStats,
  Analytics,
  UserProfile,
} from "@/types/ai-girlfriend";

const statCards = [
  {
    key: "totalUsers",
    title: "Total Users",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-50 to-cyan-50",
  },
  {
    key: "totalMessages",
    title: "Total Messages",
    icon: MessageCircle,
    color: "from-green-500 to-emerald-500",
    bgColor: "from-green-50 to-emerald-50",
  },
  {
    key: "totalCreditsUsed",
    title: "Credits Used",
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
    bgColor: "from-yellow-50 to-orange-50",
  },
  {
    key: "averageSessionLength",
    title: "Avg Session",
    icon: Clock,
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-50 to-pink-50",
    suffix: "m",
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } =
    api.dashboard.getStats.useQuery();
  const { data: userList, isLoading: usersLoading } =
    api.dashboard.getUserList.useQuery({
      limit: 50,
      sortBy: "lastActiveAt",
      order: "desc",
    });
  const { data: activityFeed, isLoading: activityLoading } =
    api.dashboard.getActivityFeed.useQuery({
      limit: 20,
    });

  if (!mounted || statsLoading || usersLoading || activityLoading) {
    return <DashboardSkeleton />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "success" : "default";
  };

  const getRelationshipColor = (stage: string) => {
    switch (stage) {
      case "new":
        return "primary";
      case "comfortable":
        return "secondary";
      case "intimate":
        return "warning";
      case "established":
        return "danger";
      default:
        return "default";
    }
  };

  const getRelationshipEmoji = (stage: string) => {
    switch (stage) {
      case "new":
        return "🌱";
      case "comfortable":
        return "🌸";
      case "intimate":
        return "💕";
      case "established":
        return "💑";
      default:
        return "💫";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-indigo-50/30">
      <div className="container mx-auto max-w-7xl p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time insights and user analytics for your AI Girlfriend
            platform
          </p>
        </div>

        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          aria-label="Dashboard tabs"
          color="primary"
          variant="underlined"
          className="mb-8"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0",
            cursor: "w-full bg-gradient-to-r from-pink-500 to-purple-600",
            tab: "max-w-fit px-0 h-12",
            tabContent:
              "group-data-[selected=true]:text-purple-600 font-semibold",
          }}
        >
          <Tab
            key="overview"
            title={
              <div className="flex items-center gap-2">
                <BarChart3 size={18} />
                <span>Overview</span>
              </div>
            }
          >
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((card) => {
                const IconComponent = card.icon;
                const value =
                  (stats?.[
                    card.key as keyof Pick<
                      DashboardStats,
                      | "totalUsers"
                      | "totalMessages"
                      | "totalCreditsUsed"
                      | "averageSessionLength"
                      | "activeUsers"
                    >
                  ] as number) || 0;

                return (
                  <Card
                    key={card.key}
                    className="bg-white/90 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300"
                  >
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`p-3 rounded-xl bg-gradient-to-r ${card.color}`}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowUp size={14} />
                            <span className="text-xs font-medium">+12%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          {card.title}
                        </p>
                        <p className="text-3xl font-bold text-gray-800">
                          {typeof value === "number"
                            ? value.toLocaleString()
                            : value}
                          {card.suffix || ""}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {card.key === "totalUsers" &&
                            `${stats?.activeUsers || 0} active this week`}
                          {card.key === "totalMessages" &&
                            "All time conversations"}
                          {card.key === "totalCreditsUsed" &&
                            "Total credits consumed"}
                          {card.key === "averageSessionLength" &&
                            "Average chat duration"}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Emotional Distribution Chart */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Emotional Distribution
                    </h3>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <ScrollShadow className="h-64">
                    <div className="space-y-4">
                      {stats?.topEmotions?.map((emotion, index) => (
                        <div key={emotion.emotion} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600" />
                              <span className="text-sm font-medium capitalize text-gray-700">
                                {emotion.emotion}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {emotion.count}
                            </span>
                          </div>
                          <Progress
                            value={
                              (emotion.count / (stats?.totalMessages || 1)) *
                              100
                            }
                            className="h-2"
                            classNames={{
                              indicator:
                                "bg-gradient-to-r from-pink-500 to-purple-600",
                            }}
                          />
                        </div>
                      ))}
                      {!stats?.topEmotions?.length && (
                        <div className="text-center py-8">
                          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No emotion data yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollShadow>
                </CardBody>
              </Card>

              {/* Relationship Stages */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Relationship Stages
                    </h3>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <ScrollShadow className="h-64">
                    <div className="space-y-4">
                      {stats?.relationshipDistribution?.map((stage, index) => (
                        <div
                          key={stage.stage}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {getRelationshipEmoji(stage.stage)}
                            </span>
                            <div>
                              <p className="font-medium text-gray-800 capitalize">
                                {stage.stage}
                              </p>
                              <p className="text-xs text-gray-500">
                                {stage.count} users
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Progress
                              value={
                                (stage.count / (stats?.totalUsers || 1)) * 100
                              }
                              className="w-24 h-2"
                              color={getRelationshipColor(stage.stage)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.round(
                                (stage.count / (stats?.totalUsers || 1)) * 100,
                              )}
                              %
                            </p>
                          </div>
                        </div>
                      ))}
                      {!stats?.relationshipDistribution?.length && (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">
                            No relationship data yet
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollShadow>
                </CardBody>
              </Card>
            </div>

            {/* Activity Timeline */}
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Recent Activity
                    </h3>
                  </div>
                  <Button size="sm" variant="flat" className="text-xs">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <ScrollShadow className="h-80">
                  <div className="space-y-4">
                    {activityFeed?.map((event, index) => {
                      const analyticsEvent = event as Analytics & {
                        description: string;
                      };
                      return (
                        <div
                          key={analyticsEvent.eventId || index}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mt-2 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">
                              {analyticsEvent.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar size={12} className="text-gray-400" />
                              <p className="text-xs text-gray-500">
                                {formatDate(analyticsEvent.timestamp)} at{" "}
                                {formatTime(analyticsEvent.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!activityFeed?.length && (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No recent activity</p>
                      </div>
                    )}
                  </div>
                </ScrollShadow>
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="users"
            title={
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>Users</span>
              </div>
            }
          >
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">
                    User Management
                  </h3>
                  <Chip
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="font-medium"
                  >
                    {userList?.total || 0} total users
                  </Chip>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <Table
                  aria-label="Users table"
                  removeWrapper
                  classNames={{
                    base: "max-h-[600px] overflow-auto",
                    table: "min-h-[400px]",
                    th: "bg-gray-50/50 text-gray-700 font-semibold",
                    td: "border-b border-gray-100",
                  }}
                >
                  <TableHeader>
                    <TableColumn>USER</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                    <TableColumn>CREDITS</TableColumn>
                    <TableColumn>MESSAGES</TableColumn>
                    <TableColumn>RELATIONSHIP</TableColumn>
                    <TableColumn>JOINED</TableColumn>
                    <TableColumn>LAST ACTIVE</TableColumn>
                  </TableHeader>
                  <TableBody
                    emptyContent={
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No users yet</p>
                      </div>
                    }
                  >
                    {userList?.users?.map((user) => {
                      const userWithStats = user as UserProfile & {
                        daysSinceActive: number;
                        isActive: boolean;
                        averageCreditsPerMessage: number;
                        relationshipStage?: string;
                      };
                      return (
                        <TableRow
                          key={userWithStats.userId}
                          className="hover:bg-gray-50/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={userWithStats.name}
                                size="sm"
                                className="ring-2 ring-purple-100"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {userWithStats.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {userWithStats.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              color={
                                userWithStats.isActive ? "success" : "default"
                              }
                              variant="flat"
                              className="capitalize font-medium"
                            >
                              {userWithStats.isActive ? "Active" : "Inactive"}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {userWithStats.credits}
                              </p>
                              <p className="text-xs text-gray-500">
                                Used: {userWithStats.totalCreditsUsed}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-800">
                                {userWithStats.messageCount}
                              </p>
                              <p className="text-xs text-gray-500">
                                {userWithStats.sessionCount} sessions
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              color={getRelationshipColor(
                                userWithStats.relationshipStage || "new",
                              )}
                              variant="flat"
                              className="capitalize font-medium"
                            >
                              {getRelationshipEmoji(
                                userWithStats.relationshipStage || "new",
                              )}{" "}
                              {userWithStats.relationshipStage || "new"}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <Chip size="sm" color="secondary" variant="flat">
                              {userWithStats.subscriptionStatus}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-xs text-gray-600">
                                {formatDate(userWithStats.lastActiveAt)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {userWithStats.daysSinceActive}d ago
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }) || []}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="analytics"
            title={
              <div className="flex items-center gap-2">
                <TrendingUp size={18} />
                <span>Analytics</span>
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Active Users */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Daily Active Users (7 days)
                    </h3>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <ScrollShadow className="h-64">
                    <div className="space-y-3">
                      {stats?.userActivity?.slice(-7).map((day, index) => (
                        <div key={day.date} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">
                              {formatDate(day.date)}
                            </span>
                            <span className="text-sm font-semibold text-gray-800">
                              {day.count}
                            </span>
                          </div>
                          <Progress
                            value={
                              (day.count /
                                Math.max(
                                  ...(stats?.userActivity?.map(
                                    (d) => d.count,
                                  ) || [1]),
                                )) *
                              100
                            }
                            className="h-3"
                            classNames={{
                              indicator:
                                "bg-gradient-to-r from-blue-500 to-cyan-500",
                            }}
                          />
                        </div>
                      ))}
                      {!stats?.userActivity?.length && (
                        <div className="text-center py-8">
                          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No activity data yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollShadow>
                </CardBody>
              </Card>

              {/* Daily Credit Usage */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Daily Credit Usage (7 days)
                    </h3>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <ScrollShadow className="h-64">
                    <div className="space-y-3">
                      {stats?.creditUsage?.slice(-7).map((day, index) => (
                        <div key={day.date} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 font-medium">
                              {formatDate(day.date)}
                            </span>
                            <span className="text-sm font-semibold text-gray-800">
                              {day.amount}
                            </span>
                          </div>
                          <Progress
                            value={
                              (day.amount /
                                Math.max(
                                  ...(stats?.creditUsage?.map(
                                    (d) => d.amount,
                                  ) || [1]),
                                )) *
                              100
                            }
                            className="h-3"
                            classNames={{
                              indicator:
                                "bg-gradient-to-r from-yellow-500 to-orange-500",
                            }}
                          />
                        </div>
                      ))}
                      {!stats?.creditUsage?.length && (
                        <div className="text-center py-8">
                          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">
                            No credit usage data yet
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollShadow>
                </CardBody>
              </Card>
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
