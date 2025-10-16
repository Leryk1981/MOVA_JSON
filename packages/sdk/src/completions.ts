import type { CompletionContext, CompletionItem } from './types.js';

/**
 * Core MOVA verbs (6 main + 4 auxiliary + 4 flow control = 14 total)
 */
const CORE_VERBS = [
  // Core verbs (6)
  { label: 'http_fetch', detail: 'Make an HTTP request' },
  { label: 'call', detail: 'Call a service/task' },
  { label: 'call_envelope', detail: 'Call another envelope workflow' },
  { label: 'template', detail: 'Process template with placeholders' },
  { label: 'transform', detail: 'Transform/map data' },
  { label: 'parallel', detail: 'Execute steps in parallel' },

  // Auxiliary verbs (4)
  { label: 'assert', detail: 'Assert a condition (fail if false)' },
  { label: 'emit_event', detail: 'Emit an event' },
  { label: 'log', detail: 'Log a message' },
  { label: 'sleep', detail: 'Sleep/delay execution' },

  // Flow control (4)
  { label: 'if', detail: 'Conditional branching' },
  { label: 'switch', detail: 'Switch statement (pattern matching)' },
  { label: 'parallel_split', detail: 'Split into parallel branches' },
  { label: 'parallel_merge', detail: 'Merge parallel branches' },
];

/**
 * Common nouns/keywords used in plans
 */
const COMMON_NOUNS: CompletionItem[] = [
  { label: 'plan', kind: 'Property', detail: 'Execution plan' },
  { label: 'steps', kind: 'Property', detail: 'Array of workflow steps' },
  { label: 'verb', kind: 'Property', detail: 'Action verb' },
  { label: 'with', kind: 'Property', detail: 'Verb parameters' },
  { label: 'mova_version', kind: 'Property', detail: 'MOVA schema version' },
  { label: 'envelope_id', kind: 'Property', detail: 'Unique envelope ID' },
  { label: 'category', kind: 'Property', detail: 'Workflow category' },
  { label: 'policies', kind: 'Property', detail: 'Execution policies' },
  { label: 'context', kind: 'Property', detail: 'Input context data' },
];

/**
 * Generate completion suggestions based on context
 */
export function suggestCompletions(context: CompletionContext): CompletionItem[] {
  const { text, position } = context;

  if (!text || !position) {
    // Return general top-level suggestions
    return [
      { label: 'mova_version', kind: 'Property', detail: '"3.4.1"' },
      { label: 'envelope_id', kind: 'Property', detail: '"unique-id"' },
      { label: 'category', kind: 'Property', detail: '"workflow-category"' },
      { label: 'title', kind: 'Property', detail: '"Workflow Title"' },
      { label: 'summary', kind: 'Property', detail: '"Brief description"' },
      { label: 'plan', kind: 'Property', detail: '{ ... }' },
    ];
  }

  // Detect if we're in a verb context
  if (
    text.slice(Math.max(0, position.character - 10), position.character)
      .includes('verb')
  ) {
    return CORE_VERBS.map((v) => ({
      ...v,
      kind: 'Function' as const,
      insertText: `"${v.label}"`,
    }));
  }

  // Default: suggest common properties and verbs
  const suggestions: CompletionItem[] = [
    ...COMMON_NOUNS,
    ...CORE_VERBS.map((v) => ({
      ...v,
      kind: 'Function' as const,
    })),
  ];

  return suggestions;
}

/**
 * Get verb documentation
 */
export function getVerbDocumentation(verb: string): string {
  const found = CORE_VERBS.find((v) => v.label === verb);
  if (!found) return '';
  return `**${found.label}**: ${found.detail}`;
}

/**
 * Suggest quick fixes based on error keyword
 */
export function suggestQuickFixes(keyword: string, _path: string): string[] {
  const fixes: Record<string, string[]> = {
    required: [
      'Add missing required field',
      'Check schema for required properties',
    ],
    enum: [
      'Use one of the allowed values',
      'Check documentation for valid enum values',
    ],
    type: [
      'Correct the data type',
      'Check schema for expected type',
    ],
    pattern: [
      'Match the required pattern',
      'Use the correct format',
    ],
    minimum: [
      'Value must be greater than minimum',
    ],
    maximum: [
      'Value must be less than maximum',
    ],
  };

  return fixes[keyword] || ['Review the validation error', 'Check schema'];
}
