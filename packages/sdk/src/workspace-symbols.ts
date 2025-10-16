export interface WorkspaceSymbol {
  name: string;
  kind: number;
  location: { uri: string; range: Range };
}

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface PlanStep {
  verb?: string;
  noun?: string;
}

/**
 * Search workspace for symbols matching query
 */
export function getWorkspaceSymbols(query: string, allDocuments: Map<string, string>): WorkspaceSymbol[] {
  const symbols: WorkspaceSymbol[] = [];

  try {
    allDocuments.forEach((text, uri) => {
      try {
        const parsed = JSON.parse(text);

        // Search in metadata
        if (parsed.metadata?.id && parsed.metadata.id.toLowerCase().includes(query.toLowerCase())) {
          symbols.push({
            name: `Envelope: ${parsed.metadata.id}`,
            kind: 17, // Object
            location: {
              uri,
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 50 } }
            }
          });
        }

        // Search in plan steps
        if (Array.isArray(parsed.plan?.steps)) {
          parsed.plan.steps.forEach((step: PlanStep, index: number) => {
            const verb = step.verb ?? '';
            const noun = step.noun ?? '';
            const verbMatch = verb.toLowerCase().includes(query.toLowerCase());
            const nounMatch = noun.toLowerCase().includes(query.toLowerCase());

            if (verbMatch || nounMatch) {
              symbols.push({
                name: `${verb || 'unknown'}/${noun || 'unknown'} (Step ${index + 1})`,
                kind: 6, // Method
                location: {
                  uri,
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 50 } }
                }
              });
            }
          });
        }
      } catch {
        // Skip invalid JSON documents
      }
    });

    return symbols;
  } catch (error) {
    console.error('Workspace symbols error:', error);
    return symbols;
  }
}
