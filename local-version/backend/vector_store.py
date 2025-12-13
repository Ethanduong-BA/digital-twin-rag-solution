from pathlib import Path
from chromadb import PersistentClient
from chromadb.api.models import Collection
from .embeddings import OllamaEmbeddingFunction
from .settings import get_settings

_settings = get_settings()
_db_path = Path(__file__).resolve().parent / _settings.chroma_db_path
_db_path.mkdir(parents=True, exist_ok=True)
_client = PersistentClient(path=str(_db_path))
_embedding_fn = OllamaEmbeddingFunction(
    base_url=_settings.ollama_base_url,
    model=_settings.ollama_embed_model,
)


def _build_collection() -> Collection:
    return _client.get_or_create_collection(
        name=_settings.chroma_collection,
        embedding_function=_embedding_fn,
    )


_collection = _build_collection()


def get_collection() -> Collection:
    return _collection


def reset_collection() -> Collection:
    try:
        _client.delete_collection(_settings.chroma_collection)
    except ValueError:
        pass
    global _collection
    _collection = _build_collection()
    return _collection
