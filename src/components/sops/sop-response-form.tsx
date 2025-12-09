"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SOPStepItem } from "./sop-step-item";
import { EvidenceUpload } from "./evidence-upload";
import { SOPValidator } from "@/lib/validation/sop-validator";
import { CheckCircle2, X, Loader2, Save, AlertCircle, Download, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
  const [evidence, setEvidence] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

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
          
          // Fetch evidence
          const evidenceResponse = await fetch(`/api/evidence?sopResponseId=${data.id}`);
          if (evidenceResponse.ok) {
            const evidenceData = await evidenceResponse.json();
            setEvidence(evidenceData);
          }

          // Fetch recommendations
          fetchRecommendations(data.id);
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
          setEvidence([]); // New response has no evidence yet
          
          // Fetch recommendations for new response
          fetchRecommendations(newResponse.id);
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

  // Fetch recommendations
  const fetchRecommendations = async (responseId: string) => {
    try {
      setLoadingRecommendations(true);
      const response = await fetch(`/api/sop-responses/${responseId}/recommendations`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Refresh recommendations when steps are completed
  useEffect(() => {
    if (sopResponse?.id && sopResponse.completedSteps) {
      fetchRecommendations(sopResponse.id);
    }
  }, [sopResponse?.completedSteps?.length]);

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
  const isCompleted = sopResponse.status === "completed";

  // Validate SOP response
  const validationResult = SOPValidator.validateSOPResponse(
    sopSteps,
    sopResponse.completedSteps
  );
  const allStepsCompleted = completedCount === totalSteps && totalSteps > 0;
  const canComplete = allStepsCompleted && validationResult.isValid && !isCompleted;

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

        {/* AI Recommendations */}
        {recommendations && recommendations.recommendations.length > 0 && (
          <div className="border rounded-lg p-4 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">AI Recommendations</h3>
            </div>
            
            {recommendations.urgentActions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Urgent Actions</span>
                </div>
                {recommendations.urgentActions.map((action: any, index: number) => (
                  <div key={index} className="text-sm pl-6">
                    <div className="font-medium">{action.action}</div>
                    <div className="text-muted-foreground text-xs mt-1">{action.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {recommendations.nextStep && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Next Step</div>
                <div className="pl-4 border-l-2 border-primary">
                  <div className="font-medium text-sm">
                    Step {recommendations.nextStep.stepNumber}: {recommendations.nextStep.action}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {recommendations.nextStep.reason}
                  </div>
                </div>
              </div>
            )}

            {recommendations.recommendations.filter((r: any) => r.priority !== 'high').length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Other Recommendations</div>
                <div className="space-y-1">
                  {recommendations.recommendations
                    .filter((r: any) => r.priority !== 'high')
                    .slice(0, 3)
                    .map((rec: any, index: number) => (
                      <div key={index} className="text-sm pl-4">
                        <Badge variant="outline" className="mr-2">
                          {rec.priority}
                        </Badge>
                        <span>{rec.action}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loadingRecommendations && (
          <div className="border rounded-lg p-4 bg-primary/5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading recommendations...</span>
          </div>
        )}

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
                allSteps={sopSteps}
                allCompletedSteps={sopResponse.completedSteps}
              />
            );
          })}
        </div>

        {/* Evidence Upload */}
        {sopResponse && (
          <div className="pt-4 border-t">
            <EvidenceUpload
              sopResponseId={sopResponse.id}
              alertId={alertId}
              existingEvidence={evidence}
              onEvidenceAdded={(newEvidence) => {
                setEvidence([...evidence, newEvidence]);
              }}
              onEvidenceRemoved={(evidenceId) => {
                setEvidence(evidence.filter(e => e.id !== evidenceId));
              }}
            />
          </div>
        )}

        {/* Validation Errors */}
        {!isCompleted && validationResult.errors.length > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                  Validation Errors
                </p>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx}>• {err.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Validation Warnings */}
        {!isCompleted && validationResult.warnings.length > 0 && validationResult.errors.length === 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                  Validation Warnings
                </p>
                <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                  {validationResult.warnings.map((warn, idx) => (
                    <li key={idx}>• {warn.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
              disabled={!canComplete || saving}
              className="flex-1"
              title={!validationResult.isValid ? "Please fix validation errors before completing" : undefined}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {saving ? "Completing..." : "Complete SOP"}
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>This SOP response has been completed</span>
            </div>
            {sopResponse.completedAt && (
              <p className="text-xs text-muted-foreground">
                Completed: {new Date(sopResponse.completedAt).toLocaleString()}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/sop-responses/${sopResponse.id}/export`);
                  if (!response.ok) {
                    throw new Error('Failed to export PDF');
                  }
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sop-response-${sopResponse.id}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Failed to export PDF:', error);
                  setError('Failed to export PDF');
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

