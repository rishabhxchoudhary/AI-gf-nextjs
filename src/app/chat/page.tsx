"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Button,
  ScrollShadow,
  Chip,
  Avatar,
  Spinner,
  Divider,
  Progress,
} from "@nextui-org/react";
import { MessageBurst } from "@/types/ai-girlfriend";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp?: string }>>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentBurst, setCurrentBurst] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC mutations and queries
  const initUser = api.aiGirlfriend.initializeUser.useMutation();
  const startSession = api.aiGirlfriend.startSession.useMutation();
  const sendMessage = api.aiGirlfriend.sendMessage.useMutation();
  const endSession = api.aiGirlfriend.endSession.useMutation();
  const { data: userProfile, refetch: refetchProfile } = api.aiGirlfriend.getUserProfile.useQuery(
    undefined,
    { enabled: !!session }
  );
  const { data: credits, refetch: refetchCredits } = api.aiGirlfriend.getCredits.useQuery(
    undefined,
    { enabled: !!session }
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Initialize user and session
  useEffect(() => {
    if (session?.user) {
      initializeChat();
    }
  }, [session]);

  const initializeChat = async () => {
    try {
      // Initialize user if needed
      await initUser.mutateAsync();

      // Start new session
      const sessionData = await startSession.mutateAsync();
      setSessionId(sessionData.sessionId);

      // Add welcome message
      setMessages([
        {
          role: "assistant",
          content: "Hey babe! 💕 I've been thinking about you... How are you feeling today?",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentBurst]);

  const simulateTyping = async (bursts: MessageBurst[]) => {
    setIsTyping(true);

    for (const burst of bursts) {
      // Show typing indicator
      await new Promise(resolve => setTimeout(resolve, burst.wait_ms || 800));

      // Add the burst to current typing
      setCurrentBurst(burst.text);

      // Small delay to show the text
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Combine all bursts into final message
    const fullMessage = bursts.map(b => b.text).join(" ");
    setMessages(prev => [...prev, {
      role: "assistant",
      content: fullMessage,
      timestamp: new Date().toISOString(),
    }]);

    setCurrentBurst("");
    setIsTyping(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !sessionId || isTyping) return;

    const userMessage = message.trim();
    setMessage("");

    // Add user message immediately
    setMessages(prev => [...prev, {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const response = await sendMessage.mutateAsync({
        message: userMessage,
        sessionId,
      });

      // Simulate realistic typing for AI response
      await simulateTyping(response.response);

      // Refresh credits
      refetchCredits();
      refetchProfile();
    } catch (error: any) {
      console.error("Failed to send message:", error);

      // Show error message
      setMessages(prev => [...prev, {
        role: "system",
        content: error.message || "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRelationshipColor = (stage?: string) => {
    switch (stage) {
      case "new": return "primary";
      case "comfortable": return "secondary";
      case "intimate": return "warning";
      case "established": return "danger";
      default: return "default";
    }
  };

  const getRelationshipEmoji = (stage?: string) => {
    switch (stage) {
      case "new": return "🌱";
      case "comfortable": return "🌸";
      case "intimate": return "💕";
      case "established": return "💑";
      default: return "💫";
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 h-screen flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
          <div className="flex items-center gap-4">
            <Avatar
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aria"
              size="lg"
              className="ring-2 ring-pink-500"
            />
            <div>
              <h1 className="text-xl font-bold">Aria</h1>
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  color={getRelationshipColor(userProfile?.relationshipStage)}
                  variant="flat"
                >
                  {getRelationshipEmoji(userProfile?.relationshipStage)} {userProfile?.relationshipStage || "new"}
                </Chip>
                <span className="text-xs text-gray-500">
                  {userProfile?.interactionCount || 0} chats
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Credits</p>
              <p className="text-lg font-bold">{credits?.credits || 0}</p>
            </div>
            <Button
              color="danger"
              variant="flat"
              size="sm"
              onClick={async () => {
                if (sessionId) {
                  await endSession.mutateAsync({ sessionId });
                }
                router.push("/");
              }}
            >
              End Chat
            </Button>
          </div>
        </CardHeader>

        <Divider />

        <CardBody className="flex-1 overflow-hidden p-0">
          <ScrollShadow className="h-full p-6">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : msg.role === "system"
                        ? "bg-warning/20 text-warning-600"
                        : "bg-default-100"
                    } rounded-2xl px-4 py-3 shadow-sm`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.timestamp && (
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {(isTyping || currentBurst) && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] bg-default-100 rounded-2xl px-4 py-3 shadow-sm">
                    {currentBurst ? (
                      <p className="text-sm">{currentBurst}</p>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-default-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-default-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-default-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollShadow>
        </CardBody>

        <Divider />

        <CardFooter className="px-6 py-4">
          <div className="flex items-center gap-2 w-full">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isTyping || credits?.credits === 0}
              endContent={
                <span className="text-xs text-default-400">
                  {message.length}/1000
                </span>
              }
              classNames={{
                input: "text-sm",
              }}
            />
            <Button
              color="primary"
              onClick={handleSendMessage}
              disabled={!message.trim() || isTyping || credits?.credits === 0}
              isLoading={sendMessage.isPending}
            >
              Send
            </Button>
          </div>

          {credits?.credits === 0 && (
            <p className="text-xs text-danger mt-2">
              You're out of credits! Purchase more to continue chatting.
            </p>
          )}
        </CardFooter>
      </Card>

      {/* Personality traits preview */}
      {userProfile?.personalityTraits && (
        <div className="mt-4 p-4 bg-default-50 rounded-lg">
          <p className="text-xs font-semibold mb-2">Aria's Current Mood</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(userProfile.personalityTraits)
              .filter(([_, value]) => value > 0.7)
              .slice(0, 5)
              .map(([trait, value]) => (
                <Chip key={trait} size="sm" variant="flat">
                  {trait.replace(/_/g, " ")}
                </Chip>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
