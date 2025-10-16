import { createHash } from 'crypto';
import type { IdempotencyKeyOptions } from './types.js';

/**
 * Generate a deterministic idempotency key
 */
export function generateIdempotencyKey(
  options: IdempotencyKeyOptions
): string {
  const { category, userId, timestamp, nonce } = options;

  const components = [
    category,
    userId || 'anonymous',
    timestamp ? String(timestamp) : String(Date.now()),
    nonce || '',
  ];

  const input = components.join(':');
  const hash = createHash('sha256').update(input).digest('hex');

  return `${category}:${hash.slice(0, 16)}`;
}

/**
 * Generate UUID-like idempotency key (v4 style, but deterministic)
 */
export function generateIdempotencyKeyUUID(
  options: IdempotencyKeyOptions
): string {
  const key = generateIdempotencyKey(options);
  // Return as UUID-like format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  return `${key.slice(0, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}-${key.slice(16, 20)}-${key.slice(20, 32)}`;
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Simple validation: must be non-empty string with colon separator
  return /^[a-z_][a-z0-9_]*:[a-f0-9]+$/.test(key);
}
