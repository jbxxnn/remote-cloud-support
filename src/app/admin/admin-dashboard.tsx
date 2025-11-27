"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StatsCard } from "@/components/ui/stats-card";
import { HeaderBar } from "@/components/layout/header-bar";
import { 
  Users, 
  Shield, 
  Activity, 
  Database, 
  Plus, 
  Search,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Loader
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  _count?: {
    devices: number;
    detections: number;
    users: number;
  };
}

interface Device {
  id: string;
  name: string;
  deviceId: string;
  location?: string;
  deviceType: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    detections: number;
  };
}

interface AdminDashboardProps {
  user: any;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");


  useEffect(() => {
    fetchClients();
    fetchDevices();
    fetchStaffCount();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      }
    } catch {
      console.error("Failed to fetch devices");
    }
  };

  const fetchStaffCount = async () => {
    try {
      const response = await fetch("/api/users?role=staff");
      if (response.ok) {
        const data = await response.json();
        setStaffCount(data.length);
      }
    } catch (error) {
      console.error("Failed to fetch staff count:", error);
    }
  };



  // Calculate stats
  const totalClients = clients.length;
  const totalDevices = devices.length;
  const totalDetections = clients.reduce((sum, client) => sum + (client._count?.detections || 0), 0);
  const activeClients = clients.filter(client => client.isActive).length;
  const totalStaff = staffCount;

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
        module="Admin Dashboard"
        activeAlerts={0} // TODO: Get actual active alerts count
        staffOnline={staffCount}
        openSOPs={0} // TODO: Get actual open SOPs count
        onAssistantClick={() => {
          // TODO: Open Assistant drawer
          console.log("Assistant clicked");
        }}
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Clients"
            value={totalClients}
            description="Active and inactive clients"
            icon={Users}
          />
          <StatsCard
            title="Total Devices"
            value={totalDevices}
            description="Connected devices"
            icon={Database}
          />
          <StatsCard
            title="Total Detections"
            value={totalDetections}
            description="Security events detected"
            icon={Activity}
          />
          <StatsCard
            title="Staff Members"
            value={totalStaff}
            description="Active staff accounts"
            icon={Shield}
          />
        </div>

        {/* Tabs */}
        {/* <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Clients</CardTitle>
                  <CardDescription>
                    Latest clients added to the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clients.slice(0, 5).map((client) => (
                      <div key={client.id} className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest security detections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clients.slice(0, 5).map((client) => (
                      <div key={client.id} className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Activity className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {client._count?.detections || 0} detections
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {client.name}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(client.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
                <p className="text-muted-foreground">
                  Manage your client accounts and settings
                </p>
              </div>
              <Button asChild>
                <a href="/admin/clients">
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Clients
                </a>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
                <CardDescription>
                  Quick overview of your clients. Click &quot;Manage Clients&quot; for detailed management.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No clients found. Add your first client in the client management page.</p>
                    <Button asChild className="mt-4">
                      <a href="/admin/clients">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Client
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clients.slice(0, 3).map((client) => (
                      <div key={client.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{client.name}</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              client.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                              {client.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          {client.company && (
                            <p className="text-xs text-muted-foreground">{client.company}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {client._count?.devices || 0} devices
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {client._count?.detections || 0} detections
                          </div>
                        </div>
                      </div>
                    ))}
                    {clients.length > 3 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          Showing 3 of {clients.length} clients
                        </p>
                        <Button asChild variant="outline" className="mt-2">
                          <a href="/admin/clients">View All Clients</a>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Devices</h2>
              <p className="text-muted-foreground">
                Monitor and manage connected devices
              </p>
              </div>
              <Button asChild>
                <a href="/admin/devices">
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Devices
                </a>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Devices</CardTitle>
                <CardDescription>
                  {devices.length} device{devices.length !== 1 ? 's' : ''} connected
                </CardDescription>
              </CardHeader>
              <CardContent>
                {devices.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No devices found. Devices will be automatically created when detections are received.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {devices.map((device) => (
                      <div key={device.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Database className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{device.name}</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              device.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                              {device.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{device.deviceId}</p>
                          <p className="text-xs text-muted-foreground">{device.deviceType}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {device._count?.detections || 0} detections
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {device.location || "No location"}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs> */}
        </div>
      </div>
    </div>
  );
} 