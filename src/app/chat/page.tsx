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
  Chip,
  Avatar,
  Spinner,
  Divider,
  Progress,
} from "@nextui-org/react";
import type { MessageBurst, IceBreaker } from "@/types/ai-girlfriend";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp?: string }>>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentBurst, setCurrentBurst] = useState<string>("");
  const [iceBreakers, setIceBreakers] = useState<IceBreaker[]>([]);
  const [showIceBreakers, setShowIceBreakers] = useState(false);
  const [isGeneratingIceBreakers, setIsGeneratingIceBreakers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC mutations and queries
  const initUser = api.aiGirlfriend.initializeUser.useMutation();
  const startSession = api.aiGirlfriend.startSession.useMutation();
  const sendMessage = api.aiGirlfriend.sendMessage.useMutation();
  const sendIceBreakerMessage = api.aiGirlfriend.sendIceBreakerMessage.useMutation();
  const generateIceBreakers = api.aiGirlfriend.generateIceBreakers.useMutation();
  const endSession = api.aiGirlfriend.endSession.useMutation();
  const { data: userProfile, refetch: refetchProfile } = api.aiGirlfriend.getUserProfile.useQuery(
    undefined,
    { enabled: !!session }
  );
  const { data: credits, refetch: refetchCredits } = api.aiGirlfriend.getCredits.useQuery(
    undefined,
    { enabled: !!session }
  );
  const { data: userSessions } = api.aiGirlfriend.getUserSessions.useQuery(
    { limit: 5 },
    { enabled: !!session }
  );
  const { data: conversationHistory, refetch: refetchHistory } = api.aiGirlfriend.getConversationHistory.useQuery(
    { sessionId, limit: 50 },
    { enabled: !!sessionId }
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

      // Check if user has existing sessions
      const sessionsData = userSessions?.sessions || [];
      
      if (sessionsData.length > 0) {
        // Use the most recent session
        const mostRecentSession = sessionsData[0];
        setSessionId(mostRecentSession.sessionId);
        
        // Load conversation history will be handled by the useEffect below
      } else {
        // Start new session if no existing sessions
        const sessionData = await startSession.mutateAsync();
        setSessionId(sessionData.sessionId);
        
        // Add welcome message for new sessions only
        setMessages([
          {
            role: "assistant",
            content: "Hey babe! 💕 I've been thinking about you... How are you feeling today?",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  // Load conversation history when sessionId changes
  useEffect(() => {
    if (sessionId && conversationHistory?.messages) {
      const historyMessages = conversationHistory.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      
      if (historyMessages.length > 0) {
        // Only set messages if they're different to avoid overwriting new messages
        setMessages(prev => {
          // If we already have messages and they include the history, don't replace
          if (prev.length > 0 && prev.some(m => historyMessages.some(h => h.timestamp === m.timestamp))) {
            return prev;
          }
          return historyMessages;
        });
      }
    }
  }, [sessionId, conversationHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentBurst]);

  const simulateTyping = async (bursts: MessageBurst[]) => {
    setIsTyping(true);
    setCurrentBurst("");

    // If bursts is not an array or is empty, treat as plain text
    if (!Array.isArray(bursts) || bursts.length === 0) {
      setIsTyping(false);
      return;
    }

    for (let i = 0; i < bursts.length; i++) {
      const burst = bursts[i];
      
      // Validate burst structure
      if (!burst || typeof burst !== 'object' || !burst.text) {
        continue;
      }

      // Show typing dots while waiting
      setCurrentBurst("");
      await new Promise(resolve => setTimeout(resolve, burst.wait_ms || 800));

      // Briefly show the message being "typed" (like a preview)
      setCurrentBurst(burst.text);
      await new Promise(resolve => setTimeout(resolve, 500)); // Show for half a second

      // Add this burst as a separate message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: burst.text,
        timestamp: new Date().toISOString(),
      }]);

      // Clear current burst after adding the message
      setCurrentBurst("");
      
      // Small delay between messages (except for the last one)
      if (i < bursts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setCurrentBurst("");
    setIsTyping(false);
  };

  const handleGenerateIceBreakers = async () => {
    if (!sessionId || isGeneratingIceBreakers) return;

    setIsGeneratingIceBreakers(true);
    try {
      const response = await generateIceBreakers.mutateAsync({
        sessionId,
        count: 3,
      });

      setIceBreakers(response.iceBreakers);
      setShowIceBreakers(true);
      
      // Refresh credits after ice breaker generation
      refetchCredits();
    } catch (error) {
      console.error("Failed to generate ice breakers:", error);
      
      // Show error message to user
      setMessages(prev => [...prev, {
        role: "system",
        content: "Failed to generate conversation ideas. Please try again or check your credits.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsGeneratingIceBreakers(false);
    }
  };

  const handleIceBreakerClick = async (iceBreaker: IceBreaker) => {
    if (isTyping) return;

    // Hide ice breakers
    setShowIceBreakers(false);

    // Add user message immediately
    setMessages(prev => [...prev, {
      role: "user",
      content: iceBreaker.text,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const response = await sendIceBreakerMessage.mutateAsync({
        sessionId,
        iceBreakerId: iceBreaker.id,
        message: iceBreaker.text,
      });

      // Handle the AI response the same way as regular messages
      if (response.response && Array.isArray(response.response)) {
        await simulateTyping(response.response);
      }

      // Refresh credits
      refetchCredits();
      refetchProfile();
    } catch (error: any) {
      console.error("Failed to send ice breaker message:", error);
      
      setMessages(prev => [...prev, {
        role: "system",
        content: error.message || "Failed to send message. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    }
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

      // Debug log to see what we're getting
      console.log("AI Response:", response);

      // Handle different response formats - restore original simple logic
      if (response.response) {
        if (Array.isArray(response.response)) {
          // Proper burst format - this was working before
          await simulateTyping(response.response);
        } else if (typeof response.response === 'string') {
          // If it's a string that looks like JSON bursts, try to extract text
          if (response.response.includes('"text":')) {
            const textMatches = response.response.match(/"text":\s*"([^"]*?)"/g);
            if (textMatches) {
              const extractedText = textMatches
                .map(match => {
                  const textMatch = match.match(/"text":\s*"([^"]*?)"/);
                  return textMatch ? textMatch[1] : '';
                })
                .filter(text => text.length > 0)
                .join(' ');
              
              setMessages(prev => [...prev, {
                role: "assistant",
                content: extractedText,
                timestamp: new Date().toISOString(),
              }]);
            } else {
              // Fallback to original string
              setMessages(prev => [...prev, {
                role: "assistant",
                content: response.response as string,
                timestamp: new Date().toISOString(),
              }]);
            }
          } else {
            // Regular text response - show immediately
            setMessages(prev => [...prev, {
              role: "assistant",
              content: response.response as string,
              timestamp: new Date().toISOString(),
            }]);
          }
        } else {
          // Try original simulateTyping for other formats
          await simulateTyping(response.response);
        }
      }

      // Refresh credits only (don't refetch history as it might override current messages)
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
              src="/avatar.webp"
              size="lg"
              className="ring-2 ring-pink-500 max-h-50 max-w-50 rounded-full"
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
          <div 
            className="h-full overflow-y-auto p-6 scroll-smooth"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.timestamp || index}-${msg.role}`}
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
                      <div>
                        <p className="text-sm opacity-60 italic mb-1">Aria is typing...</p>
                        <p className="text-sm">{currentBurst}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default-500">Aria is typing</span>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </CardBody>

        <Divider />

        {/* Ice Breakers */}
        {showIceBreakers && iceBreakers.length > 0 && (
          <div className="px-6 py-3 bg-default-50/50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-default-600">💡 Conversation Starters</p>
              <Button 
                size="sm" 
                variant="light" 
                onClick={() => setShowIceBreakers(false)}
                className="text-xs"
              >
                Hide
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {iceBreakers.map((iceBreaker) => (
                <Button
                  key={iceBreaker.id}
                  variant="flat"
                  size="sm"
                  className="justify-start text-left h-auto py-3 px-3"
                  onClick={() => handleIceBreakerClick(iceBreaker)}
                  disabled={isTyping || credits?.credits === 0}
                >
                  <div className="flex flex-col items-start w-full">
                    <span className="text-sm">{iceBreaker.text}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Chip size="sm" variant="dot" color={
                        iceBreaker.type === "flirty" ? "danger" :
                        iceBreaker.type === "intimate" ? "secondary" :
                        iceBreaker.type === "playful" ? "warning" :
                        iceBreaker.type === "compliment" ? "success" :
                        "primary"
                      }>
                        {iceBreaker.type}
                      </Chip>
                      <span className="text-xs text-default-400">{iceBreaker.mood}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <CardFooter className="px-6 py-4">
          <div className="flex flex-col gap-3 w-full">
            {/* Ice Breaker Toggle Button */}
            {!showIceBreakers && messages.length > 0 && (
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="flat"
                  onClick={handleGenerateIceBreakers}
                  disabled={isGeneratingIceBreakers || (credits?.credits || 0) < 1}
                  isLoading={isGeneratingIceBreakers}
                  className="text-xs"
                >
                  💡 Get conversation ideas {(credits?.credits || 0) < 1 ? "(1 credit needed)" : "(1 credit)"}
                </Button>
              </div>
            )}

            {/* Message Input */}
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
          </div>
        </CardFooter>
      </Card>

      {/* Personality traits preview */}
      {userProfile?.personalityTraits && (
        <div className="mt-4 p-4 bg-default-50 rounded-lg">
          <p className="text-xs font-semibold mb-2">Aria's Current Mood</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(userProfile.personalityTraits)
              .filter(([_, value]) => typeof value === 'number' && value > 0.7)
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
