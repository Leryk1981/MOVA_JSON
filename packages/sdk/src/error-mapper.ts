import { parseTree, findNodeAtLocation, type Node as JsonNode } from 'jsonc-parser';
import type Ajv from 'ajv';
import type { Diagnostic, Position, Range } from './types.js';

/**
 * Convert offset to line/character position
 */
function offsetToPosition(text: string, offset: number): Position {
  const lines = text.slice(0, Math.max(0, offset)).split(/\r\n|\n/);
  const line = Math.max(0, lines.length - 1);
  const character = lines[lines.length - 1]?.length ?? 0;
  return { line, character };
}

/**
 * Convert JSON node to range
 */
function nodeToRange(node: JsonNode, text: string): Range {
  const start = offsetToPosition(text, node.offset);
  const end = offsetToPosition(text, node.offset + node.length);
  return { start, end };
}

/**
 * Convert instancePath (e.g., "/plan/steps/1/verb") to array path
 */
function instancePathToPathArray(instancePath: string): Array<string | number> {
  if (!instancePath) return [];
  const parts = instancePath.replace(/^\//, '').split('/');
  return parts.map((p) => {
    if (/^\d+$/.test(p)) return Number(p);
    return p
      .replace(/~1/g, '/')
      .replace(/~0/g, '~');
  });
}

/**
 * Map AJV error objects to LSP diagnostics with text positions
 */
export function mapAjvErrorsToDiagnostics(
  errors: Array<Ajv.ErrorObject>,
  text: string
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const parseTree_ = parseTree(text, undefined, { allowTrailingComma: true });

  for (const err of errors) {
    const instancePath = err.instancePath || '';
    const pathArray = instancePathToPathArray(instancePath);
    let node: JsonNode | undefined;

    if (parseTree_) {
      node = findNodeAtLocation(parseTree_, pathArray);
    }

    const range = node
      ? nodeToRange(node, text)
      : {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        };

    const message = `${err.message ?? 'validation error'}${
      err.keyword ? ` (${err.keyword})` : ''
    }`;

    diagnostics.push({
      message,
      severity: 'error',
      range,
      source: 'mova-ajv',
      instancePath,
      keyword: err.keyword,
    });
  }

  return diagnostics;
}

/**
 * Map errors with additional context and grouping
 */
export function mapAjvErrorsWithContext(
  errors: Array<Ajv.ErrorObject>,
  text: string
): Diagnostic[] {
  const diagnostics = mapAjvErrorsToDiagnostics(errors, text);

  // Sort by line number
  diagnostics.sort(
    (a, b) => a.range.start.line - b.range.start.line
  );

  return diagnostics;
}
