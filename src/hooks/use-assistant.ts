"use client";

import { useState, useEffect, useCallback } from "react";
import { contextService } from "@/lib/assistant/context-service";
import { AssistantContext } from "@/lib/assistant/types";
import { detectContext } from "@/lib/assistant/context-detector";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const TRAINING_MODE_RESPONSE = "I'm SupportSense. Training mode only. I'm here to help, but I'm still learning. How can I assist you with this page?";

export function useAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<AssistantContext | null>(null);

  // Subscribe to context changes and auto-detect if no context exists
  useEffect(() => {
    const unsubscribe = contextService.subscribe((newContext) => {
      setContext(newContext);
    });

    // Get initial context or auto-detect
    const currentContext = contextService.getContext();
    if (!currentContext) {
      const detected = detectContext();
      if (detected.module) {
        contextService.setContext({
          role: detected.role || 'staff',
          module: detected.module,
          client_id: detected.client_id,
          event_id: detected.event_id,
          sop_id: detected.sop_id,
          userRole: detected.userRole || detected.role || 'staff',
        });
      }
    } else {
      setContext(currentContext);
    }

    return unsubscribe;
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Training mode: return static response
    const assistantMessage: AssistantMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: TRAINING_MODE_RESPONSE,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isOpen,
    open,
    close,
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    context,
  };
}

