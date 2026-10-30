import re
import time
from typing import Dict, Any


def detect_intent(text: str) -> Dict[str, Any]:
    """
    Fast intent & tool router for personal AI assistant:
    Detects Gmail, Calendar, Second Brain Notes, or General Conversation.
    """
    t0 = time.perf_counter()
    raw = (text or "").strip()
    lower = raw.lower()

    def _result(category: str, name: str, params: dict, emotion: str = "chill"):
        ms = max(1, round((time.perf_counter() - t0) * 1000))
        return {
            "category": category,
            "intent": name,
            "params": params,
            "emotion": emotion,
            "ms": ms,
        }

    # 1. Gmail Read Tools
    if re.search(r"\b(summarize|check|triage|unread)\b.*?\b(inbox|emails?|mail)\b", lower) or "inbox" in lower:
        return _result("tool", "gmail.summarize_inbox", {}, "upbeat")

    if re.search(r"\b(search|find|look up)\b.*?\b(emails?|mail)\b", lower):
        q_match = re.search(r"(?:for|about|from)\s+(.+)$", raw, re.I)
        query = q_match.group(1).strip() if q_match else raw
        return _result("tool", "gmail.search_mail", {"query": query}, "supportive")

    # 2. Calendar & Tasks Tools
    if re.search(r"\b(schedule|add|book)\b.*?\b(meeting|event|calendar|task|reminder)\b", lower):
        return _result("tool", "calendar.add_event", {"title": raw, "when": "Tomorrow, 4:00 PM"}, "upbeat")

    if re.search(r"\b(calendar|schedule|events|agenda|what's on)\b", lower):
        return _result("tool", "calendar.list_events", {}, "supportive")

    # 3. Second Brain Notes / Ingest
    save_match = re.search(r"^(?:save to (?:second )?brain|remember that|take a note|save note)[:\-]?\s*(.+)", raw, re.I)
    if save_match:
        note_content = save_match.group(1).strip()
        return _result(
            "tool",
            "notes.save_note",
            {"title": f"Note ({time.strftime('%H:%M')})", "content": note_content},
            "happy",
        )

    if re.search(r"\b(second brain|my notes|search notes)\b", lower):
        return _result("tool", "notes.search_notes", {"query": raw}, "supportive")

    # 4. General Conversation
    emotion = "chill"
    if any(w in lower for w in ["love", "awesome", "thank", "hi", "hey", "hello"]):
        emotion = "happy"
    elif any(w in lower for w in ["roast", "bug", "code", "funny"]):
        emotion = "smug"
    elif any(w in lower for w in ["help", "how", "what", "why", "explain"]):
        emotion = "supportive"

    return _result("chat", "conversation", {}, emotion)
