"use client";

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
  Spinner,
  Chip,
  Progress,
  Avatar,
  Button,
  Tabs,
  Tab,
  ScrollShadow,
  Divider,
} from "@nextui-org/react";
import { useState } from "react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = api.dashboard.getStats.useQuery();
  const { data: userList, isLoading: usersLoading } = api.dashboard.getUserList.useQuery({
    limit: 50,
    sortBy: "lastActiveAt",
    order: "desc",
  });
  const { data: activityFeed, isLoading: activityLoading } = api.dashboard.getActivityFeed.useQuery({
    limit: 20,
  });

  if (statsLoading || usersLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading dashboard..." />
      </div>
    );
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
      case "new": return "primary";
      case "comfortable": return "secondary";
      case "intimate": return "warning";
      case "established": return "danger";
      default: return "default";
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Girlfriend Analytics Dashboard</h1>
        <p className="text-gray-600">Real-time insights and user analytics</p>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        aria-label="Dashboard tabs"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6 w-full relative rounded-none p-0 mb-8",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-primary",
        }}
      >
        <Tab key="overview" title="Overview">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100">
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {stats?.activeUsers || 0} active this week
                </p>
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-success-50 to-success-100">
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Total Messages</p>
                <p className="text-3xl font-bold">{stats?.totalMessages || 0}</p>
                <p className="text-xs text-gray-500 mt-2">
                  All time conversations
                </p>
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-warning-50 to-warning-100">
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Credits Used</p>
                <p className="text-3xl font-bold">{stats?.totalCreditsUsed || 0}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Total credits consumed
                </p>
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100">
              <CardBody>
                <p className="text-sm text-gray-600 mb-1">Avg Session</p>
                <p className="text-3xl font-bold">{stats?.averageSessionLength || 0}m</p>
                <p className="text-xs text-gray-500 mt-2">
                  Average chat duration
                </p>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Emotions Chart */}
            <Card>
              <CardHeader className="pb-0">
                <h3 className="text-lg font-semibold">Emotional Distribution</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {stats?.topEmotions?.map((emotion) => (
                    <div key={emotion.emotion} className="flex items-center gap-3">
                      <span className="text-sm w-20 capitalize">{emotion.emotion}</span>
                      <Progress
                        value={(emotion.count / (stats?.totalMessages || 1)) * 100}
                        className="flex-1"
                        color="primary"
                        size="sm"
                      />
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {emotion.count}
                      </span>
                    </div>
                  ))}
                  {!stats?.topEmotions?.length && (
                    <p className="text-gray-500 text-center py-4">No emotion data yet</p>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Relationship Stages */}
            <Card>
              <CardHeader className="pb-0">
                <h3 className="text-lg font-semibold">Relationship Stages</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {stats?.relationshipDistribution?.map((stage) => (
                    <div key={stage.stage} className="flex items-center justify-between">
                      <Chip
                        color={getRelationshipColor(stage.stage)}
                        variant="flat"
                        className="capitalize"
                      >
                        {stage.stage}
                      </Chip>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(stage.count / (stats?.totalUsers || 1)) * 100}
                          className="w-32"
                          color={getRelationshipColor(stage.stage)}
                          size="sm"
                        />
                        <span className="text-sm text-gray-500 w-12 text-right">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </CardHeader>
            <CardBody>
              <ScrollShadow className="h-[300px]">
                <div className="space-y-3">
                  {activityFeed?.map((event, index) => (
                    <div key={event.eventId || index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(event.timestamp)} at {formatTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!activityFeed?.length && (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </ScrollShadow>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="users" title="Users">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">User Management</h3>
              <Chip size="sm" variant="flat">
                {userList?.total || 0} total users
              </Chip>
            </CardHeader>
            <CardBody className="p-0">
              <Table
                aria-label="Users table"
                removeWrapper
                classNames={{
                  base: "max-h-[600px] overflow-scroll",
                  table: "min-h-[400px]",
                }}
              >
                <TableHeader>
                  <TableColumn>USER</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>CREDITS</TableColumn>
                  <TableColumn>MESSAGES</TableColumn>
                  <TableColumn>SESSIONS</TableColumn>
                  <TableColumn>JOINED</TableColumn>
                  <TableColumn>LAST ACTIVE</TableColumn>
                </TableHeader>
                <TableBody>
                  {userList?.users?.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            size="sm"
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.userId}`}
                          />
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={getStatusColor(user.isActive)}
                          variant="flat"
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{user.credits}</p>
                          <p className="text-xs text-gray-500">
                            Used: {user.totalCreditsUsed}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{user.messageCount}</TableCell>
                      <TableCell>{user.sessionCount}</TableCell>
                      <TableCell className="text-xs">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs">{formatDate(user.lastActiveAt)}</p>
                          <p className="text-xs text-gray-500">
                            {user.daysSinceActive}d ago
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="analytics" title="Analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Activity Chart */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Daily Active Users (30 days)</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {stats?.userActivity?.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{formatDate(day.date)}</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(day.count / Math.max(...(stats?.userActivity?.map(d => d.count) || [1]))) * 100}
                          className="w-32"
                          color="primary"
                          size="sm"
                        />
                        <span className="text-sm w-8 text-right">{day.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Credit Usage Chart */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Daily Credit Usage (30 days)</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {stats?.creditUsage?.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{formatDate(day.date)}</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(day.amount / Math.max(...(stats?.creditUsage?.map(d => d.amount) || [1]))) * 100}
                          className="w-32"
                          color="success"
                          size="sm"
                        />
                        <span className="text-sm w-12 text-right">{day.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
