# Digital Twin I (RAG Solution) - Project Plan

## Project Overview

This project focuses on designing and deploying a **Digital Twin**—a personal AI agent capable of autonomously representing its creator in professional job interviews. By leveraging Retrieval-Augmented Generation (RAG) and the Model Context Protocol (MCP), the system semantically searches its own professional history to provide factual, context-aware answers to recruiters and hiring managers.

---

## Technical Domains Covered

1. **RAG Architecture**: Implementing semantic search using vector databases to ground AI responses in factual studies and professional experiences
2. **MCP Server Development**: Building Model Context Protocol servers (using Next.js/TypeScript) to integrate local data with AI agents
3. **Data Pipeline Engineering**: Annotating, enriching, and embedding professional profiles (JSON) into vector storage
4. **AI-Powered Workflow**: Utilizing VS Code Insiders and GitHub Copilot to drive development and simulate agentic behaviours
5. **Team Collaboration**: Managing a software lifecycle using GitHub for version control (Pull Requests, branches) and ClickUp for project management

---

## Weekly Deliverables

### Week 1: Project Setup & Foundation

**Focus**: Environment setup, data pipeline foundation, and initial profile creation

**Deliverables**:
- [ ] Environment setup (VS Code Insiders, GitHub Copilot, Node.js)
- [ ] Repository structure established
- [ ] Initial `profile.json` created with professional data
- [ ] Raw data pipeline structure in `/data-pipeline/raw_data/`
- [ ] ClickUp project board configured
- [ ] GitHub workflow understanding (branching strategy)
- [ ] First calibration call completed

---

### Week 2: Data Pipeline & Vector Database

**Focus**: Data enrichment, embedding generation, and vector database setup

**Deliverables**:
- [ ] Profile data annotated and enriched
- [ ] Vector database configured (Upstash Vector or similar)
- [ ] Embedding model selected and implemented
- [ ] Data ingestion pipeline functional
- [ ] Semantic search tested with sample queries
- [ ] Documentation for data pipeline
- [ ] Weekly calibration call completed

---

### Week 3: MCP Integration & Interview Simulation

**Focus**: MCP server development and basic interview simulation capability

**Deliverables**:
- [ ] MCP server scaffolding in `/mcp-server/`
- [ ] MCP tools defined (Zod schemas)
- [ ] Server actions implemented for RAG queries
- [ ] Interview simulation basic functionality
- [ ] Integration with GitHub Copilot agent mode tested
- [ ] Error handling and edge cases addressed
- [ ] Weekly calibration call completed

---

### Week 4: Refinement & Enhancement

**Focus**: Polish existing features, improve accuracy, and optimize performance

**Deliverables**:
- [ ] RAG response quality improvements
- [ ] Context window optimization
- [ ] Additional professional data points added
- [ ] User experience refinements
- [ ] Performance testing and optimization
- [ ] Bug fixes and stability improvements
- [ ] Code review and refactoring
- [ ] Weekly calibration call completed

---

### Week 5: Final Features & Presentation Outline

**Focus**: Complete remaining features and prepare presentation materials

**Deliverables**:
- [ ] All core features finalized
- [ ] Presentation outline created
- [ ] Demo script prepared
- [ ] Technical documentation completed
- [ ] README.md updated with setup instructions
- [ ] Final testing and QA
- [ ] Presentation slides drafted
- [ ] Weekly calibration call completed

---

### Week 6: Presentation Week

**Focus**: Final presentation and project showcase

**Deliverables**:
- [ ] Final presentation delivered
- [ ] Live demo completed
- [ ] Q&A session handled
- [ ] Project retrospective documented
- [ ] All code submitted and merged
- [ ] Final documentation published

---

## Project Options

### Option 1: Agent Mode in VS Code
- Use GitHub Copilot Agent Mode to interact with the Digital Twin
- Focus on MCP server integration
- Command-line/IDE-based interaction

### Option 2: Web-Based Digital Twin UI
- Build a web interface for the Digital Twin
- Next.js frontend application
- Visual chat/interview interface

---

## Supporting Tools

| Tool | Purpose |
|------|---------|
| **VS Code Insiders** | Primary IDE with Copilot integration |
| **GitHub Copilot** | AI-assisted development and agent mode |
| **ClickUp** | Project management and task tracking |
| **GitHub** | Version control, PRs, and collaboration |
| **Upstash Vector** | Vector database for semantic search |

---

## GitHub Workflow

1. **Main Branch**: Production-ready code only
2. **Feature Branches**: `feature/[feature-name]`
3. **Pull Requests**: Required for all merges to main
4. **Code Reviews**: Peer review before merging
5. **Commits**: Descriptive commit messages

---

## Weekly Calibration Calls

- Review progress against deliverables
- Address blockers and challenges
- Plan next week's priorities
- Receive feedback and guidance

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│         (VS Code Agent Mode / Web Interface)            │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   MCP Server                             │
│              (Next.js / TypeScript)                      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  RAG Pipeline                            │
│         (Semantic Search + Context Retrieval)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Vector Database                          │
│            (Upstash Vector / Embeddings)                │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Data Pipeline                           │
│        (profile.json → Enrichment → Embeddings)         │
└─────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] Digital Twin can accurately answer professional interview questions
- [ ] Responses are grounded in factual data from profile.json
- [ ] System demonstrates semantic understanding (not keyword matching)
- [ ] MCP integration works seamlessly
- [ ] Code is well-documented and maintainable
- [ ] Presentation effectively demonstrates capabilities

---

## Resources

- [Course Page](https://www.ausbizconsulting.com.au/courses/digitaltwin-I)
- PRD: `/docs/prd.md`
- Agent Instructions: `/agents.md`
- Raw Data: `/data-pipeline/raw_data/profile.json`
