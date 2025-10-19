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
  Divider,
  ScrollShadow,
  Textarea,
} from "@nextui-org/react";
import {
  Send,
  Plus,
  Sparkles,
  Heart,
  MessageCircle,
  ArrowLeft,
  Settings,
  MoreHorizontal,
  History,
  RotateCcw
} from "lucide-react";
import type { MessageBurst, IceBreaker } from "@/types/ai-girlfriend";
import { ChatMessage, TypingIndicator, IceBreakerCard } from "@/components/ui/chat-components";
import { ChatPageSkeleton } from "@/components/ui/loading-skeletons";

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
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
    { enabled: false } // Disable automatic loading
  );

  // Redirect if not authenticated
  useEffect(() => {
    setMounted(true);
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
        if (mostRecentSession) {
          setSessionId(mostRecentSession.sessionId);
        }
      } else {
        // Start new session if no existing sessions
        const sessionData = await startSession.mutateAsync();
        setSessionId(sessionData.sessionId);
      }
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  // Start fresh conversation when sessionId changes
  useEffect(() => {
    if (sessionId) {
      // Reset history state for new sessions
      setHistoryLoaded(false);
      
      if (messages.length === 0) {
        // Always start with a fresh welcome message
        setMessages([
          {
            role: "assistant",
            content: "Hey babe! 💕 I've been thinking about you... How are you feeling today?",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
  }, [sessionId]);

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

      // Cast and add missing fields to match IceBreaker type
      const iceBreakerWithPriority: IceBreaker[] = response.iceBreakers.map(ib => ({
        id: ib.id,
        text: ib.text,
        type: ib.type as IceBreaker["type"],
        mood: ib.mood,
        priority: 1 // Default priority
      }));
      setIceBreakers(iceBreakerWithPriority);
      setShowIceBreakers(true);
      
      // Refresh credits after ice breaker generation
      refetchCredits();
    } catch (error: unknown) {
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
      } else if (response.response) {
        const content = typeof response.response === 'string' 
          ? response.response 
          : JSON.stringify(response.response);
          
        setMessages(prev => [...prev, {
          role: "assistant",
          content: content,
          timestamp: new Date().toISOString(),
        }]);
      }

      // Refresh credits
      refetchCredits();
    } catch (error: unknown) {
      console.error("Failed to send ice breaker message:", error);
      
      setMessages(prev => [...prev, {
        role: "system",
        content: error instanceof Error ? error.message : "Failed to send message. Please try again.",
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

      // Handle AI response - simplified logic
      if (response.response && Array.isArray(response.response)) {
        // Use the typing simulation for burst responses
        await simulateTyping(response.response);
      } else if (response.response) {
        // Fallback for any other format - treat as single message
        const content = typeof response.response === 'string' 
          ? response.response 
          : JSON.stringify(response.response);
          
        setMessages(prev => [...prev, {
          role: "assistant",
          content: content,
          timestamp: new Date().toISOString(),
        }]);
      }

      // Refresh credits only
      refetchCredits();
    } catch (error: unknown) {
      console.error("Failed to send message:", error);

      // Show error message
      setMessages(prev => [...prev, {
        role: "system",
        content: error instanceof Error ? error.message : "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleLoadHistory = async () => {
    if (!sessionId || isLoadingHistory || historyLoaded) return;

    setIsLoadingHistory(true);
    try {
      const historyData = await refetchHistory();
      
      if (historyData.data?.messages && historyData.data.messages.length > 0) {
        const historyMessages = historyData.data.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        
        // Replace current messages with history
        setMessages(historyMessages);
        setHistoryLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load conversation history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleClearConversation = () => {
    // Reset to fresh conversation
    setMessages([
      {
        role: "assistant",
        content: "Hey babe! 💕 I've been thinking about you... How are you feeling today?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setHistoryLoaded(false);
    setShowIceBreakers(false);
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

  // Show loading skeleton during hydration and initial load
  if (!mounted || status === "loading" || !session) {
    return <ChatPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-indigo-50/30">
      <div className="container mx-auto max-w-5xl p-4">
        {/* Chat Header */}
        <Card className="mb-4 bg-white/90 backdrop-blur-sm shadow-lg border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              {/* Left side - Aria info */}
              <div className="flex items-center gap-4">
                <Button
                  isIconOnly
                  variant="light"
                  onClick={() => router.push("/")}
                  className="sm:hidden"
                >
                  <ArrowLeft size={20} />
                </Button>
                
                <div className="relative">
                  <Avatar
                    src="/avatar.webp"
                    size="lg"
                    className="ring-4 ring-pink-200"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                </div>
                
                <div>
                  <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    Aria
                    <Heart size={16} className="text-pink-500" />
                  </h1>
                  <div className="flex items-center gap-2">
                    <Chip
                      size="sm"
                      color={getRelationshipColor(userProfile?.relationshipStage)}
                      variant="flat"
                      className="font-medium"
                    >
                      {getRelationshipEmoji(userProfile?.relationshipStage)} {userProfile?.relationshipStage || "new"}
                    </Chip>
                    <span className="text-xs text-gray-500">
                      {userProfile?.interactionCount || 0} conversations
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side - Stats and actions */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Sparkles size={14} className="text-amber-500" />
                      <span className="text-sm font-semibold text-gray-700">
                        {credits?.credits || 0}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Credits</p>
                  </div>
                  
                  <Button
                    onClick={handleLoadHistory}
                    disabled={isLoadingHistory || historyLoaded}
                    isLoading={isLoadingHistory}
                    size="sm"
                    variant="flat"
                    className="text-xs"
                  >
                    {historyLoaded ? "History Loaded" : "Load Previous"}
                  </Button>
                  
                  <Button
                    onClick={handleClearConversation}
                    size="sm"
                    variant="light"
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
                
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                >
                  <MoreHorizontal size={18} />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Chat Container */}
        <Card className="border-0 bg-white/95 shadow-xl backdrop-blur-sm">
          {/* Messages Area */}
          <CardBody className="p-0">
            <div className="flex h-[calc(100vh-300px)] min-h-[400px] max-h-[600px] flex-col">
              <ScrollShadow 
                hideScrollBar
                className="flex-1 overflow-y-auto p-6"
              >
                <div className="space-y-4">
                  {/* History Status Indicator */}
                  {historyLoaded && (
                    <div className="text-center mb-4">
                      <Chip 
                        size="sm" 
                        variant="flat" 
                        color="success"
                        className="text-xs"
                      >
                        📜 Previous conversation loaded
                      </Chip>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <ChatMessage
                      key={`${msg.timestamp || Date.now()}-${index}-${msg.role}`}
                      role={msg.role as "user" | "assistant" | "system"}
                      content={msg.content}
                      timestamp={msg.timestamp}
                      onCopy={() => navigator.clipboard.writeText(msg.content)}
                    />
                  ))}

                  {/* Typing Indicator */}
                  {(isTyping || currentBurst) && (
                    <TypingIndicator />
                  )}

                  <div ref={messagesEndRef} className="h-1" />
                </div>
              </ScrollShadow>
            </div>
          </CardBody>

          <Divider />

          {/* Ice Breakers Section */}
          {showIceBreakers && iceBreakers.length > 0 && (
            <div className="px-6 py-4 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500" />
                  <span className="text-sm font-semibold text-gray-700">Conversation Starters</span>
                </div>
                <Button 
                  size="sm" 
                  variant="light" 
                  onClick={() => setShowIceBreakers(false)}
                  className="text-xs"
                >
                  Hide
                </Button>
              </div>
              <div className="grid gap-2">
                {iceBreakers.map((iceBreaker) => (
                  <IceBreakerCard
                    key={iceBreaker.id}
                    text={iceBreaker.text}
                    type={iceBreaker.type}
                    mood={iceBreaker.mood}
                    onClick={() => handleIceBreakerClick(iceBreaker)}
                    disabled={isTyping || credits?.credits === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <CardFooter className="p-6">
            <div className="flex flex-col gap-3 w-full">
              {/* Ice Breaker Button */}
              {!showIceBreakers && messages.length > 0 && (
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={handleGenerateIceBreakers}
                    disabled={isGeneratingIceBreakers || (credits?.credits || 0) < 1}
                    isLoading={isGeneratingIceBreakers}
                    startContent={<Sparkles size={14} />}
                    className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 hover:from-purple-200 hover:to-pink-200"
                  >
                    Get conversation ideas {(credits?.credits || 0) < 1 ? "(1 credit needed)" : "(1 credit)"}
                  </Button>
                </div>
              )}

              {/* Message Input */}
              <div className="flex items-end gap-3 w-full">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isTyping || credits?.credits === 0}
                  minRows={1}
                  maxRows={4}
                  classNames={{
                    base: "flex-1",
                    input: "text-sm",
                  }}
                />
                <Button
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isTyping || credits?.credits === 0}
                  isLoading={sendMessage.isPending}
                  isIconOnly
                  className="bg-gradient-to-r from-pink-500 to-purple-600 h-12 w-12"
                >
                  <Send size={18} />
                </Button>
              </div>

              {/* Status Messages */}
              {credits?.credits === 0 && (
                <div className="text-center">
                  <p className="text-sm text-danger">
                    You're out of credits! Purchase more to continue chatting.
                  </p>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>

        {/* Personality Traits Preview */}
        {userProfile?.personalityTraits && (
          <Card className="mt-4 bg-gradient-to-r from-pink-50/80 to-purple-50/80 backdrop-blur-sm border-0">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className="text-pink-500" />
                <span className="text-sm font-semibold text-gray-700">Aria's Current Mood</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(userProfile.personalityTraits)
                  .filter(([_, value]) => typeof value === 'number' && value > 0.7)
                  .slice(0, 5)
                  .map(([trait, value]) => (
                    <Chip 
                      key={trait} 
                      size="sm" 
                      variant="flat"
                      className="capitalize"
                    >
                      {trait.replace(/_/g, " ")}
                    </Chip>
                  ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
