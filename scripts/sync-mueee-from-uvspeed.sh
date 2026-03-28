#!/usr/bin/env bash
# Pull the same μ'search mirror bundle as uvspeed's scripts/sync-mueee-to-mu-eee.sh (see UPSTREAM.md).
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

if [[ -n "${MU_EEE_FULL_WEB:-}" ]]; then
  rsync -a --exclude='.DS_Store' "${UVSPEED}/web/" "${ROOT}/web/"
  echo "full rsync → ${ROOT}/web/"
else
  FILES=(
    mueee.html
    mueee-throughline-spine.js
    quantum-theme.css
    sw.js
    search.html
    quantum-prefixes.js
    qbit-dac.js
    qbit-steno.js
    isomorphic-export-facet.js
    history-search-engine.js
    spine-hub-catalog.js
    search-spine-concepts.js
    search-drill-cluster.js
  )
  for f in "${FILES[@]}"; do
    [[ -f "$UVSPEED/web/$f" ]] || { echo "missing $UVSPEED/web/$f" >&2; exit 1; }
    cp "$UVSPEED/web/$f" "$ROOT/web/$f"
    echo "synced: web/$f"
  done
fi

cat >"$ROOT/web/index.html" <<'IDX'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0; url=mueee.html">
<title>μ'search</title>
<link rel="canonical" href="mueee.html">
</head>
<body>
<p>Redirecting to <a href="mueee.html">mueee.html</a>…</p>
</body>
</html>
IDX
echo "wrote: web/index.html (redirect → mueee.html)"

if [[ -n "${MU_EEE_WRITE_ROOT_INDEX:-}" ]]; then
  cat >"$ROOT/index.html" <<'ROOTIDX'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0; url=web/mueee.html">
<title>μ'search</title>
<link rel="canonical" href="web/mueee.html">
</head>
<body>
<p>Redirecting to <a href="web/mueee.html">web/mueee.html</a>…</p>
</body>
</html>
ROOTIDX
  echo "wrote: index.html (redirect → web/mueee.html)"
fi

echo "done (ROOT=$ROOT)"
