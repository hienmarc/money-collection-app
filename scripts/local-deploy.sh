#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.local-deploy"
FRONTEND_PID_FILE="$STATE_DIR/frontend.pid"
FRONTEND_LOG_FILE="$STATE_DIR/frontend.log"

usage() {
  printf 'Usage: %s [--start|--stop|--stop-keep-db]\n' "$0" >&2
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

docker_is_running() {
  if ! docker info >/dev/null 2>&1; then
    printf 'Docker is not running. Start Docker Desktop, then run this script again.\n' >&2
    exit 1
  fi
}

is_frontend_process() {
  local pid="$1"
  local command
  local working_directory

  command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  if [[ "$command" != *"$ROOT_DIR/frontend/node_modules/.bin/next dev"* &&
    "$command" != *"$ROOT_DIR/frontend/node_modules/next/dist/bin/next dev"* &&
    "$command" != *"next-server"* ]]; then
    return 1
  fi

  working_directory="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' || true)"
  [[ "$working_directory" == "$ROOT_DIR/frontend" ]]
}

stop_frontend() {
  local pid=""

  require_command lsof
  require_command ps

  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    pid="$(<"$FRONTEND_PID_FILE")"
    if [[ ! "$pid" =~ ^[0-9]+$ ]] || ! is_frontend_process "$pid"; then
      pid=""
    fi
  fi

  if [[ -z "$pid" ]] && command -v lsof >/dev/null 2>&1; then
    local listener
    while IFS= read -r listener; do
      if [[ "$listener" =~ ^[0-9]+$ ]] && is_frontend_process "$listener"; then
        pid="$listener"
        break
      fi
    done < <(lsof -nP -t -iTCP:3000 -sTCP:LISTEN 2>/dev/null || true)
  fi

  if [[ -n "$pid" ]]; then
    printf 'Stopping the frontend (PID %s)...\n' "$pid"
    kill -TERM "$pid"
    for _ in {1..50}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.2
    done
    if kill -0 "$pid" 2>/dev/null; then
      printf 'Frontend process %s did not stop after SIGTERM.\n' "$pid" >&2
      return 1
    fi
  else
    printf 'Frontend is not running.\n'
  fi

  rm -f "$FRONTEND_PID_FILE"
}

start_stack() {
  require_command docker
  require_command npx
  require_command lsof
  require_command ps
  docker_is_running

  if [[ ! -x "$ROOT_DIR/frontend/node_modules/.bin/next" ]]; then
    printf 'Frontend dependencies are missing. Run "npm install" in frontend/ first.\n' >&2
    exit 1
  fi

  printf 'Starting local Redis and Upstash-compatible REST proxy...\n'
  docker compose --file "$ROOT_DIR/docker-compose.yml" up --detach

  printf 'Starting local Supabase...\n'
  (
    cd "$ROOT_DIR/supabase"
    npx supabase start
  )

  mkdir -p "$STATE_DIR"
  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    local existing_pid
    existing_pid="$(<"$FRONTEND_PID_FILE")"
    if [[ "$existing_pid" =~ ^[0-9]+$ ]] && is_frontend_process "$existing_pid"; then
      printf 'Frontend is already running at http://localhost:3000 (PID %s).\n' "$existing_pid"
      return
    fi
    rm -f "$FRONTEND_PID_FILE"
  fi

  printf 'Starting the frontend at http://localhost:3000 ...\n'
  (
    cd "$ROOT_DIR/frontend"
    nohup "$ROOT_DIR/frontend/node_modules/.bin/next" dev \
      >"$FRONTEND_LOG_FILE" 2>&1 </dev/null &
    echo "$!" >"$FRONTEND_PID_FILE"
  )
  sleep 1
  local frontend_pid
  frontend_pid="$(<"$FRONTEND_PID_FILE")"
  if ! kill -0 "$frontend_pid" 2>/dev/null || ! is_frontend_process "$frontend_pid"; then
    printf 'Frontend failed to start. See %s for details.\n' "$FRONTEND_LOG_FILE" >&2
    rm -f "$FRONTEND_PID_FILE"
    exit 1
  fi
  printf 'Frontend started (PID %s). Logs: %s\n' "$frontend_pid" "$FRONTEND_LOG_FILE"
}

stop_stack() {
  local keep_db="$1"

  stop_frontend
  require_command docker
  require_command npx
  docker_is_running

  printf 'Stopping and removing local Redis containers...\n'
  docker compose --file "$ROOT_DIR/docker-compose.yml" down

  if [[ "$keep_db" == "false" ]]; then
    printf 'Stopping all Supabase containers...\n'
    (
      cd "$ROOT_DIR/supabase"
      npx supabase stop
    )
  else
    printf 'Keeping local Supabase and its database running.\n'
  fi
}

if [[ "$#" -ne 1 ]]; then
  usage
  exit 2
fi

case "$1" in
  --start)
    start_stack
    ;;
  --stop)
    stop_stack false
    ;;
  --stop-keep-db)
    stop_stack true
    ;;
  *)
    usage
    exit 2
    ;;
esac
