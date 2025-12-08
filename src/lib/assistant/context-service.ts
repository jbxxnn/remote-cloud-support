import { AssistantContext, AssistantContextPayload, ClientData, AlertData, SOPData, SOPResponseData } from './types';

/**
 * Context Service for SupportSense Assistant
 * Tracks current module/context for assistant awareness
 */
class ContextService {
  private currentContext: AssistantContext | null = null;
  private listeners: ((context: AssistantContext | null) => void)[] = [];

  /**
   * Fetch related data for context
   */
  private async fetchContextData(context: AssistantContext): Promise<AssistantContext> {
    const enhancedContext = { ...context, context: {} };

    // Fetch client data if client_id is provided
    if (context.client_id && typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/staff/clients/${context.client_id}`);
        if (response.ok) {
          const clientData = await response.json();
          enhancedContext.context!.client = {
            id: clientData.id,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            company: clientData.company,
            address: clientData.address,
            status: clientData.status,
            isActive: clientData.isActive,
          };
        }
      } catch (error) {
        console.error('Failed to fetch client data:', error);
      }
    }

    // Fetch alert data if alert_id is provided
    if (context.alert_id && typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/alerts/${context.alert_id}/summary`);
        if (response.ok) {
          const data = await response.json();
          const alert = data.alert;
          enhancedContext.context!.alert = {
            id: alert.id,
            type: alert.type,
            status: alert.status,
            message: alert.message,
            severity: alert.severity || alert.detectionType?.severity,
            location: alert.location,
            detectionType: alert.detectionType,
            createdAt: alert.createdAt,
            updatedAt: alert.updatedAt,
            assignedTo: alert.assignedTo,
          };
        }
      } catch (error) {
        console.error('Failed to fetch alert data:', error);
        // Fallback: try direct alert endpoint
        try {
          const directResponse = await fetch(`/api/staff/clients/${context.client_id}/alerts`);
          if (directResponse.ok) {
            const alerts = await directResponse.json();
            const alert = alerts.find((a: any) => a.id === context.alert_id);
            if (alert) {
              enhancedContext.context!.alert = {
                id: alert.id,
                type: alert.type,
                status: alert.status,
                message: alert.message,
                severity: alert.severity,
                location: alert.location,
                detectionType: alert.detectionType,
                createdAt: alert.createdAt,
                updatedAt: alert.updatedAt,
                assignedTo: alert.assignedTo,
              };
            }
          }
        } catch (fallbackError) {
          console.error('Failed to fetch alert data (fallback):', fallbackError);
        }
      }
    }

    // Fetch SOP data if sop_id is provided
    if (context.sop_id && typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/sops/${context.sop_id}`);
        if (response.ok) {
          const sopData = await response.json();
          enhancedContext.context!.sop = {
            id: sopData.id,
            name: sopData.name,
            eventType: sopData.eventType,
            description: sopData.description,
            steps: sopData.steps,
            isGlobal: sopData.isGlobal,
          };
        }
      } catch (error) {
        console.error('Failed to fetch SOP data:', error);
      }
    }

    // Fetch SOP response data if sop_response_id is provided
    if (context.sop_response_id && typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/sop-responses/${context.sop_response_id}`);
        if (response.ok) {
          const sopResponseData = await response.json();
          enhancedContext.context!.sopResponse = {
            id: sopResponseData.id,
            sopId: sopResponseData.sopId,
            alertId: sopResponseData.alertId,
            status: sopResponseData.status,
            completedSteps: sopResponseData.completedSteps,
            notes: sopResponseData.notes,
            startedAt: sopResponseData.startedAt,
            completedAt: sopResponseData.completedAt,
          };
        }
      } catch (error) {
        console.error('Failed to fetch SOP response data:', error);
      }
    }

    return enhancedContext;
  }

  /**
   * Set the current context and fetch related data
   */
  async setContext(context: AssistantContext): Promise<void> {
    this.currentContext = await this.fetchContextData(context);
    this.notifyListeners();
  }

  /**
   * Set context synchronously (without fetching data)
   */
  setContextSync(context: AssistantContext): void {
    this.currentContext = context;
    this.notifyListeners();
  }

  /**
   * Refresh context data
   */
  async refreshContext(): Promise<void> {
    if (this.currentContext) {
      this.currentContext = await this.fetchContextData(this.currentContext);
      this.notifyListeners();
    }
  }

  /**
   * Get the current context
   */
  getContext(): AssistantContext | null {
    return this.currentContext;
  }

  /**
   * Get context payload with metadata
   */
  getContextPayload(): AssistantContextPayload | null {
    if (!this.currentContext) return null;

    return {
      ...this.currentContext,
      timestamp: new Date().toISOString(),
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    };
  }

  /**
   * Update context with partial data
   */
  updateContext(updates: Partial<AssistantContext>): void {
    if (this.currentContext) {
      this.currentContext = { ...this.currentContext, ...updates };
      this.notifyListeners();
    }
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    this.currentContext = null;
    this.notifyListeners();
  }

  /**
   * Subscribe to context changes
   */
  subscribe(listener: (context: AssistantContext | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentContext));
  }
}

// Singleton instance
export const contextService = new ContextService();

/**
 * Hook to get current context (for React components)
 */
export function useAssistantContext(): AssistantContext | null {
  if (typeof window === 'undefined') return null;
  
  // This will be used with React hooks in components
  return contextService.getContext();
}







