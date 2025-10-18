// Using OpenAI official SDK v4
const OpenAI = require('openai');

// Provider autodetection (priority: OpenRouter -> OpenAI)
let provider = 'none';
let client = null;

if (process.env.OPENROUTER_API_KEY) {
  // Optional attribution headers for OpenRouter rankings
  const defaultHeaders = {};
  if (process.env.OPENROUTER_SITE_URL) defaultHeaders['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_SITE_NAME) defaultHeaders['X-Title'] = process.env.OPENROUTER_SITE_NAME;

  client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    // defaultHeaders is supported by the SDK for custom headers
    ...(Object.keys(defaultHeaders).length ? { defaultHeaders } : {})
  });
  provider = 'openrouter';
} else if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  provider = 'openai';
}

// Optional provider adapters
let hfAdapter = null;
try {
  hfAdapter = require('./providers/huggingface');
} catch (e) {
  hfAdapter = null;
}

function buildPrompt({ diff, conventional, emoji }) {
  const lines = [];
  lines.push('You are CommitSense, an assistant that generates professional, concise git commit messages from a git diff.');
  lines.push('Requirements:');
  lines.push('- Produce a single-line commit message.');
  lines.push('- Prefer Conventional Commits format if requested (type(scope): subject).');
  lines.push('- Keep it 50 characters or less if possible.');
  lines.push('- If emoji option is requested, include a single emoji at the start that matches the commit type.');
  lines.push('- Use imperative mood.');
  lines.push('Respond only with the commit message, do not include explanation.');
  lines.push('');
  if (conventional) lines.push('Use Conventional Commits.');
  if (emoji) lines.push('Include emoji.');
  lines.push('');
  lines.push('Diff:');
  lines.push('```');
  lines.push(diff);
  lines.push('```');

  return lines.join('\n');
}

async function suggestCommit({ diff, conventional = false, emoji = false, model = 'gpt-4o-mini', maxTokens = 100, temperature = 0.2 }) {
  const system = `You are CommitSense, an assistant that generates a single-line git commit message from a git diff.`;
  const user = buildPrompt({ diff, conventional, emoji });
  // If HF API key is present and adapter loaded, use it
  if (process.env.HF_API_KEY && hfAdapter) {
    const combined = `${system}\n\n${user}`;
    const out = await hfAdapter.generate({ prompt: combined, model, maxTokens });
    return (out || '').trim();
  }

  if (!client) {
    // If no provider is configured, return a deterministic placeholder for testing
    return `chore: update code (no provider configured)`;
  }

  // Map model for OpenRouter if needed (expects vendor prefix like 'openai/gpt-4o-mini')
  let finalModel = model || 'gpt-4o-mini';
  if (provider === 'openrouter' && !finalModel.includes('/')) {
    finalModel = `openai/${finalModel}`;
  }

  // Add request timeout via AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  let res;
  try {
    res = await client.chat.completions.create({
      model: finalModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: maxTokens,
      temperature
    }, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  const text = res?.choices?.[0]?.message?.content?.trim();
  return text || '';
}

module.exports = { suggestCommit };
