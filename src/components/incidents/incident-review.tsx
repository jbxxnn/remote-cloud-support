"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  FileText,
  Calendar,
  Loader,
  MessageSquare,
} from "lucide-react";

interface Incident {
  id: string;
  alertId: string;
  clientId: string;
  incidentType: "MUI" | "UI";
  status: "draft" | "review" | "finalized" | "locked";
  draftData: any;
  finalizedData?: any;
  createdBy: string;
  reviewedBy?: string;
  finalizedBy?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  alertMessage?: string;
  clientName?: string;
  createdByName?: string;
  reviewedByName?: string;
  finalizedByName?: string;
}

interface IncidentReviewProps {
  incident: Incident;
  onClose: () => void;
  onStatusChange: (incidentId: string, status: string, comment?: string) => Promise<void>;
}

export function IncidentReview({ incident, onClose, onStatusChange }: IncidentReviewProps) {
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | "finalize" | "lock" | null>(null);

  const draftData = incident.draftData || {};
  const isReviewing = incident.status === "review";
  const isFinalized = incident.status === "finalized" || incident.status === "locked";
  const canReview = !isFinalized && (incident.status === "draft" || isReviewing);

  const handleApprove = async () => {
    if (!reviewComment.trim() && isReviewing) {
      alert("Please provide a review comment");
      return;
    }

    setIsSubmitting(true);
    try {
      await onStatusChange(incident.id, "review", reviewComment);
      setAction("approve");
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!reviewComment.trim()) {
      alert("Please provide a finalization comment");
      return;
    }

    setIsSubmitting(true);
    setAction("finalize");
    try {
      const response = await fetch(`/api/incidents/${incident.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lock: false }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to finalize incident");
      }

      const result = await response.json();
      alert("Incident finalized successfully");
      onClose();
      // Refresh the page or trigger a refresh callback
      window.location.reload();
    } catch (error) {
      console.error("Failed to finalize:", error);
      alert(error instanceof Error ? error.message : "Failed to finalize incident");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLock = async () => {
    if (!window.confirm("Are you sure you want to lock this incident? This action cannot be undone.")) {
      return;
    }

    setIsSubmitting(true);
    setAction("lock");
    try {
      const response = await fetch(`/api/incidents/${incident.id}/finalize`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to lock incident");
      }

      alert("Incident locked successfully");
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Failed to lock:", error);
      alert(error instanceof Error ? error.message : "Failed to lock incident");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reviewComment.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setIsSubmitting(true);
    try {
      await onStatusChange(incident.id, "draft", reviewComment);
      setAction("reject");
    } catch (error) {
      console.error("Failed to reject:", error);
      alert("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      review: "secondary",
      finalized: "default",
      locked: "default",
    };

    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      finalized: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      locked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };

    return (
      <Badge className={colors[status] || ""} variant={variants[status] || "default"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Incident Review</DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(incident.incidentType)}
              {getStatusBadge(incident.status)}
            </div>
          </div>
          <DialogDescription>
            Review incident report #{incident.id.substring(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Incident Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Incident Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Incident Type</Label>
                  <div className="mt-1">
                    <Badge variant={incident.incidentType === "MUI" ? "destructive" : "secondary"}>
                      {incident.incidentType}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(incident.status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Client</Label>
                  <div className="mt-1 font-medium">{draftData.client?.name || incident.clientName || "Unknown"}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Location</Label>
                  <div className="mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{draftData.location || "Not specified"}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Date</Label>
                  <div className="mt-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{draftData.incidentDate || new Date(incident.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Time</Label>
                  <div className="mt-1 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{draftData.incidentTime || new Date(incident.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">{draftData.description || "No description provided"}</div>
            </CardContent>
          </Card>

          {/* Staff Involved */}
          {draftData.staff && draftData.staff.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Staff Involved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {draftData.staff.map((staff: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{staff.name || "Unknown"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions Taken */}
          {draftData.actionsTaken && draftData.actionsTaken.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions Taken</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  {draftData.actionsTaken.map((action: string, index: number) => (
                    <li key={index} className="text-sm">{action}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {draftData.timeline && draftData.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {draftData.timeline.map((event: any, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{event.event}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()} {event.staff ? `• ${event.staff}` : ""}
                        </div>
                        {event.message && (
                          <div className="text-xs text-muted-foreground mt-1">{event.message}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {draftData.aiAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Risk Level</Label>
                  <div className="mt-1">
                    <Badge variant={draftData.aiAnalysis.riskLevel === "high" ? "destructive" : "secondary"}>
                      {draftData.aiAnalysis.riskLevel?.toUpperCase() || "UNKNOWN"}
                    </Badge>
                  </div>
                </div>
                {draftData.aiAnalysis.summary && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Summary</Label>
                    <div className="mt-1 text-sm">{draftData.aiAnalysis.summary}</div>
                  </div>
                )}
                {draftData.aiAnalysis.criticalTags && draftData.aiAnalysis.criticalTags.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Critical Tags</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {draftData.aiAnalysis.criticalTags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Validation Results */}
          {draftData.validationResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Validation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {draftData.validationResults.isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="text-sm">
                      {draftData.validationResults.isValid ? "Valid" : "Invalid"}
                    </span>
                  </div>
                  {draftData.validationResults.errors > 0 && (
                    <Badge variant="destructive">
                      {draftData.validationResults.errors} Error(s)
                    </Badge>
                  )}
                  {draftData.validationResults.warnings > 0 && (
                    <Badge variant="secondary">
                      {draftData.validationResults.warnings} Warning(s)
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Comments */}
          {canReview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Review Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="review-comment">Add Review Comment</Label>
                    <Textarea
                      id="review-comment"
                      placeholder="Enter your review comments, feedback, or concerns..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="flex-1"
                      variant="default"
                    >
                      {isSubmitting && action === "approve" ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {isReviewing ? "Approve Review" : "Send for Review"}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="flex-1"
                      variant="destructive"
                    >
                      {isSubmitting && action === "reject" ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          {isReviewing ? "Reject & Return to Draft" : "Reject"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Finalization Actions */}
          {incident.status === "review" && !isFinalized && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Finalization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="finalize-comment">Finalization Comment</Label>
                    <Textarea
                      id="finalize-comment"
                      placeholder="Enter finalization comments..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleFinalize}
                      disabled={isSubmitting}
                      className="flex-1"
                      variant="default"
                    >
                      {isSubmitting && action === "finalize" ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Finalize Incident
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Finalizing will lock the incident data and generate a checksum for integrity verification.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lock Action */}
          {incident.status === "finalized" && !isFinalized && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Lock Incident
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Locking an incident will prevent all further edits. This action cannot be undone.
                  </p>
                  <Button
                    onClick={handleLock}
                    disabled={isSubmitting}
                    variant="destructive"
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Locking...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Lock Incident
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review History */}
          {incident.reviewedByName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created by:</span>{" "}
                    <span className="font-medium">{incident.createdByName || "Unknown"}</span>{" "}
                    <span className="text-muted-foreground">
                      on {new Date(incident.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {incident.reviewedByName && (
                    <div>
                      <span className="text-muted-foreground">Reviewed by:</span>{" "}
                      <span className="font-medium">{incident.reviewedByName}</span>
                    </div>
                  )}
                  {incident.finalizedByName && (
                    <div>
                      <span className="text-muted-foreground">Finalized by:</span>{" "}
                      <span className="font-medium">{incident.finalizedByName}</span>{" "}
                      {incident.finalizedAt && (
                        <span className="text-muted-foreground">
                          on {new Date(incident.finalizedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

