import os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.tools.imap_client import is_imap_configured, fetch_messages_imap

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
    global RUNTIME_ACCESS_TOKEN
    RUNTIME_ACCESS_TOKEN = token
    try:
        import json
        with open(TOKEN_PATH, "w") as f:
            json.dump({"token": token, "scopes": SCOPES}, f)
    except Exception as e:
        print(f"[Gmail API] Could not cache access token: {e}")

def get_gmail_service():
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        if RUNTIME_ACCESS_TOKEN:
            creds = Credentials(token=RUNTIME_ACCESS_TOKEN)
            return build("gmail", "v1", credentials=creds)

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
            # Do not block background worker with run_local_server if running as server
            # Use auth_gmail.py for the desktop prompt flow
        if creds and creds.valid:
            return build("gmail", "v1", credentials=creds)
    except Exception as e:
        pass
    return None

def fetch_live_messages(max_results: int = 10) -> List[Dict[str, Any]]:
    # Option 1: Standard open-source IMAP (100% open source, works for anyone who clones the repo)
    if is_imap_configured():
        emails = fetch_messages_imap(max_results=max_results)
        if emails:
            return emails

    # Option 2: Google OAuth / token.json
    service = get_gmail_service()
    if service:
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

            if emails:
                return emails
        except Exception as e:
            print(f"[Gmail API] Error: {e}")

    return SAMPLE_EMAILS

def search_mail(query: str = "") -> List[Dict[str, Any]]:
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
