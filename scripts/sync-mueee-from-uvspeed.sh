#!/usr/bin/env bash
# Sync mirrored μ'search shell files from uvspeed into this repo (see UPSTREAM.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UVSPEED="${UVSPEED:-$HOME/dev/projects/uvspeed}"
if [[ ! -f "$UVSPEED/web/mueee.html" ]]; then
  echo "error: missing $UVSPEED/web/mueee.html — set UVSPEED to your uvspeed clone" >&2
  exit 1
fi
mkdir -p "$ROOT/web"
for f in mueee.html mueee-throughline-spine.js; do
  cp "$UVSPEED/web/$f" "$ROOT/web/$f"
  echo "synced: web/$f"
done
