"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  ArrowLeft,
  Loader,
  AlertTriangle,
  Clock,
  User,
  FileText,
  CheckCircle,
  Copy,
  Download,
} from "lucide-react";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface AlertDetail {
  id: string;
  clientId: string;
  type: string;
  status: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  assignedToName: string | null;
  detectionType: string | null;
  severity: string | null;
  location: string | null;
  clipUrl: string | null;
  confidence: number | null;
  detectionTimestamp: string | null;
  clientName: string;
}

interface AlertEvent {
  id: string;
  eventType: string;
  message: string | null;
  metadata: any;
  createdAt: string;
  staffName: string | null;
}

interface SOPResponse {
  id: string;
  sopName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  completedSteps: any[];
  staffName: string | null;
}

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const alertId = params.id as string;

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [sopResponses, setSopResponses] = useState<SOPResponse[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const fetchAlertDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/alerts/${alertId}/summary`);
      if (!response.ok) {
        throw new Error("Failed to fetch alert details");
      }

      const data = await response.json();
      setAlert(data.alert);
      setEvents(data.events || []);
      setSopResponses(data.sopResponses || []);
      setSummary(data.summary || "");
    } catch (err) {
      console.error("Failed to fetch alert details:", err);
      setError(err instanceof Error ? err.message : "Failed to load alert");
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    if (alertId) {
      fetchAlertDetails();
    }
  }, [alertId, fetchAlertDetails]);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Alert summary copied to clipboard");
  };

  const handleDownloadSummary = () => {
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alert-${alertId}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "scheduled":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "resolved":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30";
    }
  };

  const getSeverityColor = (severity: string | null) => {
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

  if (loading) {
    return (
      <div className="flex h-screen">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <HeaderBar
            module="Loading Alert..."
            activeAlerts={0}
            staffOnline={0}
            openSOPs={0}
            onAssistantClick={() => setAssistantOpen(true)}
          />
          <div className="flex-1 flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="flex h-screen">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <HeaderBar
            module="Alert Error"
            activeAlerts={0}
            staffOnline={0}
            openSOPs={0}
            onAssistantClick={() => setAssistantOpen(true)}
          />
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-96">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Error</h3>
                <p className="text-muted-foreground mb-4">{error || "Alert not found"}</p>
                <Button onClick={() => router.back()}>Go Back</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <HeaderBar
          module={`Alert: ${alert.message.substring(0, 30)}...`}
          activeAlerts={0}
          staffOnline={0}
          openSOPs={0}
          onAssistantClick={() => setAssistantOpen(true)}
        />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/staff/client/${alert.clientId || ""}`}>
                  <Button variant="default" size="sm" className="rounded-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Client
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{alert.message}</h1>
                  <p className="text-sm text-muted-foreground">{alert.clientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn(getStatusColor(alert.status))}>
                  {alert.status}
                </Badge>
                {alert.severity && (
                  <Badge variant="secondary" className={cn(getSeverityColor(alert.severity))}>
                    {alert.severity}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Alert Information */}
                <Card>
                  <CardHeader className="p-2 px-4 bg-secondary mb-4" style={{borderTopLeftRadius: '10px', borderTopRightRadius: '10px'}}>
                    <CardTitle>Alert Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                        <p className="text-sm">{alert.type}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <p className="text-sm capitalize">{alert.status}</p>
                      </div>
                      {alert.detectionType && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Detection Type
                          </label>
                          <p className="text-sm capitalize">{alert.detectionType.replace(/_/g, " ")}</p>
                        </div>
                      )}
                      {alert.location && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Location</label>
                          <p className="text-sm">{alert.location}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Created</label>
                        <p className="text-sm">{new Date(alert.createdAt).toLocaleString()}</p>
                      </div>
                      {alert.assignedToName && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                          <p className="text-sm">{alert.assignedToName}</p>
                        </div>
                      )}
                    </div>
                    {alert.clipUrl && (
                      <div>
                        <Button variant="default" size="sm" asChild className="rounded-full">
                          <a href={alert.clipUrl} target="_blank" rel="noopener noreferrer">
                            View Clip
                          </a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card>
                  <CardHeader className="p-2 px-4 bg-secondary mb-4" style={{borderTopLeftRadius: '10px', borderTopRightRadius: '10px'}}>
                    <CardTitle>Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No activity recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {events.map((event) => (
                          <div key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm capitalize">
                                  {event.eventType.replace(/_/g, " ")}
                                </span>
                                {event.staffName && (
                                  <span className="text-xs text-muted-foreground">by {event.staffName}</span>
                                )}
                              </div>
                              {event.message && (
                                <p className="text-sm text-muted-foreground mt-1">{event.message}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(event.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* SOP Responses */}
                {sopResponses.length > 0 && (
                  <Card>
                    <CardHeader className="p-2 px-4 bg-secondary mb-4" style={{borderTopLeftRadius: '10px', borderTopRightRadius: '10px'}}>
                      <CardTitle>SOP Responses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {sopResponses.map((sop) => (
                          <div key={sop.id} className="p-3 border rounded-sm" style={{borderRadius: '10px'}}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{sop.sopName}</h4>
                              <Badge
                                variant="secondary"
                                className={
                                  sop.status === "completed"
                                    ? "bg-green-500/20 text-green-600"
                                    : "bg-yellow-500/20 text-yellow-600"
                                }
                              >
                                {sop.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Started: {new Date(sop.startedAt).toLocaleString()}</div>
                              {sop.completedAt && (
                                <div>Completed: {new Date(sop.completedAt).toLocaleString()}</div>
                              )}
                              {sop.completedSteps && (
                                <div>
                                  {sop.completedSteps.length} step{sop.completedSteps.length !== 1 ? "s" : ""}{" "}
                                  completed
                                </div>
                              )}
                              {sop.staffName && <div>By: {sop.staffName}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Summary Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="p-2 px-4 bg-secondary mb-4" style={{borderTopLeftRadius: '10px', borderTopRightRadius: '10px'}}>
                    <div className="flex items-center justify-between">
                      <CardTitle>Summary</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCopySummary}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDownloadSummary}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded max-h-96 overflow-auto">
                      {summary || "No summary available"}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>

        <AssistantIcon
          module="Alert Detail"
          userRole="staff"
          drawerOpen={assistantOpen}
          onDrawerOpenChange={setAssistantOpen}
        />

        <AssistantDrawer open={assistantOpen} onOpenChange={setAssistantOpen} />
      </div>
    </div>
  );
}

