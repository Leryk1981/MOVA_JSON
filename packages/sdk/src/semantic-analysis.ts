import type { Envelope, PlanStep } from './types.js';

export interface SemanticError {
  path: string;
  type: 'unknown-verb' | 'unknown-noun' | 'invalid-context' | 'missing-required-field' | 'type-mismatch';
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface SemanticAnalysisResult {
  valid: boolean;
  errors: SemanticError[];
  warnings: SemanticError[];
}

// Known MOVA verbs and their valid nouns
const VERB_NOUN_MAP: Record<string, string[]> = {
  'http_fetch': ['item', 'batch'],
  'set': ['variable', 'context'],
  'assert': ['condition'],
  'emit_event': ['event'],
  'transform': ['item', 'batch'],
  'filter': ['item', 'batch'],
  'map': ['item', 'batch'],
  'reduce': ['batch'],
  'group': ['item', 'batch'],
  'sort': ['batch'],
  'limit': ['batch'],
  'skip': ['batch'],
  'fork': ['batch'],
  'merge': ['batch'],
  'loop': ['item'],
  'delay': ['step'],
  'log': ['item', 'event'],
  'validate': ['item', 'batch'],
  'store': ['item', 'batch'],
  'retrieve': ['item'],
  'delete': ['item'],
  'publish': ['event', 'message']
};

// Valid fields for each noun type
const NOUN_FIELD_MAP: Record<string, string[]> = {
  'item': ['id', 'type', 'data', 'metadata'],
  'batch': ['items', 'count', 'offset', 'limit'],
  'event': ['name', 'payload', 'timestamp'],
  'variable': ['name', 'value', 'type'],
  'context': ['scope', 'data'],
  'condition': ['expression', 'operator'],
  'message': ['topic', 'content'],
  'step': ['index', 'result']
};

/**
 * Perform semantic analysis on MOVA envelope
 */
export function performSemanticAnalysis(envelopeText: string): SemanticAnalysisResult {
  const result: SemanticAnalysisResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    const envelope = JSON.parse(envelopeText) as Envelope;

    if (!envelope.plan?.steps || !Array.isArray(envelope.plan.steps)) {
      result.errors.push({
        path: 'plan.steps',
        type: 'missing-required-field',
        message: 'plan.steps is required and must be an array',
        severity: 'error'
      });
      result.valid = false;
      return result;
    }

    // Analyze each step
    envelope.plan.steps.forEach((step: PlanStep, index: number) => {
      analyzeStep(step, index, result);
    });

    result.valid = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push({
      path: 'root',
      type: 'invalid-context',
      message: `Failed to parse envelope: ${String(error)}`,
      severity: 'error'
    });
    result.valid = false;
    return result;
  }
}

/**
 * Analyze individual step for semantic errors
 */
function analyzeStep(step: PlanStep, index: number, result: SemanticAnalysisResult): void {
  const pathPrefix = `plan.steps[${index}]`;

  // Check required fields
  if (!step.verb) {
    result.errors.push({
      path: `${pathPrefix}.verb`,
      type: 'missing-required-field',
      message: 'Step must have a verb',
      severity: 'error',
      suggestion: 'Add verb field to step (e.g., "http_fetch", "set", "assert")'
    });
    return;
  }

  if (!step.noun) {
    result.errors.push({
      path: `${pathPrefix}.noun`,
      type: 'missing-required-field',
      message: 'Step must have a noun',
      severity: 'error',
      suggestion: 'Add noun field to step'
    });
    return;
  }

  // Validate verb
  const knownVerbs = Object.keys(VERB_NOUN_MAP);
  if (!knownVerbs.includes(step.verb)) {
    result.errors.push({
      path: `${pathPrefix}.verb`,
      type: 'unknown-verb',
      message: `Unknown verb: "${step.verb}"`,
      severity: 'error',
      suggestion: `Valid verbs: ${knownVerbs.join(', ')}`
    });
  }

  // Validate noun matches verb
  const validNouns = VERB_NOUN_MAP[step.verb] || [];
  if (validNouns.length > 0 && !validNouns.includes(step.noun)) {
    result.errors.push({
      path: `${pathPrefix}.noun`,
      type: 'type-mismatch',
      message: `Noun "${step.noun}" is not valid for verb "${step.verb}"`,
      severity: 'error',
      suggestion: `Valid nouns for "${step.verb}": ${validNouns.join(', ')}`
    });
  }

  // Validate data fields
  if (step.data && typeof step.data === 'object') {
    analyzeData(step.data as Record<string, unknown>, pathPrefix, result, step.noun ?? '');
  }

  // Check for common issues
  if (step.verb === 'http_fetch' && (!step.data?.url && !step.data?.endpoint)) {
    result.warnings.push({
      path: `${pathPrefix}.data`,
      type: 'missing-required-field',
      message: 'http_fetch step should have url or endpoint in data',
      severity: 'warning',
      suggestion: 'Add "url" or "endpoint" field to step.data'
    });
  }

  if (step.verb === 'transform' && !step.data?.template) {
    result.warnings.push({
      path: `${pathPrefix}.data`,
      type: 'missing-required-field',
      message: 'transform step should have a template in data',
      severity: 'warning',
      suggestion: 'Add "template" field to step.data'
    });
  }
}

/**
 * Analyze step data for semantic errors
 */
function analyzeData(
  data: Record<string, unknown>,
  basePath: string,
  result: SemanticAnalysisResult,
  noun: string
): void {
  const validFields = NOUN_FIELD_MAP[noun] || [];

  // Check for unexpected fields (warning only)
  if (validFields.length > 0) {
    Object.keys(data).forEach((key) => {
      if (!validFields.includes(key) && !key.startsWith('_')) {
        result.warnings.push({
          path: `${basePath}.data.${key}`,
          type: 'invalid-context',
          message: `Field "${key}" is not typical for noun "${noun}"`,
          severity: 'warning',
          suggestion: `Known fields for "${noun}": ${validFields.join(', ')}`
        });
      }
    });
  }
}

/**
 * Get semantic suggestions based on context
 */
export function getSemanticSuggestions(envelopeText: string, atPath: string): string[] {
  const suggestions: string[] = [];

  try {
    const envelope = JSON.parse(envelopeText) as Envelope;

    if (atPath.includes('verb')) {
      suggestions.push('Available verbs: ' + Object.keys(VERB_NOUN_MAP).join(', '));
    }

    if (atPath.includes('noun')) {
      // Extract verb from context
      const verbMatch = atPath.match(/plan\.steps\[(\d+)\]\.noun/);
      if (verbMatch) {
        const stepIndex = parseInt(verbMatch[1]);
        const step = envelope.plan?.steps?.[stepIndex];
        if (step?.verb) {
          const validNouns = VERB_NOUN_MAP[step.verb] || [];
          suggestions.push('Valid nouns for "' + step.verb + '": ' + validNouns.join(', '));
        }
      }
    }

    if (atPath.includes('data')) {
      const verbMatch = atPath.match(/plan\.steps\[(\d+)\]\.data/);
      if (verbMatch) {
        const stepIndex = parseInt(verbMatch[1]);
        const step = envelope.plan?.steps?.[stepIndex];
        if (step?.noun) {
          const validFields = NOUN_FIELD_MAP[step.noun] || [];
          suggestions.push('Fields for "' + step.noun + '": ' + validFields.join(', '));
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  return suggestions;
}
