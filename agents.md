# AI Agent Playbook

## Solution Summary

This project modernizes the Week 2 FastAPI + Ollama RAG assistant into a cloud-native stack with:
- **Next.js 16 App Router** UI and server actions for streaming chat.
- **Upstash Vector** auto-embedding storage populated by `scripts/upsert-data.ts` from a 35-entry culinary dataset in `data/food_data.json`.
- **Groq LLaMA 3.1 8B Instant** completions invoked through hardened retries.
- End-to-end regression coverage via `scripts/test-queries.ts`, capturing JSON/markdown logs under `docs/test-results/`.
- Documentation suite (README, MIGRATION_PLAN, ARCHITECTURE, PERFORMANCE_COMPARISON, TESTING_RESULTS, GIT_WORKFLOW) plus the preserved Week 2 reference implementation inside `local-version/`.

## Architecture at a Glance

```
User ➜ Next.js UI (app/page.tsx)
     ➜ Server action `ragQuery` (app/actions.ts)
         ➜ Upstash Vector `/query-data` (auto-embeds question)
         ➜ Groq Chat Completions (llama-3.1-8b-instant)
     ➜ Streams answer + cited sources back to UI
```

Supporting services:
- `scripts/upsert-data.ts`: pushes enriched food entries to Upstash.
- `scripts/test-queries.ts`: throttled regression harness with retry + persistence.
- `local-version/backend/*`: FastAPI + ChromaDB + Ollama snapshot for Week 2 comparisons.

## Instructions for Future AI Agents

1. **Environment & Secrets**
   - Read `.env.local` for `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, and `GROQ_API_KEY`.
   - Never commit `.env*` files; follow `.gitignore` rules.

2. **Common Commands**
   - Install deps: `pnpm install`
   - Upsert dataset: `pnpm upsert-data`
   - Run automated queries: `pnpm test-queries`
   - Launch dev server: `pnpm dev`
   - Local Week 2 stack: follow `local-version/README.md` and run `uvicorn backend.main:app --reload` after seeding.

3. **Testing Expectations**
   - When modifying RAG logic or dataset, re-run `pnpm test-queries`; store artifacts under `docs/test-results/` (they are git-ignored but reference the filenames in commits or PRs).
   - For legacy stack changes, run `python backend/seed_data.py` and hit `/query` with cURL or HTTPie.

4. **Coding Standards**
   - Keep retry logic centralized (`fetchWithRetry` in `app/actions.ts`, `runQueryWithRetry` in `scripts/test-queries.ts`).
   - Use concise Tailwind/shadcn patterns for UI updates; avoid inline styles unless necessary.
   - Maintain ASCII comments unless an existing file already uses Unicode.

5. **Git Workflow**
   - Feature work happens on `cloud-migration` (or a derivative) and merges into `main` via PR.
   - Tags: `v1.0-local` (Week 2 snapshot) and `v2.0-cloud` (Week 3 release) mark reference points—keep them intact.
   - Reference [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) when preparing future releases.

6. **Documentation Hygiene**
   - Update README + docs when behavior, commands, or architecture change.
   - Mention any new evidence (screenshots, test logs) in `docs/TESTING_RESULTS.md` or supplemental markdown files.

Following this playbook ensures new AI agents can extend the system without breaking the validated Week 3 deliverables or the legacy baseline.

## Instruction File Reference

| File | Purpose |
| --- | --- |
| [README.md](README.md) | Front-door guide covering migration story, setup commands, env vars, dataset overview, advanced query examples, tooling, and troubleshooting tips. |
| [MIGRATION_PLAN.md](MIGRATION_PLAN.md) | Detailed rationale for moving from FastAPI/Ollama to Next.js/Upstash/Groq, including architecture diagrams, risk analysis, and rollback procedures. |
| [WEEK3_COMPLETION_PLAN.md](WEEK3_COMPLETION_PLAN.md) | Day-by-day execution checklist that tracks data creation, testing, documentation, and git workflow milestones for the sprint. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layered system description showing UI/server/data/testing responsibilities, cloud resource roles, data lifecycle, and reliability features. |
| [docs/TESTING_RESULTS.md](docs/TESTING_RESULTS.md) | Snapshot of the automated 16-query harness with coverage matrix, latest run metrics (100% pass, 6.59 s avg), and artifact locations. |
| [docs/PERFORMANCE_COMPARISON.md](docs/PERFORMANCE_COMPARISON.md) | Quantitative local vs cloud comparison (latency, error rate, setup time, cost) plus methodology and next-step ideas. |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Branching, tagging, and PR checklist, including evidence expectations and reviewer tips for Week 3 submissions. |
| [local-version/README.md](local-version/README.md) | Instructions for running the preserved Week 2 FastAPI + Ollama + ChromaDB stack, covering prerequisites, seeding commands, env vars, and interoperability with the cloud build. |
