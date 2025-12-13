# System Architecture

## High-Level Flow

```
Browser (Next.js UI)
        │
        ▼
Server Actions (app/actions.ts)
        ├─> Upstash Vector `/query-data` (auto-embedding, metadata)
        ├─> Context builder (document + metadata stitching)
        └─> Groq Chat Completions (LLaMA 3.1 8B Instant)
                │
                ▼
         Answer + source cards streamed to UI
```

## Components

| Layer | Responsibilities | Key Files |
| --- | --- | --- |
| Interface | Chat client, source cards, dark/light theming | [app/page.tsx](../app/page.tsx), [components/chat-interface.tsx](../components/chat-interface.tsx) |
| Server Actions | Validate env vars, query Upstash, build prompts, call Groq with retry logic | [app/actions.ts](../app/actions.ts) |
| Data | Enhanced food dataset + upload tooling | [data/food_data.json](../data/food_data.json), [scripts/upsert-data.ts](../scripts/upsert-data.ts) |
| Testing | Automated RAG verification + reporting | [scripts/test-queries.ts](../scripts/test-queries.ts), [docs/TESTING_RESULTS.md](TESTING_RESULTS.md) |

## Cloud Resources

| Service | Purpose | Notes |
| --- | --- | --- |
| Vercel | Hosts Next.js app; provides environment management | `pnpm dev` for local, `vercel` for deploy |
| Upstash Vector | Storage + semantic search, using built-in `mixedbread-ai/mxbai-embed-large-v1` | Auto-embeds both documents and queries; `topK=5` |
| Groq Cloud | LLM inference (LLaMA 3.1 8B Instant) | High throughput, supports JSON schema-compatible responses |

## Data Lifecycle

1. Edit [data/food_data.json](../data/food_data.json) to add narratives, nutrition, cultural metadata.
2. Run `pnpm upsert-data` to send raw text + metadata to Upstash. Auto embeddings remove the need for external models.
3. When a user asks a question, `ragQuery()` sends the text directly to Upstash (`data` field). Upstash embeds + retrieves similar documents.
4. Retrieved metadata is stitched into a contextual prompt before calling Groq.
5. UI renders the final answer plus the supporting sources.

## Reliability Features

- **Credential enforcement:** `ragQuery` throws fast if any required env var is missing.
- **Exponential backoff:** Shared `fetchWithRetry` helper retries Upstash + Groq when network/transient errors occur.
- **Empty result handling:** Users receive a graceful fallback message when no documents match the query.
- **CLI testing:** `pnpm test-queries` throttles and retries to surface regressions before deployment.

## Future Enhancements

- Cache hot queries in Vercel Edge Config for sub-second repeats.
- Add `/local-version` FastAPI app for side-by-side demos.
- Extend metadata schema with nutritional macros for percentile comparisons.
- Introduce analytics (e.g., Vercel Web Analytics + custom logging) to monitor popular intents.
