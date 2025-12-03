import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, description, icon, trend, className, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn("", className)} {...props} style={{borderRadius: '10px'}}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-4 p-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && (
            <div className="h-4 w-4 text-muted-foreground">
              {icon}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold px-2">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 bg-secondary p-2" style={{borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px'}}>
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                from last month
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
StatsCard.displayName = "StatsCard"

export { StatsCard } 