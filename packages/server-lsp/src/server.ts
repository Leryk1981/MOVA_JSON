#!/usr/bin/env node

import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  CompletionItem,
  CompletionItemKind,
  Hover,
  InitializeResult,
  TextDocumentPositionParams,
  Range,
  Position,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  ExecuteCommandParams,
  SymbolKind,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseTree, findNodeAtLocation, type Node as JsonNode } from 'jsonc-parser';

// Import SDK
import * as movaSdk from 'leryk-sdk-mova';

// Create connection and documents manager
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Settings cache
interface ServerSettings {
  executorEndpoint?: string;
  schemaPath?: string;
  maxDiagnostics?: number;
}

let globalSettings: ServerSettings = {
  maxDiagnostics: 200,
};

// Initialize
connection.onInitialize((): InitializeResult => {
  connection.console.log('MOVA LSP: initializing');

  // Load schemas
  try {
    if (typeof movaSdk.initializeValidator === 'function') {
      void movaSdk.initializeValidator().catch((e: unknown) =>
        connection.console.warn(`movaSdk.initializeValidator() warning: ${String(e)}`)
      );
    }
  } catch (e: unknown) {
    connection.console.warn(`Error calling movaSdk.initializeValidator: ${String(e)}`);
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', "'", '/', '.', ':'],
      },
      hoverProvider: true,
      renameProvider: {
        prepareProvider: true,
      },
      referencesProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
      executeCommandProvider: {
        commands: ['mova.runPlanDry'],
      },
    },
  };

  return result;
});

connection.onInitialized(() => {
  connection.console.log('MOVA LSP: initialized');
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
});

// Helper functions
function offsetToPosition(text: string, offset: number): Position {
  const lines = text.slice(0, Math.max(0, offset)).split(/\r\n|\n/);
  const line = Math.max(0, lines.length - 1);
  const character = lines[lines.length - 1]?.length ?? 0;
  return Position.create(line, character);
}

function nodeToRange(node: JsonNode, text: string): Range {
  const start = offsetToPosition(text, node.offset);
  const end = offsetToPosition(text, node.offset + node.length);
  return Range.create(start, end);
}

function instancePathToPathArray(instancePath: string): Array<string | number> {
  if (!instancePath) return [];
  const parts = instancePath.replace(/^\//, '').split('/');
  return parts.map((p) => {
    if (/^\d+$/.test(p)) return Number(p);
    return p.replace(/~1/g, '/').replace(/~0/g, '~');
  });
}

// Diagnostics pipeline
async function validateAndSendDiagnostics(text: string, uri: string): Promise<void> {
  try {
    const res = await movaSdk.validateDocument(text, uri);
    const diagnostics: Diagnostic[] = [];

    if (res && Array.isArray(res.diagnostics) && res.diagnostics.length > 0) {
      for (const d of res.diagnostics) {
        if (d.range) {
          diagnostics.push({
            message: d.message ?? 'validation error',
            severity: d.severity === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
            range: d.range as Range,
            source: 'mova-ajv',
          });
        } else if (d.instancePath) {
          const docParse = parseTree(text, undefined, { allowTrailingComma: true });
          const path = instancePathToPathArray(d.instancePath);
          const node = docParse ? findNodeAtLocation(docParse, path) : undefined;
          const range = node
            ? nodeToRange(node, text)
            : Range.create(Position.create(0, 0), Position.create(0, 1));
          diagnostics.push({
            message: (d.message ?? `${d.instancePath} ${d.keyword ?? ''}`).trim(),
            severity: d.severity === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
            range,
            source: 'mova-ajv',
          });
        }
      }
    }

    const maxD = globalSettings.maxDiagnostics ?? 200;
    connection.sendDiagnostics({ uri, diagnostics: diagnostics.slice(0, maxD) });
  } catch (err: unknown) {
    connection.window.showErrorMessage(`MOVA LSP validate error: ${String(err)}`);
    connection.console.error(`validateAndSendDiagnostics error: ${String(err)}`);
  }
}

// Document change handlers
documents.onDidChangeContent((change) => {
  const text = change.document.getText();
  validateAndSendDiagnostics(text, change.document.uri);
});

documents.onDidClose((e) => {
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// Completion handler
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  try {
    const doc = documents.get(params.textDocument.uri);
    const text = doc?.getText() ?? '';

    if (typeof movaSdk.suggestCompletions === 'function') {
      try {
        const ctx = {
          text,
          uri: params.textDocument.uri,
          position: params.position,
        };
        const items = movaSdk.suggestCompletions(ctx);
        if (Array.isArray(items)) {
          return items.map(item => ({
            label: item.label,
            kind: item.kind === 'Function' ? CompletionItemKind.Function :
                   item.kind === 'Variable' ? CompletionItemKind.Variable :
                   item.kind === 'Keyword' ? CompletionItemKind.Keyword :
                   item.kind === 'Property' ? CompletionItemKind.Property :
                   item.kind === 'Snippet' ? CompletionItemKind.Snippet :
                   CompletionItemKind.Text,
            detail: item.detail,
            documentation: item.documentation,
            sortText: item.sortText,
            insertText: item.insertText,
          }));
        }
      } catch (e: unknown) {
        connection.console.warn(`movaSdk.suggestCompletions failed: ${String(e)}`);
      }
    }

    // Fallback
    const fallback: CompletionItem[] = [
      { label: 'http_fetch', kind: CompletionItemKind.Function, detail: 'action: http_fetch' },
      { label: 'set', kind: CompletionItemKind.Function, detail: 'action: set variable' },
      { label: 'assert', kind: CompletionItemKind.Function, detail: 'action: assert condition' },
      { label: 'emit_event', kind: CompletionItemKind.Function, detail: 'action: emit event' },
    ];
    return fallback;
  } catch (err: unknown) {
    connection.console.error(`onCompletion error: ${String(err)}`);
    return [];
  }
});

// Hover handler
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;

    const text = doc.getText();
    const offset = positionToOffset(text, params.position);
    const tree = parseTree(text, undefined, { allowTrailingComma: true });
    if (!tree) return null;

    const node = findNodeCoveringOffset(tree, offset);
    if (!node) return null;

    return { contents: { kind: 'markdown', value: `**Field**: \`${node.type}\`` } };
  } catch (e: unknown) {
    connection.console.error(`onHover error: ${String(e)}`);
    return null;
  }
});

// Helper functions for hover
function positionToOffset(text: string, pos: Position): number {
  const lines = text.split(/\r\n|\n/);
  let offset = 0;
  for (let i = 0; i < pos.line; i++) {
    offset += (lines[i]?.length ?? 0) + 1;
  }
  offset += pos.character;
  return offset;
}

function findNodeCoveringOffset(root: JsonNode | undefined, offset: number): JsonNode | undefined {
  if (!root) return undefined;
  let result: JsonNode | undefined = undefined;
  const stack: JsonNode[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.offset <= offset && offset <= n.offset + n.length) {
      result = n;
      if (n.children && n.children.length) {
        for (const c of n.children) stack.push(c);
      }
    }
  }
  return result;
}

// Commands
connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
  if (params.command === 'mova.runPlanDry') {
    const args = params.arguments ?? [];
    let text: string | undefined;
    if (args.length > 0 && typeof args[0] === 'string') {
      const first = args[0] as string;
      if (first.startsWith('file://') || first.startsWith('untitled:')) {
        const doc = documents.get(first);
        text = doc?.getText();
      } else {
        text = first;
      }
    }
    if (!text) {
      connection.window.showErrorMessage('mova.runPlanDry: no document provided');
      return;
    }

    try {
      connection.window.showInformationMessage('Dry-run not yet implemented');
    } catch (e: unknown) {
      connection.window.showErrorMessage('mova.runPlanDry failed: ' + String(e));
    }
  }
});

// Track all open documents for workspace symbols
const allDocuments = new Map<string, string>();

documents.onDidOpen((event) => {
  allDocuments.set(event.document.uri, event.document.getText());
});

documents.onDidChangeContent((event) => {
  allDocuments.set(event.document.uri, event.document.getText());
});

documents.onDidClose((event) => {
  allDocuments.delete(event.document.uri);
});

// Rename handler
connection.onPrepareRename((params) => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;

    const range = movaSdk.prepareRename(doc.getText(), params.position);
    return range;
  } catch (e: unknown) {
    connection.console.error(`onPrepareRename error: ${String(e)}`);
    return null;
  }
});

connection.onRenameRequest((params) => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;

    const edit = movaSdk.rename(doc.getText(), params.position, params.newName);
    return edit;
  } catch (e: unknown) {
    connection.console.error(`onRenameRequest error: ${String(e)}`);
    return null;
  }
});

// References handler
connection.onReferences((params) => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    return movaSdk.findReferences(doc.getText(), params.position);
  } catch (e: unknown) {
    connection.console.error(`onReferences error: ${String(e)}`);
    return [];
  }
});

// Document Symbols handler
connection.onDocumentSymbol((params) => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const symbols = movaSdk.getDocumentSymbols(doc.getText());
    return symbols.map(sym => ({
      name: sym.name,
      kind: sym.kind as SymbolKind,
      range: sym.range,
      selectionRange: sym.selectionRange,
      children: sym.children?.map(child => ({
        name: child.name,
        kind: child.kind as SymbolKind,
        range: child.range,
        selectionRange: child.selectionRange,
        children: child.children?.map(grandchild => ({
          name: grandchild.name,
          kind: grandchild.kind as SymbolKind,
          range: grandchild.range,
          selectionRange: grandchild.selectionRange,
        })),
      })),
    }));
  } catch (e: unknown) {
    connection.console.error(`onDocumentSymbol error: ${String(e)}`);
    return [];
  }
});

// Workspace Symbols handler
connection.onWorkspaceSymbol((params) => {
  try {
    const symbols = movaSdk.getWorkspaceSymbols(params.query, allDocuments);
    return symbols.map(sym => ({
      name: sym.name,
      kind: sym.kind as SymbolKind,
      location: {
        uri: sym.location.uri,
        range: sym.location.range,
      },
    }));
  } catch (e: unknown) {
    connection.console.error(`onWorkspaceSymbol error: ${String(e)}`);
    return [];
  }
});

// Document Formatting handler
connection.onDocumentFormatting((params) => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const formatted = movaSdk.formatDocument(doc.getText(), {
      tabSize: params.options.tabSize,
      insertSpaces: params.options.insertSpaces,
    });

    const lines = doc.getText().split('\n');
    return [
      {
        range: Range.create(
          Position.create(0, 0),
          Position.create(lines.length, 0)
        ),
        newText: formatted,
      },
    ];
  } catch (e: unknown) {
    connection.console.error(`onDocumentFormatting error: ${String(e)}`);
    return [];
  }
});

// Document Range Formatting handler
connection.onDocumentRangeFormatting((params) => {
  try {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const formatted = movaSdk.formatRange(doc.getText(), params.range, {
      tabSize: params.options.tabSize,
      insertSpaces: params.options.insertSpaces,
    });

    return [
      {
        range: params.range,
        newText: formatted,
      },
    ];
  } catch (e: unknown) {
    connection.console.error(`onDocumentRangeFormatting error: ${String(e)}`);
    return [];
  }
});

// Settings
connection.onDidChangeConfiguration((change) => {
  const settings = change.settings?.mova ?? {};
  globalSettings.executorEndpoint = settings.executorEndpoint ?? globalSettings.executorEndpoint;
  globalSettings.schemaPath = settings.schemaPath ?? globalSettings.schemaPath;
  globalSettings.maxDiagnostics = settings.maxDiagnostics ?? globalSettings.maxDiagnostics;
  documents.all().forEach((doc) => {
    validateAndSendDiagnostics(doc.getText(), doc.uri);
  });
});

// Listen
documents.listen(connection);
connection.listen();
