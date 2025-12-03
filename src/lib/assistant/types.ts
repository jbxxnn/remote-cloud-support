export interface AssistantContext {
  role: 'staff' | 'admin';
  module: string;
  client_id?: string;
  event_id?: string;
  sop_id?: string;
  userRole: string;
}

export interface AssistantContextPayload extends AssistantContext {
  timestamp: string;
  pageUrl: string;
}





