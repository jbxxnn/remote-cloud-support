/**
 * SOP Validator
 * 
 * Validates SOP responses according to business rules and OAC 5123 compliance
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

interface SOPStep {
  step?: number;
  action?: string;
  details?: string;
  description?: string;
  text?: string;
  content?: string;
  required?: boolean;
  minNotesLength?: number;
}

interface CompletedStep {
  step: number;
  action: string;
  completedAt: string;
  notes?: string | null;
}

interface SOPValidationData {
  steps: SOPStep[];
  completedSteps: CompletedStep[];
}

/**
 * SOP Validator
 * 
 * Validates SOP responses for completeness, timestamps, and compliance
 */
export class SOPValidator implements Validator {
  getValidatorType(): ValidatorType {
    return 'sop';
  }

  getValidatorName(): string {
    return 'SOP Response Validator';
  }

  validate(data: any, context?: ValidationContext): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Validate input structure
    if (!data || typeof data !== 'object') {
      return createValidationResult(
        'sop',
        [
          createValidationIssue(
            'data',
            'Invalid data structure: expected object with steps and completedSteps',
            { blocking: true }
          ),
        ],
        [],
        'Invalid input data'
      );
    }

    const validationData = data as SOPValidationData;
    const { steps, completedSteps } = validationData;

    if (!Array.isArray(steps)) {
      return createValidationResult(
        'sop',
        [
          createValidationIssue(
            'steps',
            'Steps must be an array',
            { blocking: true, ruleRef: 'OAC 5123.0412' }
          ),
        ],
        [],
        'Invalid steps structure'
      );
    }

    if (!Array.isArray(completedSteps)) {
      return createValidationResult(
        'sop',
        [
          createValidationIssue(
            'completedSteps',
            'Completed steps must be an array',
            { blocking: true, ruleRef: 'OAC 5123.0412' }
          ),
        ],
        [],
        'Invalid completed steps structure'
      );
    }

    // Run all validation checks
    this.validateStepCompleteness(steps, completedSteps, errors, warnings);
    this.validateTimestamps(completedSteps, errors, warnings);
    this.validateRequiredFields(steps, completedSteps, errors, warnings);
    this.validateNotes(steps, completedSteps, warnings);

    // Determine if submission is allowed
    const blockingErrors = errors.filter(e => e.blocking);
    const canSubmit = blockingErrors.length === 0;
    const isValid = errors.length === 0 && warnings.length === 0;

    const summary = isValid
      ? 'SOP response validation passed'
      : canSubmit
      ? `SOP response has ${warnings.length} warning(s) but can be submitted`
      : `SOP response has ${blockingErrors.length} blocking error(s) and cannot be submitted`;

    return createValidationResult('sop', errors, warnings, summary);
  }

  /**
   * Validate that all required steps are completed
   */
  private validateStepCompleteness(
    steps: SOPStep[],
    completedSteps: CompletedStep[],
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      const isRequired = step.required !== false; // Default to required if not specified
      const completedStep = completedSteps.find(cs => cs.step === stepNumber);

      if (isRequired && !completedStep) {
        errors.push(
          createValidationIssue(
            'completion',
            `Step ${stepNumber} is required but not completed`,
            {
              blocking: true,
              ruleRef: 'OAC 5123.0412',
              step: stepNumber,
              suggestion: `Complete step ${stepNumber}: ${step.action || 'N/A'}`,
            }
          )
        );
      }
    });
  }

  /**
   * Validate timestamps are valid
   */
  private validateTimestamps(
    completedSteps: CompletedStep[],
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    completedSteps.forEach(step => {
      const timestamp = new Date(step.completedAt);

      if (isNaN(timestamp.getTime())) {
        errors.push(
          createValidationIssue(
            'timestamp',
            `Step ${step.step} has an invalid timestamp`,
            {
              blocking: true,
              ruleRef: 'OAC 5123.0412',
              step: step.step,
              suggestion: 'Ensure the completion timestamp is a valid date',
            }
          )
        );
      } else {
        // Check if timestamp is in the future
        if (timestamp.getTime() > Date.now()) {
          warnings.push(
            createValidationIssue(
              'timestamp',
              `Step ${step.step} timestamp is in the future`,
              {
                blocking: false,
                ruleRef: 'OAC 5123.0412',
                step: step.step,
                suggestion: 'Verify the completion time is correct',
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
              `Step ${step.step} timestamp is more than 1 year old`,
              {
                blocking: false,
                ruleRef: 'OAC 5123.0412',
                step: step.step,
                suggestion: 'Verify the completion time is correct',
              }
            )
          );
        }
      }
    });
  }

  /**
   * Validate that required fields are filled
   */
  private validateRequiredFields(
    steps: SOPStep[],
    completedSteps: CompletedStep[],
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    completedSteps.forEach(completedStep => {
      const step = steps[completedStep.step - 1];
      if (!step) return;

      // Check if action is present
      if (!completedStep.action || !completedStep.action.trim()) {
        errors.push(
          createValidationIssue(
            'action',
            `Step ${completedStep.step} action is required`,
            {
              blocking: true,
              ruleRef: 'OAC 5123.0412',
              step: completedStep.step,
              suggestion: 'Provide the action taken for this step',
            }
          )
        );
      }

      // Check if completedAt is present
      if (!completedStep.completedAt) {
        errors.push(
          createValidationIssue(
            'completedAt',
            `Step ${completedStep.step} completion timestamp is required`,
            {
              blocking: true,
              ruleRef: 'OAC 5123.0412',
              step: completedStep.step,
              suggestion: 'Record when this step was completed',
            }
          )
        );
      }
    });
  }

  /**
   * Validate notes meet requirements
   */
  private validateNotes(
    steps: SOPStep[],
    completedSteps: CompletedStep[],
    warnings: ValidationIssue[]
  ): void {
    completedSteps.forEach(completedStep => {
      const step = steps[completedStep.step - 1];
      if (!step) return;

      // Check notes length if step is completed
      if (completedStep && step.minNotesLength) {
        const notesLength = (completedStep.notes || '').trim().length;
        if (notesLength < step.minNotesLength) {
          warnings.push(
            createValidationIssue(
              'notes',
              `Step ${completedStep.step} notes should be at least ${step.minNotesLength} characters`,
              {
                blocking: false,
                ruleRef: 'OAC 5123.0412',
                step: completedStep.step,
                suggestion: `Add more detail to meet the minimum ${step.minNotesLength} character requirement`,
              }
            )
          );
        }
      }

      // Check if notes are required but empty
      if (completedStep && step.required && !completedStep.notes?.trim()) {
        warnings.push(
          createValidationIssue(
            'notes',
            `Step ${completedStep.step} notes are recommended but empty`,
            {
              blocking: false,
              ruleRef: 'OAC 5123.0412',
              step: completedStep.step,
              suggestion: 'Add notes to document what was done',
            }
          )
        );
      }
    });
  }

  /**
   * Get validation message for a specific step
   * (Legacy method for backward compatibility)
   */
  static getStepValidationMessage(
    stepNumber: number,
    validationResult: ValidationResult
  ): string | null {
    const stepErrors = validationResult.errors.filter(e => e.step === stepNumber);
    const stepWarnings = validationResult.warnings.filter(w => w.step === stepNumber);

    if (stepErrors.length > 0) {
      return stepErrors.map(e => e.message).join(', ');
    }

    if (stepWarnings.length > 0) {
      return stepWarnings.map(w => w.message).join(', ');
    }

    return null;
  }

  /**
   * Comprehensive validation of SOP response
   * (Legacy static method for backward compatibility)
   */
  static validateSOPResponse(
    steps: SOPStep[],
    completedSteps: CompletedStep[]
  ): ValidationResult {
    const validator = new SOPValidator();
    return validator.validate({ steps, completedSteps });
  }
}
