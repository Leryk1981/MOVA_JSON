# 🚀 Quick Start Guide - MOVA LSP

**Last Updated:** October 16, 2025

---

## ⚡ 30-Second Setup

### For SDK Usage
```bash
npm install leryk-sdk-mova leryk-schemas-mova
```

```typescript
import { validateDocument, initializeValidator } from 'leryk-sdk-mova';

await initializeValidator();
const result = await validateDocument(jsonText);

console.log(result.ok ? 'Valid!' : result.diagnostics);
```

### For CLI Usage
```bash
npm install -g leryk-cli-mova
mova validate envelope.json
```

### For LSP Server
```bash
npm install leryk-lsp-mova
node node_modules/.bin/leryk-lsp-mova
```

---

## 📦 What Each Package Does

| Package | Use Case | Command |
|---------|----------|---------|
| `leryk-sdk-mova` | Programmatic validation | `npm install leryk-sdk-mova` |
| `leryk-schemas-mova` | Schema definitions | `npm install leryk-schemas-mova` |
| `leryk-cli-mova` | Command-line tool | `npm install -g leryk-cli-mova` |
| `leryk-lsp-mova` | LSP server | `npm install leryk-lsp-mova` |
| `leryk-vscode-mova` | VS Code extension | Install from VSCode |

---

## 🎯 Common Tasks

### ✅ Validate a MOVA Envelope

**Using CLI:**
```bash
mova validate ./my-workflow.envelope.json
```

**Using SDK:**
```typescript
import { validateDocument, initializeValidator } from 'leryk-sdk-mova';

async function validate() {
  await initializeValidator();
  
  const json = require('fs').readFileSync('./envelope.json', 'utf-8');
  const result = await validateDocument(json);
  
  if (!result.ok) {
    result.diagnostics?.forEach(d => {
      console.log(`[${d.range.start.line}:${d.range.start.character}] ${d.message}`);
    });
  }
}

validate();
```

### ✅ Get Code Completions

```typescript
import { suggestCompletions, initializeValidator } from 'leryk-sdk-mova';

await initializeValidator();

const suggestions = suggestCompletions({
  text: '{ "plan": { "steps": [{ "verb": "' ,
  position: { line: 0, character: 38 }
});

console.log(suggestions);
// Output: [{ label: 'book', kind: 1 }, { label: 'notify', kind: 1 }, ...]
```

### ✅ Generate Snippet

```bash
mova snippet:generate booking
# Generates a complete booking workflow envelope
```

### ✅ Sync Schemas

```bash
mova schema:sync
# Downloads latest schemas from source
```

---

## 🔧 Configuration

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "mova.lsp.executorEndpoint": "http://localhost:3000",
  "mova.lsp.schemaPath": "./schemas",
  "[mova]": {
    "editor.defaultFormatter": "leryk1981.leryk-vscode-mova",
    "editor.formatOnSave": true
  }
}
```

### Environment Variables

```bash
# For LSP server
export LSP_HOST=127.0.0.1
export LSP_PORT=5000

# For GCP deployment (future)
export GCP_PROJECT_ID=my-project
export GCP_REGION=us-central1
```

---

## 📚 API Reference

### SDK: validateDocument

```typescript
interface ValidateResult {
  ok: boolean;
  text: string;
  diagnostics?: Diagnostic[];
  error?: string;
}

interface Diagnostic {
  message: string;
  range: Range;
  severity: DiagnosticSeverity;
  code?: string;
  source?: string;
}
```

**Example:**
```typescript
const result = await validateDocument(jsonText);
// Returns: { ok: true/false, diagnostics?: [...], text: jsonText }
```

### SDK: suggestCompletions

```typescript
interface CompletionSuggestion {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
}

const suggestions = suggestCompletions({
  text: jsonText,
  position: { line: 0, character: 10 }
});
```

### CLI Commands

```bash
# Validate
mova validate <file>
  Options:
    --json          Output as JSON
    --pretty        Pretty print errors

# Generate snippet
mova snippet:generate <verb>
  Examples:
    mova snippet:generate booking
    mova snippet:generate notification

# Sync schemas
mova schema:sync
  Options:
    --source <url>  Schema source URL
    --local         Save locally
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'leryk-sdk-mova'"

**Fix:** Ensure installation:
```bash
npm install leryk-sdk-mova
# Or from workspace:
npm run build
```

### Error: "Invalid JSON format"

**Check:**
1. Is your JSON valid? Use `npm install -g json5 && json5 file.json`
2. Does it have required fields? (version, metadata, plan)
3. Try: `mova validate file.json --pretty`

### CLI Command Not Found

**Fix:**
```bash
npm install -g leryk-cli-mova
# Or use with npx:
npx leryk-cli-mova validate file.json
```

### LSP Server Won't Start

**Check:**
1. Node.js version: `node --version` (needs ≥18)
2. Try with verbose: `DEBUG=* node node_modules/.bin/leryk-lsp-mova`
3. Check logs: `tail -50 lsp-server.log`

---

## 🎓 Examples

### Example 1: Simple Validation

**envelope.json**
```json
{
  "$schema": "https://mova.local/envelope.3.4.1.schema.json",
  "version": "3.4.1",
  "metadata": {
    "id": "booking-workflow",
    "title": "Booking Workflow"
  },
  "plan": {
    "steps": [
      {
        "verb": "book",
        "noun": "hotel",
        "params": { "city": "Paris" }
      }
    ]
  }
}
```

**Validate:**
```bash
mova validate envelope.json
# Output: ✓ Envelope is valid
```

### Example 2: Real-Time Validation in Node.js

```javascript
import { validateDocument, initializeValidator } from 'leryk-sdk-mova';
import fs from 'fs';
import path from 'path';

async function validateWorkflows() {
  await initializeValidator();
  
  const files = fs.readdirSync('./workflows')
    .filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join('./workflows', file), 'utf-8');
    const result = await validateDocument(content);
    
    console.log(`${file}: ${result.ok ? '✓' : '✗'}`);
    
    if (!result.ok) {
      result.diagnostics?.forEach(d => {
        console.log(`  Line ${d.range.start.line + 1}: ${d.message}`);
      });
    }
  }
}

validateWorkflows();
```

---

## 📖 Learn More

- **Full README:** [README.md](./README.md)
- **SDK API Docs:** [packages/sdk/README.md](./packages/sdk/README.md)
- **CLI Guide:** [packages/cli/README.md](./packages/cli/README.md)
- **LSP Server:** [packages/server-lsp/README.md](./packages/server-lsp/README.md)
- **Schema Reference:** [envelope.3.4.1.schema.json](./envelope.3.4.1.schema.json)
- **GitHub Setup:** [GITHUB_SETUP.md](./GITHUB_SETUP.md)

---

## 🆘 Get Help

- **npm package page:** https://www.npmjs.com/~leryk1981
- **Issues:** Create an issue in the repository
- **Documentation:** See [README.md](./README.md)

---

**Status:** ✅ Ready to Use  
**Last Updated:** October 16, 2025
