import re
import time
from typing import Dict, Any


def detect_intent(text: str) -> Dict[str, Any]:
    """
    Fast intent & tool router for Odysseus personal AI assistant:
    Supports:
    - Gmail / Inbox Triage & Search
    - Google Calendar, Drive, and Notion connectors
    - Web Search with cited answers
    - Code Helper & Script Sandbox
    - File Organizer (SmartSort)
    - Spotify & Music Control
    - Second Brain Notes & RAG
    - General Conversation
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

    # 1. GitHub API Tool
    if re.search(r"\b(github|repo|repos|repositories|commits?|pull requests?)\b", lower):
        return _result("tool", "github.overview", {"query": raw}, "upbeat")

    # 2. Web Search Tool
    if re.search(r"\b(search the web|web search|google|look up online|search online|search for)\b", lower):
        q = re.sub(r"^(?:please\s+)?(?:search the web for|web search for|google|look up online|search online for|search for)\s+", "", raw, flags=re.I).strip()
        return _result("tool", "web.search", {"query": q or raw}, "supportive")

    # 2. Code Helper & Sandbox Execution Tool
    if re.search(r"\b(run code|execute code|run this python|run script|execute script|eval code)\b", lower) or "```python" in raw:
        code_match = re.search(r"```(?:python)?\s*(.*?)```", raw, re.DOTALL)
        code = code_match.group(1).strip() if code_match else raw
        return _result("tool", "sandbox.execute", {"code": code, "language": "python"}, "upbeat")

    # 3. File Organizer (SmartSort)
    if re.search(r"\b(organize|smartsort|sort files?|clean directory|sort folder)\b", lower):
        path_match = re.search(r"(?:in|at|folder|dir(?:ectory)?)\s+([a-zA-Z0-9_\\\/\.\:\-]+)", raw, re.I)
        target_dir = path_match.group(1).strip() if path_match else "~/Downloads"
        return _result("tool", "smartsort.organize", {"directory": target_dir, "dry_run": True}, "supportive")

    # 4. Spotify & Music Control
    if re.search(r"\b(play|pause|stop|skip|resume|next track|previous track|volume)\b.*?\b(music|song|track|spotify|beat)?\b", lower):
        if any(w in lower for w in ["pause", "stop"]):
            return _result("tool", "music.control", {"action": "pause"}, "chill")
        elif any(w in lower for w in ["next", "skip"]):
            return _result("tool", "music.control", {"action": "next"}, "upbeat")
        elif "play" in lower:
            track = re.sub(r"^(?:please\s+)?play\s+(?:music|song|track)?\s*", "", raw, flags=re.I).strip()
            return _result("tool", "music.control", {"action": "play", "target": track}, "happy")

    # 5. Connectors (Notion & Google Drive)
    if re.search(r"\b(notion|search notion|notion pages?)\b", lower):
        return _result("tool", "connectors.notion", {"query": raw}, "supportive")
    if re.search(r"\b(google drive|drive files?|search drive)\b", lower):
        return _result("tool", "connectors.drive", {"query": raw}, "supportive")

    # 6. Gmail Read Tools
    if re.search(r"\b(summarize|check|triage|unread)\b.*?\b(inbox|emails?|mail)\b", lower) or lower == "inbox":
        return _result("tool", "gmail.summarize_inbox", {}, "upbeat")

    if re.search(r"\b(search|find|look up)\b.*?\b(emails?|mail)\b", lower):
        q_match = re.search(r"(?:for|about|from)\s+(.+)$", raw, re.I)
        query = q_match.group(1).strip() if q_match else raw
        return _result("tool", "gmail.search_mail", {"query": query}, "supportive")

    # 7. Calendar & Tasks Tools
    if re.search(r"\b(schedule|add|book)\b.*?\b(meeting|event|calendar|task|reminder)\b", lower):
        return _result("tool", "calendar.add_event", {"title": raw, "when": "Tomorrow, 4:00 PM"}, "upbeat")

    if re.search(r"\b(calendar|schedule|events|agenda|what's on)\b", lower):
        return _result("tool", "calendar.list_events", {}, "supportive")

    # 8. Second Brain Notes / Ingest
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

    # 9. General Conversation
    emotion = "chill"
    if any(w in lower for w in ["love", "awesome", "thank", "hi", "hey", "hello"]):
        emotion = "happy"
    elif any(w in lower for w in ["roast", "bug", "code", "funny"]):
        emotion = "smug"
    elif any(w in lower for w in ["help", "how", "what", "why", "explain"]):
        emotion = "supportive"

    return _result("chat", "conversation", {}, emotion)
