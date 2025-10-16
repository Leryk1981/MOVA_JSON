export interface DocumentSymbol {
  name: string;
  kind: number;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  selectionRange: { start: { line: number; character: number }; end: { line: number; character: number } };
  children?: DocumentSymbol[];
}

/**
 * Extract document symbols (outline) from envelope
 */
export function getDocumentSymbols(text: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  try {
    const parsed = JSON.parse(text);
    const lines = text.split('\n');

    // Root level
    const rootSymbol: DocumentSymbol = {
      name: 'Envelope',
      kind: 17, // Object
      range: {
        start: { line: 0, character: 0 },
        end: { line: lines.length - 1, character: lines[lines.length - 1].length }
      },
      selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 8 } },
      children: []
    };

    // Metadata
    if (parsed.metadata) {
      rootSymbol.children?.push({
        name: 'metadata',
        kind: 17, // Object
        range: findLineRange(text, 'metadata'),
        selectionRange: findLineRange(text, 'metadata')
      });
    }

    // Plan
    if (parsed.plan) {
      const planSymbol: DocumentSymbol = {
        name: 'plan',
        kind: 17, // Object
        range: findLineRange(text, 'plan'),
        selectionRange: findLineRange(text, 'plan'),
        children: []
      };

      // Steps
      if (Array.isArray(parsed.plan.steps)) {
        parsed.plan.steps.forEach((step: any, index: number) => {
          planSymbol.children?.push({
            name: `Step ${index + 1}: ${step.verb || 'unknown'}`,
            kind: 6, // Method
            range: findLineRange(text, `"verb": "${step.verb}"`),
            selectionRange: findLineRange(text, `"verb": "${step.verb}"`)
          });
        });
      }

      rootSymbol.children?.push(planSymbol);
    }

    // Global Catalogs
    if (parsed.globalCatalogs) {
      const catalogsSymbol: DocumentSymbol = {
        name: 'globalCatalogs',
        kind: 17, // Object
        range: findLineRange(text, 'globalCatalogs'),
        selectionRange: findLineRange(text, 'globalCatalogs'),
        children: []
      };

      rootSymbol.children?.push(catalogsSymbol);
    }

    symbols.push(rootSymbol);
    return symbols;
  } catch (error) {
    console.error('Document symbols error:', error);
    return symbols;
  }
}

function findLineRange(
  text: string,
  searchStr: string
): { start: { line: number; character: number }; end: { line: number; character: number } } {
  const lines = text.split('\n');
  let line = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) {
      line = i;
      break;
    }
  }

  return {
    start: { line, character: 0 },
    end: { line, character: lines[line]?.length || 0 }
  };
}
