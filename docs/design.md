# Digital Twin Technical Design Document

> **AI-Generated**: This document was generated using Claude Opus 4.5 based on the Week 1 PRD and existing codebase. Reviewed and approved for implementation.

---

## 1. System Overview

### 1.1 Purpose
Build a **Digital Twin** — an AI agent that autonomously represents Aniraj Khadgi in professional job interviews. The system uses Retrieval-Augmented Generation (RAG) to ground AI responses in factual professional data.

### 1.2 Core Capabilities
- **Semantic Profile Search**: Vector-based search across professional experiences, skills, and qualifications
- **Interview Simulation**: First-person AI responses as if the candidate is speaking
- **MCP Integration**: Model Context Protocol tools for AI agent integration in VS Code/Claude Desktop
- **Real-time Analytics**: Track interview queries, response times, and source usage

---

## 2. Architecture

### 2.1 High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Interview Chat UI (React)    │    MCP Clients (VS Code/Claude)         │
│  └── components/interview-chat.tsx    └── SSE Endpoint                  │
└────────────────┬────────────────────────────────┬────────────────────────┘
                 │                                │
                 ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Interview RAG Action          │    MCP Route Handler                    │
│  └── app/actions-interview.ts  │    └── app/api/[transport]/route.ts    │
│      • Query normalization     │        • search_profile tool            │
│      • Context building        │        • get_profile_section tool       │
│      • Response generation     │                                         │
└────────────────┬───────────────┴────────────────┬────────────────────────┘
                 │                                │
                 ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA & SERVICES LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Upstash Vector DB          │  Groq LLM API      │  Upstash Redis        │
│  └── Profile embeddings     │  └── LLaMA 3.1 8B  │  └── Analytics store  │
│      (auto-embedding)       │      LLaMA 3.3 70B │                       │
└─────────────────────────────┴────────────────────┴───────────────────────┘
```

### 2.2 Component Responsibilities

| Component | File | Responsibility |
|-----------|------|----------------|
| Interview Chat UI | `components/interview-chat.tsx` | React component for interview conversation interface |
| Interview Server Action | `app/actions-interview.ts` | RAG orchestration: vector search → context building → LLM generation |
| Profile Search Module | `lib/profile-search.ts` | Upstash Vector queries with Zod validation |
| Analytics Module | `lib/analytics.ts` | Redis-backed event tracking and aggregation |
| MCP Endpoint | `app/api/[transport]/route.ts` | SSE-based MCP server with tool registration |
| Profile Upsert Script | `scripts/upsert-profile.ts` | CLI for embedding profile.json into vector DB |
| Test Harness | `scripts/test-interview.ts` | Automated interview question testing |

---

## 3. Data Model

### 3.1 Profile Data Structure (`data/profile.json`)

```
profile.json
├── metadata (version, lastUpdated, dataOwner)
├── personalInfo
│   ├── fullName, preferredName, title, headline
│   ├── location (city, state, country, timezone)
│   ├── workRights (status, visaType, requiresSponsorship)
│   └── availability (status, noticePeriod, preferredWorkType)
├── professionalSummary
│   ├── elevator_pitch
│   ├── unique_value_proposition
│   └── years_of_experience, career_focus[]
├── skills
│   ├── software_development (tools, methodologies, deliverables)
│   ├── business_analytics (tools, techniques, deliverables)
│   ├── technical (languages, frameworks, tools)
│   └── soft_skills[]
├── experience[] (company, role, responsibilities, achievements)
├── education[] (institution, degree, major, coursework)
├── certifications[] (name, issuer, year, credential_id)
├── projects[] (name, type, description, outcomes, skills_used)
├── interview_qa
│   ├── strengths[]
│   ├── experience_based[]
│   └── technical[]
├── preferences (role_interests, industry_interests, culture, deal_breakers)
└── contact (email, linkedin, portfolio, github)
```

### 3.2 Vector Chunk Schema

Each profile section is chunked and embedded with the following structure:

```typescript
interface ProfileChunk {
  id: string;           // e.g., "exp-001", "skill-software_development", "qa-strengths-1"
  data: string;         // Text content for embedding
  metadata: {
    type: string;       // "experience" | "skill" | "education" | "project" | "interview_qa" | ...
    section?: string;   // Sub-section identifier
    category?: string;  // For skills: "software_development", "business_analytics", etc.
    owner: string;      // Profile owner name
    company?: string;   // For experience chunks
    role?: string;      // For experience chunks
    question?: string;  // For interview_qa chunks
  };
}
```

### 3.3 Chunking Strategy

| Chunk Type | ID Pattern | Content |
|------------|------------|---------|
| Summary | `profile-summary` | Personal info + elevator pitch + value proposition |
| Skills | `skill-{category}` | One chunk per skill category |
| Experience | `exp-{id}` | One chunk per role with responsibilities and achievements |
| Education | `edu-{n}` | One chunk per degree |
| Certifications | `certifications` | All certifications in one chunk |
| Projects | `proj-{id}` | One chunk per project |
| Interview Q&A | `qa-{category}-{n}` | One chunk per question-answer pair |
| Preferences | `preferences` | Role interests, culture preferences |
| Contact | `contact` | Contact information |

**Total Chunks**: ~20-25 vectors depending on profile content

---

## 4. API Specifications

### 4.1 Interview Chat Server Action

```typescript
// app/actions-interview.ts
export async function interviewChat(request: InterviewChatRequest): Promise<InterviewResponse>

interface InterviewChatRequest {
  question: string;         // User's interview question
  model?: string;           // "llama-3.1-8b-instant" | "llama-3.3-70b-versatile"
  messages?: ChatMessage[]; // Conversation history (up to 10 messages)
}

interface InterviewResponse {
  sources: ProfileVectorResult[];  // Retrieved profile chunks
  answer: string;                   // LLM-generated first-person response
}
```

**Pipeline Steps**:
1. Normalize and validate question (1-2000 chars)
2. Search Upstash Vector for top 8 relevant chunks
3. Build context from top 5 results (max 6000 chars)
4. Generate response via Groq LLaMA with interview system prompt
5. Track analytics event to Redis
6. Return answer with sources

### 4.2 MCP Tools

```typescript
// search_profile tool
{
  name: "search_profile",
  description: "Search the professional profile using natural language",
  inputSchema: {
    query: z.string().min(1),
    topK: z.number().int().min(1).max(10).default(5)
  }
}

// get_profile_section tool
{
  name: "get_profile_section",
  description: "Retrieve a specific section of the professional profile",
  inputSchema: {
    section: z.enum(["summary", "experience", "skills", "education", 
                     "certifications", "projects", "preferences", "contact", "interview_qa"])
  }
}
```

### 4.3 Analytics API

```typescript
// GET /api/analytics - Retrieve analytics summary
interface InterviewAnalyticsSummary {
  totalQueries: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgTotalMs: number;
  avgVectorMs: number;
  avgGroqMs: number;
  topSourceTypes: Array<{ type: string; count: number }>;
  querySamples: Array<{ query: string; count: number }>;
  recentEvents: InterviewEvent[];
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

// DELETE /api/analytics - Clear all analytics data
```

---

## 5. System Prompt Design

### 5.1 Digital Twin Persona

```text
You are Aniraj Khadgi's Digital Twin — an AI that represents them authentically 
in professional job interviews.

## Your Identity
- You speak in first person ("I am...", "My experience in...", "I have worked on...")
- You are warm, professional, and confident
- You answer based ONLY on the provided context from the professional profile
- You represent Aniraj accurately and authentically

## Guidelines
1. If the context contains relevant information, answer naturally as if you ARE Aniraj
2. Quantify achievements when possible using specific data from the context
3. Reference specific projects, companies, and technologies mentioned in the context
4. If asked something not in the context, politely redirect: "That's not something 
   I typically discuss in interviews, but I'd be happy to share more about my experience in..."
5. NEVER fabricate experiences, skills, certifications, or achievements not in the context
6. Keep answers conversational but professional
7. When discussing technical skills, be specific about proficiency levels mentioned

## Response Style
- Use "I" and "my" when referring to experiences and skills
- Be concise but thorough
- Include relevant metrics and achievements when available
- Maintain a positive, enthusiastic tone about career opportunities
```

---

## 6. Error Handling

### 6.1 Retry Strategy

All external API calls use exponential backoff retry:

| Service | Timeout | Max Retries | Initial Delay | Retryable Codes |
|---------|---------|-------------|---------------|-----------------|
| Upstash Vector | 12s | 3 | 400ms | 408, 425, 429, 500, 502, 503, 504 |
| Groq LLM | 18s | 4 | 800ms | 408, 425, 429, 500, 502, 503, 504 |
| Upstash Redis | 5s | 2 | 200ms | 408, 429, 500, 502, 503, 504 |

### 6.2 Graceful Degradation

| Failure Scenario | Fallback Behavior |
|------------------|-------------------|
| Vector search returns empty | Return "I don't have specific information about that in my profile" |
| Groq rate limited | Retry with backoff, fail with user-friendly message |
| Redis unavailable | Analytics silently fails, main function continues |
| Invalid question length | Return validation error before API calls |

---

## 7. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| End-to-end latency | < 5 seconds | Total time from question to response |
| Vector search latency | < 500ms | Upstash query time |
| LLM generation latency | < 4 seconds | Groq API time |
| Success rate | > 95% | Successful responses / total requests |
| Hallucination rate | 0% | Responses must be grounded in profile data |

---

## 8. Security Considerations

### 8.1 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `UPSTASH_VECTOR_REST_URL` | Vector DB endpoint | Server-side only |
| `UPSTASH_VECTOR_REST_TOKEN` | Vector DB authentication | Server-side only |
| `GROQ_API_KEY` | LLM API authentication | Server-side only |
| `UPSTASH_REDIS_REST_URL` | Redis endpoint | Server-side only |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication | Server-side only |

### 8.2 Input Validation

- Question length: 1-2000 characters
- Model selection: Whitelist of allowed models
- Message history: Max 10 messages, 800 chars each
- Section parameter: Enum validation via Zod

---

## 9. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16+ |
| Language | TypeScript | 5.x |
| Vector DB | Upstash Vector | Auto-embedding |
| LLM Provider | Groq | LLaMA 3.1/3.3 |
| Analytics Store | Upstash Redis | REST API |
| MCP Server | mcp-handler | 0.x |
| UI Components | shadcn/ui | Latest |
| Styling | Tailwind CSS | 3.x |
| Validation | Zod | 3.x |

---

## 10. Deployment

### 10.1 Vercel Deployment

```yaml
# Recommended Vercel settings
framework: Next.js
build_command: pnpm build
output_directory: .next
node_version: 20.x
```

### 10.2 Environment Configuration

All sensitive credentials stored in Vercel Environment Variables with production/preview/development scopes.

---

## Appendix A: File Structure

```
digital-twin/
├── app/
│   ├── actions-interview.ts   # Interview RAG server action
│   ├── analytics/page.tsx     # Analytics dashboard
│   ├── api/
│   │   ├── [transport]/route.ts  # MCP SSE endpoint
│   │   └── analytics/route.ts    # Analytics API
│   ├── layout.tsx
│   └── page.tsx               # Main interview UI
├── components/
│   └── interview-chat.tsx     # Interview conversation component
├── data/
│   └── profile.json           # Professional profile data
├── docs/
│   ├── design.md              # This document
│   ├── implementation-plan.md # Task breakdown
│   └── test-results/          # Test outputs
├── lib/
│   ├── analytics.ts           # Redis analytics module
│   ├── profile-search.ts      # Vector search module
│   └── utils.ts               # Utilities
├── scripts/
│   ├── test-interview.ts      # Automated test harness
│   └── upsert-profile.ts      # Profile embedding script
├── .env.local                 # Environment variables (gitignored)
├── package.json
└── README.md
```

---

## Appendix B: References

- [Upstash Vector Documentation](https://docs.upstash.com/vector)
- [Groq API Documentation](https://console.groq.com/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Digital Twin I Course](https://www.ausbizconsulting.com.au/courses/digitaltwin-I)
