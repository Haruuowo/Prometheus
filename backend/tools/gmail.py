import os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.tools.imap_client import (
    is_user_inbox_configured,
    fetch_messages_imap,
    set_user_inbox_credentials,
    disconnect_user_inbox
)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CREDENTIALS_PATH = ROOT_DIR / "credentials.json"
TOKEN_PATH = ROOT_DIR / "token.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify"
]

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

def connect_inbox(uid: str, email_address: str, app_password: str):
    set_user_inbox_credentials(uid, email_address, app_password)

def disconnect_inbox(uid: str):
    disconnect_user_inbox(uid)

def fetch_live_messages(uid: str = "kai_local", max_results: int = 10) -> List[Dict[str, Any]]:
    # 1. Check if user configured their inbox in UI / env
    if is_user_inbox_configured(uid):
        emails = fetch_messages_imap(uid=uid, max_results=max_results)
        if emails:
            return emails

    # 2. Check local OAuth token.json if present
    if TOKEN_PATH.exists():
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
            if creds and creds.valid:
                service = build("gmail", "v1", credentials=creds)
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
        except Exception:
            pass

    return SAMPLE_EMAILS

def search_mail(query: str = "", uid: str = "kai_local") -> List[Dict[str, Any]]:
    q = (query or "").strip().lower()
    emails = fetch_live_messages(uid=uid, max_results=15)

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

def summarize_inbox(uid: str = "kai_local") -> Dict[str, Any]:
    emails = fetch_live_messages(uid=uid, max_results=12)
    unread = [m for m in emails if m.get("unread")]
    is_live = is_user_inbox_configured(uid) or TOKEN_PATH.exists()

    summary_lines = [
        f"• From {m['from'].split('<')[0].strip()}: \"{m['subject']}\" — {m['snippet'][:90]}..."
        for m in unread[:4]
    ]
    return {
        "total_count": len(emails),
        "unread_count": len(unread),
        "highlights": summary_lines if summary_lines else ["All caught up. No unread messages."],
        "emails": emails,
        "is_live": is_live
    }

def get_pending_approvals() -> List[Dict[str, Any]]:
    return []
