from functools import lru_cache
from pathlib import Path
from pydantic import BaseSettings


class LocalSettings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_llm_model: str = "llama3"
    chroma_db_path: str = "vector_store"
    chroma_collection: str = "food-rag-week2"
    top_k: int = 5

    class Config:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> LocalSettings:
    return LocalSettings()
