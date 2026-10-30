import time
import uuid
from typing import Dict, Any, List, Optional

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

# Starts completely empty — only populated if user explicitly asks Luna to send an email
PENDING_APPROVALS: Dict[str, Dict[str, Any]] = {}
SENT_EMAILS: List[Dict[str, Any]] = []


def search_mail(query: str = "") -> List[Dict[str, Any]]:
    """Read-only tool: search messages in the user's inbox."""
    q = (query or "").strip().lower()
    if not q or q in ("all", "inbox", "recent", "unread"):
        if q == "unread":
            return [m for m in SAMPLE_EMAILS if m.get("unread")]
        return SAMPLE_EMAILS

    tokens = [t for t in q.split() if len(t) > 1]
    results = []
    for mail in SAMPLE_EMAILS:
        haystack = f"{mail['from']} {mail['subject']} {mail['snippet']}".lower()
        if any(t in haystack for t in tokens):
            results.append(mail)
    return results or SAMPLE_EMAILS[:2]


def summarize_inbox() -> Dict[str, Any]:
    """Read-only tool: summarize unread and priority emails."""
    unread = [m for m in SAMPLE_EMAILS if m.get("unread")]
    summary_lines = [
        f"• From {m['from'].split('<')[0].strip()}: \"{m['subject']}\" — {m['snippet']}"
        for m in unread
    ]
    return {
        "total_count": len(SAMPLE_EMAILS),
        "unread_count": len(unread),
        "highlights": summary_lines,
        "emails": SAMPLE_EMAILS,
    }


def draft_reply(to: str, subject: str, body: str) -> Dict[str, Any]:
    """Stages an email action requiring confirmation via POST /tools/approve."""
    action_id = f"act_{uuid.uuid4().hex[:8]}"
    action = {
        "action_id": action_id,
        "tool": "gmail.send_email",
        "status": "pending",
        "created_at": time.strftime("%H:%M:%S"),
        "summary": f"Send email to {to}: \"{subject}\"",
        "payload": {
            "to": to,
            "subject": subject,
            "body": body,
        },
    }
    PENDING_APPROVALS[action_id] = action
    return action


def approve_action(action_id: str, approved: bool = True) -> Optional[Dict[str, Any]]:
    """Confirms or cancels a staged write action."""
    action = PENDING_APPROVALS.get(action_id)
    if not action:
        return None

    if approved:
        action["status"] = "approved"
        action["executed_at"] = time.strftime("%H:%M:%S")
        SENT_EMAILS.append(action["payload"])
    else:
        action["status"] = "rejected"

    return action


def get_pending_approvals() -> List[Dict[str, Any]]:
    return [a for a in PENDING_APPROVALS.values() if a["status"] == "pending"]
