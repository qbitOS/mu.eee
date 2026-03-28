#!/usr/bin/env bash
# Sync mirrored μ'search shell files from uvspeed into this repo (see UPSTREAM.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

resolve_uvspeed() {
  local c
  for c in \
    "${UVSPEED:-}" \
    "${HOME}/uvspeed" \
    "${HOME}/dev/projects/uvspeed" \
    "/Users/${USER:-}/uvspeed" \
    "/Users/${USER:-}/dev/projects/uvspeed"; do
    [[ -z "$c" ]] && continue
    [[ -f "$c/web/mueee.html" ]] && { echo "$c"; return 0; }
  done
  return 1
}

UVSPEED="$(resolve_uvspeed)" || {
  echo "error: could not find uvspeed clone with web/mueee.html" >&2
  echo "  Set UVSPEED=/path/to/uvspeed and re-run." >&2
  exit 1
}
echo "using UVSPEED=$UVSPEED"

mkdir -p "$ROOT/web"
for f in mueee.html mueee-throughline-spine.js; do
  cp "$UVSPEED/web/$f" "$ROOT/web/$f"
  echo "synced: web/$f"
done
