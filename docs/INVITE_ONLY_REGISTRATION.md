# Invite-Only Registration

## What it does
- Signup form stays available.
- Creating a new account requires a valid invite code.
- Existing users can still sign in normally.

## Enable/Disable
- Admin UI:
  - `Admin -> Settings -> General -> Authentication`
  - Toggle `Invite-only Registration`.
- Config key in `config.data`:
  - `ui.invite_only_signup` (`true` or `false`)
- Env default (used when DB config is absent):
  - `INVITE_ONLY_SIGNUP=false`

## Generate invite codes
- Admin UI:
  - In `Admin -> Settings -> General -> Authentication`, click `Generate invite`.
  - The created code is copied to clipboard.
- CLI:
```bash
python3 scripts/generate_invite.py --db backend/data/webui.db --count 1 --created-by admin
```

## Revoke invite codes
- Admin UI:
  - In the invites list, click `Revoke` for an active code.

## API endpoints (admin)
- `GET /api/v1/auths/admin/invites`
- `POST /api/v1/auths/admin/invites/generate` with `{ "count": 1 }`
- `POST /api/v1/auths/admin/invites/{invite_id}/revoke`

## Signup payload
- `POST /api/v1/auths/signup` now accepts optional `invite_code`.
- If invite-only mode is enabled and invite is missing/invalid, signup returns `403`.
