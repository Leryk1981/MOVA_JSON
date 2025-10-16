# @mova/sdk

Core SDK for MOVA: validation, diagnostics mapping, completions, and utilities.

## 🎯 Overview

This package provides the foundation for all MOVA tooling:

- **AJV Validator**: Compile and validate against MOVA envelope schema (2020-12 draft)
- **Error Mapping**: Convert AJV errors to LSP diagnostics with precise text positions
- **Completions**: Intelligent suggestions for verbs, nouns, and parameters
- **Utilities**: Idempotency key generation, schema loading

## 📦 Installation

```bash
npm install @mova/sdk
```

## 🚀 Quick Start

### Basic Validation

```typescript
import { validateDocument, initializeValidator } from '@mova/sdk';

// Initialize once per app
await initializeValidator();

// Validate JSON text
const result = await validateDocument(`{
  "mova_version": "3.4.1",
  "envelope_id": "my-workflow",
  ...
}`);

if (!result.ok) {
  console.error('Validation failed:');
  result.diagnostics?.forEach(d => {
    console.error(`  Line ${d.range.start.line}: ${d.message}`);
  });
}
```

### Getting Completions

```typescript
import { suggestCompletions } from '@mova/sdk';

const suggestions = suggestCompletions({
  text: envelopeJson,
  position: { line: 42, character: 10 },
});

// Returns: [{ label: 'http_fetch', kind: 'Function', ... }, ...]
```

### Generating Idempotency Keys

```typescript
import { generateIdempotencyKey } from '@mova/sdk';

const key = generateIdempotencyKey({
  category: 'booking',
  userId: 'user123',
  timestamp: Date.now(),
});
// Returns: 'booking:a1b2c3d4e5f6g7h8'
```

## 📚 API Reference

### `initializeValidator(options?: SchemaOptions): Promise<void>`

Initialize the AJV validator with the envelope schema.

```typescript
await initializeValidator();
// Now ready to call validateDocument, ajvValidate, etc.
```

### `validateDocument(text: string, filepath?: string): Promise<ValidateResult>`

Validate a JSON/JSONC document and return diagnostics with text positions.

**Returns**: `{ ok: boolean, errors?: AjvErrorObject[], diagnostics?: Diagnostic[] }`

```typescript
const result = await validateDocument(jsonText);
result.diagnostics?.forEach(diag => {
  console.log(`${diag.range.start.line}:${diag.range.start.character} - ${diag.message}`);
});
```

### `ajvValidate(obj: unknown): ValidateResult`

Validate a JavaScript object directly (no text parsing).

```typescript
const obj = JSON.parse(jsonText);
const result = ajvValidate(obj);
```

### `mapAjvErrorsToDiagnostics(errors: AjvErrorObject[], text: string): Diagnostic[]`

Convert AJV errors to LSP-style diagnostics with line/column positions.

**Key feature**: Maps AJV's `instancePath` (e.g., `/plan/steps/0/verb`) to exact character positions using jsonc-parser.

```typescript
const errors = [...]; // From ajvValidate
const diagnostics = mapAjvErrorsToDiagnostics(errors, jsonText);
```

### `suggestCompletions(context: CompletionContext): CompletionItem[]`

Get completion suggestions based on document context.

```typescript
const suggestions = suggestCompletions({
  text: jsonText,
  uri: 'file:///path/to/file.json',
  position: { line: 10, character: 5 },
});

// Result: Array of { label, kind, detail, insertText, ... }
```

### `generateIdempotencyKey(options: IdempotencyKeyOptions): string`

Generate a deterministic idempotency key from components.

```typescript
const key = generateIdempotencyKey({
  category: 'payment',
  userId: 'user_456',
  timestamp: 1698000000000,
  nonce: 'abc123',
});
// Result: 'payment:7f8e9d0c1b2a3e4d'
```

### `getVerbDocumentation(verb: string): string`

Get documentation for a specific verb.

```typescript
const doc = getVerbDocumentation('http_fetch');
// Returns: '**http_fetch**: Make an HTTP request'
```

### `suggestQuickFixes(keyword: string, path: string): string[]`

Get quick fix suggestions based on validation error keyword.

```typescript
const fixes = suggestQuickFixes('required', '/mova_version');
// Returns: ['Add missing required field', 'Check schema for required properties']
```

## 🏗️ Types

```typescript
interface Range {
  start: Position;
  end: Position;
}

interface Position {
  line: number;
  character: number;
}

interface Diagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info';
  range: Range;
  source?: string;
  instancePath?: string;
  keyword?: string;
}

interface ValidateResult {
  ok: boolean;
  errors?: Ajv.ErrorObject[];
  diagnostics?: Diagnostic[];
}
```

## 🔍 Examples

### Example 1: Validate with Error Details

```typescript
import { validateDocument, initializeValidator } from '@mova/sdk';

const envelope = `{
  "mova_version": "3.4.1",
  "envelope_id": "test",
  "category": "booking",
  "plan": {}
}`;

await initializeValidator();
const result = await validateDocument(envelope);

if (!result.ok) {
  result.diagnostics?.forEach(d => {
    const pos = `${d.range.start.line}:${d.range.start.character}`;
    console.error(`[${pos}] ${d.message} (${d.keyword})`);
  });
}
```

### Example 2: Use in CLI

```typescript
import { readFileSync } from 'fs';
import { validateDocument, initializeValidator } from '@mova/sdk';

const file = process.argv[2];
const text = readFileSync(file, 'utf-8');

await initializeValidator();
const result = await validateDocument(text, file);

if (result.ok) {
  console.log('✓ Valid');
  process.exit(0);
} else {
  console.error('✗ Validation failed');
  result.diagnostics?.forEach(d => {
    console.error(`  ${d.message}`);
  });
  process.exit(1);
}
```

### Example 3: Use in LSP Server

```typescript
import { validateDocument, mapAjvErrorsWithContext } from '@mova/sdk';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';

async function sendDiagnostics(text: string, uri: string) {
  const result = await validateDocument(text, uri);
  
  const diagnostics: Diagnostic[] = result.diagnostics?.map(d => ({
    message: d.message,
    severity: d.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    range: {
      start: { line: d.range.start.line, character: d.range.start.character },
      end: { line: d.range.end.line, character: d.range.end.character },
    },
    source: 'mova-ajv',
  })) ?? [];

  connection.sendDiagnostics({ uri, diagnostics });
}
```

## 🎓 Integration Points

- **CLI**: `@mova/cli` uses SDK for `validate` command
- **LSP Server**: `@mova/server-lsp` uses SDK for diagnostics pipeline
- **VS Code**: `@mova/client-vscode` delegates to server which uses SDK
- **Cloud**: Cloud Functions / Cloud Run can use SDK directly

## 🔧 Performance

- AJV schema compiled once and cached
- No file I/O (pure functional)
- < 200KB gzipped (tree-shakeable ESM)
- Fast error mapping using jsonc-parser

## 📖 Related

- [MOVA Envelope Schema](../schemas/envelope.3.4.1.schema.json)
- [LSP Server](../server-lsp/README.md)
- [CLI](../cli/README.md)
- [AJV Docs](https://ajv.js.org/)

---

**Built with**: AJV 8.17.1, jsonc-parser, TypeScript 5.3, ESM
