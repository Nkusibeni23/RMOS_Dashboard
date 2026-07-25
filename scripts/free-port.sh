#!/usr/bin/env bash
# Free the dev port before `next dev` starts.
#
# Why this is more than a one-line `kill`:
# `next dev` (and most dev servers) run a PARENT supervisor + a CHILD worker that
# actually holds the socket. Killing only the listener makes the parent respawn it
# and re-grab the port. So we kill the supervising parent too — but ONLY when that
# parent is itself a node/next process, never a shell, your terminal, or PID 1.
set -u
PORT="${1:-3000}"

listeners() { lsof -ti :"${PORT}" -sTCP:LISTEN 2>/dev/null; }
is_free()   { [ -z "$(listeners)" ]; }

# Kill the listener(s) and their node/next supervisor parents. $1 = signal.
sweep() {
  local sig="$1" pid ppid pcmd
  for pid in $(listeners); do
    ppid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
    if [ -n "$ppid" ] && [ "$ppid" -gt 1 ] 2>/dev/null; then
      pcmd="$(ps -o command= -p "$ppid" 2>/dev/null)"
      # Only ever kill a parent that is clearly a node/next dev supervisor.
      case "$pcmd" in
        *node*|*next*) kill "-${sig}" "$ppid" 2>/dev/null || true ;;
      esac
    fi
    kill "-${sig}" "$pid" 2>/dev/null || true
  done
}

is_free && exit 0

# Graceful: ask them to stop, then wait for the socket to actually be released.
for _ in 1 2 3; do
  sweep TERM
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    is_free && exit 0
    sleep 0.2
  done
done

# Last resort: force.
sweep KILL
sleep 0.5
is_free || echo "warn: port ${PORT} still busy after force-kill" >&2
exit 0
