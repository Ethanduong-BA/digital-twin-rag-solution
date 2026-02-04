import { z } from "zod";

// ---------- Retry logic (shared pattern) ----------

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

// ---------- Profile Vector Result Interface ----------

export interface ProfileVectorResult {
  id: string;
  score: number;
  data?: string;
  metadata?: {
    type?: string;
    section?: string;
    category?: string;
    owner?: string;
    company?: string;
    role?: string;
    project_name?: string;
    question?: string;
    [key: string]: any;
  };
}

// ---------- Section types for direct retrieval ----------

export const PROFILE_SECTIONS = [
  "summary",
  "experience",
  "skills",
  "education",
  "certifications",
  "projects",
  "preferences",
  "contact",
  "interview_qa",
] as const;

export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

// ---------- Zod schemas for MCP tools ----------

export const searchProfileSchema = z.object({
  query: z.string().min(1).describe("Natural language search query about the professional profile"),
  topK: z.number().int().min(1).max(10).default(5).describe("Number of results to return (1-10)"),
});

export const getProfileSectionSchema = z.object({
  section: z.enum(PROFILE_SECTIONS).describe("The profile section to retrieve"),
});

export type SearchProfileInput = z.infer<typeof searchProfileSchema>;
export type GetProfileSectionInput = z.infer<typeof getProfileSectionSchema>;

// ---------- Search function (semantic vector search) ----------

export async function searchProfile(input: SearchProfileInput): Promise<ProfileVectorResult[]> {
  const { query, topK } = searchProfileSchema.parse(input);

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
          includeData: true,
          includeVectors: false,
        }),
      }),
    { label: "Upstash Vector (Profile)", retries: 3, initialDelayMs: 400 }
  );

  if (!response.ok) {
    throw new Error(`Profile vector search failed: ${response.status}`);
  }

  const json = await response.json();
  return (json.result ?? []).map((item: any) => ({
    id: item.id,
    score: item.score,
    data: item.data,
    metadata: item.metadata,
  }));
}

// ---------- Get specific section by metadata filter ----------

export async function getProfileSection(input: GetProfileSectionInput): Promise<ProfileVectorResult[]> {
  const { section } = getProfileSectionSchema.parse(input);

  // Map section names to metadata type values used in upsert-profile.ts
  const sectionTypeMap: Record<ProfileSection, string[]> = {
    summary: ["summary"],
    experience: ["experience"],
    skills: ["skill"],
    education: ["education"],
    certifications: ["certification"],
    projects: ["project"],
    preferences: ["preferences"],
    contact: ["contact"],
    interview_qa: ["interview_qa"],
  };

  const types = sectionTypeMap[section];

  // For now, use semantic search with section name as query
  // A more advanced approach would use Upstash's metadata filtering
  const query = section === "interview_qa"
    ? "interview questions and answers"
    : section === "summary"
    ? "professional summary elevator pitch"
    : section;

  const results = await searchProfile({ query, topK: 10 });

  // Filter results by metadata type
  return results.filter((r) => types.includes(r.metadata?.type ?? ""));
}

// ---------- Format results for LLM context ----------

export function formatProfileResultsAsContext(results: ProfileVectorResult[]): string {
  if (results.length === 0) {
    return "No relevant profile information found.";
  }

  return results
    .map((r, i) => {
      const type = r.metadata?.type ?? "unknown";
      return `[${type.toUpperCase()}] ${r.data}`;
    })
    .join("\n\n---\n\n");
}

// ---------- MCP Tool Definitions ----------

export const searchProfileTool = {
  name: "search_profile",
  description:
    "Search the professional profile using natural language. Returns relevant experiences, skills, projects, and interview responses. Use this to find specific information about the candidate's background.",
  schema: {
    query: searchProfileSchema.shape.query,
    topK: searchProfileSchema.shape.topK,
  },
} as const;

export const getProfileSectionTool = {
  name: "get_profile_section",
  description:
    "Retrieve a specific section of the professional profile. Useful when you need all information about a particular area like experience, skills, or education.",
  schema: {
    section: getProfileSectionSchema.shape.section,
  },
} as const;
