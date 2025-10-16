export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
}

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

/**
 * Format entire document
 */
export function formatDocument(text: string, options: FormattingOptions): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, options.tabSize);
  } catch (error) {
    console.error('Format error:', error);
    return text; // Return original if parse fails
  }
}

/**
 * Format only selected range
 */
export function formatRange(
  text: string,
  range: Range,
  options: FormattingOptions
): string {
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
    console.error('Format range error:', error);
    return text;
  }
}
