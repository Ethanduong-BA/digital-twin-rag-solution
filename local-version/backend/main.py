import asyncio
import time
from typing import Any, Dict, List
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .settings import get_settings
from .vector_store import get_collection

app = FastAPI(title="Week2 Local RAG")
_settings = get_settings()


class QueryRequest(BaseModel):
    question: str


class SourceItem(BaseModel):
    id: str
    text: str
    metadata: Dict[str, Any]
    distance: float | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceItem]
    latency_ms: float


@app.get("/")
async def root() -> Dict[str, str]:
    return {"status": "ok", "message": "Week 2 local stack is running"}


@app.post("/query", response_model=QueryResponse)
async def query_rag(payload: QueryRequest) -> QueryResponse:
    start = time.perf_counter()
    collection = get_collection()
    result = collection.query(  # type: ignore[call-arg]
        query_texts=[payload.question],
        n_results=_settings.top_k,
        include_metadatas=True,
        include_distances=True,
    )
    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    ids = result["ids"][0]
    distances = result.get("distances", [[None] * len(documents)])[0]
    if not documents:
        raise HTTPException(status_code=404, detail="No matching passages found.")
    sources = [
        SourceItem(id=ids[idx], text=documents[idx], metadata=metadatas[idx], distance=distances[idx])
        for idx in range(len(documents))
    ]
    answer = await _call_ollama(payload.question, sources)
    elapsed = (time.perf_counter() - start) * 1000
    return QueryResponse(answer=answer, sources=sources, latency_ms=elapsed)


async def _call_ollama(question: str, sources: List[SourceItem]) -> str:
    context = "\n\n".join(
        f"Source {idx + 1} ({item.id}): {item.text[:800]}" for idx, item in enumerate(sources)
    )
    messages = [
        {"role": "system", "content": "You are a culinary expert who cites every answer."},
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}\nReturn cite ids inline.",
        },
    ]
    request_body = {"model": _settings.ollama_llm_model, "messages": messages, "stream": False}
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{_settings.ollama_base_url.rstrip('/')}/api/chat", json=request_body)
        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content")
        if not content:
            raise HTTPException(status_code=502, detail="Ollama returned an empty message.")
        return content


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await asyncio.sleep(0)
