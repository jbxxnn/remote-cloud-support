"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { LiveAlertsFeed } from "@/components/staff/live-alerts-feed";
import { ActiveClientsGrid } from "@/components/staff/active-clients-grid";
import { SystemSnapshot } from "@/components/staff/system-snapshot";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company?: string;
  status: 'online' | 'scheduled' | 'alert';
  lastEvent?: {
    type: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    message?: string;
    acknowledged?: boolean;
    resolved?: boolean;
    id?: string;
  };
  deviceCount: number;
  isActive: boolean;
  _acknowledging?: boolean;
}

interface StaffDashboardProps {
  user: any;
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates (polling for now, could be WebSocket later)
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch clients with their current status
      const clientsResponse = await fetch('/api/staff/clients');
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData);
      } else {
        throw new Error(`Failed to fetch clients: ${clientsResponse.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };


  const handleClientClick = (client: Client) => {
    // Navigate to client dashboard
    window.location.href = `/staff/client/${client.id}`;
  };

  const handleAlertClick = (alert: any) => {
    // Navigate to client dashboard with alert context
    if (alert.clientId) {
      window.location.href = `/staff/client/${alert.clientId}`;
    }
  };

  // Calculate stats for sidebar based on real client data
  const stats = {
    pendingEvents: loading ? 0 : clients.filter(c => c.status === 'alert').length,
    myQueue: 0, // No longer tracking events
    resolvedToday: 0 // No longer tracking events
  };

  // Show error state if there's an error
  if (error && !loading) {
    return (
      <div className="flex h-screen">
        <StaffSidebar user={user} stats={stats} />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Dashboard</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeAlertsCount = clients.filter(c => c.status === 'alert').length;
  const openSOPsCount = clients.reduce((acc, client) => {
    if (client.lastEvent && !client.lastEvent.resolved) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return (
    <div className="flex h-screen">
      <StaffSidebar 
        user={user}
        stats={stats}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <HeaderBar
          module="Staff Dashboard"
          activeAlerts={activeAlertsCount}
          staffOnline={1} // TODO: Get actual staff online count
          openSOPs={openSOPsCount}
          onAssistantClick={() => setAssistantOpen(true)}
        />

        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 h-full">
            {/* Left Column: Live Alerts Feed */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-1">Live Alerts</h2>
                <p className="text-xs text-muted-foreground">Real-time alert feed</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <LiveAlertsFeed onAlertClick={handleAlertClick} />
              </div>
            </div>

            {/* Center Column: Active Clients Grid */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-1">Active Clients</h2>
                <p className="text-xs text-muted-foreground">
                  {clients.length} active client{clients.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                <ActiveClientsGrid 
                  clients={clients} 
                  loading={loading}
                  onClientClick={handleClientClick}
                />
              </div>
            </div>

            {/* Right Column: System Snapshot */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-1">System Snapshot</h2>
                <p className="text-xs text-muted-foreground">System status overview</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SystemSnapshot
                  activeAlerts={activeAlertsCount}
                  openSOPs={openSOPsCount}
                  staffOnline={1} // TODO: Get actual staff online count
                />
              </div>
            </div>
          </div>
        </div>

        {/* SupportSense Assistant Icon */}
        <AssistantIcon
          module="Staff Dashboard"
          userRole="staff"
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