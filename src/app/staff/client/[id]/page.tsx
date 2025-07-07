"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertTriangle, FileText, Phone, CheckCircle, ArrowLeft, Play, Loader2 } from "lucide-react";
import { StaffSidebar } from "@/components/ui/staff-sidebar";

interface Client {
  id: string;
  name: string;
  company: string;
  status: string;
  photo?: string;
  emergencyServices: {
    name: string;
    phone: string;
    address: string;
  };
}

interface Event {
  id: string;
  description: string;
  timestamp: string;
  location: string;
  severity: string;
  acknowledged: boolean;
  hasVideo: boolean;
  type: string;
  status: string;
  detectionType?: string;
  confidence?: number;
  videoUrl?: string;
}

interface SOP {
  id: string;
  title: string;
  content: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-500";
    case "inactive": return "bg-gray-400";
    case "alert": return "bg-red-500";
    case "pending": return "bg-yellow-500";
    case "assigned": return "bg-blue-500";
    case "resolved": return "bg-green-500";
    default: return "bg-gray-300";
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "high": return "bg-red-500";
    case "medium": return "bg-yellow-500";
    case "low": return "bg-green-500";
    default: return "bg-gray-500";
  }
}

export default function ClientDashboardPage() {
  const params = useParams();
  const clientId = params.id as string;
  
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>("active");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  
  // Data states
  const [client, setClient] = useState<Client | null>(null);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [eventHistory, setEventHistory] = useState<Event[]>([]);
  const [relevantSOPs, setRelevantSOPs] = useState<SOP[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingSOPs, setLoadingSOPs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch client details
  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/staff/clients/${clientId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch client details');
        }
        const data = await response.json();
        setClient(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch client details');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const response = await fetch(`/api/staff/clients/${clientId}/events`);
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setActiveEvents(data.activeEvents || []);
        setEventHistory(data.eventHistory || []);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };

    if (clientId) {
      fetchEvents();
    }
  }, [clientId]);

  // Fetch SOPs
  useEffect(() => {
    const fetchSOPs = async () => {
      try {
        setLoadingSOPs(true);
        const response = await fetch(`/api/staff/clients/${clientId}/sops`);
        if (!response.ok) {
          throw new Error('Failed to fetch SOPs');
        }
        const data = await response.json();
        setRelevantSOPs(data.sops || []);
      } catch (err) {
        console.error('Failed to fetch SOPs:', err);
      } finally {
        setLoadingSOPs(false);
      }
    };

    if (clientId) {
      fetchSOPs();
    }
  }, [clientId]);

  // Handlers
  const handleAcknowledgeEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/staff/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' })
      });
      
      if (response.ok) {
        // Refresh events
        const eventsResponse = await fetch(`/api/staff/clients/${clientId}/events`);
        if (eventsResponse.ok) {
          const data = await eventsResponse.json();
          setActiveEvents(data.activeEvents || []);
        }
      }
    } catch (err) {
      console.error('Failed to acknowledge event:', err);
    }
  };

  const handleStartCall = async () => {
    if (!selectedEvent) return;
    
    try {
      const response = await fetch(`/api/staff/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'call' })
      });
      
      if (response.ok) {
        // Handle call initiation (could open Google Meet, etc.)
        console.log('Call initiated for event:', selectedEvent.id);
      }
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  };

  const handleCloseEvent = async () => {
    if (!selectedEvent || !actionNotes.trim()) return;
    
    try {
      const response = await fetch(`/api/staff/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resolve',
          notes: actionNotes,
          outcome: outcome || 'resolved'
        })
      });
      
      if (response.ok) {
        // Clear form and refresh events
        setActionNotes("");
        setOutcome("");
        setSelectedEvent(null);
        
        const eventsResponse = await fetch(`/api/staff/clients/${clientId}/events`);
        if (eventsResponse.ok) {
          const data = await eventsResponse.json();
          setActiveEvents(data.activeEvents || []);
          setEventHistory(data.eventHistory || []);
        }
      }
    } catch (err) {
      console.error('Failed to close event:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fa] flex">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading client details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#f7f9fa] flex">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Client Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested client could not be found.'}</p>
            <Link href="/staff">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fa] flex">
      <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-white px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/staff">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {client.photo ? (
                  <img src={client.photo} alt={client.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-gray-600">{client.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 leading-tight">{client.name}</h1>
                {client.company && <p className="text-gray-500 text-sm">{client.company}</p>}
              </div>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`}></div>
              <span className="text-xs font-medium text-gray-700 capitalize">{client.status}</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Overview Card */}
            <Card className="col-span-1 lg:col-span-1 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Primary Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">{client.emergencyServices.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{client.emergencyServices.name}</div>
                    <div className="text-xs text-gray-500">{client.emergencyServices.phone}</div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">Address</div>
                  <div className="text-sm text-gray-700">{client.emergencyServices.address}</div>
                </div>
              </CardContent>
            </Card>

            {/* Events Card */}
            <Card className="col-span-1 lg:col-span-2 shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Events</CardTitle>
                <div className="flex space-x-2">
                  <Button variant={selectedTab === 'active' ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedTab('active')}>Active</Button>
                  <Button variant={selectedTab === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedTab('history')}>History</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span className="text-gray-500">Loading events...</span>
                  </div>
                ) : selectedTab === 'active' ? (
                  activeEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No active events.</div>
                  ) : (
                    <div className="space-y-3">
                      {activeEvents.map((event) => (
                        <div key={event.id} className="p-4 border rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setSelectedEvent(event)}>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{event.description}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleString()} • {event.location}
                              {event.detectionType && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {event.detectionType} ({Math.round((event.confidence || 0) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                            {event.hasVideo && (
                              <Button 
                                size="icon" 
                                variant="outline"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (event.videoUrl) {
                                    window.open(event.videoUrl, '_blank');
                                  }
                                }}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                            {!event.acknowledged && event.status === 'alert' && (
                              <Button size="sm" onClick={e => {e.stopPropagation(); handleAcknowledgeEvent(event.id);}}>Acknowledge</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  eventHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No event history.</div>
                  ) : (
                    <div className="space-y-3">
                      {eventHistory.map((event) => (
                        <div key={event.id} className="p-4 border rounded-lg flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{event.description}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleString()} • {event.location}
                              {event.detectionType && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {event.detectionType} ({Math.round((event.confidence || 0) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                            <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                            {event.hasVideo && (
                              <Button 
                                size="icon" 
                                variant="outline"
                                onClick={() => {
                                  if (event.videoUrl) {
                                    window.open(event.videoUrl, '_blank');
                                  }
                                }}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Event Log Form */}
                {selectedEvent && (
                  <div className="mt-6 border-t pt-6">
                    <div className="font-semibold text-gray-900 mb-2">Event Log</div>
                    <div className="mb-3">
                      <label className="text-xs font-medium mb-1 block text-gray-700">What did you do? *</label>
                      <Textarea
                        placeholder="Describe your actions..."
                        value={actionNotes}
                        onChange={e => setActionNotes(e.target.value)}
                        rows={3}
                        className="border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-medium mb-1 block text-gray-700">Outcome</label>
                      <Select value={outcome} onValueChange={setOutcome}>
                        <SelectTrigger className="border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
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
                    <div className="flex items-center space-x-2">
                      <Button onClick={handleStartCall} size="sm"><Phone className="w-4 h-4 mr-1" />Start Call</Button>
                      <Button onClick={handleCloseEvent} size="sm" disabled={!actionNotes.trim()}><CheckCircle className="w-4 h-4 mr-1" />Close Event</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SOPs Card */}
            <Card className="col-span-1 lg:col-span-1 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Standard Operating Procedures</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSOPs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span className="text-gray-500">Loading SOPs...</span>
                  </div>
                ) : relevantSOPs.length === 0 ? (
                  <div className="text-gray-500 text-sm">No relevant SOPs for current events.</div>
                ) : (
                  <div className="space-y-3">
                    {relevantSOPs.map((sop) => (
                      <div key={sop.id} className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="font-medium text-sm text-gray-900 mb-1">{sop.title}</div>
                        <div className="text-xs text-gray-600">{sop.content.substring(0, 100)}...</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 