"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertTriangle, FileText, Phone, CheckCircle, ArrowLeft, Play, X, Loader, PlayCircle, HelpCircle } from "lucide-react";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { SOPResponseForm } from "@/components/sops/sop-response-form";
import { AlertTimeline } from "@/components/alerts/alert-timeline";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { contextService } from "@/lib/assistant/context-service";
import { useAssistant } from "@/hooks/use-assistant";


interface Alert {
  id: string;
  type: string;
  status: string;
  message: string;
  sentAt: string;
  createdAt: string;
  location: string;
  clipUrl: string | null;
  severity: string;
  detectionType: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  address?: string;
  notes?: string;
  serviceProviderId?: string;
  status: string;
  emergencyServices?: {
    name: string;
    phone: string;
    address: string;
  };
}

interface SOP {
  id: string;
  name: string;
  description: string;
  eventType: string;
  steps: any[];
}

function getStatusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-500";
    case "inactive": return "bg-gray-400";
    case "alert": return "bg-red-500";
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

// Modal component for alert details
function AlertModal({ alert, onClose, onAcknowledge, onResolve, actionNotes, setActionNotes, outcome, setOutcome, handleStartCall, relevantSOPs, clientName, onStartSOP, staffId, onGetNotesHelp }: any) {
  if (!alert) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-0 relative animate-fade-in border border-border">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-2">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border border-border text-xl font-bold text-foreground">
            {clientName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg text-foreground leading-tight">{clientName}</div>
            <div className="flex items-center gap-2 mt-1">
              {alert.status === 'scheduled' && ( 
                <div className="bg-yellow-500 rounded-full w-3 h-3"></div>
              )}
              <span className="text-xs text-muted-foreground capitalize">{alert.status}</span>
            </div>
          </div>
        </div>
        {/* Alert Info */}
        <div className="px-6 pt-2 pb-0">
         <div className="text-sm text-foreground font-medium mb-1">{alert.message}</div>
          <div className="text-xs text-muted-foreground mb-2">{new Date(alert.createdAt).toLocaleTimeString()}</div>
          {alert.detectionType && (
            <div className="text-xs text-muted-foreground mb-8">
              Detection Type: <span className="font-medium capitalize">{alert.detectionType.replace(/_/g, ' ')}</span>
            </div>
          )}
          <div className="flex gap-3 mb-2">
            {alert.clipUrl && (
              <Button size="sm" variant="default" className="flex items-center gap-1">
                <Play className="w-4 h-4" /> View Clip
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={handleStartCall}>
              <Phone className="w-4 h-4" /> Start Call
            </Button>
            {alert.status === 'pending' && (
              <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950" onClick={() => onAcknowledge(alert.id)}>
                <CheckCircle className="w-4 h-4 mr-1" /> Acknowledge
              </Button>
            )}
          </div>
        </div>
        {/* Event Notes - Only show if not pending */}
        {alert.status !== 'pending' && (
          <>
            <div className="px-6 pt-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium block text-foreground">Event Notes</label>
                {onGetNotesHelp && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={onGetNotesHelp}
                  >
                    <HelpCircle className="w-3 h-3 mr-1" />
                    What should I write?
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="What did you do? (e.g., 'Attempted contact via Google Meet - no answer')"
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                rows={3}
                className="mb-3"
              />
              <label className="text-xs font-medium mb-1 block text-foreground">Outcome</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
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
            {/* Modal Actions - Only show if not pending */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={onResolve} disabled={!actionNotes.trim()}>Resolve</Button>
            </div>
          </>
        )}
        {/* Modal Actions for pending alerts - Only Cancel button */}
        {alert.status === 'pending' && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        )}
        {/* SOP Box */}
        <div className="px-6 pb-6">
          <div className="mt-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="font-semibold text-primary text-sm mb-2">
              Standard Operating Procedures
              {alert.detectionType && (
                <span className="text-xs font-normal text-primary/80 ml-2">
                  (for {alert.detectionType.replace(/_/g, ' ')} detection)
                </span>
              )}
            </div>
            {relevantSOPs.length === 0 ? (
              <div className="text-muted-foreground text-xs">No relevant SOPs found for this detection type.</div>
            ) : (
              <div className="space-y-3">
                {relevantSOPs.map((sop: any) => (
                  <div key={sop.id} className="border-l-2 border-primary/30 pl-3">
                    <div className="font-medium text-primary text-sm mb-1">
                      {sop.name}
                      {sop.isGlobal && (
                        <span className="text-xs text-primary/70 ml-2">(Global)</span>
                      )}
                    </div>
                    {sop.description && (
                      <div className="text-xs text-primary/80 mb-2">{sop.description}</div>
                    )}
                    {sop.steps && Array.isArray(sop.steps) && (
                      <ol className="list-decimal list-inside text-xs text-foreground space-y-1 mb-2">
                        {sop.steps.map((step: any, idx: number) => {
                          let stepText = '';
                          if (typeof step === 'string') {
                            stepText = step;
                          } else if (typeof step === 'object' && step.action) {
                            stepText = step.action;
                          } else if (typeof step === 'object') {
                            // Fallback to other properties
                            stepText = step.step || step.description || step.text || step.content || '';
                          }
                          return (
                            <li key={idx}>
                              {stepText || `Step ${idx + 1}`}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                    {/* Start SOP Response Button */}
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => onStartSOP?.(sop.id, alert.id)}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Start SOP Response
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInitialMessage, setAssistantInitialMessage] = useState<string | undefined>();
  
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>("active");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [relevantSOPs, setRelevantSOPs] = useState<SOP[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedSOPForResponse, setSelectedSOPForResponse] = useState<{ sopId: string; alertId?: string } | null>(null);
  const [sopResponseDialogOpen, setSopResponseDialogOpen] = useState(false);
  const [sopResponses, setSopResponses] = useState<any[]>([]);
  const [allClientSOPs, setAllClientSOPs] = useState<SOP[]>([]); // All SOPs for this client (not filtered by detection type)

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab]);

  // Debug alerts
  useEffect(() => {
    console.log('All alerts:', alerts);
    console.log('Filtered alerts:', alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)));
    console.log('Filtered length:', alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)).length);
  }, [alerts]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, []);

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/staff/clients/${clientId}`);
        if (response.ok) {
          const clientData = await response.json();
          setClient(clientData);
        }
      } catch (error) {
        console.error('Failed to fetch client:', error);
      }
    };

    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const status = selectedTab === 'active' ? 'pending,scheduled' : 'resolved';
        console.log('Fetching alerts with status:', status);
        const response = await fetch(`/api/staff/clients/${clientId}/alerts?status=${status}`);
        if (response.ok) {
          const alertsData = await response.json();
          console.log('API response:', alertsData);
          console.log('Is array?', Array.isArray(alertsData));
          setAlerts(Array.isArray(alertsData) ? alertsData : []);
        } else {
          console.error('API response not ok:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchAlerts();
    }
  }, [clientId, selectedTab]);

  // Fetch all SOPs for this client (for independent SOP starting)
  useEffect(() => {
    const fetchAllSOPs = async () => {
      try {
        const response = await fetch(`/api/staff/clients/${clientId}/sops`);
        if (response.ok) {
          const sopsData = await response.json();
          setAllClientSOPs(Array.isArray(sopsData) ? sopsData : []);
        }
      } catch (error) {
        console.error('Failed to fetch SOPs:', error);
      }
    };

    if (clientId) {
      fetchAllSOPs();
    }
  }, [clientId]);

  // Fetch relevant SOPs when an alert is selected
  const fetchRelevantSOPs = async (detectionType: string) => {
    try {
      console.log('[CLIENT PAGE] Fetching SOPs for detection type:', detectionType);
      const response = await fetch(`/api/staff/clients/${clientId}/sops?detectionType=${detectionType}`);
      if (response.ok) {
        const sopsData = await response.json();
        console.log('[CLIENT PAGE] SOPs received:', sopsData);
        // Debug the structure of steps
        sopsData.forEach((sop: any, index: number) => {
          console.log(`[CLIENT PAGE] SOP ${index + 1} steps:`, sop.steps);
          if (sop.steps && Array.isArray(sop.steps)) {
            sop.steps.forEach((step: any, stepIndex: number) => {
              console.log(`[CLIENT PAGE] Step ${stepIndex + 1}:`, step, 'Type:', typeof step);
            });
          }
        });
        setRelevantSOPs(Array.isArray(sopsData) ? sopsData : []);
      }
    } catch (error) {
      console.error('Failed to fetch relevant SOPs:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      console.log('[CLIENT PAGE] Acknowledging alert:', alertId);
      const response = await fetch(`/api/staff/clients/${clientId}/alerts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' })
      });

      if (response.ok) {
        console.log('[CLIENT PAGE] Alert acknowledged successfully');
        
        // Refresh the selected alert data to get updated status
        if (selectedAlert) {
          const status = selectedTab === 'active' ? 'pending,scheduled' : 'resolved';
          const alertsResponse = await fetch(`/api/staff/clients/${clientId}/alerts?status=${status}`);
          if (alertsResponse.ok) {
            const alertsData = await alertsResponse.json();
            const updatedAlerts = Array.isArray(alertsData) ? alertsData : [];
            
            // Find and update the selected alert
            const updatedAlert = updatedAlerts.find((alert: any) => alert.id === selectedAlert.id);
            if (updatedAlert) {
              console.log('[CLIENT PAGE] Updating selected alert with new status:', updatedAlert.status);
              setSelectedAlert(updatedAlert);
            }
            
            // Also update the alerts list
            setAlerts(updatedAlerts);
          }
        }
      } else {
        console.error('[CLIENT PAGE] Failed to acknowledge alert:', response.status);
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleStartSOP = (sopId: string, alertId?: string) => {
    // Link SOP response to the alert if provided
    setSelectedSOPForResponse({ sopId, alertId });
    setSopResponseDialogOpen(true);
  };

  const handleSOPResponseComplete = () => {
    setSopResponseDialogOpen(false);
    setSelectedSOPForResponse(null);
    // Refresh SOP responses list
    fetch(`/api/sop-responses?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => setSopResponses(data))
      .catch(err => console.error('Failed to refresh SOP responses:', err));
  };

  const handleGetAlertNotesHelp = () => {
    // Set context for alert resolution
    contextService.setContext({
      role: 'staff',
      module: 'Alert Detail',
      client_id: clientId,
      event_id: selectedAlert?.id,
      userRole: 'staff',
    });

    // Open assistant with pre-filled notes help query
    setAssistantInitialMessage("What should I write in the alert resolution notes?");
    setAssistantOpen(true);
  };

  const handleResolveAlert = async () => {
    if (!selectedAlert || !actionNotes.trim()) return;

    try {
      const response = await fetch(`/api/staff/clients/${clientId}/alerts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resolve',
          notes: actionNotes,
          outcome,
          alertId: selectedAlert.id
        })
      });

      if (response.ok) {
        setSelectedAlert(null);
        setActionNotes("");
        setOutcome("");
        
        // Refresh alerts
        const status = selectedTab === 'active' ? 'pending,scheduled' : 'resolved';
        const alertsResponse = await fetch(`/api/staff/clients/${clientId}/alerts?status=${status}`);
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts(Array.isArray(alertsData) ? alertsData : []);
        }
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleStartCall = () => {
    // TODO: Implement call functionality
    console.log('Starting call...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-lg">
            <Loader className="w-8 h-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-lg">Client not found</div>
        </div>
      </div>
    );
  }

  // Get current alerts for pagination
  const getCurrentAlerts = () => {
    const filteredAlerts = selectedTab === 'active' 
      ? alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status))
      : alerts.filter(alert => alert.status === 'resolved');
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAlerts.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filteredAlerts = selectedTab === 'active' 
      ? alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status))
      : alerts.filter(alert => alert.status === 'resolved');
    return Math.ceil(filteredAlerts.length / itemsPerPage);
  };

  const activeAlertsCount = alerts.filter(a => ['pending', 'scheduled'].includes(a.status)).length;

  return (
    <div className="min-h-screen bg-background flex">
      <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
      <div className="flex-1 flex flex-col overflow-hidden">
       
        {/* Header Bar */}
        <HeaderBar
          module={`Client: ${client.name}`}
          activeAlerts={activeAlertsCount}
          staffOnline={1}
          openSOPs={relevantSOPs.length}
          onAssistantClick={() => setAssistantOpen(true)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Alerts Card */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">Alerts</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant={selectedTab === 'active' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setSelectedTab('active')}
                  >
                    Active
                  </Button>
                  <Button 
                    variant={selectedTab === 'history' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setSelectedTab('history')}
                  >
                    History
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 rounded-md">
                {selectedTab === 'active' ? (
                  alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No active alerts.</div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {getCurrentAlerts().map((alert) => (
                          <div key={alert.id} className="p-4 border border-border rounded-sm flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors bg-card" onClick={() => {
                            setSelectedAlert(alert);
                            // Fetch relevant SOPs based on detection type
                            if (alert.detectionType) {
                              fetchRelevantSOPs(alert.detectionType);
                            }
                          }}>
                            <div>
                              <div className="font-medium text-foreground">{alert.message}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(alert.createdAt).toLocaleString()} • {alert.location || 'Unknown location'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {alert.status === 'scheduled' && (
                                <div className="bg-yellow-500 rounded-full w-3 h-3"></div>
                              )}
                              {alert.status === 'resolved' && (
                                <div className="bg-green-500 rounded-full w-3 h-3"></div>
                              )}
                              {alert.status !== 'scheduled' && alert.status !== 'resolved' && (
                                <div className="bg-red-500 rounded-full w-3 h-3"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Pagination */}
                      {getTotalPages() > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                          <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)).length)} of {alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)).length} alerts
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="flex items-center px-3 text-sm text-foreground">
                              Page {currentPage} of {getTotalPages()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                              disabled={currentPage === getTotalPages()}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  alerts.filter(alert => alert.status === 'resolved').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No alert history.</div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {getCurrentAlerts().map((alert) => (
                          <div key={alert.id} className="p-4 border border-border rounded-sm flex items-center justify-between bg-card">
                            <div>
                              <div className="font-medium text-foreground">{alert.message}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(alert.createdAt).toLocaleString()} • {alert.location || 'Unknown location'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="default" className="bg-green-600 text-white">Resolved</Badge>
                              {/* {alert.clipUrl && <Button size="icon" variant="outline"><Play className="w-4 h-4" /></Button>} */}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Pagination for history */}
                      {getTotalPages() > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                          <div className="text-sm text-muted-foreground">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, alerts.filter(alert => alert.status === 'resolved').length)} of {alerts.filter(alert => alert.status === 'resolved').length} alerts
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="flex items-center px-3 text-sm text-foreground">
                              Page {currentPage} of {getTotalPages()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                              disabled={currentPage === getTotalPages()}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )
                )}

                {/* Alert Modal */}
                <AlertModal
                  alert={selectedAlert}
                  onClose={() => setSelectedAlert(null)}
                  onAcknowledge={handleAcknowledgeAlert}
                  onResolve={handleResolveAlert}
                  actionNotes={actionNotes}
                  setActionNotes={setActionNotes}
                  outcome={outcome}
                  setOutcome={setOutcome}
                  handleStartCall={handleStartCall}
                  relevantSOPs={relevantSOPs}
                  clientName={client.name}
                  onStartSOP={handleStartSOP}
                  staffId={currentUser?.id}
                  onGetNotesHelp={handleGetAlertNotesHelp}
                />
              </CardContent>
            </Card>


            <Card className="col-span-1 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Client Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`}></div>
                      <span className="text-sm font-medium capitalize text-foreground">{client.status}</span>
                    </div>
                  </div>

                  {/* Company */}
                  {client.company && (
                    <div>
                      <span className="text-sm text-foreground font-medium block mb-1">Company</span>
                      <span className="text-xs text-foreground">{client.company}</span>
                    </div>
                    
                  )}

                  {client.serviceProviderId && (
                    <div>
                      <span className="text-sm text-foreground font-medium block mb-1">Service Provider ID</span>
                      <span className="text-xs text-foreground">{client.serviceProviderId}</span>
                    </div>
                    
                  )}

                  {/* Contact Information */}
                  <div>
                    <span className="text-sm text-foreground font-medium block mb-2">Contact Information</span>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <span className="text-xs text-foreground">{client.email || 'Not provided'}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Phone:</span>
                          <span className="text-xs text-foreground">{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Emergency Services */}
                  {client.emergencyServices && (
                    <div>
                      <span className="text-sm text-foreground font-medium block mb-2">Emergency Contact</span>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Name:</span>
                          <span className="text-xs text-foreground">{client.emergencyServices.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Phone:</span>
                          <span className="text-xs text-foreground">{client.emergencyServices.phone}</span>
                        </div>
                        {client.emergencyServices.address && (
                          <div className="flex items-start space-x-2">
                            <span className="text-xs text-muted-foreground mt-0.5">Address:</span>
                            <span className="text-xs text-foreground">{client.emergencyServices.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Client Notes */}
                  {client.notes && (
                    <div>
                      <span className="text-sm font-medium text-foreground block mb-1">Client Notes</span>
                      <span className="text-xs text-muted-foreground font-mono">{client.notes}</span>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {/* <div className="pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600 block mb-2">Quick Actions</span>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={handleStartCall}
                      >
                        <Phone className="w-3 h-3 mr-2" />
                        Call Client
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="w-3 h-3 mr-2" />
                        View SOPs
                      </Button>
                    </div>
                  </div> */}
                </div>
              </CardContent>
            </Card>

            
            {/* Alert Timeline Card */}
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Alert Timeline</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  View all alerts and their activity for this client
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <AlertTimeline
                  clientId={clientId}
                  onAlertClick={(alertId) => {
                    window.location.href = `/staff/alerts/${alertId}`;
                  }}
                />
              </CardContent>
            </Card>

            {/* SOP Responses Card */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">SOP Responses</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  View and continue existing SOP responses
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {sopResponses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No SOP responses yet. Start an SOP response to see it here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sopResponses.map((response: any) => (
                      <div
                        key={response.id}
                        className="p-4 border border-border rounded-sm hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedSOPForResponse({ sopId: response.sopId, alertId: response.alertId });
                          setSopResponseDialogOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">{response.sopName || 'SOP Response'}</h4>
                          <Badge
                            variant={
                              response.status === 'completed'
                                ? 'default'
                                : response.status === 'in_progress'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={
                              response.status === 'completed'
                                ? 'bg-green-500/20 text-green-600'
                                : response.status === 'in_progress'
                                ? 'bg-yellow-500/20 text-yellow-600'
                                : 'bg-red-500/20 text-red-600'
                            }
                          >
                            {response.status === 'completed' ? 'Completed' : response.status === 'in_progress' ? 'In Progress' : 'Abandoned'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            Started: {new Date(response.startedAt).toLocaleString()}
                          </div>
                          {response.completedAt && (
                            <div>
                              Completed: {new Date(response.completedAt).toLocaleString()}
                            </div>
                          )}
                          {response.completedSteps && response.completedSteps.length > 0 && (
                            <div>
                              {response.completedSteps.length} step{response.completedSteps.length !== 1 ? 's' : ''} completed
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SOPs Card */}
            {/* Available SOPs Card - Start SOPs independently */}
            <Card className="col-span-1 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Available SOPs</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Start an SOP response for this client (not linked to an alert)
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {allClientSOPs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No SOPs available for this client.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allClientSOPs.map((sop: SOP) => (
                      <div
                        key={sop.id}
                        className="p-4 border border-border rounded-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{sop.name}</h4>
                            {sop.description && (
                              <p className="text-xs text-muted-foreground mb-2">{sop.description}</p>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Event Type: <span className="font-medium capitalize">{sop.eventType.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSOPForResponse({ sopId: sop.id }); // No alertId - independent SOP
                              setSopResponseDialogOpen(true);
                            }}
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Start SOP
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            
          </div>
        </main>

        {/* SupportSense Assistant Icon */}
        <AssistantIcon
          module="Client Dashboard"
          clientId={clientId}
          userRole="staff"
          drawerOpen={assistantOpen}
          onDrawerOpenChange={setAssistantOpen}
        />

        {/* SupportSense Assistant Drawer */}
        <AssistantDrawer
          open={assistantOpen}
          onOpenChange={(open) => {
            setAssistantOpen(open);
            if (!open) {
              setAssistantInitialMessage(undefined);
            }
          }}
          initialMessage={assistantInitialMessage}
        />

        {/* SOP Response Dialog */}
        <Dialog open={sopResponseDialogOpen} onOpenChange={setSopResponseDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>SOP Response</DialogTitle>
            </DialogHeader>
            {selectedSOPForResponse && currentUser && (
              <SOPResponseForm
                sopId={selectedSOPForResponse.sopId}
                clientId={clientId}
                alertId={selectedSOPForResponse.alertId}
                staffId={currentUser.id}
                onClose={() => {
                  setSopResponseDialogOpen(false);
                  setSelectedSOPForResponse(null);
                }}
                onComplete={handleSOPResponseComplete}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 