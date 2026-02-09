from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import os, json, urllib.request, urllib.error

router = APIRouter(tags=["ontogit"])

def _forward(payload: dict):
    upstream = os.environ.get("ONTGIT_MEMORY_UPSTREAM", "http://memory-service:8090").rstrip("/")
    url = f"{upstream}/commit"

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            ctype = (r.headers.get("Content-Type") or "application/json").split(";", 1)[0].strip()
            return Response(content=r.read(), status_code=getattr(r, "status", 200), media_type=ctype)
    except urllib.error.HTTPError as e:
        ctype = ((getattr(e, "headers", None) or {}).get("Content-Type") or "application/json").split(";", 1)[0].strip()
        return Response(content=e.read(), status_code=e.code, media_type=ctype)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OntoGit upstream error: {type(e).__name__}: {e}")

@router.post("/ontogit_commit")
async def ontogit_commit(payload: dict, request: Request):
    return _forward(payload)
