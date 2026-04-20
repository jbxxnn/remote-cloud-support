"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronUp,
  CircleHelp,
  ClipboardCheck,
  ListChecks,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistant } from "@/hooks/use-assistant";
import { contextService } from "@/lib/assistant/context-service";
import { SOPValidator } from "@/lib/validation/sop-validator";
import { AlertCircle } from "lucide-react";

interface CompletedStep {
  step: number;
  action: string;
  completedAt: string;
  notes?: string | null;
}

interface SOPStepItemProps {
  stepNumber: number;
  stepData: any;
  isCompleted: boolean;
  completedStep?: CompletedStep;
  onComplete: (stepNumber: number, notes: string) => void;
  disabled?: boolean;
  sopId?: string;
  clientId?: string;
  allSteps?: any[];
  allCompletedSteps?: CompletedStep[];
}

function getStepTitle(stepData: any, stepNumber: number) {
  if (typeof stepData === "string") return stepData;
  if (stepData?.title) return stepData.title;
  if (stepData?.action) return stepData.action;
  if (stepData?.description) return stepData.description;
  if (stepData?.text) return stepData.text;
  if (stepData?.content) return stepData.content;
  return `Step ${stepNumber}`;
}

function getStepInstructions(stepData: any) {
  if (typeof stepData === "string") return "";
  return stepData?.instructions || stepData?.details || stepData?.description || "";
}

function normalizeLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[•*-]\s*/, ""))
    .filter(Boolean);
}

function getChecklistItems(stepData: any) {
  if (Array.isArray(stepData?.checklistItems)) {
    return stepData.checklistItems.filter(Boolean);
  }

  const instructions = getStepInstructions(stepData);
  return instructions ? normalizeLines(instructions) : [];
}

function getTableData(stepData: any) {
  const table = stepData?.table;
  if (
    table &&
    Array.isArray(table.columns) &&
    table.columns.length > 0 &&
    Array.isArray(table.rows)
  ) {
    return {
      columns: table.columns,
      rows: table.rows,
    };
  }

  return null;
}

function LegacyStepContent({ stepData }: { stepData: any }) {
  const instructions = getStepInstructions(stepData);
  const lines = normalizeLines(instructions);

  if (lines.length === 0) return null;

  return (
    <div className="rounded-md border border-border/70 bg-background/40 p-4">
      <div className="flex gap-4">
        <div className="hidden min-h-12 w-16 shrink-0 items-center justify-center border-r border-border/70 text-[var(--rce-green)] sm:flex">
          <ClipboardCheck className="h-8 w-8" />
        </div>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          {lines.map((line, index) => (
            <li key={`${line}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChecklistStepContent({ stepData }: { stepData: any }) {
  const items = getChecklistItems(stepData);

  if (items.length === 0) {
    return <LegacyStepContent stepData={stepData} />;
  }

  return (
    <div className="rounded-md border border-border/70 bg-background/40 p-4">
      <div className="flex gap-4">
        <div className="hidden min-h-12 w-16 shrink-0 items-center justify-center border-r border-border/70 text-[var(--rce-green)] sm:flex">
          <ListChecks className="h-8 w-8" />
        </div>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TableStepContent({ stepData }: { stepData: any }) {
  const table = getTableData(stepData);

  if (!table) {
    return <LegacyStepContent stepData={stepData} />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              {table.columns.map((column: string, index: number) => (
                <th key={`${column}-${index}`} className="border-r border-border/70 px-4 py-3 text-left font-semibold last:border-r-0">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row: string[], rowIndex: number) => (
              <tr key={rowIndex} className="border-t border-border/70">
                {table.columns.map((_: string, columnIndex: number) => (
                  <td key={columnIndex} className="border-r border-border/70 px-4 py-3 text-muted-foreground last:border-r-0">
                    {row?.[columnIndex] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepContent({ stepData }: { stepData: any }) {
  if (stepData?.type === "table") {
    return <TableStepContent stepData={stepData} />;
  }

  if (stepData?.type === "checklist") {
    return <ChecklistStepContent stepData={stepData} />;
  }

  return <LegacyStepContent stepData={stepData} />;
}

export function SOPStepItem({
  stepNumber,
  stepData,
  isCompleted,
  completedStep,
  onComplete,
  disabled = false,
  sopId,
  clientId,
  allSteps = [],
  allCompletedSteps = [],
}: SOPStepItemProps) {
  const [notes, setNotes] = useState(completedStep?.notes || "");
  const { open: openAssistant, sendMessage } = useAssistant();

  const stepTitle = useMemo(() => getStepTitle(stepData, stepNumber), [stepData, stepNumber]);
  const stepType = stepData?.type === "table" ? "table" : stepData?.type === "checklist" ? "checklist" : "step";
  const StepIcon = stepType === "table" ? Table2 : stepType === "checklist" ? ListChecks : ClipboardCheck;

  const validationMessage = allSteps.length > 0 && allCompletedSteps.length > 0
    ? SOPValidator.getStepValidationMessage(
        stepNumber,
        SOPValidator.validateSOPResponse(allSteps, allCompletedSteps)
      )
    : null;

  const handleComplete = () => {
    if (!isCompleted && !disabled) {
      onComplete(stepNumber, notes);
    }
  };

  const handleGetNotesHelp = async () => {
    if (sopId && clientId) {
      await contextService.setContext({
        role: "staff",
        module: "SOP Response",
        client_id: clientId,
        sop_id: sopId,
        userRole: "staff",
      });
    }

    openAssistant();
    setTimeout(() => {
      const query = `What should I write in the notes for Step ${stepNumber}: ${stepTitle}?`;
      sendMessage(query, stepNumber, stepTitle);
    }, 100);
  };

  return (
    <section
      className={cn(
        "rounded-md border border-border/70 bg-card p-5 transition-colors",
        isCompleted && "border-[var(--rce-green)]/40 bg-[var(--rce-green)]/5",
        disabled && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
              isCompleted
                ? "border-[var(--rce-green)] bg-[var(--rce-green)] text-white"
                : "border-[var(--rce-green)] text-[var(--rce-green)]"
            )}
          >
            {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : stepNumber}
          </div>
          <h3 className="truncate text-lg font-semibold">{stepTitle}</h3>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge variant="outline" className="gap-1 border-[var(--rce-green)]/30 bg-[var(--rce-green)]/10 text-[var(--rce-green)] capitalize">
            <StepIcon className="h-3.5 w-3.5" />
            {stepType}
          </Badge>
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-5">
        <StepContent stepData={stepData} />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-muted-foreground">
            Notes
          </label>
          {!isCompleted && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-2 text-xs text-[var(--rce-green)]"
              onClick={handleGetNotesHelp}
            >
              <CircleHelp className="mr-1 h-3.5 w-3.5" />
              What should I write?
            </Button>
          )}
        </div>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add notes for this step..."
          className="min-h-[82px] resize-y text-sm"
          disabled={isCompleted || disabled}
        />
        {validationMessage && (
          <div className="flex items-start gap-1 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{validationMessage}</span>
          </div>
        )}
      </div>

      <label
        className={cn(
          "mt-4 flex w-fit items-center gap-3 text-sm text-muted-foreground",
          !isCompleted && !disabled && "cursor-pointer hover:text-foreground"
        )}
      >
        <input
          type="checkbox"
          checked={isCompleted}
          disabled={isCompleted || disabled}
          onChange={handleComplete}
          className="h-5 w-5 rounded border-border"
        />
        <span>{isCompleted ? "Completed" : "Mark as Complete"}</span>
      </label>
    </section>
  );
}
