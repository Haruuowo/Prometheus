import os
from typing import Dict, Any, List

# Connectors state for Google Calendar, Google Drive, and Notion
CONNECTORS_STATE = {
    "google_calendar": {
        "name": "Google Calendar",
        "status": "connected",
        "detail": "Upcoming meetings & sync enabled",
        "icon": "CAL"
    },
    "google_drive": {
        "name": "Google Drive",
        "status": "ready",
        "detail": "Second Brain cloud document import",
        "icon": "DRIVE"
    },
    "notion": {
        "name": "Notion",
        "status": "ready",
        "detail": "Database & workspace page sync",
        "icon": "NOTION"
    }
}

def get_connectors_status() -> Dict[str, Any]:
    return CONNECTORS_STATE

def query_drive_files(query: str = "") -> List[Dict[str, str]]:
    return [
        {"name": "Odysseus System Architecture.pdf", "type": "pdf", "modified": "Today"},
        {"name": "Prometheus Roadmap 2026.docx", "type": "doc", "modified": "Yesterday"},
        {"name": "Second Brain Vault Backup.zip", "type": "zip", "modified": "3 days ago"},
    ]

def query_notion_pages(query: str = "") -> List[Dict[str, str]]:
    return [
        {"title": "Personal Goals & Sprint 12", "workspace": "Kai HQ", "updated": "Today"},
        {"title": "AI Agent Research & Benchmarks", "workspace": "Kai HQ", "updated": "This week"},
        {"title": "Odysseus Core Specs", "workspace": "Kai HQ", "updated": "This week"},
    ]

