import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

interface EmptyStateProps {
  icon?: "check" | "alert" | "info";
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ 
  icon = "info", 
  title, 
  description,
  className = "" 
}: EmptyStateProps) {
  const IconComponent = {
    check: CheckCircle,
    alert: AlertCircle,
    info: Info,
  }[icon];

  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <IconComponent className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground/70">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

