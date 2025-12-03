import { AssistantContext, AssistantContextPayload } from './types';

/**
 * Context Service for SupportSense Assistant
 * Tracks current module/context for assistant awareness
 */
class ContextService {
  private currentContext: AssistantContext | null = null;
  private listeners: ((context: AssistantContext | null) => void)[] = [];

  /**
   * Set the current context
   */
  setContext(context: AssistantContext): void {
    this.currentContext = context;
    this.notifyListeners();
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





