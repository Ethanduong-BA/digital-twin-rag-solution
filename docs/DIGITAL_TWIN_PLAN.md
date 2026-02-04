# Digital Twin I (RAG Solution) - Implementation Plan

## Course Overview

Transform the existing Food RAG web application into a **Digital Twin** — a personal AI agent capable of autonomously representing its creator in professional job interviews using RAG architecture and MCP integration.

**Source:** [Digital Twin I Course](https://www.ausbizconsulting.com.au/courses/digitaltwin-I)

---

## Key Technical Domains

| Domain | Description | Current Status |
|--------|-------------|----------------|
| **RAG Architecture** | Semantic search using vector databases to ground AI responses in professional experiences | ✅ Implemented for food data |
| **MCP Server Development** | Building MCP servers using Next.js/TypeScript for AI agent integration | ✅ Food search MCP exists |
| **Data Pipeline Engineering** | Embedding professional profiles (JSON) into vector storage | 🔄 Need to adapt for profile |
| **AI-Powered Workflow** | VS Code Insiders + GitHub Copilot for development | ✅ In use |
| **Team Collaboration** | GitHub PRs/branches + ClickUp project management | 🔄 Need ClickUp setup |

---

## Current Project Assets

### Already Available

| Asset | Location | Reusability |
|-------|----------|-------------|
| Professional Profile JSON | `data/profile.json` | ✅ Ready to embed |
| Vector Search Logic | `app/actions.ts` | ✅ Reuse retry logic, fetch patterns |
| MCP Server Framework | `app/api/[transport]/route.ts` | ✅ Adapt for profile search |
| Food Search MCP | `lib/food-search.ts` | ✅ Template for profile search |
| Upsert Script | `scripts/upsert-data.ts` | 🔄 Modify for profile data |
| Chat Interface UI | `components/chat-interface.tsx` | ✅ Adapt for interview mode |

### Profile Data Structure (Already Exists!)

```
data/profile.json
├── personalInfo (name, title, location, work rights)
├── professionalSummary (elevator pitch, unique value proposition)
├── skills (software_development, business_analytics, technical, soft_skills)
├── experience (roles, responsibilities, achievements)
├── education (degrees, coursework)
├── certifications (AWS, Docker, Terraform)
├── projects (professional + personal)
├── interview_qa (pre-crafted responses)
├── preferences (role interests, culture fit)
└── contact (email, LinkedIn, portfolio, GitHub)
```

---

## Two Implementation Options

### Option 1: Agent Mode in VS Code (Recommended Start)
Use GitHub Copilot in VS Code with MCP tools to create an agent that can answer interview questions by searching the profile.

**Pros:** Faster setup, good for testing RAG pipeline
**Cons:** Limited to VS Code users

### Option 2: Web-Based Digital Twin UI
Build a full web interface where users can interact with the Digital Twin via a chat-like interview simulation.

**Pros:** Accessible anywhere, can include avatar/UI polish
**Cons:** More development effort

**Recommendation:** Start with Option 1 (Week 1-2), then evolve to Option 2 (Week 3+)

---

## 6-Week Implementation Plan

### Week 1: Foundation & Profile RAG

**Goals:**
- [ ] Adapt data pipeline for professional profile
- [ ] Create profile embeddings in Upstash Vector
- [ ] Build basic profile search functionality

**Tasks:**

| # | Task | Files to Modify/Create |
|---|------|------------------------|
| 1.1 | Create `scripts/upsert-profile.ts` to embed profile data | New script |
| 1.2 | Chunk profile into searchable segments (experiences, skills, Q&A) | Logic in upsert script |
| 1.3 | Create `lib/profile-search.ts` with Zod schemas | New module |
| 1.4 | Update environment validation for profile namespace | `.env.local` |
| 1.5 | Test vector queries against profile data | Manual testing |

**Profile Chunking Strategy:**
```typescript
// Each section becomes a separate vector entry for precise retrieval
[
  { id: "summary-1", data: "Elevator Pitch: ...", metadata: { type: "summary" } },
  { id: "exp-001", data: "LIS Nepal: Software Engineer...", metadata: { type: "experience", company: "LIS Nepal" } },
  { id: "skill-dev", data: "Software development skills...", metadata: { type: "skill", category: "development" } },
  { id: "qa-strength-1", data: "Q: What are your key strengths? A: ...", metadata: { type: "interview_qa" } },
  { id: "proj-001", data: "Microservices Payment Gateway...", metadata: { type: "project" } },
  // ... etc
]
```

**Deliverables:**
- Working `pnpm upsert-profile` command
- Profile data searchable via Upstash Vector
- Basic query test results documented

---

### Week 2: RAG Integration & Chat Adaptation

**Goals:**
- [ ] Modify RAG server action to handle interview queries
- [ ] Create interview-specific system prompt
- [ ] Adapt UI for interview simulation context

**Tasks:**

| # | Task | Files to Modify/Create |
|---|------|------------------------|
| 2.1 | Create `app/actions-interview.ts` with interview RAG logic | New server action |
| 2.2 | Design interview system prompt that grounds answers in profile | Prompt engineering |
| 2.3 | Create interview mode toggle in UI | `components/chat-interface.tsx` |
| 2.4 | Add interview-specific response formatting | Server action |
| 2.5 | Create test script for interview queries | `scripts/test-interview.ts` |

**Interview System Prompt Pattern:**
```typescript
const INTERVIEW_SYSTEM_PROMPT = `
You are Aniraj Khadgi's Digital Twin — an AI that represents them authentically in professional job interviews.

## Your Identity
- You speak in first person ("I am...", "My experience in...")
- You are warm, professional, and confident
- You answer based ONLY on the provided context from the professional profile

## Guidelines
1. If the context contains relevant information, answer naturally as if you are Aniraj
2. Quantify achievements when possible using data from the context
3. If asked something not in the context, politely redirect: "That's not something I typically discuss in interviews, but I'd be happy to share..."
4. Never fabricate experiences, skills, or achievements

## Current Context
{context_from_vector_search}
`;
```

**Deliverables:**
- `ragInterview()` server action
- Interview mode in chat UI
- Test results for common interview questions

---

### Week 3: MCP Integration & Interview Simulation

**Goals:**
- [ ] Build MCP server for profile search (`search_profile` tool)
- [ ] Integrate with Claude Desktop / VS Code Copilot
- [ ] Create structured interview simulation flow

**Tasks:**

| # | Task | Files to Modify/Create |
|---|------|------------------------|
| 3.1 | Create `lib/profile-mcp.ts` with profile search tool | New MCP module |
| 3.2 | Update `app/api/[transport]/route.ts` to register profile tool | Existing endpoint |
| 3.3 | Add Claude Desktop config generator in UI | New component |
| 3.4 | Create `get_profile_section` tool for specific sections | MCP module |
| 3.5 | Test Claude Desktop interview flow | Manual testing |
| 3.6 | Document MCP setup in README | `docs/INTERVIEW_MCP.md` |

**MCP Tool Specifications:**

```typescript
// Tool 1: Search profile semantically
{
  name: "search_profile",
  description: "Search Aniraj Khadgi's professional profile using natural language. Returns relevant experiences, skills, projects, and interview responses.",
  inputSchema: {
    query: "string - Natural language search query (e.g., 'leadership experience', 'Python projects')",
    topK: "number - Results to return (1-10, default 5)"
  }
}

// Tool 2: Get specific section
{
  name: "get_profile_section",
  description: "Retrieve a specific section of the professional profile",
  inputSchema: {
    section: "enum - One of: summary, experience, skills, education, certifications, projects, preferences"
  }
}
```

**Deliverables:**
- Working `search_profile` MCP tool
- Claude Desktop configuration guide
- Interview simulation demo recording

---

### Week 4: Refinement

**Goals:**
- [ ] Improve answer quality and relevance
- [ ] Add feedback/rating mechanism
- [ ] Optimize performance

**Tasks:**

| # | Task | Files to Modify/Create |
|---|------|------------------------|
| 4.1 | Fine-tune vector search TopK and context length | `lib/profile-search.ts` |
| 4.2 | Add confidence scoring to responses | Server action |
| 4.3 | Implement answer quality feedback UI | New component |
| 4.4 | Add caching for frequent interview questions | Server action |
| 4.5 | Create performance monitoring dashboard | `app/analytics/` |

**Refinement Focus Areas:**
- Response coherence and natural tone
- Proper grounding in profile data (no hallucinations)
- Handling edge cases (off-topic questions, adversarial prompts)
- Latency optimization

**Deliverables:**
- Improved answer quality (subjective evaluation)
- Feedback collection mechanism
- Performance metrics dashboard

---

### Week 5: Final Features & Presentation Outline

**Goals:**
- [ ] Add avatar/visual representation (Option 2)
- [ ] Create presentation materials
- [ ] Final documentation

**Tasks:**

| # | Task | Files to Modify/Create |
|---|------|------------------------|
| 5.1 | Add Digital Twin avatar/visual identity to UI | `components/` |
| 5.2 | Create "Interview Session" mode with structured flow | New component |
| 5.3 | Build presentation deck template | `docs/presentation/` |
| 5.4 | Record demo video | External |
| 5.5 | Update all documentation | `README.md`, `docs/` |
| 5.6 | Performance comparison: Food RAG vs Digital Twin | `docs/COMPARISON.md` |

**Presentation Outline:**
1. Problem Statement: Why Digital Twins for interviews?
2. Technical Architecture: RAG + MCP overview
3. Live Demo: Ask interview questions
4. Data Pipeline: How profile data flows
5. Results & Metrics: Response quality, latency
6. Challenges & Learnings
7. Future Enhancements

**Deliverables:**
- Presentation draft
- Demo video script
- Complete documentation

---

### Week 6: Presentation Week

**Goals:**
- [ ] Deliver final presentation
- [ ] Handle Q&A
- [ ] Submit all deliverables

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 6.1 | Practice presentation | Time management, flow |
| 6.2 | Prepare for technical questions | Architecture deep-dives |
| 6.3 | Final code cleanup & PR merge | Git hygiene |
| 6.4 | Submit presentation recording | Course requirement |

---

## Architecture Evolution

### Current State (Food RAG)
```
User ➜ Chat UI ➜ ragQuery() ➜ Upstash Vector (food_data) ➜ Groq LLM ➜ Food Answer
```

### Target State (Digital Twin)
```
User/Recruiter ➜ Interview UI ➜ ragInterview() ➜ Upstash Vector (profile) ➜ Groq LLM ➜ First-Person Answer
                      │
Claude Desktop ➜ MCP ➜ search_profile ─┘
```

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `scripts/upsert-profile.ts` | Embed profile.json into Upstash Vector |
| `scripts/test-interview.ts` | Automated interview question testing |
| `lib/profile-search.ts` | Profile vector search with Zod schemas |
| `lib/profile-mcp.ts` | MCP tool definitions for profile |
| `app/actions-interview.ts` | Interview-specific RAG server action |
| `components/interview-mode.tsx` | Interview simulation UI component |
| `docs/INTERVIEW_MCP.md` | MCP setup guide for Digital Twin |

### Files to Modify

| File | Changes |
|------|---------|
| `app/api/[transport]/route.ts` | Add `search_profile` tool registration |
| `components/chat-interface.tsx` | Add interview mode toggle |
| `app/page.tsx` | Add interview mode routing |
| `data/profile.json` | Expand with more interview Q&A |
| `README.md` | Update for Digital Twin context |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Profile data embedded | 100% of profile.json sections |
| Interview Q&A coverage | 20+ common questions answered |
| Response latency | < 5 seconds |
| Hallucination rate | 0% (all answers grounded in profile) |
| MCP tool functional | Works in Claude Desktop |
| Presentation ready | Complete by Week 6 |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Profile data too sparse for good answers | High | Expand profile.json with more experiences, metrics |
| LLM generates ungrounded answers | High | Strong system prompt, maybe verify against context |
| Upstash rate limits during demo | Medium | Implement aggressive caching |
| Complex questions need multiple searches | Medium | Implement query decomposition |

---

## Next Steps (Immediate)

1. **Today:** Create `scripts/upsert-profile.ts` based on existing `upsert-data.ts`
2. **Run:** `pnpm upsert-profile` to embed profile data
3. **Test:** Query vector database with interview questions
4. **Verify:** Results ground in actual profile data

---

## References

- [Course: Digital Twin I](https://www.ausbizconsulting.com.au/courses/digitaltwin-I)
- [Existing MCP Design: docs/mcp.md](./mcp.md)
- [Profile Data: data/profile.json](../data/profile.json)
- [Food RAG Architecture: docs/ARCHITECTURE.md](./ARCHITECTURE.md)
