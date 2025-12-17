"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { componentAnimations } from "@/lib/animations";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  AlertCircle as AlertCircleIcon,
  FileText,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

interface Alert {
  id: string;
  type: string;
  status: string;
  message: string;
  createdAt: string;
  sentAt?: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  severity?: string;
  location?: string;
  detectionType?: string;
}

interface LiveAlertsFeedProps {
  onAlertClick?: (alert: Alert) => void;
  onAcknowledge?: (alertId: string, clientId: string) => Promise<void>;
  onResolve?: (alertId: string, clientId: string) => Promise<void>;
  onViewSOP?: (alertId: string, clientId: string) => void;
}

export function LiveAlertsFeed({ onAlertClick, onAcknowledge, onResolve, onViewSOP }: LiveAlertsFeedProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({}); // alertId -> action type
  const previousAlertsRef = useRef<Set<string>>(new Set());

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams();
      params.append('status', 'pending,scheduled');
      params.append('limit', '20');
      if (severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }
      
      const response = await fetch(`/api/staff/alerts?${params.toString()}`);
      if (response.ok) {
        const data: Alert[] = await response.json();

        // Detect new alerts for animation
        const currentAlertIds = new Set(data.map((a) => a.id));
        const newAlertIds = data
          .filter((a) => !previousAlertsRef.current.has(a.id))
          .map((a) => a.id);

        // Dispatch custom event for new alerts (for sound notifications)
        if (newAlertIds.length > 0 && typeof window !== 'undefined') {
          console.log('Dispatching new-alert-detected event', { count: newAlertIds.length, alertIds: newAlertIds });
          window.dispatchEvent(new CustomEvent('new-alert-detected', {
            detail: { count: newAlertIds.length, alertIds: newAlertIds }
          }));
        }

        previousAlertsRef.current = currentAlertIds;
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [severityFilter]);

  const getSeverityColor = (severity?: string, status?: string) => {
    if (status === 'scheduled') return 'bg-yellow-500';
    if (severity === 'high') return 'bg-red-500';
    if (severity === 'medium') return 'bg-yellow-500';
    if (severity === 'low') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getSeverityBadgeColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 text-red-600 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500/30';
    }
  };

  const getSeverityLabel = (severity?: string) => {
    if (!severity) return 'Unknown';
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Handle timezone issues - ensure we're comparing correctly
    const diffInMs = now.getTime() - date.getTime();
    
    // If negative, the date is in the future (timezone issue), show as "Just now"
    if (diffInMs < 0) return 'Just now';
    
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatEventType = (type: string) => {
    const typeMap: Record<string, string> = {
      'fall': 'Fall Detection',
      'motion': 'Motion Detected',
      'door_open': 'Door Opened',
      'alert': 'Alert',
      'scheduled_checkin': 'Scheduled Check-in'
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleQuickAcknowledge = async (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation();
    if (!onAcknowledge) {
      // Navigate to client page if handler not provided
      window.location.href = `/staff/client/${alert.clientId}`;
      return;
    }

    setActionLoading({ ...actionLoading, [alert.id]: 'acknowledge' });
    try {
      await onAcknowledge(alert.id, alert.clientId);
      toast.success("Alert acknowledged");
      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to acknowledge alert");
      console.error("Failed to acknowledge:", error);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[alert.id];
        return next;
      });
    }
  };

  const handleQuickResolve = async (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to resolve this alert?")) {
      return;
    }

    if (!onResolve) {
      // Navigate to client page if handler not provided
      window.location.href = `/staff/client/${alert.clientId}`;
      return;
    }

    setActionLoading({ ...actionLoading, [alert.id]: 'resolve' });
    try {
      await onResolve(alert.id, alert.clientId);
      toast.success("Alert resolved");
      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to resolve alert");
      console.error("Failed to resolve:", error);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[alert.id];
        return next;
      });
    }
  };

  const handleViewSOP = (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation();
    if (onViewSOP) {
      onViewSOP(alert.id, alert.clientId);
    } else {
      // Navigate to client page
      window.location.href = `/staff/client/${alert.clientId}`;
    }
  };

  const handleViewDetails = (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation();
    if (onAlertClick) {
      onAlertClick(alert);
    } else {
      window.location.href = `/staff/client/${alert.clientId}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Severity Filter - Always visible */}
      <div className="flex items-center gap-2">
        <span className="flex-1">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 text-xs" style={{borderRadius: '10px'}}>
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        </span>
        <span className="text-xs text-muted-foreground flex-1 text-right">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty State or Alerts List */}
      {alerts.length === 0 ? (
        <EmptyState
          icon="check"
          title="No alerts found"
          description={severityFilter !== 'all' 
            ? `No ${severityFilter} severity alerts at this time`
            : "No active alerts at this time"}
        />
      ) : (
        <>
          {alerts.map((alert, index) => (
        <Card
          key={alert.id}
          className={cn(
            "cursor-pointer hover:border-primary/50",
            componentAnimations.alertCard,
            index === 0 && "animate-slide-in"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => onAlertClick?.(alert)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 flex-1 min-w-0 flex-wrap gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  getSeverityColor(alert.severity, alert.status),
                  componentAnimations.statusIndicator
                )} />
                <Badge variant={alert.status === 'scheduled' ? 'secondary' : 'destructive'} className="text-xs">
                  {alert.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                </Badge>
                {alert.severity && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs border", getSeverityBadgeColor(alert.severity))}
                  >
                    {getSeverityLabel(alert.severity)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {formatTimestamp(alert.sentAt || alert.createdAt)}
                </span>
              </div>
            </div>

            <div className="mb-2">
              <h4 className="font-medium text-sm mb-1 truncate">{alert.clientName}</h4>
              {/* {alert.clientCompany && (
                <p className="text-xs text-muted-foreground truncate">{alert.clientCompany}</p>
              )} */}
            </div>

            <div className="mb-2">
              <p className="text-xs text-foreground line-clamp-2">{alert.message || formatEventType(alert.type || alert.detectionType || 'alert')}</p>
              {/* {alert.location && (
                <p className="text-xs text-muted-foreground mt-1">📍 {alert.location}</p>
              )} */}
            </div>

            <div className="flex items-center justify-between mt-3">
              {/* <span className="text-xs text-muted-foreground">{formatEventType(alert.type || alert.detectionType || 'alert')}</span> */}
              <div className="flex items-center gap-1">
                {alert.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => handleQuickAcknowledge(e, alert)}
                      disabled={!!actionLoading[alert.id]}
                      style={{borderRadius: '10px'}}
                    >
                      {actionLoading[alert.id] === 'acknowledge' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Acknowlege
                    </Button>
                    {/* <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => handleViewSOP(e, alert)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      SOP
                    </Button> */}
                  </>
                )}
                {alert.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs rounded-full"
                    onClick={(e) => handleQuickResolve(e, alert)}
                    disabled={!!actionLoading[alert.id]}
                  >
                    {actionLoading[alert.id] === 'resolve' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Resolve
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => handleViewDetails(e, alert)}
                  style={{borderRadius: '10px'}}
                >
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          ))}
        </>
      )}
    </div>
  );
}

