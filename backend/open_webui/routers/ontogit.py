from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import Response
import os, json, urllib.request, urllib.error, logging, time

from open_webui.utils.auth import get_verified_user
from open_webui.ontogit.constants import (
    SERVICE_AUTH_ENV,
    SERVICE_AUTH_HEADER,
    USER_ID_HEADER,
    WARN_SERVICE_AUTH,
    WARN_USER_ID_MISSING,
    WARN_QUOTA_EXCEEDED,
    WARN_RATE_LIMITED,
)

router = APIRouter(tags=["ontogit"])
log = logging.getLogger(__name__)
_WARNED_SECRET_MISSING = False
_WARN_LAST: dict[str, float] = {}


def _warn_once(key: str, message: str):
    now = time.time()
    last = _WARN_LAST.get(key, 0.0)
    if now - last < 60.0:
        return
    _WARN_LAST[key] = now
    log.warning(message)

def _get_service_secret() -> str | None:
    global _WARNED_SECRET_MISSING
    secret = os.environ.get(SERVICE_AUTH_ENV, "")
    if not secret:
        if not _WARNED_SECRET_MISSING:
            _WARNED_SECRET_MISSING = True
            log.error("ONTOS service auth secret is not configured; ontogit endpoints disabled")
        return None
    return secret


def _forward(payload: dict, path: str, user_id: str | None):
    upstream = os.environ.get("ONTGIT_MEMORY_UPSTREAM", "http://memory-service:8090").rstrip("/")
    url = f"{upstream}/{path.lstrip('/')}"
    service_secret = _get_service_secret()
    if not service_secret:
        return Response(status_code=500, content=b"")

    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    headers[SERVICE_AUTH_HEADER] = service_secret
    local_warn = None
    if user_id:
        headers[USER_ID_HEADER] = user_id
    else:
        local_warn = "user_id_missing"
        _warn_once("user_id_missing", WARN_USER_ID_MISSING)
    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            ctype = (r.headers.get("Content-Type") or "application/json").split(";", 1)[0].strip()
            resp = Response(content=r.read(), status_code=getattr(r, "status", 200), media_type=ctype)
            warn = r.headers.get("X-Ontogit-Warn")
            if local_warn:
                resp.headers["X-Ontogit-Warn"] = local_warn
            if warn:
                resp.headers["X-Ontogit-Warn"] = (resp.headers.get("X-Ontogit-Warn") + "," if resp.headers.get("X-Ontogit-Warn") else "") + warn
            return resp
    except urllib.error.HTTPError as e:
        ctype = ((getattr(e, "headers", None) or {}).get("Content-Type") or "application/json").split(";", 1)[0].strip()
        if e.code == 401:
            _warn_once("service_auth", WARN_SERVICE_AUTH)
        elif e.code in (429, 403):
            _warn_once("quota", WARN_QUOTA_EXCEEDED if e.code == 403 else WARN_RATE_LIMITED)
        resp = Response(content=e.read(), status_code=e.code, media_type=ctype)
        warn = (getattr(e, "headers", None) or {}).get("X-Ontogit-Warn")
        if local_warn:
            resp.headers["X-Ontogit-Warn"] = local_warn
        if warn:
            resp.headers["X-Ontogit-Warn"] = (resp.headers.get("X-Ontogit-Warn") + "," if resp.headers.get("X-Ontogit-Warn") else "") + warn
        return resp
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OntoGit upstream error: {type(e).__name__}: {e}")

@router.post("/ontogit_commit")
async def ontogit_commit(payload: dict, request: Request, user=Depends(get_verified_user)):
    return _forward(payload, "commit", getattr(user, "id", None))


@router.post("/ontogit_recall")
async def ontogit_recall(payload: dict, request: Request, user=Depends(get_verified_user)):
    return _forward(payload, "recall", getattr(user, "id", None))
