"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, User, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertEvent {
  id: string;
  eventType: string;
  message: string | null;
  metadata: any;
  createdAt: string;
  staffName?: string;
}

interface SOPResponse {
  id: string;
  sopName: string;
  status: string;
  completedSteps: any[];
  startedAt: string;
  completedAt: string | null;
}

interface AlertTimelineItemProps {
  alert: {
    id: string;
    type: string;
    status: string;
    message: string;
    createdAt: string;
    severity?: string;
    detectionType?: string;
    location?: string;
    clipUrl?: string | null;
  };
  alertEvents?: AlertEvent[];
  sopResponses?: SOPResponse[];
  onViewDetails?: (alertId: string) => void;
}

export function AlertTimelineItem({
  alert,
  alertEvents = [],
  sopResponses = [],
  onViewDetails,
}: AlertTimelineItemProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return {
          border: "border-red-500/50 border-l-4",
          bg: "bg-red-50 dark:bg-red-950/20",
          badge: "bg-red-500/20 text-red-600 border-red-500/30"
        };
      case "scheduled":
        return {
          border: "border-yellow-500/50 border-l-4",
          bg: "bg-yellow-50 dark:bg-yellow-950/20",
          badge: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
        };
      case "resolved":
        return {
          border: "border-green-500/50 border-l-4",
          bg: "bg-green-50 dark:bg-green-950/20",
          badge: "bg-green-500/20 text-green-600 border-green-500/30"
        };
      default:
        return {
          border: "border-gray-500/50 border-l-4",
          bg: "bg-card",
          badge: "bg-gray-500/20 text-gray-600 border-gray-500/30"
        };
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-600";
      case "medium":
        return "bg-yellow-500/20 text-yellow-600";
      case "low":
        return "bg-green-500/20 text-green-600";
      default:
        return "bg-gray-500/20 text-gray-600";
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case "acknowledged":
        return "✓";
      case "resolved":
        return "✓✓";
      case "escalated":
        return "↑";
      case "notes_added":
        return "📝";
      case "reassigned":
        return "↔";
      default:
        return "•";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const statusColors = getStatusColor(alert.status);
  
  return (
    <Card className={cn("border", statusColors.border, statusColors.bg)}>
      <CardContent className="p-2 px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <h4 className="font-semibold text-sm truncate">{alert.message}</h4>
              {alert.severity && (
                <Badge variant="secondary" className={cn("text-xs", getSeverityColor(alert.severity))}>
                  {alert.severity}
                </Badge>
              )}
              <Badge variant="secondary" className={cn("text-xs", statusColors.badge)}>
                {alert.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(alert.createdAt)}
              </div>
              {alert.detectionType && (
                <span className="capitalize">{alert.detectionType.replace(/_/g, " ")}</span>
              )}
              {alert.location && <span>{alert.location}</span>}
            </div>

            {expanded && (
              <div className="mt-4 space-y-4 pt-4 border-t border-border">
                {/* Alert Events Timeline */}
                {alertEvents.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Activity Timeline
                    </h5>
                    <div className="space-y-2">
                      {alertEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-2 text-xs bg-muted/50 p-2 rounded"
                        >
                          <span className="font-medium w-6 text-center">
                            {getEventTypeIcon(event.eventType)}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium capitalize">
                              {event.eventType.replace(/_/g, " ")}
                            </div>
                            {event.message && (
                              <div className="text-muted-foreground mt-1">{event.message}</div>
                            )}
                            {event.staffName && (
                              <div className="text-muted-foreground text-xs mt-1">
                                by {event.staffName}
                              </div>
                            )}
                            <div className="text-muted-foreground text-xs mt-1">
                              {formatTimestamp(event.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked SOP Responses */}
                {sopResponses.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      SOP Responses
                    </h5>
                    <div className="space-y-2">
                      {sopResponses.map((sop) => (
                        <div
                          key={sop.id}
                          className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded"
                        >
                          <div>
                            <div className="font-medium">{sop.sopName}</div>
                            <div className="text-muted-foreground">
                              {sop.completedSteps?.length || 0} steps completed
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              sop.status === "completed"
                                ? "bg-green-500/20 text-green-600"
                                : sop.status === "in_progress"
                                ? "bg-yellow-500/20 text-yellow-600"
                                : "bg-gray-500/20 text-gray-600"
                            }
                          >
                            {sop.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {alertEvents.length === 0 && sopResponses.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No additional activity recorded
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(alert.id)}
                className="text-xs hover:bg-primary hover:rounded-full hover:text-primary-foreground rounded-full"
              >
                View
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs hover:bg-primary hover:rounded-full hover:text-primary-foreground rounded-full"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

