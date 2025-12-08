/**
 * Context Detector for SupportSense Assistant
 * Automatically detects current module/context from URL and page structure
 */

import { AssistantContext } from './types';

/**
 * Detect module name from URL path
 */
export function detectModuleFromPath(pathname: string): string {
  // Remove leading/trailing slashes and split
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return 'Home';

  // Map common paths to module names
  const moduleMap: Record<string, string> = {
    'admin': 'Admin Dashboard',
    'staff': 'Staff Dashboard',
    'clients': 'Client Management',
    'devices': 'Device Management',
    'sops': 'SOP Management',
    'logs': 'Logs',
    'client': 'Client Detail',
    'dashboard': 'Dashboard',
  };

  // Check for specific module matches
  for (const [key, value] of Object.entries(moduleMap)) {
    if (segments.includes(key)) {
      return value;
    }
  }

  // Default: capitalize first segment
  return segments[0]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract client ID from path
 */
export function extractClientIdFromPath(pathname: string): string | undefined {
  const segments = pathname.split('/');
  const clientIndex = segments.indexOf('client');
  if (clientIndex !== -1 && segments[clientIndex + 1]) {
    return segments[clientIndex + 1];
  }
  return undefined;
}

/**
 * Detect context from current page
 */
export function detectContext(): Partial<AssistantContext> {
  if (typeof window === 'undefined') {
    return { module: 'Unknown' };
  }

  const pathname = window.location.pathname;
  const moduleName = detectModuleFromPath(pathname);
  const clientId = extractClientIdFromPath(pathname);

  // Try to get role from session or localStorage
  // This is a placeholder - in real implementation, get from auth context
  const role = pathname.startsWith('/admin') ? 'admin' : 'staff';

  return {
    module: moduleName,
    client_id: clientId,
    role: role,
    userRole: role,
  };
}

/**
 * Auto-detect and set context
 */
export function autoDetectAndSetContext(): void {
  const detected = detectContext();
  // This will be called by components to auto-set context
  // The context service will be imported and used
}







