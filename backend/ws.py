import asyncio
import json
import time
from typing import Set
from fastapi import WebSocket


class WSManager:
    """
    Manages active WebSocket connections for Prometheus Web App and Streaming modes.
    Broadcasts real-time events:
      - token
      - audio (base64 mp3 or audio_url)
      - emotion (happy, chill, supportive, gamer, smug, surprised)
      - mouth_level (0.0 .. 1.0)
      - pipeline_trace ({stage, ms, detail, icon})
      - tool_approval ({action_id, tool, summary, payload})
      - mc_action ({action, detail, icon})
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, event_type: str, data=None, **kwargs):
        payload = {
            "type": event_type,
            "data": data if data is not None else kwargs,
            "t": time.time(),
            **kwargs,
        }
        message = json.dumps(payload)
        dead = []
        for ws in list(self.active_connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections.discard(ws)

    async def emit_trace(self, stage: str, ms: int = None, detail: str = "", icon: str = "⚡"):
        await self.broadcast(
            "pipeline_trace",
            data={"stage": stage, "ms": ms, "detail": detail, "icon": icon},
            stage=stage,
            ms=ms,
            detail=detail,
            icon=icon,
        )


ws_manager = WSManager()

