import Ajv, { type JSONSchemaType } from 'ajv';
import envelopeSchema from '@mova/schemas';
import type { ValidateResult } from './types.js';

/**
 * Global AJV instance (2020-12 draft)
 */
let ajvInstance: Ajv;
let validateFn: ReturnType<Ajv['compile']> | null = null;

/**
 * Initialize AJV validator with schema
 */
export async function initializeValidator(): Promise<void> {
  if (ajvInstance && validateFn) {
    return; // Already initialized
  }

  ajvInstance = new Ajv({
    strict: true,
    allErrors: true,
    verbose: true,
  });

  // Compile the envelope schema
  validateFn = ajvInstance.compile(envelopeSchema);
}

/**
 * Validate a JSON object against the envelope schema using AJV
 */
export function ajvValidate(obj: unknown): ValidateResult {
  if (!validateFn) {
    throw new Error(
      'Validator not initialized. Call initializeValidator() first.'
    );
  }

  const valid = validateFn(obj) as boolean;

  return {
    ok: valid,
    errors: valid ? undefined : validateFn.errors || [],
  };
}

/**
 * Get the compiled validator function (for advanced usage)
 */
export function getValidator(): ReturnType<Ajv['compile']> | null {
  return validateFn;
}

/**
 * Get AJV instance (for advanced usage)
 */
export function getAjvInstance(): Ajv {
  if (!ajvInstance) {
    throw new Error('AJV instance not initialized. Call initializeValidator().');
  }
  return ajvInstance;
}

/**
 * Reset validator (useful for testing)
 */
export function resetValidator(): void {
  validateFn = null;
  ajvInstance = null as any;
}
