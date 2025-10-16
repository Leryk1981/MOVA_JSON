#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);

const resolveCliBin = () => {
  const candidates = [];

  try {
    candidates.push(require.resolve('@changesets/cli/bin.js'));
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      console.warn('Encountered an unexpected error while resolving @changesets/cli/bin.js');
      console.warn(error);
    }
  }

  try {
    const pkgJsonPath = require.resolve('@changesets/cli/package.json');
    candidates.push(join(dirname(pkgJsonPath), 'bin.js'));
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      console.warn('Encountered an unexpected error while resolving @changesets/cli/package.json');
      console.warn(error);
    }
  }

  candidates.push(join(process.cwd(), 'node_modules', '@changesets', 'cli', 'bin.js'));

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
};

const spawnCli = (command, commandArgs) =>
  spawn(command, commandArgs, {
    stdio: 'inherit',
    env: process.env,
  });

const runChild = (childProcess) => {
  childProcess.on('close', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  childProcess.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
};

const cliBin = resolveCliBin();

if (cliBin) {
  runChild(spawnCli(process.execPath, [cliBin, ...args]));
} else {
  console.warn('Falling back to "npm exec --no-install @changesets/cli" because the local binary could not be resolved.');
  const npmArgs = ['exec', '--no-install', '--yes', '@changesets/cli'];
  if (args.length > 0) {
    npmArgs.push('--', ...args);
  }
  runChild(spawnCli(npmCommand, npmArgs));
}
