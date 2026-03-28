# Syncing from uvspeed

Canonical **code** lives in [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed). This repo tracks **compliance + mirror**; it does not replace the monorepo.

## What gets mirrored (default bundle)

The **`mueee.html`** shell loads iframes **same-origin** from this repo’s **`web/`** on Pages. The mirror includes at least:

| From uvspeed `web/` | Into mu.eee `web/` |
|---------------------|-------------------|
| `mueee.html` | ✓ (from `scripts/build_mueee.py`) |
| `mueee-throughline-spine.js` | ✓ |
| `quantum-theme.css`, `sw.js` | ✓ |
| `search.html` | ✓ |
| `quantum-prefixes.js`, `qbit-dac.js`, `qbit-steno.js` | ✓ |
| `isomorphic-export-facet.js`, `history-search-engine.js` | ✓ |
| `spine-hub-catalog.js`, `search-spine-concepts.js`, `search-drill-cluster.js` | ✓ |
| `web/index.html` | ✓ (redirect → `mueee.html`) |

Optional: **`MU_EEE_FULL_WEB=1`** when running uvspeed **`sync-mueee-to-mu-eee.sh`** rsyncs the entire **`uvspeed/web/`** tree (all panes; large).

## One-shot sync (recommended)

**Push from uvspeed into this clone** (script auto-detects **`MU_EEE`**; set **`MU_EEE`** if needed):

```bash
# Run from uvspeed repo root:
./scripts/sync-mueee-to-mu-eee.sh
```

**Pull from this repo** if you only have uvspeed on disk (set **`UVSPEED`** if auto-detect fails):

```bash
# Run from mu.eee repo root:
./scripts/sync-mueee-from-uvspeed.sh
```

## Regenerate mueee in uvspeed

```bash
cd "$UVSPEED"
uv run python scripts/build_mueee.py
```

See **docs/BUILD.md** for a full checklist.
