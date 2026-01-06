# Automated Query Testing

This project includes a repeatable RAG testing harness that exercises the cloud pipeline (Upstash Vector + Groq API) with a diverse set of prompts.

The primary regression script targets the single-turn server action used for automated evaluation. The product UI also supports multi-turn chat, model selection, and an analytics dashboard.

## Coverage Matrix

| Category | Queries | Example Prompts |
| --- | --- | --- |
| Semantic similarity | 5 | "healthy Mediterranean options with grains and herbs" |
| Multi-criteria filtering | 3 | "spicy vegetarian Asian dishes ready in under an hour" |
| Nutritional goals | 3 | "anti-inflammatory vegan dishes that use turmeric or ginger" |
| Cultural exploration | 2 | "traditional comfort foods from Ethiopia or East Africa" |
| Cooking methods | 3 | "recipes relying on cast-iron cooking or skillets" |

## Latest Automated Run

- Timestamp: **2026-01-06T12:01:11Z**
- Total queries: **16**
- Pass rate: **16 / 16 (100%)**
- Average latency: **6.37s** (includes retry-aware calls when Groq rate limits)
- Detailed artifacts:
  - JSON payload: [docs/test-results/run-2026-01-06T12-01-11-616Z.json](docs/test-results/run-2026-01-06T12-01-11-616Z.json)
  - Markdown summary: [docs/test-results/run-2026-01-06T12-01-11-616Z.md](docs/test-results/run-2026-01-06T12-01-11-616Z.md)

## How to Run Locally

```bash
pnpm test-queries
```

The script loads `.env.local`, throttles requests to respect Groq's TPM limits, retries up to three times per prompt, and writes structured outputs under `docs/test-results/` for easy comparison over time.

## What This Covers

- Retrieval correctness and citation behavior (Upstash Vector sources)
- LLM answer quality under diverse prompts (Groq)
- Retry/backoff handling for transient errors and rate limits

## What This Does Not Cover

- UI interactions (suggestion chips, copy/share actions)
- Analytics dashboard behavior (see `/analytics` and `/api/analytics`)

## Manual Checks (Week 4)

- Multi-turn chat: ask 2-3 follow-up questions and confirm the assistant uses prior context.
- Model selection: switch models in the UI and confirm responses still stream.
- Sources UX: expand/collapse sources per assistant message.
- Analytics: open `/analytics` after a few chats and confirm totals/latency update (Redis persistence is optional).
