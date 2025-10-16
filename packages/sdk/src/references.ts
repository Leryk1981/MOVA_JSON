import type { Range, Position } from 'vscode-languageserver-types';

export interface ReferenceLocation {
  uri: string;
  range: Range;
}

/**
 * Find all references to identifier at position
 */
export function findReferences(
  text: string,
  position: Position
): ReferenceLocation[] {
  const locations: ReferenceLocation[] = [];

  try {
    const lines = text.split('\n');
    const line = lines[position.line];

    if (!line) return locations;

    // Extract identifier at position
    let start = position.character;
    while (start > 0 && /[a-zA-Z0-9_-]/.test(line[start - 1])) {
      start--;
    }

    let end = position.character;
    while (end < line.length && /[a-zA-Z0-9_-]/.test(line[end])) {
      end++;
    }

    const identifier = line.substring(start, end);
    if (!identifier) return locations;

    // Find all occurrences
    lines.forEach((currentLine, lineIndex) => {
      let searchPos = 0;
      while (true) {
        const index = currentLine.indexOf(identifier, searchPos);
        if (index === -1) break;

        // Check word boundaries
        const before = index > 0 ? currentLine[index - 1] : '';
        const after = index + identifier.length < currentLine.length
          ? currentLine[index + identifier.length]
          : '';

        if (!/[a-zA-Z0-9_-]/.test(before) && !/[a-zA-Z0-9_-]/.test(after)) {
          locations.push({
            uri: 'file:///envelope.json',
            range: {
              start: { line: lineIndex, character: index },
              end: { line: lineIndex, character: index + identifier.length }
            }
          });
        }

        searchPos = index + 1;
      }
    });

    return locations;
  } catch (error) {
    console.error('Find references error:', error);
    return locations;
  }
}
