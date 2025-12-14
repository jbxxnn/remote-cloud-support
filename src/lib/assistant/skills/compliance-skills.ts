/**
 * Compliance Skills - Query handlers for compliance and validation-related assistant queries
 */

import { AssistantContextPayload } from '../types';
import { ValidationIssue, ValidationResult, ValidationContext } from '@/lib/validation/types';
import { getOACRule } from '@/lib/validation/oac-rules';
import { validatorEngine } from '@/lib/validation/validator-engine';

/**
 * Handle compliance and validation-related queries
 */
export async function handleComplianceQuery(
  queryText: string,
  context: AssistantContextPayload
): Promise<string> {
  if (typeof window !== 'undefined') {
    return "Compliance validation is a server-side operation and cannot be performed in the browser.";
  }

  const lowerQuery = queryText.toLowerCase();

  // "Why is this invalid?" or "Explain this error"
  if (lowerQuery.includes('why is this invalid') || 
      lowerQuery.includes('explain this error') ||
      lowerQuery.includes('what\'s wrong') ||
      lowerQuery.includes('why did validation fail')) {
    return explainValidationErrors(context);
  }

  // "Show OAC rule" or "What is OAC rule"
  if (lowerQuery.includes('show oac rule') || 
      lowerQuery.includes('what is oac') ||
      lowerQuery.includes('oac rule') ||
      (lowerQuery.includes('rule') && lowerQuery.includes('oac'))) {
    return explainOACRule(queryText, context);
  }

  // "How do I fix this?" or "What should I do to fix"
  if (lowerQuery.includes('how do i fix') || 
      lowerQuery.includes('how to fix') ||
      lowerQuery.includes('what should i do to fix') ||
      lowerQuery.includes('corrective action')) {
    return suggestCorrectiveActions(context);
  }

  // "Auto-fix" or "Fix automatically"
  if (lowerQuery.includes('auto-fix') || 
      lowerQuery.includes('fix automatically') ||
      lowerQuery.includes('auto fix') ||
      lowerQuery.includes('apply fixes')) {
    return performAutoFix(context, queryText);
  }

  // "Validate this" or "Check compliance"
  if (lowerQuery.includes('validate') || 
      lowerQuery.includes('check compliance') ||
      lowerQuery.includes('run validation')) {
    return performValidation(context, queryText);
  }

  // General compliance help
  if (lowerQuery.includes('compliance') || lowerQuery.includes('validation')) {
    return getComplianceHelp();
  }

  return "I can help with compliance and validation. Try asking 'Why is this invalid?', 'Show OAC rule', 'How do I fix this?', 'Auto-fix this', or 'Validate this'.";
}

/**
 * Explain validation errors
 */
async function explainValidationErrors(context: AssistantContextPayload): Promise<string> {
  // Try to get validation errors from context
  // In a real implementation, this would fetch validation results from the current form/context
  
  let response = `## Validation Error Explanations\n\n`;

  // Check if we have validation context
  const validationContext = context.context?.validation as ValidationResult | undefined;
  
  if (validationContext) {
    if (validationContext.errors.length === 0 && validationContext.warnings.length === 0) {
      return "✅ **No validation errors found!**\n\nThe current data passes all validation checks.";
    }

    // Explain errors
    if (validationContext.errors.length > 0) {
      response += `### ⚠️ Validation Errors (${validationContext.errors.length})\n\n`;
      validationContext.errors.forEach((error, index) => {
        response += explainValidationIssue(error, index + 1);
      });
    }

    // Explain warnings
    if (validationContext.warnings.length > 0) {
      response += `\n### ⚠️ Validation Warnings (${validationContext.warnings.length})\n\n`;
      validationContext.warnings.forEach((warning, index) => {
        response += explainValidationIssue(warning, index + 1);
      });
    }
  } else {
    // No validation context - provide general guidance
    response += `I don't see any validation errors in the current context.\n\n`;
    response += `To get error explanations:\n`;
    response += `1. Run validation on your data\n`;
    response += `2. Ask "Why is this invalid?" while viewing validation results\n`;
    response += `3. Or ask "Validate this [record/SOP]" to check compliance\n\n`;
    response += `**Common validation issues:**\n`;
    response += `- Missing required fields (staff ID, timestamp, description)\n`;
    response += `- Invalid timestamps (future dates, invalid format)\n`;
    response += `- Incomplete service descriptions (too short)\n`;
    response += `- Missing location for incident reports\n`;
  }

  return response;
}

/**
 * Explain a single validation issue
 */
function explainValidationIssue(issue: ValidationIssue, index: number): string {
  let explanation = `${index}. **${issue.field}**: ${issue.message}\n`;

  if (issue.ruleRef) {
    const rule = getOACRule(issue.ruleRef);
    if (rule) {
      explanation += `   📋 **Rule**: ${rule.reference} - ${rule.title}\n`;
      explanation += `   📝 **Description**: ${rule.description}\n`;
    } else {
      explanation += `   📋 **Rule Reference**: ${issue.ruleRef}\n`;
    }
  }

  if (issue.suggestion) {
    explanation += `   💡 **Suggestion**: ${issue.suggestion}\n`;
  }

  if (issue.blocking) {
    explanation += `   🚫 **Status**: This error blocks submission\n`;
  } else {
    explanation += `   ⚠️ **Status**: This is a warning (submission allowed)\n`;
  }

  if (issue.step) {
    explanation += `   📍 **Step**: ${issue.step}\n`;
  }

  explanation += `\n`;
  return explanation;
}

/**
 * Explain OAC rule
 */
async function explainOACRule(queryText: string, context: AssistantContextPayload): Promise<string> {
  // Try to extract rule reference from query
  const ruleRefMatch = queryText.match(/OAC\s*5123\.?\s*(\d+)/i) || queryText.match(/5123\.?\s*(\d+)/i);
  const ruleRef = ruleRefMatch 
    ? `OAC 5123.${ruleRefMatch[1].padStart(4, '0')}`
    : null;

  if (ruleRef) {
    const rule = getOACRule(ruleRef);
    if (rule) {
      let response = `## OAC Rule: ${rule.reference}\n\n`;
      response += `**Title**: ${rule.title}\n\n`;
      response += `**Description**:\n${rule.description}\n\n`;
      response += `**Category**: ${rule.category.replace(/_/g, ' ')}\n`;
      response += `**Severity**: ${rule.severity}\n`;
      response += `**Blocking**: ${rule.blocking ? 'Yes (blocks submission)' : 'No (warning only)'}\n`;
      
      // Try to fetch full rule text from API if available
      if (typeof window === 'undefined') {
        try {
          // In server context, we could fetch additional details
          // For now, just return what we have
        } catch (error) {
          // Ignore API errors, use local rule data
        }
      }
      
      return response;
    } else {
      return `❌ Rule ${ruleRef} not found in the OAC 5123 rules database.\n\n` +
             `Available rules: OAC 5123.0412, OAC 5123.0413, OAC 5123.0414, OAC 5123.0415, OAC 5123.0416, OAC 5123.0417, OAC 5123.0418, OAC 5123.0419`;
    }
  }

  // If no specific rule, list available rules
  const { getAllOACRules } = await import('@/lib/validation/oac-rules');
  const allRules = getAllOACRules();
  
  let response = `## OAC 5123 Rules\n\n`;
  response += `Available compliance rules:\n\n`;
  
  // Group by category
  const rulesByCategory: Record<string, typeof allRules> = {};
  allRules.forEach((rule) => {
    if (!rulesByCategory[rule.category]) {
      rulesByCategory[rule.category] = [];
    }
    rulesByCategory[rule.category].push(rule);
  });
  
  Object.entries(rulesByCategory).forEach(([category, rules]) => {
    response += `### ${category.replace(/_/g, ' ').toUpperCase()}\n\n`;
    rules.forEach((rule) => {
      response += `- **${rule.reference}**: ${rule.title} (${rule.blocking ? '🚫 Blocking' : '⚠️ Warning'})\n`;
    });
    response += `\n`;
  });
  
  response += `**Usage**: Ask "Show OAC rule [reference]" to see details, e.g., "Show OAC rule 5123.0412"`;
  
  return response;
}

/**
 * Suggest corrective actions
 */
async function suggestCorrectiveActions(context: AssistantContextPayload): Promise<string> {
  const validationContext = context.context?.validation as ValidationResult | undefined;
  
  if (!validationContext || (validationContext.errors.length === 0 && validationContext.warnings.length === 0)) {
    return "✅ **No validation issues found!**\n\nYour data is compliant and ready to submit.";
  }

  let response = `## Corrective Actions\n\n`;
  response += `Here's how to fix the validation issues:\n\n`;

  const allIssues = [...validationContext.errors, ...validationContext.warnings];
  const uniqueFields = new Set(allIssues.map(i => i.field));

  uniqueFields.forEach((field, index) => {
    const fieldIssues = allIssues.filter(i => i.field === field);
    const blockingIssues = fieldIssues.filter(i => i.blocking);
    
    response += `${index + 1}. **Fix ${field}**\n`;
    
    if (blockingIssues.length > 0) {
      response += `   🚫 **Required** (blocks submission):\n`;
      blockingIssues.forEach(issue => {
        if (issue.suggestion) {
          response += `   - ${issue.suggestion}\n`;
        } else {
          response += `   - ${issue.message}\n`;
        }
      });
    }
    
    const warningIssues = fieldIssues.filter(i => !i.blocking);
    if (warningIssues.length > 0) {
      response += `   ⚠️ **Recommended**:\n`;
      warningIssues.forEach(issue => {
        if (issue.suggestion) {
          response += `   - ${issue.suggestion}\n`;
        } else {
          response += `   - ${issue.message}\n`;
        }
      });
    }
    
    response += `\n`;
  });

  // Add priority guidance
  const blockingCount = validationContext.errors.filter(e => e.blocking).length;
  if (blockingCount > 0) {
    response += `\n**Priority**: Fix ${blockingCount} blocking error(s) first to enable submission.\n`;
  }

  return response;
}

/**
 * Perform validation
 */
async function performValidation(context: AssistantContextPayload, queryText: string): Promise<string> {
  // Try to determine what to validate from context
  const lowerQuery = queryText.toLowerCase();
  
  if (lowerQuery.includes('sop')) {
    // Validate SOP response
    const sopResponse = context.context?.sopResponse;
    if (sopResponse) {
      try {
        const validationContext: ValidationContext = {
          userId: context.userRole === 'staff' ? context.client_id : undefined,
          clientId: context.client_id,
          alertId: context.alert_id,
          sopResponseId: context.sop_response_id,
        };
        const result = validatorEngine.validate('sop', {
          steps: context.context?.sop?.steps || [],
          completedSteps: sopResponse.completedSteps || [],
        }, validationContext);
        
        return formatValidationResult(result, 'SOP Response');
      } catch (error) {
        return `Failed to validate SOP: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  }

  if (lowerQuery.includes('record') || lowerQuery.includes('service')) {
    // Validate record
    const record = context.context?.record;
    if (record) {
      try {
        const validationContext: ValidationContext = {
          userId: context.userRole === 'staff' ? context.client_id : undefined,
          clientId: context.client_id,
          alertId: context.alert_id,
          sopResponseId: context.sop_response_id,
        };
        const result = validatorEngine.validate('record', record, validationContext);
        
        return formatValidationResult(result, 'Service Record');
      } catch (error) {
        return `Failed to validate record: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  }

  // General validation
  return `To validate data, please:\n\n` +
         `1. Specify what to validate: "Validate this SOP" or "Validate this record"\n` +
         `2. Ensure you're on a page with the data to validate\n` +
         `3. Or provide the data directly in your query\n\n` +
         `**Available validators:**\n` +
         `- SOP Response Validator\n` +
         `- Record Validator\n` +
         `- Compliance Validator`;
}

/**
 * Format validation result for display
 */
function formatValidationResult(result: ValidationResult, title: string): string {
  let response = `## ${title} Validation Result\n\n`;
  response += `**Status**: ${result.isValid ? '✅ Passed' : result.canSubmit ? '⚠️ Passed with warnings' : '❌ Failed'}\n\n`;
  response += `${result.summary}\n\n`;

  if (result.errors.length > 0) {
    response += `### Errors (${result.errors.length})\n\n`;
    result.errors.forEach((error, index) => {
      response += explainValidationIssue(error, index + 1);
    });
  }

  if (result.warnings.length > 0) {
    response += `### Warnings (${result.warnings.length})\n\n`;
    result.warnings.forEach((warning, index) => {
      response += explainValidationIssue(warning, index + 1);
    });
  }

  if (result.isValid) {
    response += `\n✅ **All validation checks passed!** Your data is compliant and ready to submit.`;
  } else if (result.canSubmit) {
    response += `\n⚠️ **Submission allowed** but consider addressing warnings for better compliance.`;
  } else {
    response += `\n❌ **Submission blocked** - Please fix the errors above before submitting.`;
  }

  return response;
}

/**
 * Perform auto-fix
 */
async function performAutoFix(context: AssistantContextPayload, queryText: string): Promise<string> {
  const lowerQuery = queryText.toLowerCase();
  
  // Try to determine what to fix from context
  if (lowerQuery.includes('sop')) {
    const sopResponse = context.context?.sopResponse;
    if (sopResponse) {
      try {
        const validationContext: ValidationContext = {
          userId: context.userRole === 'staff' ? context.client_id : undefined,
          clientId: context.client_id,
          alertId: context.alert_id,
          sopResponseId: context.sop_response_id,
        };
        
        // First validate
        const { validatorEngine } = await import('@/lib/validation/validator-engine');
        const validationResult = validatorEngine.validate('sop', {
          steps: context.context?.sop?.steps || [],
          completedSteps: sopResponse.completedSteps || [],
        }, validationContext);

        // Check for fixable issues
        const { AutoFixService } = await import('@/lib/validation/auto-fix');
        const fixableIssues = AutoFixService.getFixableIssues(validationResult, validationContext);
        
        if (fixableIssues.length === 0) {
          return `## Auto-Fix Analysis\n\n` +
                 `❌ **No auto-fixable issues found.**\n\n` +
                 `All ${validationResult.errors.length + validationResult.warnings.length} issue(s) require manual attention.\n\n` +
                 `Ask "How do I fix this?" for manual fix suggestions.`;
        }

        // Apply auto-fixes
        const fixResult = AutoFixService.autoFix({
          steps: context.context?.sop?.steps || [],
          completedSteps: sopResponse.completedSteps || [],
        }, validationResult, { context: validationContext });

        let response = `## Auto-Fix Results\n\n`;
        response += `✅ **Fixed ${fixResult.fixedIssues.length} issue(s)**\n\n`;
        
        if (fixResult.fixedIssues.length > 0) {
          response += `**Fixed Issues:**\n`;
          fixResult.fixedIssues.forEach((issue, index) => {
            response += `${index + 1}. ${issue.field}: ${issue.message}\n`;
          });
          response += `\n`;
        }

        if (fixResult.warnings && fixResult.warnings.length > 0) {
          response += `**⚠️ Warnings:**\n`;
          fixResult.warnings.forEach((warning, index) => {
            response += `${index + 1}. ${warning}\n`;
          });
          response += `\n`;
        }

        if (fixResult.unfixableIssues.length > 0) {
          response += `**❌ Still Need Manual Fix:**\n`;
          response += `${fixResult.unfixableIssues.length} issue(s) require your attention:\n`;
          fixResult.unfixableIssues.forEach((issue, index) => {
            response += `${index + 1}. ${issue.field}: ${issue.message}\n`;
            if (issue.suggestion) {
              response += `   💡 ${issue.suggestion}\n`;
            }
          });
        }

        response += `\n${fixResult.summary}`;
        
        return response;
      } catch (error) {
        return `Failed to auto-fix: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  }

  // General auto-fix help
  return `## Auto-Fix Help\n\n` +
         `I can automatically fix some validation issues:\n\n` +
         `**Auto-fixable issues:**\n` +
         `- Missing timestamps (set to current time)\n` +
         `- Invalid timestamp formats (normalize to ISO 8601)\n` +
         `- Future timestamps (set to current time)\n` +
         `- Missing staff ID (use from context)\n` +
         `- Missing location (set generic, for warnings only)\n\n` +
         `**Cannot auto-fix:**\n` +
         `- Missing or incomplete descriptions (requires your input)\n` +
         `- Missing required steps (requires completion)\n` +
         `- Missing actions (requires your input)\n\n` +
         `To use auto-fix:\n` +
         `1. Run validation first: "Validate this SOP"\n` +
         `2. Then ask: "Auto-fix this" or "Apply fixes"\n\n` +
         `⚠️ **Note**: Always review auto-fixes before submitting!`;
}

/**
 * Get compliance help
 */
function getComplianceHelp(): string {
  return `## Compliance & Validation Help\n\n` +
         `I can help you with compliance and validation:\n\n` +
         `**Commands:**\n` +
         `- "Why is this invalid?" - Explain validation errors\n` +
         `- "Show OAC rule [reference]" - Display OAC 5123 rule details\n` +
         `- "How do I fix this?" - Get corrective action suggestions\n` +
         `- "Auto-fix this" - Automatically fix fixable issues\n` +
         `- "Validate this [SOP/record]" - Run validation checks\n\n` +
         `**OAC 5123 Compliance:**\n` +
         `- Documentation requirements\n` +
         `- Timestamp requirements\n` +
         `- Staff qualification requirements\n` +
         `- Service description requirements\n` +
         `- Incident reporting requirements\n\n` +
         `**Validation Types:**\n` +
         `- SOP Response Validation\n` +
         `- Record Validation\n` +
         `- Compliance Validation\n\n` +
         `Ask me about any validation error or compliance requirement!`;
}

