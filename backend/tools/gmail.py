import os
import time
import base64
from pathlib import Path
from typing import Dict, Any, List, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CREDENTIALS_PATH = ROOT_DIR / "credentials.json"
TOKEN_PATH = ROOT_DIR / "token.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify"
]

RUNTIME_ACCESS_TOKEN: Optional[str] = None

SAMPLE_EMAILS = [
    {
        "id": "msg_101",
        "from": "Alex Rivera <alex@workspace.dev>",
        "subject": "Architecture Review & API Specs",
        "snippet": "Hey Kai, attached the updated API specification for the backend services. Let me know when you want to sync.",
        "date": "Today, 10:15 AM",
        "unread": True,
    },
    {
        "id": "msg_102",
        "from": "Cloud Billing <no-reply@cloud.example.com>",
        "subject": "Monthly Infrastructure Summary",
        "snippet": "Your current usage for this billing cycle is within the free tier limits.",
        "date": "Yesterday",
        "unread": True,
    },
    {
        "id": "msg_103",
        "from": "GitHub <notifications@github.com>",
        "subject": "[Prometheus] All CI checks passed on main",
        "snippet": "Build and lint checks completed successfully.",
        "date": "2 days ago",
        "unread": False,
    },
]

def set_runtime_access_token(token: str):
    """Sets an OAuth access token received directly from Firebase Google sign-in."""
    global RUNTIME_ACCESS_TOKEN
    RUNTIME_ACCESS_TOKEN = token
    try:
        import json
        with open(TOKEN_PATH, "w") as f:
            json.dump({"token": token, "scopes": SCOPES}, f)
    except Exception as e:
        print(f"[Gmail API] Could not cache access token: {e}")

def get_gmail_service():
    """Returns an authenticated Gmail API service if credentials or token exist."""
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        # 1. Use runtime access token from Firebase if present
        if RUNTIME_ACCESS_TOKEN:
            creds = Credentials(token=RUNTIME_ACCESS_TOKEN)
            return build("gmail", "v1", credentials=creds)

        # 2. Check saved token.json
        creds = None
        if TOKEN_PATH.exists():
            try:
                creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
            except Exception:
                import json
                with open(TOKEN_PATH) as f:
                    data = json.load(f)
                    if "token" in data:
                        creds = Credentials(token=data["token"])

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(TOKEN_PATH, "w") as token:
                    token.write(creds.to_json())
            elif CREDENTIALS_PATH.exists():
                flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
                creds = flow.run_local_server(port=0)
                with open(TOKEN_PATH, "w") as token:
                    token.write(creds.to_json())

        if creds:
            return build("gmail", "v1", credentials=creds)
    except Exception as e:
        print(f"[Gmail API] Auth note: {e}")
    return None

def fetch_live_messages(max_results: int = 10) -> List[Dict[str, Any]]:
    """Fetches real messages from user's Gmail if authenticated."""
    service = get_gmail_service()
    if not service:
        return SAMPLE_EMAILS

    try:
        results = service.users().messages().list(userId="me", maxResults=max_results).execute()
        messages = results.get("messages", [])
        emails = []

        for m in messages:
            msg = service.users().messages().get(userId="me", id=m["id"], format="metadata").execute()
            headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
            is_unread = "UNREAD" in msg.get("labelIds", [])

            emails.append({
                "id": m["id"],
                "from": headers.get("from", "Unknown Sender"),
                "subject": headers.get("subject", "(No Subject)"),
                "snippet": msg.get("snippet", ""),
                "date": headers.get("date", "Recent"),
                "unread": is_unread
            })

        return emails if emails else SAMPLE_EMAILS
    except Exception as e:
        print(f"[Gmail API] Error fetching messages: {e}")
        return SAMPLE_EMAILS

def search_mail(query: str = "") -> List[Dict[str, Any]]:
    """Search messages in inbox (live Gmail or sample)."""
    q = (query or "").strip().lower()
    emails = fetch_live_messages(max_results=15)

    if not q or q in ("all", "inbox", "recent", "unread"):
        if q == "unread":
            return [m for m in emails if m.get("unread")]
        return emails

    tokens = [t for t in q.split() if len(t) > 1]
    results = []
    for mail in emails:
        haystack = f"{mail['from']} {mail['subject']} {mail['snippet']}".lower()
        if any(t in haystack for t in tokens):
            results.append(mail)
    return results or emails[:3]

def summarize_inbox() -> Dict[str, Any]:
    """Summarize unread messages."""
    emails = fetch_live_messages(max_results=12)
    unread = [m for m in emails if m.get("unread")]
    summary_lines = [
        f"• From {m['from'].split('<')[0].strip()}: \"{m['subject']}\" — {m['snippet'][:90]}..."
        for m in unread[:4]
    ]
    return {
        "total_count": len(emails),
        "unread_count": len(unread),
        "highlights": summary_lines if summary_lines else ["All caught up. No unread messages."],
        "emails": emails,
    }

def get_pending_approvals() -> List[Dict[str, Any]]:
    return []
