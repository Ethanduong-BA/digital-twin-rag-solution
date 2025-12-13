from typing import List
import httpx
from chromadb.utils.embedding_functions import EmbeddingFunction


class OllamaEmbeddingFunction(EmbeddingFunction):
    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self._client = httpx.Client(timeout=60)

    def __call__(self, texts: List[str]) -> List[List[float]]:
        vectors: List[List[float]] = []
        for text in texts:
            payload = {"model": self.model, "prompt": text}
            response = self._client.post(f"{self.base_url}/api/embeddings", json=payload)
            response.raise_for_status()
            body = response.json()
            vectors.append(body["embedding"])
        return vectors

    def close(self) -> None:
        self._client.close()

    def __del__(self) -> None:
        try:
            self.close()
        except Exception:
            pass
