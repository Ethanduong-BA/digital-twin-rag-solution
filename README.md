# Digital Twin


📂 Repository Structure
This project follows a production-grade AI engineering architecture:

/docs/prd.md: The Product Requirements Document defining the system's goals and technical constraints.

/agents.md: The master instruction manual governing the AI Twin's behavior and personality.

/data-pipeline/raw_data/profile.json: The core knowledge base (Grounding Data) containing my professional history in STAR format.

/rag-interface/: The Next.js 16 frontend application (built with Tailwind CSS and Shadcn UI).\



🎯 Project Overview
The Digital Twin is built to solve the "passive resume" problem by turning my professional background into an interactive service:

Context-Aware Chat: Answers specific questions about my 3+ years of UX/UI experience and my current Master of Business Analytics studies.

Strategic Representation: Bridges the gap between user-centered design and data-driven decision-making.

Proactive Lead Capture: Identifies recruiter intent and offers to schedule interviews or provide contact details.

Autonomous Workflow: Uses Vercel AI SDK 6 to perform tool-calling for data retrieval and scheduling.



🛠️ Tech Stack
Framework: Next.js 16 (App Router) & TypeScript.

UI/UX: Tailwind CSS & Shadcn UI.

AI Intelligence: Vercel AI SDK 6 & Claude 3.5 Sonnet.

Database: Neon Postgres (Conversations) & Upstash (Vector Memory).



� Scripts

**Upload to Upstash Vector Database:**
```bash
cd data-pipeline && npx ts-node scripts/upload-to-upstash.ts
```



�🚀 Key Documentation Links
📖 [Read the PRD (Product Requirements Document)](./docs/prd.md)

🤖 [AI Agent Instructions](./agents.md)

📊 [Explore the Knowledge Base (JSON)](./data-pipeline/raw_data/profile.json)
