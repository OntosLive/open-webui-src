#!/usr/bin/env python3
import argparse
import json
import secrets
import sqlite3
import time
import uuid


def main():
    parser = argparse.ArgumentParser(description="Generate Open WebUI invite codes")
    parser.add_argument(
        "--db",
        default="backend/data/webui.db",
        help="Path to webui.db (default: backend/data/webui.db)",
    )
    parser.add_argument("--count", type=int, default=1, help="Number of invite codes")
    parser.add_argument(
        "--created-by",
        default="cli",
        help="Creator label stored in invite metadata",
    )
    args = parser.parse_args()

    count = max(1, min(args.count, 50))
    now = int(time.time())

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()
    row = cur.execute("SELECT id, data FROM config ORDER BY id DESC LIMIT 1").fetchone()
    if not row:
        raise RuntimeError("config table is empty")

    cfg_id, raw_data = row
    data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
    data = data or {}
    ui = data.setdefault("ui", {})
    invites = ui.setdefault("invite_codes", [])
    if not isinstance(invites, list):
        invites = []

    generated = []
    for _ in range(count):
        code = f"inv_{secrets.token_urlsafe(18)}"
        invite = {
            "id": str(uuid.uuid4()),
            "code": code,
            "created_at": now,
            "created_by": args.created_by,
            "used_at": None,
            "used_by": "",
            "revoked": False,
        }
        invites.append(invite)
        generated.append(code)

    ui["invite_codes"] = invites
    data["ui"] = ui

    cur.execute("UPDATE config SET data = ? WHERE id = ?", (json.dumps(data), cfg_id))
    conn.commit()
    conn.close()

    for code in generated:
        print(code)


if __name__ == "__main__":
    main()
