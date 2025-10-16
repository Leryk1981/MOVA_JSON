# MOVA LSP Monorepo - Language Server Protocol

**Status:** ✅ **PUBLISHED TO NPM**

A full-featured Language Server Protocol (LSP) implementation for MOVA 3.4.1 workflows, with SDK, CLI, and VS Code extension client. Built with ESM, TypeScript, and AJV 8.17.1.

---

## 📦 Published Packages

All packages are published to npm and ready to use:

| Package | npm | Version | Description |
|---------|-----|---------|-------------|
| **leryk-schemas-mova** | [npm](https://www.npmjs.com/package/leryk-schemas-mova) | 3.4.1 | Canonical JSON Schema for MOVA envelopes |
| **leryk-sdk-mova** | [npm](https://www.npmjs.com/package/leryk-sdk-mova) | 0.1.0 | Core SDK with AJV validator, diagnostics, completions |
| **leryk-lsp-mova** | [npm](https://www.npmjs.com/package/leryk-lsp-mova) | 0.1.0 | Language Server Protocol implementation |
| **leryk-cli-mova** | [npm](https://www.npmjs.com/package/leryk-cli-mova) | 0.1.0 | Command-line interface for validation |
| **leryk-vscode-mova** | [npm](https://www.npmjs.com/package/leryk-vscode-mova) | 0.1.0 | VS Code extension client |

---

## 🚀 Quick Start

### Installation

**Option 1: Install individual packages**
```bash
npm install leryk-sdk-mova leryk-schemas-mova
```

**Option 2: Install all packages**
```bash
npm install leryk-schemas-mova leryk-sdk-mova leryk-lsp-mova leryk-cli-mova leryk-vscode-mova
```

### Using the SDK

```typescript
import { validateDocument, initializeValidator } from 'leryk-sdk-mova';

// Initialize validator
await initializeValidator();

// Validate a MOVA envelope
const result = await validateDocument(jsonText);

if (result.ok) {
  console.log('✓ Envelope is valid');
} else {
  console.log('✗ Validation errors:');
  result.diagnostics?.forEach(diag => {
    console.log(`  ${diag.message} (line ${diag.range.start.line})`);
  });
}
```

### Using the CLI

```bash
npm install -g leryk-cli-mova

# Validate a file
mova validate envelope.json

# Generate a snippet
mova snippet:generate booking

# Sync schemas
mova schema:sync
```

### Using the LSP Server

```bash
npm install leryk-lsp-mova

# Run the server
node node_modules/.bin/leryk-lsp-mova
```

---

## 🏗️ Architecture

The monorepo consists of 5 interconnected packages:

```
┌─────────────────────────────────────────┐
│     leryk-schemas-mova (3.4.1)          │
│  Canonical JSON Schema (AJV 2020-12)    │
└─────────────────┬───────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
┌──────▼──────────┐  ┌──────▼──────────┐
│ leryk-sdk-mova  │  │ leryk-lsp-mova  │
│                 │  │                 │
│ • Validator     │  │ • Diagnostics   │
│ • Completions   │  │ • Hover         │
│ • Error Mapper  │  │ • Completion    │
│ • Idempotency   │  │ • Execute Cmd   │
└────────┬────────┘  └────────┬────────┘
         │                    │
    ┌────▼────┐         ┌─────▼──────────┐
    │ CLI     │         │ VSCode Client  │
    │         │         │                │
    │ Commands│         │ • Extension    │
    │ Validate│         │ • Language Cfg │
    │ Sync    │         │ • Commands     │
    │ Generate│         │ • Grammars     │
    └─────────┘         └────────────────┘
```

---

## ✨ Features

### SDK Features
- ✅ AJV 8.17.1 validator with JSON Schema 2020-12
- ✅ Error mapping to LSP diagnostics with precise positions
- ✅ Context-aware code completions
- ✅ Quick fix suggestions
- ✅ Idempotency key generation
- ✅ Hover documentation

### CLI Features
- ✅ File validation with detailed error reporting
- ✅ Snippet generation for workflows
- ✅ Schema synchronization
- ✅ JSON and text output formats

### LSP Server Features
- ✅ Text document synchronization
- ✅ Diagnostics on document change
- ✅ Code completion with context
- ✅ Hover information
- ✅ Code actions and quick fixes
- ✅ Command execution (dry-run)
- ✅ Configuration management

### VS Code Extension
- ✅ Language registration for MOVA files
- ✅ Syntax highlighting
- ✅ LSP client connection
- ✅ Commands and keybindings
- ✅ Settings and configuration

---

## 📋 Requirements

- **Node.js:** ≥18.0.0
- **npm:** ≥8.0.0 (for workspace support)

---

## 🔧 Configuration

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "mova.lsp.executorEndpoint": "http://localhost:3000",
  "mova.lsp.schemaPath": "./schemas"
}
```

### Environment Variables

For GCP deployment:

```bash
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
SCHEMA_BUCKET=mova-schemas
```

---

## 📚 Documentation

- [SDK API Documentation](./packages/sdk/README.md)
- [CLI Usage Guide](./packages/cli/README.md)
- [LSP Server Configuration](./packages/server-lsp/README.md)
- [VS Code Extension Setup](./packages/client-vscode/README.md)
- [Publishing Guide](./PUBLISHING_READY.md)
- [Integration Tests](./FINAL_INTEGRATION_REPORT.md)

---

## 🚀 Development

### Clone and Setup

```bash
git clone https://github.com/yourusername/mova-lsp.git
cd mova-lsp
npm install
npm run build
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

---

## 📦 Publishing

Packages are automatically published to npm via GitHub Actions when you push to `main`.

### Manual Publishing

```bash
# Create changeset
npm run changeset

# Version packages
npx changeset version

# Publish
npm run publish:all
```

---

## 🔒 Security

- ✅ AJV strict mode enabled
- ✅ No vulnerabilities (npm audit clean)
- ✅ All dependencies up-to-date
- ✅ TypeScript strict mode
- ✅ ESLint security rules

---

## 📄 License

Proprietary - MOVA Systems

---

## 👤 Author

**leryk1981** - MOVA LSP Developer

---

## 🤝 Contributing

Issues and pull requests are welcome. Please follow the code style and run tests before submitting.

---

**Status:** ✅ Production Ready  
**Latest Release:** October 16, 2025  
**Published:** https://www.npmjs.com/~leryk1981
