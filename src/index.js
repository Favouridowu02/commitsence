#!/usr/bin/env node

require('dotenv').config();
const { execSync, spawnSync } = require('child_process');
const minimist = require('minimist');
const path = require('path');
const openaiClient = require('./openai');

const argv = minimist(process.argv.slice(2), {
  boolean: ['staged', 'conventional', 'emoji', 'commit', 'dry-run'],
  string: ['model'],
  alias: { s: 'staged', c: 'conventional', e: 'emoji' }
});

async function run() {
  try {
    const staged = argv.staged || false;

    // Ensure we're in a git repository
    let isGit = false;
    try {
      const out = execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      isGit = out && out.trim() === 'true';
    } catch (e) {
      isGit = false;
    }

    if (!isGit) {
      console.error('Not a git repository. Run commitsense from the root of a git repository.');
      process.exit(1);
    }

    let diff = '';
    try {
      if (staged) {
        diff = execSync('git diff --staged', { encoding: 'utf8' });
      }
    } catch (e) {
      // ignore and try unstaged
      diff = '';
    }

    if (!diff) {
      // fallback to unstaged diff
      diff = execSync('git diff', { encoding: 'utf8' });
    }

    if (!diff) {
      console.log('No changes found (staged or unstaged).');
      process.exit(0);
    }

    // truncate very large diffs
    const MAX = 60_000; // characters
    if (diff.length > MAX) {
      diff = diff.slice(0, MAX) + '\n\n...diff truncated...';
    }

    // Validate and clamp inputs
    const clamp = (num, min, max, dflt) => {
      const n = Number.isFinite(num) ? num : dflt;
      return Math.min(max, Math.max(min, n));
    };
    const sanitizeModel = (m) => {
      if (!m) return undefined;
      // allow alphanum, dashes, slashes, dots
      const ok = /^[A-Za-z0-9._\-\/]+$/.test(m);
      return ok ? m.slice(0, 100) : undefined;
    };

    const promptOpts = {
      diff,
      conventional: !!argv.conventional,
      emoji: !!argv.emoji,
      model: sanitizeModel(argv.model) || process.env.COMMITSENSE_MODEL || 'gpt-4o-mini',
      maxTokens: clamp(parseInt(argv['max-tokens'], 10), 16, 400, 100),
      temperature: clamp(parseFloat(argv.temperature), 0, 1, 0.2)
    };

    console.log('Generating commit message...');
    let suggestion = await openaiClient.suggestCommit(promptOpts);

    // Post-process suggestion: if conventional requested, try to coerce into conventional commit format
    function firstLine(s) { return (s || '').split('\n')[0].trim(); }
    suggestion = firstLine(suggestion);

    const emojiMap = {
      feat: '✨',
      fix: '🐛',
      perf: '⚡️',
      docs: '📝',
      style: '🎨',
      refactor: '♻️',
      test: '✅',
      chore: '🔧',
      ci: '👷',
      build: '📦'
    };

    if (argv.conventional) {
      // If message already looks conventional (type(...): msg), keep it. Otherwise try to add a sensible type.
      const conventionalRegex = /^[a-z]+(\([^)]+\))?:\s.+/;
      if (!conventionalRegex.test(suggestion)) {
        // naive heuristic: inspect keywords
        const lower = suggestion.toLowerCase();
        let type = 'chore';
        if (lower.startsWith('fix') || lower.includes('bug') || lower.includes('error')) type = 'fix';
        else if (lower.includes('add') || lower.includes('implement') || lower.includes('feature')) type = 'feat';
        else if (lower.includes('doc')) type = 'docs';
        else if (lower.includes('test')) type = 'test';

        suggestion = `${type}: ${suggestion}`;
      }
    }

    if (argv.emoji) {
      // add emoji if not already present
      const hasEmoji = /^\p{Emoji}/u.test(suggestion);
      if (!hasEmoji) {
        // extract type
        const m = suggestion.match(/^([a-z]+)(?:\([^)]+\))?:/);
        const type = (m && m[1]) || null;
        const emo = type && emojiMap[type] ? emojiMap[type] + ' ' : '';
        suggestion = emo + suggestion;
      }
    }

    console.log('\nSuggested commit message:\n');
    console.log(suggestion);

    if (argv.commit) {
      // run git commit safely without a shell to avoid injection
      const result = spawnSync('git', ['commit', '-m', suggestion], { stdio: 'inherit', shell: false });
      if (result.error) {
        throw result.error;
      }
    } else if (!argv['dry-run']) {
      console.log('\nRun with --commit to commit this message, or --dry-run to skip prompts.');
    }

  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

run();
