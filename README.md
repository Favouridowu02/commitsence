# commitsense

Generate professional, semantic git commit messages from your git diff using the OpenAI API.

Basic usage:

1. Install dependencies (for development):

```powershell
npm install
```

2. Set your OpenAI API key in the environment (optional, without it the CLI returns a safe placeholder):

```powershell
$env:OPENAI_API_KEY = "sk-..."
```

3. Run commitsense from a git repo root:

```powershell
npx commitsense --conventional --emoji
```

Flags:
- `--staged` : use staged changes (git diff --staged)
- `--conventional` : prefer Conventional Commit format
- `--emoji` : include an emoji prefix
- `--commit` : run `git commit -m "..."` with the suggestion
- `--dry-run` : skip commit suggestion prompts or side-effects
- `--model` : pass a model name to the OpenAI API
- `--max-tokens` : max tokens for the completion (default 100)
- `--temperature` : sampling temperature (default 0.2)

Publishing to npm

1. Create an account on https://www.npmjs.com and verify your email.
2. Update `package.json` with an author and repository fields and choose a unique package `name` if you plan to publish publicly.
3. From the package root, run:

# commitsense

Generate professional, semantic git commit messages from your git diff. By default commitsense uses the OpenAI API, but it can be adapted to work with other cloud or local LLM providers (Hugging Face, Replicate, local models, etc.).

This README covers quick usage, available flags, how to configure alternative (including free) providers, and tips for publishing to npm.

Quick start
-----------

1. Install dependencies (for development):

```powershell
cd "C:\Users\Favour Idowu\Desktop\Coding\commitsence"
npm install
```

2. (Optional) Set your OpenAI API key — without it the CLI returns a safe placeholder for testing:

```powershell
$env:OPENAI_API_KEY = "sk-..."
```

Or, to use OpenRouter (recommended for flexibility and free scaling options):

```powershell
$env:OPENROUTER_API_KEY = "sk-or-..."
# Optional attribution (shows your site/app name in OpenRouter rankings)
$env:OPENROUTER_SITE_URL = "https://yourdomain.com"
$env:OPENROUTER_SITE_NAME = "CommitSense"
```

3. Run commitsense from a git repo root:

```powershell
npx commitsense --conventional --emoji
```

Flags
-----

- `--staged` : use staged changes (runs `git diff --staged`).
- `--conventional` : prefer Conventional Commits format (e.g. `fix(auth): ...`).
- `--emoji` : include an emoji prefix that matches the commit type.
- `--commit` : run `git commit -m "..."` using the suggested message.
- `--dry-run` : skip any side effects and just print the suggestion.
- `--model` : pass a model name to the provider (provider-dependent).
- `--max-tokens` : maximum tokens for the LLM output (default 100).
- `--temperature` : sampling temperature (default 0.2).

Which provider to use
---------------------

commitsense ships with an OpenAI adapter by default. If you don't want to use OpenAI (or want a free option), you can integrate other providers:

- OpenAI (recommended for best-quality results) — requires `OPENAI_API_KEY`.
- OpenRouter (aggregator, works with many models) — set `OPENROUTER_API_KEY`. If a bare model name is used (e.g., `gpt-4o-mini`), the CLI will prefix `openai/` automatically when OpenRouter is active.
- Hugging Face Inference API — free tier available; set `HF_API_KEY`.
- Replicate — free credits sometimes available; set `REPLICATE_API_TOKEN`.
- Local models (llama.cpp, GPT4All, text-generation-webui) — fully offline and private, but require downloading model weights and running a local server.
- OpenRouter (aggregator) — use many vendor models through a single API. Set `OPENROUTER_API_KEY`.

Free / low-cost options (details)
---------------------------------

1) Hugging Face Inference API
- Pros: free tier, many community models.
- Cons: model quality varies; some models require more compute.
- Setup: create a token at https://huggingface.co/settings/tokens and set `HF_API_KEY`.

Example call (PowerShell + curl):

```powershell
$env:HF_API_KEY = "hf_..."
curl -X POST "https://api-inference.huggingface.co/models/gpt2" -H "Authorization: Bearer $env:HF_API_KEY" -d "{\"inputs\": \"Summarize: Hello world\"}"
```

2) Replicate
- Pros: many hosted models, easy REST API.
- Cons: many cloud models cost credits.
- Setup: create a token at https://replicate.com and set `REPLICATE_API_TOKEN`.

3) Local models (llama.cpp, GPT4All, text-generation-webui)
- Pros: private, no cloud costs once set up; fast on GPU.
- Cons: requires model downloads and local compute; setup varies by platform.

Example local flow
------------------

1. Install and run a local model server (for example `text-generation-webui` or a `llama.cpp`-backed HTTP wrapper).
2. Add a small provider adapter in `src/providers/` that calls your local HTTP endpoint and returns plain text.
3. Point `commitsense` at the local model by setting an env var (example: `LOCAL_TG_API`) and running `npx commitsense --model local`.

Switching providers in code (recommended approach)
-------------------------------------------------

1. Add adapter modules under `src/providers/`, e.g. `src/providers/huggingface.js` that export `generate({ prompt, model, maxTokens })` and return the generated string.
2. In `src/openai.js` (or create `src/provider.js`) detect provider environment variables (`HF_API_KEY`, `REPLICATE_API_TOKEN`, or `LOCAL_TG_API`) and call the appropriate adapter.
3. Keep `src/index.js` unchanged — it calls the single `suggestCommit(...)` API and receives a string back.

Adapter sketch (Hugging Face example)
------------------------------------

Create `src/providers/huggingface.js`:

```js
const fetch = require('node-fetch');
async function generate({ prompt, model = 'gpt2', maxTokens = 100 }) {
	const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${process.env.HF_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: maxTokens } })
	});
	const data = await res.json();
	return data?.[0]?.generated_text || (data?.error ? String(data.error) : JSON.stringify(data));
}
module.exports = { generate };
```

Then update `src/openai.js` to call this adapter when `process.env.HF_API_KEY` is present.

Which free provider should you pick?
-----------------------------------
- If you want the easiest cloud-hosted free option: try Hugging Face Inference API.
- For more model variety: try Replicate.
- For privacy and full control: use a local model via `llama.cpp` / GPT4All and expose a local HTTP endpoint.

Publishing to npm
-----------------

1. Create an npm account (https://www.npmjs.com). Verify your email.
2. Update `package.json` with `author`, `repository`, and a unique `name` (if publishing public).
3. Login and publish:

```powershell
npm login
npm publish --access public
```

If you publish a scoped package (`@yourname/commitsense`) and want it public, pass `--access public`.

Security & cost considerations
------------------------------

- Keep API keys secret; use environment variables or your platform's secret store.
- Cloud LLM calls may cost money. Use small `--max-tokens` and a low `--temperature` for deterministic short messages.

FAQ & troubleshooting
---------------------

Q: I don't have an API key — can I still use commitsense?
A: Yes — you can configure a free provider (Hugging Face) or run a local model. Without any provider the CLI returns a safe placeholder message for testing.

Q: What environment variable is used for Hugging Face?
A: `HF_API_KEY`.

Q: How do I use OpenRouter?
A: Set `OPENROUTER_API_KEY`. Optionally set `OPENROUTER_SITE_URL` and `OPENROUTER_SITE_NAME` for attribution. You can pass models like `openai/gpt-4o-mini` (or just `gpt-4o-mini` and the code will prefix `openai/` automatically when using OpenRouter).

Q: Can commitsense work offline?
A: Yes if you run a local model and expose an HTTP endpoint and add a small provider adapter.

Contributing & next steps
-------------------------

- Want me to wire a Hugging Face adapter into `src/openai.js` so HF works out-of-the-box? I can implement that next.
- I can also add an interactive editor flow (open the suggested message in your `$EDITOR`) and tests + CI.

If you'd like me to implement a specific provider adapter (Hugging Face, Replicate, or a local HTTP adapter) or the interactive editor before committing, tell me which and I'll add it and run tests.

Security practices implemented
------------------------------

- Secrets management:
	- `.env` support via `dotenv`; `.env` and variants are ignored by git.
	- No secrets are hardcoded in source; environment variables are used for API keys.
- Provider safety:
	- OpenRouter/OpenAI requests use SDK with optional timeouts (AbortController).
	- Hugging Face adapter uses global `fetch` with a 25s timeout and validates inputs.
- CLI input validation:
	- Model names are sanitized to alphanumerics, dashes, slashes, and dots; length limited.
	- Numeric flags (`--max-tokens`, `--temperature`) are clamped to safe ranges.
- Command execution safety:
	- Uses `spawnSync('git', ['commit', '-m', message])` instead of shell interpolation to avoid injection.
- Data minimization:
	- Diff size is truncated to a max length to limit data sent to providers.
- Error handling:
	- Graceful fallbacks when not in a git repo or when no provider is configured; clear messages.
- Publishing hygiene:
	- `files` whitelist in package.json; includes LICENSE; minimal tarball verified with `npm pack`.


