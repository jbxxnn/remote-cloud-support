/**
 * Record Validator
 * 
 * Validates service records, documentation records, and incident records
 * according to business rules and OAC 5123 compliance
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

/**
 * Record data structure
 */
export interface RecordData {
  /** Staff ID who created the record */
  staffId?: string;
  
  /** Client ID (optional) */
  clientId?: string;
  
  /** Alert ID (optional) */
  alertId?: string;
  
  /** Timestamp when record was created */
  timestamp?: string;
  createdAt?: string;
  
  /** Location where service was provided */
  location?: string;
  
  /** Service description or documentation */
  serviceDescription?: string;
  description?: string;
  notes?: string;
  
  /** Record type */
  recordType?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Record Validator
 * 
 * Validates records for completeness, timestamps, staff verification, and compliance
 */
export class RecordValidator implements Validator {
  getValidatorType(): ValidatorType {
    return 'record';
  }

  getValidatorName(): string {
    return 'Record Validator';
  }

  validate(data: any, context?: ValidationContext): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Validate input structure
    if (!data || typeof data !== 'object') {
      return createValidationResult(
        'record',
        [
          createValidationIssue(
            'data',
            'Invalid data structure: expected object with record fields',
            { blocking: true, ruleRef: 'OAC 5123.0412' }
          ),
        ],
        [],
        'Invalid input data'
      );
    }

    const record = data as RecordData;

    // Validate required fields
    this.validateRequiredFields(record, context, errors);
    
    // Validate timestamps
    this.validateTimestamps(record, errors, warnings);
    
    // Validate staff ID
    this.validateStaffId(record, context, errors);
    
    // Validate location
    this.validateLocation(record, warnings);
    
    // Validate service description
    this.validateServiceDescription(record, errors, warnings);

    // Determine if submission is allowed
    const blockingErrors = errors.filter(e => e.blocking);
    const canSubmit = blockingErrors.length === 0;
    const isValid = errors.length === 0 && warnings.length === 0;

    const summary = isValid
      ? 'Record validation passed'
      : canSubmit
      ? `Record has ${warnings.length} warning(s) but can be submitted`
      : `Record has ${blockingErrors.length} blocking error(s) and cannot be submitted`;

    return createValidationResult('record', errors, warnings, summary);
  }

  /**
   * Validate required fields are present
   */
  private validateRequiredFields(
    record: RecordData,
    context: ValidationContext | undefined,
    errors: ValidationIssue[]
  ): void {
    // Staff ID is required (can come from record or context)
    if (!record.staffId && !context?.userId) {
      errors.push(
        createValidationIssue(
          'staffId',
          'Staff ID is required for record creation',
          {
            blocking: true,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Ensure staff ID is provided in the record or context',
          }
        )
      );
    }

    // Timestamp is required
    if (!record.timestamp && !record.createdAt) {
      errors.push(
        createValidationIssue(
          'timestamp',
          'Timestamp is required for record creation',
          {
            blocking: true,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Provide timestamp or createdAt field',
          }
        )
      );
    }

    // Service description is required
    const description = record.serviceDescription || record.description || record.notes;
    if (!description || !description.trim()) {
      errors.push(
        createValidationIssue(
          'serviceDescription',
          'Service description is required',
          {
            blocking: true,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Provide a description of the service provided or action taken',
          }
        )
      );
    }
  }

  /**
   * Validate timestamps are valid
   */
  private validateTimestamps(
    record: RecordData,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const timestampStr = record.timestamp || record.createdAt;
    if (!timestampStr) return; // Already handled in required fields

    const timestamp = new Date(timestampStr);

    if (isNaN(timestamp.getTime())) {
      errors.push(
        createValidationIssue(
          'timestamp',
          'Invalid timestamp format',
          {
            blocking: true,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Ensure timestamp is in a valid date format (ISO 8601 recommended)',
          }
        )
      );
      return;
    }

    // Check if timestamp is in the future
    if (timestamp.getTime() > Date.now()) {
      warnings.push(
        createValidationIssue(
          'timestamp',
          'Timestamp is in the future',
          {
            blocking: false,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Verify the timestamp is correct',
          }
        )
      );
    }

    // Check if timestamp is too old (more than 1 year)
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    if (timestamp.getTime() < oneYearAgo) {
      warnings.push(
        createValidationIssue(
          'timestamp',
          'Timestamp is more than 1 year old',
          {
            blocking: false,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Verify the timestamp is correct',
          }
        )
      );
    }
  }

  /**
   * Validate staff ID exists and is valid
   */
  private validateStaffId(
    record: RecordData,
    context: ValidationContext | undefined,
    errors: ValidationIssue[]
  ): void {
    const staffId = record.staffId || context?.userId;
    if (!staffId) return; // Already handled in required fields

    // Basic format validation (should be a non-empty string)
    if (typeof staffId !== 'string' || !staffId.trim()) {
      errors.push(
        createValidationIssue(
          'staffId',
          'Staff ID must be a valid string',
          {
            blocking: true,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Provide a valid staff ID',
          }
        )
      );
    }

    // Note: In a real implementation, you might want to verify the staff ID
    // exists in the database. For now, we'll just validate format.
    // This could be enhanced to check against the User table.
  }

  /**
   * Validate location if provided
   */
  private validateLocation(
    record: RecordData,
    warnings: ValidationIssue[]
  ): void {
    if (!record.location) {
      // Location is optional, but warn if missing for certain record types
      if (record.recordType === 'service' || record.recordType === 'incident') {
        warnings.push(
          createValidationIssue(
            'location',
            'Location is recommended for service and incident records',
            {
              blocking: false,
              ruleRef: 'OAC 5123.0412',
              suggestion: 'Provide location where service was provided',
            }
          )
        );
      }
      return;
    }

    // Basic validation: location should not be empty
    if (typeof record.location !== 'string' || !record.location.trim()) {
      warnings.push(
        createValidationIssue(
          'location',
          'Location should be a non-empty string',
          {
            blocking: false,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Provide a valid location description',
          }
        )
      );
    }

    // Check minimum length (at least 3 characters for meaningful location)
    if (record.location.trim().length < 3) {
      warnings.push(
        createValidationIssue(
          'location',
          'Location description is too short',
          {
            blocking: false,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Provide a more detailed location description',
          }
        )
      );
    }
  }

  /**
   * Validate service description is complete
   */
  private validateServiceDescription(
    record: RecordData,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    const description = record.serviceDescription || record.description || record.notes;
    if (!description) return; // Already handled in required fields

    const descriptionText = description.trim();

    // Check minimum length (at least 10 characters for meaningful description)
    if (descriptionText.length < 10) {
      errors.push(
        createValidationIssue(
          'serviceDescription',
          'Service description must be at least 10 characters',
          {
            blocking: true,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Provide a more detailed description of the service or action taken',
          }
        )
      );
    }

    // Check for meaningful content (not just whitespace or repeated characters)
    const uniqueChars = new Set(descriptionText.toLowerCase().replace(/\s+/g, ''));
    if (uniqueChars.size < 3) {
      warnings.push(
        createValidationIssue(
          'serviceDescription',
          'Service description appears to be too generic or incomplete',
          {
            blocking: false,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Provide more specific details about what was done',
          }
        )
      );
    }

    // Check recommended length (at least 50 characters for good documentation)
    if (descriptionText.length < 50) {
      warnings.push(
        createValidationIssue(
          'serviceDescription',
          'Service description is recommended to be at least 50 characters for compliance',
          {
            blocking: false,
            ruleRef: 'OAC 5123.0412',
            suggestion: 'Add more detail to meet documentation requirements',
          }
        )
      );
    }
  }
}



