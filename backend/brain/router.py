import time
from typing import Dict, Any


def route_message(text: str, user: str = "You", platform: str = "Console") -> Dict[str, Any]:
    """
    Priority router (P0 Critical -> P1 Direct User/Tool -> P3 Crowd Batch).
    Returns routing decision and latency in ms.
    """
    t0 = time.perf_counter()
    lower = (text or "").lower()

    if any(w in lower for w in ["creeper", "behind you", "look out", "danger", "low health"]):
        priority = "P0 critical"
        reason = "urgent alert / survival trigger"
    elif platform in ("Console", "Web") or "luna" in lower:
        priority = "P1 direct"
        reason = "authenticated user / direct invocation"
    else:
        priority = "P3 batch"
        reason = "stream crowd message"

    ms = max(1, round((time.perf_counter() - t0) * 1000))
    return {
        "priority": priority,
        "reason": reason,
        "user": user,
        "platform": platform,
        "ms": ms,
    }

