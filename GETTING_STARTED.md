# Getting Started with MOVA LSP Monorepo

> Step-by-step guide to set up, build, and work with the MOVA Language Server Protocol monorepo.

## Prerequisites

- **Node.js** >=18.x ([download](https://nodejs.org/))
- **npm** >=9.x (comes with Node.js)
- **Git** for cloning and pushing

Verify your setup:
```bash
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

## 1. Initial Setup

### Clone the Repository

```bash
git clone https://github.com/mova-io/lsp-monorepo.git
cd mova-lsp-monorepo
```

### Install Dependencies

```bash
npm install
```

This installs:
- Root workspace dependencies (dev tools, changesets, etc.)
- Dependencies for each package (SDK, LSP, CLI, etc.)

Verify installation:
```bash
npm list --depth=0
```

## 2. Build the Project

### Build All Packages

```bash
npm run build
```

This compiles TypeScript for all packages:
- `@mova/schemas` → `packages/schemas/dist/`
- `@mova/sdk` → `packages/sdk/dist/`
- `@mova/server-lsp` → `packages/server-lsp/dist/`
- `@mova/cli` → `packages/cli/dist/`
- `@mova/client-vscode` → `packages/client-vscode/dist/`

### Build Specific Package

```bash
npm -w packages/sdk run build     # Build only SDK
npm -w packages/cli run build     # Build only CLI
```

## 3. Test the CLI

### Validate an Envelope

```bash
# Validate valid example
npx @mova/cli validate ./examples/booking.envelope.json

# Expected output:
# ✓ ./examples/booking.envelope.json is valid
```

```bash
# Validate invalid example (should show errors)
npx @mova/cli validate ./examples/invalid.envelope.json

# Expected output:
# ✗ ./examples/invalid.envelope.json has validation errors:
#   1:23 - must match pattern "^3\.4\.(0|[1-9]\d*)$" (pattern)
```

### Generate a Snippet

```bash
npx @mova/cli snippet:generate booking

# Expected output: Sample envelope JSON
```

## 4. Run Tests

### Test All Packages

```bash
npm run test
```

### Test Specific Package

```bash
npm -w packages/sdk run test
```

## 5. Development Workflow

### Watch Mode (Auto-rebuild)

```bash
npm run dev
```

This watches for changes in SDK and LSP Server and auto-rebuilds.

### Format & Lint

```bash
# Check formatting
npm run format -- --check

# Fix formatting
npm run format

# Run linter
npm run lint

# Run linter and show all issues
npm run lint -- --color
```

## 6. SDK Usage (Programmatic)

### Validate a Document

```javascript
import { validateDocument, initializeValidator } from '@mova/sdk';

// Initialize once
await initializeValidator();

// Validate JSON text
const result = await validateDocument(`{
  "mova_version": "3.4.1",
  "envelope_id": "test",
  ...
}`);

if (result.ok) {
  console.log('✓ Valid');
} else {
  result.diagnostics?.forEach(d => {
    console.log(`Line ${d.range.start.line}: ${d.message}`);
  });
}
```

See [SDK README](./packages/sdk/README.md) for more examples.

## 7. LSP Server (Local Development)

### Start LSP Server

```bash
npm -w packages/server-lsp run dev
```

The server will start in debug mode and listen on stdio.

### Connect VSCode Client

1. Open this monorepo in VS Code
2. Press `F5` to start debugging
3. A new VS Code window opens with the extension
4. Create or open a `.mova` or `.envelope.json` file
5. You should see:
   - Diagnostics (red squiggles for errors)
   - Completions (Ctrl+Space)
   - Hover descriptions

## 8. Publishing to npm

### Create a Changeset

When you've made changes, document them:

```bash
npm run changeset
```

This creates an entry in `.changeset/` describing what changed.

### Check What Will Be Published

```bash
npm run changeset:status
```

### Publish Packages (Automated)

The GitHub Actions workflow handles publishing:
1. Push changesets to main branch
2. GitHub Actions creates a release PR
3. Merge the release PR
4. Packages are automatically published to npm

For manual publishing (not recommended):
```bash
npm run build
npm run test
npm run publish:all  # Requires npm auth token
```

## 9. Project Structure

```
mova-lsp-monorepo/
├── packages/
│   ├── schemas/      # JSON Schema (3.4.1)
│   ├── sdk/          # Core validator & utilities
│   ├── server-lsp/   # LSP server implementation
│   ├── cli/          # Command-line interface
│   └── client-vscode/# VS Code extension
├── examples/         # Sample envelopes (valid & invalid)
├── .github/          # CI/CD workflows
└── ... configuration files
```

See [PROJECT_STRUCTURE.txt](./PROJECT_STRUCTURE.txt) for detailed breakdown.

## 10. Common Tasks

### Add a New Package

```bash
mkdir packages/my-package
cd packages/my-package
npm init -y
# Edit package.json, add name, exports, dependencies
# Create src/index.ts
npm install (from root)  # Updates workspaces
```

### Add a Dependency to a Package

```bash
npm install -w packages/sdk lodash
```

### Run Only SDK Tests

```bash
npm -w packages/sdk run test
```

### Debug SDK Functions

```bash
# Add console.log to src/
npm run dev        # Watch mode
# Run test file in debugger
node --inspect-brk node_modules/.bin/mocha dist/**/*.test.js
```

## 11. Troubleshooting

### "Cannot find module '@mova/sdk'"

```bash
# Rebuild everything
npm run build

# Or rebuild and reinstall
npm install
npm run build
```

### TypeScript Errors

```bash
# Check TypeScript
npm run lint

# Rebuild from scratch
rm -rf packages/*/dist
npm run build
```

### Tests Not Running

```bash
# Ensure built files exist
npm run build

# Run tests verbosely
npm -w packages/sdk run test -- --reporter spec
```

### VSCode Extension Not Starting

1. Ensure LSP server is built: `npm -w packages/server-lsp run build`
2. Ensure client-vscode is built: `npm -w packages/client-vscode run build`
3. Check VSCode output panel for errors
4. Try restarting VSCode

## 12. Resources

- **Main README**: [README.md](./README.md)
- **SDK Documentation**: [packages/sdk/README.md](./packages/sdk/README.md)
- **Technical Spec (Russian)**: [tz.md](./tz.md)
- **Schema Reference**: [envelope.3.4.1.schema.json](./envelope.3.4.1.schema.json)
- **JSON Schema 2020-12**: https://json-schema.org/draft/2020-12/schema
- **AJV**: https://ajv.js.org/
- **LSP**: https://microsoft.github.io/language-server-protocol/

## 13. Development Tips

✅ **Do:**
- Use `npm run format` before committing
- Run `npm run test` to catch errors
- Create changesets for each feature
- Write TypeScript with strict mode enabled
- Keep SDK functions pure and side-effect-free

❌ **Don't:**
- Commit unformatted code
- Break workspace package dependencies
- Add CommonJS or UMD to ESM-only packages
- Hardcode secrets (use environment variables)
- Publish packages manually (use GitHub Actions)

## Next Steps

1. **Explore the codebase**: Check out [PROJECT_STRUCTURE.txt](./PROJECT_STRUCTURE.txt)
2. **Read the SDK API**: [packages/sdk/README.md](./packages/sdk/README.md)
3. **Test the CLI**: `npx @mova/cli validate ./examples/booking.envelope.json`
4. **Run the LSP**: `npm -w packages/server-lsp run dev`
5. **Make changes**: Edit files in `packages/*/src/`
6. **Rebuild & test**: `npm run build && npm run test`

## Need Help?

- Check [README.md](./README.md) for overview
- See [tz.md](./tz.md) for technical specification
- Review examples in `./examples/`
- Check GitHub Issues for known problems
- Create a new issue with details

---

**Last updated**: October 2025 | **Version**: 0.1.0-dev
