"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, X } from "lucide-react";
import { contextService } from "@/lib/assistant/context-service";
import { cn } from "@/lib/utils";

interface AssistantIconProps {
  module?: string;
  clientId?: string;
  eventId?: string;
  sopId?: string;
  userRole?: 'staff' | 'admin';
  onOpen?: () => void;
  onAssistantClick?: () => void; // Alias for onOpen for backward compatibility
  className?: string;
}

export function AssistantIcon({
  module = "Dashboard",
  clientId,
  eventId,
  sopId,
  userRole = "staff",
  onOpen,
  onAssistantClick,
  className
}: AssistantIconProps) {
  const handleOpen = onOpen || onAssistantClick;
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Set context when component mounts
    contextService.setContext({
      role: userRole,
      module,
      client_id: clientId,
      event_id: eventId,
      sop_id: sopId,
      userRole: userRole,
    });

    return () => {
      // Clear context when component unmounts
      contextService.clearContext();
    };
  }, [module, clientId, eventId, sopId, userRole]);

  const handleClick = () => {
    if (handleOpen) {
      handleOpen();
    } else {
      // Default behavior: log context (will be replaced with drawer opening)
      const context = contextService.getContextPayload();
      console.log("SupportSense Assistant - Context:", context);
      // TODO: Open assistant drawer
    }
  };

  if (!isVisible) return null;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-300",
          isHovered && "scale-110",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full shadow-lg",
                "bg-[var(--rce-green)] hover:bg-[var(--rce-green)]/90",
                "text-[var(--rce-black)]",
                "transition-all duration-300",
                "hover:shadow-xl hover:scale-110",
                "animate-pulse-slow"
              )}
              onClick={handleClick}
              aria-label="Open SupportSense Assistant"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="text-sm">
              <p className="font-semibold mb-1">Ask SupportSense</p>
              <p className="text-xs text-muted-foreground">
                Get help with {module}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Optional: Close button on hover */}
        {isHovered && (
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "absolute -top-2 -right-2 h-6 w-6 rounded-full",
              "bg-background border shadow-md",
              "opacity-0 animate-in fade-in-0 zoom-in-95 duration-200"
            )}
            onClick={() => setIsVisible(false)}
            aria-label="Hide assistant"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

