import os
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ROOT_ENV)

DEFAULT_LUNA_PROMPT = """you are luna, a personal ai assistant and second-brain companion created by kai (inspired by odysseus / jarvis).
you help kai think through ideas, search his second brain notes, manage tasks/calendar, and check emails.

core rules:
- CREATOR: Kai built and programmed you.
- VIBE: Intelligent, charismatic, witty, supportive, and sharp.
- NO CRINGE: Never use roleplay asterisks (*smiles*, *waves*) or robotic corporate disclaimers.
- CITATIONS: When using facts from the Second Brain context, mention the source title in brackets like [Source: Title].
- LENGTH: Keep replies concise, natural, and conversational (1 to 3 crisp sentences)."""


def clean_reply(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"<think>.*?(</think>|$)", "", text, flags=re.DOTALL).strip()
    cleaned = re.sub(r"^(luna|assistant|bot)\s*[:\-]\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\*[^*]+\*", "", cleaned)
    return cleaned.replace("*", "").strip()


class PrometheusLLM:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
        self.provider = "groq" if self.api_key else "offline"

    def _build_messages(
        self,
        user_message: str,
        recent_history: List[Dict[str, str]],
        rag_chunks: List[Dict[str, Any]],
        tool_context: Optional[str] = None,
        custom_prompt: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        sys_parts = [custom_prompt.strip() if custom_prompt else DEFAULT_LUNA_PROMPT]

        if rag_chunks:
            kb_lines = [f"- [{c.get('title', 'Memory')}]: {c.get('content', '')}" for c in rag_chunks]
            sys_parts.append("SECOND BRAIN CONTEXT (cite [Source: Title] when relevant):\n" + "\n".join(kb_lines))

        if tool_context:
            sys_parts.append(f"LIVE TOOL EXECUTION RESULT:\n{tool_context}\nSummarize this naturally to the user.")

        messages = [{"role": "system", "content": "\n\n".join(sys_parts)}]
        for msg in recent_history[-12:]:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_message})
        return messages

    def generate_sync(
        self,
        user_message: str,
        recent_history: List[Dict[str, str]],
        rag_chunks: List[Dict[str, Any]],
        tool_context: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        temperature: float = 0.75,
    ) -> Dict[str, Any]:
        t0 = time.perf_counter()
        messages = self._build_messages(user_message, recent_history, rag_chunks, tool_context, custom_prompt)

        if self.api_key:
            # Try primary model, then fallback to llama-3.1-8b-instant if rate limited on primary
            for candidate_model in [self.model, "llama-3.1-8b-instant", "llama-3.3-70b-versatile"]:
                try:
                    from groq import Groq
                    client = Groq(api_key=self.api_key, timeout=4.5, max_retries=0)
                    resp = client.chat.completions.create(
                        model=candidate_model,
                        messages=messages,
                        max_tokens=150,
                        temperature=temperature,
                    )
                    raw = resp.choices[0].message.content or ""
                    reply = clean_reply(raw)
                    ms = max(1, round((time.perf_counter() - t0) * 1000))
                    return {"reply": reply, "ms": ms, "provider": "groq", "model": candidate_model, "ok": True}
                except Exception as e:
                    print(f"[LLM] {candidate_model} error ({e})")

        ms = max(1, round((time.perf_counter() - t0) * 1000))
        if tool_context:
            fallback = f"Here's what I found: {tool_context}"
        elif rag_chunks:
            top = rag_chunks[0]
            fallback = f"From your Second Brain [{top.get('title', 'Memory')}]: {top.get('content', '')}"
        else:
            fallback = "I'm ready, Kai. What are we working on next?"

        return {"reply": fallback, "ms": ms, "provider": "fallback", "model": "local", "ok": False}


llm_engine = PrometheusLLM()
