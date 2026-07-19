#!/usr/bin/env bash
# Free the dev port before `next dev` starts.
#
# `next dev` runs a PARENT supervisor + a CHILD worker that actually listens.
# Killing only the listener makes the parent respawn it and re-grab the port,
# so we must kill the parent first, then wait for the socket to be released.
set -u
PORT="${1:-3001}"

# 1) Kill the `next dev` supervisor(s) for THIS port (takes the worker down too).
pkill -f "next dev -p ${PORT}" 2>/dev/null || true

# 2) Wait up to ~4s for the port to actually free (graceful).
for _ in $(seq 1 20); do
  if [ -z "$(lsof -ti :"${PORT}" -sTCP:LISTEN 2>/dev/null)" ]; then
    exit 0
  fi
  # Anything still holding it (a stray worker, another app) — ask it to stop.
  lsof -ti :"${PORT}" -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null || true
  sleep 0.2
done

# 3) Last resort: force-kill whatever is left on the port.
lsof -ti :"${PORT}" -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 0.3
exit 0
