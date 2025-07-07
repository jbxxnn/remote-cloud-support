"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { 
  Phone, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  FileText,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: 'online' | 'scheduled' | 'alert';
  photo?: string;
  emergencyServices?: {
    name: string;
    phone: string;
    address: string;
  };
}

interface Event {
  id: string;
  type: 'detection' | 'scheduled' | 'manual';
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'resolved';
  timestamp: string;
  location: string;
  description: string;
  hasVideo?: boolean;
  videoUrl?: string;
  acknowledged: boolean;
}

interface SOP {
  id: string;
  title: string;
  content: string;
  eventType: string;
}

export default function ClientDashboard() {
  const params = useParams();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [outcome, setOutcome] = useState("");

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      // Fetch client details
      const clientResponse = await fetch(`/api/staff/clients/${clientId}`);
      if (clientResponse.ok) {
        const clientData = await clientResponse.json();
        setClient(clientData);
      }

      // Fetch client events
      const eventsResponse = await fetch(`/api/staff/clients/${clientId}/events`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
        if (eventsData.length > 0) {
          setSelectedEvent(eventsData[0]); // Select first active event
        }
      }

      // Fetch SOPs
      const sopsResponse = await fetch(`/api/staff/clients/${clientId}/sops`);
      if (sopsResponse.ok) {
        const sopsData = await sopsResponse.json();
        setSops(sopsData);
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error);
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

  const handleAcknowledgeEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/staff/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' })
      });
      
      if (response.ok) {
        fetchClientData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to acknowledge event:', error);
    }
  };

  const handleStartCall = async () => {
    try {
      // This would integrate with Google Meet API
      console.log('Starting Google Meet call with client:', clientId);
      // For now, just log the action
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const handleCloseEvent = async () => {
    if (!selectedEvent || !actionNotes.trim()) {
      alert('Please provide action notes before closing the event.');
      return;
    }

    try {
      const response = await fetch(`/api/staff/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resolve',
          notes: actionNotes,
          outcome: outcome
        })
      });
      
      if (response.ok) {
        setActionNotes("");
        setOutcome("");
        fetchClientData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to close event:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading client dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-screen">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Client not found</h3>
            <p className="text-muted-foreground mb-4">The requested client could not be found.</p>
            <Link href="/staff">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeEvents = events.filter(e => e.status !== 'resolved');
  const relevantSOPs = sops.filter(sop => 
    activeEvents.some(event => event.type === sop.eventType)
  );

  return (
    <div className="flex h-screen">
      <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center space-x-4">
              <Link href="/staff">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                {client.photo && (
                  <img 
                    src={client.photo} 
                    alt={client.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
                  {client.company && (
                    <p className="text-sm text-muted-foreground">{client.company}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`}></div>
                  <Badge 
                    variant={client.status === 'online' ? 'default' : client.status === 'scheduled' ? 'secondary' : 'destructive'}
                    className="capitalize"
                  >
                    {client.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Column - Active Events & Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Event Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Active Events</span>
                    {activeEvents.length > 0 && (
                      <Badge variant="destructive">{activeEvents.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No active events</h3>
                      <p className="text-muted-foreground">All events have been resolved.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeEvents.map((event) => (
                        <div 
                          key={event.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedEvent?.id === event.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(event.type === 'detection' ? 'alert' : 'scheduled')}`}></div>
                              <div>
                                <h4 className="font-medium">{event.description}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {event.location} • {new Date(event.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity}
                              </Badge>
                              {event.hasVideo && (
                                <Button size="sm" variant="outline">
                                  <Play className="w-3 h-3 mr-1" />
                                  Play Clip
                                </Button>
                              )}
                              {!event.acknowledged && (
                                <Button 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcknowledgeEvent(event.id);
                                  }}
                                >
                                  Acknowledge
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Log Form */}
              {selectedEvent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Event Log</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        What did you do? *
                      </label>
                      <Textarea
                        placeholder="Describe your actions (e.g., 'Attempted contact via Google Meet – no answer.', 'Client responded. No injury.')"
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Outcome
                      </label>
                      <Select value={outcome} onValueChange={setOutcome}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false-alarm">False Alarm</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="emergency-escalated">Emergency Escalated</SelectItem>
                          <SelectItem value="scheduled-check">Scheduled Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <Button onClick={handleStartCall} className="flex-1">
                  <Phone className="w-4 h-4 mr-2" />
                  Start Call
                </Button>
                {selectedEvent && (
                  <Button 
                    onClick={handleCloseEvent}
                    disabled={!actionNotes.trim()}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Close Event
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column - Emergency Info & SOPs */}
            <div className="space-y-6">
              {/* Emergency Services Info */}
              {client.emergencyServices && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span>Emergency Services</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{client.emergencyServices.name}</p>
                      <p className="text-sm text-muted-foreground">{client.emergencyServices.phone}</p>
                      <p className="text-sm text-muted-foreground">{client.emergencyServices.address}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SOP Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Standard Operating Procedures</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {relevantSOPs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No relevant SOPs for current events.</p>
                  ) : (
                    <div className="space-y-3">
                      {relevantSOPs.map((sop) => (
                        <div 
                          key={sop.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <h4 className="font-medium text-sm">{sop.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {sop.content.substring(0, 100)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 