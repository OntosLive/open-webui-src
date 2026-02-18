# Kelia v1.2 UI Cleanup

## What was changed
- Top-right control surface is disabled in Kelia:
  - no top-right user avatar menu,
  - no top-right ellipsis menu,
  - no temporary chat / controls buttons.
- Bottom-left sidebar user menu is always present and is the only menu in Kelia.
- Kelia user menu is minimal:
  - keeps `Settings` + `Sign Out`,
  - hides archived/admin/help/active-users sections.
- Message editing policy in Kelia:
  - edit button is shown only for own user messages,
  - assistant-message edit remains hidden.
- Minimal assistant action surface in Kelia:
  - hides continue/regenerate/delete/model action buttons.
- Streaming/pulse/status indicators remain visible (no Kelia gating added there).

## Verification
1. Login as a Kelia-profile user (`ui_profile=kelia`).
2. Verify top-right area:
   - no avatar menu,
   - no `...` menu.
3. Verify left sidebar footer:
   - user menu exists and opens,
   - no admin/help/archive entries.
4. In chat:
   - own user message has edit action,
   - assistant message has no edit/TTS,
   - streaming/status indicators are visible while generating.
5. Switch to non-Kelia user:
   - top-right menus are back,
   - non-Kelia behavior remains unchanged.

## Release flow
```bash
cd /home/ontoslive/ontos_work/ontogit-stack
bash scripts/ops/smoke_v1.sh
bash scripts/deploy_openwebui.sh
bash scripts/ops/smoke_v1.sh
```
