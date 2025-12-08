"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTimelineItem } from "./alert-timeline-item";
import { Loader2, AlertCircle, Search, Download } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  type: string;
  status: string;
  message: string;
  createdAt: string;
  severity?: string;
  detectionType?: string;
  location?: string;
  clipUrl?: string | null;
}

interface AlertEvent {
  id: string;
  alertId: string;
  eventType: string;
  message: string | null;
  metadata: any;
  createdAt: string;
  staffName?: string;
}

interface SOPResponse {
  id: string;
  alertId: string | null;
  sopName: string;
  status: string;
  completedSteps: any[];
  startedAt: string;
  completedAt: string | null;
}

interface AlertTimelineProps {
  clientId: string;
  onAlertClick?: (alertId: string) => void;
}

export function AlertTimeline({ clientId, onAlertClick }: AlertTimelineProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertEvents, setAlertEvents] = useState<Record<string, AlertEvent[]>>({});
  const [sopResponses, setSopResponses] = useState<Record<string, SOPResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchTimelineData();
  }, [clientId, statusFilter, timeRange]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (timeRange !== "all") {
        params.append("timeRange", timeRange);
      }

      // Fetch alerts
      const alertsResponse = await fetch(
        `/api/staff/clients/${clientId}/alerts?${params.toString()}`
      );
      if (!alertsResponse.ok) {
        throw new Error("Failed to fetch alerts");
      }
      let alertsData = await alertsResponse.json();
      
      // Filter by timeRange on client side if needed
      if (timeRange !== "all") {
        const now = new Date();
        let cutoffDate: Date;
        switch (timeRange) {
          case "24h":
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "7d":
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoffDate = new Date(0);
        }
        alertsData = alertsData.filter((alert: Alert) => {
          const alertDate = new Date(alert.createdAt);
          return alertDate >= cutoffDate;
        });
      }
      
      setAlerts(alertsData);

      // Fetch alert events for all alerts
      if (alertsData.length > 0) {
        const alertIds = alertsData.map((a: Alert) => a.id);
        const eventsResponse = await fetch(
          `/api/alerts/events?alertIds=${alertIds.join(",")}`
        );
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          // Group events by alertId
          const eventsByAlert: Record<string, AlertEvent[]> = {};
          eventsData.forEach((event: AlertEvent) => {
            if (!eventsByAlert[event.alertId]) {
              eventsByAlert[event.alertId] = [];
            }
            eventsByAlert[event.alertId].push(event);
          });
          setAlertEvents(eventsByAlert);
        }

        // Fetch SOP responses linked to these alerts
        const sopResponse = await fetch(
          `/api/sop-responses?clientId=${clientId}`
        );
        if (sopResponse.ok) {
          const sopData = await sopResponse.json();
          // Group SOP responses by alertId
          const sopsByAlert: Record<string, SOPResponse[]> = {};
          sopData.forEach((sop: SOPResponse) => {
            if (sop.alertId) {
              if (!sopsByAlert[sop.alertId]) {
                sopsByAlert[sop.alertId] = [];
              }
              sopsByAlert[sop.alertId].push(sop);
            }
          });
          setSopResponses(sopsByAlert);
        }
      }
    } catch (err) {
      console.error("Failed to fetch timeline data:", err);
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-4" />
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No alerts found for this client</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts
            .filter((alert) => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              return (
                alert.message.toLowerCase().includes(query) ||
                alert.type.toLowerCase().includes(query) ||
                alert.detectionType?.toLowerCase().includes(query) ||
                alert.location?.toLowerCase().includes(query)
              );
            })
            .map((alert) => (
              <AlertTimelineItem
                key={alert.id}
                alert={alert}
                alertEvents={alertEvents[alert.id] || []}
                sopResponses={sopResponses[alert.id] || []}
                onViewDetails={onAlertClick}
              />
            ))}
        </div>
      )}
    </div>
  );
}

