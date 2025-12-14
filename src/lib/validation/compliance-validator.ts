/**
 * Compliance Validator
 * 
 * Validates records against OAC 5123 compliance rules
 */

import {
  Validator,
  ValidatorType,
  ValidationResult,
  ValidationIssue,
  ValidationContext,
  createValidationIssue,
  createValidationResult,
} from './types';
import {
  OAC_RULES,
  getOACRule,
  getOACRulesByCategory,
} from './oac-rules';
import { RecordData } from './record-validator';

/**
 * Compliance validation data
 */
export interface ComplianceData {
  /** Record data to validate */
  record?: RecordData;
  
  /** SOP response data (optional) */
  sopResponse?: {
    steps: any[];
    completedSteps: any[];
  };
  
  /** Record type */
  recordType?: 'service' | 'incident' | 'sop_response' | 'documentation';
  
  /** Additional compliance context */
  context?: {
    isIncident?: boolean;
    requiresLocation?: boolean;
    requiresStaffVerification?: boolean;
  };
}

/**
 * Compliance Validator
 * 
 * Validates records against OAC 5123 compliance rules
 */
export class ComplianceValidator implements Validator {
  getValidatorType(): ValidatorType {
    return 'compliance';
  }

  getValidatorName(): string {
    return 'OAC 5123 Compliance Validator';
  }

  validate(data: any, context?: ValidationContext): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Validate input structure
    if (!data || typeof data !== 'object') {
      return createValidationResult(
        'compliance',
        [
          createValidationIssue(
            'data',
            'Invalid data structure: expected compliance data object',
            { blocking: true, ruleRef: 'OAC 5123.0412' }
          ),
        ],
        [],
        'Invalid input data'
      );
    }

    const complianceData = data as ComplianceData;
    const record = complianceData.record;
    const recordType = complianceData.recordType || 'service';

    // Run compliance checks based on record type
    if (record) {
      this.checkDocumentationRequirements(record, recordType, errors, warnings);
      this.checkTimestampRequirements(record, errors, warnings);
      this.checkStaffQualificationRequirements(record, context, errors, warnings);
      this.checkServiceDescriptionRequirements(record, recordType, errors, warnings);
      
      if (complianceData.context?.isIncident || recordType === 'incident') {
        this.checkIncidentReportingRequirements(record, errors, warnings);
      }
    }

    if (complianceData.sopResponse) {
      this.checkSOPCompliance(complianceData.sopResponse, errors, warnings);
    }

    // Determine if submission is allowed
    const blockingErrors = errors.filter(e => e.blocking);
    const canSubmit = blockingErrors.length === 0;
    const isValid = errors.length === 0 && warnings.length === 0;

    const summary = isValid
      ? 'Compliance validation passed - all OAC 5123 requirements met'
      : canSubmit
      ? `Compliance validation passed with ${warnings.length} warning(s). Submission allowed.`
      : `Compliance validation failed with ${blockingErrors.length} blocking violation(s). Submission blocked.`;

    return createValidationResult('compliance', errors, warnings, summary);
  }

  /**
   * Check documentation requirements (OAC 5123.0412)
   */
  private checkDocumentationRequirements(
    record: RecordData,
    recordType: string,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const rule = getOACRule('OAC 5123.0412');
    if (!rule) return;

    // Check required fields
    const hasStaffId = !!(record.staffId);
    const hasTimestamp = !!(record.timestamp || record.createdAt);
    const hasDescription = !!(record.serviceDescription || record.description || record.notes);
    const hasLocation = !!(record.location);

    if (!hasStaffId) {
      errors.push(
        createValidationIssue(
          'staffId',
          'Staff ID is required for compliance (OAC 5123.0412)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Ensure staff ID is provided in the record',
          }
        )
      );
    }

    if (!hasTimestamp) {
      errors.push(
        createValidationIssue(
          'timestamp',
          'Timestamp is required for compliance (OAC 5123.0412)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Provide timestamp or createdAt field',
          }
        )
      );
    }

    if (!hasDescription) {
      errors.push(
        createValidationIssue(
          'serviceDescription',
          'Service description is required for compliance (OAC 5123.0412)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Provide a description of the service provided',
          }
        )
      );
    }

    // Location warning for certain record types
    if (!hasLocation && (recordType === 'incident' || recordType === 'service')) {
      const locationRule = getOACRule('OAC 5123.0417');
      if (locationRule) {
        warnings.push(
          createValidationIssue(
            'location',
            'Location is recommended for compliance (OAC 5123.0417)',
            {
              blocking: locationRule.blocking,
              ruleRef: locationRule.reference,
              severity: locationRule.severity,
              suggestion: 'Provide location where service was provided or incident occurred',
            }
          )
        );
      }
    }
  }

  /**
   * Check timestamp requirements (OAC 5123.0413)
   */
  private checkTimestampRequirements(
    record: RecordData,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const rule = getOACRule('OAC 5123.0413');
    if (!rule) return;

    const timestampStr = record.timestamp || record.createdAt;
    if (!timestampStr) return; // Already handled in documentation requirements

    const timestamp = new Date(timestampStr);

    if (isNaN(timestamp.getTime())) {
      errors.push(
        createValidationIssue(
          'timestamp',
          'Invalid timestamp format violates compliance (OAC 5123.0413)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Ensure timestamp is in valid ISO 8601 format',
          }
        )
      );
      return;
    }

    // Check for future timestamps
    if (timestamp.getTime() > Date.now()) {
      const timelineRule = getOACRule('OAC 5123.0419');
      if (timelineRule) {
        warnings.push(
          createValidationIssue(
            'timestamp',
            'Future timestamp should be verified for compliance (OAC 5123.0419)',
            {
              blocking: timelineRule.blocking,
              ruleRef: timelineRule.reference,
              severity: timelineRule.severity,
              suggestion: 'Verify the timestamp is correct',
            }
          )
        );
      }
    }

    // Check for very old timestamps
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    if (timestamp.getTime() < oneYearAgo) {
      const timelineRule = getOACRule('OAC 5123.0419');
      if (timelineRule) {
        warnings.push(
          createValidationIssue(
            'timestamp',
            'Timestamp more than 1 year old should be verified for compliance (OAC 5123.0419)',
            {
              blocking: timelineRule.blocking,
              ruleRef: timelineRule.reference,
              severity: timelineRule.severity,
              suggestion: 'Verify the timestamp is correct',
            }
          )
        );
      }
    }
  }

  /**
   * Check staff qualification requirements (OAC 5123.0414)
   */
  private checkStaffQualificationRequirements(
    record: RecordData,
    context: ValidationContext | undefined,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const rule = getOACRule('OAC 5123.0414');
    if (!rule) return;

    const staffId = record.staffId || context?.userId;
    if (!staffId) {
      errors.push(
        createValidationIssue(
          'staffId',
          'Staff ID is required for compliance (OAC 5123.0414)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Ensure qualified staff ID is provided',
          }
        )
      );
      return;
    }

    // Basic format validation
    if (typeof staffId !== 'string' || !staffId.trim()) {
      errors.push(
        createValidationIssue(
          'staffId',
          'Staff ID must be valid for compliance (OAC 5123.0414)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Provide a valid staff ID',
          }
        )
      );
    }

    // Note: In a real implementation, you would verify staff qualifications
    // against a database of qualified staff members
  }

  /**
   * Check service description requirements (OAC 5123.0415)
   */
  private checkServiceDescriptionRequirements(
    record: RecordData,
    recordType: string,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const rule = getOACRule('OAC 5123.0415');
    if (!rule) return;

    const description = record.serviceDescription || record.description || record.notes;
    if (!description) {
      errors.push(
        createValidationIssue(
          'serviceDescription',
          'Service description is required for compliance (OAC 5123.0415)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Provide a complete service description',
          }
        )
      );
      return;
    }

    const descriptionText = description.trim();

    // Minimum length requirement (10 characters)
    if (descriptionText.length < 10) {
      errors.push(
        createValidationIssue(
          'serviceDescription',
          'Service description must be at least 10 characters for compliance (OAC 5123.0415)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Provide a more detailed description (minimum 10 characters)',
          }
        )
      );
    }

    // Recommended length (50 characters)
    if (descriptionText.length < 50) {
      const completenessRule = getOACRule('OAC 5123.0418');
      if (completenessRule) {
        warnings.push(
          createValidationIssue(
            'serviceDescription',
            'Service description should be at least 50 characters for compliance (OAC 5123.0418)',
            {
              blocking: completenessRule.blocking,
              ruleRef: completenessRule.reference,
              severity: completenessRule.severity,
              suggestion: 'Add more detail to meet recommended documentation requirements (50+ characters)',
            }
          )
        );
      }
    }
  }

  /**
   * Check incident reporting requirements (OAC 5123.0416)
   */
  private checkIncidentReportingRequirements(
    record: RecordData,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const rule = getOACRule('OAC 5123.0416');
    if (!rule) return;

    // Incident reports require location
    if (!record.location) {
      errors.push(
        createValidationIssue(
          'location',
          'Location is required for incident reports (OAC 5123.0416)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Provide specific location where incident occurred',
          }
        )
      );
    }

    // Incident reports require detailed description
    const description = record.serviceDescription || record.description || record.notes;
    if (description && description.trim().length < 50) {
      errors.push(
        createValidationIssue(
          'serviceDescription',
          'Incident reports require detailed description (minimum 50 characters) (OAC 5123.0416)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: 'Provide a comprehensive description of the incident (minimum 50 characters)',
          }
        )
      );
    }
  }

  /**
   * Check SOP compliance
   */
  private checkSOPCompliance(
    sopResponse: { steps: any[]; completedSteps: any[] },
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const rule = getOACRule('OAC 5123.0412');
    if (!rule) return;

    // Check that all required steps are completed
    const totalSteps = sopResponse.steps.length;
    const completedSteps = sopResponse.completedSteps.length;

    if (completedSteps < totalSteps) {
      errors.push(
        createValidationIssue(
          'sopCompletion',
          'All SOP steps must be completed for compliance (OAC 5123.0412)',
          {
            blocking: rule.blocking,
            ruleRef: rule.reference,
            severity: rule.severity,
            suggestion: `Complete all ${totalSteps} steps in the SOP`,
          }
        )
      );
    }

    // Check that completed steps have notes
    const stepsWithoutNotes = sopResponse.completedSteps.filter(
      (step: any) => !step.notes || !step.notes.trim()
    );

    if (stepsWithoutNotes.length > 0) {
      warnings.push(
        createValidationIssue(
          'sopNotes',
          'SOP steps should have notes for compliance documentation (OAC 5123.0418)',
          {
            blocking: false,
            ruleRef: 'OAC 5123.0418',
            severity: 'warning',
            suggestion: 'Add notes to completed SOP steps for better documentation',
          }
        )
      );
    }
  }
}



