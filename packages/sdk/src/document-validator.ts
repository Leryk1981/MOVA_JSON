import { parseTree } from 'jsonc-parser';
import { initializeValidator, ajvValidate } from './validator.js';
import { mapAjvErrorsWithContext } from './error-mapper.js';
import type { ValidateResult } from './types.js';

/**
 * Validate a document (JSON text) and return diagnostics with positions
 */
export async function validateDocument(
  text: string,
  _filepath?: string
): Promise<ValidateResult> {
  // Ensure validator is initialized
  await initializeValidator();

  try {
    // Parse JSON/JSONC text
    let obj: unknown;
    try {
      obj = JSON.parse(text);
    } catch (parseErr) {
      // If JSON parse fails, return parse error
      return {
        ok: false,
        diagnostics: [
          {
            message: `JSON parse error: ${String(parseErr)}`,
            severity: 'error',
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 1 },
            },
            source: 'json-parser',
          },
        ],
      };
    }

    // Validate against schema
    const result = ajvValidate(obj);

    // Map errors to diagnostics with text positions
    const diagnostics = result.errors
      ? mapAjvErrorsWithContext(result.errors, text)
      : [];

    return {
      ok: result.ok,
      errors: result.errors,
      diagnostics,
    };
  } catch (err) {
    return {
      ok: false,
      diagnostics: [
        {
          message: `Validation error: ${String(err)}`,
          severity: 'error',
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
          source: 'mova-sdk',
        },
      ],
    };
  }
}

/**
 * Quick text-based validation (returns true/false only)
 */
export async function isValidDocument(text: string): Promise<boolean> {
  const result = await validateDocument(text);
  return result.ok;
}
