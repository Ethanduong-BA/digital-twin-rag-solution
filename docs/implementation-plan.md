# Digital Twin Implementation Plan

> **AI-Generated**: This implementation plan was generated from `docs/design.md` using Claude Opus 4.5. Reviewed and approved by the team.

---

## Overview

This document provides a detailed task breakdown for implementing the Digital Twin RAG solution. Tasks are organized by week with dependencies, ownership, and completion criteria.

---

## Week 1: Foundation & Profile RAG ✅ COMPLETE

### Objectives
- Set up data pipeline for professional profile
- Create profile embeddings in Upstash Vector
- Build basic profile search functionality

### Tasks

| ID | Task | Owner | Dependencies | Status | Notes |
|----|------|-------|--------------|--------|-------|
| W1.1 | Create `scripts/upsert-profile.ts` | Aniraj | None | ✅ Done | Profile chunking script |
| W1.2 | Define chunking strategy for profile sections | Aniraj | W1.1 | ✅ Done | 20+ chunks per profile |
| W1.3 | Create `lib/profile-search.ts` with Zod schemas | Aniraj | W1.1 | ✅ Done | Search + section retrieval |
| W1.4 | Configure Upstash Vector environment | Aniraj | None | ✅ Done | Auto-embedding enabled |
| W1.5 | Run `pnpm upsert-profile` to embed data | Aniraj | W1.1, W1.4 | ✅ Done | All chunks embedded |
| W1.6 | Test vector queries manually | Aniraj | W1.5 | ✅ Done | Verified semantic relevance |

### Deliverables
- [x] Working `pnpm upsert-profile` command
- [x] Profile data searchable in Upstash Vector
- [x] Query test results documented

---

## Week 2: RAG Integration & Chat Adaptation ✅ COMPLETE

### Objectives
- Modify RAG server action for interview queries
- Create interview-specific system prompt
- Adapt UI for interview simulation

### Tasks

| ID | Task | Owner | Dependencies | Status | Notes |
|----|------|-------|--------------|--------|-------|
| W2.1 | Create `app/actions-interview.ts` | Aniraj | W1.3 | ✅ Done | RAG orchestration logic |
| W2.2 | Design interview system prompt | Aniraj | None | ✅ Done | First-person persona |
| W2.3 | Create `components/interview-chat.tsx` | Aniraj | W2.1 | ✅ Done | UI with question suggestions |
| W2.4 | Update `app/page.tsx` for interview mode | Aniraj | W2.3 | ✅ Done | Interview-only UI |
| W2.5 | Create `scripts/test-interview.ts` | Aniraj | W2.1 | ✅ Done | 16 test questions |
| W2.6 | Run test harness and document results | Aniraj | W2.5 | ✅ Done | 100% success rate |
| W2.7 | Add response formatting with sources | Aniraj | W2.1, W2.3 | ✅ Done | Collapsible source display |
| W2.8 | Implement conversation history support | Aniraj | W2.1 | ✅ Done | Max 10 messages |
| W2.9 | Create interview analytics tracking | Aniraj | W2.1 | ✅ Done | Redis-backed storage |
| W2.10 | Build analytics dashboard | Aniraj | W2.9 | ✅ Done | Real-time updates |
| W2.11 | Create `docs/design.md` | Aniraj | All W2 | ✅ Done | Technical design doc |
| W2.12 | Create `docs/implementation-plan.md` | Aniraj | W2.11 | ✅ Done | This document |

### Deliverables
- [x] `interviewChat()` server action
- [x] Interview mode chat UI
- [x] Test results for 16 interview questions
- [x] Analytics dashboard with real-time updates
- [x] `docs/design.md` on GitHub
- [x] `docs/implementation-plan.md` on GitHub

---

## Week 3: MCP Integration & Interview Simulation ✅ COMPLETE

### Objectives
- Complete MCP server with profile search tools
- Integrate with Claude Desktop / VS Code Copilot
- Create structured interview simulation flow

### Tasks

| ID | Task | Owner | Dependencies | Status | Notes |
|----|------|-------|--------------|--------|-------|
| W3.1 | Verify `search_profile` MCP tool | Aniraj | W1.3 | ✅ Done | Working via MCP endpoint |
| W3.2 | Verify `get_profile_section` MCP tool | Aniraj | W1.3 | ✅ Done | Working via MCP endpoint |
| W3.3 | Test MCP endpoint in VS Code | Aniraj | W3.1, W3.2 | ✅ Done | .vscode/mcp.json configured |
| W3.4 | Create interview simulator module | Aniraj | W3.1, W3.2 | ✅ Done | lib/interview-simulator.ts |
| W3.5 | Create `/jobs` folder with 5 JDs | Aniraj | None | ✅ Done | Real JDs from seek/linkedin/indeed |
| W3.6 | Create interview simulation script | Aniraj | W3.5 | ✅ Done | scripts/run-interview-simulation.ts |
| W3.7 | Run simulations and generate results | Aniraj | W3.6 | ✅ Done | 5 jobs, 100% pass rate |
| W3.8 | Create `/interview` result files | Aniraj | W3.7 | ✅ Done | Individual + SUMMARY.md |
| W3.9 | Update agents.md for Week 3 | Aniraj | All W3 | ✅ Done | MCP & simulation instructions |
| W3.10 | Create mcp-test-result-aniraj.txt | Aniraj | W3.3 | ✅ Done | docs/ folder |
| W3.11 | Create interview-summary-aniraj.txt | Aniraj | W3.7 | ✅ Done | docs/ folder |

### Deliverables
- [x] Working `search_profile` MCP tool tested in VS Code
- [x] Working `get_profile_section` MCP tool tested in VS Code
- [x] `/jobs` folder with 5 real job descriptions
- [x] `/interview` folder with simulation results
- [x] Updated `agents.md` with Week 3 additions
- [x] `docs/mcp-test-result-aniraj.txt`
- [x] `docs/interview-summary-aniraj.txt`

### Job Descriptions Created
1. Software Engineer - Full Stack at Canva (seek.com.au)
2. Data Analyst at Atlassian (linkedin.com/jobs)
3. Junior Backend Developer at REA Group (seek.com.au)
4. BI Developer (Graduate) at CBA (linkedin.com/jobs)
5. Full Stack Developer at Buildkite (linkedin.com/jobs)

### Interview Simulation Results
- **Total Simulations:** 5
- **Pass Rate:** 100% (5/5)
- **Average Score:** 7.8/10
- **Best Fit Role:** Full Stack Developer at Buildkite (8.4/10)

---

## Week 4: Refinement & Deployment ✅ COMPLETE

### Objectives
- Host system on Vercel cloud infrastructure
- Refine knowledge base based on test results
- Achieve target interview performance through data improvement

### Tasks

| ID | Task | Owner | Dependencies | Status | Notes |
|----|------|-------|--------------|--------|-------|
| W4.1 | Deploy MCP server to Vercel | Aniraj | W3 | ✅ Done | https://digital-twin-rag-solution.vercel.app |
| W4.2 | Configure Vercel env variables | Aniraj | W4.1 | ✅ Done | All API keys configured |
| W4.3 | Test Vercel MCP endpoint | Aniraj | W4.2 | ✅ Done | Endpoint accessible |
| W4.4 | Identify Week 3 performance issues | Aniraj | W3.7 | ✅ Done | Documented gaps |
| W4.5 | Refine profile data/vectors | Aniraj | W4.4 | ✅ Done | Enhanced content |
| W4.6 | Re-run interview simulations | Aniraj | W4.5 | ✅ Done | Improved scores |
| W4.7 | Create performance-improvement.md | Aniraj | W4.6 | ✅ Done | Before/after comparison |
| W4.8 | Create mcp-server-url.txt | Aniraj | W4.3 | ✅ Done | URL documented |

### Performance Improvement Results
- **Week 3 Average:** 7.8/10
- **Week 4 Average:** 8.7/10
- **Improvement:** +0.9 (+12%)
- **Weakest Role Fixed:** CBA BI Developer 7.2 → 8.6 (+1.4)

### Deliverables
- [x] Live Vercel deployment: https://digital-twin-rag-solution.vercel.app
- [x] Performance improvement documentation
- [x] MCP server URL file
- [ ] ClickUp board screenshot (clickup-board-week4-aniraj.png)
- [ ] GitHub commits PDF (github-commits-week4-aniraj.pdf)

---

## Week 5: Final Features & Presentation

### Objectives
- Add visual polish and final features
- Create presentation materials
- Complete documentation

### Tasks

| ID | Task | Owner | Dependencies | Status | Notes |
|----|------|-------|--------------|--------|-------|
| W5.1 | Add Digital Twin avatar/visual identity | Aniraj | W2.3 | ⬜ Not Started | Optional enhancement |
| W5.2 | Create "Interview Session" mode | Aniraj | W3.6 | ⬜ Not Started | Guided multi-question flow |
| W5.3 | Build presentation deck | Aniraj | All weeks | ⬜ Not Started | 10-15 slides |
| W5.4 | Record demo video | Aniraj | W5.3 | ⬜ Not Started | 3-5 minute walkthrough |
| W5.5 | Update all documentation | Aniraj | All weeks | ⬜ Not Started | README, docs/ |
| W5.6 | Create performance comparison | Aniraj | W4.6 | ⬜ Not Started | Latency benchmarks |
| W5.7 | Final code cleanup | Aniraj | All tasks | ⬜ Not Started | Remove dead code |
| W5.8 | Merge all PRs | Aniraj | W5.7 | ⬜ Not Started | Clean main branch |

### Deliverables
- [ ] Presentation draft (10-15 slides)
- [ ] Demo video (3-5 minutes)
- [ ] Complete documentation
- [ ] Clean codebase with all PRs merged

---

## Week 6: Presentation Week

### Objectives
- Deliver final presentation
- Handle Q&A
- Submit all deliverables

### Tasks

| ID | Task | Owner | Dependencies | Status | Notes |
|----|------|-------|--------------|--------|-------|
| W6.1 | Practice presentation | Aniraj | W5.3 | ⬜ Not Started | Time management |
| W6.2 | Prepare for technical Q&A | Aniraj | All design | ⬜ Not Started | Architecture deep-dives |
| W6.3 | Final code cleanup | Aniraj | W5.8 | ⬜ Not Started | Last-minute fixes |
| W6.4 | Submit presentation recording | Aniraj | W6.1 | ⬜ Not Started | Course requirement |
| W6.5 | Tag final release | Aniraj | W6.3 | ⬜ Not Started | v1.0.0 |

### Deliverables
- [ ] Final presentation delivered
- [ ] Q&A handled successfully
- [ ] All code submitted
- [ ] Course completion

---

## Dependency Graph

```
Week 1: Foundation
   │
   ├── W1.1 upsert-profile.ts ─────┐
   │                               │
   ├── W1.3 profile-search.ts ─────┼──► Week 2: RAG Integration
   │                               │
   └── W1.4-6 Vector setup ────────┘
                                   │
                                   ▼
Week 2: Chat & Analytics ─────────────► Week 3: MCP Integration
   │                                         │
   ├── W2.1 actions-interview.ts             ├── W3.1-2 MCP tools
   ├── W2.3 interview-chat.tsx               ├── W3.3-4 Testing
   ├── W2.9-10 Analytics                     └── W3.6-7 Session flow
   └── W2.11-12 Documentation                     │
                                                  ▼
                                    Week 4: Refinement
                                         │
                                         ├── W4.1-2 Tuning
                                         ├── W4.4 Feedback
                                         └── W4.6 Performance
                                              │
                                              ▼
                                    Week 5: Final Features
                                         │
                                         ├── W5.3-4 Presentation
                                         └── W5.5-8 Documentation
                                              │
                                              ▼
                                    Week 6: Presentation
```

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Profile data too sparse | Medium | High | Expand profile.json with more experiences |
| LLM generates hallucinations | Low | High | Strong system prompt + context grounding |
| Upstash rate limits during demo | Low | Medium | Aggressive caching, backup screenshots |
| Complex questions need multiple searches | Medium | Medium | Query decomposition in future iteration |
| MCP integration issues | Medium | Medium | Test early in Week 3, have fallback UI |

---

## Success Criteria

| Metric | Target | Current Status |
|--------|--------|----------------|
| Profile data embedded | 100% of profile.json | ✅ Complete |
| Interview Q&A coverage | 20+ questions tested | ✅ 16 unit tests + 50 simulation Qs |
| Response latency | < 5 seconds | ✅ Avg 2.66s |
| Hallucination rate | 0% | ✅ Verified in testing |
| MCP tools functional | Works in Claude/VS Code | ✅ Complete |
| Interview simulations | 5 jobs, pass rate > 80% | ✅ 100% pass (5/5) |
| Presentation ready | Complete by Week 6 | ⬜ Week 5-6 |

---

## Completed Work Summary (Week 1-3)

### Week 1 Files
- `scripts/upsert-profile.ts` - Profile embedding pipeline
- `lib/profile-search.ts` - Vector search with Zod schemas

### Week 2 Files
- `scripts/test-interview.ts` - Automated test harness
- `lib/analytics.ts` - Redis analytics module
- `app/actions-interview.ts` - Interview RAG server action
- `components/interview-chat.tsx` - Interview UI component
- `app/analytics/page.tsx` - Analytics dashboard
- `app/api/analytics/route.ts` - Analytics API
- `docs/design.md` - Technical design document
- `docs/implementation-plan.md` - This document

### Week 3 Files
- `lib/interview-simulator.ts` - Interview simulation engine
- `app/api/[transport]/route.ts` - Updated with run_interview tool
- `scripts/run-interview-simulation.ts` - Simulation runner script
- `jobs/01-software-engineer-canva.md` - Job description
- `jobs/02-data-analyst-atlassian.md` - Job description
- `jobs/03-junior-backend-developer-rea.md` - Job description
- `jobs/04-bi-developer-cba.md` - Job description
- `jobs/05-fullstack-developer-buildkite.md` - Job description
- `interview/01-software-engineer-canva-result.md` - Simulation result
- `interview/02-data-analyst-atlassian-result.md` - Simulation result
- `interview/03-junior-backend-developer-rea-result.md` - Simulation result
- `interview/04-bi-developer-cba-result.md` - Simulation result
- `interview/05-fullstack-developer-buildkite-result.md` - Simulation result
- `interview/SUMMARY.md` - Simulation summary
- `docs/mcp-test-result-aniraj.txt` - MCP test documentation
- `docs/interview-summary-aniraj.txt` - Interview summary documentation
- `agents.md` - Updated with Week 3 additions

### Test Results (Cumulative)
- 16 unit interview questions: 100% success rate
- 5 full interview simulations: 100% pass rate (7.8/10 average)
- MCP tools: Both tested and working
- Average latency: 2.66 seconds

---

## Next Steps (Week 4)

1. **Fine-tune vector search** - Optimize TopK and context length
2. **Add confidence scoring** - Based on vector similarity scores
3. **Implement feedback UI** - Thumbs up/down for answers
4. **Optimize latency** - Target < 3 seconds consistently
5. **Handle edge cases** - Off-topic and adversarial questions
