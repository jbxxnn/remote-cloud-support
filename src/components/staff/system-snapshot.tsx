"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  Database, 
  FileText, 
  Users,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "../ui/button";

interface SystemSnapshotProps {
  activeAlerts?: number;
  openSOPs?: number;
  staffOnline?: number;
}

export function SystemSnapshot({ 
  activeAlerts = 0, 
  openSOPs = 0, 
  staffOnline = 1 
}: SystemSnapshotProps) {
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline" | "warning">("online");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      if (navigator.onLine) {
        setConnectionStatus("online");
      } else {
        setConnectionStatus("offline");
      }
    };

    checkConnection();
    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);

    return () => {
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setLastRefresh(new Date());
    // Trigger a page refresh or data refetch
    setTimeout(() => {
      setRefreshing(false);
      window.location.reload();
    }, 500);
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case "online":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      {/* Connectivity Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Connectivity</CardTitle>
            <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            {connectionStatus === "online" ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm capitalize">{connectionStatus}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {connectionStatus === "online" 
              ? "All systems connected" 
              : "Connection issues detected"}
          </p>
        </CardContent>
      </Card>

      {/* Documentation Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Open SOPs</span>
            </div>
            <Badge variant={openSOPs > 0 ? "secondary" : "default"}>
              {openSOPs}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {openSOPs === 0 
              ? "All documentation up to date" 
              : `${openSOPs} SOP${openSOPs !== 1 ? 's' : ''} require attention`}
          </p>
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm">Active Alerts</span>
              </div>
              <Badge variant={activeAlerts > 0 ? "destructive" : "default"}>
                {activeAlerts}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Staff Online</span>
              </div>
              <Badge variant="secondary">{staffOnline}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Database</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-muted-foreground">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">API</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-muted-foreground">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last Refresh</span>
              <span className="text-muted-foreground">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


