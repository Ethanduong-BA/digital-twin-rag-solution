# Local Reference Stack (Week 2)

This folder preserves the Week 2 FastAPI + Ollama + ChromaDB implementation so you can compare the pre-migration stack with the new Next.js + Upstash + Groq cloud build. The goal is parity with the original functionality: serve RAG answers about the food dataset while running everything on a single machine.

## Architecture

```
User ➜ FastAPI endpoint ➜ ChromaDB (local) ➜ Ollama (LLM + embeddings)
```

Key characteristics:
- All data, embeddings, and inference happen locally on your workstation.
- ChromaDB persists vectors to `local-version/vector_store/`.
- Ollama provides both the embedding model (`nomic-embed-text`) and the response model (`llama3`).

## Prerequisites

1. Python 3.11+
2. [Ollama](https://ollama.com/download) with the following models pulled:
   ```bash
   ollama pull nomic-embed-text
   ollama pull llama3
   ```
3. Node-based cloud stack remains in the repo root for side-by-side comparisons.

## Setup

```bash
cd local-version
python -m venv .venv
. .venv/Scripts/activate     # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Seed ChromaDB with the shared dataset
python backend/seed_data.py

# Start FastAPI
uvicorn backend.main:app --reload
```

The FastAPI server listens on `http://localhost:8000`. Send POST requests to `/query` with `{ "question": "..." }` to receive an answer plus the matching source IDs.

## Environment Variables

Create `local-version/.env` (optional) to override defaults:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3
CHROMA_DB_PATH=vector_store
CHROMA_COLLECTION=food-rag-week2
TOP_K=5
```

## Files

- `backend/main.py` – FastAPI service that handles queries and streams answers
- `backend/seed_data.py` – Loads `../data/food_data.json` and populates ChromaDB
- `backend/embeddings.py` – Thin wrapper around the Ollama embeddings endpoint
- `backend/settings.py` – Centralizes paths, defaults, and env handling
- `requirements.txt` – Python dependencies

## Workflow With Cloud Version

1. Update the shared dataset in `data/food_data.json`.
2. Re-run `python backend/seed_data.py` to refresh ChromaDB (local stack).
3. Run `pnpm upsert-data` from the repo root to refresh Upstash (cloud stack).
4. Capture latency/results from both systems for documentation.

By keeping this folder in the same repository, you can create Git tags such as `v1.0-local` (commit with `/local-version`) and `v2.0-cloud` (commit on `cloud-migration`) before opening the final PR.
