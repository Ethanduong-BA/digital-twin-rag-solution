# Week 4 Plan — Production Web RAG App + Portfolio Showcase

**Goal (end of Week 4):** ship a public, portfolio-ready Food RAG web app that replicates Week 3 cloud RAG behavior, adds required UX enhancements, and includes professional documentation + demo artifacts.

This plan is written to match the Week 4 submission checklist you shared.

---

## 0) Current State (Already Done)

✅ Next.js App Router web app exists (Next.js 16+) with Server Actions calling Upstash Vector + Groq.

✅ Chat-like UI exists and shows:
- Vector search results (sources)
- LLM-generated answer
- Loading + error states

✅ Regression harness exists (`pnpm test-queries`) and produces artifacts under `docs/test-results/`.

✅ Documentation baseline exists (`docs/ARCHITECTURE.md`, `docs/TESTING_RESULTS.md`, etc.).

---

## 1) Week 4 Required Outcomes (What must exist at submission)

### Required URLs / Proof
- [ ] Public GitHub repository URL
- [ ] Public Vercel deployment URL (works worldwide)
- [ ] Evidence of v0.dev workflow (screenshots of prompts + “Fix with v0” iterations + “Publish”)

### Required App Features
- [ ] Modern responsive chat UI (already mostly done)
- [ ] Shows **sources** + **answer** (already done)
- [ ] Loading and error states (already done)
- [ ] **Model selection dropdown**: `llama-3.1-8b-instant` and `llama-3.1-70b-versatile`

### Required Enhancements
- [ ] Conversation history / chat memory
- [ ] Query suggestions based on dataset categories
- [ ] Example queries section
- [ ] Social sharing (copy/share answer)
- [ ] Basic usage tracking (popular queries, response times, success/failure)

### Required Portfolio Artifacts
- [ ] README includes Live Demo link, screenshots/GIFs, setup, metrics, and architecture diagram
- [ ] Demo video (2–3 minutes)
- [ ] Python reference code included in repo under `/python-reference/` (or an equivalent clearly documented folder)

---

## 2) Implementation Plan (Step-by-step)

### Phase A — Productize the Chat Experience (Core UX)

**A1. Add chat message history (multi-turn UI)**
- [ ] Store messages as an array: `{ role: 'user' | 'assistant', content, createdAt, modelUsed, sources }`
- [ ] Render a scrollable chat transcript with distinct bubbles.
- [ ] Keep current “Sources” rendering, but associate it with the assistant message.
- [ ] Add "Clear chat" button.

**A2. Add model selection dropdown**
- [ ] UI dropdown with:
  - `llama-3.1-8b-instant`
  - `llama-3.1-70b-versatile`
- [ ] Pass selected model to the server action.
- [ ] Server action uses the selected model for Groq call.

**Acceptance criteria:**
- You can ask multiple questions in a row and see a full conversation.
- Changing the model affects the next assistant response.

---

### Phase B — Guidance + Discovery (Example Queries + Suggestions)

**B1. Example queries section**
- [ ] Add a small panel above/below input with clickable example prompts.
- [ ] Examples should cover: spicy, vegan, summer food, high-protein, regional cuisine.

**B2. Category-based suggestions (lightweight)**
Two acceptable approaches:
1. **Static suggestions** (fastest):
   - [ ] Hardcode categories (e.g., "Spicy", "Vegan", "Picnic", "Seafood", "Dessert") and map to queries.
2. **Data-driven suggestions** (more impressive):
   - [ ] Parse a small list of cuisines/tags from `data/food_data.json` and generate suggestion chips.

**Acceptance criteria:**
- A new user can click a prompt and get a useful answer with sources.

---

### Phase C — Sharing Features (Portfolio polish)

**C1. Copy/share actions**
- [ ] Add “Copy answer” button.
- [ ] Add “Copy Q&A” button.
- [ ] Optional: Web Share API on mobile.

**Acceptance criteria:**
- One click copies a nicely formatted result.

---

### Phase D — Analytics & Monitoring (Required)

**D1. Capture basic metrics**
Track at minimum:
- query text (or hashed query for privacy)
- selected model
- total latency
- Upstash latency
- Groq latency
- success/failure + error message

**D2. Persist logs** (choose one)
- Option 1 (simplest):
  - [ ] Append JSON lines to a server-side log (works locally, not ideal on serverless)
- Option 2 (recommended for Vercel):
  - [ ] Store analytics events in Upstash Redis (or Upstash Vector metadata) or another managed store
  - [ ] Add an internal endpoint or server action to query stats

**D3. Optional admin dashboard**
- [ ] Create a protected page to view query counts, p95 latency, failure rate

**Acceptance criteria:**
- You can answer: “What are the most common queries?” and “How fast is it?”

---

### Phase E — v0.dev Workflow + Deployment

**E1. v0.dev build iteration (required process)**
- [ ] Paste reference code (Python + current TS) into v0.dev prompt.
- [ ] Use “Fix with v0” at least 1–2 times and screenshot the improvements.

**E2. Publish**
- [ ] Use v0.dev Publish workflow to create repo + deploy to Vercel.
- [ ] Confirm env vars set in v0/Vercel:
  - `UPSTASH_VECTOR_REST_URL`
  - `UPSTASH_VECTOR_REST_TOKEN`
  - `GROQ_API_KEY`

**E3. Verify production**
- [ ] Test on live URL from phone + desktop.
- [ ] Validate model selection works.
- [ ] Validate errors look professional.

---

### Phase F — Documentation + Portfolio Package

**F1. Repository organization**
- [ ] Add `/python-reference/` and place your Week 2/3 Python reference code there.
- [ ] Keep current `local-version/` if you want, but clearly explain in README.

**F2. README upgrade**
Must include:
- [ ] Project overview + tech stack
- [ ] Live demo URL + GitHub URL
- [ ] Features list (with screenshots/GIFs)
- [ ] Architecture diagram (image or clean diagram)
- [ ] “Week 2 → Week 3 → Week 4” journey narrative
- [ ] Setup instructions
- [ ] Performance metrics summary (from `pnpm test-queries` output)

**F3. Demo video**
- [ ] 2–3 minutes showing:
  - UI overview
  - 3–5 diverse queries
  - model switch
  - mobile responsiveness
  - quick mention of v0 workflow

---

## 3) Testing Plan (How to prove it works)

### Local checks
- [ ] `pnpm dev` (manual UX testing)
- [ ] `pnpm build` (deployment readiness)
- [ ] `pnpm test-queries` (regression)

### Production checks
- [ ] Run 5–10 example queries on the deployed Vercel URL
- [ ] Validate env vars are correctly configured

---

## 4) Suggested Timeline (End-of-week delivery)

**Day 1–2:** Phase A (chat history + model dropdown)

**Day 3:** Phase B + C (suggestions + sharing)

**Day 4:** Phase D (analytics) + test pass

**Day 5:** Phase E + F (publish, README, screenshots/GIFs, record demo video)

---

## 5) Definition of Done (Week 4)

All items below must be true:
- [ ] Live Vercel URL works publicly
- [ ] GitHub repo is public and clean
- [ ] App shows sources + answer, with a chat transcript (not single-turn)
- [ ] Model dropdown changes Groq model
- [ ] Example queries + suggestions exist
- [ ] Sharing exists
- [ ] Analytics exists and can be demonstrated
- [ ] README is portfolio-grade + includes links and visuals
- [ ] Demo video is recorded
- [ ] Python reference folder exists and is documented
