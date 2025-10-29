# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js app router, UI components, and API routes surfaced to the browser.
- `lib/supabase/` wraps Supabase clients and helpers; update these when schemas change.
- `scripts/` contains TS automation run with `tsx` for generation, evaluation, and health checks.
- `supabase/migrations/` tracks SQL migrations applied in Supabase; keep numbering chronological.
- `docs/` and `prompts/` store product context and prompt templates used by the AI pipelines.
- `CLAUDE.md` covers anthropic workflow nuances—review it before updating Claude integrations.

## Build, Test, and Development Commands
- `npm run dev` starts the local Next dev server on `http://localhost:3000`.
- `npm run build` performs a production Next build; use before deploying workflows.
- `npm run generate:connections` creates 20 daily concept links across models.
- `npm run evaluate:connections` invokes AI critics on the latest batch.
- `npm run setup:database` prints SQL migrations to seed a fresh Supabase project.
- `npm run seed:concepts` populates the baseline concept catalog for experimentation.

## Coding Style & Naming Conventions
- TypeScript throughout; stick to ES module syntax and `tsx` components for UI.
- Two-space indentation and trailing commas mimic existing formatting—use your editor's ESLint integration.
- Favor PascalCase for React components (`ConceptList`) and camelCase for utilities (`fetchPairs`).
- Keep Tailwind classes co-located with components; centralize shared constants in `lib/`.

## Testing Guidelines
- Validations live in `scripts/test-*.ts`; mirror that naming when adding scenario checks.
- Run `npm run test:concept-pairs` before altering pairing logic and `npm run test:prompts` for prompt updates.
- For new Supabase queries, add a minimal smoke script under `scripts/` and document expected output.
- Track manual checks in pull requests until an automated harness is introduced.

## Commit & Pull Request Guidelines
- Follow conventional subject prefixes seen in history (`docs:`, `feat:`, `fix:`) with concise present-tense summaries.
- Keep commits focused: schema change + migration, UI tweak, or script update should ship separately.
- Pull requests need a problem statement, testing notes, and screenshots/GIFs for UI changes.
- Reference Supabase migration IDs or script outputs when reviewers must replay steps.

## Security & Configuration Tips
- Store runtime secrets in `.env.local` locally and GitHub Actions secrets (`SUPABASE_URL`, `OPENAI_API_KEY`, etc.) for automation.
- Never commit generated connection data with API responses; use Supabase for persistence.
- Rotate API keys and service roles if a build log or PR comment mistakenly exposes them.
- Document any workflow change that touches external CLIs (Claude Code or Codex) in `docs/`.
