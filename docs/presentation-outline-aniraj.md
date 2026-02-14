# Digital Twin RAG Solution - Presentation Outline

**Presenter:** Aniraj Khadgi  
**Date:** Week 6 Presentation  
**Duration:** 10-15 minutes

---

## Slide 1: Title Slide

**Digital Twin: AI-Powered Interview Agent**

- Name: Aniraj Khadgi
- Course: Digital Twin I
- Project: Personal AI agent for professional job interviews

---

## Slide 2: Problem Statement

### Why Digital Twins for Interviews?

- **The Challenge:** Job seekers face repetitive interview questions across multiple applications
- **The Opportunity:** AI can represent candidates authentically using their professional profile
- **The Solution:** A Digital Twin that answers interview questions grounded in real experiences

### Value Proposition
> "An AI agent that knows my professional background as well as I do, available 24/7 for initial screenings"

---

## Slide 3: Solution Overview

### What I Built

1. **RAG-Powered Interview Agent**
   - Semantic search over professional profile data
   - First-person responses grounded in real experiences
   
2. **MCP Integration**
   - Works with VS Code Copilot & Claude Desktop
   - Three tools: `search_profile`, `get_profile_section`, `run_interview`

3. **Web Interface**
   - Clean, modern chat UI
   - Model selection (Fast/Quality)
   - Real-time analytics dashboard

---

## Slide 4: Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    User Interfaces                       │
├──────────────────┬──────────────────┬───────────────────┤
│   Web Chat UI    │  VS Code Copilot │  Claude Desktop   │
└────────┬─────────┴────────┬─────────┴─────────┬─────────┘
         │                  │                   │
         ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js 16 App Router                       │
│  ┌─────────────────┐    ┌──────────────────┐            │
│  │ Server Actions  │    │   MCP Endpoint   │            │
│  │ interviewChat() │    │  /api/mcp        │            │
│  └────────┬────────┘    └────────┬─────────┘            │
└───────────┼──────────────────────┼──────────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────────┐  ┌───────────────────────────────┐
│   Upstash Vector     │  │   Groq LLM API                │
│   (Profile Data)     │  │   LLaMA 3.1 8B / 3.3 70B      │
│   Auto-embedding     │  │   First-person persona        │
└──────────────────────┘  └───────────────────────────────┘
```

---

## Slide 5: Data Pipeline

### Profile Embedding Process

1. **Source:** `data/profile.json` (structured professional data)
2. **Chunking:** 20+ semantic chunks per profile section
3. **Embedding:** Upstash Vector with auto-embedding
4. **Retrieval:** Semantic search with TopK=5

### Profile Data Structure
- Personal Information
- Professional Summary
- Skills (Technical & Soft)
- Work Experience
- Education & Certifications
- Projects (Professional & Personal)
- Pre-crafted Interview Q&A
- Role Preferences

---

## Slide 6: MCP Tools

### Tools Available for AI Agents

| Tool | Purpose | Example Usage |
|------|---------|---------------|
| `search_profile` | Semantic search across profile | "Find leadership experience" |
| `get_profile_section` | Retrieve specific sections | Get all skills data |
| `run_interview` | Full interview simulation | Simulate Canva interview |

### MCP Configuration
```json
{
  "digital-twin": {
    "type": "http",
    "url": "https://digital-twin-rag-solution.vercel.app/api/mcp"
  }
}
```

---

## Slide 7: Live Demo

### Demo Script (3-5 minutes)

1. **Open Web Interface**
   - Show clean, minimal design
   - Demonstrate quick question chips

2. **Ask Interview Questions**
   - "Tell me about yourself"
   - "What are your technical skills?"
   - "Describe a challenging project"

3. **Show Features**
   - Expand/collapse sources
   - Copy response functionality
   - Toggle between Fast/Quality models

4. **Analytics Dashboard**
   - Real-time query tracking
   - Response time metrics
   - Popular questions chart

---

## Slide 8: Interview Simulation Results

### Performance Metrics

| Metric | Value |
|--------|-------|
| Total Job Simulations | 5 |
| Pass Rate | 100% (5/5) |
| Average Score | 8.7/10 |
| Passing Threshold | 6.0/10 |

### Results by Position

| Company | Position | Score |
|---------|----------|-------|
| Canva | Software Engineer | 8.9/10 |
| Atlassian | Data Analyst | 8.5/10 |
| REA Group | Junior Backend Developer | 8.5/10 |
| CBA | BI Developer | 8.6/10 |
| Buildkite | Full Stack Developer | 8.8/10 |

---

## Slide 9: Performance Improvement

### Week 3 → Week 4 Comparison

| Metric | Week 3 | Week 4 | Improvement |
|--------|--------|--------|-------------|
| Average Score | 7.8/10 | 8.7/10 | +12% |
| Lowest Score | 7.2/10 | 8.5/10 | +1.3 |
| Technical Category | 7.7/10 | 8.6/10 | +0.9 |

### Key Improvements
- Enhanced profile data with quantified achievements
- Added more project details and technical context
- Optimized simulation parameters

---

## Slide 10: Technical Challenges & Solutions

### Challenge 1: Response Grounding
- **Problem:** Risk of AI hallucinating experiences
- **Solution:** Strong system prompt + strict context grounding + source attribution

### Challenge 2: Model Selection
- **Problem:** Trade-off between speed and quality
- **Solution:** User-selectable Fast (8B) vs Quality (70B) modes

### Challenge 3: MCP Integration
- **Problem:** HTTP transport for cloud deployment
- **Solution:** `mcp-handler` library with Vercel-compatible endpoint

### Challenge 4: Data Refinement
- **Problem:** Initial scores below target
- **Solution:** Iterative profile enhancement based on simulation feedback

---

## Slide 11: Analytics & Monitoring

### Real-Time Dashboard Features

- **Total Queries:** Track usage volume
- **Success Rate:** Monitor reliability
- **Response Times:** Vector + LLM latency breakdown
- **Popular Questions:** Identify common interview topics
- **Source Usage:** Which profile sections are most referenced

### Key Metrics Achieved
- 98%+ success rate
- ~2s average response time
- 50+ interview questions answered

---

## Slide 12: Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16, Tailwind, shadcn/ui | Modern chat interface |
| Backend | Next.js App Router, Server Actions | RAG orchestration |
| Vector DB | Upstash Vector | Profile embeddings |
| LLM | Groq (LLaMA 3.1/3.3) | Response generation |
| Analytics | Upstash Redis | Event tracking |
| MCP | mcp-handler | AI agent integration |
| Hosting | Vercel | Cloud deployment |

---

## Slide 13: Future Enhancements

### Planned Improvements

1. **Voice Interface**
   - Add speech-to-text for natural conversation
   - Text-to-speech for audio responses

2. **Multi-Language Support**
   - Translate profile data
   - Answer in candidate's preferred language

3. **Interview Feedback Loop**
   - Allow users to rate responses
   - Use feedback to improve profile data

4. **Video Avatar**
   - Generate video responses with AI avatar
   - More engaging user experience

---

## Slide 14: Key Learnings

### Technical Insights

1. **RAG Architecture** - Chunking strategy significantly impacts retrieval quality
2. **Prompt Engineering** - First-person persona requires careful system prompting
3. **MCP Design** - Tool granularity matters (semantic vs structured)
4. **Cloud Deployment** - Environment isolation critical for API keys

### Process Insights

1. **Iterative Testing** - Simulation-based validation reveals gaps early
2. **Data Quality** - Garbage in, garbage out - profile richness is key
3. **User Experience** - Simple UI encourages engagement

---

## Slide 15: Conclusion

### Project Achievements

✅ Fully functional Digital Twin interview agent  
✅ RAG-powered with professional profile grounding  
✅ MCP integration for AI agent workflows  
✅ Cloud deployed on Vercel  
✅ 100% interview simulation pass rate  
✅ Real-time analytics dashboard

### Project URL
**https://digital-twin-rag-solution.vercel.app**

---

## Q&A Preparation

### Anticipated Questions

**Q: How do you prevent hallucinations?**
> A: Strong system prompt requiring strict context grounding + source attribution in responses

**Q: What happens if asked something not in the profile?**
> A: Graceful deflection: "That's not something I typically discuss, but I'd be happy to share about..."

**Q: How did you choose the chunking strategy?**
> A: Balance between semantic completeness and retrieval precision - each section becomes searchable unit

**Q: Why Groq over OpenAI?**
> A: Faster inference, lower latency for interview use case, cost-effective

**Q: How scalable is this solution?**
> A: Vercel handles scaling, Upstash provides serverless infrastructure, minimal ops overhead

---

## Appendix: Demo Checklist

### Before Demo
- [ ] Open browser to live site
- [ ] Clear previous chat history
- [ ] Verify internet connection
- [ ] Have backup screenshots ready

### Demo Commands
1. Ask: "Tell me about yourself and your professional background"
2. Ask: "What are your key technical skills?"
3. Ask: "Can you describe a challenging project you worked on?"
4. Show analytics dashboard
5. Toggle model selection

### If Demo Fails
- Show pre-recorded backup video
- Display screenshot of working interface
- Walk through code architecture instead
