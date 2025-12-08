"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistant } from "@/hooks/use-assistant";
import { contextService } from "@/lib/assistant/context-service";

interface CompletedStep {
  step: number;
  action: string;
  completedAt: string;
  notes?: string | null;
}

interface SOPStepItemProps {
  stepNumber: number;
  stepData: any; // Can be string or object
  isCompleted: boolean;
  completedStep?: CompletedStep;
  onComplete: (stepNumber: number, notes: string) => void;
  disabled?: boolean;
  sopId?: string;
  clientId?: string;
}

export function SOPStepItem({
  stepNumber,
  stepData,
  isCompleted,
  completedStep,
  onComplete,
  disabled = false,
  sopId,
  clientId
}: SOPStepItemProps) {
  const [notes, setNotes] = useState(completedStep?.notes || "");
  const [isExpanded, setIsExpanded] = useState(!isCompleted);
  const { open: openAssistant, sendMessage } = useAssistant();

  // Extract step text
  let stepText = "";
  if (typeof stepData === "string") {
    stepText = stepData;
  } else if (typeof stepData === "object" && stepData.action) {
    stepText = stepData.action;
  } else if (typeof stepData === "object") {
    stepText = stepData.step || stepData.description || stepData.text || stepData.content || `Step ${stepNumber}`;
  } else {
    stepText = `Step ${stepNumber}`;
  }

  const handleComplete = () => {
    if (!isCompleted && !disabled) {
      onComplete(stepNumber, notes);
      setIsExpanded(false);
    }
  };

  const handleGetNotesHelp = () => {
    // Set context for the assistant
    if (sopId && clientId) {
      contextService.setContext({
        role: 'staff',
        module: 'SOP Response',
        client_id: clientId,
        sop_id: sopId,
        userRole: 'staff',
      });
    }

    // Open assistant and send notes help query
    openAssistant();
    setTimeout(() => {
      const query = `What should I write in the notes for Step ${stepNumber}: ${stepText}?`;
      sendMessage(query, stepNumber, stepText);
    }, 100);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-all",
      isCompleted ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-card border-border",
      disabled && "opacity-50"
    )}>
      <div className="flex items-start gap-3">
        {/* Step Number & Checkbox */}
        <div className="flex-shrink-0 mt-1">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Step Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {stepNumber}
                </span>
                {isCompleted && (
                  <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900">
                    Completed
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {stepText}
              </p>
              {stepData?.details && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stepData.details}
                </p>
              )}
            </div>
          </div>

          {/* Completion Timestamp */}
          {isCompleted && completedStep?.completedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Clock className="w-3 h-3" />
              <span>Completed: {formatTimestamp(completedStep.completedAt)}</span>
            </div>
          )}

          {/* Notes Section */}
          {isExpanded && (
            <div className="mt-3 space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Notes {isCompleted && completedStep?.notes && "(Completed)"}
                  </label>
                  {!isCompleted && !disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleGetNotesHelp}
                    >
                      <HelpCircle className="w-3 h-3 mr-1" />
                      What should I write?
                    </Button>
                  )}
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for this step..."
                  className="min-h-[80px] text-sm"
                  disabled={isCompleted || disabled}
                />
              </div>

              {!isCompleted && !disabled && (
                <button
                  onClick={handleComplete}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Mark as Complete
                </button>
              )}
            </div>
          )}

          {/* Completed Notes Display */}
          {isCompleted && completedStep?.notes && !isExpanded && (
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <p className="font-medium text-muted-foreground mb-1">Notes:</p>
              <p className="text-foreground">{completedStep.notes}</p>
            </div>
          )}

          {/* Expand/Collapse Button */}
          {isCompleted && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              {isExpanded ? "Collapse" : "View Details"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

