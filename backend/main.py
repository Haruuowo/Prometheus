import os
import sys
import json
import time
import asyncio
from pathlib import Path
from typing import Optional, Dict, List
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
from backend.tools import gmail, calendar, notes, web_search, sandbox, smart_sort, music, connectors, github_tool

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


class TokenConnectRequest(BaseModel):
    access_token: str


class InboxConnectRequest(BaseModel):
    email: str
    app_password: str


class SandboxRunRequest(BaseModel):
    code: str
    language: str = "python"


class SmartSortRequest(BaseModel):
    directory: str
    dry_run: bool = True


class MusicControlRequest(BaseModel):
    action: str
    target: str = ""


class ToolApproveRequest(BaseModel):
    action_id: str
    approved: bool = True


class ReminderRequest(BaseModel):
    title: str
    time: Optional[str] = "Tomorrow, 3:00 PM"


class SummarizeRequest(BaseModel):
    text: str


class ResearchRequest(BaseModel):
    topic: str


class WriteRequest(BaseModel):
    prompt: str
    format: str = "article"
    tone: str = "concise"


USER_REMINDERS: Dict[str, list] = {}


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
            summary = gmail.summarize_inbox(uid=uid)
            tool_context = f"Inbox has {summary['unread_count']} unread messages: " + " | ".join(summary["highlights"])
        elif intent_name == "gmail.search_mail":
            found = gmail.search_mail(params.get("query", ""), uid=uid)
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
        elif intent_name == "github.overview":
            data = github_tool.get_user_overview("Haruuowo")
            top_repos = ", ".join([f"{r['name']} ({r['language']}, {r['stars']} stars)" for r in data.get("repos", [])[:3]])
            tool_context = f"GitHub user {data.get('username')}: {data.get('public_repos')} public repos. Latest: {top_repos}"
        elif intent_name == "web.search":
            hits = web_search.search_web(params.get("query", ""))
            tool_context = "Web search results (cited): " + "; ".join([f"[{h['title']}] ({h['url']}) {h['snippet']}" for h in hits])
        elif intent_name == "sandbox.execute":
            res = sandbox.execute_code_snippet(params.get("code", ""), params.get("language", "python"))
            tool_context = f"Executed code script in sandbox (status={'OK' if res['ok'] else 'Error'}, {res['duration_ms']}ms): {res['output']}"
        elif intent_name == "smartsort.organize":
            res = smart_sort.smart_sort_directory(params.get("directory", ""))
            tool_context = f"SmartSort scanned {res.get('files_found', 0)} files in {res.get('directory')}. Categories: Images, Documents, Code, Audio, Archives."
        elif intent_name == "music.control":
            res = music.control_playback(params.get("action", "status"), params.get("target", ""))
            tool_context = f"Music controller: {res.get('message')}"
        elif intent_name == "connectors.notion":
            pages = connectors.query_notion_pages(params.get("query", ""))
            tool_context = "Notion database pages: " + ", ".join([f"{p['title']} ({p['workspace']})" for p in pages])
        elif intent_name == "connectors.drive":
            files = connectors.query_drive_files(params.get("query", ""))
            tool_context = "Google Drive cloud files: " + ", ".join([f"{f['name']} ({f['type']})" for f in files])
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


@app.post("/api/gmail/connect-token")
async def connect_gmail_token(req: TokenConnectRequest):
    gmail.set_runtime_access_token(req.access_token)
    return {"ok": True, "message": "Gmail access token connected"}


@app.get("/brain/search")
@app.get("/api/brain/search")
async def brain_search(q: str = Query(default=""), user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    results = memory_store.search_second_brain(uid=uid, query=q, top_k=6)
    state = memory_store.list_second_brain(uid=uid)
    return {"query": q, "results": results, "total_notes": len(state["notes"]), "facts_count": state["facts_count"]}


# ── Prometheus Workspace Service Endpoints ────────────────────────────────────

@app.get("/reminders")
@app.get("/api/reminders")
async def get_reminders_endpoint(user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    if uid not in USER_REMINDERS:
        USER_REMINDERS[uid] = [
            {"id": "rem_1", "title": "Sync with team on Prometheus release", "time": "Tomorrow, 2:00 PM", "status": "pending"},
            {"id": "rem_2", "title": "Review Second Brain chunks & embeddings", "time": "Friday, 5:00 PM", "status": "pending"}
        ]
    return USER_REMINDERS[uid]


@app.post("/reminders")
@app.post("/api/reminders")
async def add_reminder_endpoint(req: ReminderRequest, user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    if uid not in USER_REMINDERS:
        USER_REMINDERS[uid] = []
    rem = {
        "id": f"rem_{int(time.time() * 1000)}",
        "title": req.title,
        "time": req.time or "Tomorrow",
        "status": "pending"
    }
    USER_REMINDERS[uid].append(rem)
    return {"ok": True, "reminder": rem}


@app.post("/summarize")
@app.post("/api/summarize")
async def summarize_endpoint(req: SummarizeRequest, user_info: dict = Depends(verify_token)):
    prompt = f"Summarize the following text concisely with bullet points and main takeaways:\n\n{req.text}"
    res = await asyncio.to_thread(llm_engine.generate_sync, user_message=prompt)
    return {"ok": True, "summary": res.get("reply", "")}


@app.post("/research")
@app.post("/api/research")
async def research_endpoint(req: ResearchRequest, user_info: dict = Depends(verify_token)):
    citations = web_search.search_web(req.topic)
    context_str = "\n".join([f"- [{c.get('title', 'Source')}] ({c.get('url', '')}): {c.get('snippet', '')}" for c in citations])
    prompt = f"Synthesize a clear research briefing for '{req.topic}' using these web sources:\n\n{context_str}"
    res = await asyncio.to_thread(llm_engine.generate_sync, user_message=prompt)
    return {"ok": True, "topic": req.topic, "citations": citations, "insights": res.get("reply", "")}


@app.post("/write")
@app.post("/api/write")
async def write_endpoint(req: WriteRequest, user_info: dict = Depends(verify_token)):
    prompt = f"Write a polished {req.format} with a {req.tone} tone based on this prompt:\n\n{req.prompt}"
    res = await asyncio.to_thread(llm_engine.generate_sync, user_message=prompt)
    return {"ok": True, "draft": res.get("reply", "")}


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
    uid = user_info.get("uid", "kai_local")
    return {
        "pending": gmail.get_pending_approvals(),
        "inbox": gmail.summarize_inbox(uid=uid),
        "events": calendar.list_events(),
        "connectors": connectors.get_connectors_status(),
        "music": music.SPOTIFY_STATE,
    }


@app.post("/api/tools/web-search")
async def api_web_search(q: str = Query(default="")):
    results = web_search.search_web(q)
    return {"query": q, "results": results}


@app.post("/api/tools/sandbox")
async def api_sandbox(req: SandboxRunRequest):
    res = sandbox.execute_code_snippet(req.code, req.language)
    return res


@app.post("/api/tools/smart-sort")
async def api_smart_sort(req: SmartSortRequest):
    res = smart_sort.smart_sort_directory(req.directory, req.dry_run)
    return res


@app.post("/api/tools/music")
async def api_music(req: MusicControlRequest):
    res = music.control_playback(req.action, req.target)
    return res


@app.post("/api/inbox/connect")
async def connect_user_inbox(req: InboxConnectRequest, user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    gmail.connect_inbox(uid, req.email, req.app_password)
    summary = gmail.summarize_inbox(uid=uid)
    return {"ok": True, "summary": summary}


@app.post("/api/inbox/disconnect")
async def disconnect_user_inbox(user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "kai_local")
    gmail.disconnect_inbox(uid)
    return {"ok": True}


@app.get("/api/github/overview")
async def api_github_overview(user: str = Query(default="Haruuowo"), year: str = Query(default="last")):
    data = github_tool.get_user_overview(user, year)
    return data


@app.get("/api/github/repo-activity")
async def api_github_repo_activity(user: str = Query(default="Haruuowo"), repo: str = Query(default="Prometheus")):
    data = github_tool.get_repo_activity(user, repo)
    return data


@app.post("/api/github/connect-token")
async def connect_github_token(req: TokenConnectRequest):
    github_tool.set_runtime_github_token(req.access_token)
    return {"ok": True, "message": "GitHub OAuth token connected"}


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
