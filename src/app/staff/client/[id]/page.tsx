"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertTriangle, FileText, Phone, CheckCircle, ArrowLeft, Play, X, Loader } from "lucide-react";
import { StaffSidebar } from "@/components/ui/staff-sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";


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
function AlertModal({ alert, onClose, onAcknowledge, onResolve, actionNotes, setActionNotes, outcome, setOutcome, handleStartCall, relevantSOPs, clientName }: any) {
  if (!alert) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-0 relative animate-fade-in">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-2">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 text-xl font-bold text-gray-700">
            {clientName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg text-gray-900 leading-tight">{clientName}</div>
            <div className="flex items-center gap-2 mt-1">
              {alert.status === 'scheduled' && ( 
                <div className="bg-yellow-500 rounded-full w-3 h-3"></div>
              )}
              <span className="text-xs text-gray-500">{alert.status}</span>
            </div>
          </div>
        </div>
        {/* Alert Info */}
        <div className="px-6 pt-2 pb-0">
         <div className="text-sm text-gray-700 font-medium mb-1">{alert.message}</div>
          <div className="text-xs text-gray-500 mb-2">{new Date(alert.createdAt).toLocaleTimeString()}</div>
          {alert.detectionType && (
            <div className="text-xs text-gray-500 mb-8">
              Detection Type: <span className="font-medium capitalize">{alert.detectionType.replace(/_/g, ' ')}</span>
            </div>
          )}
          <div className="flex gap-3 mb-2">
            {alert.clipUrl && (
              <Button size="sm" variant="default" className="border-gray-300 flex items-center gap-1">
                <Play className="w-4 h-4" /> View Clip
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-gray-300 flex items-center gap-1" onClick={handleStartCall}>
              <Phone className="w-4 h-4" /> Start Call
            </Button>
            {alert.status === 'pending' && (
              <Button size="sm" className="text-green-700 border-green-600 bg-green-50 hover:bg-green-100 border" onClick={() => onAcknowledge(alert.id)}>
                <CheckCircle className="w-4 h-4 mr-1" /> Acknowledge
              </Button>
            )}
          </div>
        </div>
        {/* Event Notes - Only show if not pending */}
        {alert.status !== 'pending' && (
          <>
            <div className="px-6 pt-2">
              <label className="text-xs font-medium mb-1 block text-gray-700">Event Notes</label>
              <Textarea
                placeholder="What did you do? (e.g., 'Attempted contact via Google Meet - no answer')"
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                rows={3}
                className="border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-md mb-3"
              />
              <label className="text-xs font-medium mb-1 block text-gray-700">Outcome</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-md">
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
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" onClick={onClose} className="border-gray-300">Cancel</Button>
              <Button onClick={onResolve} disabled={!actionNotes.trim()} className="bg-black hover:bg-gray-800 text-white disabled:bg-gray-300 disabled:text-gray-500">Resolve</Button>
            </div>
          </>
        )}
        {/* Modal Actions for pending alerts - Only Cancel button */}
        {alert.status === 'pending' && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <Button variant="outline" onClick={onClose} className="border-gray-300">Cancel</Button>
          </div>
        )}
        {/* SOP Box */}
        <div className="px-6 pb-6">
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-semibold text-blue-900 text-sm mb-2">
              Standard Operating Procedures
              {alert.detectionType && (
                <span className="text-xs font-normal text-blue-700 ml-2">
                  (for {alert.detectionType.replace(/_/g, ' ')} detection)
                </span>
              )}
            </div>
            {relevantSOPs.length === 0 ? (
              <div className="text-blue-800 text-xs">No relevant SOPs found for this detection type.</div>
            ) : (
              <div className="space-y-3">
                {relevantSOPs.map((sop: any) => (
                  <div key={sop.id} className="border-l-2 border-blue-300 pl-3">
                    <div className="font-medium text-blue-900 text-sm mb-1">
                      {sop.name}
                      {sop.isGlobal && (
                        <span className="text-xs text-blue-600 ml-2">(Global)</span>
                      )}
                    </div>
                    {sop.description && (
                      <div className="text-xs text-blue-700 mb-2">{sop.description}</div>
                    )}
                    {sop.steps && Array.isArray(sop.steps) && (
                      <ol className="list-decimal list-inside text-xs text-blue-800 space-y-1">
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

  // Fetch SOPs
  useEffect(() => {
    const fetchSOPs = async () => {
      try {
        const response = await fetch(`/api/staff/clients/${clientId}/sops`);
        if (response.ok) {
          const sopsData = await response.json();
          setRelevantSOPs(Array.isArray(sopsData) ? sopsData : []);
        }
      } catch (error) {
        console.error('Failed to fetch SOPs:', error);
      }
    };

    if (clientId) {
      fetchSOPs();
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
      <div className="min-h-screen bg-gray-50 flex">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-lg">
            <Loader className="w-8 h-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <StaffSidebar user={undefined} stats={{ pendingEvents: 0, myQueue: 0, resolvedToday: 0 }} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 text-lg">Client not found</div>
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
        {/* Client Info Bar */}
        <div className="flex items-center space-x-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
          <Link href="/staff">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center border">
              <span className="text-lg font-semibold">{client.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">{client.name}</h1>
            </div>
          </div>
        </div>
        {/* Header Bar */}
        <HeaderBar
          module={`Client: ${client.name}`}
          activeAlerts={activeAlertsCount}
          staffOnline={1}
          openSOPs={relevantSOPs.length}
          onAssistantClick={() => setAssistantOpen(true)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Overview Card */}
            {/* <Card className="col-span-1 lg:col-span-1 shadow-sm rounded-xl border border-gray-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Primary Contact</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {client.emergencyServices ? (
                  <>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center border border-gray-300">
                        <span className="text-lg font-semibold text-gray-600">{client.emergencyServices.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{client.emergencyServices.name}</div>
                        <div className="text-xs text-gray-500">{client.emergencyServices.phone}</div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 mb-1 font-medium">Address</div>
                      <div className="text-sm text-gray-700">{client.emergencyServices.address}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 text-sm">No emergency contact information available.</div>
                )}
              </CardContent>
            </Card> */}

            {/* Alerts Card */}
            <Card className="col-span-1 lg:col-span-2 shadow-sm rounded-md border border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Alerts</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant={selectedTab === 'active' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setSelectedTab('active')}
                    className={selectedTab === 'active' ? 'bg-black hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                  >
                    Active
                  </Button>
                  <Button 
                    variant={selectedTab === 'history' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setSelectedTab('history')}
                    className={selectedTab === 'history' ? 'bg-black hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                  >
                    History
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 rounded-md">
                {selectedTab === 'active' ? (
                  alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No active alerts.</div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {getCurrentAlerts().map((alert) => (
                          <div key={alert.id} className="p-4 border border-gray-200 rounded-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors bg-white" onClick={() => {
                            setSelectedAlert(alert);
                            // Fetch relevant SOPs based on detection type
                            if (alert.detectionType) {
                              fetchRelevantSOPs(alert.detectionType);
                            }
                          }}>
                            <div>
                              <div className="font-medium text-gray-900">{alert.message}</div>
                              <div className="text-xs text-gray-500">
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
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)).length)} of {alerts.filter(alert => ['pending', 'scheduled'].includes(alert.status)).length} alerts
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="border-gray-300"
                            >
                              Previous
                            </Button>
                            <span className="flex items-center px-3 text-sm text-gray-700">
                              Page {currentPage} of {getTotalPages()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                              disabled={currentPage === getTotalPages()}
                              className="border-gray-300"
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
                    <div className="text-center py-8 text-gray-500 text-sm">No alert history.</div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {getCurrentAlerts().map((alert) => (
                          <div key={alert.id} className="p-4 border border-gray-200 rounded-sm flex items-center justify-between bg-white">
                            <div>
                              <div className="font-medium text-gray-900">{alert.message}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(alert.createdAt).toLocaleString()} • {alert.location || 'Unknown location'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="default" className="bg-green-600 text-white">Resolved</Badge>
                              {/* {alert.clipUrl && <Button size="icon" variant="outline" className="border-gray-300"><Play className="w-4 h-4" /></Button>} */}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Pagination for history */}
                      {getTotalPages() > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, alerts.filter(alert => alert.status === 'resolved').length)} of {alerts.filter(alert => alert.status === 'resolved').length} alerts
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="border-gray-300"
                            >
                              Previous
                            </Button>
                            <span className="flex items-center px-3 text-sm text-gray-700">
                              Page {currentPage} of {getTotalPages()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                              disabled={currentPage === getTotalPages()}
                              className="border-gray-300"
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
                />
              </CardContent>
            </Card>

            {/* SOPs Card */}
            <Card className="col-span-1 lg:col-span-1 shadow-sm rounded-sm border border-gray-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Client Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`}></div>
                      <span className="text-sm font-medium capitalize">{client.status}</span>
                    </div>
                  </div>

                  {/* Company */}
                  {client.company && (
                    <div>
                      <span className="text-sm text-gray-900 font-medium block mb-1">Company</span>
                      <span className="text-xs text-gray-900">{client.company}</span>
                    </div>
                    
                  )}

                  {client.serviceProviderId && (
                    <div>
                      <span className="text-sm text-gray-900 font-medium block mb-1">Service Provider ID</span>
                      <span className="text-xs text-gray-900">{client.serviceProviderId}</span>
                    </div>
                    
                  )}

                  {/* Contact Information */}
                  <div>
                    <span className="text-sm text-gray-900 font-medium block mb-2">Contact Information</span>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Email:</span>
                        <span className="text-xs text-gray-900">{client.email || 'Not provided'}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Phone:</span>
                          <span className="text-xs text-gray-900">{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Emergency Services */}
                  {client.emergencyServices && (
                    <div>
                      <span className="text-sm text-gray-900 font-medium block mb-2">Emergency Contact</span>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Name:</span>
                          <span className="text-xs text-gray-900">{client.emergencyServices.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Phone:</span>
                          <span className="text-xs text-gray-900">{client.emergencyServices.phone}</span>
                        </div>
                        {client.emergencyServices.address && (
                          <div className="flex items-start space-x-2">
                            <span className="text-xs text-gray-500 mt-0.5">Address:</span>
                            <span className="text-xs text-gray-900">{client.emergencyServices.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Client Notes */}
                  {client.notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-900 block mb-1">Client Notes</span>
                      <span className="text-xs text-gray-600 font-mono">{client.notes}</span>
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
          onOpenChange={setAssistantOpen}
        />
      </div>
    </div>
  );
} 