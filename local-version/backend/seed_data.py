import json
from pathlib import Path
from typing import Any, Dict, List
from .vector_store import reset_collection


def _format_text(entry: Dict[str, Any]) -> str:
    parts: List[str] = [f"{entry.get('name')}: {entry.get('description', '')}"]
    parts.append(f"Cuisine: {entry.get('cuisine')}")
    if entry.get('ingredients'):
        parts.append("Ingredients: " + ", ".join(entry['ingredients']))
    if entry.get('cooking_method'):
        parts.append(f"Method: {entry['cooking_method']}")
    if entry.get('dietary_tags'):
        parts.append("Diet: " + ", ".join(entry['dietary_tags']))
    if entry.get('nutritional_benefits'):
        parts.append(f"Nutrition: {entry['nutritional_benefits']}")
    if entry.get('cultural_context'):
        parts.append(f"Culture: {entry['cultural_context']}")
    return "\n".join(parts)


def _load_dataset() -> List[Dict[str, Any]]:
    data_path = Path(__file__).resolve().parents[2] / "data" / "food_data.json"
    with data_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    entries = _load_dataset()
    collection = reset_collection()
    ids: List[str] = []
    documents: List[str] = []
    metadata: List[Dict[str, Any]] = []
    for item in entries:
        ids.append(item.get("id") or f"food-local-{len(ids)+1}")
        documents.append(_format_text(item))
        metadata.append(
            {
                "name": item.get("name"),
                "cuisine": item.get("cuisine"),
                "dietary_tags": item.get("dietary_tags", []),
                "spice_level": item.get("spice_level"),
                "preparation_time": item.get("preparation_time"),
            }
        )
    collection.add(ids=ids, documents=documents, metadatas=metadata)
    print(f"Seeded {len(ids)} documents into collection '{collection.name}'.")


if __name__ == "__main__":
    main()
