"use client";

import { useEffect, useRef } from "react";
import { AssistantMessageComponent } from "./assistant-message";
import { AssistantInput } from "./assistant-input";
import { AssistantMessage } from "@/hooks/use-assistant";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Comment01Icon } from "@hugeicons/core-free-icons";

interface AssistantChatProps {
  messages: AssistantMessage[];
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function AssistantChat({ messages, onSend, isLoading }: AssistantChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState
            icon={<HugeiconsIcon icon={Comment01Icon} className="w-8 h-8"/>}
            title="Start a conversation"
            description="Ask SupportSense anything about this page or get help with your tasks."
            variant="minimal"
          />
        ) : (
          <>
            {messages.map((message) => (
              <AssistantMessageComponent key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <AssistantInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}










