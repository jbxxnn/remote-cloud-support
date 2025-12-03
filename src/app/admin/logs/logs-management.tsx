"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeaderBar } from "@/components/layout/header-bar";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Search,
  Filter,
  Calendar,
  User,
  Building,
  Clock,
  Eye,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  ArrowUpRight,
  RefreshCw,
  Loader
} from "lucide-react";

interface AlertEvent {
  id: string;
  alertId: string;
  clientId: string;
  staffId: string;
  eventType: string;
  message?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  // Joined data
  clientName?: string;
  staffName?: string;
  alertType?: string;
  alertStatus?: string;
  alertMessage?: string;
}

interface Client {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
}

interface LogsManagementProps {
  user?: any;
}

export function LogsManagement({ user }: LogsManagementProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AlertEvent | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });

  const eventTypes = [
    { value: "acknowledged", label: "Acknowledged", icon: CheckCircle },
    { value: "resolved", label: "Resolved", icon: CheckCircle },
    { value: "escalated", label: "Escalated", icon: ArrowUpRight },
    { value: "notes_added", label: "Notes Added", icon: MessageSquare },
    { value: "reassigned", label: "Reassigned", icon: RefreshCw }
  ];

  useEffect(() => {
    fetchEvents();
    fetchClients();
    fetchStaff();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/admin/logs");
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/users?role=staff");
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  };

  const handleViewEvent = (event: AlertEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const getEventTypeIcon = (eventType: string) => {
    const type = eventTypes.find(t => t.value === eventType);
    return type ? type.icon : AlertTriangle;
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "acknowledged":
        return "text-blue-600 border-blue-200";
      case "resolved":
        return "text-green-600 border-green-200";
      case "escalated":
        return "text-orange-600 border-orange-200";
      case "notes_added":
        return "text-purple-600 border-purple-200";
      case "reassigned":
        return "text-gray-600 border-gray-200";
      default:
        return "text-gray-600 border-gray-200";
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.staffName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.alertType?.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesClient = selectedClient === "all" || !selectedClient || event.clientId === selectedClient;
      const matchesStaff = selectedStaff === "all" || !selectedStaff || event.staffId === selectedStaff;
      const matchesEventType = selectedEventType === "all" || !selectedEventType || event.eventType === selectedEventType;

    const eventDate = new Date(event.createdAt);
    const matchesStartDate = !dateRange.startDate || eventDate >= new Date(dateRange.startDate);
    const matchesEndDate = !dateRange.endDate || eventDate <= new Date(dateRange.endDate + "T23:59:59");

    return matchesSearch && matchesClient && matchesStaff && matchesEventType && matchesStartDate && matchesEndDate;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedClient("all");
    setSelectedStaff("all");
    setSelectedEventType("all");
    setDateRange({ startDate: "", endDate: "" });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header Bar */}
      <HeaderBar
        module="System Logs"
        activeAlerts={0} // TODO: Get actual active alerts count
        staffOnline={0} // TODO: Get actual staff online count
        openSOPs={0} // TODO: Get actual open SOPs count
        onAssistantClick={() => setAssistantOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <div></div>
          <Button variant="outline" onClick={fetchEvents}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
            <CardDescription>
              Filter events by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Client Filter */}
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Filter */}
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All staff</SelectItem>
                    {staff.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Type Filter */}
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {filteredEvents.length} of {events.length} events
            </Badge>
          </div>
        </div>

        {/* Events Table */}
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || selectedClient || selectedStaff || selectedEventType || dateRange.startDate || dateRange.endDate
                  ? "No events match your filter criteria."
                  : "No events have been logged yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none rounded-md">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const EventIcon = getEventTypeIcon(event.eventType);
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <EventIcon className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-medium">
                                {event.message || event.eventType}
                              </div>
                              {event.message && (
                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                  {event.message}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{event.clientName || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{event.staffName || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getEventTypeColor(event.eventType)}>
                            {eventTypes.find(t => t.value === event.eventType)?.label || event.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{event.alertType || "Unknown"}</Badge>
                            {event.alertStatus && (
                              <Badge variant={event.alertStatus === 'resolved' ? 'default' : 'secondary'}>
                                {event.alertStatus}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(event.createdAt).toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="View Event Details"
                            onClick={() => handleViewEvent(event)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              Detailed information about this event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Event Type</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getEventTypeColor(selectedEvent.eventType)}>
                      {eventTypes.find(t => t.value === selectedEvent.eventType)?.label || selectedEvent.eventType}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <div className="mt-1 text-sm">
                    {new Date(selectedEvent.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Client</Label>
                <div className="mt-1 text-sm">{selectedEvent.clientName || "Unknown"}</div>
              </div>

              <div>
                <Label className="text-sm font-medium">Staff Member</Label>
                <div className="mt-1 text-sm">{selectedEvent.staffName || "Unknown"}</div>
              </div>

              <div>
                <Label className="text-sm font-medium">Alert</Label>
                <div className="mt-1 space-y-2">
                  <div className="text-sm">
                    <strong>Type:</strong> {selectedEvent.alertType || "Unknown"}
                  </div>
                  {selectedEvent.alertStatus && (
                    <div className="text-sm">
                      <strong>Status:</strong> {selectedEvent.alertStatus}
                    </div>
                  )}
                  {selectedEvent.alertMessage && (
                    <div className="text-sm">
                      <strong>Message:</strong> {selectedEvent.alertMessage}
                    </div>
                  )}
                </div>
              </div>

              {selectedEvent.message && (
                <div>
                  <Label className="text-sm font-medium">Message</Label>
                  <div className="mt-1 text-sm p-3 bg-muted rounded-md">
                    {selectedEvent.message}
                  </div>
                </div>
              )}

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Additional Data</Label>
                  <div className="mt-1 text-sm p-3 bg-muted rounded-md">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SupportSense Assistant Icon */}
      <AssistantIcon
        module="System Logs"
        userRole="admin"
        drawerOpen={assistantOpen}
        onDrawerOpenChange={setAssistantOpen}
      />

      {/* SupportSense Assistant Drawer */}
      <AssistantDrawer
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />
      </div>
    </div>
  );
} 