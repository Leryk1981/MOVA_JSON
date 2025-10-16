# 🧪 MOVA LSP MVP - Integration Test Plan

**Status**: Ready to Execute  
**Date**: October 16, 2025  
**Test Suite**: Barbershop CRM + MVP Components

---

## 📋 Test Phases

### Phase 1: Dependencies & Build
- [ ] npm install (all workspaces)
- [ ] Verify node_modules (root + packages)
- [ ] Check monorepo structure
- [ ] Verify package.json exports

### Phase 2: TypeScript Compilation
- [ ] npm run build (root command)
- [ ] Check @mova/schemas/dist exists
- [ ] Check @mova/sdk/dist exists
- [ ] Check @mova/server-lsp/dist exists
- [ ] Check @mova/cli/dist exists
- [ ] Check @mova/client-vscode/dist exists
- [ ] Verify .d.ts files generated

### Phase 3: SDK Functionality Tests

#### 3.1: Schema Loading
```typescript
Test: Load MOVA 3.4.1 schema
Expected: Schema loaded without errors
File: packages/sdk/src/validator.ts
```

#### 3.2: Barbershop Envelope Validation
```typescript
Test: Validate barbershop-crm.json against schema
Steps:
  1. Load barbershop envelope
  2. Parse JSON
  3. Validate with AJV
  4. Check no errors
Expected: ok = true
```

#### 3.3: Error Mapping
```typescript
Test: Map AJV errors to LSP diagnostics
Steps:
  1. Create invalid envelope (missing field)
  2. Validate with AJV
  3. Map errors to diagnostics
  4. Check positions (line:character)
Expected: Diagnostics with correct positions
```

#### 3.4: Completions
```typescript
Test: Generate completions for barbershop context
Expected: 14 MOVA verbs + keywords
```

#### 3.5: Idempotency Key
```typescript
Test: Generate deterministic idempotency key
Expected: Consistent key format
```

### Phase 4: CLI Integration Tests

#### 4.1: Validate Command (Valid)
```bash
Command: npx @mova/cli validate examples/booking.envelope.json
Expected: Exit code 0, "✓ Valid"
```

#### 4.2: Validate Command (Invalid)
```bash
Command: npx @mova/cli validate examples/invalid.envelope.json
Expected: Exit code 1, Error messages
```

#### 4.3: Validate Command (Barbershop)
```bash
Command: npx @mova/cli validate "MOVA 3.4 AI-Powered Visual Workflow Editor/barbershop/global/01-complete-barbershop-crm-system.json"
Expected: Exit code 0, "✓ Valid"
```

#### 4.4: Snippet Generation
```bash
Command: npx @mova/cli snippet:generate booking
Expected: Valid envelope JSON output
```

#### 4.5: Output Formats
```bash
Command: npx @mova/cli validate --output json examples/booking.envelope.json
Expected: JSON output with diagnostics
```

### Phase 5: LSP Server Tests

#### 5.1: Server Initialization
```typescript
Test: Start LSP server
Expected: 
  - Connection created
  - Capabilities advertised
  - Server ready for requests
```

#### 5.2: Diagnostics Pipeline
```typescript
Test: Open document → validate → send diagnostics
Steps:
  1. onDidOpen with envelope text
  2. Parse and validate
  3. Map errors
  4. sendDiagnostics
Expected: Client receives diagnostics
```

#### 5.3: Completion Requests
```typescript
Test: onCompletion at various positions
Expected:
  - Top-level: suggest mova_version, envelope_id, etc.
  - After "verb": suggest all 14 verbs
  - Context-aware suggestions
```

#### 5.4: Hover Requests
```typescript
Test: onHover for different fields
Expected: Documentation returned
```

#### 5.5: Configuration Changes
```typescript
Test: onDidChangeConfiguration
Expected: Settings updated, docs revalidated
```

### Phase 6: Barbershop CRM Tests

#### 6.1: Envelope Structure
```typescript
Test: Load and validate barbershop envelope
Checks:
  - mova_version: 3.4.1
  - envelope_id: barbershop.global.complete_crm_system
  - 40+ valid steps
  - All verbs valid
  - Policies present
Expected: All checks pass
```

#### 6.2: Verb Analysis
```typescript
Test: Analyze verbs used in barbershop
Expected:
  - log: multiple instances
  - http_fetch: multiple instances
  - template: multiple instances
  - All verbs valid MOVA 3.4.1
```

#### 6.3: Global Catalogs
```typescript
Test: Verify global catalogs structure
Expected:
  - 7+ roles
  - 8+ resources
  - 8+ data schemas
  - States and transitions
```

#### 6.4: Error Detection
```typescript
Test: Remove required field, validate
Expected: SDK detects error with position
```

### Phase 7: Error Cases

#### 7.1: Missing Required Fields
```json
Test: Delete "envelope_id"
Expected: Error detected at position
```

#### 7.2: Invalid Verb
```json
Test: Change verb to "invalid_verb"
Expected: Validation error
```

#### 7.3: Type Mismatch
```json
Test: Change budget_ms to "string"
Expected: Type error
```

#### 7.4: Malformed JSON
```json
Test: Remove closing brace
Expected: Parse error
```

### Phase 8: Performance Tests

#### 8.1: Small Envelope
```typescript
File: examples/booking.envelope.json
Expected: Validation < 50ms
```

#### 8.2: Medium Envelope
```typescript
File: examples/barbershop-crm.json (40 steps)
Expected: Validation < 200ms
```

#### 8.3: Completion Response
```typescript
Expected: Completions < 100ms
```

#### 8.4: Error Mapping
```typescript
Expected: Map errors < 50ms
```

### Phase 9: Integration Points

#### 9.1: SDK → CLI
```typescript
Test: CLI uses SDK.validateDocument
Expected: Same results as direct SDK call
```

#### 9.2: SDK → LSP Server
```typescript
Test: LSP uses SDK functions
Expected: Diagnostics same as CLI
```

#### 9.3: CLI → File System
```typescript
Test: CLI reads files correctly
Expected: Validates file contents
```

#### 9.4: LSP ↔ Client
```typescript
Test: LSP sends diagnostics to client
Expected: Client receives updates
```

### Phase 10: Documentation Tests

#### 10.1: API Documentation
```typescript
Test: All SDK exports documented
Expected: Every function has JSDoc
```

#### 10.2: Examples
```typescript
Test: Code examples work
Expected: No runtime errors
```

#### 10.3: README
```typescript
Test: Installation instructions valid
Expected: npm install succeeds
```

---

## 🛠️ Test Execution Commands

```bash
# Phase 1-2: Setup & Build
npm install
npm run build

# Phase 3: SDK Tests (after build)
npm -w packages/sdk run test

# Phase 4: CLI Tests
npx @mova/cli validate examples/booking.envelope.json
npx @mova/cli validate examples/invalid.envelope.json
npx @mova/cli validate "MOVA 3.4 AI-Powered Visual Workflow Editor/barbershop/global/01-complete-barbershop-crm-system.json"
npx @mova/cli snippet:generate booking

# Phase 5: LSP Server Tests
npm -w packages/server-lsp run start
# (In separate terminal) Connect LSP client

# Phase 6-10: Manual/Automated Tests
npm run test (once tests are implemented)
npm run lint
npm run format --check
```

---

## ✅ Success Criteria

**MVP passes integration tests if:**

1. ✅ All packages build without errors
2. ✅ SDK validates barbershop envelope without errors
3. ✅ CLI returns correct exit codes
4. ✅ Error mapping produces correct positions
5. ✅ LSP server starts and responds to requests
6. ✅ Completions suggest all 14 MOVA verbs
7. ✅ Hover provides documentation
8. ✅ Barbershop CRM validates completely
9. ✅ Performance targets met (< 200ms for large envelopes)
10. ✅ No TypeScript or ESLint errors

---

## 📊 Test Coverage Goals

| Component | Lines | Covered | Target |
|-----------|-------|---------|--------|
| SDK Core | 200+ | 0% | 80% |
| Error Mapper | 100+ | 0% | 90% |
| Completions | 80+ | 0% | 80% |
| LSP Server | 400+ | 0% | 70% |
| CLI | 100+ | 0% | 85% |

---

## 🚨 Known Issues to Watch

- [ ] ESM import resolution in Node.js
- [ ] TypeScript strict mode compliance
- [ ] JSON import with `assert { type: 'json' }`
- [ ] Path resolution across packages
- [ ] Windows vs Unix path handling

---

## 📝 Test Results Template

```
Test Date: ___________
Node Version: ___________
npm Version: ___________

Phase 1 - Dependencies: [ ] PASS [ ] FAIL
Phase 2 - Build: [ ] PASS [ ] FAIL
Phase 3 - SDK: [ ] PASS [ ] FAIL
Phase 4 - CLI: [ ] PASS [ ] FAIL
Phase 5 - LSP: [ ] PASS [ ] FAIL
Phase 6 - Barbershop: [ ] PASS [ ] FAIL
Phase 7 - Error Cases: [ ] PASS [ ] FAIL
Phase 8 - Performance: [ ] PASS [ ] FAIL
Phase 9 - Integration: [ ] PASS [ ] FAIL
Phase 10 - Documentation: [ ] PASS [ ] FAIL

Overall Status: [ ] PASS [ ] FAIL

Issues Found:
___________
___________

Notes:
___________
```

---

**Ready to begin integration testing!** 🚀
