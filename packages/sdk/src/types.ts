import type { ErrorObject } from 'ajv';

/**
 * Range in a text document (line/column positions)
 */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * Position in a text document (0-based line and column)
 */
export interface Position {
  line: number;
  character: number;
}

/**
 * Diagnostic result with severity and position
 */
export interface Diagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info';
  range: Range;
  source?: string;
  instancePath?: string;
  keyword?: string;
}

/**
 * Result of document validation
 */
export interface ValidateResult {
  ok: boolean;
  errors?: Array<ErrorObject>;
  diagnostics?: Diagnostic[];
}

/**
 * Options for schema loading
 */
export interface SchemaOptions {
  schemaDir?: string;
  schemaUrl?: string;
}

/**
 * Context for completion suggestions
 */
export interface CompletionContext {
  text: string;
  uri?: string;
  position?: Position;
}

/**
 * Completion item for editor suggestions
 */
export interface CompletionItem {
  label: string;
  kind?: 'Function' | 'Variable' | 'Snippet' | 'Keyword' | 'Property';
  detail?: string;
  documentation?: string;
  sortText?: string;
  insertText?: string;
  insertTextFormat?: 'PlainText' | 'Snippet';
}

/**
 * Options for idempotency key generation
 */
export interface IdempotencyKeyOptions {
  category: string;
  userId?: string;
  timestamp?: number;
  nonce?: string;
}

export interface PlanStep {
  verb?: string;
  noun?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EnvelopePlan {
  steps?: PlanStep[];
  [key: string]: unknown;
}

export interface Envelope {
  plan?: EnvelopePlan;
  [key: string]: unknown;
}

export interface StepSimulationOutput {
  verb: string;
  noun: string;
  executedAt: string;
  data: Record<string, unknown>;
  variables: Record<string, unknown>;
}
