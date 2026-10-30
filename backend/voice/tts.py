import os
import re
import time
import base64
import asyncio
from typing import Dict, Any, Optional

DEFAULT_VOICE = os.getenv("EDGE_VOICE", "en-US-AnaNeural").strip() or "en-US-AnaNeural"


def sanitize_for_tts(text: str) -> str:
    """Remove bracketed citations or markdown before passing to neural TTS."""
    if not text:
        return ""
    cleaned = re.sub(r"\[Source:[^\]]*\]", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"[`*_~#]+", "", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


async def synthesize_speech(text: str, voice: Optional[str] = None) -> Dict[str, Any]:
    """
    Synthesizes speech using edge-tts and returns base64 MP3 audio + latency in ms.
    """
    t0 = time.perf_counter()
    spoken_text = sanitize_for_tts(text)
    selected_voice = voice or DEFAULT_VOICE

    if not spoken_text:
        return {"audio_b64": None, "ms": 0, "voice": selected_voice, "ok": False}

    try:
        import edge_tts

        async def _stream_tts():
            comm = edge_tts.Communicate(spoken_text, selected_voice, rate="+8%", pitch="+6Hz")
            b = bytearray()
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    b.extend(chunk["data"])
            return b

        buf = await asyncio.wait_for(_stream_tts(), timeout=3.5)
        ms = max(1, round((time.perf_counter() - t0) * 1000))
        if buf:
            b64 = base64.b64encode(bytes(buf)).decode("ascii")
            return {
                "audio_b64": b64,
                "audio_data_url": f"data:audio/mpeg;base64,{b64}",
                "ms": ms,
                "voice": selected_voice,
                "ok": True,
            }
    except Exception as e:
        print(f"[TTS] edge-tts fallback ({e})")

    ms = max(1, round((time.perf_counter() - t0) * 1000))
    return {"audio_b64": None, "audio_data_url": None, "ms": ms, "voice": selected_voice, "ok": False}

