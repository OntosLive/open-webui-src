#!/usr/bin/env bash
set -euo pipefail

EXPECTED_PROJECT="${COMPOSE_PROJECT_NAME:-openwebui}"
EXPECTED_SERVICE="${EXPECTED_SERVICE:-open-webui}"
EXPECTED_CONTAINER="${EXPECTED_CONTAINER:-open-webui}"
EXPECTED_PORT="${EXPECTED_PORT:-3000}"

log_line() {
  local level="$1"
  local message="$2"
  echo "${level}: ${message}" >&2
  if command -v logger >/dev/null 2>&1; then
    logger -t openwebui-startup-guard "${level}: ${message}" || true
  fi
}

mapfile -t service_matches < <(
  docker ps --format '{{.ID}}\t{{.Names}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}\t{{.Label "com.docker.compose.service"}}' \
    | awk -F '\t' -v service="$EXPECTED_SERVICE" '$5 == service { print }'
)

mapfile -t port_matches < <(
  docker ps --format '{{.ID}}\t{{.Names}}\t{{.Ports}}\t{{.Label "com.docker.compose.project"}}\t{{.Label "com.docker.compose.service"}}' \
    | awk -F '\t' -v port="$EXPECTED_PORT" '$3 ~ ("(^|[ ,])127\\.0\\.0\\.1:" port "->|(^|[ ,])0\\.0\\.0\\.0:" port "->|(^|[ ,])\\[::\\]:" port "->") { print }'
)

if ((${#service_matches[@]} > 1)); then
  log_line "FAIL" "more than one WebUI container is running."
  printf '%s\n' "${service_matches[@]}" >&2
  exit 1
fi

if ((${#port_matches[@]} > 1)); then
  log_line "FAIL" "more than one container is bound to port ${EXPECTED_PORT}."
  printf '%s\n' "${port_matches[@]}" >&2
  exit 1
fi

if ((${#port_matches[@]} == 1)); then
  port_name="$(printf '%s' "${port_matches[0]}" | cut -f2)"
  port_project="$(printf '%s' "${port_matches[0]}" | cut -f4)"
  if [[ "$port_name" != "$EXPECTED_CONTAINER" ]]; then
    log_line "FAIL" "port ${EXPECTED_PORT} is owned by '${port_name}', not '${EXPECTED_CONTAINER}'."
    printf '%s\n' "${port_matches[0]}" >&2
    exit 1
  fi
  if [[ -n "$port_project" && "$port_project" != "$EXPECTED_PROJECT" ]]; then
    log_line "WARN" "'${port_name}' is serving port ${EXPECTED_PORT} from legacy compose project '${port_project}'. Proceeding because it is the only active WebUI instance."
  fi
fi

if ((${#service_matches[@]} == 1)); then
  service_project="$(printf '%s' "${service_matches[0]}" | cut -f4)"
  service_name="$(printf '%s' "${service_matches[0]}" | cut -f2)"
  if [[ "$service_name" != "$EXPECTED_CONTAINER" ]]; then
    log_line "FAIL" "found WebUI service container '${service_name}', expected '${EXPECTED_CONTAINER}'."
    printf '%s\n' "${service_matches[0]}" >&2
    exit 1
  fi
  if [[ -n "$service_project" && "$service_project" != "$EXPECTED_PROJECT" ]]; then
    log_line "WARN" "WebUI container belongs to legacy compose project '${service_project}'. Proceeding because there is no competing instance."
  fi
fi

log_line "OK" "single-instance prestart check passed for project=${EXPECTED_PROJECT} container=${EXPECTED_CONTAINER} port=${EXPECTED_PORT}"
