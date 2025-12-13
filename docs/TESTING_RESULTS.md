# Automated Query Testing

This project includes a repeatable RAG testing harness that exercises the cloud pipeline (Upstash Vector + Groq API) with a diverse set of prompts.

## Coverage Matrix

| Category | Queries | Example Prompts |
| --- | --- | --- |
| Semantic similarity | 5 | "healthy Mediterranean options with grains and herbs" |
| Multi-criteria filtering | 3 | "spicy vegetarian Asian dishes ready in under an hour" |
| Nutritional goals | 3 | "anti-inflammatory vegan dishes that use turmeric or ginger" |
| Cultural exploration | 2 | "traditional comfort foods from Ethiopia or East Africa" |
| Cooking methods | 3 | "recipes relying on cast-iron cooking or skillets" |

## Latest Automated Run

- Timestamp: **2025-12-12T07:02:49Z**
- Total queries: **16**
- Pass rate: **16 / 16 (100%)**
- Average latency: **6.59s** (includes retry-aware calls when Groq rate limits)
- Detailed artifacts:
  - JSON payload: [docs/test-results/run-2025-12-12T07-02-49-472Z.json](docs/test-results/run-2025-12-12T07-02-49-472Z.json)
  - Markdown summary: [docs/test-results/run-2025-12-12T07-02-49-472Z.md](docs/test-results/run-2025-12-12T07-02-49-472Z.md)

## How to Run Locally

```bash
pnpm test-queries
```

The script loads `.env.local`, throttles requests to respect Groq's TPM limits, retries up to three times per prompt, and writes structured outputs under `docs/test-results/` for easy comparison over time.
