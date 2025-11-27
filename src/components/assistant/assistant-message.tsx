"use client";

import { AssistantMessage } from "@/hooks/use-assistant";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface AssistantMessageProps {
  message: AssistantMessage;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssistantMessageComponent({ message }: AssistantMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-[var(--rce-green)] text-[var(--rce-black)]"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser && "items-end"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            isUser
              ? "bg-[var(--rce-green)]/20 text-foreground border border-[var(--rce-green)]/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

