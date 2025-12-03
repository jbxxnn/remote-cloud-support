"use client";

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Separator } from "./separator"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { RCELogo } from "@/components/layout/rce-logo"
import { 
  Users, 
  Shield, 
  Settings, 
  LogOut, 
  Home,
  Activity,
  Clock,
  AlertTriangle,
  Phone,
  MessageSquare,
  FileText,
  CheckCircle,
  BookOpen,
  History,
  HelpCircle,
  Video,
  Mail
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { AlertCircleIcon, CallIcon, ChartRadarIcon, Doc01Icon, File01Icon, MessageMultiple01Icon, TransactionHistoryIcon, UserMultipleIcon, Video02Icon, HelpCircleIcon, Clock05Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface StaffSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  stats?: {
    pendingEvents?: number
    myQueue?: number
    resolvedToday?: number
    activeAlerts?: number
    scheduledAlerts?: number
    activeClients?: number
    openSOPs?: number
  }
}

const StaffSidebar = React.forwardRef<HTMLDivElement, StaffSidebarProps>(
  ({ className, user, stats, ...props }, ref) => {
    const pathname = usePathname();
    const [liveStats, setLiveStats] = useState(stats || {
      activeAlerts: 0,
      scheduledAlerts: 0,
      myQueue: 0,
      activeClients: 0,
      openSOPs: 0,
      resolvedToday: 0
    });

    // Fetch live stats
    useEffect(() => {
      const fetchStats = async () => {
        try {
          const response = await fetch('/api/staff/sidebar-stats');
          if (response.ok) {
            const data = await response.json();
            setLiveStats(data);
          }
        } catch (error) {
          console.error('Failed to fetch sidebar stats:', error);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }, []);

    const isActive = (path: string) => {
      if (path === "/staff") {
        return pathname === "/staff";
      }
      return pathname.startsWith(path);
    };

    const NavButton = ({ 
      href, 
      icon: Icon, 
      label, 
      badge, 
      badgeVariant = "default",
      tooltip,
      ...props 
    }: {
      href: string;
      icon: React.ElementType;
      label: string;
      badge?: number;
      badgeVariant?: "default" | "destructive" | "secondary";
      tooltip?: string;
      [key: string]: any;
    }) => {
      const active = isActive(href);
      const button = (
        <Button
          variant={active ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start group relative transition-all duration-200",
            "hover:bg-accent/50 hover:text-accent-foreground",
            active && "bg-secondary/80 text-secondary-foreground shadow-sm",
            "rounded-lg"
          )}
          asChild
          {...props}
        >
          <a href={href} className="flex items-center w-full">
            <div className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full transition-all duration-200",
              active ? "bg-primary opacity-100" : "bg-transparent opacity-0 group-hover:opacity-30"
            )} />
            <Icon className={cn(
              "w-4 h-4 mr-3 transition-all duration-200 flex-shrink-0",
              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              "group-hover:scale-110"
            )} />
            <span className="flex-1 text-left text-sm font-medium">{label}</span>
            {badge !== undefined && badge > 0 && (
              <Badge 
                variant={badgeVariant} 
                className={cn(
                  "ml-auto text-xs min-w-[20px] h-5 flex items-center justify-center px-1.5",
                  badgeVariant === "destructive" && "bg-destructive/90 text-destructive-foreground shadow-sm",
                  badgeVariant === "secondary" && "bg-secondary/80",
                  !active && badgeVariant === "destructive" && "animate-pulse"
                )}
              >
                {badge > 99 ? "99+" : badge}
              </Badge>
            )}
          </a>
        </Button>
      );

      if (tooltip) {
        return (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        );
      }

      return button;
    };

    return (
      <TooltipProvider>
        <div
          ref={ref}
          className={cn(
            "flex h-screen w-64 flex-col bg-background/95 backdrop-blur-sm border-r border-border/50",
            "shadow-sm",
            className
          )}
          {...props}
        >
        {/* Logo/Brand */}
        <div className="flex h-16 items-center px-6 border-b border-border/50 bg-muted/30">
          <div className="flex items-center space-x-3">
            <RCELogo 
              variant="auto"
              showText={false}
              className="flex-shrink-0"
            />
          </div>
        </div>

        {/* Quick Stats */}
        {/* {stats && (
          <div className="px-4 py-4 border-b">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Events</span>
                <Badge variant="destructive" className="text-xs">
                  {stats.pendingEvents || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">My Queue</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.myQueue || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resolved Today</span>
                <Badge variant="default" className="text-xs">
                  {stats.resolvedToday || 0}
                </Badge>
              </div>
            </div>
          </div>
        )} */}

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <nav className="space-y-1">
            {/* Main Section */}
            <NavButton
              href="/staff"
              icon={() => <HugeiconsIcon icon={ChartRadarIcon} className="h-4 w-4 text-muted-foreground"/>}
              label="Dashboard"
              tooltip="Ask SupportSense: Show me the dashboard overview"
            />

            <NavButton
              href="/staff#alerts"
              icon={() => <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 text-muted-foreground"/>}
              label="Active Alerts"
              badge={liveStats.activeAlerts}
              badgeVariant="destructive"
              tooltip="Ask SupportSense: What alerts need attention?"
            />

            <NavButton
              href="/staff#clients"
              icon={() => <HugeiconsIcon icon={UserMultipleIcon} className="h-4 w-4 text-muted-foreground"/>}
              label="Clients"
              badge={liveStats.activeClients}
              tooltip="Ask SupportSense: Show me all active clients"
            />

            <div className="!my-3">
            <Separator className="opacity-50" />
            </div>

            {/* SOP & Documentation Section */}
            <NavButton
              href="/staff#sops"
              icon={() => <HugeiconsIcon icon={File01Icon} className="h-4 w-4 text-muted-foreground"/>}
              label="SOP Responses"
              badge={liveStats.openSOPs}
              badgeVariant={liveStats.openSOPs ? liveStats.openSOPs > 0 ? "secondary" : "default" : "default"}
              tooltip="Ask SupportSense: What SOPs need responses?"
            />

            <NavButton
              href="/staff#documentation"
              icon={() => <HugeiconsIcon icon={Doc01Icon} className="h-4 w-4 text-muted-foreground"/>}
              label="Documentation"
              tooltip="Ask SupportSense: Help me with documentation"
            />

            <div className="!my-3">
              <Separator className="opacity-50" />
            </div>

            {/* Communication Section */}
            <NavButton
              href="/staff#communication"
              icon={() => <HugeiconsIcon icon={MessageMultiple01Icon} className="h-4 w-4 text-muted-foreground"/>}
              label="Communication Center"
              tooltip="Ask SupportSense: Show communication history"
            />

            <NavButton
              href="/staff#calls"
              icon={() => <HugeiconsIcon icon={CallIcon} className="h-4 w-4 text-muted-foreground"/>}
              label="Call History"
              tooltip="Ask SupportSense: Show recent calls"
            />

            <NavButton
              href="/staff#video"
              icon={() => <HugeiconsIcon icon={Video02Icon} />}
              label="Video Sessions"
              tooltip="Ask SupportSense: Show video session history"
            />

            <div className="!my-3">
              <Separator className="opacity-50" />
            </div>

            {/* History & Help Section */}
            <NavButton
              href="/staff#history"
              icon={() => <HugeiconsIcon icon={TransactionHistoryIcon} className="h-4 w-4 text-muted-foreground"/>}
              label="History"
              badge={liveStats.resolvedToday}
              tooltip="Ask SupportSense: Show resolved events today"
            />

            <NavButton
              href="/staff#help"
              icon={() => <HugeiconsIcon icon={HelpCircleIcon} />}
              label="Help & Training"
              tooltip="Ask SupportSense: Help me with training materials"
            />

            <div className="!my-3">
              <Separator className="opacity-50" />
            </div>

            {/* My Queue - Highlighted */}
            <NavButton
              href="/staff#my-queue"
              icon={() => <HugeiconsIcon icon={Clock05Icon} className="h-4 w-4 text-muted-foreground"/>}
              label="My Queue"
              badge={liveStats.myQueue}
              badgeVariant={liveStats.myQueue ? liveStats.myQueue > 0 ? "destructive" : "secondary" : "default"}
              tooltip="Ask SupportSense: What's in my queue?"
            />
          </nav>
        </div>

        {/* User Profile */}
        <div className="border-t border-border/50 p-4 bg-muted/20">
          <div className="flex items-center space-x-3">
            <Avatar className="ring-2 ring-border/50">
              <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user?.name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name || "Staff"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      </TooltipProvider>
    )
  }
)
StaffSidebar.displayName = "StaffSidebar"

export { StaffSidebar } 