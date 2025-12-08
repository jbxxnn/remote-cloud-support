/**
 * Static Guidance Service for SupportSense Assistant
 * 
 * Provides rules-based guidance for notes, SOP steps, and form fields
 * without requiring AI/LLM integration.
 */

import { AssistantContextPayload } from './types';

export interface NotesGuidance {
  templates: string[];
  guidance: string;
  examples: string[];
}

export interface StepGuidance {
  explanation: string;
  notesGuidance: NotesGuidance;
  commonIssues: string[];
}

/**
 * Get notes guidance based on context
 */
export function getNotesGuidance(
  context: AssistantContextPayload,
  stepNumber?: number,
  stepAction?: string
): NotesGuidance {
  // SOP Step context
  if (context.sop_id && stepNumber) {
    return getSOPStepNotesGuidance(stepAction || '', stepNumber);
  }

  // Alert resolution context
  if (context.alert_id || context.module === 'Alert Detail') {
    return getAlertResolutionNotesGuidance();
  }

  // Generic notes guidance
  return getGenericNotesGuidance();
}

/**
 * Get guidance for SOP step notes
 */
function getSOPStepNotesGuidance(stepAction: string, stepNumber: number): NotesGuidance {
  const lowerAction = stepAction.toLowerCase();

  // Contact-related steps
  if (lowerAction.includes('contact') || lowerAction.includes('call') || lowerAction.includes('reach')) {
    return {
      templates: [
        "Contacted client via [phone/email/meet] at [time]. Response: [answered/no answer/voicemail]",
        "Called client at [time]. [Outcome]. Next steps: [follow-up plan]",
        "Attempted contact via [method] at [time]. Result: [outcome]. Notes: [details]"
      ],
      guidance: `For this contact step, include:
• Method of contact (phone, email, Google Meet, etc.)
• Time of contact
• Client response (answered, no answer, voicemail, busy, etc.)
• Any important details from the conversation
• Follow-up actions if needed

Example: "Called client at 2:30 PM. No answer. Left voicemail with callback request. Will follow up in 1 hour."`,
      examples: [
        "Called client at 2:30 PM. No answer. Left voicemail with callback request.",
        "Contacted via Google Meet at 3:00 PM. Client answered. Discussed issue. Scheduled follow-up for tomorrow.",
        "Sent email at 1:15 PM. Awaiting response. Will call if no reply by end of day."
      ]
    };
  }

  // Verification/check steps
  if (lowerAction.includes('verify') || lowerAction.includes('check') || lowerAction.includes('confirm')) {
    return {
      templates: [
        "Verified [item] at [time]. Status: [verified/not verified]. Details: [findings]",
        "Checked [item] on [date/time]. Result: [outcome]. Notes: [observations]"
      ],
      guidance: `For verification steps, include:
• What was verified/checked
• Time of verification
• Result (verified, not verified, needs attention, etc.)
• Any specific findings or observations
• Any discrepancies noted

Example: "Verified client contact information at 2:45 PM. Phone number confirmed. Email address updated in system."`,
      examples: [
        "Verified emergency contact info at 2:45 PM. All details confirmed and up to date.",
        "Checked system status at 3:00 PM. All systems operational. No issues detected.",
        "Verified client credentials at 1:30 PM. Access granted. Account active."
      ]
    };
  }

  // Documentation steps
  if (lowerAction.includes('document') || lowerAction.includes('record') || lowerAction.includes('log')) {
    return {
      templates: [
        "Documented [item] at [time]. Location: [where]. Details: [what was documented]",
        "Recorded [action] in [system/location] at [time]. Reference: [ID/number]"
      ],
      guidance: `For documentation steps, include:
• What was documented/recorded
• Where it was recorded (system, file, etc.)
• Time of documentation
• Any reference numbers or IDs
• Important details that were captured

Example: "Documented client interaction in CRM at 3:15 PM. Ticket #12345. Summary: Discussed service upgrade options."`,
      examples: [
        "Documented alert resolution in system at 3:15 PM. Ticket #12345. Status updated to resolved.",
        "Recorded client feedback in notes at 2:00 PM. Client satisfied with response time.",
        "Logged incident details at 1:45 PM. Incident ID: INC-2024-001. Escalated to supervisor."
      ]
    };
  }

  // Escalation steps
  if (lowerAction.includes('escalate') || lowerAction.includes('refer') || lowerAction.includes('transfer')) {
    return {
      templates: [
        "Escalated to [person/team] at [time]. Reason: [why]. Priority: [level]",
        "Referred to [department] at [time]. Details: [what was referred]. Follow-up: [when]"
      ],
      guidance: `For escalation steps, include:
• Who it was escalated to (name, team, department)
• Time of escalation
• Reason for escalation
• Priority level (if applicable)
• Any relevant context or background
• Expected follow-up timeline

Example: "Escalated to supervisor John Doe at 3:30 PM. Reason: Client requires immediate attention. Priority: High. Client experiencing service outage."`,
      examples: [
        "Escalated to technical team at 3:30 PM. Reason: System malfunction. Priority: High.",
        "Referred to billing department at 2:15 PM. Client has payment inquiry. Follow-up expected within 24 hours.",
        "Transferred to senior support at 1:45 PM. Complex issue requiring advanced troubleshooting."
      ]
    };
  }

  // Generic SOP step guidance
  return {
    templates: [
      "Completed [action] at [time]. Result: [outcome]. Notes: [details]",
      "Performed [action] at [time]. Status: [status]. Details: [what happened]"
    ],
    guidance: `For this step, include:
• What action was taken
• When it was performed (time)
• Result or outcome
• Any important details or observations
• Next steps if applicable

Be specific and clear. Include enough detail that someone reading this later can understand what happened.`,
    examples: [
      `Completed ${stepAction} at 2:30 PM. All requirements met. No issues encountered.`,
      `Performed ${stepAction} at 3:00 PM. Status: Successful. Client notified.`,
      `Executed ${stepAction} at 1:45 PM. Partial completion. Requires follow-up.`
    ]
  };
}

/**
 * Get guidance for alert resolution notes
 */
function getAlertResolutionNotesGuidance(): NotesGuidance {
  return {
    templates: [
      "Attempted contact via [method] at [time]. [Outcome]. Actions taken: [what was done]. Resolution: [how it was resolved]",
      "Contacted client at [time] via [method]. Issue: [description]. Resolution: [solution]. Follow-up: [if needed]",
      "Investigated alert at [time]. Findings: [what was found]. Actions: [steps taken]. Status: [resolved/false alarm/escalated]"
    ],
    guidance: `For alert resolution notes, include:
• Method of contact (phone, email, in-person, etc.)
• Time of contact/action
• Client response or situation found
• Actions taken to resolve
• Final resolution status
• Any follow-up needed

Be thorough - these notes are important for compliance and future reference.

Example: "Called client at 2:30 PM. Client answered. Verified it was a false alarm - motion detected by pet. Client confirmed all systems working normally. No further action needed. Marked as resolved."`,
    examples: [
      "Called client at 2:30 PM. Client answered. Verified false alarm - motion from pet. All systems normal. Resolved.",
      "Contacted via Google Meet at 3:00 PM. Client confirmed emergency situation. Dispatched emergency services. Escalated to supervisor. Status: Emergency Escalated.",
      "Investigated at 1:45 PM. System check completed. No issues found. Client notified. Scheduled follow-up check for tomorrow. Resolved."
    ]
  };
}

/**
 * Get generic notes guidance
 */
function getGenericNotesGuidance(): NotesGuidance {
  return {
    templates: [
      "Action taken: [what]. Time: [when]. Result: [outcome]. Notes: [details]",
      "Performed [action] at [time]. Status: [status]. Details: [information]"
    ],
    guidance: `When writing notes, be sure to include:
• What action was taken
• When it occurred (date and time)
• Result or outcome
• Any relevant details or observations
• Next steps if applicable

Be clear, concise, and specific. Good notes help others understand what happened and why.`,
    examples: [
      "Action taken: System check. Time: 2:30 PM. Result: All systems operational. No issues detected.",
      "Performed verification at 3:00 PM. Status: Complete. All requirements met.",
      "Completed task at 1:45 PM. Status: Successful. Client notified via email."
    ]
  };
}

/**
 * Get SOP step explanation
 */
export function getSOPStepExplanation(stepAction: string, stepNumber: number): StepGuidance {
  const lowerAction = stepAction.toLowerCase();
  
  let explanation = `Step ${stepNumber}: ${stepAction}`;
  let commonIssues: string[] = [];

  if (lowerAction.includes('contact')) {
    explanation += `\n\nThis step involves contacting the client. Make sure you have the correct contact information and choose the appropriate method (phone, email, or video call) based on the situation.`;
    commonIssues = [
      "Client not answering - try alternative contact method",
      "Wrong phone number - verify contact info",
      "Language barrier - use translation if needed"
    ];
  } else if (lowerAction.includes('verify')) {
    explanation += `\n\nThis step requires verification of information or status. Double-check all details before marking as complete.`;
    commonIssues = [
      "Information outdated - update records",
      "Cannot verify - document why",
      "Multiple sources conflict - escalate"
    ];
  } else {
    explanation += `\n\nFollow the instructions for this step carefully. Document any issues or deviations from the standard procedure.`;
    commonIssues = [
      "Unclear instructions - ask supervisor",
      "Missing information - gather before proceeding",
      "Exception to procedure - document reason"
    ];
  }

  return {
    explanation,
    notesGuidance: getSOPStepNotesGuidance(stepAction, stepNumber),
    commonIssues
  };
}

/**
 * Generate assistant response for notes help query
 */
export function generateNotesHelpResponse(
  query: string,
  context: AssistantContextPayload,
  stepNumber?: number,
  stepAction?: string
): string {
  const guidance = getNotesGuidance(context, stepNumber, stepAction);
  
  let response = `Here's guidance for writing notes:\n\n${guidance.guidance}\n\n`;
  
  if (guidance.templates.length > 0) {
    response += `**Templates you can use:**\n`;
    guidance.templates.forEach((template, index) => {
      response += `${index + 1}. ${template}\n`;
    });
    response += `\n`;
  }
  
  if (guidance.examples.length > 0) {
    response += `**Examples:**\n`;
    guidance.examples.forEach((example, index) => {
      response += `${index + 1}. ${example}\n`;
    });
  }
  
  return response;
}

/**
 * Generate alert summary
 */
export function generateAlertSummary(context: AssistantContextPayload): string {
  const alert = context.context?.alert;
  const client = context.context?.client;

  if (!alert) {
    return "No alert context available. Please navigate to an alert to get a summary.";
  }

  let summary = `## Alert Summary\n\n`;
  summary += `**Alert ID:** ${alert.id}\n`;
  summary += `**Type:** ${alert.type}\n`;
  summary += `**Status:** ${alert.status}\n`;
  summary += `**Message:** ${alert.message}\n`;

  if (alert.severity) {
    summary += `**Severity:** ${alert.severity}\n`;
  }

  if (alert.location) {
    summary += `**Location:** ${alert.location}\n`;
  }

  if (alert.detectionType) {
    summary += `**Detection Type:** ${alert.detectionType}\n`;
  }

  if (client) {
    summary += `\n**Client:** ${client.name}`;
    if (client.company) {
      summary += ` (${client.company})`;
    }
    summary += `\n`;
  }

  summary += `\n**Created:** ${new Date(alert.createdAt).toLocaleString()}\n`;

  if (alert.updatedAt) {
    summary += `**Last Updated:** ${new Date(alert.updatedAt).toLocaleString()}\n`;
  }

  // Add recommendations based on status
  summary += `\n### Recommendations\n\n`;
  if (alert.status === 'pending') {
    summary += `• **Acknowledge this alert** to indicate you're working on it\n`;
    summary += `• **Start a relevant SOP** if one is available for this alert type\n`;
    summary += `• **Contact the client** if immediate action is required\n`;
  } else if (alert.status === 'scheduled') {
    summary += `• **Continue working on this alert** according to the scheduled plan\n`;
    summary += `• **Update progress** in linked SOP responses\n`;
    summary += `• **Resolve the alert** when all actions are complete\n`;
  } else if (alert.status === 'resolved') {
    summary += `• This alert has been resolved\n`;
    summary += `• Review the resolution details and linked SOP responses\n`;
  }

  return summary;
}

/**
 * Generate SOP response summary
 */
export function generateSOPSummary(context: AssistantContextPayload): string {
  const sopResponse = context.context?.sopResponse;
  const sop = context.context?.sop;
  const client = context.context?.client;
  const alert = context.context?.alert;

  if (!sopResponse) {
    return "No SOP response context available. Please navigate to an SOP response to get a summary.";
  }

  let summary = `## SOP Response Summary\n\n`;

  if (sop) {
    summary += `**SOP:** ${sop.name}\n`;
  }

  if (client) {
    summary += `**Client:** ${client.name}\n`;
  }

  if (alert) {
    summary += `**Related Alert:** ${alert.message}\n`;
  }

  summary += `\n**Status:** ${sopResponse.status}\n`;
  summary += `**Started:** ${new Date(sopResponse.startedAt).toLocaleString()}\n`;

  if (sopResponse.completedAt) {
    summary += `**Completed:** ${new Date(sopResponse.completedAt).toLocaleString()}\n`;
  }

  // Step completion status
  const totalSteps = sop?.steps?.length || 0;
  const completedSteps = sopResponse.completedSteps?.length || 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  summary += `\n### Progress\n\n`;
  summary += `**Completed Steps:** ${completedSteps} of ${totalSteps} (${progress}%)\n\n`;

  if (sopResponse.completedSteps && sopResponse.completedSteps.length > 0) {
    summary += `### Completed Steps\n\n`;
    sopResponse.completedSteps.forEach((step: any, index: number) => {
      summary += `${index + 1}. **Step ${step.step}:** ${step.action}\n`;
      if (step.notes) {
        summary += `   Notes: ${step.notes}\n`;
      }
      summary += `   Completed: ${new Date(step.completedAt).toLocaleString()}\n\n`;
    });
  }

  if (sopResponse.notes) {
    summary += `### Overall Notes\n\n${sopResponse.notes}\n\n`;
  }

  return summary;
}

/**
 * Detect missing information
 */
export function detectMissingInformation(context: AssistantContextPayload): string {
  const alert = context.context?.alert;
  const sopResponse = context.context?.sopResponse;
  const sop = context.context?.sop;

  let missing: string[] = [];
  let suggestions: string[] = [];

  // Check SOP response completeness
  if (sopResponse && sop) {
    const totalSteps = sop.steps?.length || 0;
    const completedSteps = sopResponse.completedSteps?.length || 0;
    const incompleteSteps = totalSteps - completedSteps;

    if (incompleteSteps > 0) {
      missing.push(`${incompleteSteps} incomplete SOP step${incompleteSteps > 1 ? 's' : ''}`);
      suggestions.push(`Complete the remaining ${incompleteSteps} step${incompleteSteps > 1 ? 's' : ''} in the SOP`);
    }

    // Check for steps without notes
    if (sopResponse.completedSteps) {
      const stepsWithoutNotes = sopResponse.completedSteps.filter((step: any) => !step.notes || step.notes.trim() === '');
      if (stepsWithoutNotes.length > 0) {
        missing.push(`${stepsWithoutNotes.length} completed step${stepsWithoutNotes.length > 1 ? 's' : ''} without notes`);
        suggestions.push(`Add notes to completed steps for better documentation`);
      }
    }

    if (sopResponse.status === 'in_progress' && incompleteSteps === 0) {
      missing.push('SOP not marked as completed');
      suggestions.push('Mark the SOP as completed since all steps are done');
    }
  }

  // Check alert status
  if (alert) {
    if (alert.status === 'pending') {
      missing.push('Alert not acknowledged');
      suggestions.push('Acknowledge this alert to indicate you\'re working on it');
    }

    if (alert.status === 'scheduled' && !sopResponse) {
      missing.push('No SOP response linked to this alert');
      suggestions.push('Consider starting a relevant SOP for this alert');
    }
  }

  if (missing.length === 0) {
    return `## Missing Information\n\n✅ **All information is complete!**\n\nEverything looks good. No missing information detected.`;
  }

  let response = `## Missing Information\n\n`;
  response += `The following items need attention:\n\n`;

  missing.forEach((item, index) => {
    response += `${index + 1}. ${item}\n`;
  });

  response += `\n### Suggested Actions\n\n`;
  suggestions.forEach((suggestion, index) => {
    response += `${index + 1}. ${suggestion}\n`;
  });

  return response;
}

/**
 * Get contextual guidance based on full context
 */
export function getContextualGuidance(context: AssistantContextPayload, query: string): string {
  const lowerQuery = query.toLowerCase();
  const alert = context.context?.alert;
  const client = context.context?.client;
  const sop = context.context?.sop;
  const sopResponse = context.context?.sopResponse;

  // Summary requests
  if (lowerQuery.includes('summarize') || lowerQuery.includes('summary')) {
    if (lowerQuery.includes('alert') || alert) {
      return generateAlertSummary(context);
    }
    if (lowerQuery.includes('sop') || sopResponse) {
      return generateSOPSummary(context);
    }
  }

  // Missing information requests
  if (lowerQuery.includes('missing') || lowerQuery.includes('what\'s missing') || lowerQuery.includes('what is missing')) {
    return detectMissingInformation(context);
  }

  // Context-specific help
  if (lowerQuery.includes('help') || lowerQuery.includes('what should i do') || lowerQuery.includes('next step')) {
    let response = `## Contextual Guidance\n\n`;

    if (alert) {
      response += `### Current Alert\n\n`;
      response += `You're viewing alert: **${alert.message}**\n`;
      response += `Status: **${alert.status}**\n\n`;

      if (alert.status === 'pending') {
        response += `**Recommended Actions:**\n`;
        response += `1. Acknowledge this alert\n`;
        response += `2. Review the alert details and severity\n`;
        response += `3. Start a relevant SOP if available\n`;
        response += `4. Contact the client if immediate action is needed\n`;
      } else if (alert.status === 'scheduled') {
        response += `**Recommended Actions:**\n`;
        response += `1. Continue working on the scheduled actions\n`;
        response += `2. Update progress in linked SOP responses\n`;
        response += `3. Document any findings or issues\n`;
        response += `4. Resolve the alert when complete\n`;
      }
    }

    if (sopResponse && sop) {
      response += `\n### Current SOP Response\n\n`;
      response += `SOP: **${sop.name}**\n`;
      response += `Status: **${sopResponse.status}**\n\n`;

      const totalSteps = sop.steps?.length || 0;
      const completedSteps = sopResponse.completedSteps?.length || 0;
      const remaining = totalSteps - completedSteps;

      if (remaining > 0) {
        response += `**Next Steps:**\n`;
        response += `1. Complete the remaining ${remaining} step${remaining > 1 ? 's' : ''}\n`;
        response += `2. Add notes to each completed step\n`;
        response += `3. Attach evidence if needed\n`;
        response += `4. Mark the SOP as complete when done\n`;
      } else {
        response += `**All steps completed!**\n`;
        response += `1. Review all completed steps\n`;
        response += `2. Ensure all notes are complete\n`;
        response += `3. Mark the SOP as complete\n`;
      }
    }

    if (client) {
      response += `\n### Client Information\n\n`;
      response += `Client: **${client.name}**\n`;
      if (client.company) {
        response += `Company: ${client.company}\n`;
      }
      if (client.phone) {
        response += `Phone: ${client.phone}\n`;
      }
      if (client.email) {
        response += `Email: ${client.email}\n`;
      }
    }

    return response;
  }

  // Default response
  return `I'm here to help! Based on your current context, I can:\n\n`;
}

