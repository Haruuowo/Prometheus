import os
import sys
import json
import time
import asyncio
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Ensure project root is in sys.path so `backend.*` imports work whether run from root or backend/
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.auth import verify_token
from backend.ws import ws_manager
from backend.brain.router import route_message
from backend.brain.intent import detect_intent
from backend.brain.memory import memory_store
from backend.brain.llm import llm_engine
from backend.voice.tts import synthesize_speech
from backend.tools import gmail, calendar, notes

app = FastAPI(title="Prometheus · Luna AI VTuber & Jarvis Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Models ───────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = ""
    user: str = "You"
    platform: str = "Console"
    name: str = "Luna"
    system_prompt: Optional[str] = None
    temperature: float = 0.75
    stream: bool = False


class IngestRequest(BaseModel):
    title: str = "Untitled Note"
    content: str
    source_type: str = "note"
    url: str = ""


class ToolApproveRequest(BaseModel):
    action_id: str
    approved: bool = True


# ── Core Pipeline Orchestrator ───────────────────────────────────────────────

async def process_prometheus_turn(
    uid: str,
    message: str,
    user_label: str = "You",
    platform: str = "Console",
    custom_prompt: Optional[str] = None,
    temperature: float = 0.75,
) -> dict:
    """
    Executes the full 6-stage Prometheus pipeline:
      1. Chat    -> ingest & log
      2. Router  -> priority classification (P0..P3)
      3. Intent  -> Jarvis tool / Odysseus Minecraft / Conversation
      4. LLM     -> Second Brain RAG + Groq inference
      5. TTS     -> Edge-TTS neural voice synthesis
      6. Avatar  -> Live2D emotion & lip-sync dispatch
    """
    traces = []
    stage_ms = {"chat": 1, "route": 1, "intent": 1, "llm": 0, "tts": 0, "avatar": 1}

    # 1. Stage: Chat
    await ws_manager.emit_trace("chat", ms=1, detail=f"{user_label} ({platform}): “{message}”", icon=">")
    traces.append({"stage": "chat", "icon": ">", "html": f"<b>{user_label}</b> <em>({platform})</em>: “{message}”", "ms": 1})

    # 2. Stage: Router
    route_info = route_message(message, user=user_label, platform=platform)
    stage_ms["route"] = route_info["ms"]
    r_icon = ">"
    r_html = f"route -> <b>{route_info['priority']}</b> <em>· {route_info['reason']}</em>"
    await ws_manager.emit_trace("route", ms=route_info["ms"], detail=r_html, icon=r_icon)
    traces.append({"stage": "route", "icon": r_icon, "html": r_html, "ms": route_info["ms"]})

    # 3. Stage: Intent & Tool Execution
    intent_info = detect_intent(message)
    stage_ms["intent"] = intent_info["ms"]
    emotion = intent_info["emotion"]
    intent_name = intent_info["intent"]
    category = intent_info["category"]
    params = intent_info["params"]

    tool_context = None
    tool_approval = None
    mc_action = None

    if category == "mc":
        mc_action = params
        i_html = f"intent -> <b>{intent_name}</b> <em>({params.get('detail', '')})</em>"
        await ws_manager.emit_trace("intent", ms=intent_info["ms"], detail=i_html, icon=">")
        await ws_manager.broadcast("mc_action", data=mc_action, **mc_action)
        traces.append({"stage": "intent", "icon": ">", "html": i_html, "ms": intent_info["ms"]})
        tool_context = f"Dispatched command: {params.get('action')} ({params.get('detail')})."

    elif category == "tool":
        i_html = f"intent -> <b>{intent_name}</b> <em>(Tool)</em>"
        await ws_manager.emit_trace("intent", ms=intent_info["ms"], detail=i_html, icon=">")
        traces.append({"stage": "intent", "icon": ">", "html": i_html, "ms": intent_info["ms"]})

        if intent_name == "gmail.summarize_inbox":
            summary = gmail.summarize_inbox()
            tool_context = f"Inbox has {summary['unread_count']} unread messages: " + " | ".join(summary["highlights"])
        elif intent_name == "gmail.search_mail":
            found = gmail.search_mail(params.get("query", ""))
            tool_context = f"Found {len(found)} matching emails: " + "; ".join(
                [f"{m['subject']} from {m['from']}" for m in found[:3]]
            )
        elif intent_name == "gmail.draft_reply":
            staged = gmail.draft_reply(params["to"], params["subject"], params["body"])
            tool_approval = staged
            tool_context = (
                f"Staged email draft to {params['to']} with subject '{params['subject']}'."
            )
            await ws_manager.broadcast("tool_approval", data=staged)
        elif intent_name == "calendar.list_events":
            evts = calendar.list_events()
            tool_context = "Upcoming schedule: " + ", ".join([f"{e['title']} ({e['time']})" for e in evts])
        elif intent_name == "calendar.add_event":
            evt = calendar.add_event(params.get("title", "New Event"), params.get("when", "Tomorrow"))
            tool_context = f"Added event '{evt['title']}' for {evt['time']}."
        elif intent_name == "notes.save_note":
            saved = notes.save_note(uid, params["title"], params["content"])
            tool_context = f"Saved {len(saved)} chunk(s) to Second Brain under '{params['title']}'."
        elif intent_name == "notes.search_notes":
            hits = notes.search_notes(uid, params.get("query", ""))
            tool_context = "Second Brain matches: " + "; ".join([f"[{h['title']}] {h['content']}" for h in hits[:3]])
    else:
        i_html = "intent -> <b>conversation</b>"
        await ws_manager.emit_trace("intent", ms=intent_info["ms"], detail=i_html, icon=">")
        traces.append({"stage": "intent", "icon": ">", "html": i_html, "ms": intent_info["ms"]})

    # 4. Stage: Second Brain RAG + LLM Generation
    t_rag = time.perf_counter()
    rag_chunks = memory_store.search_second_brain(uid, message, top_k=3)
    recent_history = memory_store.get_recent_messages(uid, limit=12)
    rag_ms = max(1, int((time.perf_counter() - t_rag) * 1000))
    stage_ms["rag"] = rag_ms

    rag_html = f"RAG search -> <b>{len(rag_chunks)} chunk(s)</b> retrieved"
    await ws_manager.emit_trace("rag", ms=rag_ms, detail=rag_html, icon=">")
    traces.append({"stage": "rag", "icon": ">", "html": rag_html, "ms": rag_ms})

    llm_result = await asyncio.to_thread(
        llm_engine.generate_sync,
        user_message=message,
        recent_history=recent_history,
        rag_chunks=rag_chunks,
        tool_context=tool_context,
        custom_prompt=custom_prompt,
        temperature=temperature,
    )
    reply_text = llm_result["reply"]
    stage_ms["llm"] = llm_result["ms"]

    # Persist conversation turn
    memory_store.add_message(uid, "user", message)
    memory_store.add_message(uid, "assistant", reply_text)

    l_html = f"LLM reply <em>· {llm_result['provider']}/{llm_result['model']} · emotion: {emotion}</em>"
    await ws_manager.emit_trace("llm", ms=llm_result["ms"], detail=l_html, icon=">")
    await ws_manager.broadcast("emotion", data=emotion, emotion=emotion)
    traces.append({"stage": "llm", "icon": ">", "html": l_html, "ms": llm_result["ms"]})

    sources = [
        {"title": c.get("title", "Memory"), "source_type": c.get("source_type", "note")}
        for c in rag_chunks
        if c.get("source_type") != "long_term_memory"
    ]

    return {
        "reply": reply_text,
        "character": "Luna",
        "emotion": emotion,
        "provider": llm_result["provider"],
        "model": llm_result["model"],
        "stage_ms": stage_ms,
        "traces": traces,
        "tool_approval": tool_approval,
        "mc_action": mc_action,
        "sources": sources,
    }


# ── API Endpoints (Prometheus Contract) ──────────────────────────────────────

@app.post("/chat")
@app.post("/api/chat")
async def chat_endpoint(
    req: ChatRequest,
    request: Request,
    user_info: dict = Depends(verify_token),
):
    uid = user_info.get("uid", "kai_local")
    user_label = req.user or user_info.get("name", "You")
    result = await process_prometheus_turn(
        uid=uid,
        message=req.message,
        user_label=user_label,
        platform=req.platform,
        custom_prompt=req.system_prompt,
        temperature=req.temperature,
    )

    accept = request.headers.get("accept", "")
    if req.stream or "text/event-stream" in accept:
        async def sse_generator():
            # Stream pipeline traces
            for tr in result["traces"]:
                yield f"data: {json.dumps({'type': 'trace', 'data': tr})}\n\n"
            # Stream emotion
            yield f"data: {json.dumps({'type': 'emotion', 'data': result['emotion']})}\n\n"
            # Stream tokens word-by-word for low-latency feel
            words = result["reply"].split(" ")
            for i, w in enumerate(words):
                token_str = w + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'type': 'token', 'data': token_str})}\n\n"
                await asyncio.sleep(0.015)
            # Stream tool approval or Minecraft action if triggered
            if result["tool_approval"]:
                yield f"data: {json.dumps({'type': 'tool_approval', 'data': result['tool_approval']})}\n\n"
            if result["mc_action"]:
                yield f"data: {json.dumps({'type': 'mc_action', 'data': result['mc_action']})}\n\n"
            # Stream audio data URL
            if result["audio_url"]:
                yield f"data: {json.dumps({'type': 'audio_url', 'data': result['audio_url']})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'data': result})}\n\n"

        return StreamingResponse(sse_generator(), media_type="text/event-stream")

    return JSONResponse(result)


@app.post("/brain/ingest")
@app.post("/api/brain/ingest")
async def brain_ingest(req: IngestRequest, user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    chunks = memory_store.ingest_document(
        uid=uid,
        title=req.title,
        content=req.content,
        source_type=req.source_type,
        url=req.url,
    )
    return {"ok": True, "chunks_added": len(chunks), "chunks": chunks}


@app.get("/brain/search")
@app.get("/api/brain/search")
async def brain_search(q: str = Query(default=""), user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    results = memory_store.search_second_brain(uid=uid, query=q, top_k=6)
    state = memory_store.list_second_brain(uid=uid)
    return {"query": q, "results": results, "total_notes": len(state["notes"]), "facts_count": state["facts_count"]}


@app.post("/tools/approve")
@app.post("/api/tools/approve")
async def tools_approve(req: ToolApproveRequest, user_info: dict = Depends(verify_token)):
    action = gmail.approve_action(req.action_id, approved=req.approved)
    if not action:
        return JSONResponse({"ok": False, "error": "Action ID not found"}, status_code=404)
    await ws_manager.broadcast("tool_approval_updated", data=action)
    return {"ok": True, "action": action}


@app.get("/tools/pending")
@app.get("/api/tools/pending")
async def tools_pending(user_info: dict = Depends(verify_token)):
    return {
        "pending": gmail.get_pending_approvals(),
        "inbox": gmail.summarize_inbox(),
        "events": calendar.list_events(),
    }


@app.post("/memory/reset")
@app.post("/api/memory/reset")
async def memory_reset(user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    memory_store.reset_short_term(uid)
    await ws_manager.emit_trace("chat", ms=1, detail="short-term conversation memory cleared", icon=">")
    return {"ok": True, "uid": uid}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_text(
            json.dumps({
                "type": "hello",
                "provider": llm_engine.provider,
                "model": llm_engine.model,
                "pending_approvals": gmail.get_pending_approvals(),
            })
        )
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            mtype = msg.get("type")
            if mtype == "chat":
                await process_prometheus_turn(
                    uid=msg.get("uid", "kai_local"),
                    message=msg.get("text", ""),
                    user_label=msg.get("user", "You"),
                    platform=msg.get("platform", "Console"),
                )
            elif mtype == "reset":
                memory_store.reset_short_term(msg.get("uid", "kai_local"))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# Serve built React frontend at `/` so both :5173 and :8085 render the UI
DIST_DIR = ROOT_DIR / "frontend" / "dist"
if DIST_DIR.exists():
    for subdir in ["assets", "vendor", "models", "model"]:
        subpath = DIST_DIR / subdir
        if subpath.exists():
            app.mount(f"/{subdir}", StaticFiles(directory=str(subpath)), name=subdir)

    @app.get("/")
    async def serve_spa():
        return FileResponse(str(DIST_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8085"))
    print(f"Prometheus FastAPI Backend running at http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
