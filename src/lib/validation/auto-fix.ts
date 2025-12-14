/**
 * Auto-Fix Service
 * 
 * Provides automatic fixes for common validation errors
 */

import {
  ValidationIssue,
  ValidationResult,
  ValidationContext,
} from './types';

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  /** Whether auto-fix was successful */
  success: boolean;
  
  /** Fixed data */
  fixedData: any;
  
  /** Issues that were fixed */
  fixedIssues: ValidationIssue[];
  
  /** Issues that could not be auto-fixed */
  unfixableIssues: ValidationIssue[];
  
  /** Summary of fixes applied */
  summary: string;
  
  /** Warnings about fixes */
  warnings?: string[];
}

/**
 * Auto-fix options
 */
export interface AutoFixOptions {
  /** Whether to apply safe fixes automatically */
  applySafeFixes?: boolean;
  
  /** Whether to require confirmation for fixes */
  requireConfirmation?: boolean;
  
  /** Context for fixing */
  context?: ValidationContext;
}

/**
 * Auto-Fix Service
 * 
 * Identifies and applies automatic fixes for validation errors
 */
export class AutoFixService {
  /**
   * Attempt to auto-fix validation issues
   */
  static autoFix(
    data: any,
    validationResult: ValidationResult,
    options: AutoFixOptions = {}
  ): AutoFixResult {
    const fixedData = JSON.parse(JSON.stringify(data)); // Deep clone
    const fixedIssues: ValidationIssue[] = [];
    const unfixableIssues: ValidationIssue[] = [];
    const warnings: string[] = [];

    // Process each error/warning
    const allIssues = [...validationResult.errors, ...validationResult.warnings];

    for (const issue of allIssues) {
      const fixResult = this.attemptFix(fixedData, issue, options.context);
      
      if (fixResult.fixed) {
        fixedIssues.push(issue);
        if (fixResult.warning) {
          warnings.push(fixResult.warning);
        }
      } else {
        unfixableIssues.push(issue);
      }
    }

    const success = fixedIssues.length > 0;
    const summary = success
      ? `Auto-fixed ${fixedIssues.length} issue(s). ${unfixableIssues.length} issue(s) require manual attention.`
      : `Could not auto-fix any issues. All ${unfixableIssues.length} issue(s) require manual attention.`;

    return {
      success,
      fixedData,
      fixedIssues,
      unfixableIssues,
      summary,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Attempt to fix a single validation issue
   */
  private static attemptFix(
    data: any,
    issue: ValidationIssue,
    context?: ValidationContext
  ): { fixed: boolean; warning?: string } {
    const field = issue.field;
    const message = issue.message.toLowerCase();

    // Fix: Missing timestamp - set to current time
    if (field === 'timestamp' || field === 'createdAt') {
      if (message.includes('required') || message.includes('missing')) {
        data.timestamp = new Date().toISOString();
        data.createdAt = data.timestamp;
        return { fixed: true, warning: 'Set timestamp to current time. Verify this is correct.' };
      }
    }

    // Fix: Invalid timestamp format - try to parse and fix
    if (field === 'timestamp' || field === 'createdAt') {
      if (message.includes('invalid') || message.includes('format')) {
        const currentValue = data.timestamp || data.createdAt;
        if (currentValue) {
          const parsed = new Date(currentValue);
          if (!isNaN(parsed.getTime())) {
            data.timestamp = parsed.toISOString();
            data.createdAt = data.timestamp;
            return { fixed: true, warning: 'Fixed timestamp format to ISO 8601.' };
          }
        }
      }
    }

    // Fix: Missing staff ID - use from context
    if (field === 'staffId') {
      if (message.includes('required') || message.includes('missing')) {
        if (context?.userId) {
          data.staffId = context.userId;
          return { fixed: true };
        }
      }
    }

    // Fix: Missing location - set default or from context
    if (field === 'location') {
      if (message.includes('recommended') || message.includes('should')) {
        // Only fix warnings, not blocking errors
        if (!issue.blocking && context?.clientId) {
          data.location = 'Client Location'; // Generic default
          return { fixed: true, warning: 'Set generic location. Please update with specific location.' };
        }
      }
    }

    // Fix: Service description too short - cannot auto-fix (requires user input)
    if (field === 'serviceDescription' || field === 'description' || field === 'notes') {
      if (message.includes('too short') || message.includes('at least')) {
        // Cannot auto-fix - requires user to add content
        return { fixed: false };
      }
    }

    // Fix: Missing action in SOP step - cannot auto-fix (requires user input)
    if (field === 'action') {
      if (message.includes('required') || message.includes('missing')) {
        // Cannot auto-fix - requires user to provide action
        return { fixed: false };
      }
    }

    // Fix: Missing notes in SOP step - set empty string (non-blocking)
    if (field === 'notes') {
      if (message.includes('recommended') && !issue.blocking) {
        if (issue.step !== undefined) {
          // For SOP steps, we'd need to find the step in completedSteps
          // This is complex, so we'll mark as unfixable for now
          return { fixed: false };
        }
      }
    }

    // Fix: Future timestamp - set to current time
    if (field === 'timestamp' || field === 'createdAt') {
      if (message.includes('future')) {
        const currentValue = data.timestamp || data.createdAt;
        if (currentValue) {
          const parsed = new Date(currentValue);
          if (parsed.getTime() > Date.now()) {
            data.timestamp = new Date().toISOString();
            data.createdAt = data.timestamp;
            return { fixed: true, warning: 'Changed future timestamp to current time. Verify this is correct.' };
          }
        }
      }
    }

    // Default: cannot auto-fix
    return { fixed: false };
  }

  /**
   * Check if an issue can be auto-fixed
   */
  static canAutoFix(issue: ValidationIssue, context?: ValidationContext): boolean {
    const field = issue.field;
    const message = issue.message.toLowerCase();

    // Can fix: Missing timestamp
    if ((field === 'timestamp' || field === 'createdAt') && message.includes('required')) {
      return true;
    }

    // Can fix: Invalid timestamp format
    if ((field === 'timestamp' || field === 'createdAt') && message.includes('invalid')) {
      return true;
    }

    // Can fix: Missing staff ID (if context has userId)
    if (field === 'staffId' && message.includes('required') && context?.userId) {
      return true;
    }

    // Can fix: Future timestamp
    if ((field === 'timestamp' || field === 'createdAt') && message.includes('future')) {
      return true;
    }

    // Can fix: Missing location (non-blocking warnings only)
    if (field === 'location' && !issue.blocking && message.includes('recommended')) {
      return true;
    }

    // Cannot fix: Content-related issues (require user input)
    if (field === 'serviceDescription' || field === 'description' || field === 'notes' || field === 'action') {
      if (message.includes('too short') || message.includes('required') || message.includes('missing')) {
        return false;
      }
    }

    // Cannot fix: Missing required steps
    if (field === 'completion' || field === 'sopCompletion') {
      return false;
    }

    return false;
  }

  /**
   * Get list of fixable issues
   */
  static getFixableIssues(
    validationResult: ValidationResult,
    context?: ValidationContext
  ): ValidationIssue[] {
    const allIssues = [...validationResult.errors, ...validationResult.warnings];
    return allIssues.filter(issue => this.canAutoFix(issue, context));
  }

  /**
   * Get list of unfixable issues
   */
  static getUnfixableIssues(
    validationResult: ValidationResult,
    context?: ValidationContext
  ): ValidationIssue[] {
    const allIssues = [...validationResult.errors, ...validationResult.warnings];
    return allIssues.filter(issue => !this.canAutoFix(issue, context));
  }
}



