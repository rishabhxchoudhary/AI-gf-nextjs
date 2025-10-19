import React from "react"
import { Avatar, Chip, Button } from "@nextui-org/react"
import { Bot, User, Clock, Heart, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageProps {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
  isTyping?: boolean
  onCopy?: () => void
  onLike?: () => void
  onDislike?: () => void
}

export function ChatMessage({ 
  role, 
  content, 
  timestamp, 
  isTyping = false,
  onCopy,
  onLike,
  onDislike 
}: MessageProps) {
  const isUser = role === "user"
  const isSystem = role === "system"

  return (
    <div className={cn(
      "flex gap-3 group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar for non-user messages */}
      {!isUser && (
        <div className="flex-shrink-0">
          {isSystem ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
          ) : (
            <div className="relative">
              <Avatar
                src="/avatar.webp"
                size="sm"
                className="ring-2 ring-pink-200"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "max-w-[75%] flex flex-col",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Message Bubble */}
        <div className={cn(
          "relative px-4 py-3 rounded-2xl shadow-sm",
          isUser 
            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            : isSystem
            ? "bg-amber-50 border border-amber-200 text-amber-800"
            : "bg-white border border-gray-200 text-gray-800"
        )}>
          {/* Typing Indicator */}
          {isTyping && !isUser && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-gray-500">Aria is typing</span>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1 h-1 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1 h-1 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Message Text */}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {content}
          </p>

          {/* Message Tail */}
          <div className={cn(
            "absolute top-3 w-3 h-3 transform rotate-45",
            isUser 
              ? "-right-1 bg-gradient-to-r from-pink-500 to-purple-600"
              : isSystem
              ? "-left-1 bg-amber-50 border-l border-b border-amber-200"
              : "-left-1 bg-white border-l border-b border-gray-200"
          )} />
        </div>

        {/* Message Meta Information */}
        <div className={cn(
          "flex items-center gap-2 mt-1 px-2",
          isUser ? "justify-end" : "justify-start"
        )}>
          {/* Timestamp */}
          {timestamp && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={10} />
              {new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          )}

          {/* Action Buttons for AI messages */}
          {!isUser && !isSystem && !isTyping && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onCopy && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="h-6 w-6 min-w-0"
                  onClick={onCopy}
                >
                  <Copy size={12} />
                </Button>
              )}
              {onLike && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="h-6 w-6 min-w-0 text-green-600 hover:text-green-700"
                  onClick={onLike}
                >
                  <ThumbsUp size={12} />
                </Button>
              )}
              {onDislike && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="h-6 w-6 min-w-0 text-red-600 hover:text-red-700"
                  onClick={onDislike}
                >
                  <ThumbsDown size={12} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Avatar for user messages */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0">
        <Avatar
          src="/avatar.webp"
          size="sm"
          className="ring-2 ring-pink-200"
        />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Aria is thinking</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface IceBreakerProps {
  text: string
  type: string
  mood: string
  onClick: () => void
  disabled?: boolean
}

export function IceBreakerCard({ text, type, mood, onClick, disabled }: IceBreakerProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "flirty": return "danger"
      case "intimate": return "secondary"
      case "playful": return "warning"
      case "compliment": return "success"
      default: return "primary"
    }
  }

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "flirty": return "😘"
      case "intimate": return "💕"
      case "playful": return "😄"
      case "compliment": return "🌟"
      default: return "💭"
    }
  }

  return (
    <Button
      variant="flat"
      className="justify-start text-left h-auto py-3 px-4 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 border border-pink-200 hover:border-pink-300 transition-all duration-200"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex flex-col items-start w-full gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeEmoji(type)}</span>
          <span className="text-sm font-medium">{text}</span>
        </div>
        <div className="flex items-center gap-2">
          <Chip 
            size="sm" 
            variant="dot" 
            color={getTypeColor(type)}
            className="text-xs"
          >
            {type}
          </Chip>
          <span className="text-xs text-gray-500 capitalize">{mood}</span>
        </div>
      </div>
    </Button>
  )
}