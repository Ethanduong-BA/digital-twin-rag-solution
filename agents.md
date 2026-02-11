# AI Agent Playbook

## Solution Summary

This project implements a **Digital Twin** — a personal AI agent that represents Aniraj Khadgi in professional job interviews using RAG architecture and MCP integration:

- **Next.js 16 App Router** with interview chat UI and server actions
- **Upstash Vector** auto-embedding storage populated by `scripts/upsert-profile.ts` from professional profile data in `data/profile.json`
- **Groq LLaMA 3.1 8B Instant** completions with first-person persona prompting
- **MCP Tools** (`search_profile`, `get_profile_section`, `run_interview`) for AI agent integration in VS Code and Claude Desktop
- **Interview Simulation Engine** (`scripts/run-interview-simulation.ts`) for automated interview testing against job descriptions
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
                       ➜ search_profile / get_profile_section / run_interview tools

Interview Simulation ─► scripts/run-interview-simulation.ts
                         ➜ Reads job descriptions from /jobs
                         ➜ Generates questions by category
                         ➜ Gets Digital Twin answers via RAG
                         ➜ Evaluates and scores responses
                         ➜ Outputs results to /interview
```

Supporting services:
- `scripts/upsert-profile.ts`: chunks and embeds profile.json into Upstash Vector
- `scripts/test-interview.ts`: automated interview question testing harness
- `scripts/run-interview-simulation.ts`: full interview simulation against job descriptions
- `lib/profile-search.ts`: profile search with Zod schemas and formatting
- `lib/interview-simulator.ts`: interview simulation engine for MCP tool

## Instructions for Future AI Agents

1. **Environment & Secrets**
   - Read `.env.local` for `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, and `GROQ_API_KEY`
   - Never commit `.env*` files; follow `.gitignore` rules

2. **Common Commands**
   - Install deps: `pnpm install`
   - Upsert profile: `pnpm upsert-profile`
   - Run interview tests: `pnpm test-interview`
   - Run full simulation: `pnpm run-simulation`
   - Launch dev server: `pnpm dev`

3. **MCP Connection (VS Code Copilot)**
   - Ensure `.vscode/mcp.json` exists with Digital Twin server config
   - Start dev server: `pnpm dev`
   - Use MCP tools in Copilot Chat:
     - `search_profile`: Semantic search across professional profile
     - `get_profile_section`: Retrieve specific sections (experience, skills, etc.)
     - `run_interview`: Run interview simulation for a job description

4. **MCP Connection (Claude Desktop)**
   - Add to Claude configuration:
     ```json
     {
       "mcpServers": {
         "digital-twin": {
           "type": "http",
           "url": "http://localhost:3000/api/mcp"
         }
       }
     }
     ```
   - Start dev server before using tools

5. **Interview Simulation**
   - Job descriptions stored in `/jobs` folder (5+ real JDs from seek/linkedin/indeed)
   - Run simulation: `pnpm run-simulation`
   - Results output to `/interview` folder with:
     - Individual result files per job (Q&A, scores, feedback)
     - SUMMARY.md with overall statistics and category analysis
     - Pass/fail status (threshold: 6.0/10)
   - Simulation covers 5 categories: HR/Behavioral, Technical, Team/Culture, Experience, Academic/Learning

6. **Testing Expectations**
   - When modifying RAG logic or profile data, re-run `pnpm test-interview`
   - After adding/modifying job descriptions, re-run `pnpm run-simulation`
   - Store artifacts under `docs/test-results/` (git-ignored)
   - Reference test results in commits or PRs

7. **Coding Standards**
   - Keep retry logic centralized (`fetchWithRetry` patterns)
   - Use concise Tailwind/shadcn patterns for UI updates
   - Maintain first-person persona in interview responses
   - Never fabricate experiences not in profile.json

8. **Documentation Hygiene**
   - Update README + docs when behavior, commands, or architecture change
   - Keep `docs/implementation-plan.md` updated with implementation progress

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `/jobs` | Real job descriptions in markdown format (5+ required) |
| `/interview` | Interview simulation results with scores and recommendations |
| `/lib` | Core modules (profile-search, interview-simulator, analytics) |
| `/data` | Profile data (profile.json) |
| `/scripts` | CLI utilities (upsert, test, simulate) |

## Instruction File Reference

| File | Purpose |
| --- | --- |
| [README.md](README.md) | Project overview, setup, MCP config, and example questions |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Implementation plan with weekly goals and task status |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and component descriptions |
| [docs/mcp.md](docs/mcp.md) | MCP integration details and tool specifications |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Branching, tagging, and PR guidelines |
| [docs/design.md](docs/design.md) | Design decisions and RAG approach |
