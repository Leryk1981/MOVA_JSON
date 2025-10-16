declare module 'fs' {
  type ReadFileEncoding = string;
  export function readFileSync(
    path: string,
    options?: ReadFileEncoding | { encoding?: ReadFileEncoding }
  ): string;
}

declare module 'path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
}

declare module 'crypto' {
  interface Hash {
    update(data: string | Uint8Array): Hash;
    digest(): Uint8Array;
    digest(encoding: 'hex' | 'base64' | 'base64url'): string;
  }

  export function createHash(algorithm: string): Hash;
}

declare module 'url' {
  type FileLike = string | { href: string };
  export function fileURLToPath(path: FileLike): string;
}

declare class URL {
  constructor(input: string, base?: string | URL);
  href: string;
}

declare namespace NodeJS {
  interface WriteStream {
    write(buffer: string | Uint8Array): boolean;
  }

  interface Process {
    argv: string[];
    exit(code?: number): never;
    stdout: WriteStream;
  }
}

declare const process: NodeJS.Process;

interface Console {
  log(...data: unknown[]): void;
  error(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  info(...data: unknown[]): void;
}

declare const console: Console;

interface ImportMeta {
  url: string;
}
