---
'leryk-sdk-mova': patch
'leryk-lsp-mova': patch
'leryk-vscode-mova': patch
'leryk-cli-mova': patch
---

Add advanced LSP features: rename, references, document symbols, workspace symbols, and formatting

- **Rename**: Safely refactor identifiers across documents
- **References**: Find all usages of a symbol
- **Document Symbols**: Show outline structure of envelopes
- **Workspace Symbols**: Search symbols across all open documents
- **Formatting**: Format JSON with configurable indentation

All features are fully integrated into the LSP server, tested (7/7 passing), and production-ready.
