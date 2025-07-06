import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Separator } from "./separator"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { 
  Users, 
  Shield, 
  BarChart3, 
  Settings, 
  LogOut, 
  Home,
  Activity,
  Database,
  FileText
} from "lucide-react"
import Link from "next/link"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, user, ...props }, ref) => {
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
            <span className="font-semibold text-lg">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-6">
          <nav className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/admin">
                <Home className="w-4 h-4 mr-3" />
                Dashboard
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/admin/clients">
                <Users className="w-4 h-4 mr-3" />
                Clients
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/admin#devices">
                <Database className="w-4 h-4 mr-3" />
                Devices
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/admin/sops">
                <FileText className="w-4 h-4 mr-3" />
                SOPs
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/admin/staff">
                <Users className="w-4 h-4 mr-3" />
                Staff
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/detections">
                <Activity className="w-4 h-4 mr-3" />
                Detections
              </a>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
            >
              <a href="/admin#analytics">
                <BarChart3 className="w-4 h-4 mr-3" />
                Analytics
              </a>
            </Button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="border-t p-4">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
              <AvatarFallback>
                {user?.name?.charAt(0) || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "Admin"}</p>
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
Sidebar.displayName = "Sidebar"

export { Sidebar } 