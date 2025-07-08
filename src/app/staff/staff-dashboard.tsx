"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  };
  deviceCount: number;
  isActive: boolean;
}

interface Event {
  id: string;
  clientId: string;
  clientName: string;
  type: 'detection' | 'scheduled' | 'manual';
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'resolved';
  timestamp: string;
  assignedTo?: string;
  description: string;
}

interface StaffDashboardProps {
  user: any;
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'my-queue' | 'new-events'>('all');

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

      // Fetch events based on current filter
      const eventsResponse = await fetch(`/api/staff/events?filter=${activeFilter}`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
      } else {
        console.warn('Failed to fetch events, continuing with clients only');
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

  const handleEventAction = async (eventId: string, action: 'claim' | 'resolve' | 'call') => {
    try {
      const response = await fetch(`/api/staff/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to perform event action:', error);
    }
  };

  // Calculate stats for sidebar based on real client data
  const stats = {
    pendingEvents: loading ? 0 : clients.filter(c => c.status === 'alert').length,
    myQueue: loading ? 0 : events.filter(e => e.status === 'assigned' && e.assignedTo === 'current-user').length,
    resolvedToday: loading ? 0 : events.filter(e => e.status === 'resolved' && 
      new Date(e.timestamp).toDateString() === new Date().toDateString()).length
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
                  Monitor client events and respond to alerts
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

      {/* Stats Cards */}
      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            ) : (
              <>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              {clients.filter(c => c.isActive).length} active
            </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            ) : (
              <>
            <div className="text-2xl font-bold text-red-600">
              {events.filter(e => e.status === 'pending' && e.severity === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {events.filter(e => e.status === 'pending').length} total pending
            </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            ) : (
              <>
            <div className="text-2xl font-bold">
              {events.filter(e => e.status === 'assigned' && e.assignedTo === 'current-user').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Assigned to me
            </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            ) : (
              <>
            <div className="text-2xl font-bold text-green-600">
              {events.filter(e => e.status === 'resolved' && 
                new Date(e.timestamp).toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Events resolved
            </p>
              </>
            )}
          </CardContent>
        </Card>
      </div> */}

      {/* Main Content */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Client Status</TabsTrigger>
          <TabsTrigger value="events">Event Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          {/* Client Status View */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Client Status Overview</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">
                    {clients.filter(c => c.status === 'online').length} Online
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium">
                    {clients.filter(c => c.status === 'scheduled').length} Scheduled
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium">
                    {clients.filter(c => c.status === 'alert').length} Alerts
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Devices</th>
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
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`}></div>
                        <div>
                              <div className="font-medium">{client.name}</div>
                          {client.company && (
                                <div className="text-sm text-muted-foreground">{client.company}</div>
                          )}
                        </div>
                      </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`}></div>
                            <span className="text-sm font-medium capitalize">{client.status}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{client.deviceCount}</span>
                      </div>
                        </td>
                        <td className="p-4">
                          {client.lastEvent ? (
                            <div>
                              <div className="font-medium text-sm">{formatEventType(client.lastEvent.type)}</div>
                              {client.lastEvent.message && (
                                <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                                  {client.lastEvent.message}
                                </div>
                              )}
                              <Badge 
                                variant="outline" 
                                className={`text-xs mt-1 ${
                                  client.lastEvent.severity === 'high' ? 'border-red-200 text-red-700' :
                                  client.lastEvent.severity === 'medium' ? 'border-yellow-200 text-yellow-700' :
                                  'border-green-200 text-green-700'
                                }`}
                              >
                                {client.lastEvent.severity}
                              </Badge>
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
                            {client.status === 'alert' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to client dashboard with alert focus
                                  window.location.href = `/staff/client/${client.id}?alert=true`;
                                }}
                                title={client.lastEvent?.message || 'View alert details'}
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Alert
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
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {/* Event Queue View */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Event Queue</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('all')}
              >
                All Events
              </Button>
              <Button
                variant={activeFilter === 'my-queue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('my-queue')}
              >
                My Queue
              </Button>
              <Button
                variant={activeFilter === 'new-events' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('new-events')}
              >
                New Events
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-3 h-3 rounded-full bg-muted"></div>
                          <div>
                            <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                            <div className="h-3 bg-muted rounded w-48 mb-1"></div>
                            <div className="h-3 bg-muted rounded w-24"></div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-5 bg-muted rounded w-12"></div>
                          <div className="h-5 bg-muted rounded w-16"></div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
            {events.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(event.type === 'detection' ? 'alert' : 'scheduled')}`}></div>
                      <div>
                        <h3 className="font-medium">{event.clientName}</h3>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                      <Badge variant="outline">
                        {event.status}
                      </Badge>
                      {event.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleEventAction(event.id, 'claim')}
                        >
                          Claim
                        </Button>
                      )}
                      {event.status === 'assigned' && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEventAction(event.id, 'call')}
                          >
                            <Phone className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEventAction(event.id, 'resolve')}
                          >
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {events.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No events to display</h3>
                  <p className="text-muted-foreground">
                    {activeFilter === 'all' && 'All clients are currently online and safe.'}
                    {activeFilter === 'my-queue' && 'No events are currently assigned to you.'}
                    {activeFilter === 'new-events' && 'No new events require attention.'}
                  </p>
                </CardContent>
              </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 