#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/ontoslive/ontos_work/open-webui-src"
TMP_OVERRIDE="/tmp/openwebui.signup-disabled.override.$$.$RANDOM.yaml"

DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
  if sudo -n docker ps >/dev/null 2>&1 || sudo -E docker ps >/dev/null 2>&1; then
    DOCKER_CMD="sudo -E docker"
    echo "Using sudo docker (password may be required)"
  else
    echo "Docker is not accessible (direct or via sudo)."
    exit 1
  fi
fi

cat > "${TMP_OVERRIDE}" <<'YAML'
services:
  open-webui:
    environment:
      - WEBUI_DISABLE_SIGNUP=true
YAML

cleanup() {
  rm -f "${TMP_OVERRIDE}"
  (
    cd "${ROOT_DIR}" && \
    $DOCKER_CMD compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d --force-recreate open-webui >/dev/null
  ) || true
}
trap cleanup EXIT

(
  cd "${ROOT_DIR}" && \
  $DOCKER_CMD compose -f docker-compose.yaml -f docker-compose.dev.yaml -f "${TMP_OVERRIDE}" up -d --force-recreate open-webui
)

start="$(date +%s)"
while true; do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/health || true)"
  if [ "${code}" = "200" ]; then
    break
  fi
  if [ $(( $(date +%s) - start )) -ge 45 ]; then
    echo "Timeout waiting for open-webui health"
    exit 1
  fi
  sleep 1
done

EMAIL="smoke_signup_disabled_$(date +%s)@example.com"
RESP_FILE="/tmp/openwebui_signup_disabled_resp.$$"
HTTP_CODE="$(curl -s -o "${RESP_FILE}" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke\",\"email\":\"${EMAIL}\",\"password\":\"Passw0rd!123\"}" \
  http://127.0.0.1:3000/api/v1/auths/signup)"

if [ "${HTTP_CODE}" != "403" ]; then
  echo "Expected HTTP 403 for signup when WEBUI_DISABLE_SIGNUP=true, got ${HTTP_CODE}"
  cat "${RESP_FILE}" || true
  exit 1
fi

python3 - "${RESP_FILE}" <<'PY'
import json,sys
p=sys.argv[1]
with open(p,encoding='utf-8') as f:
    d=json.load(f)
if d.get('error')!='signup_disabled':
    raise SystemExit(f"expected {{'error':'signup_disabled'}}, got {d}")
PY

echo "OK: signup disabled returns 403 {\"error\":\"signup_disabled\"}"
