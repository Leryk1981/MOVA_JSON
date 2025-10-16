#!/usr/bin/env node
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);

let cliBin;
try {
  cliBin = require.resolve('@changesets/cli/bin.js');
} catch (error) {
  console.error('Unable to resolve @changesets/cli. Ensure dependencies are installed.');
  console.error(error);
  process.exit(1);
}

const child = spawn(process.execPath, [cliBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
