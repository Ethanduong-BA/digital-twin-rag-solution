# System Architecture

## High-Level Flow

```
User/Recruiter ➜ Interview Chat UI (app/page.tsx)
              ➜ Server action `interviewChat` (app/actions.ts)
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

Analytics (optional)
        │
        ▼
Dashboard (`/analytics`) and JSON API (`/api/analytics`)
        └─> Upstash Redis (if configured) with in-memory fallback
```

## Components

| Layer | Responsibilities | Key Files |
| --- | --- | --- |
| Interface | Chat client, source cards, dark/light theming | [app/page.tsx](../app/page.tsx), [components/chat-interface.tsx](../components/chat-interface.tsx) |
| Server Actions | Validate env vars, query Upstash, build prompts, call Groq with retry logic | [app/actions.ts](../app/actions.ts) |
| MCP Endpoint | Expose profile search tools to AI agents | [app/api/[transport]/route.ts](../app/api/[transport]/route.ts), [lib/profile-search.ts](../lib/profile-search.ts) |
| Interview Simulation | Generate questions, get answers, evaluate scores | [lib/interview-simulator.ts](../lib/interview-simulator.ts), [scripts/run-interview-simulation.ts](../scripts/run-interview-simulation.ts) |
| Data | Professional profile data + upload tooling | [data/profile.json](../data/profile.json), [scripts/upsert-profile.ts](../scripts/upsert-profile.ts) |
| Testing | Automated interview verification + reporting | [scripts/test-interview.ts](../scripts/test-interview.ts) |

## MCP Tools

| Tool | Purpose | Input |
| --- | --- | --- |
| `search_profile` | Semantic search across professional profile | `query`, `topK` |
| `get_profile_section` | Retrieve specific section (experience, skills, etc.) | `section` |
| `run_interview` | Run mock interview simulation for a job description | `job_description`, `num_questions` |

## Cloud Resources

| Service | Purpose | Notes |
| --- | --- | --- |
| Vercel | Hosts Next.js app; provides environment management | `pnpm dev` for local, `vercel --prod` for deploy |
| Upstash Vector | Storage + semantic search, using built-in `mixedbread-ai/mxbai-embed-large-v1` | Auto-embeds profile chunks and queries |
| Groq Cloud | LLM inference | LLaMA 3.1 8B for speed, 3.3 70B for quality |
| Upstash Redis (optional) | Analytics persistence for `/analytics` | Falls back to in-memory if unreachable |

## Data Lifecycle

1. Edit [data/profile.json](../data/profile.json) with professional profile (experience, skills, projects, interview Q&A).
2. Run `pnpm upsert-profile` to chunk and embed profile into Upstash Vector.
3. When a user asks an interview question, the server action queries Upstash for relevant profile context.
4. Retrieved profile data is stitched into a first-person persona prompt before calling Groq.
5. UI renders the Digital Twin's answer with supporting profile sources.

## Interview Simulation Flow

1. Job descriptions are stored in `/jobs` folder (5+ real JDs).
2. Run `pnpm run-simulation` to start batch simulation.
3. LLM generates questions across 5 categories: HR/Behavioral, Technical, Team/Culture, Experience, Academic.
4. Digital Twin answers each question using RAG from profile data.
5. LLM evaluates answers against job requirements (1-10 score + feedback).
6. Results output to `/interview` with individual files and SUMMARY.md.

## Reliability Features

- **Credential enforcement:** Throws fast if any required env var is missing.
- **Exponential backoff:** Shared `fetchWithRetry` helper retries Upstash + Groq on transient errors.
- **Empty result handling:** Graceful fallback when no profile matches the query.
- **CLI testing:** `pnpm test-interview` validates interview responses before deployment.
- **Analytics hardening:** If Redis unreachable, analytics uses in-memory fallback.

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `/jobs` | Real job descriptions in markdown format (5+ required) |
| `/interview` | Interview simulation results with scores and recommendations |
| `/lib` | Core modules (profile-search, interview-simulator, analytics) |
| `/data` | Profile data (profile.json) |
| `/scripts` | CLI utilities (upsert, test, simulate) |
