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

interface ImportMeta {
  url: string;
}
