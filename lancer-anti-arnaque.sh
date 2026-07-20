#!/usr/bin/env bash
# Lance KDL Anti-arnaque et ouvre le navigateur.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-4210}"
if ! curl -sf "http://127.0.0.1:$PORT/api/sante" >/dev/null 2>&1; then
  node server.js &
  for _ in $(seq 1 20); do
    curl -sf "http://127.0.0.1:$PORT/api/sante" >/dev/null 2>&1 && break
    sleep 0.3
  done
fi
xdg-open "http://127.0.0.1:$PORT/" >/dev/null 2>&1
