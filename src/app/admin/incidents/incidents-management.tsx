"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertTriangle,
  Search,
  Eye,
  Calendar,
  User,
  FileText,
  Loader,
  Filter,
  RefreshCw,
} from "lucide-react";
import { IncidentReview } from "@/components/incidents/incident-review";

interface Incident {
  id: string;
  alertId: string;
  clientId: string;
  incidentType: "MUI" | "UI";
  status: "draft" | "review" | "finalized" | "locked";
  draftData: any;
  finalizedData?: any;
  createdBy: string;
  reviewedBy?: string;
  finalizedBy?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  alertMessage?: string;
  clientName?: string;
  createdByName?: string;
  reviewedByName?: string;
  finalizedByName?: string;
}

interface IncidentsManagementProps {
  user: any;
}

export function IncidentsManagement({ user }: IncidentsManagementProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, typeFilter]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const response = await fetch(`/api/incidents/drafts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch incidents");
      }
      const data = await response.json();
      setIncidents(data);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents();
    setRefreshing(false);
  };

  const handleStatusChange = async (incidentId: string, status: string, comment?: string) => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment }),
      });

      if (!response.ok) {
        throw new Error("Failed to update incident status");
      }

      // Refresh incidents list
      await fetchIncidents();
      
      // Close review dialog
      setSelectedIncident(null);
    } catch (error) {
      console.error("Failed to update incident status:", error);
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      review: "secondary",
      finalized: "default",
      locked: "default",
    };

    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      finalized: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      locked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };

    return (
      <Badge className={colors[status] || ""} variant={variants[status] || "default"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      searchTerm === "" ||
      incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.alertMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesType = typeFilter === "all" || incident.incidentType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: incidents.length,
    draft: incidents.filter((i) => i.status === "draft").length,
    review: incidents.filter((i) => i.status === "review").length,
    finalized: incidents.filter((i) => i.status === "finalized" || i.status === "locked").length,
    mui: incidents.filter((i) => i.incidentType === "MUI").length,
    ui: incidents.filter((i) => i.incidentType === "UI").length,
  };

  return (
    <div className="flex flex-col h-full">
      <HeaderBar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Incidents Management</h1>
              <p className="text-muted-foreground mt-1">
                Review and manage MUI/UI incident reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <AssistantIcon
                module="Incidents Management"
                userRole="admin"
                onOpen={() => setAssistantOpen(true)}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">In Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.review}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">MUI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.mui}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">UI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.ui}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search incidents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="finalized">Finalized</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="MUI">MUI</SelectItem>
                    <SelectItem value="UI">UI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Incidents Table */}
          <Card>
            <CardHeader>
              <CardTitle>Incidents ({filteredIncidents.length})</CardTitle>
              <CardDescription>
                {stats.draft} draft, {stats.review} in review, {stats.finalized} finalized
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No incidents found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-mono text-xs">
                          {incident.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={incident.incidentType === "MUI" ? "destructive" : "secondary"}
                          >
                            {incident.incidentType}
                          </Badge>
                        </TableCell>
                        <TableCell>{incident.clientName || "Unknown"}</TableCell>
                        <TableCell>{getStatusBadge(incident.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {new Date(incident.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {incident.createdByName || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIncident(incident)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      {selectedIncident && (
        <IncidentReview
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Assistant */}
      <AssistantDrawer
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />
    </div>
  );
}

