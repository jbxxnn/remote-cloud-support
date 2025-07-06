"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Search,
  Eye,
  Edit,
  Trash2,
  Globe,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings
} from "lucide-react";

interface SOP {
  id: string;
  name: string;
  eventType: string;
  description?: string;
  steps: Array<{
    step: number;
    action: string;
    details?: string;
  }>;
  isGlobal: boolean;
  clientId?: string;
  clientName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
}

interface SOPManagementProps {
  user: any;
}

export function SOPManagement({ user }: SOPManagementProps) {
  const [sops, setSops] = useState<SOP[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    eventType: "",
    description: "",
    isGlobal: true,
    clientId: "",
    steps: [{ step: 1, action: "", details: "" }]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSOPs();
    fetchClients();
  }, []);

  const fetchSOPs = async () => {
    try {
      const response = await fetch("/api/sops");
      if (response.ok) {
        const data = await response.json();
        setSops(data);
      }
    } catch (error) {
      console.error("Failed to fetch SOPs:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/sops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          clientId: formData.isGlobal ? null : formData.clientId
        }),
      });

      if (response.ok) {
        const newSOP = await response.json();
        setSops([newSOP, ...sops]);
        setFormData({
          name: "",
          eventType: "",
          description: "",
          isGlobal: true,
          clientId: "",
          steps: [{ step: 1, action: "", details: "" }]
        });
        setShowAddDialog(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create SOP");
      }
    } catch (error) {
      alert("Failed to create SOP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { 
        step: formData.steps.length + 1, 
        action: "", 
        details: "" 
      }]
    });
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      // Renumber steps
      const renumberedSteps = newSteps.map((step, i) => ({
        ...step,
        step: i + 1
      }));
      setFormData({
        ...formData,
        steps: renumberedSteps
      });
    }
  };

  const updateStep = (index: number, field: 'action' | 'details', value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({
      ...formData,
      steps: newSteps
    });
  };

  const filteredSOPs = sops.filter(sop =>
    sop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sop.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sop.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading SOPs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Standard Operating Procedures</h1>
              <p className="text-sm text-muted-foreground">
                Define instructions for staff responses to different event types
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New SOP
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-6">
        {/* Search and Stats */}
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search SOPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {filteredSOPs.length} of {sops.length} SOPs
            </Badge>
          </div>
        </div>

        {/* SOPs Grid */}
        {filteredSOPs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No SOPs found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? "No SOPs match your search criteria." : "Get started by creating your first SOP."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First SOP
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSOPs.map((sop) => (
              <Card key={sop.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span>{sop.name}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {sop.eventType}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  {sop.description && (
                    <p className="text-sm text-muted-foreground">
                      {sop.description}
                    </p>
                  )}

                  {/* Steps Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Steps ({sop.steps.length})</h4>
                    <div className="space-y-1">
                      {sop.steps.slice(0, 3).map((step, index) => (
                        <div key={index} className="flex items-start space-x-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {step.step}
                          </Badge>
                          <span className="flex-1">{step.action}</span>
                        </div>
                      ))}
                      {sop.steps.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{sop.steps.length - 3} more steps
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status and Scope */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Badge variant={sop.isActive ? "default" : "secondary"}>
                        {sop.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {sop.isGlobal ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          <Globe className="w-3 h-3 mr-1" />
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <User className="w-3 h-3 mr-1" />
                          {sop.clientName || "Client-specific"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(sop.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add SOP Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New SOP</DialogTitle>
            <DialogDescription>
              Define a standard operating procedure for staff responses to events
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">SOP Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Fall Detection Response"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Input
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., fall, intrusion, medical"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe when and how to use this SOP"
                  rows={3}
                />
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Scope</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="global"
                    name="scope"
                    title="Global (applies to all clients)"
                    checked={formData.isGlobal}
                    onChange={() => setFormData({ ...formData, isGlobal: true, clientId: "" })}
                  />
                  <Label htmlFor="global" className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Global (applies to all clients)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="client-specific"
                    name="scope"
                    title="Client-specific (applies to a specific client)"
                    checked={!formData.isGlobal}
                    onChange={() => setFormData({ ...formData, isGlobal: false })}
                  />
                  <Label htmlFor="client-specific" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Client-specific</span>
                  </Label>
                </div>
                {!formData.isGlobal && (
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Select Client</Label>
                    <select
                      id="clientId"
                      name="clientId"
                      title="Select a client"
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      required={!formData.isGlobal}
                    >
                      <option value="">Select a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Steps</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>
              <div className="space-y-4">
                {formData.steps.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Step {step.step}</Badge>
                      {formData.steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`action-${index}`}>Action *</Label>
                      <Input
                        id={`action-${index}`}
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                        placeholder="e.g., Attempt contact with client"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`details-${index}`}>Details</Label>
                      <Textarea
                        id={`details-${index}`}
                        value={step.details}
                        onChange={(e) => updateStep(index, 'details', e.target.value)}
                        placeholder="Additional details or instructions for this step"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create SOP"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 