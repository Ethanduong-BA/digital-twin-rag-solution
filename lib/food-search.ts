import { z } from "zod";

// ---------- Retry logic (reused from app/actions.ts) ----------

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RetryOptions {
  label: string;
  retries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

async function fetchWithRetry(
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

// ---------- Vector result interface ----------

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

// ---------- Tool definition ----------

export const searchFoodTool = {
  name: "search_food",
  description:
    "Search the food knowledge base using natural language. Returns matching dishes with scores and metadata.",
  schema: { query: searchSchema.shape.query, topK: searchSchema.shape.topK },
} as const;
