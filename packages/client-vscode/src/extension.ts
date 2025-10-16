import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Server options
  const serverModule = join(__dirname, 'server.js');
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: { module: serverModule, transport: TransportKind.stdio },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'mova' },
      { scheme: 'file', language: 'json', pattern: '**/*.envelope.json' },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{mova,envelope.json}'),
    },
  };

  // Create and start the language client
  client = new LanguageClient('mova-lsp', 'MOVA LSP', serverOptions, clientOptions);

  // Start the client
  await client.start();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('mova.validate', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const doc = editor.document;
      const text = doc.getText();

      // Send to server for validation
      await client.sendRequest('custom/validate', { uri: doc.uri.toString(), text });
      vscode.window.showInformationMessage('Validation complete');
    }),

    vscode.commands.registerCommand('mova.runDry', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const doc = editor.document;
      await client.sendRequest('mova.runPlanDry', {
        uri: doc.uri.toString(),
        text: doc.getText(),
      });
      vscode.window.showInformationMessage('Dry-run command sent');
    })
  );
}

export async function deactivate(): Promise<void> {
  if (!client) {
    return;
  }
  await client.stop();
}
