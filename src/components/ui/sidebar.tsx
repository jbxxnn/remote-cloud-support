"use client";

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Separator } from "./separator"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { 
  Users, 
  Settings, 
  LogOut, 
  Home,
  Database,
  FileText,
  FileSearch,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { RCELogo } from "@/components/layout/rce-logo"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, user, ...props }, ref) => {
    const pathname = usePathname();
    const [liveStats, setLiveStats] = useState({
      activeClients: 0,
      activeDevices: 0,
      activeSOPs: 0,
      activeStaff: 0,
      pendingAlerts: 0,
      recentLogs: 0
    });

    // Fetch live stats
    useEffect(() => {
      const fetchStats = async () => {
        try {
          const response = await fetch('/api/admin/sidebar-stats');
          if (response.ok) {
            const data = await response.json();
            setLiveStats(data);
          }
        } catch (error) {
          console.error('Failed to fetch admin sidebar stats:', error);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }, []);

    const isActive = (path: string) => {
      if (path === "/admin") {
        return pathname === "/admin";
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
                  badgeVariant === "secondary" && "bg-secondary/80"
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

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <nav className="space-y-1">
            <NavButton
              href="/admin"
              icon={Home}
              label="Dashboard"
              tooltip="Ask SupportSense: Show admin dashboard overview"
            />

            <NavButton
              href="/admin/clients"
              icon={Users}
              label="Clients"
              badge={liveStats.activeClients}
              tooltip="Ask SupportSense: Show all active clients"
            />

            <NavButton
              href="/admin/devices"
              icon={Database}
              label="Devices"
              badge={liveStats.activeDevices}
              tooltip="Ask SupportSense: Show all active devices"
            />

            <NavButton
              href="/admin/sops"
              icon={FileText}
              label="SOPs"
              badge={liveStats.activeSOPs}
              tooltip="Ask SupportSense: Show all active SOPs"
            />

            <NavButton
              href="/admin/staff"
              icon={Users}
              label="Staff"
              badge={liveStats.activeStaff}
              tooltip="Ask SupportSense: Show all active staff members"
            />

            <NavButton
              href="/admin/logs"
              icon={FileSearch}
              label="Logs"
              badge={liveStats.recentLogs}
              badgeVariant={liveStats.recentLogs > 0 ? "secondary" : "default"}
              tooltip="Ask SupportSense: Show recent activity logs"
            />

            {liveStats.pendingAlerts > 0 && (
              <>
                <Separator className="my-3 opacity-50" />
                <NavButton
                  href="/admin#alerts"
                  icon={AlertTriangle}
                  label="Pending Alerts"
                  badge={liveStats.pendingAlerts}
                  badgeVariant="destructive"
                  tooltip="Ask SupportSense: Show pending alerts requiring attention"
                />
              </>
            )}
          </nav>
        </div>

        {/* User Profile */}
        <div className="border-t border-border/50 p-4 bg-muted/20">
          <div className="flex items-center space-x-3">
            <Avatar className="ring-2 ring-border/50">
              <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user?.name?.charAt(0) || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
              asChild
            >
              <Link href="/api/auth/signout">
                <LogOut className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      </TooltipProvider>
    )
  }
)
Sidebar.displayName = "Sidebar"

export { Sidebar } 