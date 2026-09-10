#!/usr/bin/env bash
set -Eeuo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$root_dir"

frontend_pid=""
backend_pid=""

cleanup() {
  trap - EXIT INT TERM

  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi

  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" 2>/dev/null; then
    kill "$frontend_pid" 2>/dev/null || true
  fi

  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

if [[ ! -d node_modules ]]; then
  npm ci
fi

frontend_port="${FRONTEND_PORT:-5173}"
npm run dev -- --host "${HOST:-0.0.0.0}" --port "$frontend_port" &
frontend_pid=$!

if [[ -n "${BACKEND_COMMAND:-}" ]]; then
  backend_dir="${BACKEND_DIR:-$root_dir}"
  (
    cd "$backend_dir"
    exec bash -lc "$BACKEND_COMMAND"
  ) &
  backend_pid=$!
elif [[ -n "$(node -p 'require("./package.json").scripts?.backend ?? ""')" ]]; then
  npm run backend &
  backend_pid=$!
else
  printf 'No separate backend is configured; the Gemini service runs in the browser.\n'
fi

if [[ -n "$backend_pid" ]]; then
  wait -n "$frontend_pid" "$backend_pid"
else
  wait "$frontend_pid"
fi
