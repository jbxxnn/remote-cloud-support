"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { 
  ArrowLeft,
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Phone,
  Play,
  FileText,
  User,
  Shield,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: 'online' | 'scheduled' | 'alert';
  emergencyContact?: string;
  emergencyServicesNumber?: string;
  address?: string;
  timezone?: string;
}

interface Event {
  id: string;
  type: 'detection' | 'scheduled' | 'manual';
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'resolved';
  description: string;
  timestamp: string;
  location?: string;
  clipUrl?: string;
  assignedTo?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface SOP {
  id: string;
  name: string;
  eventType: string;
  description: string;
  steps: any[];
}

interface ClientDashboardProps {
  clientId: string;
  user: any;
}

export function ClientDashboard({ clientId, user }: ClientDashboardProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      }

      // Fetch SOPs for this client
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'scheduled':
        return 'Scheduled Check-in';
      case 'alert':
        return 'Alert Active';
      default:
        return 'Unknown';
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
    // This would integrate with Google Meet API
    // For now, we'll just log the action
    try {
      if (selectedEvent) {
        await fetch(`/api/staff/events/${selectedEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'call' })
        });
      }
      
      // Open Google Meet (placeholder)
      window.open('https://meet.google.com', '_blank');
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const handleCloseEvent = async () => {
    if (!selectedEvent || !actionNotes.trim()) {
      return; // Notes are required
    }

    try {
      setSubmitting(true);
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
        setSelectedEvent(null);
        fetchClientData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to close event:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const activeEvents = events.filter(e => e.status !== 'resolved');

  if (loading) {
    return (
      <div className="flex h-screen">
        <StaffSidebar user={user} />
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
        <StaffSidebar user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Client not found</h3>
            <p className="text-muted-foreground mb-4">
              The client you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
            </p>
            <Button asChild>
              <Link href="/staff">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <StaffSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/staff">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
                  {client.company && (
                    <p className="text-sm text-muted-foreground">{client.company}</p>
                  )}
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(client.status)}`}></div>
                <Badge variant="outline">{getStatusText(client.status)}</Badge>
              </div>
            </div>
            <div className="ml-auto flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchClientData}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Column - Active Events & Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Events Panel */}
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
                      <p className="text-muted-foreground">
                        All events for this client have been resolved.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedEvent?.id === event.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor('alert')}`}></div>
                              <div>
                                <h4 className="font-medium">{event.description}</h4>
                                {event.location && (
                                  <p className="text-sm text-muted-foreground">{event.location}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(event.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity}
                              </Badge>
                              {event.clipUrl && (
                                <Button size="sm" variant="outline">
                                  <Play className="w-3 h-3 mr-1" />
                                  Play Clip
                                </Button>
                              )}
                              {event.status === 'pending' && (
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
                    <p className="text-sm text-muted-foreground">
                      Document your response to this event
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="action-notes">What did you do? *</Label>
                      <Textarea
                        id="action-notes"
                        placeholder="Describe your response to this event..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="outcome">Outcome (Optional)</Label>
                      <Select value={outcome} onValueChange={setOutcome}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select an outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false_alarm">False Alarm</SelectItem>
                          <SelectItem value="resolved_no_action">Resolved - No Action Needed</SelectItem>
                          <SelectItem value="resolved_with_help">Resolved - Provided Help</SelectItem>
                          <SelectItem value="emergency_escalated">Emergency Escalated</SelectItem>
                          <SelectItem value="unable_to_contact">Unable to Contact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={handleStartCall}
                        className="flex-1"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Start Call
                      </Button>
                      <Button
                        onClick={handleCloseEvent}
                        disabled={!actionNotes.trim() || submitting}
                        className="flex-1"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Closing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Close Event
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Client Info & SOPs */}
            <div className="space-y-6">
              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.address && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <p className="text-sm">{client.address}</p>
                    </div>
                  )}
                  {client.timezone && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Timezone</Label>
                      <p className="text-sm">{client.timezone}</p>
                    </div>
                  )}
                  {client.emergencyContact && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Emergency Contact</Label>
                      <p className="text-sm">{client.emergencyContact}</p>
                    </div>
                  )}
                  {client.emergencyServicesNumber && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Emergency Services</Label>
                      <p className="text-sm font-medium text-red-600">
                        {client.emergencyServicesNumber}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SOPs Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Standard Operating Procedures</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sops.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No SOPs available for this client.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sops.map((sop) => (
                        <div
                          key={sop.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedEvent && sop.eventType === selectedEvent.type
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm">{sop.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                {sop.description}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
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