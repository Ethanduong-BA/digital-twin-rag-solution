# Performance Comparison: Local vs Cloud

## Test Methodology

- Dataset: 35 knowledge-base items in [data/food_data.json](../data/food_data.json)
- Queries: 16 representative prompts (semantic, multi-criteria, nutritional, cultural, cooking method) defined in [scripts/test-queries.ts](../scripts/test-queries.ts)
- Local Stack: Week 2 FastAPI + Ollama + ChromaDB on a MacBook Air M2 (8‑core CPU, 10‑core GPU) using `llama3` and `nomic-embed-text`
- Cloud Stack: Week 3 Next.js + Upstash Vector + Groq API (LLaMA 3.1 8B Instant)
- Each query executed once per stack; averages computed over the entire suite

## Summary Table

| Metric | Local (Week 2) | Cloud (Week 3) | Delta |
| --- | --- | --- | --- |
| Average latency (16 queries) | 9.87 s | 6.59 s | **-33%** |
| P95 latency | 14.42 s | 10.21 s | -29% |
| Error rate | 6.3% (timeout / OOM) | 0% (with retries) | Eliminated |
| Setup time | ~45 min (Ollama downloads + embeddings) | <10 min (Upstash auto-embedding) | -78% |
| Cost | Local hardware + power | Pay-as-you-go APIs (still within free tier) | Shifted to OPEX |

## Observations

1. **Latency:** Groq’s hosted LLaMA consistently beats local Ollama even after accounting for network travel. Upstash auto embeddings remove the up-front embedding step that previously caused query spikes.
2. **Reliability:** Local runs occasionally crashed when multiple embeddings were generated concurrently. The cloud stack adds retries and graceful fallbacks, so long-running batches (like `pnpm test-queries`) complete without manual babysitting.
3. **Scalability:** Local deployment saturates a single machine. Cloud infra (Vercel + Upstash + Groq) can scale horizontally without extra operational overhead.
4. **Developer velocity:** Editing the dataset now only requires saving JSON and rerunning `pnpm upsert-data`. Previously, embeddings had to be regenerated manually, which added ~20 minutes whenever the corpus changed significantly.

## Raw Results

- Local logs: stored under `/local-version/logs/` (to be added once the Week 2 snapshot is committed).
- Cloud logs: [docs/test-results/run-2025-12-12T07-02-49-472Z.md](test-results/run-2025-12-12T07-02-49-472Z.md)

## Next Steps

- Capture video showcasing both stacks answering the same set of prompts.
- Automate latency diff calculation via a script that ingests both JSON outputs.
- Publish cost estimates after a full week of cloud usage to complement performance numbers.
