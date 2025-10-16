#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import cac from 'cac';
import { validateDocument, initializeValidator } from '@mova/sdk';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const cli = cac('mova');

// Get version from package.json
let version = '0.1.0';
try {
  const pkgPath = resolve(__dirname, '../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  version = pkg.version;
} catch {
  // Keep default version
}

cli.version(version);
cli.help();

/**
 * validate command: validate envelope.json files
 */
cli
  .command('validate <file>', 'Validate a MOVA envelope file')
  .option('--output <type>', 'Output format: json, text', { default: 'text' })
  .action(async (file: string, options: { output: string }) => {
    try {
      await initializeValidator();
      const text = readFileSync(file, 'utf-8');
      const result = await validateDocument(text, file);

      if (options.output === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.ok) {
          console.log(`✓ ${file} is valid`);
        } else {
          console.error(`✗ ${file} has validation errors:`);
          if (result.diagnostics) {
            for (const diag of result.diagnostics) {
              const pos = `${diag.range.start.line + 1}:${diag.range.start.character + 1}`;
              console.error(`  ${pos}: ${diag.message}`);
            }
          }
          process.exit(1);
        }
      }
    } catch (err) {
      console.error(`Error: ${String(err)}`);
      process.exit(1);
    }
  });

/**
 * schema:sync command: placeholder for schema synchronization
 */
cli
  .command('schema:sync [url]', 'Sync schemas from remote URL')
  .action(async (url?: string) => {
    console.log(`Schema sync from: ${url || 'default registry'}`);
    // Placeholder for schema sync implementation
    console.log('Schema sync not yet implemented');
  });

/**
 * snippet:generate command: generate code snippets
 */
cli
  .command('snippet:generate <type>', 'Generate a workflow snippet')
  .action(async (type: string) => {
    console.log(`Generating snippet for type: ${type}`);
    // Placeholder for snippet generation
    const snippet = {
      mova_version: '3.4.1',
      envelope_id: `envelope_${type}_${Date.now()}`,
      category: type,
      title: `Sample ${type} workflow`,
      summary: `A sample ${type} workflow`,
      plan: {
        steps: [
          {
            id: 'step_1',
            verb: 'log',
            with: {
              message: 'Hello from MOVA',
            },
          },
        ],
      },
    };
    console.log(JSON.stringify(snippet, null, 2));
  });

cli.parse(process.argv);
