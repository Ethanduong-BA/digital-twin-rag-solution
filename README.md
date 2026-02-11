# Digital Twin I (RAG Solution)

[![Upstash Vector](https://img.shields.io/badge/Vector-Upstash-00C694?style=for-the-badge)](https://upstash.com/vector)
[![Groq Cloud](https://img.shields.io/badge/LLM-Groq%20Cloud-FF6F3C?style=for-the-badge)](https://console.groq.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000?style=for-the-badge&logo=vercel)](https://digital-twin-rag-solution.vercel.app)

A **Digital Twin** — a personal AI agent capable of autonomously representing you in professional job interviews using RAG architecture and MCP integration.

## Architecture Overview

```
User/Recruiter ──► Interview Chat UI
                        │
                        ▼
              ragInterview() Server Action
                        │
         ┌──────────────┴──────────────┐
         ▼                              ▼
  Upstash Vector                    Groq LLaMA 3.1
  (profile search)                  (answer generation)
         │                              │
         └──────────────┬──────────────┘
                        ▼
            First-Person Answer + Sources
                        
              ──── MCP Integration ────
                        
  VS Code Copilot ──► search_profile / get_profile_section / run_interview
  Claude Desktop ──┘

              ──── Interview Simulation ────
                        
  Job Descriptions (/jobs) ──► Simulation Script ──► Results (/interview)
```

## Features

- **Interview Simulation UI**: Web-based chat interface for interview Q&A
- **RAG-Powered Answers**: Responses grounded in professional profile data
- **First-Person Persona**: Answers as "I" with authentic voice
- **MCP Tools**: `search_profile`, `get_profile_section`, and `run_interview` for AI agent integration
- **Interview Simulation**: Batch testing against real job descriptions
- **Source Citations**: See which profile sections were used for each answer
- **Analytics Dashboard**: Track query patterns and response quality

## Repository Layout

| Path | Purpose |
| --- | --- |
| [app/](app) | Next.js App Router views and server actions |
| [app/actions-interview.ts](app/actions-interview.ts) | Interview RAG server action with Digital Twin persona |
| [app/api/[transport]/route.ts](app/api/[transport]/route.ts) | MCP server endpoint with 3 tools |
| [app/analytics/page.tsx](app/analytics/page.tsx) | Analytics dashboard |
| [components/interview-chat.tsx](components/interview-chat.tsx) | Interview simulation chat UI |
| [lib/profile-search.ts](lib/profile-search.ts) | Profile vector search with Zod schemas |
| [lib/interview-simulator.ts](lib/interview-simulator.ts) | Interview simulation engine for MCP |
| [lib/analytics.ts](lib/analytics.ts) | Redis-backed analytics tracking |
| [data/profile.json](data/profile.json) | Professional profile data |
| [jobs/](jobs) | Real job descriptions for simulation |
| [interview/](interview) | Interview simulation results |
| [scripts/upsert-profile.ts](scripts/upsert-profile.ts) | Embed profile data into Upstash Vector |
| [scripts/test-interview.ts](scripts/test-interview.ts) | Automated interview testing harness |
| [scripts/run-interview-simulation.ts](scripts/run-interview-simulation.ts) | Full interview simulation runner |

## Quick Start

```bash
# Install dependencies
pnpm install

# Embed profile data into vector database
pnpm upsert-profile

# Run automated interview tests (optional)
pnpm test-interview

# Start the development server
pnpm dev
```

Visit `http://localhost:3000` and start interviewing the Digital Twin!

## Environment Variables

Create `.env.local` with:

```bash
# Required
UPSTASH_VECTOR_REST_URL=https://your-index.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-token
GROQ_API_KEY=your-groq-api-key

# Digital Twin Identity
OWNER_NAME=Your Full Name
OWNER_FIRST_NAME=YourFirstName

# Optional (for analytics)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

| Variable | Required | Description |
| --- | --- | --- |
| `UPSTASH_VECTOR_REST_URL` | Yes | REST endpoint for Upstash Vector database |
| `UPSTASH_VECTOR_REST_TOKEN` | Yes | Bearer token for Upstash Vector |
| `GROQ_API_KEY` | Yes | Groq Cloud API key |
| `OWNER_NAME` | Yes | Full name displayed in UI (e.g., "Aniraj Khadgi") |
| `OWNER_FIRST_NAME` | Yes | First name for welcome message (e.g., "Aniraj") |
| `UPSTASH_REDIS_REST_URL` | No | Analytics storage (falls back to in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis authentication |

## MCP Integration

The project exposes MCP tools for AI agent integration:

### Tools Available

| Tool | Description |
| --- | --- |
| `search_profile` | Semantic search across professional profile |
| `get_profile_section` | Retrieve specific section (summary, experience, skills, etc.) |
| `run_interview` | Run interview simulation against job requirements |

### VS Code MCP Configuration

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "digital-twin": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "digital-twin": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

## Profile Data Structure

```
data/profile.json
├── personalInfo (name, title, location, work rights)
├── professionalSummary (elevator pitch, unique value proposition)
├── skills (software_development, business_analytics, technical, soft_skills)
├── experience (roles, responsibilities, achievements, metrics)
├── education (degrees, coursework)
├── certifications (AWS, Docker, Terraform)
├── projects (professional + personal)
├── interview_qa (pre-crafted responses)
├── preferences (role interests, culture fit)
└── contact (email, LinkedIn, portfolio, GitHub)
```

## Example Interview Questions

| Question | Expected Topics |
| --- | --- |
| "Tell me about yourself" | Professional summary, dual expertise, location |
| "What are your technical skills?" | React, Next.js, Python, SQL, analytics tools |
| "Describe your experience at LIS Nepal" | B2B SaaS, 50K+ users, API improvements |
| "What are your key achievements?" | 40% API improvement, 25% NPS increase |
| "Tell me about your education" | Master's at USC, Bachelor's from Pokhara |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm upsert-profile` | Embed profile.json into Upstash Vector |
| `pnpm test-interview` | Run automated interview test suite |
| `pnpm run-simulation` | Run full interview simulation against job descriptions |

## Documentation

- [docs/implementation-plan.md](docs/implementation-plan.md) – Weekly implementation plan and progress
- [docs/design.md](docs/design.md) – Technical design decisions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – System architecture and components
- [docs/mcp.md](docs/mcp.md) – MCP integration details
- [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) – Branching and PR guidelines
- [docs/performance-improvement-aniraj.md](docs/performance-improvement-aniraj.md) – Week 4 refinement results

## Deployment

**Live Demo:** https://digital-twin-rag-solution.vercel.app

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

### Environment Variables (Vercel Dashboard)

Add these in Vercel Project Settings → Environment Variables:

| Variable | Description |
| --- | --- |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector endpoint |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector token |
| `GROQ_API_KEY` | Groq Cloud API key |
| `OWNER_NAME` | Full name for UI |
| `OWNER_FIRST_NAME` | First name for welcome message |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint (analytics) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

## Course Reference

This project is part of the [Digital Twin I Course](https://www.ausbizconsulting.com.au/courses/digitaltwin-I) from ausbiz Consulting.