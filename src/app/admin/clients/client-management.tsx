"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Building,
  Clock,
  AlertTriangle,
  Loader,
  X,
  Tag,
  Shield,
  Key,
  Video
} from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CallOverlay } from "@/components/calls/call-overlay";

interface ClientTag {
  id: string;
  tag: string;
  tagType: 'risk' | 'goal' | 'custom';
  color?: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  timezone?: string;
  emergencyContact?: string;
  emergencyServicesNumber?: string;
  serviceProviderId?: string;
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  primaryTabletId?: string;
  primaryTabletName?: string;
  tags?: ClientTag[];
  _count?: {
    devices: number;
    detections: number;
    users: number;
  };
}

interface ClientManagementProps {
  user: any;
}

export function ClientManagement({ user }: ClientManagementProps) {
  const router = useRouter();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInitiatingCall, setIsInitiatingCall] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callSessionId: string;
    token: string;
    signalingUrl: string;
    iceServers: any[];
    targetName: string;
    inviteTarget: { userId?: string; clientId?: string };
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    timezone: "",
    emergencyContact: "",
    emergencyServicesNumber: "",
    serviceProviderId: "",
    company: "",
    webhookUrl: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [clientTags, setClientTags] = useState<Record<string, ClientTag[]>>({});
  const [newTag, setNewTag] = useState<{ tag: string; tagType: 'risk' | 'goal' | 'custom'; color: string }>({ tag: '', tagType: 'custom', color: '' });
  const [addingTag, setAddingTag] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<'client' | 'tablet'>('client');
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [tabletFormData, setTabletFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
        // Fetch tags for all clients
        const tagsMap: Record<string, ClientTag[]> = {};
        for (const client of data) {
          if (client.tags) {
            tagsMap[client.id] = client.tags;
          } else {
            // Fetch tags if not included
            const tagsResponse = await fetch(`/api/clients/${client.id}/tags`);
            if (tagsResponse.ok) {
              tagsMap[client.id] = await tagsResponse.json();
            }
          }
        }
        setClientTags(tagsMap);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientTags = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/tags`);
      if (response.ok) {
        const tags = await response.json();
        setClientTags(prev => ({ ...prev, [clientId]: tags }));
        return tags;
      }
    } catch (error) {
      console.error("Failed to fetch client tags:", error);
    }
    return [];
  };
 
  const fetchClientUsers = async (clientId: string) => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/users?clientId=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClientUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch client users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddTag = async (clientId: string) => {
    if (!newTag.tag.trim()) return;

    setAddingTag(clientId);
    try {
      const response = await fetch(`/api/clients/${clientId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      });

      if (response.ok) {
        const tag = await response.json();
        setClientTags(prev => ({
          ...prev,
          [clientId]: [...(prev[clientId] || []), tag]
        }));
        setNewTag({ tag: '', tagType: 'custom', color: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add tag');
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
      alert('Failed to add tag');
    } finally {
      setAddingTag(null);
    }
  };

  const handleDeleteTag = async (clientId: string, tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      const response = await fetch(`/api/clients/${clientId}/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setClientTags(prev => ({
          ...prev,
          [clientId]: (prev[clientId] || []).filter(t => t.id !== tagId)
        }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete tag');
      }
    } catch (error) {
      console.error("Failed to delete tag:", error);
      alert('Failed to delete tag');
    }
  };

  const getTagColor = (tagType: string, color?: string) => {
    if (color) return color;
    switch (tagType) {
      case 'risk':
        return '#ef4444'; // red
      case 'goal':
        return '#3b82f6'; // blue
      case 'custom':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedClient = await response.json();
        
        if (editingClient) {
          setClients(clients.map(client => client.id === editingClient.id ? updatedClient : client));
          setShowEditDialog(false);
          setEditingClient(null);
        } else {
          setClients([updatedClient, ...clients]);
          // Transition to tablet registration step
          setNewClientId(updatedClient.id);
          setAddStep('tablet');
          setTabletFormData(prev => ({
            ...prev,
            name: `${updatedClient.name} Tablet`,
            email: updatedClient.email,
          }));
          return; // Don't close modal or reset client form yet
        }
        
        resetForm();
        setShowAddModal(false);
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${editingClient ? 'update' : 'create'} client`);
      }
    } catch (error) {
      alert(`Failed to ${editingClient ? 'update' : 'create'} client`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
      timezone: client.timezone || "",
      emergencyContact: client.emergencyContact || "",
      emergencyServicesNumber: client.emergencyServicesNumber || "",
      serviceProviderId: client.serviceProviderId || "",
      company: client.company || "",
      webhookUrl: client.webhookUrl || "",
      notes: client.notes || "",
    });
    setShowEditDialog(true);
  };

  const handleAddTablet = (client: Client) => {
    setNewClientId(client.id);
    setAddStep('tablet');
    setTabletFormData(prev => ({
      ...prev,
      name: `${client.name} Tablet`,
      email: client.email,
    }));
    setShowAddModal(true);
  };
  
  const handleTabletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tabletFormData.password !== tabletFormData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (tabletFormData.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    setSubmitting(true);

    try {
      const requestBody = {
        name: tabletFormData.name,
        email: tabletFormData.email,
        password: tabletFormData.password,
        role: "user", // Tablet role
        clientId: newClientId,
        isActive: true
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setShowAddModal(false);
        resetForm();
        // If we're currently viewing a client, refresh their user list
        if (viewingClient && viewingClient.id === newClientId) {
          fetchClientUsers(viewingClient.id);
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create tablet user");
      }
    } catch (error) {
      alert("Failed to create tablet user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/clients/${deletingClient.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setClients(clients.filter(client => client.id !== deletingClient.id));
        setShowDeleteDialog(false);
        setDeletingClient(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete client");
      }
    } catch (error) {
      alert("Failed to delete client");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartCall = async (clientId: string, tabletUser: { id: string, name: string }) => {
    if (!tabletUser) return;
    
    setIsInitiatingCall(tabletUser.id);
    
    try {
      const createResponse = await fetch('/api/calls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId })
      });
      
      if (!createResponse.ok) throw new Error('Failed to create call session');
      const { callSessionId } = await createResponse.json();

      const tokenResponse = await fetch(`/api/calls/${callSessionId}/token`, {
        method: 'POST'
      });
      
      if (!tokenResponse.ok) throw new Error('Failed to get call token');
      const tokenData = await tokenResponse.json();

      setActiveCall({
        callSessionId,
        token: tokenData.token,
        signalingUrl: tokenData.signalingUrl,
        iceServers: tokenData.iceServers,
        targetName: tabletUser.name,
        inviteTarget: { userId: tabletUser.id }
      });

    } catch (err) {
      console.error('Failed to start call:', err);
    } finally {
      setIsInitiatingCall(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      timezone: "",
      emergencyContact: "",
      emergencyServicesNumber: "",
      serviceProviderId: "",
      company: "",
      webhookUrl: "",
      notes: "",
    });
    setTabletFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setAddStep('client');
    setNewClientId(null);
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingClient(null);
    resetForm();
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingClient(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTabletInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTabletFormData({
      ...tabletFormData,
      [e.target.name]: e.target.value,
    });
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        module="Client Management"
        activeAlerts={0} // TODO: Get actual active alerts count
        staffOnline={0} // TODO: Get actual staff online count
        openSOPs={0} // TODO: Get actual open SOPs count
        onAssistantClick={() => setAssistantOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {filteredClients.length} of {clients.length} clients
            </Badge>
            <Button onClick={() => setShowAddModal(true)} className="rounded-full bg-[var(--rce-green)] text-primary-foreground hover:bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add New Client
            </Button>
          </div>
        </div>

        {/* Clients Table */}
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? "No clients match your search criteria." : "Get started by adding your first client."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none rounded-md">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium">{client.name}</div>
                            {/* <div className="text-sm text-muted-foreground">
                              {client.company || "No company specified"}
                            </div> */}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.phone && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.address ? (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm truncate max-w-xs">{client.address}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No address</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant={client.isActive ? "default" : "secondary"}>
                            {client.isActive ? "Active" : "Inactive"}
                          </Badge>
                        
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{client._count?.devices || 0}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <span>{new Date(client.createdAt).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* <Button variant="ghost" size="sm" title="View Client">
                            <Eye className="w-4 h-4" />
                          </Button> */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="View Client"
                            onClick={async () => {
                              setViewingClient(client);
                              setShowViewDialog(true);
                              fetchClientUsers(client.id);
                              // Fetch tags if not already loaded
                              if (!clientTags[client.id] && !client.tags) {
                                await fetchClientTags(client.id);
                              }
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {client.primaryTabletId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                              title={`Call ${client.primaryTabletName}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartCall(client.id, { 
                                  id: client.primaryTabletId!, 
                                  name: client.primaryTabletName! 
                                });
                              }}
                              disabled={isInitiatingCall === client.primaryTabletId}
                            >
                              {isInitiatingCall === client.primaryTabletId ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <Video className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Edit Client"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete Client"
                            onClick={() => {
                              setDeletingClient(client);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      {/* Add Client Dialog */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddModal(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{addStep === 'client' ? 'Add New Client' : 'Register Tablet'}</DialogTitle>
            <DialogDescription>
              {addStep === 'client' 
                ? 'Create a new client profile with all required information' 
                : 'Register the first tablet device for this client to enable monitoring.'}
            </DialogDescription>
          </DialogHeader>
          
          {addStep === 'client' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter client's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="client@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company/Organization</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Company name"
                    />
                  </div>
                </div>
              </div>

              {/* Address and Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Address & Location</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter full address"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleInputChange}
                        placeholder="e.g., America/New_York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceProviderId">Service Provider ID</Label>
                      <Input
                        id="serviceProviderId"
                        name="serviceProviderId"
                        value={formData.serviceProviderId}
                        onChange={handleInputChange}
                        placeholder="Provider ID (if applicable)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Emergency Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      placeholder="Emergency contact name and phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyServicesNumber">Local Emergency Services</Label>
                    <Input
                      id="emergencyServicesNumber"
                      name="emergencyServicesNumber"
                      value={formData.emergencyServicesNumber}
                      onChange={handleInputChange}
                      placeholder="Local emergency number"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      name="webhookUrl"
                      type="url"
                      value={formData.webhookUrl}
                      onChange={handleInputChange}
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional notes about the client"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Client"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleTabletSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tablet-name">Tablet Display Name *</Label>
                  <Input
                    id="tablet-name"
                    name="name"
                    value={tabletFormData.name}
                    onChange={handleTabletInputChange}
                    required
                    placeholder="e.g. Living Room Tablet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tablet-email">Tablet Login Email *</Label>
                  <Input
                    id="tablet-email"
                    name="email"
                    type="email"
                    value={tabletFormData.email}
                    onChange={handleTabletInputChange}
                    required
                    placeholder="tablet@example.com"
                  />
                  <p className="text-[10px] text-muted-foreground">This email will be used to log in on the physical tablet device.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tablet-password">Login Password *</Label>
                    <Input
                      id="tablet-password"
                      name="password"
                      type="password"
                      value={tabletFormData.password}
                      onChange={handleTabletInputChange}
                      required
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tablet-confirm-password">Confirm Password *</Label>
                    <Input
                      id="tablet-confirm-password"
                      name="confirmPassword"
                      type="password"
                      value={tabletFormData.confirmPassword}
                      onChange={handleTabletInputChange}
                      required
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Skip for now
                </Button>
                <div className="space-x-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Registering..." : "Register Tablet"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client profile information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter client's full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address *</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="client@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company/Organization</Label>
                  <Input
                    id="edit-company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Company name"
                  />
                </div>
              </div>
            </div>

            {/* Address and Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address & Location</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Textarea
                    id="edit-address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-timezone">Timezone</Label>
                    <Input
                      id="edit-timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      placeholder="e.g., America/New_York"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-serviceProviderId">Service Provider ID</Label>
                    <Input
                      id="edit-serviceProviderId"
                      name="serviceProviderId"
                      value={formData.serviceProviderId}
                      onChange={handleInputChange}
                      placeholder="Provider ID (if applicable)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Emergency Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
                  <Input
                    id="edit-emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Emergency contact name and phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-emergencyServicesNumber">Local Emergency Services</Label>
                  <Input
                    id="edit-emergencyServicesNumber"
                    name="emergencyServicesNumber"
                    value={formData.emergencyServicesNumber}
                    onChange={handleInputChange}
                    placeholder="Local emergency number"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-webhookUrl">Webhook URL</Label>
                  <Input
                    id="edit-webhookUrl"
                    name="webhookUrl"
                    type="url"
                    value={formData.webhookUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/webhook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes about the client"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingClient?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingClient?.name}</DialogTitle>
            <DialogDescription>
              {viewingClient?.email}
            </DialogDescription>
          </DialogHeader>
          
          {viewingClient && (
            <div className="space-y-8">

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{viewingClient._count?.devices || 0}</div>
                  <div className="text-xs text-muted-foreground">Devices</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{viewingClient._count?.detections || 0}</div>
                  <div className="text-xs text-muted-foreground">Detections</div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact</h4>
                <div className="space-y-2 grid grid-cols-3">
                  {viewingClient.phone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{viewingClient.phone}</span>
                    </div>
                  )}
                  {viewingClient.company && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span>{viewingClient.company}</span>
                    </div>
                  )}
                  {viewingClient.address && (
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{viewingClient.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Information */}
              {(viewingClient.emergencyContact || viewingClient.emergencyServicesNumber) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Emergency</h4>
                  <div className="grid grid-cols-3 ">
                    {viewingClient.emergencyContact && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Contact:</span> {viewingClient.emergencyContact}
                      </div>
                    )}
                    {viewingClient.emergencyServicesNumber && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Services:</span> {viewingClient.emergencyServicesNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags Management */}
              <div className="space-y-3">
                {/* <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Tags</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (viewingClient && !clientTags[viewingClient.id]) {
                        fetchClientTags(viewingClient.id);
                      }
                    }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div> */}
                
                {/* Existing Tags */}
                {/* <div className="flex flex-wrap gap-2 mb-3">
                  {(clientTags[viewingClient.id] || viewingClient.tags || []).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="flex items-center gap-1"
                      style={{ 
                        borderColor: getTagColor(tag.tagType, tag.color),
                        color: getTagColor(tag.tagType, tag.color)
                      }}
                    >
                      {tag.tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => handleDeleteTag(viewingClient.id, tag.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div> */}

                {/* Add New Tag */}
                {/* <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tag name"
                      value={newTag.tag}
                      onChange={(e) => setNewTag({ ...newTag, tag: e.target.value })}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTag.tag.trim()) {
                          handleAddTag(viewingClient.id);
                        }
                      }}
                    />
                    <Select
                      value={newTag.tagType}
                      onValueChange={(value: 'risk' | 'goal' | 'custom') => 
                        setNewTag({ ...newTag, tagType: value })
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="risk">Risk</SelectItem>
                        <SelectItem value="goal">Goal</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleAddTag(viewingClient.id)}
                      disabled={!newTag.tag.trim() || addingTag === viewingClient.id}
                    >
                      {addingTag === viewingClient.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div> */}
              </div>

              {/* System Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">System</h4>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">API Key:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="font-mono text-xs bg-muted p-2 rounded flex-1 select-all cursor-pointer hover:bg-muted/80 transition-colors" 
                           onClick={async () => {
                             await navigator.clipboard.writeText(viewingClient.apiKey);
                             setCopiedKey(viewingClient.apiKey);
                             setTimeout(() => setCopiedKey(null), 2000);
                           }}>
                        {viewingClient.apiKey}
                      </div>
                      <Button
                        size="sm"
                        variant={copiedKey === viewingClient.apiKey ? "default" : "outline"}
                        className="h-8 px-2 min-w-[60px]"
                        onClick={async () => {
                          await navigator.clipboard.writeText(viewingClient.apiKey);
                          setCopiedKey(viewingClient.apiKey);
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                      >
                        {copiedKey === viewingClient.apiKey ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 ">

                  
                  <div className="text-sm">
                    <span className="text-muted-foreground">Created:</span> {new Date(viewingClient.createdAt).toLocaleDateString()}
                  </div>
                  {viewingClient.timezone && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Timezone:</span> {viewingClient.timezone}
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {/* Associated Users / Tablets */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Associated Tablets</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTablet(viewingClient)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Connect Tablet
                  </Button>
                </div>

                {loadingUsers ? (
                  <div className="flex justify-center p-4">
                    <Loader className="w-4 h-4 animate-spin" />
                  </div>
                ) : clientUsers.filter(u => u.role === 'user').length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded text-center">
                    No tablets assigned to this client.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientUsers.filter(u => u.role === 'user').map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md border text-sm">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-purple-100 rounded text-purple-600">
                            <Key className="w-3 h-3" />
                          </div>
                          <div>
                            <div className="font-medium">{u.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                            onClick={() => handleStartCall(viewingClient.id, u)}
                            disabled={isInitiatingCall === u.id}
                          >
                            {isInitiatingCall === u.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Video className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {viewingClient.notes && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Notes</h4>
                  <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                    {viewingClient.notes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowViewDialog(false);
                handleEdit(viewingClient!);
              }}
            >
              Edit Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SupportSense Assistant Icon */}
      <AssistantIcon
        module="Client Management"
        userRole="admin"
        drawerOpen={assistantOpen}
        onDrawerOpenChange={setAssistantOpen}
      />

      {/* SupportSense Assistant Drawer */}
      <AssistantDrawer
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />

      {activeCall && (
          <CallOverlay
            callSessionId={activeCall.callSessionId}
            token={activeCall.token}
            signalingUrl={activeCall.signalingUrl}
            iceServers={activeCall.iceServers}
            clientName={activeCall.targetName}
            inviteTarget={activeCall.inviteTarget}
            onClose={() => setActiveCall(null)}
          />
      )}
        </div>
      </div>
    </div>
  );
} 