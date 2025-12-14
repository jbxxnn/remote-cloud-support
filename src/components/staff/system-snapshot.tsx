"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  FileText, 
  Users,
  RefreshCw,
  AlertCircle,
  Shield,
  Clock
} from "lucide-react";
import { Button } from "../ui/button";

interface SystemSnapshotProps {
  activeAlerts?: number;
  openSOPs?: number;
  staffOnline?: number;
  onRefresh?: () => void;
}

export function SystemSnapshot({ 
  activeAlerts = 0, 
  openSOPs = 0, 
  staffOnline = 1,
  onRefresh
}: SystemSnapshotProps) {
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline" | "warning">("online");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Check connection status
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    // Set up auto-refresh interval
    const refreshInterval = setInterval(() => {
      setLastRefresh(new Date());
      
      // Trigger parent refresh if callback provided
      if (onRefresh) {
        onRefresh();
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [onRefresh]);

  const handleRefresh = () => {
    setRefreshing(true);
    setLastRefresh(new Date());
    
    // Trigger parent refresh if callback provided
    if (onRefresh) {
      onRefresh();
    }
    
    // Small delay for visual feedback
    setTimeout(() => {
      setRefreshing(false);
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
      <Card className="">
        <CardHeader className="p-2 bg-secondary px-4 mb-4" style={{borderTopRightRadius: '10px', borderTopLeftRadius: '10px'}}>
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
      <CardHeader className="p-2 bg-secondary px-4 mb-4" style={{borderTopRightRadius: '10px', borderTopLeftRadius: '10px'}}>
      <CardTitle className="text-sm font-medium">Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Open SOPs</span>
            </div>
            <Badge variant={openSOPs > 0 ? "secondary" : "default"} className="ml-auto text-xs w-2 h-auto flex items-center justify-center">
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
      <CardHeader className="p-2 bg-secondary px-4 mb-4" style={{borderTopRightRadius: '10px', borderTopLeftRadius: '10px'}}>
      <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm">Active Alerts</span>
              </div>
              <Badge variant={activeAlerts > 0 ? "destructive" : "default"} className="ml-auto text-xs w-2 h-auto flex items-center justify-center">
                {activeAlerts}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Staff Online</span>
              </div>
              <Badge variant="default" className="ml-auto text-xs w-2 h-auto flex items-center justify-center">{staffOnline}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validators (Placeholder) */}
      <Card>
      <CardHeader className="p-2 bg-secondary px-4 mb-4" style={{borderTopRightRadius: '10px', borderTopLeftRadius: '10px'}}>
      <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Validators</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Compliance</span>
              <Badge variant="outline" className="text-[10px]">
                Coming Soon
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Record Validation</span>
              <Badge variant="outline" className="text-[10px]">
                Coming Soon
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Validator framework will be available in Stage 4
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
      <CardHeader className="p-2 bg-secondary px-4 mb-4" style={{borderTopRightRadius: '10px', borderTopLeftRadius: '10px'}}>
      <CardTitle className="text-sm font-medium">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Last Refresh
              </span>
              <span className="text-muted-foreground text-[10px]">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">Auto-refresh</span>
              <Badge variant="outline" className="text-[10px]">
                30s
              </Badge>
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
            {refreshing ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}







