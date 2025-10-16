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

// Advanced LSP Features
export { prepareRename, rename } from './rename.js';
export type { WorkspaceEdit } from './rename.js';

export { findReferences } from './references.js';
export type { ReferenceLocation } from './references.js';

export { getDocumentSymbols } from './document-symbols.js';
export type { DocumentSymbol } from './document-symbols.js';

export { getWorkspaceSymbols } from './workspace-symbols.js';
export type { WorkspaceSymbol } from './workspace-symbols.js';

export { formatDocument, formatRange } from './formatting.js';
export type { FormattingOptions } from './formatting.js';

// Advanced Features (БЛОК 2)
// Execute Command - Dry-run Executor
export { executePlanDryRun, validatePlanStructure } from './executor.js';
export type { ExecutorConfig, ExecutorResult } from './executor.js';

// Semantic Analysis
export { performSemanticAnalysis, getSemanticSuggestions } from './semantic-analysis.js';
export type { SemanticError, SemanticAnalysisResult } from './semantic-analysis.js';

// Quickfix Templates
export {
  generateQuickfixes,
  generateIdempotencyKeyTemplate,
  generateErrorHandlerTemplate,
  generateLoggingTemplate,
  generateValidationTemplate,
  generateTransformTemplate,
  generateHttpFetchTemplate,
  generateQuickfixContext
} from './quickfixes.js';
export type { QuickFixSuggestion, ErrorWithQuickfixes } from './quickfixes.js';

// Default export for convenience
import { validateDocument } from './document-validator.js';

export default {
  validateDocument,
};
