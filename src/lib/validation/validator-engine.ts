/**
 * Validator Engine
 * 
 * Unified validator engine that orchestrates all validators
 */

import {
  Validator,
  ValidatorType,
  ValidationResult,
  CombinedValidationResult,
  ValidationContext,
  ValidationRequest,
  ValidationIssue,
  createValidationResult,
} from './types';
import { SOPValidator } from './sop-validator';
import { RecordValidator } from './record-validator';
import { ComplianceValidator } from './compliance-validator';

/**
 * Validator Engine
 * 
 * Central orchestrator for all validators in the system
 */
export class ValidatorEngine {
  private validators: Map<ValidatorType, Validator> = new Map();

  constructor() {
    // Register built-in validators
    this.registerValidator(new SOPValidator());
    this.registerValidator(new RecordValidator());
    this.registerValidator(new ComplianceValidator());
    // TODO: Register other validators as they are implemented
    // this.registerValidator(new BillingValidator());
  }

  /**
   * Register a validator
   */
  registerValidator(validator: Validator): void {
    this.validators.set(validator.getValidatorType(), validator);
  }

  /**
   * Get a validator by type
   */
  getValidator(type: ValidatorType): Validator | undefined {
    return this.validators.get(type);
  }

  /**
   * Validate data using a specific validator
   */
  validate(
    validatorType: ValidatorType,
    data: any,
    context?: ValidationContext
  ): ValidationResult {
    const validator = this.getValidator(validatorType);

    if (!validator) {
      return createValidationResult(
        validatorType,
        [
          {
            field: 'validator',
            message: `Validator type '${validatorType}' is not available`,
            severity: 'error',
            blocking: true,
          },
        ],
        [],
        `Validator '${validatorType}' not found`
      );
    }

    try {
      return validator.validate(data, context);
    } catch (error) {
      console.error(`Validation error in ${validatorType}:`, error);
      return createValidationResult(
        validatorType,
        [
          {
            field: 'validator',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            blocking: true,
            metadata: { error: error instanceof Error ? error.stack : String(error) },
          },
        ],
        [],
        `Validation error occurred`
      );
    }
  }

  /**
   * Validate using multiple validators and combine results
   */
  validateMultiple(
    requests: ValidationRequest[]
  ): CombinedValidationResult {
    const results: ValidationResult[] = [];
    const allErrors: ValidationIssue[] = [];
    const allWarnings: ValidationIssue[] = [];

    // Run all validations
    for (const request of requests) {
      const result = this.validate(
        request.validatorType,
        request.data,
        request.context
      );
      results.push(result);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    // Determine overall status
    const blockingErrors = allErrors.filter(e => e.blocking);
    const canSubmit = blockingErrors.length === 0;
    const isValid = allErrors.length === 0 && allWarnings.length === 0;

    // Generate summary
    const errorCount = allErrors.length;
    const warningCount = allWarnings.length;
    const blockingCount = blockingErrors.length;

    let summary = '';
    if (isValid) {
      summary = 'All validations passed';
    } else if (canSubmit) {
      summary = `Validation passed with ${warningCount} warning(s). Submission allowed.`;
    } else {
      summary = `Validation failed with ${blockingCount} blocking error(s) and ${errorCount - blockingCount} non-blocking error(s). Submission blocked.`;
      if (warningCount > 0) {
        summary += ` Also found ${warningCount} warning(s).`;
      }
    }

    return {
      isValid,
      canSubmit,
      allErrors,
      allWarnings,
      results,
      summary,
      blockingErrorCount: blockingCount,
      warningCount,
    };
  }

  /**
   * Get list of available validator types
   */
  getAvailableValidators(): ValidatorType[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Check if a validator type is available
   */
  hasValidator(type: ValidatorType): boolean {
    return this.validators.has(type);
  }
}

// Export singleton instance
export const validatorEngine = new ValidatorEngine();

