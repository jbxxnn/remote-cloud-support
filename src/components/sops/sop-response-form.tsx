"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SOPStepItem } from "./sop-step-item";
import { CheckCircle2, X, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface SOPStep {
  step?: number;
  action?: string;
  details?: string;
  description?: string;
  text?: string;
  content?: string;
}

interface CompletedStep {
  step: number;
  action: string;
  completedAt: string;
  notes?: string | null;
}

interface SOPResponse {
  id: string;
  sopId: string;
  alertId?: string;
  clientId: string;
  staffId: string;
  completedSteps: CompletedStep[];
  notes?: string;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
  sopName?: string;
  sopSteps?: SOPStep[];
}

interface SOPResponseFormProps {
  sopResponseId?: string;
  sopId: string;
  clientId: string;
  alertId?: string;
  staffId: string; // Required - passed from parent
  onClose?: () => void;
  onComplete?: (response: SOPResponse) => void;
}

export function SOPResponseForm({
  sopResponseId,
  sopId,
  clientId,
  alertId,
  staffId,
  onClose,
  onComplete
}: SOPResponseFormProps) {
  const [loading, setLoading] = useState(!!sopResponseId);
  const [saving, setSaving] = useState(false);
  const [sopResponse, setSopResponse] = useState<SOPResponse | null>(null);
  const [sopSteps, setSopSteps] = useState<SOPStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing response or create new one
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        if (sopResponseId) {
          // Fetch existing response
          const response = await fetch(`/api/sop-responses/${sopResponseId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch SOP response");
          }
          const data = await response.json();
          setSopResponse(data);
          setSopSteps(data.sopSteps || []);
        } else {
          // Fetch SOP details
          const sopResponse = await fetch(`/api/sops/${sopId}`);
          if (!sopResponse.ok) {
            throw new Error("Failed to fetch SOP");
          }
          const sopData = await sopResponse.json();
          setSopSteps(sopData.steps || []);

          // Create new SOP response
          const createResponse = await fetch("/api/sop-responses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sopId,
              alertId,
              clientId,
              staffId
            })
          });

          if (!createResponse.ok) {
            throw new Error("Failed to create SOP response");
          }

          const newResponse = await createResponse.json();
          setSopResponse(newResponse);
        }
      } catch (err) {
        console.error("Failed to initialize SOP response:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [sopResponseId, sopId, clientId, alertId]);

  const handleStepComplete = async (stepNumber: number, notes: string) => {
    if (!sopResponse) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/sop-responses/${sopResponse.id}/complete-step`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepNumber,
          notes
        })
      });

      if (!response.ok) {
        throw new Error("Failed to complete step");
      }

      const updated = await response.json();
      setSopResponse(updated);
    } catch (err) {
      console.error("Failed to complete step:", err);
      setError(err instanceof Error ? err.message : "Failed to complete step");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!sopResponse) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/sop-responses/${sopResponse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedSteps: sopResponse.completedSteps,
          status: sopResponse.status
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }

      const updated = await response.json();
      setSopResponse(updated);
    } catch (err) {
      console.error("Failed to save progress:", err);
      setError(err instanceof Error ? err.message : "Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!sopResponse) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/sop-responses/${sopResponse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to complete SOP response");
      }

      const updated = await response.json();
      setSopResponse(updated);
      
      if (onComplete) {
        onComplete(updated);
      }
    } catch (err) {
      console.error("Failed to complete SOP response:", err);
      setError(err instanceof Error ? err.message : "Failed to complete SOP response");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !sopResponse) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error || "Failed to load SOP response"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = sopResponse.completedSteps.length;
  const totalSteps = sopSteps.length;
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  const allStepsCompleted = completedCount === totalSteps && totalSteps > 0;
  const isCompleted = sopResponse.status === "completed";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{sopResponse.sopName || "SOP Response"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isCompleted ? "Completed" : "In Progress"}
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedCount} of {totalSteps} steps completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {sopSteps.map((step, index) => {
            const stepNumber = index + 1;
            const completedStep = sopResponse.completedSteps.find(
              (cs) => cs.step === stepNumber
            );
            const isStepCompleted = !!completedStep;

            return (
              <SOPStepItem
                key={index}
                stepNumber={stepNumber}
                stepData={step}
                isCompleted={isStepCompleted}
                completedStep={completedStep}
                onComplete={handleStepComplete}
                disabled={isCompleted || saving}
                sopId={sopId}
                clientId={clientId}
              />
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        {!isCompleted && (
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleSaveProgress}
              disabled={saving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Progress"}
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!allStepsCompleted || saving}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {saving ? "Completing..." : "Complete SOP"}
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>This SOP response has been completed</span>
            </div>
            {sopResponse.completedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Completed: {new Date(sopResponse.completedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

