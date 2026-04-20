"use client";

import { useState, useEffect } from "react";
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
  Settings,
  Loader
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

type SOPStep = {
  step: number;
  action: string;
  details: string;
};

type SOPTemplate = {
  label: string;
  name: string;
  eventType: string;
  description: string;
  steps: SOPStep[];
};

const sopTemplates: SOPTemplate[] = [
  {
    label: "Alert Response",
    name: "Alert Response SOP",
    eventType: "alert_response",
    description: "Ensure all alerts are responded to consistently and safely. Trigger types include door opens, motion detected, emergency button pressed, smoke/device alerts, inactivity, and related safety alerts.",
    steps: [
      {
        step: 1,
        action: "Immediate contact",
        details: "Call the client via tablet or wristband. Ask: \"Are you okay?\" and \"Do you need help?\"",
      },
      {
        step: 2,
        action: "Assess situation",
        details: "If the client responds and is safe, document the outcome with no escalation. If confused or unsure, stay on the call and guide them. If there is no response, move to the escalation SOP. If an emergency is reported, call 911 immediately.",
      },
      {
        step: 3,
        action: "Monitor resolution",
        details: "Stay engaged until the situation is confirmed safe. Document the final outcome.",
      },
    ],
  },
  {
    label: "Device Trigger",
    name: "Device Trigger SOP",
    eventType: "device_trigger",
    description: "Respond to environmental risks such as door alerts, motion alerts, sensors, falls, wandering, and unsafe areas. Example: basement door opens during remote hours.",
    steps: [
      {
        step: 1,
        action: "Immediate call",
        details: "Contact the client via wristband or tablet.",
      },
      {
        step: 2,
        action: "Safety prompt",
        details: "Prompt the client clearly, for example: \"Please return upstairs safely\" or \"Do you need assistance?\"",
      },
      {
        step: 3,
        action: "Assess and escalate if needed",
        details: "If the client is safe, document the result. If there is risk such as a fall, confusion, or unsafe movement, escalate. General rule: any unusual or unsafe movement requires immediate intervention.",
      },
    ],
  },
  {
    label: "Emergency Response",
    name: "Emergency Response SOP",
    eventType: "emergency_response",
    description: "Ensure rapid response to medical or safety emergencies. Indicators include client distress, choking, no breathing, fall with injury, no response after alerts, confusion, weakness, or similar symptoms.",
    steps: [
      {
        step: 1,
        action: "Call 911 immediately",
        details: "Never delay emergency services for internal steps.",
      },
      {
        step: 2,
        action: "Stay connected",
        details: "Keep communication open with the client if possible.",
      },
      {
        step: 3,
        action: "Dispatch backup",
        details: "Ensure someone is physically responding to the client.",
      },
      {
        step: 4,
        action: "Notify supervisor and team",
        details: "Notify the supervisor and wider team as required.",
      },
    ],
  },
];

function inferEventType(name: string) {
  return name
    .toLowerCase()
    .replace(/sop/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general_alert";
}

function parseSOPDraft(draft: string): Partial<{
  name: string;
  eventType: string;
  description: string;
  steps: SOPStep[];
}> {
  const lines = draft
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return {};

  const name = lines[0].replace(/^\d+\.\s*/, "").replace(/^[^\w]+/, "").trim();
  const purposeIndex = lines.findIndex((line) => /^purpose$/i.test(line));
  const procedureIndex = lines.findIndex((line) => /^procedure$/i.test(line));
  const triggerIndex = lines.findIndex((line) => /^trigger types?$|^emergency indicators?$|^trigger$/i.test(line));
  const firstStepIndex = lines.findIndex((line) => /^step\s+\d+/i.test(line));

  const descriptionParts: string[] = [];
  if (purposeIndex !== -1) {
    const purposeEnd = [triggerIndex, procedureIndex, firstStepIndex]
      .filter((index) => index > purposeIndex)
      .sort((a, b) => a - b)[0] ?? lines.length;
    descriptionParts.push(lines.slice(purposeIndex + 1, purposeEnd).join(" "));
  }

  if (triggerIndex !== -1) {
    const triggerEnd = [procedureIndex, firstStepIndex]
      .filter((index) => index > triggerIndex)
      .sort((a, b) => a - b)[0] ?? lines.length;
    const triggers = lines.slice(triggerIndex + 1, triggerEnd).join("; ");
    if (triggers) descriptionParts.push(`Triggers: ${triggers}`);
  }

  const steps: SOPStep[] = [];
  lines.forEach((line, index) => {
    const match = line.match(/^step\s+(\d+):?\s*(.*)$/i);
    if (!match) return;

    const nextStepIndex = lines.findIndex((nextLine, nextIndex) => nextIndex > index && /^step\s+\d+/i.test(nextLine));
    const detailEnd = nextStepIndex === -1 ? lines.length : nextStepIndex;
    const action = match[2]?.trim() || `Step ${steps.length + 1}`;
    const details = lines
      .slice(index + 1, detailEnd)
      .filter((detailLine) => !/^procedure$/i.test(detailLine))
      .join("\n");

    steps.push({
      step: steps.length + 1,
      action,
      details,
    });
  });

  return {
    name,
    eventType: inferEventType(name),
    description: descriptionParts.join("\n\n"),
    steps: steps.length > 0 ? steps : undefined,
  };
}

export function SOPManagement({ user }: SOPManagementProps) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [sops, setSops] = useState<SOP[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [deletingSOP, setDeletingSOP] = useState<SOP | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sopDraft, setSopDraft] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    eventType: "",
    description: "",
    isGlobal: true,
    clientId: "",
    steps: [{ step: 1, action: "", details: "" }] as SOPStep[]
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
      const url = editingSOP ? `/api/sops/${editingSOP.id}` : "/api/sops";
      const method = editingSOP ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          clientId: formData.isGlobal ? null : formData.clientId
        }),
      });

      if (response.ok) {
        const updatedSOP = await response.json();
        
        if (editingSOP) {
          setSops(sops.map(sop => sop.id === editingSOP.id ? updatedSOP : sop));
          setShowEditDialog(false);
          setEditingSOP(null);
        } else {
          setSops([updatedSOP, ...sops]);
          setShowAddDialog(false);
        }
        
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${editingSOP ? 'update' : 'create'} SOP`);
      }
    } catch (error) {
      alert(`Failed to ${editingSOP ? 'update' : 'create'} SOP`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (sop: SOP) => {
    setEditingSOP(sop);
    setFormData({
      name: sop.name,
      eventType: sop.eventType,
      description: sop.description || "",
      isGlobal: sop.isGlobal,
      clientId: sop.clientId || "",
      steps: sop.steps.length > 0 ? sop.steps.map(step => ({
        ...step,
        details: step.details || ""
      })) as SOPStep[] : [{ step: 1, action: "", details: "" }] as SOPStep[]
    });
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingSOP) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/sops/${deletingSOP.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSops(sops.filter(sop => sop.id !== deletingSOP.id));
        setShowDeleteDialog(false);
        setDeletingSOP(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete SOP");
      }
    } catch (error) {
      alert("Failed to delete SOP");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      eventType: "",
      description: "",
      isGlobal: true,
      clientId: "",
      steps: [{ step: 1, action: "", details: "" }] as SOPStep[]
    });
    setSopDraft("");
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingSOP(null);
    resetForm();
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingSOP(null);
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

  const applyTemplate = (template: SOPTemplate) => {
    setFormData({
      ...formData,
      name: template.name,
      eventType: template.eventType,
      description: template.description,
      steps: template.steps,
    });
    setSopDraft("");
  };

  const convertDraftToForm = () => {
    const parsed = parseSOPDraft(sopDraft);
    if (!parsed.name && !parsed.description && !parsed.steps) {
      alert("Paste an SOP draft first.");
      return;
    }

    setFormData({
      ...formData,
      name: parsed.name || formData.name,
      eventType: parsed.eventType || formData.eventType,
      description: parsed.description || formData.description,
      steps: parsed.steps || formData.steps,
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
          <Loader className="w-8 h-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header Bar */}
      <HeaderBar
        module="Standard Operating Procedures"
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
            <Button onClick={() => setShowAddDialog(true)} className="rounded-full bg-[var(--rce-green)] text-primary-foreground hover:bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add New SOP
            </Button>
          </div>
        </div>

        {/* SOPs Table */}
        {filteredSOPs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No SOPs found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? "No SOPs match your search criteria." : "Get started by creating your first SOP."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddDialog(true)} className="rounded-full bg-[var(--rce-green)] text-primary-foreground hover:bg-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First SOP
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none rounded-md">
            {/* <CardHeader>
              <CardTitle>SOPs</CardTitle>
              <CardDescription>
                Manage standard operating procedures for staff responses to events
              </CardDescription>
            </CardHeader> */}
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SOP Name</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSOPs.map((sop) => (
                    <TableRow key={sop.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium">{sop.name}</div>
                            {sop.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {sop.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sop.eventType}</Badge>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{sop.steps.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sop.isActive ? "default" : "secondary"}>
                          {sop.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <span>{new Date(sop.createdAt).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Edit SOP"
                            onClick={() => handleEdit(sop)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete SOP"
                            onClick={() => {
                              setDeletingSOP(sop);
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
            {/* Quick Start */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium">Quick Start</h3>
                <p className="text-sm text-muted-foreground">
                  Start from a common SOP template or paste a written SOP and convert it into steps.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sopTemplates.map((template) => (
                  <Button
                    key={template.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                  >
                    Use {template.label}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sop-draft">Paste SOP Draft</Label>
                <Textarea
                  id="sop-draft"
                  value={sopDraft}
                  onChange={(e) => setSopDraft(e.target.value)}
                  placeholder={`Example:\nAlert Response SOP\nPurpose\nEnsure all alerts are responded to consistently and safely.\nProcedure\nStep 1: Immediate Contact\nCall client via tablet or wristband.\nStep 2: Assess Situation\nIf no response, escalate.`}
                  rows={6}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={convertDraftToForm}
                >
                  Convert Draft to Form
                </Button>
              </div>
            </div>

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

      {/* Edit SOP Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SOP</DialogTitle>
            <DialogDescription>
              Update the standard operating procedure
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">SOP Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Fall Detection Response"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-eventType">Event Type *</Label>
                  <Input
                    id="edit-eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., fall, intrusion, medical"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
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
                    id="edit-global"
                    name="edit-scope"
                    title="Global (applies to all clients)"
                    checked={formData.isGlobal}
                    onChange={() => setFormData({ ...formData, isGlobal: true, clientId: "" })}
                  />
                  <Label htmlFor="edit-global" className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Global (applies to all clients)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="edit-client-specific"
                    name="edit-scope"
                    title="Client-specific (applies to a specific client)"
                    checked={!formData.isGlobal}
                    onChange={() => setFormData({ ...formData, isGlobal: false })}
                  />
                  <Label htmlFor="edit-client-specific" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Client-specific</span>
                  </Label>
                </div>
                {!formData.isGlobal && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-clientId">Select Client</Label>
                    <select
                      id="edit-clientId"
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
                      <Label htmlFor={`edit-action-${index}`}>Action *</Label>
                      <Input
                        id={`edit-action-${index}`}
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                        placeholder="e.g., Attempt contact with client"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit-details-${index}`}>Details</Label>
                      <Textarea
                        id={`edit-details-${index}`}
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
                onClick={handleCancelEdit}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update SOP"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SOP</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingSOP?.name}&quot;? This action cannot be undone.
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
              {submitting ? "Deleting..." : "Delete SOP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SupportSense Assistant Icon */}
      <AssistantIcon
        module="Standard Operating Procedures"
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
