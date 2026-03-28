#!/usr/bin/env bash
# Sync LICENSE triple from uvspeed (same as qbitos-gluelam / qbitos-iron-line pattern).
set -euo pipefail
UVSPEED="${UVSPEED:-$HOME/dev/projects/uvspeed}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for f in LICENSE LICENSE-MIT LICENSE-APACHE; do
  cp "$UVSPEED/$f" "$ROOT/$f"
  echo "OK $f"
done
