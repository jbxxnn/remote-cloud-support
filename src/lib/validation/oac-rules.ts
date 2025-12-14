/**
 * OAC 5123 Rules
 * 
 * Ohio Administrative Code Section 5123 compliance rules
 * for developmental disabilities services documentation
 */

/**
 * OAC 5123 Rule Definition
 */
export interface OACRule {
  /** Rule reference (e.g., 'OAC 5123.0412') */
  reference: string;
  
  /** Rule title */
  title: string;
  
  /** Full rule text or description */
  description: string;
  
  /** Category of the rule */
  category: 'documentation' | 'timestamp' | 'staff_qualification' | 'service_description' | 'incident_reporting';
  
  /** Whether violation of this rule blocks submission */
  blocking: boolean;
  
  /** Severity level */
  severity: 'error' | 'warning';
}

/**
 * OAC 5123 Rule Database
 * 
 * Contains all OAC 5123 compliance rules
 */
export const OAC_RULES: Record<string, OACRule> = {
  'OAC 5123.0412': {
    reference: 'OAC 5123.0412',
    title: 'Documentation Requirements',
    description: 'All service records must include complete documentation with required fields: staff ID, timestamp, service description, and location (when applicable).',
    category: 'documentation',
    blocking: true,
    severity: 'error',
  },
  'OAC 5123.0413': {
    reference: 'OAC 5123.0413',
    title: 'Timestamp Requirements',
    description: 'All records must have valid timestamps that are not in the future and are within reasonable timeframes. Timestamps must be accurate and verifiable.',
    category: 'timestamp',
    blocking: true,
    severity: 'error',
  },
  'OAC 5123.0414': {
    reference: 'OAC 5123.0414',
    title: 'Staff Qualification Requirements',
    description: 'All service records must identify qualified staff members who performed the service. Staff must be properly credentialed and authorized.',
    category: 'staff_qualification',
    blocking: true,
    severity: 'error',
  },
  'OAC 5123.0415': {
    reference: 'OAC 5123.0415',
    title: 'Service Description Requirements',
    description: 'Service descriptions must be complete, detailed, and accurately describe the service provided. Minimum length requirements apply for compliance.',
    category: 'service_description',
    blocking: true,
    severity: 'error',
  },
  'OAC 5123.0416': {
    reference: 'OAC 5123.0416',
    title: 'Incident Reporting Requirements',
    description: 'All incidents must be reported promptly with complete documentation including incident type, location, involved parties, and actions taken.',
    category: 'incident_reporting',
    blocking: true,
    severity: 'error',
  },
  'OAC 5123.0417': {
    reference: 'OAC 5123.0417',
    title: 'Location Documentation',
    description: 'Location information is recommended for all service records and required for incident reports. Location should be specific and verifiable.',
    category: 'documentation',
    blocking: false,
    severity: 'warning',
  },
  'OAC 5123.0418': {
    reference: 'OAC 5123.0418',
    title: 'Service Description Completeness',
    description: 'Service descriptions should be comprehensive (minimum 50 characters recommended) and include sufficient detail for compliance and audit purposes.',
    category: 'service_description',
    blocking: false,
    severity: 'warning',
  },
  'OAC 5123.0419': {
    reference: 'OAC 5123.0419',
    title: 'Timeline Accuracy',
    description: 'Timestamps should be accurate and reflect the actual time services were provided. Future timestamps or timestamps more than 1 year old should be verified.',
    category: 'timestamp',
    blocking: false,
    severity: 'warning',
  },
};

/**
 * Get OAC rule by reference
 */
export function getOACRule(reference: string): OACRule | undefined {
  return OAC_RULES[reference];
}

/**
 * Get all OAC rules
 */
export function getAllOACRules(): OACRule[] {
  return Object.values(OAC_RULES);
}

/**
 * Get OAC rules by category
 */
export function getOACRulesByCategory(category: OACRule['category']): OACRule[] {
  return Object.values(OAC_RULES).filter(rule => rule.category === category);
}

/**
 * Get blocking OAC rules
 */
export function getBlockingOACRules(): OACRule[] {
  return Object.values(OAC_RULES).filter(rule => rule.blocking);
}

/**
 * Get non-blocking OAC rules
 */
export function getNonBlockingOACRules(): OACRule[] {
  return Object.values(OAC_RULES).filter(rule => !rule.blocking);
}



