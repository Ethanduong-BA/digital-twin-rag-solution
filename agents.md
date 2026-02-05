# AI Agent Playbook

## Solution Summary

This project implements a **Digital Twin** — a personal AI agent that represents Aniraj Khadgi in professional job interviews using RAG architecture and MCP integration:

- **Next.js 16 App Router** with interview chat UI and server actions
- **Upstash Vector** auto-embedding storage populated by `scripts/upsert-profile.ts` from professional profile data in `data/profile.json`
- **Groq LLaMA 3.1 8B Instant** completions with first-person persona prompting
- **MCP Tools** (`search_profile`, `get_profile_section`) for AI agent integration in VS Code and Claude Desktop
- End-to-end interview testing via `scripts/test-interview.ts`

## Architecture at a Glance

```
User/Recruiter ➜ Interview Chat UI (app/page.tsx)
              ➜ Server action `interviewChat` (app/actions-interview.ts)
                  ➜ Upstash Vector `/query-data` (profile search)
                  ➜ Groq Chat Completions (Digital Twin persona)
              ➜ First-person answer + profile sources

VS Code Copilot ─┐
Claude Desktop  ─┼─► MCP Endpoint (app/api/[transport]/route.ts)
                       ➜ search_profile / get_profile_section tools
```

Supporting services:
- `scripts/upsert-profile.ts`: chunks and embeds profile.json into Upstash Vector
- `scripts/test-interview.ts`: automated interview question testing harness
- `lib/profile-search.ts`: profile search with Zod schemas and formatting

## Instructions for Future AI Agents

1. **Environment & Secrets**
   - Read `.env.local` for `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, and `GROQ_API_KEY`
   - Never commit `.env*` files; follow `.gitignore` rules

2. **Common Commands**
   - Install deps: `pnpm install`
   - Upsert profile: `pnpm upsert-profile`
   - Run interview tests: `pnpm test-interview`
   - Launch dev server: `pnpm dev`

3. **Testing Expectations**
   - When modifying RAG logic or profile data, re-run `pnpm test-interview`
   - Store artifacts under `docs/test-results/` (git-ignored)
   - Reference test results in commits or PRs

4. **Coding Standards**
   - Keep retry logic centralized (`fetchWithRetry` patterns)
   - Use concise Tailwind/shadcn patterns for UI updates
   - Maintain first-person persona in interview responses
   - Never fabricate experiences not in profile.json

5. **MCP Integration**
   - Tools defined in `lib/profile-search.ts`, registered in `app/api/[transport]/route.ts`
   - Test with VS Code Copilot or Claude Desktop using SSE endpoint
   - See `.vscode/mcp.json` for local configuration

6. **Documentation Hygiene**
   - Update README + docs when behavior, commands, or architecture change
   - Keep `docs/DIGITAL_TWIN_PLAN.md` updated with implementation progress

## Instruction File Reference

| File | Purpose |
| --- | --- |
| [README.md](README.md) | Project overview, setup, MCP config, and example questions |
| [docs/DIGITAL_TWIN_PLAN.md](docs/DIGITAL_TWIN_PLAN.md) | 6-week implementation plan with weekly goals and task status |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and component descriptions |
| [docs/mcp.md](docs/mcp.md) | MCP integration details and tool specifications |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Branching, tagging, and PR guidelines |
