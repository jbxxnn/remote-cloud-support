import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Inbox, 
  Search,
  FileText,
  Users,
  Database,
  Activity,
  MessageSquare,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/lib/animations";

interface EmptyStateProps {
  icon?: "check" | "alert" | "info" | "inbox" | "search" | "file" | "users" | "database" | "activity" | "message" | LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "minimal" | "detailed";
}

const iconMap: Record<string, LucideIcon> = {
  check: CheckCircle,
  alert: AlertCircle,
  info: Info,
  inbox: Inbox,
  search: Search,
  file: FileText,
  users: Users,
  database: Database,
  activity: Activity,
  message: MessageSquare,
};

export function EmptyState({ 
  icon = "info", 
  title, 
  description,
  actionLabel,
  onAction,
  className = "",
  variant = "default"
}: EmptyStateProps) {
  const IconComponent = typeof icon === "string" 
    ? iconMap[icon] || Info
    : icon;

  if (variant === "minimal") {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 text-center", className)}>
        <IconComponent className={cn(
          "w-8 h-8 text-muted-foreground mb-2",
          animations.fadeIn
        )} />
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <Card className={cn("border-dashed bg-muted/30", className)}>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className={cn(
            "rounded-full bg-muted p-4 mb-6",
            animations.scaleIn
          )}>
            <IconComponent className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
          )}
          {actionLabel && onAction && (
            <Button onClick={onAction} variant="outline" className={animations.hoverScale}>
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        animations.fadeIn
      )}>
        <IconComponent className={cn(
          "w-12 h-12 text-muted-foreground mb-4",
          animations.scaleIn
        )} />
        <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
        )}
        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            variant="ghost" 
            size="sm"
            className={cn("mt-4", animations.hoverScale)}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

