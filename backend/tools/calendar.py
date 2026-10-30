import time
from typing import List, Dict, Any

EVENTS: List[Dict[str, Any]] = [
    {"id": "evt_1", "title": "System Architecture & Second Brain Sync", "time": "Today, 5:00 PM", "tag": "work"},
    {"id": "evt_2", "title": "Backend API & Firebase Deployment", "time": "Tomorrow, 2:00 PM", "tag": "dev"},
]


def list_events() -> List[Dict[str, Any]]:
    return EVENTS


def add_event(title: str, when: str = "Tomorrow, 4:00 PM") -> Dict[str, Any]:
    evt = {
        "id": f"evt_{int(time.time())}",
        "title": title,
        "time": when,
        "tag": "task",
    }
    EVENTS.append(evt)
    return evt
