# MCP Server Design: Upstash Vector Search

This document outlines a detailed design for creating a Model Context Protocol (MCP) server that exposes semantic search over the Food RAG Upstash Vector database to AI assistants like Claude Desktop.

---

## What is MCP and How Does It Work?

### Simple Explanation

**Model Context Protocol (MCP)** is a standard that lets AI assistants (like Claude) call external tools and services. Think of it as giving Claude "superpowers" — instead of just answering questions from its training data, it can now **search your actual database** in real-time.

### How Our Food Search Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOU ASK CLAUDE                                  │
│                   "Find me spicy Thai food"                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLAUDE RECOGNIZES                                  │
│        "I have a search_food tool! Let me use it."                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     MCP TOOL INVOCATION                                 │
│   Claude sends: { query: "spicy Thai food", topK: 5 }                   │
│   via npx mcp-remote → Your Next.js API                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    YOUR API ENDPOINT                                    │
│   /api/mcp receives the request                                         │
│   mcp-handler parses it and calls searchFood()                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    UPSTASH VECTOR SEARCH                                │
│   • Auto-embeds "spicy Thai food" into a vector                         │
│   • Finds the 5 most similar food entries                               │
│   • Returns matches with scores, metadata, descriptions                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FORMATTED RESPONSE                                   │
│   Results returned to Claude with:                                      │
│   • Dish name, cuisine, spice level                                     │
│   • Ingredients and preparation time                                    │
│   • Full description                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLAUDE RESPONDS                                      │
│   "Here are 5 spicy Thai dishes: Bangkok Street Pad Thai..."            │
│   (Uses real data from YOUR database, not training data)                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Components Explained

| Component | What It Does | File Location |
|-----------|--------------|---------------|
| **mcp-handler** | Library that handles MCP protocol communication | npm package |
| **mcp-remote** | Bridge that connects Claude Desktop to your HTTP API | npm package |
| **food-search.ts** | Core search logic: validates input, queries Upstash, formats results | `lib/food-search.ts` |
| **route.ts** | API endpoint that registers the `search_food` tool | `app/api/[transport]/route.ts` |
| **Upstash Vector** | Cloud vector database with auto-embedding | External service |

### Why This Matters

1. **Real-time data**: Claude searches your actual 35-dish database, not outdated training data
2. **Semantic search**: "healthy breakfast" finds oatmeal even if the word "healthy" isn't in the description
3. **Extensible**: Add more tools (filter by diet, get details, etc.) using the same pattern
4. **Works anywhere**: Same API serves Claude Desktop, web UI, and any MCP-compatible client

---

## Implementation Status ✅

| Step | Task | Status |
| --- | --- | --- |
| 1 | Install `mcp-handler` and `zod` | ✅ Done |
| 2 | Create `lib/food-search.ts` with shared logic | ✅ Done |
| 3 | Create `app/api/[transport]/route.ts` MCP endpoint | ✅ Done |
| 4 | Test with Claude Desktop | ✅ Working |

---

## Reference Implementation Analysis

Studied: [gocallum/rolldice-mcpserver](https://github.com/gocallum/rolldice-mcpserver)

### Key Patterns Observed

| Component | Role |
| --- | --- |
| `lib/dice.ts` | Shared business logic + Zod schema + tool definition |
| `app/api/[transport]/route.ts` | MCP endpoint using `mcp-handler`; registers tools via `server.tool()` |
| `app/actions/mcp-actions.ts` | Server actions reusing same core logic for web testing |
| `lib/url-resolver.ts` | Resolves local vs cloud URLs for config generation |
| Web UI | Setup guide, live tester, Claude Desktop config snippets |

### Architecture Flow

```
Claude Desktop ─► npx mcp-remote ─► /api/[transport] ─► MCP Handler ─► Shared Logic
Web UI ────────────────────────────► Server Actions ─► Shared Logic
```

---

## Existing Code to Reuse

The project already has battle-tested patterns in [app/actions.ts](../app/actions.ts):

### Interfaces

```ts
// Already defined in app/actions.ts
export interface VectorResult {
  id: string
  score: number
  data?: string
  metadata?: {
    region?: string
    type?: string
    [key: string]: any
  }
}

export interface RAGResponse {
  sources: VectorResult[]
  answer: string
}
```

### Retry Logic

```ts
// Already defined in app/actions.ts
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])

interface RetryOptions {
  label: string
  retries?: number
  initialDelayMs?: number
  backoffFactor?: number
}

async function fetchWithRetry(
  requestFactory: () => Promise<Response>,
  options: RetryOptions
): Promise<Response> {
  // Exponential backoff with configurable retries
  // Handles transient 429, 5xx errors gracefully
}
```

### Upstash Query Pattern

```ts
// Already used in ragQuery()
const vectorResponse = await fetchWithRetry(
  () =>
    fetch(`${vectorUrl}/query-data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_VECTOR_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: question,
        topK: 5,
        includeMetadata: true,
        includeVectors: false,
      }),
    }),
  { label: "Upstash Vector", retries: 3, initialDelayMs: 400 },
)
```

---

## Proposed Food Vector Search MCP

### Goal

Expose a `search_food` tool that performs semantic queries against the Upstash Vector database and returns relevant food entries with metadata.

### Tool Specification

```ts
{
  name: "search_food",
  description: "Search the food knowledge base using natural language. Returns matching dishes with scores, metadata, and dietary tags.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural language search query" },
      topK: { type: "number", minimum: 1, maximum: 10, description: "Results to return (default 5)" }
    },
    required: ["query"]
  }
}
```

### Shared Logic Module

Create `lib/food-search.ts` by extracting and extending existing patterns:

```ts
import { z } from "zod";

// ---------- Reused from app/actions.ts ----------

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RetryOptions {
  label: string;
  retries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

export async function fetchWithRetry(
  requestFactory: () => Promise<Response>,
  options: RetryOptions
): Promise<Response> {
  const { label, retries = 3, initialDelayMs = 500, backoffFactor = 2 } = options;
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < retries) {
    attempt += 1;
    try {
      const response = await requestFactory();
      if (!response.ok && RETRYABLE_STATUS_CODES.has(response.status) && attempt < retries) {
        console.warn(`[${label}] transient ${response.status}, retry in ${delayMs}ms...`);
        await sleep(delayMs);
        delayMs *= backoffFactor;
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries) throw error;
      console.warn(`[${label}] network error, retry in ${delayMs}ms...`);
      await sleep(delayMs);
      delayMs *= backoffFactor;
    }
  }
  throw new Error(`${label} failed after ${retries} attempts.`);
}

// ---------- Existing interface from app/actions.ts ----------

export interface VectorResult {
  id: string;
  score: number;
  data?: string;
  metadata?: {
    name?: string;
    cuisine?: string;
    dietary_tags?: string[];
    [key: string]: any;
  };
}

// ---------- Zod schemas for MCP ----------

export const searchSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(10).default(5),
});

export type SearchInput = z.infer<typeof searchSchema>;

// ---------- Search function (vector only) ----------

export async function searchFood(input: SearchInput): Promise<VectorResult[]> {
  const { query, topK } = searchSchema.parse(input);

  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    throw new Error("Missing UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN");
  }

  const response = await fetchWithRetry(
    () =>
      fetch(`${process.env.UPSTASH_VECTOR_REST_URL}/query-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_VECTOR_REST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: query,
          topK,
          includeMetadata: true,
          includeVectors: false,
        }),
      }),
    { label: "Upstash Vector", retries: 3, initialDelayMs: 400 }
  );

  if (!response.ok) {
    throw new Error(`Vector search failed: ${response.status}`);
  }

  const json = await response.json();
  return (json.result ?? []).map((item: any) => ({
    id: item.id,
    score: item.score,
    data: item.data,
    metadata: item.metadata,
  }));
}

// ---------- Tool definitions ----------

export const searchFoodTool = {
  name: "search_food",
  description:
    "Search the food knowledge base using natural language. Returns matching dishes with scores and metadata.",
  schema: { query: searchSchema.shape.query, topK: searchSchema.shape.topK },
} as const;
```

### MCP Handler Endpoint

Create `app/api/[transport]/route.ts`:

```ts
import { createMcpHandler } from "mcp-handler";
import { searchFood, searchFoodTool } from "@/lib/food-search";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      searchFoodTool.name,
      searchFoodTool.description,
      { query: searchFoodTool.schema.query, topK: searchFoodTool.schema.topK },
      async ({ query, topK }) => {
        const results = await searchFood({ query, topK: topK ?? 5 });

        const text = results.length
          ? results
              .map((r, i) => {
                const name = r.metadata?.name ?? r.id;
                const cuisine = r.metadata?.cuisine ?? "";
                const tags = r.metadata?.dietary_tags?.join(", ") || "none";
                return `${i + 1}. **${name}** (${cuisine}) — score ${r.score.toFixed(2)}\n   Tags: ${tags}`;
              })
              .join("\n\n")
          : "No matching dishes found.";

        return { content: [{ type: "text", text }] };
      }
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
```

---

## Claude Desktop Configuration

### Local Development

```json
{
  "mcpServers": {
    "food-search": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
    }
  }
}
```

### Cloud (Vercel)

```json
{
  "mcpServers": {
    "food-search": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://v0-food-rag-web-app.vercel.app/api/mcp"]
    }
  }
}
```

Config file locations:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

---

## Implementation Checklist

| Step | Task | Status |
| --- | --- | --- |
| 1 | Install `mcp-handler` and `zod` | ✅ Done |
| 2 | Create `lib/food-search.ts` with shared logic | ✅ Done |
| 3 | Create `app/api/[transport]/route.ts` MCP endpoint | ✅ Done |
| 4 | Create `app/actions/mcp-actions.ts` for web testing | ⬜ Optional |
| 5 | Add MCP tester component to UI | ⬜ Optional |
| 6 | Update README with MCP setup instructions | ⬜ |
| 7 | Deploy to Vercel and verify Claude Desktop integration | ✅ Working locally |

---

## Dependencies

```bash
pnpm add mcp-handler zod
```

---

## Example Usage in Claude Desktop

After setup, users can ask Claude:

- "Search for healthy Mediterranean grain bowls"
- "Find spicy vegetarian Asian dishes"
- "What omega-3 rich dinners do you have?"

Claude will invoke the `search_food` tool, query Upstash, and return formatted results with dish names, cuisines, descriptions, and dietary tags.

---

## Security Considerations

- **Environment variables:** `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN` must be set on Vercel and locally in `.env.local`.
- **Rate limiting:** Upstash has built-in rate limits; consider adding retry logic similar to `app/actions.ts`.
- **Input validation:** Zod schemas sanitize all inputs before reaching the database.

---

## Future Enhancements

1. **Additional tools:**
   - `get_food_details` – retrieve full metadata for a specific food ID.
   - `filter_by_diet` – filter results by dietary tags (vegan, gluten-free, etc.).
2. **Streaming responses:** Use SSE transport for incremental result delivery.
3. **Caching:** Cache frequent queries via Vercel Edge Config or Upstash Redis.
4. **Analytics:** Log tool invocations to understand popular query patterns.

---

## References

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [mcp-handler npm](https://www.npmjs.com/package/mcp-handler)
- [mcp-remote npm](https://www.npmjs.com/package/mcp-remote)
- [gocallum/rolldice-mcpserver](https://github.com/gocallum/rolldice-mcpserver)
- [Upstash Vector REST API](https://upstash.com/docs/vector/api/endpoints)
