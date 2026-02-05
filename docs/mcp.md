# MCP Server Design: Digital Twin Profile Search

This document outlines the Model Context Protocol (MCP) server that exposes semantic search over Aniraj Khadgi's professional profile to AI assistants like Claude Desktop and VS Code Copilot.

---

## What is MCP and How Does It Work?

### Simple Explanation

**Model Context Protocol (MCP)** is a standard that lets AI assistants (like Claude) call external tools and services. Think of it as giving Claude "superpowers" — instead of just answering questions from its training data, it can now **search your actual profile** in real-time.

### How Our Profile Search Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOU ASK CLAUDE                                  │
│              "What is your experience with React?"                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLAUDE RECOGNIZES                                  │
│       "I have a search_profile tool! Let me use it."                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     MCP TOOL INVOCATION                                 │
│   Claude sends: { query: "React experience", topK: 5 }                  │
│   via SSE → Your Next.js API                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    YOUR API ENDPOINT                                    │
│   /api/sse receives the request                                         │
│   mcp-handler parses it and calls searchProfile()                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    UPSTASH VECTOR SEARCH                                │
│   • Auto-embeds "React experience" into a vector                        │
│   • Finds the most similar profile entries                              │
│   • Returns matches with scores, metadata, content                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FORMATTED RESPONSE                                   │
│   Results returned to Claude with:                                      │
│   • Experience details, skills, projects                                │
│   • Relevance scores                                                    │
│   • Section type (experience, skill, project, etc.)                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLAUDE RESPONDS                                      │
│   "Aniraj has worked with React in his role at LIS Nepal..."            │
│   (Uses real data from the profile, not training data)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | What It Does | File Location |
|-----------|--------------|---------------|
| **mcp-handler** | Library that handles MCP protocol communication | npm package |
| **profile-search.ts** | Core search logic: validates input, queries Upstash, formats results | `lib/profile-search.ts` |
| **route.ts** | API endpoint that registers profile tools | `app/api/[transport]/route.ts` |
| **Upstash Vector** | Cloud vector database with auto-embedding | External service |

### Why This Matters

1. **Real-time data**: Claude searches actual profile data, not outdated training data
2. **Semantic search**: "leadership skills" finds management experience even if "leadership" isn't mentioned
3. **Interview simulation**: AI can answer interview questions authentically
4. **Works anywhere**: Same API serves Claude Desktop, VS Code Copilot, and any MCP-compatible client

---

## Implementation Status ✅

| Step | Task | Status |
| --- | --- | --- |
| 1 | Install `mcp-handler` and `zod` | ✅ Done |
| 2 | Create `lib/profile-search.ts` with shared logic | ✅ Done |
| 3 | Create `app/api/[transport]/route.ts` MCP endpoint | ✅ Done |
| 4 | Test with VS Code Copilot | ✅ Working |

---

## Available MCP Tools

### 1. search_profile

Semantic search across the entire professional profile.

```ts
{
  name: "search_profile",
  description: "Search the professional profile using natural language. Returns relevant experiences, skills, projects, and interview responses.",
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

### 2. get_profile_section

Retrieve a specific section of the profile.

```ts
{
  name: "get_profile_section",
  description: "Retrieve a specific section of the professional profile",
  inputSchema: {
    type: "object",
    properties: {
      section: {
        type: "string",
        enum: ["summary", "experience", "skills", "education", "certifications", "projects", "preferences", "contact", "interview_qa"]
      }
    },
    required: ["section"]
  }
}
```

---

## Core Implementation

### Profile Search Module (`lib/profile-search.ts`)

```ts
import { z } from "zod";

// Retry logic for reliability
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface ProfileVectorResult {
  id: string;
  score: number;
  data?: string;
  metadata?: {
    type?: string;
    section?: string;
    company?: string;
    [key: string]: any;
  };
}

export const PROFILE_SECTIONS = [
  "summary", "experience", "skills", "education",
  "certifications", "projects", "preferences", "contact", "interview_qa"
] as const;

export const searchProfileSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(10).default(5),
});

export const getProfileSectionSchema = z.object({
  section: z.enum(PROFILE_SECTIONS),
});

export async function searchProfile(input: SearchProfileInput): Promise<ProfileVectorResult[]> {
  // Queries Upstash Vector with semantic search
  // Returns relevant profile chunks with scores
}

export async function getProfileSection(input: GetProfileSectionInput): Promise<ProfileVectorResult[]> {
  // Retrieves all entries for a specific profile section
}
```

### MCP Handler Endpoint (`app/api/[transport]/route.ts`)

```ts
import { createMcpHandler } from "mcp-handler";
import {
  searchProfile,
  getProfileSection,
  formatProfileResultsAsContext,
} from "@/lib/profile-search";

const handler = createMcpHandler(
  (server) => {
    // Search profile tool
    server.tool(
      "search_profile",
      "Search the professional profile using natural language",
      { query, topK },
      async ({ query, topK }) => {
        const results = await searchProfile({ query, topK: topK ?? 5 });
        // Format and return results
      }
    );

    // Get profile section tool
    server.tool(
      "get_profile_section",
      "Retrieve a specific section of the professional profile",
      { section },
      async ({ section }) => {
        const results = await getProfileSection({ section });
        // Format and return results
      }
    );
  },
  {},
  { basePath: "/api", maxDuration: 60 }
);

export { handler as GET, handler as POST };
```

---

## VS Code Configuration

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "digital-twin": {
      "type": "sse",
      "url": "http://localhost:3000/api/sse"
    }
  }
}
```

---

## Claude Desktop Configuration

### Local Development

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/sse"]
    }
  }
}
```

### Production

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-domain.vercel.app/api/sse"]
    }
  }
}
```

Config file locations:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

---

## Example Usage

After setup, you can ask Claude or Copilot:

- "What is Aniraj's experience with React and Next.js?"
- "Tell me about his education background"
- "What are his key achievements at LIS Nepal?"
- "Search for leadership experience"
- "Get his professional summary"

The AI will invoke the profile tools, query Upstash, and return formatted results grounded in actual profile data.

---

## Profile Data Structure

The profile is chunked into searchable segments:

```
data/profile.json
├── personalInfo → summary chunks
├── professionalSummary → summary chunks
├── skills → skill chunks (by category)
├── experience → experience chunks (by role)
├── education → education chunks
├── certifications → certification chunks
├── projects → project chunks
├── interview_qa → Q&A chunks
├── preferences → preferences chunk
└── contact → contact chunk
```

Each chunk is embedded into Upstash Vector with metadata for filtering and context.

---

## Security Considerations

- **Environment variables:** `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN` must be set
- **Rate limiting:** Upstash has built-in rate limits; retry logic handles transient failures
- **Input validation:** Zod schemas sanitize all inputs before reaching the database
- **Profile privacy:** `data/profile.json` is git-ignored to protect personal information

---

## Dependencies

```bash
pnpm add mcp-handler zod
```

---

## References

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [mcp-handler npm](https://www.npmjs.com/package/mcp-handler)
- [Upstash Vector REST API](https://upstash.com/docs/vector/api/endpoints)
