/**
 * Validation Types
 * 
 * Standardized types for the validation framework
 */

/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Validator types supported by the system
 */
export type ValidatorType = 'record' | 'sop' | 'compliance' | 'billing';

/**
 * Validation error/warning with rule reference
 */
export interface ValidationIssue {
  /** Field or step that has the issue */
  field: string;
  
  /** Human-readable error message */
  message: string;
  
  /** OAC 5123 rule reference (e.g., 'OAC 5123.0412') */
  ruleRef?: string;
  
  /** Severity level */
  severity: ValidationSeverity;
  
  /** Whether this issue blocks submission */
  blocking: boolean;
  
  /** Optional suggestion for fixing the issue */
  suggestion?: string;
  
  /** Optional step number (for SOP validation) */
  step?: number;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Validation result from a single validator
 */
export interface ValidationResult {
  /** Whether validation passed (no blocking errors) */
  isValid: boolean;
  
  /** Whether submission is allowed (no blocking errors) */
  canSubmit: boolean;
  
  /** List of validation errors (blocking) */
  errors: ValidationIssue[];
  
  /** List of validation warnings (non-blocking) */
  warnings: ValidationIssue[];
  
  /** Validator type that produced this result */
  validatorType: ValidatorType;
  
  /** Optional summary message */
  summary?: string;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Combined validation result from multiple validators
 */
export interface CombinedValidationResult {
  /** Whether overall validation passed */
  isValid: boolean;
  
  /** Whether submission is allowed */
  canSubmit: boolean;
  
  /** All errors from all validators */
  allErrors: ValidationIssue[];
  
  /** All warnings from all validators */
  allWarnings: ValidationIssue[];
  
  /** Results from individual validators */
  results: ValidationResult[];
  
  /** Summary of validation status */
  summary: string;
  
  /** Count of blocking errors */
  blockingErrorCount: number;
  
  /** Count of non-blocking warnings */
  warningCount: number;
}

/**
 * Validator interface that all validators must implement
 */
export interface Validator {
  /**
   * Validate the provided data
   */
  validate(data: any, context?: ValidationContext): ValidationResult;
  
  /**
   * Get the type of this validator
   */
  getValidatorType(): ValidatorType;
  
  /**
   * Get the name of this validator
   */
  getValidatorName(): string;
}

/**
 * Context information for validation
 */
export interface ValidationContext {
  /** User ID performing the validation */
  userId?: string;
  
  /** Client ID if applicable */
  clientId?: string;
  
  /** Alert ID if applicable */
  alertId?: string;
  
  /** SOP Response ID if applicable */
  sopResponseId?: string;
  
  /** Additional context data */
  additionalData?: Record<string, any>;
}

/**
 * Validation request payload
 */
export interface ValidationRequest {
  /** Type of validator to use */
  validatorType: ValidatorType;
  
  /** Data to validate */
  data: any;
  
  /** Optional context */
  context?: ValidationContext;
}

/**
 * Helper function to create a validation issue
 */
export function createValidationIssue(
  field: string,
  message: string,
  options: {
    ruleRef?: string;
    severity?: ValidationSeverity;
    blocking?: boolean;
    suggestion?: string;
    step?: number;
    metadata?: Record<string, any>;
  } = {}
): ValidationIssue {
  return {
    field,
    message,
    ruleRef: options.ruleRef,
    severity: options.severity || 'error',
    blocking: options.blocking !== undefined ? options.blocking : options.severity === 'error',
    suggestion: options.suggestion,
    step: options.step,
    metadata: options.metadata,
  };
}

/**
 * Helper function to create a validation result
 */
export function createValidationResult(
  validatorType: ValidatorType,
  errors: ValidationIssue[] = [],
  warnings: ValidationIssue[] = [],
  summary?: string,
  metadata?: Record<string, any>
): ValidationResult {
  const blockingErrors = errors.filter(e => e.blocking);
  const canSubmit = blockingErrors.length === 0;
  const isValid = errors.length === 0 && warnings.length === 0;

  return {
    isValid,
    canSubmit,
    errors,
    warnings,
    validatorType,
    summary: summary || (isValid ? 'Validation passed' : `Found ${errors.length} error(s) and ${warnings.length} warning(s)`),
    metadata,
  };
}



