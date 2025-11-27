"use client";

import { useState, useEffect } from "react";
import { RCELogo } from "./rce-logo";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Moon,
  Sun,
  Wifi,
  WifiOff,
  AlertCircle,
  Users,
  FileText,
  MessageSquare,
} from "lucide-react";

interface HeaderBarProps {
  module?: string;
  activeAlerts?: number;
  staffOnline?: number;
  openSOPs?: number;
  onAssistantClick?: () => void;
}

export function HeaderBar({
  module = "Dashboard",
  activeAlerts = 0,
  staffOnline = 0,
  openSOPs = 0,
  onAssistantClick,
}: HeaderBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline" | "warning">("online");
  const [alertTonesEnabled, setAlertTonesEnabled] = useState(true);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor connection status
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold">{module}</span>
          </div>
        </div>

        {/* Center: Quick Metrics */}
        <div className="mx-6 flex flex-1 items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Alerts:</span>
            <Badge variant={activeAlerts > 0 ? "destructive" : "secondary"}>
              {activeAlerts}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Staff:</span>
            <Badge variant="secondary">{staffOnline}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">SOPs:</span>
            <Badge variant="secondary">{openSOPs}</Badge>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-4">
          {/* Live Clock */}
          <div className="flex items-center space-x-2 bg-secondary rounded-full px-4 py-1.5">
            <span className="text-xs font-mono font-medium">{formatTime(currentTime)}</span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${getConnectionColor()}`} />
            <span className="text-xs text-muted-foreground capitalize">{connectionStatus}</span>
          </div>

          {/* Alert Tones Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAlertTonesEnabled(!alertTonesEnabled)}
            className="h-8 w-8 p-0"
            title={alertTonesEnabled ? "Disable alert tones" : "Enable alert tones"}
          >
            <MessageSquare className={`h-4 w-4 ${alertTonesEnabled ? "text-[var(--rce-green)]" : "text-muted-foreground"}`} />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* SupportSense Assistant Button */}
          {onAssistantClick && (
            <Button
              variant="default"
              size="sm"
              onClick={onAssistantClick}
              className="bg-[var(--rce-green)] text-[var(--rce-black)] hover:bg-[var(--rce-green)]/90"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Assistant
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

