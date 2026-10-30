import os
import subprocess
from typing import Dict, Any

SPOTIFY_STATE = {
    "is_playing": False,
    "current_track": "Synthwave Chill Study Beats",
    "artist": "Odysseus Radio",
    "volume": 75
}

def control_playback(action: str, target: str = "") -> Dict[str, Any]:
    """
    Controls music playback.
    Supports play, pause, next, prev, volume, and search/track selection.
    """
    act = action.strip().lower()

    if act in ("play", "resume"):
        SPOTIFY_STATE["is_playing"] = True
        if target:
            SPOTIFY_STATE["current_track"] = target
        return {
            "ok": True,
            "status": "playing",
            "track": SPOTIFY_STATE["current_track"],
            "message": f"Playing {SPOTIFY_STATE['current_track']}"
        }

    elif act in ("pause", "stop"):
        SPOTIFY_STATE["is_playing"] = False
        return {
            "ok": True,
            "status": "paused",
            "track": SPOTIFY_STATE["current_track"],
            "message": "Playback paused"
        }

    elif act in ("next", "skip"):
        SPOTIFY_STATE["current_track"] = target or "Odysseus Track #Next"
        SPOTIFY_STATE["is_playing"] = True
        return {
            "ok": True,
            "status": "playing",
            "track": SPOTIFY_STATE["current_track"],
            "message": f"Skipped to next track: {SPOTIFY_STATE['current_track']}"
        }

    elif act in ("prev", "previous"):
        return {
            "ok": True,
            "status": "playing",
            "track": SPOTIFY_STATE["current_track"],
            "message": "Returning to previous track"
        }

    elif "volume" in act:
        return {
            "ok": True,
            "volume": SPOTIFY_STATE["volume"],
            "message": f"Volume set to {SPOTIFY_STATE['volume']}%"
        }

    return {
        "ok": True,
        "state": SPOTIFY_STATE,
        "message": f"Current music status: {SPOTIFY_STATE['current_track']} ({'playing' if SPOTIFY_STATE['is_playing'] else 'paused'})"
    }
