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

interface ValidationError {
  step: number;
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class SOPValidator {
  /**
   * Validate that all required steps are completed
   */
  static validateStepCompleteness(
    steps: SOPStep[],
    completedSteps: CompletedStep[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      const isRequired = step.required !== false; // Default to required if not specified
      const completedStep = completedSteps.find(cs => cs.step === stepNumber);

      if (isRequired && !completedStep) {
        errors.push({
          step: stepNumber,
          field: 'completion',
          message: `Step ${stepNumber} is required but not completed`
        });
      }

      // Check notes length if step is completed
      if (completedStep && step.minNotesLength) {
        const notesLength = (completedStep.notes || '').trim().length;
        if (notesLength < step.minNotesLength) {
          warnings.push({
            step: stepNumber,
            field: 'notes',
            message: `Step ${stepNumber} notes should be at least ${step.minNotesLength} characters`
          });
        }
      }

      // Check if notes are required but empty
      if (completedStep && step.required && !completedStep.notes?.trim()) {
        warnings.push({
          step: stepNumber,
          field: 'notes',
          message: `Step ${stepNumber} notes are recommended but empty`
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate timestamps are valid
   */
  static validateTimestamps(completedSteps: CompletedStep[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    completedSteps.forEach(step => {
      const timestamp = new Date(step.completedAt);
      
      if (isNaN(timestamp.getTime())) {
        errors.push({
          step: step.step,
          field: 'timestamp',
          message: `Step ${step.step} has an invalid timestamp`
        });
      } else {
        // Check if timestamp is in the future
        if (timestamp.getTime() > Date.now()) {
          warnings.push({
            step: step.step,
            field: 'timestamp',
            message: `Step ${step.step} timestamp is in the future`
          });
        }

        // Check if timestamp is too old (more than 1 year)
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        if (timestamp.getTime() < oneYearAgo) {
          warnings.push({
            step: step.step,
            field: 'timestamp',
            message: `Step ${step.step} timestamp is more than 1 year old`
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate that required fields are filled
   */
  static validateRequiredFields(
    steps: SOPStep[],
    completedSteps: CompletedStep[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    completedSteps.forEach(completedStep => {
      const step = steps[completedStep.step - 1];
      if (!step) return;

      // Check if action is present
      if (!completedStep.action || !completedStep.action.trim()) {
        errors.push({
          step: completedStep.step,
          field: 'action',
          message: `Step ${completedStep.step} action is required`
        });
      }

      // Check if completedAt is present
      if (!completedStep.completedAt) {
        errors.push({
          step: completedStep.step,
          field: 'completedAt',
          message: `Step ${completedStep.step} completion timestamp is required`
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Comprehensive validation of SOP response
   */
  static validateSOPResponse(
    steps: SOPStep[],
    completedSteps: CompletedStep[]
  ): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Run all validations
    const completenessResult = this.validateStepCompleteness(steps, completedSteps);
    const timestampResult = this.validateTimestamps(completedSteps);
    const fieldsResult = this.validateRequiredFields(steps, completedSteps);

    // Combine results
    allErrors.push(...completenessResult.errors);
    allErrors.push(...timestampResult.errors);
    allErrors.push(...fieldsResult.errors);

    allWarnings.push(...completenessResult.warnings);
    allWarnings.push(...timestampResult.warnings);
    allWarnings.push(...fieldsResult.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Get validation message for a specific step
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
}

