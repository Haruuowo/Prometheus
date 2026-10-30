from typing import Dict, Any, List
from backend.brain.memory import memory_store


def save_note(uid: str, title: str, content: str, url: str = "") -> List[Dict[str, Any]]:
    return memory_store.ingest_document(uid=uid, title=title, content=content, source_type="note", url=url)


def search_notes(uid: str, query: str) -> List[Dict[str, Any]]:
    return memory_store.search_second_brain(uid=uid, query=query, top_k=4)

