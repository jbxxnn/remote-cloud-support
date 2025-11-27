"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { componentAnimations } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  ArrowRight,
  Activity
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: 'online' | 'scheduled' | 'alert';
  lastEvent?: {
    type: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    message?: string;
  };
  deviceCount: number;
  isActive: boolean;
}

interface ActiveClientsGridProps {
  clients: Client[];
  loading?: boolean;
  onClientClick?: (client: Client) => void;
}

export function ActiveClientsGrid({ clients, loading, onClientClick }: ActiveClientsGridProps) {
  const [hoveredClient, setHoveredClient] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'scheduled':
        return 'bg-yellow-500';
      case 'alert':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4" />;
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon="check"
        title="All clients stable"
        description="No active clients to display"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {clients.map((client) => {
        const isHovered = hoveredClient === client.id;
        const showExpanded = isHovered;

        return (
          <Card
            key={client.id}
            className={cn(
              "cursor-pointer",
              componentAnimations.clientTile,
              isHovered && "shadow-lg border-primary/50 scale-[1.02]",
              !isHovered && "hover:shadow-md"
            )}
            onMouseEnter={() => setHoveredClient(client.id)}
            onMouseLeave={() => setHoveredClient(null)}
            onClick={() => onClientClick?.(client)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate">{client.name}</h3>
                  {client.company && (
                    <p className="text-sm text-muted-foreground truncate">{client.company}</p>
                  )}
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)} flex-shrink-0 ml-2`} />
              </div>

              <div className="flex items-center space-x-2 mb-4">
                {getStatusIcon(client.status)}
                <Badge 
                  variant={client.status === 'alert' ? 'destructive' : client.status === 'scheduled' ? 'secondary' : 'default'}
                  className="text-xs"
                >
                  {client.status === 'alert' ? 'Alert' : client.status === 'scheduled' ? 'Scheduled' : 'Online'}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {client.deviceCount} device{client.deviceCount !== 1 ? 's' : ''}
                </span>
              </div>

              {client.lastEvent && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(client.lastEvent.timestamp)}
                    </span>
                  </div>
                  {client.lastEvent.message && (
                    <p className="text-sm text-foreground line-clamp-2">{client.lastEvent.message}</p>
                  )}
                </div>
              )}

              {/* Expanded content on hover */}
              {showExpanded && (
                <div className="mt-4 pt-4 border-t animate-fade-in">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Status Timeline</span>
                      <span className="text-muted-foreground">Last 24h</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getStatusColor(client.status)}`}
                          style={{ width: '75%' }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">75% uptime</span>
                    </div>
                    {client.status === 'alert' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClientClick?.(client);
                        }}
                      >
                        Acknowledge Alert
                      </Button>
                    )}
                    {client.status !== 'alert' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClientClick?.(client);
                        }}
                      >
                        View Details <ArrowRight className="w-3 h-3 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!showExpanded && (
                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClientClick?.(client);
                    }}
                  >
                    View <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

