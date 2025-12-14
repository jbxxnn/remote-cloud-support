// Context data types
export interface ClientData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  status?: string;
  isActive?: boolean;
}

export interface AlertData {
  id: string;
  type: string;
  status: string;
  message: string;
  severity?: string;
  location?: string;
  detectionType?: string;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
}

export interface SOPData {
  id: string;
  name: string;
  eventType: string;
  description?: string;
  steps: any[];
  isGlobal?: boolean;
}

export interface SOPResponseData {
  id: string;
  sopId: string;
  alertId?: string;
  status: string;
  completedSteps: any[];
  notes?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AssistantContext {
  role: 'staff' | 'admin';
  module: string;
  client_id?: string;
  event_id?: string;
  sop_id?: string;
  sop_response_id?: string;
  alert_id?: string;
  userRole: string;
  context?: {
    client?: ClientData;
    alert?: AlertData;
    sop?: SOPData;
    sopResponse?: SOPResponseData;
    validation?: any; // ValidationResult from validation framework
    record?: any; // Record data for validation
  };
}

export interface AssistantContextPayload extends AssistantContext {
  timestamp: string;
  pageUrl: string;
}







