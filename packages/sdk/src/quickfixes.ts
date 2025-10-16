import type { Range } from 'vscode-languageserver-types';

export interface QuickFixSuggestion {
  title: string;
  kind: 'quickfix' | 'refactor';
  edit: {
    range: Range;
    newText: string;
  };
  isPreferred?: boolean;
}

export interface ErrorWithQuickfixes {
  message: string;
  path: string;
  quickfixes: QuickFixSuggestion[];
}

/**
 * Generate quickfix suggestions for validation errors
 */
export function generateQuickfixes(
  _text: string,
  errorPath: string,
  errorMessage: string
): QuickFixSuggestion[] {
  const quickfixes: QuickFixSuggestion[] = [];

  // Missing verb in step
  if (errorPath.includes('.verb') && errorMessage.includes('missing') || errorMessage.includes('required')) {
    quickfixes.push({
      title: 'Add missing verb',
      kind: 'quickfix',
      edit: {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: '"verb": "http_fetch",\n'
      },
      isPreferred: true
    });
  }

  // Missing noun in step
  if (errorPath.includes('.noun') && (errorMessage.includes('missing') || errorMessage.includes('required'))) {
    quickfixes.push({
      title: 'Add missing noun',
      kind: 'quickfix',
      edit: {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: '"noun": "item",\n'
      },
      isPreferred: true
    });
  }

  // Unknown verb - suggest valid ones
  if (errorPath.includes('.verb') && errorMessage.includes('Unknown')) {
    const commonVerbs = ['http_fetch', 'set', 'assert', 'emit_event', 'transform', 'validate', 'log'];
    commonVerbs.forEach((verb) => {
      quickfixes.push({
        title: `Change to verb: ${verb}`,
        kind: 'quickfix',
        edit: {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
          newText: `"verb": "${verb}"`
        }
      });
    });
  }

  // Missing required field in data
  if (errorPath.includes('data') && errorMessage.includes('url')) {
    quickfixes.push({
      title: 'Add URL to data',
      kind: 'quickfix',
      edit: {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: '"url": "https://example.com",\n'
      },
      isPreferred: true
    });
  }

  // Add idempotency key for http_fetch
  if (errorPath.includes('http_fetch') && !errorMessage.includes('idempotency')) {
    quickfixes.push({
      title: 'Add idempotency key for safety',
      kind: 'refactor',
      edit: {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: '"idempotency_key": "{{uuid()}}",\n'
      }
    });
  }

  // Add timeout to step
  if (!errorPath.includes('timeout')) {
    quickfixes.push({
      title: 'Add timeout configuration',
      kind: 'refactor',
      edit: {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: '"timeout": 30000,\n'
      }
    });
  }

  // Add retry policy
  if (!errorPath.includes('retry')) {
    quickfixes.push({
      title: 'Add retry policy',
      kind: 'refactor',
      edit: {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: '"retry": {"max_attempts": 3, "backoff": "exponential"},\n'
      }
    });
  }

  return quickfixes;
}

/**
 * Template for idempotency key generation
 */
export function generateIdempotencyKeyTemplate(): string {
  return '"idempotency_key": "{{uuid()}}"';
}

/**
 * Template for error handling
 */
export function generateErrorHandlerTemplate(): string {
  return `"error_handler": {
  "on_error": "retry",
  "max_attempts": 3,
  "timeout": 5000
}`;
}

/**
 * Template for logging step
 */
export function generateLoggingTemplate(): string {
  return `{
  "verb": "log",
  "noun": "item",
  "data": {
    "level": "info",
    "message": "Processing item: {{item.id}}"
  }
}`;
}

/**
 * Template for validation step
 */
export function generateValidationTemplate(): string {
  return `{
  "verb": "validate",
  "noun": "item",
  "data": {
    "schema": "item.schema.json",
    "strict": true
  }
}`;
}

/**
 * Template for transformation step
 */
export function generateTransformTemplate(): string {
  return `{
  "verb": "transform",
  "noun": "item",
  "data": {
    "template": {
      "id": "{{item.id}}",
      "name": "{{item.name}}",
      "processed_at": "{{now()}}"
    }
  }
}`;
}

/**
 * Template for HTTP fetch step
 */
export function generateHttpFetchTemplate(url: string = 'https://example.com'): string {
  return `{
  "verb": "http_fetch",
  "noun": "item",
  "data": {
    "url": "${url}",
    "method": "GET",
    "timeout": 30000,
    "headers": {
      "Content-Type": "application/json"
    },
    "idempotency_key": "{{uuid()}}"
  }
}`;
}

/**
 * Generate complete quickfix context for IDE integration
 */
export function generateQuickfixContext(
  text: string,
  errorPath: string,
  errorMessage: string
): ErrorWithQuickfixes {
  return {
    message: errorMessage,
    path: errorPath,
    quickfixes: generateQuickfixes(text, errorPath, errorMessage)
  };
}
