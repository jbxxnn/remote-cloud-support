"use client";

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Separator } from "./separator"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import { 
  Users, 
  Shield, 
  BarChart3, 
  Settings, 
  LogOut, 
  Home,
  Activity,
  Clock,
  AlertTriangle,
  Phone,
  MessageSquare,
  FileText,
  CheckCircle
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  }
}

const StaffSidebar = React.forwardRef<HTMLDivElement, StaffSidebarProps>(
  ({ className, user, stats, ...props }, ref) => {
    const pathname = usePathname();

    const isActive = (path: string) => {
      if (path === "/staff") {
        return pathname === "/staff";
      }
      return pathname.startsWith(path);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-screen w-64 flex-col bg-background border-r",
          className
        )}
        {...props}
      >
        {/* Logo/Brand */}
        <div className="flex h-16 items-center px-6 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Staff Portal</span>
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
        <div className="flex-1 px-4 py-6">
          <nav className="space-y-2">
            <Button
              variant={isActive("/staff") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <a href="/staff">
                <Home className="w-4 h-4 mr-3" />
                Dashboard
              </a>
            </Button>
            
            {/* <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/staff?tab=events">
                <AlertTriangle className="w-4 h-4 mr-3" />
                Event Queue
                {stats?.pendingEvents && stats.pendingEvents > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {stats.pendingEvents}
                  </Badge>
                )}
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/staff?tab=clients">
                <Users className="w-4 h-4 mr-3" />
                Client Status
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/staff?tab=my-queue">
                <Clock className="w-4 h-4 mr-3" />
                My Queue
                {stats?.myQueue && stats.myQueue > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {stats.myQueue}
                  </Badge>
                )}
              </a>
            </Button>
             */}
            <Separator className="my-4" />
            
            {/* <Button
              variant={isActive("/staff/calls") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <a href="/staff/calls">
                <Phone className="w-4 h-4 mr-3" />
                Call History
              </a>
            </Button>
            
            <Button
              variant={isActive("/staff/reports") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <a href="/staff/reports">
                <FileText className="w-4 h-4 mr-3" />
                Reports
              </a>
            </Button>
            
            <Button
              variant={isActive("/staff/sops") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <a href="/staff/sops">
                <FileText className="w-4 h-4 mr-3" />
                SOPs
              </a>
            </Button>
            
            <Separator className="my-4" />
            
            <Button
              variant={isActive("/staff/settings") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <a href="/staff/settings">
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </a>
            </Button> */}
          </nav>
        </div>

        {/* User Profile */}
        <div className="border-t p-4">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
              <AvatarFallback>
                {user?.name?.charAt(0) || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "Staff"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <Link href="/api/auth/signout">
                <LogOut className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }
)
StaffSidebar.displayName = "StaffSidebar"

export { StaffSidebar } 