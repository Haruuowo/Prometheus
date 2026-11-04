import os
import sys
import time
from pathlib import Path
from typing import Optional, Dict, List
from dotenv import load_dotenv

# Ensure project root is in sys.path so `backend.*` imports work whether run from root or backend/
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.auth import verify_token
from backend.brain.memory import memory_store
from backend.tools import github_tool
from backend.ojt_router import router as ojt_router

app = FastAPI(title="Prometheus · Student Productivity & GitHub Workspace API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ojt_router)


# ── Request Models ───────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    title: str = "Untitled Note"
    content: str
    source_type: str = "note"
    url: str = ""


class TokenConnectRequest(BaseModel):
    access_token: str


class ReminderRequest(BaseModel):
    title: str
    time: Optional[str] = "Tomorrow, 11:59 PM"


USER_REMINDERS: Dict[str, List[Dict[str, str]]] = {}


# ── Notes / Vault Endpoints ──────────────────────────────────────────────────

@app.post("/brain/ingest")
@app.post("/api/brain/ingest")
async def brain_ingest(req: IngestRequest, user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "local_student")
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
    uid = user_info.get("uid", "local_student")
    results = memory_store.search_second_brain(uid=uid, query=q, top_k=6)
    state = memory_store.list_second_brain(uid=uid)
    return {
        "query": q,
        "results": results,
        "total_notes": len(state["notes"]),
        "facts_count": state["facts_count"]
    }


# ── Deadlines / Reminders Endpoints ──────────────────────────────────────────

@app.get("/api/reminders")
async def get_reminders_endpoint(user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "local_student")
    if uid not in USER_REMINDERS:
        USER_REMINDERS[uid] = []
    return USER_REMINDERS[uid]


@app.post("/api/reminders")
async def add_reminder_endpoint(req: ReminderRequest, user_info: dict = Depends(verify_token)):
    uid = user_info.get("uid", "local_student")
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


# ── GitHub Integration Endpoints ─────────────────────────────────────────────

@app.get("/api/github/overview")
async def api_github_overview(user: str = Query(default=""), year: str = Query(default="last")):
    return github_tool.get_user_overview(user, year)


@app.get("/api/github/repo-activity")
async def api_github_repo_activity(user: str = Query(default=""), repo: str = Query(default="")):
    return github_tool.get_repo_activity(user, repo)


@app.post("/api/github/connect-token")
async def connect_github_token(req: TokenConnectRequest):
    github_tool.set_runtime_github_token(req.access_token)
    return {"ok": True, "message": "GitHub OAuth token connected"}


# Serve built React frontend at `/` when dist exists
DIST_DIR = ROOT_DIR / "frontend" / "dist"
if DIST_DIR.exists():
    assets_path = DIST_DIR / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    @app.get("/")
    async def serve_spa():
        return FileResponse(str(DIST_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8085"))
    print(f"Prometheus FastAPI Backend running at http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
