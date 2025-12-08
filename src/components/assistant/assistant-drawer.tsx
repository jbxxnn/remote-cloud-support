"use client";

import { useAssistant } from "@/hooks/use-assistant";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AssistantChat } from "./assistant-chat";
import { Badge } from "@/components/ui/badge";
import { contextService } from "@/lib/assistant/context-service";
import { useEffect, useState } from "react";

interface AssistantDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialMessage?: string;
}

export function AssistantDrawer({ open, onOpenChange, initialMessage }: AssistantDrawerProps) {
  const {
    isOpen: hookIsOpen,
    open: hookOpen,
    close: hookClose,
    messages,
    sendMessage,
    isLoading,
    context,
  } = useAssistant();

  const [currentContext, setCurrentContext] = useState(context);
  const [hasSentInitial, setHasSentInitial] = useState(false);

  // Sync with external open/onOpenChange if provided
  const isOpen = open !== undefined ? open : hookIsOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      if (newOpen) {
        hookOpen();
      } else {
        hookClose();
      }
    }
  };

  // Subscribe to context changes
  useEffect(() => {
    const unsubscribe = contextService.subscribe((newContext) => {
      setCurrentContext(newContext);
    });
    setCurrentContext(contextService.getContext());
    return unsubscribe;
  }, []);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && isOpen && !hasSentInitial && messages.length === 0) {
      setTimeout(() => {
        sendMessage(initialMessage);
        setHasSentInitial(true);
      }, 300);
    }
    // Reset when drawer closes
    if (!isOpen) {
      setHasSentInitial(false);
    }
  }, [initialMessage, isOpen, hasSentInitial, messages.length, sendMessage]);

  const moduleName = currentContext?.module || "Dashboard";
  const role = currentContext?.role || "staff";

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-[90vw] max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold">
                SupportSense Assistant
              </SheetTitle>
              <SheetDescription className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Current module:</span>
                  <Badge variant="secondary" className="font-medium">
                    {moduleName}
                  </Badge>
                  {currentContext?.client_id && (
                    <>
                      <span className="text-sm text-muted-foreground">•</span>
                      <Badge variant="outline" className="text-xs">
                        Client Context
                      </Badge>
                    </>
                  )}
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              Training Mode
            </Badge>
                </div>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <AssistantChat
            messages={messages}
            onSend={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

