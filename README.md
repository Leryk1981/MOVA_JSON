# MOVA Language Server Protocol (LSP) Monorepo

> Full-stack Language Server implementation for MOVA workflow envelopes. npm-first, ESM-native, cloud-ready.

## 🎯 Overview

This monorepo implements a complete Language Server Protocol (LSP) ecosystem for MOVA, enabling IDE-like features in VS Code and other editors:

- **Real-time validation** using AJV 2020-12 schema
- **Intelligent completions** for verbs, nouns, and parameters
- **Hover documentation** for workflow fields
- **Code actions** and quick fixes
- **CLI tools** for local development
- **Cloud-ready** SDK for integration

## 📦 Packages

| Package | Purpose | npm |
|---------|---------|-----|
| `@mova/schemas` | JSON Schema definitions (envelope 3.4.1) | [@mova/schemas](https://npmjs.com/package/@mova/schemas) |
| `@mova/sdk` | Core SDK: validator, diagnostics, completions | [@mova/sdk](https://npmjs.com/package/@mova/sdk) |
| `@mova/server-lsp` | LSP server implementation | [@mova/server-lsp](https://npmjs.com/package/@mova/server-lsp) |
| `@mova/client-vscode` | VS Code extension | [@mova/client-vscode](https://npmjs.com/package/@mova/client-vscode) |
| `@mova/cli` | Command-line tools | [@mova/cli](https://npmjs.com/package/@mova/cli) |

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone <repo>
cd mova-lsp-monorepo
npm install
```

### Build All Packages

```bash
npm run build
```

### Run Tests

```bash
npm run test
```

### CLI Usage

```bash
# Validate an envelope
npx @mova/cli validate ./examples/booking.envelope.json

# Generate a snippet
npx @mova/cli snippet:generate booking

# Check version
mova --version
```

### VSCode Extension

1. Build the extension: `npm -w packages/client-vscode run build`
2. Open VS Code in the workspace
3. Press `F5` to launch extension in debug mode
4. Create a `.mova` or `.envelope.json` file
5. You should see diagnostics, completions, and hover

### SDK Usage (Programmatic)

```typescript
import { validateDocument, suggestCompletions } from '@mova/sdk';

// Validate a document
const result = await validateDocument(envelopeJson);
if (!result.ok) {
  console.log(result.diagnostics);
}

// Get completion suggestions
const suggestions = suggestCompletions({
  text: envelopeJson,
  position: { line: 10, character: 5 },
});
```

## 🏗️ Architecture

```
┌─ npm packages ─────────────────────────────────────┐
│                                                     │
│  @mova/schemas ──┬─→ @mova/sdk ──┬─→ @mova/cli    │
│                  │                │                 │
│                  └─→ @mova/server-lsp              │
│                      ↓                              │
│                  @mova/client-vscode               │
│                                                     │
└─────────────────────────────────────────────────────┘
     All ESM, TypeScript, tree-shakeable
```

## 📋 Features (MVP)

### ✅ Implemented

- [x] **Validation Pipeline**: AJV + error → range mapping
- [x] **Diagnostics**: Real-time error reporting with positions
- [x] **Completions**: Verb, noun, and parameter suggestions
- [x] **Hover**: Field descriptions and documentation
- [x] **SDK**: Modular, tree-shakeable validator
- [x] **CLI**: `validate`, `schema:sync`, `snippet:generate` commands
- [x] **LSP Server**: Full diagnostics & completion support

### 🚧 Coming Soon

- [ ] Code Actions / Quick Fixes
- [ ] Rename / References
- [ ] Document Symbols / Workspace Symbols
- [ ] Integration tests with vscode-test
- [ ] Cloud Functions / Cloud Run deployment
- [ ] GitHub Actions CI/CD pipeline

## 📚 Documentation

- [SDK API Docs](./packages/sdk/README.md)
- [LSP Server Guide](./packages/server-lsp/README.md)
- [CLI Reference](./packages/cli/README.md)
- [Technical Specification (ТЗ)](./tz.md)
- [Schema Reference](./envelope.3.4.1.schema.json)

## 🔧 Development

### Workspace Scripts

```bash
# Build all packages
npm run build

# Test all packages
npm run test

# Lint all packages
npm run lint

# Format all packages
npm run format

# Start dev mode (SDK + LSP watching)
npm run dev

# Create a changeset for release
npm run changeset
```

### Adding a Package

```bash
mkdir packages/my-new-package
cd packages/my-new-package
npm init -y
# Edit package.json, add to exports, add src/index.ts
npm install (back in root)
```

## 🔐 Security

- All packages published to npm with `publishConfig.access: "public"`
- ESM-only (no legacy CommonJS)
- Node.js >=18 required
- Strict TypeScript (`strict: true`)
- No hardcoded secrets (use environment variables)

## 📦 Publishing

Uses `changesets` for versioning and publishing:

```bash
# Create a changeset
npm run changeset

# Check what will be published
npm run changeset:status

# Publish (runs in CI)
npm run publish:all
```

## 🤝 Contributing

1. Create a feature branch
2. Make changes, test locally: `npm run build && npm run test`
3. Create a changeset: `npm run changeset`
4. Submit PR

## 📜 License

MIT

## 🎓 Reference

- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/schema)
- [AJV Documentation](https://ajv.js.org/)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [MOVA Envelope Schema](./envelope.3.4.1.schema.json)

---

**Status**: 🟢 MVP ready | **Version**: 0.1.0 | **Last Updated**: October 2025
