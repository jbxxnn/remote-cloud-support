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
  VolumeOffIcon,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { File01Icon, UserMultipleIcon, VolumeMute02Icon, VolumeUpIcon, AlertCircleIcon, Comment01Icon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";

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
          <div className="flex items-center space-x-2 bg-secondary rounded-full px-4 py-1.5">
          <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 text-muted-foreground"/>
            <span className="text-xs text-muted-foreground">Alerts:</span>
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">{activeAlerts}</span>
          </div>
          <div className="flex items-center space-x-2 bg-secondary rounded-full px-4 py-1.5">
          <HugeiconsIcon icon={UserMultipleIcon} className="h-4 w-4 text-muted-foreground"/>
            <span className="text-xs text-muted-foreground">Staff:</span>
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">{staffOnline}</span>
          </div>
          <div className="flex items-center space-x-2 bg-secondary rounded-full px-4 py-1.5">
          <HugeiconsIcon icon={File01Icon} className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">SOPs:</span>
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">{openSOPs}</span>
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
            className="h-8 w-8 p-0 rounded-full"
            title={alertTonesEnabled ? "Disable alert tones" : "Enable alert tones"}
          >
            {alertTonesEnabled ? (
              <HugeiconsIcon icon={VolumeUpIcon} />
            ) : (
              <HugeiconsIcon icon={VolumeMute02Icon} />
            )}
            
          </Button>

          {/* Theme Toggle */}
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 rounded-full"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <HugeiconsIcon icon={Sun03Icon} className="h-4 w-4 text-muted-foreground"/>
            ) : (
              <HugeiconsIcon icon={Moon02Icon} className="h-4 w-4 text-muted-foreground"/>
            )}
          </Button> */}
          <AnimatedThemeToggler />

          {/* SupportSense Assistant Button */}
          {onAssistantClick && (
            <Button
              variant="default"
              size="sm"
              onClick={onAssistantClick}
              className="bg-[var(--rce-green)] text-primary-foreground hover:bg-primary rounded-full text-xs"
            >
              <HugeiconsIcon icon={Comment01Icon} className="h-4 w-4 text-primary-foreground"/>
              Assistant
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

