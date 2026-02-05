# Digital Twin I (RAG Solution)

[![Upstash Vector](https://img.shields.io/badge/Vector-Upstash-00C694?style=for-the-badge)](https://upstash.com/vector)
[![Groq Cloud](https://img.shields.io/badge/LLM-Groq%20Cloud-FF6F3C?style=for-the-badge)](https://console.groq.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)

A **Digital Twin** — a personal AI agent capable of autonomously representing its creator (Aniraj Khadgi) in professional job interviews using RAG architecture and MCP integration.

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
                        
  VS Code Copilot ──► search_profile / get_profile_section
  Claude Desktop ──┘
```

## Features

- **Interview Simulation UI**: Web-based chat interface for interview Q&A
- **RAG-Powered Answers**: Responses grounded in professional profile data
- **First-Person Persona**: Answers as "I" with authentic voice
- **MCP Tools**: `search_profile` and `get_profile_section` for AI agent integration
- **Source Citations**: See which profile sections were used for each answer

## Repository Layout

| Path | Purpose |
| --- | --- |
| [app/](app) | Next.js App Router views and server actions |
| [app/actions-interview.ts](app/actions-interview.ts) | Interview RAG server action with Digital Twin persona |
| [app/api/[transport]/route.ts](app/api/[transport]/route.ts) | MCP server endpoint for profile tools |
| [components/interview-chat.tsx](components/interview-chat.tsx) | Interview simulation chat UI |
| [lib/profile-search.ts](lib/profile-search.ts) | Profile vector search with Zod schemas |
| [data/profile.json](data/profile.json) | Professional profile data (experience, skills, projects, Q&A) |
| [scripts/upsert-profile.ts](scripts/upsert-profile.ts) | CLI to embed profile data into Upstash Vector |
| [scripts/test-interview.ts](scripts/test-interview.ts) | Automated interview testing harness |
| [docs/DIGITAL_TWIN_PLAN.md](docs/DIGITAL_TWIN_PLAN.md) | 6-week implementation plan |

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

| Variable | Description |
| --- | --- |
| `UPSTASH_VECTOR_REST_URL` | REST endpoint for Upstash Vector database |
| `UPSTASH_VECTOR_REST_TOKEN` | Bearer token for Upstash Vector |
| `GROQ_API_KEY` | Groq Cloud API key |

## MCP Integration

The project exposes MCP tools for AI agent integration:

### Tools Available

| Tool | Description |
| --- | --- |
| `search_profile` | Semantic search across professional profile |
| `get_profile_section` | Retrieve specific section (summary, experience, skills, etc.) |

### VS Code MCP Configuration

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

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "digital-twin": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000/api/sse"]
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

## Documentation

- [docs/DIGITAL_TWIN_PLAN.md](docs/DIGITAL_TWIN_PLAN.md) – 6-week implementation plan
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – System architecture and components
- [docs/mcp.md](docs/mcp.md) – MCP integration details
- [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) – Branching and PR guidelines

## Course Reference

This project is part of the [Digital Twin I Course](https://www.ausbizconsulting.com.au/courses/digitaltwin-I) from ausbiz Consulting.