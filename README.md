<div align="center">

# commitsent

Generate professional, semantic git commit messages from your git diff using LLMs.

</div>



Use without installing (recommended):

```powershell
npx commitsent
```

Or install globally:

```powershell
npm i -g commitsent
```

## Requirements

- Node.js >= 18
- Git installed and run from inside a git repository

## Quick start

Run in your repo with changes:

```powershell
npx commitsent --conventional --emoji --model gpt-4o-mini
```

For staged changes only:

```powershell
git add .
npx commitsent --staged --conventional --emoji
```

Commit automatically:

```powershell
npx commitsent --conventional --emoji --commit
```

## Options

- `--staged`  Use staged diff (`git diff --staged`).
- `--conventional`  Prefer Conventional Commits format (e.g., `fix(auth): ...`).
- `--emoji`  Prefix with an emoji matching the type.
- `--commit`  Run `git commit -m "..."` with the suggestion.
- `--dry-run`  Print the suggestion only (default behavior if not committing).
- `--model <name>`  Preferred model name (optional).
- `--max-tokens <n>`  Max output tokens (default 100, clamped [16..400]).
- `--temperature <n>`  Sampling temperature (default 0.2, clamped [0..1]).

<!-- Providers & env intentionally omitted to keep usage zero-config for end users. -->

## Examples

- Unstaged changes:
	```powershell
	npx commitsent
	```
- Staged only + Conventional + Emoji:
	```powershell
	npx commitsent --staged --conventional --emoji
	```
- Auto-commit with model:
	```powershell
	npx commitsent --commit --model gpt-4o-mini
	```

## Security

- No secrets are hardcoded in the package.
- Git commit uses safe spawn (no shell interpolation).
- Numeric flags are clamped; model names are sanitized.
- Network calls use timeouts and handle errors gracefully.
- Diff size is truncated to limit data sent to providers.

## License

MIT © Favour Idowu

## Contributing

PRs welcome. Please keep the CLI fast, dependency-light, and secure-by-default.
