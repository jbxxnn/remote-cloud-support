"use client";

import { useState, useEffect } from "react";
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
  Activity,
  Mail,
  Phone,
  MapPin,
  Target,
  TrendingUp
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'online' | 'scheduled' | 'alert';
  lastEvent?: {
    type: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    message?: string;
  };
  deviceCount: number;
  isActive: boolean;
  tags?: Array<{
    id: string;
    tag: string;
    tagType: 'risk' | 'goal' | 'custom';
    color?: string;
  }>;
  timeline?: Array<{
    timestamp: string;
    type: 'alert' | 'event' | 'status_change';
    status: string;
    description: string;
  }>;
}

interface ActiveClientsGridProps {
  clients: Client[];
  loading?: boolean;
  onClientClick?: (client: Client) => void;
}

export function ActiveClientsGrid({ clients, loading, onClientClick }: ActiveClientsGridProps) {
  const [hoveredClient, setHoveredClient] = useState<string | null>(null);
  const [clientTimelines, setClientTimelines] = useState<Record<string, Client['timeline']>>({});
  const [loadingTimelines, setLoadingTimelines] = useState<Set<string>>(new Set());

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

  // Fetch timeline data when client is hovered
  useEffect(() => {
    if (hoveredClient && !clientTimelines[hoveredClient] && !loadingTimelines.has(hoveredClient)) {
      setLoadingTimelines(prev => new Set(prev).add(hoveredClient));
      
      fetch(`/api/staff/clients/${hoveredClient}/timeline`)
        .then(res => res.json())
        .then(data => {
          setClientTimelines(prev => ({
            ...prev,
            [hoveredClient]: data.timeline || []
          }));
        })
        .catch(err => {
          console.error('Failed to fetch timeline:', err);
          // Set empty timeline on error
          setClientTimelines(prev => ({
            ...prev,
            [hoveredClient]: []
          }));
        })
        .finally(() => {
          setLoadingTimelines(prev => {
            const next = new Set(prev);
            next.delete(hoveredClient);
            return next;
          });
        });
    }
  }, [hoveredClient, clientTimelines, loadingTimelines]);

  const getTagColor = (tagType: string) => {
    switch (tagType) {
      case 'risk':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'goal':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const calculateUptime = (timeline: Client['timeline'] = []) => {
    if (!timeline || timeline.length === 0) return 100;
    
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const relevantEvents = timeline.filter(e => new Date(e.timestamp).getTime() > last24Hours);
    
    if (relevantEvents.length === 0) return 100;
    
    // Count online vs offline events
    const onlineEvents = relevantEvents.filter(e => e.status === 'online' || e.type === 'status_change' && e.status !== 'alert').length;
    return Math.round((onlineEvents / relevantEvents.length) * 100);
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

              {/* Client Tags */}
              {client.tags && client.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className={cn("text-xs border", getTagColor(tag.tagType))}
                      style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                    >
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
              )}

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
                <div className="mt-4 pt-4 border-t animate-fade-in space-y-4">
                  {/* Client Profile Details */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client Profile</h4>
                    <div className="space-y-1.5 text-sm">
                      {client.email && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-start space-x-2 text-muted-foreground">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{client.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ISP Goal Tags */}
                  {client.tags && client.tags.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                        <Target className="w-3 h-3 mr-1" />
                        Goals & Tags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {client.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className={cn(
                              "text-xs px-2 py-0.5 border",
                              getTagColor(tag.tagType)
                            )}
                          >
                            {tag.tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Status Timeline
                      </span>
                      <span className="text-muted-foreground">Last 24h</span>
                    </div>
                    {loadingTimelines.has(client.id) ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                    <div className="flex items-center space-x-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                getStatusColor(client.status)
                              )}
                              style={{ 
                                width: `${calculateUptime(clientTimelines[client.id])}%` 
                              }}
                        />
                      </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {calculateUptime(clientTimelines[client.id])}% uptime
                          </span>
                        </div>
                        {clientTimelines[client.id] && clientTimelines[client.id]!.length > 0 && (
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {clientTimelines[client.id]!.slice(0, 3).map((event, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-xs">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                                  event.type === 'alert' ? 'bg-red-500' : 
                                  event.type === 'event' ? 'bg-blue-500' : 
                                  'bg-green-500'
                                )} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-muted-foreground">
                                      {formatTimestamp(event.timestamp)}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {event.type}
                                    </Badge>
                                  </div>
                                  <p className="text-foreground line-clamp-1 mt-0.5">
                                    {event.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {clientTimelines[client.id]!.length > 3 && (
                              <p className="text-xs text-muted-foreground italic">
                                +{clientTimelines[client.id]!.length - 3} more events
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    </div>

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {client.status === 'alert' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
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
                        className="w-full"
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

