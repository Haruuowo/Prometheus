import os
import json
import base64
from typing import Optional
from fastapi import Header, HTTPException

# Optional firebase-admin initialization if credentials are provided
_firebase_initialized = False
try:
    import firebase_admin
    from firebase_admin import credentials, auth as fb_auth

    sa_env = os.getenv("FIREBASE_SERVICE_ACCOUNT", "").strip()
    if sa_env:
        if os.path.exists(sa_env):
            cred = credentials.Certificate(sa_env)
        else:
            cred = credentials.Certificate(json.loads(sa_env))
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
except Exception as e:
    print(f"[Auth] firebase-admin not configured or optional ({e}). Running in hybrid/dev token mode.")


def _decode_jwt_unverified(token: str) -> Optional[dict]:
    """Decode JWT payload for local development when service account JSON is not yet set."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload = parts[1]
        padding = "=" * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload + padding)
        return json.loads(decoded.decode("utf-8"))
    except Exception:
        return None


async def verify_token(authorization: Optional[str] = Header(default=None)) -> dict:
    """
    Verify Firebase ID token from 'Authorization: Bearer <idToken>'.
    Returns {"uid": ..., "email": ..., "name": ...}.
    Falls back to a local developer profile if no token is passed during local testing.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return {"uid": "kai_local", "email": "kai@prometheus.local", "name": "Kai"}

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token or token in ("null", "undefined", "dev"):
        return {"uid": "kai_local", "email": "kai@prometheus.local", "name": "Kai"}

    if _firebase_initialized:
        try:
            decoded = fb_auth.verify_id_token(token)
            return {
                "uid": decoded.get("uid", "kai_local"),
                "email": decoded.get("email", ""),
                "name": decoded.get("name", decoded.get("email", "User")),
            }
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid Firebase ID token: {e}")

    # Hybrid dev mode: decode Firebase client JWT claims directly if service account isn't attached yet
    claims = _decode_jwt_unverified(token)
    if claims and ("user_id" in claims or "sub" in claims):
        return {
            "uid": claims.get("user_id") or claims.get("sub") or "kai_local",
            "email": claims.get("email", ""),
            "name": claims.get("name", claims.get("email", "User")),
        }

    return {"uid": "kai_local", "email": "kai@prometheus.local", "name": "Kai"}

