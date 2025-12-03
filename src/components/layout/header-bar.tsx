"use client";

import { useState, useEffect, useRef } from "react";
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
import { playAlertSound, NEW_ALERT_EVENT, initAudioContext } from "@/lib/alert-sound";

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
  const previousAlertCountRef = useRef(activeAlerts);

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

  // Listen for new alert events and play sound if enabled
  useEffect(() => {
    const handleNewAlert = (event: Event) => {
      if (alertTonesEnabled) {
        console.log('New alert detected, playing sound...');
        playAlertSound();
      }
    };

    window.addEventListener(NEW_ALERT_EVENT, handleNewAlert as EventListener);

    return () => {
      window.removeEventListener(NEW_ALERT_EVENT, handleNewAlert as EventListener);
    };
  }, [alertTonesEnabled]);

  // Also monitor activeAlerts count changes as a backup
  useEffect(() => {
    if (activeAlerts > previousAlertCountRef.current && alertTonesEnabled && previousAlertCountRef.current > 0) {
      // Only play if count increased (new alert) and we had alerts before (not initial load)
      console.log('Active alerts increased, playing sound...', { previous: previousAlertCountRef.current, current: activeAlerts });
      playAlertSound();
    }
    previousAlertCountRef.current = activeAlerts;
  }, [activeAlerts, alertTonesEnabled]);

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
            onClick={() => {
              const newState = !alertTonesEnabled;
              setAlertTonesEnabled(newState);
              // Initialize audio context on user interaction (required by browsers)
              if (newState) {
                initAudioContext();
                // Play a test sound to ensure audio works
                setTimeout(() => playAlertSound(), 100);
              }
            }}
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

