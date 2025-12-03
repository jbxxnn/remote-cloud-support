"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeaderBar } from "@/components/layout/header-bar";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { 
  Plus, 
  Search, 
  Filter,
  Eye, 
  Edit, 
  Trash2, 
  Database,
  Camera,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Settings,
  Loader
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Database01Icon } from "@hugeicons/core-free-icons";

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
}

interface Device {
  id: string;
  clientId: string;
  name: string;
  deviceId: string;
  location?: string;
  deviceType: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  aiBehavior?: string[];
  eventTypes?: string[];
  subjectLineMatch?: string;
  homeAssistantEntityId?: string;
  status: string;
  lastSeen?: string;
  isActive: boolean;
  metadata?: any;
  createdAt: string;
  client?: Client;
  _count?: {
    detections: number;
  };
}

interface DeviceFormData {
  deviceType: string;
  location: string;
  deviceId: string;
}

const DEVICE_TYPES = [
  { value: "camera", label: "Camera", icon: Camera },
  { value: "contact_sensor", label: "Contact Sensor", icon: Database },
  { value: "motion_sensor", label: "Motion Sensor", icon: Database },
  { value: "stove_monitor", label: "Stove Monitor", icon: AlertTriangle },
  { value: "bed_sensor", label: "Bed Sensor", icon: Database },
  { value: "door_sensor", label: "Door Sensor", icon: Database },
  { value: "window_sensor", label: "Window Sensor", icon: Database },
  { value: "smoke_detector", label: "Smoke Detector", icon: AlertTriangle },
  { value: "water_leak", label: "Water Leak Sensor", icon: AlertTriangle },
  { value: "temperature", label: "Temperature Sensor", icon: Database },
  { value: "other", label: "Other", icon: Database },
];

const AI_BEHAVIORS = [
  "fall_detection",
  "motion_detection", 
  "door_opened",
  "door_closed",
  "window_opened",
  "window_closed",
  "stove_on",
  "stove_off",
  "smoke_detected",
  "water_leak",
  "temperature_alert",
  "bed_occupied",
  "bed_empty",
  "person_detected",
  "no_person_detected"
];

const EVENT_TYPES = [
  "fall",
  "motion",
  "door_opened",
  "door_closed",
  "window_opened", 
  "window_closed",
  "stove_on",
  "stove_off",
  "smoke",
  "water_leak",
  "temperature_high",
  "temperature_low",
  "bed_occupied",
  "bed_empty",
  "person_detected",
  "no_person_detected",
  "maintenance_required",
  "offline"
];

export function DeviceManagement() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<DeviceFormData>({
    deviceType: "camera",
    location: "",
    deviceId: "",
  });

  useEffect(() => {
    fetchDevices();
    fetchClients();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error);
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

  const handleCreateDevice = async () => {
    // Validate required fields
    if (!formData.location || !formData.deviceId) {
      alert("Please fill in all required fields: Location and Device ID");
      return;
    }

    try {
      const requestBody = {
        ...formData,
        name: formData.location,
        clientId: null, // Devices are global, not tied to specific clients
      };
      
      console.log("Sending device creation request:", requestBody);
      
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setFormData({
          deviceType: "camera",
          location: "",
          deviceId: "",
        });
        fetchDevices();
      } else {
        const error = await response.json();
        alert(`Failed to create device: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to create device:", error);
      alert("Failed to create device");
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;

    try {
      const response = await fetch(`/api/devices/${editingDevice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          name: formData.location,
          clientId: editingDevice.clientId, // Keep existing clientId for updates
        }),
      });

      if (response.ok) {
        setIsEditDialogOpen(false);
        setEditingDevice(null);
        setFormData({
          deviceType: "camera",
          location: "",
          deviceId: "",
        });
        fetchDevices();
      } else {
        const error = await response.json();
        alert(`Failed to update device: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to update device:", error);
      alert("Failed to update device");
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to delete this device?")) return;

    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDevices();
      } else {
        const error = await response.json();
        alert(`Failed to delete device: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to delete device:", error);
      alert("Failed to delete device");
    }
  };

  const openEditDialog = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      deviceType: device.deviceType,
      location: device.location || "",
      deviceId: device.deviceId,
    });
    setIsEditDialogOpen(true);
  };

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedDeviceType === "all" || device.deviceType === selectedDeviceType;
    const matchesStatus = selectedStatus === "all" || device.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getDeviceTypeIcon = (deviceType: string) => {
    const type = DEVICE_TYPES.find(t => t.value === deviceType);
    return type ? type.icon : Database;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-100 text-green-800";
      case "offline": return "bg-red-100 text-red-800";
      case "error": return "bg-yellow-100 text-yellow-800";
      case "maintenance": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
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
        module="Device Management"
        activeAlerts={0} // TODO: Get actual active alerts count
        staffOnline={0} // TODO: Get actual staff online count
        openSOPs={0} // TODO: Get actual open SOPs count
        onAssistantClick={() => setAssistantOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Filters */}
        <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedDeviceType} onValueChange={setSelectedDeviceType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DEVICE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-[var(--rce-green)] text-primary-foreground hover:bg-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Configure a new device or sensor for a client.
                </DialogDescription>
              </DialogHeader>
              <DeviceForm 
                formData={formData}
                setFormData={setFormData}
                clients={clients}
                onSubmit={handleCreateDevice}
                submitLabel="Create Device"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Devices ({filteredDevices.length})</h2>
            <p className="text-sm text-muted-foreground">
              Manage all connected devices and sensors
            </p>
          </div>
        </div>

        {filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HugeiconsIcon icon={Database01Icon} className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || selectedDeviceType !== "all" || selectedStatus !== "all"
                  ? "Try adjusting your filters to see more devices."
                  : "Get started by adding your first device."}
              </p>
              {!searchTerm && selectedDeviceType === "all" && selectedStatus === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-full bg-[var(--rce-green)] text-primary-foreground hover:bg-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Device
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none rounded-md">         
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => {
                const DeviceIcon = getDeviceTypeIcon(device.deviceType);
                return (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <DeviceIcon className="w-5 h-5 text-primary" />
                        <span>{device.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{device.deviceId}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-muted-foreground" />
                        {device.location || "Not specified"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {device.deviceType.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{device.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(device)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteDevice(device.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update device configuration and settings.
            </DialogDescription>
          </DialogHeader>
          <DeviceForm 
            formData={formData}
            setFormData={setFormData}
            clients={clients}
            onSubmit={handleUpdateDevice}
            submitLabel="Update Device"
          />
        </DialogContent>
      </Dialog>

      {/* SupportSense Assistant Icon */}
      <AssistantIcon
        module="Device Management"
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

interface DeviceFormProps {
  formData: DeviceFormData;
  setFormData: (data: DeviceFormData) => void;
  clients: Client[];
  onSubmit: () => void;
  submitLabel: string;
}

function DeviceForm({ formData, setFormData, clients, onSubmit, submitLabel }: DeviceFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deviceType">Device Type *</Label>
          <Select value={formData.deviceType} onValueChange={(value) => setFormData({ ...formData, deviceType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select device type" />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Front Door, Living Room"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deviceId">Device ID *</Label>
          <Input
            id="deviceId"
            value={formData.deviceId}
            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
            placeholder="e.g., camera_001"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
} 