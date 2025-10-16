// Type exports
export type {
  Range,
  Position,
  Diagnostic,
  ValidateResult,
  SchemaOptions,
  CompletionContext,
  CompletionItem,
  IdempotencyKeyOptions,
} from './types.js';

// Validator exports
export { initializeValidator, ajvValidate, getValidator, getAjvInstance } from './validator.js';

// Document validation
export { validateDocument, isValidDocument } from './document-validator.js';

// Error mapping
export { mapAjvErrorsToDiagnostics, mapAjvErrorsWithContext } from './error-mapper.js';

// Completions
export {
  suggestCompletions,
  getVerbDocumentation,
  suggestQuickFixes,
} from './completions.js';

// Idempotency
export {
  generateIdempotencyKey,
  generateIdempotencyKeyUUID,
  isValidIdempotencyKey,
} from './idempotency.js';

// Default export for convenience
import { validateDocument } from './document-validator.js';

export default {
  validateDocument,
};
