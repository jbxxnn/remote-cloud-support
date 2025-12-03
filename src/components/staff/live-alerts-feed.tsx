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
  AlertCircle as AlertCircleIcon
} from "lucide-react";

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
}

export function LiveAlertsFeed({ onAlertClick }: LiveAlertsFeedProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const previousAlertsRef = useRef<Set<string>>(new Set());

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/staff/alerts?status=pending,scheduled&limit=20');
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
  }, []);

  const getSeverityColor = (severity?: string, status?: string) => {
    if (status === 'scheduled') return 'bg-yellow-500';
    if (severity === 'high') return 'bg-red-500';
    if (severity === 'medium') return 'bg-orange-500';
    return 'bg-blue-500';
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

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon="check"
        title="All clients stable"
        description="No active alerts at this time"
      />
    );
  }

  return (
    <div className="space-y-3">
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
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  getSeverityColor(alert.severity, alert.status),
                  componentAnimations.statusIndicator
                )} />
                <Badge variant={alert.status === 'scheduled' ? 'secondary' : 'destructive'} className="text-xs">
                  {alert.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {formatTimestamp(alert.sentAt || alert.createdAt)}
                </span>
              </div>
            </div>

            <div className="mb-2">
              <h4 className="font-medium text-sm mb-1 truncate">{alert.clientName}</h4>
              {alert.clientCompany && (
                <p className="text-xs text-muted-foreground truncate">{alert.clientCompany}</p>
              )}
            </div>

            <div className="mb-2">
              <p className="text-sm text-foreground line-clamp-2">{alert.message || formatEventType(alert.type || alert.detectionType || 'alert')}</p>
              {alert.location && (
                <p className="text-xs text-muted-foreground mt-1">📍 {alert.location}</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">{formatEventType(alert.type || alert.detectionType || 'alert')}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAlertClick?.(alert);
                }}
              >
                View <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

