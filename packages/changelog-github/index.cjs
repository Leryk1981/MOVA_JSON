'use strict';

const WHITESPACE_RE = /\s+/g;
const PR_SUFFIX_RE = /\s*\(#(\d+)\)\s*$/;

function normaliseSummary(summary) {
  if (!summary) return '';
  return String(summary)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(WHITESPACE_RE, ' ')
    .trim();
}

function createFormatters(repo) {
  if (!repo || typeof repo !== 'string') {
    return {
      formatCommit(commit) {
        return commit ? commit.slice(0, 7) : '';
      },
      formatPull(prNumber) {
        return prNumber ? `#${prNumber}` : '';
      },
    };
  }

  const normalisedRepo = repo.replace(/^github:/i, '').replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  const baseUrl = `https://github.com/${normalisedRepo}`;

  return {
    formatCommit(commit) {
      if (!commit) return '';
      const hash = commit.slice(0, 7);
      return `[${hash}](${baseUrl}/commit/${commit})`;
    },
    formatPull(prNumber) {
      if (!prNumber) return '';
      return `[#${prNumber}](${baseUrl}/pull/${prNumber})`;
    },
  };
}

function extractPullRequest(summary) {
  const match = PR_SUFFIX_RE.exec(summary);
  if (!match) return { cleaned: summary, pr: null };
  const cleaned = summary.slice(0, match.index).trim();
  return { cleaned, pr: match[1] };
}

function buildMeta(parts) {
  const filtered = parts.filter(Boolean);
  return filtered.length ? ` (${filtered.join(', ')})` : '';
}

function formatDependency(dep) {
  const pieces = [dep.name];
  if (dep.newVersion) {
    pieces.push(`@${dep.newVersion}`);
  } else if (dep.version) {
    pieces.push(`@${dep.version}`);
  } else if (dep.versionRange) {
    pieces.push(`@${dep.versionRange}`);
  }

  if (dep.type && dep.type !== 'dependencies') {
    pieces.push(`(${dep.type})`);
  }

  return `  - ${pieces.join(' ')}`;
}

module.exports = function createGithubChangelog(options = {}) {
  const { repo } = options;
  const formatters = createFormatters(repo);

  return {
    async getReleaseLine(changeset) {
      const summary = normaliseSummary(changeset.summary);
      if (!summary) return '';
      const { cleaned, pr } = extractPullRequest(summary);
      const commitRef = formatters.formatCommit(changeset.commit);
      const prRef = formatters.formatPull(pr);
      const meta = buildMeta([prRef, commitRef]);
      return `- ${cleaned || summary}${meta}`;
    },
    async getDependencyReleaseLine(changesets, dependenciesUpdated) {
      if (!dependenciesUpdated || dependenciesUpdated.length === 0) {
        return '';
      }

      const firstWithSummary = changesets.find((changeset) => changeset && changeset.summary);
      const summary = firstWithSummary ? normaliseSummary(firstWithSummary.summary) : '';
      const { pr } = summary ? extractPullRequest(summary) : { pr: null };
      const commitRef = formatters.formatCommit((firstWithSummary && firstWithSummary.commit) || null);
      const prRef = formatters.formatPull(pr);
      const meta = buildMeta([prRef, commitRef]);

      const header = `- Updated dependencies${meta}`;
      const lines = dependenciesUpdated.map(formatDependency);
      return [header, ...lines].join('\n');
    },
  };
};
