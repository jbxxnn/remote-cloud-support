"use client";

import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssistantInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function AssistantInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = "Ask SupportSense anything...",
}: AssistantInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading || disabled}
        className={cn(
          "min-h-[60px] max-h-[120px] resize-none",
          "focus:ring-2 focus:ring-[var(--rce-green)]/50"
        )}
        rows={2}
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim() || isLoading || disabled}
        size="icon"
        className={cn(
          "h-[60px] w-[60px] shrink-0",
          "bg-[var(--rce-green)] text-[var(--rce-black)]",
          "hover:bg-[var(--rce-green)]/90",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200"
        )}
        aria-label="Send message"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--rce-black)] border-t-transparent" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}



