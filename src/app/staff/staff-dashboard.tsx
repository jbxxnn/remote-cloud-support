"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  Eye,
  AlertCircle
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
    acknowledged?: boolean;
    resolved?: boolean;
    id?: string;
  };
  deviceCount: number;
  isActive: boolean;
  _acknowledging?: boolean;
}

interface StaffDashboardProps {
  user: any;
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates (polling for now, could be WebSocket later)
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch clients with their current status
      const clientsResponse = await fetch('/api/staff/clients');
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData);
      } else {
        throw new Error(`Failed to fetch clients: ${clientsResponse.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatEventType = (type: string) => {
    // Convert API event types to user-friendly names
    const typeMap: Record<string, string> = {
      'fall': 'Fall Detection',
      'motion': 'Motion Detected',
      'door_open': 'Door Opened',
      'alert': 'Alert',
      'resolved_alert': 'Resolved Alert',
      'scheduled_checkin': 'Scheduled Check-in'
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleClientClick = (clientId: string) => {
    // Navigate to client dashboard
    window.location.href = `/staff/client/${clientId}`;
  };

  // Calculate stats for sidebar based on real client data
  const stats = {
    pendingEvents: loading ? 0 : clients.filter(c => c.status === 'alert').length,
    myQueue: 0, // No longer tracking events
    resolvedToday: 0 // No longer tracking events
  };

  // Show error state if there's an error
  if (error && !loading) {
    return (
      <div className="flex h-screen">
        <StaffSidebar user={user} stats={stats} />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Dashboard</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <StaffSidebar 
        user={user}
        stats={stats}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Staff Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Monitor client status and respond to alerts
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="space-y-6 p-6">
            {/* Client Status View */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">Client Status Overview</h2>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Last Event</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Time</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 rounded-full bg-muted animate-pulse"></div>
                              <div>
                                <div className="h-4 bg-muted rounded w-32 mb-1 animate-pulse"></div>
                                <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="h-6 bg-muted rounded w-16 animate-pulse"></div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
                              <div className="h-4 bg-muted rounded w-8 animate-pulse"></div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="h-4 bg-muted rounded w-24 mb-1 animate-pulse"></div>
                              <div className="h-5 bg-muted rounded w-12 animate-pulse"></div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="h-3 bg-muted rounded w-20 mb-1 animate-pulse"></div>
                              <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className="h-8 bg-muted rounded w-12 animate-pulse"></div>
                              <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      clients.map((client, index) => (
                        <tr 
                          key={client.id} 
                          className={`border-t cursor-pointer hover:bg-muted/30 transition-colors ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                          }`}
                          onClick={() => handleClientClick(client.id)}
                        >
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-medium">{client.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`}></div>
                            </div>
                          </td>
                          <td className="p-4">
                            {client.lastEvent ? (
                              <div>
                                {client.lastEvent.message && (
                                  <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                                    {client.lastEvent.message}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No events</span>
                            )}
                          </td>
                          <td className="p-4">
                            {client.lastEvent ? (
                              <div className="text-sm text-muted-foreground">
                                {formatTimestamp(client.lastEvent.timestamp)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {(client.status === 'scheduled' || client.status === 'online') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Navigate to client dashboard
                                    window.location.href = `/staff/client/${client.id}`;
                                  }}
                                >
                                  View
                                </Button>
                              )}
                              {client.status === 'alert' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={client._acknowledging}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    console.log('[STAFF DASHBOARD] Acknowledging alert for client:', client.id);
                                    console.log('[STAFF DASHBOARD] Client status:', client.status);
                                    console.log('[STAFF DASHBOARD] Last event:', client.lastEvent);
                                    
                                    // Optimistic UI update
                                    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, _acknowledging: true } : c));
                                    try {
                                      console.log('[STAFF DASHBOARD] Making PATCH request to:', `/api/staff/clients/${client.id}/alerts`);
                                      const res = await fetch(`/api/staff/clients/${client.id}/alerts`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'acknowledge' })
                                      });
                                      console.log('[STAFF DASHBOARD] Response status:', res.status);
                                      console.log('[STAFF DASHBOARD] Response ok:', res.ok);
                                      
                                      if (res.ok) {
                                        console.log('[STAFF DASHBOARD] Success - navigating to client dashboard');
                                        // Navigate to client dashboard after successful acknowledgment
                                        window.location.href = `/staff/client/${client.id}`;
                                      } else {
                                        console.log('[STAFF DASHBOARD] Error response:', res.status, res.statusText);
                                        const errorData = await res.text();
                                        console.log('[STAFF DASHBOARD] Error data:', errorData);
                                        // handle error
                                        setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, _acknowledging: false } : c));
                                      }
                                    } catch (err) {
                                      console.error('[STAFF DASHBOARD] Fetch error:', err);
                                      setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, _acknowledging: false } : c));
                                    }
                                  }}
                                  title={client.lastEvent?.message || 'Acknowledge and assign this alert to yourself'}
                                >
                                  {client._acknowledging ? (
                                    <>
                                      <span className="animate-pulse">Acknowledging...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Acknowledge
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 