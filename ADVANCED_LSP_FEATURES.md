# 🚀 Advanced LSP Features - Implementation Plan

**Status:** Ready for Development  
**Date:** October 16, 2025  
**Target:** Add Rename, References, Document Symbols, Workspace Symbols

---

## 📋 Overview

Implement advanced Language Server Protocol features to provide enterprise-grade IDE experience:

- **Rename** - Refactor identifiers across documents
- **References** - Find all usages of a symbol
- **Document Symbols** - Show outline of current document
- **Workspace Symbols** - Search symbols across workspace
- **Code Folding** - Collapse/expand regions
- **Formatting** - Format JSON with style preferences

---

## 🔧 Feature 1: Rename (Refactor)

### 1.1 Add SDK Support

**File:** `packages/sdk/src/rename.ts` (NEW)

```typescript
import type { Range, Position } from 'vscode-languageserver-types';

export interface RenameParams {
  text: string;
  position: Position;
  newName: string;
}

export interface WorkspaceEdit {
  changes: {
    [uri: string]: Array<{
      range: Range;
      newText: string;
    }>;
  };
}

/**
 * Find all occurrences of identifier at position and suggest rename
 */
export function prepareRename(
  text: string,
  position: Position
): Range | null {
  try {
    const lines = text.split('\n');
    const line = lines[position.line];
    
    if (!line) return null;

    // Find word boundaries
    let start = position.character;
    let end = position.character;

    // Move start backward to find identifier start
    while (start > 0 && /[a-zA-Z0-9_-]/.test(line[start - 1])) {
      start--;
    }

    // Move end forward to find identifier end
    while (end < line.length && /[a-zA-Z0-9_-]/.test(line[end])) {
      end++;
    }

    if (start === end) return null;

    return {
      start: { line: position.line, character: start },
      end: { line: position.line, character: end }
    };
  } catch (error) {
    console.error('Prepare rename error:', error);
    return null;
  }
}

/**
 * Rename identifier and return all changes needed
 */
export function rename(
  text: string,
  position: Position,
  newName: string
): WorkspaceEdit {
  const changes: { [uri: string]: Array<{ range: Range; newText: string }> } = {
    'file:///envelope.json': []
  };

  try {
    const lines = text.split('\n');
    const line = lines[position.line];

    if (!line) return changes;

    // Find the identifier
    let start = position.character;
    while (start > 0 && /[a-zA-Z0-9_-]/.test(line[start - 1])) {
      start--;
    }

    const identifier = extractIdentifier(line, start, position.character);
    if (!identifier) return changes;

    // Find all occurrences
    lines.forEach((currentLine, lineIndex) => {
      let searchPos = 0;
      while (true) {
        const index = currentLine.indexOf(identifier, searchPos);
        if (index === -1) break;

        // Check if it's a whole word (not part of another identifier)
        const before = index > 0 ? currentLine[index - 1] : '';
        const after = index + identifier.length < currentLine.length 
          ? currentLine[index + identifier.length] 
          : '';

        if (!/[a-zA-Z0-9_-]/.test(before) && !/[a-zA-Z0-9_-]/.test(after)) {
          changes['file:///envelope.json'].push({
            range: {
              start: { line: lineIndex, character: index },
              end: { line: lineIndex, character: index + identifier.length }
            },
            newText: newName
          });
        }

        searchPos = index + 1;
      }
    });

    return changes;
  } catch (error) {
    console.error('Rename error:', error);
    return changes;
  }
}

function extractIdentifier(line: string, start: number, cursorPos: number): string | null {
  let end = start;
  while (end < line.length && /[a-zA-Z0-9_-]/.test(line[end])) {
    end++;
  }
  return line.substring(start, end) || null;
}
```

### 1.2 Add LSP Handler

**File:** `packages/server-lsp/src/server.ts`

```typescript
// Add after other handlers

connection.onPrepareRename((params: PrepareRenameParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const range = sdk.prepareRename(document.getText(), params.position);
  return range;
});

connection.onRenameRequest((params: RenameParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const edit = sdk.rename(document.getText(), params.position, params.newName);
  return edit;
});
```

---

## 🔍 Feature 2: References (Find All Usages)

### 2.1 Add SDK Support

**File:** `packages/sdk/src/references.ts` (NEW)

```typescript
import type { Range, Position } from 'vscode-languageserver-types';

export interface ReferenceLocation {
  uri: string;
  range: Range;
}

/**
 * Find all references to identifier at position
 */
export function findReferences(
  text: string,
  position: Position,
  includeDeclaration: boolean = true
): ReferenceLocation[] {
  const locations: ReferenceLocation[] = [];

  try {
    const lines = text.split('\n');
    const line = lines[position.line];

    if (!line) return locations;

    // Extract identifier at position
    let start = position.character;
    while (start > 0 && /[a-zA-Z0-9_-]/.test(line[start - 1])) {
      start--;
    }

    let end = position.character;
    while (end < line.length && /[a-zA-Z0-9_-]/.test(line[end])) {
      end++;
    }

    const identifier = line.substring(start, end);
    if (!identifier) return locations;

    // Find all occurrences
    lines.forEach((currentLine, lineIndex) => {
      let searchPos = 0;
      while (true) {
        const index = currentLine.indexOf(identifier, searchPos);
        if (index === -1) break;

        // Check word boundaries
        const before = index > 0 ? currentLine[index - 1] : '';
        const after = index + identifier.length < currentLine.length
          ? currentLine[index + identifier.length]
          : '';

        if (!/[a-zA-Z0-9_-]/.test(before) && !/[a-zA-Z0-9_-]/.test(after)) {
          locations.push({
            uri: 'file:///envelope.json',
            range: {
              start: { line: lineIndex, character: index },
              end: { line: lineIndex, character: index + identifier.length }
            }
          });
        }

        searchPos = index + 1;
      }
    });

    return locations;
  } catch (error) {
    console.error('Find references error:', error);
    return locations;
  }
}
```

### 2.2 Add LSP Handler

```typescript
connection.onReferences((params: ReferenceParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  return sdk.findReferences(
    document.getText(),
    params.position,
    params.context.includeDeclaration
  );
});
```

---

## 📑 Feature 3: Document Symbols (Outline)

### 3.1 Add SDK Support

**File:** `packages/sdk/src/document-symbols.ts` (NEW)

```typescript
import type { SymbolInformation, SymbolKind } from 'vscode-languageserver-types';

export interface DocumentSymbol {
  name: string;
  kind: SymbolKind;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  selectionRange: { start: { line: number; character: number }; end: { line: number; character: number } };
  children?: DocumentSymbol[];
}

/**
 * Extract document symbols (outline) from envelope
 */
export function getDocumentSymbols(text: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  try {
    const parsed = JSON.parse(text);
    const lines = text.split('\n');

    // Root level
    const rootSymbol: DocumentSymbol = {
      name: 'Envelope',
      kind: 17, // Object
      range: { start: { line: 0, character: 0 }, end: { line: lines.length - 1, character: lines[lines.length - 1].length } },
      selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 8 } },
      children: []
    };

    // Metadata
    if (parsed.metadata) {
      rootSymbol.children?.push({
        name: 'metadata',
        kind: 17, // Object
        range: findLineRange(text, 'metadata'),
        selectionRange: findLineRange(text, 'metadata')
      });
    }

    // Plan
    if (parsed.plan) {
      const planSymbol: DocumentSymbol = {
        name: 'plan',
        kind: 17, // Object
        range: findLineRange(text, 'plan'),
        selectionRange: findLineRange(text, 'plan'),
        children: []
      };

      // Steps
      if (Array.isArray(parsed.plan.steps)) {
        parsed.plan.steps.forEach((step: any, index: number) => {
          planSymbol.children?.push({
            name: `Step ${index + 1}: ${step.verb || 'unknown'}`,
            kind: 6, // Method
            range: findLineRange(text, `"verb": "${step.verb}"`),
            selectionRange: findLineRange(text, `"verb": "${step.verb}"`)
          });
        });
      }

      rootSymbol.children?.push(planSymbol);
    }

    symbols.push(rootSymbol);
    return symbols;
  } catch (error) {
    console.error('Document symbols error:', error);
    return symbols;
  }
}

function findLineRange(text: string, searchStr: string): any {
  const lines = text.split('\n');
  let found = false;
  let line = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) {
      line = i;
      found = true;
      break;
    }
  }

  return {
    start: { line, character: 0 },
    end: { line, character: lines[line]?.length || 0 }
  };
}
```

### 3.2 Add LSP Handler

```typescript
connection.onDocumentSymbol((params: DocumentSymbolParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  return sdk.getDocumentSymbols(document.getText());
});
```

---

## 🌍 Feature 4: Workspace Symbols (Global Search)

### 4.1 Add SDK Support

**File:** `packages/sdk/src/workspace-symbols.ts` (NEW)

```typescript
export interface WorkspaceSymbol {
  name: string;
  kind: number;
  location: { uri: string; range: any };
}

/**
 * Search workspace for symbols matching query
 */
export function getWorkspaceSymbols(query: string, allDocuments: Map<string, string>): WorkspaceSymbol[] {
  const symbols: WorkspaceSymbol[] = [];

  try {
    allDocuments.forEach((text, uri) => {
      try {
        const parsed = JSON.parse(text);

        // Search in metadata
        if (parsed.metadata?.id?.includes(query)) {
          symbols.push({
            name: `Envelope: ${parsed.metadata.id}`,
            kind: 17, // Object
            location: {
              uri,
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 50 } }
            }
          });
        }

        // Search in plan steps
        if (Array.isArray(parsed.plan?.steps)) {
          parsed.plan.steps.forEach((step: any, index: number) => {
            if (step.verb?.includes(query) || step.noun?.includes(query)) {
              symbols.push({
                name: `${step.verb}/${step.noun} (Step ${index + 1})`,
                kind: 6, // Method
                location: {
                  uri,
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 50 } }
                }
              });
            }
          });
        }
      } catch (error) {
        // Skip invalid JSON documents
      }
    });

    return symbols;
  } catch (error) {
    console.error('Workspace symbols error:', error);
    return symbols;
  }
}
```

### 4.2 Add LSP Handler

```typescript
// Track all open documents
const allDocuments = new Map<string, string>();

documents.onDidOpen((event) => {
  allDocuments.set(event.document.uri, event.document.getText());
});

documents.onDidChange((event) => {
  allDocuments.set(event.document.uri, event.document.getText());
});

documents.onDidClose((event) => {
  allDocuments.delete(event.document.uri);
});

connection.onWorkspaceSymbol((params: WorkspaceSymbolParams) => {
  return sdk.getWorkspaceSymbols(params.query, allDocuments);
});
```

---

## 🎨 Feature 5: Formatting

### 5.1 Add SDK Support

**File:** `packages/sdk/src/formatting.ts` (NEW)

```typescript
export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
}

export function formatDocument(text: string, options: FormattingOptions): string {
  try {
    const parsed = JSON.parse(text);
    const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    return JSON.stringify(parsed, null, options.tabSize);
  } catch (error) {
    console.error('Format error:', error);
    return text; // Return original if parse fails
  }
}

export function formatRange(
  text: string,
  range: any,
  options: FormattingOptions
): string {
  // Format only the selected range
  const lines = text.split('\n');
  const startLine = range.start.line;
  const endLine = range.end.line;

  try {
    const rangeText = lines.slice(startLine, endLine + 1).join('\n');
    const parsed = JSON.parse(rangeText);
    const formatted = JSON.stringify(parsed, null, options.tabSize);

    lines.splice(startLine, endLine - startLine + 1, ...formatted.split('\n'));
    return lines.join('\n');
  } catch (error) {
    return text;
  }
}
```

### 5.2 Add LSP Handler

```typescript
connection.onDocumentFormatting((params: DocumentFormattingParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const formatted = sdk.formatDocument(document.getText(), {
    tabSize: params.options.tabSize,
    insertSpaces: params.options.insertSpaces
  });

  return [{
    range: {
      start: { line: 0, character: 0 },
      end: { line: document.lineCount, character: 0 }
    },
    newText: formatted
  }];
});

connection.onDocumentRangeFormatting((params: DocumentRangeFormattingParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const formatted = sdk.formatRange(document.getText(), params.range, {
    tabSize: params.options.tabSize,
    insertSpaces: params.options.insertSpaces
  });

  return [{
    range: params.range,
    newText: formatted
  }];
});
```

---

## 📝 Implementation Checklist

- [ ] Create `rename.ts` in SDK
- [ ] Create `references.ts` in SDK
- [ ] Create `document-symbols.ts` in SDK
- [ ] Create `workspace-symbols.ts` in SDK
- [ ] Create `formatting.ts` in SDK
- [ ] Export all new functions from SDK `index.ts`
- [ ] Add LSP handlers in `server.ts`
- [ ] Update TypeScript types
- [ ] Add tests for each feature
- [ ] Update CLI to support these features
- [ ] Update VS Code client keybindings
- [ ] Test locally
- [ ] Update documentation
- [ ] Create changeset for version bump
- [ ] Publish to npm

---

## 🧪 Testing Plan

### Unit Tests
```bash
npm run test
```

### Manual Testing in VS Code
1. Open an envelope file
2. Press F12 to open DevTools
3. Test each feature:
   - **Rename:** Right-click identifier → Rename
   - **References:** Right-click identifier → Go to References
   - **Symbols:** Ctrl+Shift+O (outline)
   - **Workspace Symbols:** Ctrl+T (global search)
   - **Format:** Ctrl+Shift+F (format document)

---

**Status:** 📋 Ready to Start Implementation  
**Next Step:** Begin with Feature 1 (Rename)
