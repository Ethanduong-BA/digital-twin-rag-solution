# Food RAG Cloud Migration

[![Vercel Deployment](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/anirajs-projects-27ad65b9/v0-food-rag-web-app)
[![Upstash Vector](https://img.shields.io/badge/Vector-Upstash-00C694?style=for-the-badge)](https://upstash.com/vector)
[![Groq Cloud](https://img.shields.io/badge/LLM-Groq%20Cloud-FF6F3C?style=for-the-badge)](https://console.groq.com/)

Production-ready Retrieval-Augmented Generation (RAG) assistant that migrated from a Week 2 local stack (Ollama + ChromaDB) to a Week 3 cloud stack (Upstash Vector + Groq API) with expanded food knowledge and rigorous testing.

Week 4 upgrades add a more product-like experience: multi-turn chat, selectable Groq models, improved sources UX, and a lightweight analytics dashboard.

## Cloud Migration Overview

```
         Week 2 (Local)                                 Week 3 (Cloud)
┌────────────────────────────┐               ┌───────────────────────────────┐
│    FastAPI / Streamlit UI  │               │      Next.js 16 App Router     │
│  + Ollama (LLM + embeds)   │               │  + Server Actions (ragQuery)   │
│  + ChromaDB (local files)  │               │                               │
└─────────────┬──────────────┘               └──────────────┬────────────────┘
              │                                             │
              ▼                                             ▼
      Local GPU / Storage                          Upstash Vector Database
                                                     (auto embeddings)
                                                     │
                                                     ▼
                                                Groq LLaMA 3.1 8B

                                     (optionally) Groq LLaMA 3.3 70B
```

Key design decisions, risks, and rollback plans are captured in [MIGRATION_PLAN.md](MIGRATION_PLAN.md).

## Repository Layout

| Path | Purpose |
| --- | --- |
| [app/](app) | Next.js App Router views and server actions (cloud version) |
| [data/food_data.json](data/food_data.json) | 35-item enriched knowledge base with cultural + nutritional metadata |
| [scripts/upsert-data.ts](scripts/upsert-data.ts) | CLI to push raw text + metadata to Upstash Vector (auto embeddings) |
| [scripts/test-queries.ts](scripts/test-queries.ts) | Automated RAG testing harness with 16 diverse prompts |
| [docs/](docs) | Testing summaries, future performance reports, and architecture notes |
| [local-version/](local-version) | Week 2 FastAPI + Ollama + ChromaDB snapshot with parity dataset |
| [MIGRATION_PLAN.md](MIGRATION_PLAN.md) | AI-assisted migration blueprint |
| [WEEK3_COMPLETION_PLAN.md](WEEK3_COMPLETION_PLAN.md) | Day-by-day execution plan |

> **Planned structure:** `/local-version` will store the Week 2 ChromaDB build, while `/cloud-version` (current root) houses the upgraded stack. Branch `cloud-migration` will track Week 3 work before merging to `main`.

## Setup Instructions

### 1. Cloud Version (Next.js + Upstash + Groq)

```bash
pnpm install

# Populate/refresh the vector database
pnpm upsert-data

# Run automated regression queries (optional but recommended)
pnpm test-queries

# Start the app locally
pnpm dev
```

Visit `http://localhost:3000` and ask cooking, nutrition, or cultural questions. Server actions stream responses via Groq while citing Upstash documents.

You can also view analytics at `http://localhost:3000/analytics`.

### 2. Local Reference Version (Week 2, upcoming `/local-version`)

1. Follow the dedicated instructions in [local-version/README.md](local-version/README.md).
2. Seed ChromaDB with `python backend/seed_data.py` and run `uvicorn backend.main:app --reload`.
3. Keep Ollama running with `nomic-embed-text` + `llama3` pulled locally.
4. Compare latency, relevance, and cost tradeoffs with the new cloud implementation.

## Environment Variables

Create `.env.local` (and provide the same keys to Vercel) with:

| Variable | Description |
| --- | --- |
| `UPSTASH_VECTOR_REST_URL` | REST endpoint for your Upstash Vector database |
| `UPSTASH_VECTOR_REST_TOKEN` | Bearer token for Upstash Vector |
| `GROQ_API_KEY` | Groq Cloud API key (LLaMA 3.1 8B Instant) |
| `UPSTASH_REDIS_REST_URL` | (Optional) Upstash Redis REST URL for analytics persistence |
| `UPSTASH_REDIS_REST_TOKEN` | (Optional) Upstash Redis REST token for analytics persistence |
| `ANALYTICS_DASHBOARD_TOKEN` | (Optional) Protects `/api/analytics` (header `x-analytics-token` or query `?token=`) |

> The CLI scripts load `.env.local` automatically via `dotenv`, so you can run upserts or tests outside the Next.js runtime.

## Local vs Cloud Comparison

| Dimension | Local (Week 2) | Cloud (Week 3) |
| --- | --- | --- |
| Embeddings | Ollama nomic-embed-text (manual) | Upstash mixedbread (auto) |
| Vector DB | ChromaDB on disk | Upstash Vector (managed) |
| LLM | Ollama llama3 (GPU reliant) | Groq Cloud LLaMA 3.1 8B (serverless) |
| Latency (avg) | ~7–10s (GPU availability) | 6.59s across 16 complex prompts |
| Deployment | Local scripts | Vercel + server actions |
| Cost | Hardware + electricity | Pay-as-you-go APIs with free tiers |
| Reliability | Single machine | Managed, auto-scaled, retry-enabled |

Performance data comes from the latest automated test run documented in [docs/TESTING_RESULTS.md](docs/TESTING_RESULTS.md).

## Enhanced Food Database

- 35 entries across world cuisines, health-focused bowls, and comfort classics
- Each record contains ≥75 word descriptions, cooking methods, nutrition callouts, dietary tags, allergens, spice level, cultural story, and prep time
- Stored in [data/food_data.json](data/food_data.json) and upserted as raw text so Upstash handles embeddings internally

Sample snippet:

```json
{
  "id": "food-010",
  "name": "Nordic Cedar-Planked Salmon Bowl",
  "cuisine": "Nordic",
  "ingredients": ["salmon", "barley", "fennel", "lingonberries"],
  "dietary_tags": ["pescatarian", "omega-rich"],
  "nutritional_benefits": "Omega-3 fats from salmon support cardiovascular health..."
}
```

## Advanced Query Examples

| Query | Expected Behavior | Example Source IDs |
| --- | --- | --- |
| "healthy Mediterranean options with grains and herbs" | Returns herb-heavy lentil tabbouleh and couscous salads with nutrient analysis | `food-011`, `food-027` |
| "spicy vegetarian Asian dishes ready in under an hour" | Prioritizes masala dosa and bibimbap lite emphasizing fermentation + heat | `food-007`, `food-012` |
| "omega-3 rich dinners with whole grains" | Highlights cedar-planked salmon and cha ca fish bowls with grain pairings | `food-010`, `food-029` |
| "dishes that can be grilled tableside" | Surfaces cha ca, huli huli chicken, and jerk bowls with cultural notes | `food-029`, `food-021`, `food-025` |

See full transcripts and latency numbers inside [docs/test-results/run-2025-12-12T07-02-49-472Z.md](docs/test-results/run-2025-12-12T07-02-49-472Z.md).

> Note: `docs/test-results/` artifacts are generated by `pnpm test-queries` and are git-ignored. For submission/review, reference the latest run from [docs/TESTING_RESULTS.md](docs/TESTING_RESULTS.md) and attach the artifacts separately if required.

## Tooling & Scripts

- **Vector upload:** `pnpm upsert-data` (reads [data/food_data.json](data/food_data.json), pushes to Upstash with metadata)
- **Regression testing:** `pnpm test-queries` (runs 16 prompts, retries rate-limited Groq calls, logs artifacts under [docs/test-results/](docs/test-results))
- **Chat interface:** See [app/page.tsx](app/page.tsx) and [components/chat-interface.tsx](components/chat-interface.tsx) for UI + streaming logic

## Week 4 Evidence (Submission)

- v0.dev workflow notes: [docs/V0_WORKFLOW.md](docs/V0_WORKFLOW.md)
- Automated test evidence: [docs/TESTING_RESULTS.md](docs/TESTING_RESULTS.md)
- Architecture notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Troubleshooting

- **429 errors from Groq:** The server action now retries with exponential backoff. If you still see failures, reduce concurrent queries or request a higher TPM quota.
- **No vectors returned:** Ensure `pnpm upsert-data` ran successfully and the Upstash credentials reference a *Vector* database (URL contains `vector`).
- **Environment variables missing:** The app will throw a descriptive error if `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, or `GROQ_API_KEY` are absent. Verify `.env.local` and Vercel dashboard.
- **Cross-origin warning in dev:** Next.js 16 may warn about `allowedDevOrigins`. Add your LAN IP to `next.config.mjs` if testing from other devices.
- **Dataset edits:** After modifying [data/food_data.json](data/food_data.json), rerun `pnpm upsert-data` to keep Upstash in sync.

## Additional Documentation

- [MIGRATION_PLAN.md](MIGRATION_PLAN.md) – architecture evolution, risk mitigation, rollback strategy
- [WEEK3_COMPLETION_PLAN.md](WEEK3_COMPLETION_PLAN.md) – execution plan with daily milestones
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – component breakdown and reliability notes
- [docs/TESTING_RESULTS.md](docs/TESTING_RESULTS.md) – testing methodology, coverage matrix, and latest performance snapshot
- [docs/PERFORMANCE_COMPARISON.md](docs/PERFORMANCE_COMPARISON.md) – quantitative latency and reliability improvements vs Week 2
- [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) – branching, tagging, and PR checklist for the migration deliverable
