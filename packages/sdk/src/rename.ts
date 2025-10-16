import type { Range, Position } from 'vscode-languageserver-types';

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
  const changesList: Array<{ range: Range; newText: string }> = [];

  try {
    const lines = text.split('\n');
    const line = lines[position.line];

    if (!line) {
      return { changes: { 'file:///envelope.json': changesList } };
    }

    // Find the identifier
    let start = position.character;
    while (start > 0 && /[a-zA-Z0-9_-]/.test(line[start - 1])) {
      start--;
    }

    const identifier = extractIdentifier(line, start);
    if (!identifier) {
      return { changes: { 'file:///envelope.json': changesList } };
    }

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
          changesList.push({
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

    return { changes: { 'file:///envelope.json': changesList } };
  } catch (error) {
    console.error('Rename error:', error);
    return { changes: { 'file:///envelope.json': changesList } };
  }
}

function extractIdentifier(line: string, start: number): string | null {
  let end = start;
  while (end < line.length && /[a-zA-Z0-9_-]/.test(line[end])) {
    end++;
  }
  return line.substring(start, end) || null;
}
