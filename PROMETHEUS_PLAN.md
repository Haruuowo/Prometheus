# Prometheus Plan

A personal Jarvis-style web app built around Luna: chat, voice, Live2D avatar, second brain, and Gmail automation, all in one place.

## Stack

- **Frontend:** Prometheus UI (already being built by your AI)
- **Backend:** Python + FastAPI (reuses the Luna code: Groq LLaMA, edge-tts, RAG memory)
- **Auth:** Firebase Auth (Google sign-in). Frontend sends the ID token, backend verifies it with `firebase-admin`
- **Data:** Firestore for users, chat history, and settings
- **Second brain:** Chroma (or Postgres + pgvector), one collection per user
- **Avatar:** Live2D model from VTube Studio, rendered with `pixi-live2d-display`
- **Hosting:** Firebase Hosting (frontend), Render or Railway (backend)

## Repo Structure

```
prometheus/
  frontend/
  backend/
    main.py          FastAPI app
    auth.py          verify Firebase ID token
    brain/
      router.py
      intent.py
      llm.py
      memory.py
    voice/
      tts.py
    tools/
      gmail.py
      calendar.py
      notes.py
    ws.py            WebSocket events
```

## Track 1: Setup

- Create monorepo with `frontend` and `backend`
- Create Firebase project, enable Google sign-in and Firestore
- Backend env vars: `GROQ_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`

## Track 2: Auth and Chat

- Firebase login in the UI, attach `Authorization: Bearer <idToken>` to every request
- `auth.py` verifies the token and returns the UID
- `POST /chat` streams tokens from Groq with the Luna persona prompt
- Store messages in Firestore under `users/{uid}/messages`
- Per-user short-term memory (recent messages) and long-term memory (summaries)

## Track 3: Voice and Avatar

- `voice/tts.py` wraps edge-tts, one audio chunk per sentence (Kokoro or GPT-SoVITS can replace it later)
- WebSocket events: `token`, `audio`, `emotion`, `pipeline_trace`
- Frontend plays audio and drives the Live2D model
- Pipeline panel shows real ms for Chat, Router, Intent, LLM, TTS, Avatar

### Live2D from VTube Studio

VTube Studio models are Live2D Cubism models.

- Copy the model folder to `frontend/public/models/luna/`
- Needed files: `*.model3.json`, `*.moc3`, texture PNGs, `*.physics3.json`, `*.exp3.json`, `*.motion3.json`
- Include `live2dcubismcore.min.js` on the page
- Lip sync: drive `ParamMouthOpenY` from the TTS audio volume
- Emotions: backend sends `emotion: happy`, frontend maps it to an `.exp3.json` expression

### Two avatar modes

- **Web app mode:** model rendered in the browser (works for anyone who signs in)
- **Streaming mode:** backend controls VTube Studio through its WebSocket API (`ws://localhost:8001`), captured in OBS. Local only, useful for Twitch/TikTok
- Both modes consume the same backend events (`emotion`, `audio`, `mouth_level`)

## Track 4: Second Brain

- `POST /brain/ingest` for notes, PDFs, and links: chunk, embed, store per user
- Retrieve top-k chunks before each LLM call and cite sources in replies
- Port `luna_memory.json` and `luna_longterm.json` logic into `memory.py`, keyed by UID
- Auto-save useful chat facts to long-term memory
- `POST /memory/reset` button per user

## Track 5: Jarvis Tools

- Router picks a tool by intent using LLM function calling
- Gmail tools: `search_mail`, `summarize_inbox`, `draft_reply`
- Sending an email requires an approve button in the UI (`POST /tools/approve`)
- Keep the Google OAuth app in Testing mode with your account as the only test user (Gmail scopes are restricted)
- Add Calendar, reminders, and web search after Gmail works
- Background jobs: daily digest and inbox triage (APScheduler or Cloud Scheduler)

## Track 6: Deploy and Polish

- Frontend on Firebase Hosting, backend on Render or Railway
- Secrets in host env vars, never in the repo
- CORS locked to your domain, per-user rate limits, error logging
- Mobile-friendly layout
- Optional streaming tab for Twitch/TikTok using the existing integrations

## Rules to Keep

- Tools are read-only first, write actions need confirmation
- Stream tokens and start TTS per sentence to keep latency low
- One brain, multiple outputs (web, stream, tools)

## Backend API Contract (paste to the front-end AI)

```
Backend API contract for Prometheus:
- Auth: Firebase Google sign-in, send ID token as Bearer header.
- POST /chat {message} -> SSE stream of {type: token|emotion|audio_url|trace, data}
- WS /ws for live events (audio chunks, emotion, mouth_level, pipeline_trace {stage, ms})
- POST /brain/ingest, GET /brain/search?q=
- POST /tools/approve {action_id} for email send confirmation
- POST /memory/reset

Pipeline panel stages: Chat, Router, Intent, LLM, TTS, Avatar (show ms for each).

Avatar: load a Live2D Cubism 4 model (model3.json) from /models/luna/ using pixi-live2d-display.
Include live2dcubismcore.min.js.
Expose setMouth(0..1) -> ParamMouthOpenY, setExpression(name) -> exp3.json, playMotion(name).
Drive setMouth from the audio analyser node during TTS playback.
Listen for WS events {type: "emotion", data: "happy"} and map them to expressions.
```
