import re
import json
import time
import math
from pathlib import Path
from typing import List, Dict, Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_FACTS = [
    {"fact": "Luna is a personal AI assistant and multi-tool companion built by Kai.", "source": "core_memory"},
    {"fact": "Luna manages Kai's Second Brain knowledge base, personal notes, schedule, and email triage.", "source": "core_memory"},
]


class UserMemoryStore:
    """
    Manages per-user Short-Term Chat History, Long-Term Facts, and Second Brain RAG chunks.
    Persists to backend/data/{uid}.json.
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _user_file(self, uid: str) -> Path:
        safe_uid = re.sub(r"[^a-zA-Z0-9_\-]", "_", uid or "kai_local")
        return DATA_DIR / f"{safe_uid}.json"

    def _get_user_data(self, uid: str) -> Dict[str, Any]:
        if uid in self._cache:
            return self._cache[uid]

        fpath = self._user_file(uid)
        if fpath.exists():
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._cache[uid] = data
                    return data
            except Exception:
                pass

        data = {
            "uid": uid,
            "short_term": [],
            "long_term": list(DEFAULT_FACTS),
            "second_brain": [
                {
                    "id": "doc_welcome",
                    "title": "Personal AI System Overview",
                    "source_type": "note",
                    "url": "",
                    "content": "Luna is configured as a personal AI system (inspired by Odysseus / Jarvis) combining conversational AI, a local Second Brain RAG knowledge store, and personal productivity tools.",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M"),
                }
            ],
        }
        self._cache[uid] = data
        self._save_user_data(uid)
        return data

    def _save_user_data(self, uid: str):
        if uid not in self._cache:
            return
        fpath = self._user_file(uid)
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(self._cache[uid], f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Memory] Failed to save data for {uid}: {e}")

    def get_recent_messages(self, uid: str, limit: int = 16) -> List[Dict[str, str]]:
        data = self._get_user_data(uid)
        return data.get("short_term", [])[-limit:]

    def add_message(self, uid: str, role: str, content: str):
        data = self._get_user_data(uid)
        data.setdefault("short_term", []).append({
            "role": role,
            "content": content,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        })
        if len(data["short_term"]) > 40:
            data["short_term"] = data["short_term"][-40:]

        if role == "user":
            self._auto_extract_fact(uid, content)

        self._save_user_data(uid)

    def reset_short_term(self, uid: str):
        data = self._get_user_data(uid)
        data["short_term"] = []
        self._save_user_data(uid)

    def _auto_extract_fact(self, uid: str, text: str):
        patterns = [
            r"\bremember (?:that )?(.+)",
            r"\bmy name is ([a-zA-Z0-9_ ]+)",
            r"\bi am working on (.+)",
            r"\bmy favorite (.+ is .+)",
            r"\bsave to (?:second )?brain[:\-]?\s*(.+)",
        ]
        for pat in patterns:
            m = re.search(pat, text, flags=re.IGNORECASE)
            if m:
                fact_text = m.group(0).strip()
                data = self._get_user_data(uid)
                existing = {f.get("fact", "").lower() for f in data.get("long_term", [])}
                if fact_text.lower() not in existing:
                    data.setdefault("long_term", []).append({
                        "fact": fact_text,
                        "source": "auto_memory",
                        "timestamp": time.strftime("%Y-%m-%d %H:%M"),
                    })
                break

    def ingest_document(
        self,
        uid: str,
        title: str,
        content: str,
        source_type: str = "note",
        url: str = "",
    ) -> List[Dict[str, Any]]:
        data = self._get_user_data(uid)
        raw_text = (content or "").strip()
        if not raw_text:
            return []

        paragraphs = [p.strip() for p in re.split(r"\n{2,}|(?<=[.!?])\s+(?=[A-Z])", raw_text) if p.strip()]
        chunks = []
        current = ""
        for p in paragraphs:
            if len(current) + len(p) < 420:
                current = f"{current} {p}".strip()
            else:
                if current:
                    chunks.append(current)
                current = p
        if current:
            chunks.append(current)

        created = []
        for idx, chunk_text in enumerate(chunks):
            chunk_title = title if len(chunks) == 1 else f"{title} (Part {idx + 1})"
            entry = {
                "id": f"sb_{int(time.time() * 1000)}_{idx}",
                "title": chunk_title,
                "source_type": source_type,
                "url": url,
                "content": chunk_text,
                "timestamp": time.strftime("%Y-%m-%d %H:%M"),
            }
            data.setdefault("second_brain", []).append(entry)
            created.append(entry)

        self._save_user_data(uid)
        return created

    def search_second_brain(self, uid: str, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        data = self._get_user_data(uid)
        docs = list(data.get("second_brain", []))
        facts = [
            {
                "id": f"fact_{i}",
                "title": f"Memory ({f.get('source', 'fact')})",
                "source_type": "long_term_memory",
                "url": "",
                "content": f.get("fact", ""),
                "timestamp": f.get("timestamp", ""),
            }
            for i, f in enumerate(data.get("long_term", []))
        ]

        all_items = docs + facts
        if not query or not query.strip():
            return docs[-top_k:][::-1]

        q_tokens = set(re.findall(r"[a-z0-9]{2,}", query.lower()))
        if not q_tokens:
            return docs[-top_k:][::-1]

        scored = []
        for item in all_items:
            text_blob = f"{item.get('title', '')} {item.get('content', '')}".lower()
            d_tokens = re.findall(r"[a-z0-9]{2,}", text_blob)
            if not d_tokens:
                continue
            overlap = sum(1 for t in d_tokens if t in q_tokens)
            unique_overlap = len(q_tokens.intersection(d_tokens))
            if unique_overlap > 0:
                boost = 1.6 if item.get("source_type") != "long_term_memory" else 1.0
                score = (unique_overlap * 2.5 + overlap * 0.5) * boost / math.sqrt(len(d_tokens) + 4)
                scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:top_k]]

    def list_second_brain(self, uid: str) -> Dict[str, Any]:
        data = self._get_user_data(uid)
        return {
            "notes": list(reversed(data.get("second_brain", []))),
            "facts_count": len(data.get("long_term", [])),
            "short_term_count": len(data.get("short_term", [])),
        }


memory_store = UserMemoryStore()
