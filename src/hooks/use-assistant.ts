"use client";

import { useState, useEffect, useCallback } from "react";
import { contextService } from "@/lib/assistant/context-service";
import { AssistantContext, AssistantContextPayload } from "@/lib/assistant/types";
import { detectContext } from "@/lib/assistant/context-detector";
import { 
  generateNotesHelpResponse, 
  getContextualGuidance,
  generateAlertSummary,
  generateSOPSummary,
  detectMissingInformation
} from "@/lib/assistant/static-guidance";

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
        // Use async setContext to fetch related data
        contextService.setContext({
          role: detected.role || 'staff',
          module: detected.module,
          client_id: detected.client_id,
          alert_id: detected.alert_id,
          sop_id: detected.sop_id,
          sop_response_id: detected.sop_response_id,
          userRole: detected.userRole || detected.role || 'staff',
        }).then(() => {
          setContext(contextService.getContext());
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

  const sendMessage = useCallback(async (content: string, stepNumber?: number, stepAction?: string) => {
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

    // Get context payload
    const contextPayload: AssistantContextPayload | null = context ? {
      ...context,
      userRole: context.userRole || context.role || 'staff',
      timestamp: new Date().toISOString(),
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    } : null;

    const lowerContent = content.toLowerCase();
    let response = TRAINING_MODE_RESPONSE;

    if (contextPayload) {
      // Check for summary requests
      if (lowerContent.includes('summarize') || lowerContent.includes('summary')) {
        if (lowerContent.includes('alert') || contextPayload.context?.alert) {
          response = await generateAlertSummary(contextPayload);
        } else if (lowerContent.includes('sop') || contextPayload.context?.sopResponse) {
          response = generateSOPSummary(contextPayload);
        } else {
          response = "I can summarize alerts or SOP responses. Please specify which one, or navigate to an alert/SOP to get a summary.";
        }
      }
      // Check for missing information requests
      else if (lowerContent.includes('missing') || lowerContent.includes('what\'s missing') || lowerContent.includes('what is missing')) {
        response = detectMissingInformation(contextPayload);
      }
      // Check for contextual guidance requests
      else if (lowerContent.includes('help') || lowerContent.includes('what should i do') || lowerContent.includes('next step') || lowerContent.includes('guidance')) {
        response = await getContextualGuidance(contextPayload, content);
        if (response === `I'm here to help! Based on your current context, I can:\n\n`) {
          // Fallback to notes help if no specific context guidance
          const isNotesQuery = lowerContent.includes('note') || 
                              lowerContent.includes('write') || 
                              lowerContent.includes('how to write');
          if (isNotesQuery) {
            response = generateNotesHelpResponse(content, contextPayload, stepNumber, stepAction);
          } else {
            response += "• Get help with writing notes\n";
            response += "• Summarize alerts or SOP responses\n";
            response += "• Check for missing information\n";
            response += "• Get contextual guidance based on your current page\n\n";
            response += "Try asking: 'What should I do?', 'Summarize this alert', or 'What's missing?'";
          }
        }
      }
      // Check for notes-related queries
      else if (lowerContent.includes('note') || 
               lowerContent.includes('write') || 
               lowerContent.includes('what should i write') ||
               lowerContent.includes('how to write')) {
        response = generateNotesHelpResponse(content, contextPayload, stepNumber, stepAction);
      }
      // Try contextual guidance as fallback
      else {
        const contextualResponse = await getContextualGuidance(contextPayload, content);
        if (contextualResponse && contextualResponse !== `I'm here to help! Based on your current context, I can:\n\n`) {
          response = contextualResponse;
        }
      }
    }

    const assistantMessage: AssistantMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  }, [context]);

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

