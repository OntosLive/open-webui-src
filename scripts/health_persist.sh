#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
API_BASE="${BASE_URL}/api"
TOKEN="${TOKEN:-}"
CONTAINER="${CONTAINER:-open-webui}"

echo "== api/version =="
curl -fsS "${API_BASE}/version"
echo
echo

echo "== runtime identity =="
container_id="$(docker inspect "${CONTAINER}" --format '{{.Id}}')"
compose_project="$(docker inspect "${CONTAINER}" --format '{{index .Config.Labels "com.docker.compose.project"}}')"
echo "active_container=${CONTAINER}"
echo "container_id=${container_id}"
echo "compose_project=${compose_project}"
echo

echo "== /app/backend/data mount =="
docker inspect "${CONTAINER}" --format '{{range .Mounts}}{{if eq .Destination "/app/backend/data"}}type={{.Type}} source={{.Source}} destination={{.Destination}}{{println}}{{end}}{{end}}'
echo

db_source="$(docker inspect "${CONTAINER}" --format '{{range .Mounts}}{{if eq .Destination "/app/backend/data"}}{{.Source}}{{end}}{{end}}')"
db_path="${db_source%/}/webui.db"

echo "db_path=${db_path}"
if [[ -n "${db_source}" && -e "${db_path}" ]]; then
  stat "${db_path}"
else
  echo "WARNING: webui.db not found at ${db_path}" >&2
fi
echo

if [[ -z "${TOKEN}" ]]; then
  echo "TOKEN is not set; skipping admin config endpoint checks."
  exit 0
fi

echo "== auth admin config =="
curl -fsS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/v1/auths/admin/config"
echo
echo

echo "== interface config =="
curl -fsS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/v1/configs/interface"
echo
echo

echo "== model config =="
curl -fsS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/v1/configs/models"
echo
