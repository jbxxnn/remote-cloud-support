"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, FileText, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SOPResponse {
  id: string;
  sopId: string;
  alertId: string | null;
  clientId: string;
  staffId: string;
  completedSteps: any[];
  notes: string | null;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  sopName: string;
  clientName: string;
  staffName: string;
}

interface SOPResponsesListProps {
  onResponseClick?: (response: SOPResponse) => void;
}

export function SOPResponsesList({ onResponseClick }: SOPResponsesListProps) {
  const [responses, setResponses] = useState<SOPResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResponses();
  }, [statusFilter]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/sop-responses?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch SOP responses");
      }

      const data = await response.json();
      setResponses(data);
    } catch (err) {
      console.error("Failed to fetch SOP responses:", err);
      setError(err instanceof Error ? err.message : "Failed to load SOP responses");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case "abandoned":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-600">
            <XCircle className="w-3 h-3 mr-1" />
            Abandoned
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProgressPercentage = (response: SOPResponse) => {
    // We need to get the total steps from the SOP, but for now we'll use completedSteps length
    // This is a simplified version - ideally we'd fetch the SOP to get total steps
    const completedCount = response.completedSteps?.length || 0;
    return completedCount; // Return count for now
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading SOP responses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>Error: {error}</p>
        <Button onClick={fetchResponses} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {responses.length} response{responses.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Responses List */}
      {responses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No SOP responses found</p>
            <p className="text-xs mt-2">Start an SOP response from an alert to see it here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {responses.map((response) => (
            <Card
              key={response.id}
              className={cn(
                "hover:border-primary/50 transition-colors cursor-pointer",
                response.status === "in_progress" && "border-yellow-500/30"
              )}
              onClick={() => onResponseClick?.(response)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base truncate">{response.sopName}</h3>
                      {getStatusBadge(response.status)}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>
                          <strong>Client:</strong> {response.clientName}
                        </span>
                        <span>
                          <strong>Staff:</strong> {response.staffName}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span>
                          <strong>Started:</strong>{" "}
                          {new Date(response.startedAt).toLocaleString()}
                        </span>
                        {response.completedAt && (
                          <span>
                            <strong>Completed:</strong>{" "}
                            {new Date(response.completedAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {response.completedSteps && response.completedSteps.length > 0 && (
                        <div>
                          <strong>Progress:</strong> {response.completedSteps.length} step
                          {response.completedSteps.length !== 1 ? "s" : ""} completed
                        </div>
                      )}

                      {response.alertId && (
                        <div>
                          <Link
                            href={`/staff/client/${response.clientId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Alert
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

