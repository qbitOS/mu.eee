# Build — μ'search shell (mueee)

Canonical build lives in **uvspeed**. This document is the operator checklist.

## 1. Regenerate `mueee.html`

From the uvspeed repo:

```bash
uv run python scripts/build_mueee.py
```

This overwrites `web/mueee.html` from the template embedded in `scripts/build_mueee.py`.

## 2. Verify spine + scripts

- `web/mueee-throughline-spine.js` — `ORDER`, `LABELS`, `postToAllFrames` (skip unloaded iframes)
- `web/mueee.html` — iframe `data-src` lazy panes; Search `fetchpriority` where applicable

## 3. Service worker

Bump `web/sw.js` `CACHE_NAME` when shell or precache list changes.

## 4. Static mirror in **mu.eee** (`web/`)

This repo keeps a **checked-in copy** of:

- `web/mueee.html`
- `web/mueee-throughline-spine.js`

After regenerating in uvspeed, run **`scripts/sync-mueee-from-uvspeed.sh`** (see **UPSTREAM.md**). Do not hand-edit the mirrored `mueee.html` here — edit the uvspeed generator + spine, then sync.

Full iframe dependencies (`search.html`, `quantum-prefixes.js`, …) remain in **uvspeed** unless you publish a broader static bundle.

## 5. Compliance

Root **COMPLIANCE.qmd** must stay aligned with [qbitOS/compliance](https://github.com/qbitOS/compliance) policy. License triple: **LICENSE**, **LICENSE-MIT**, **LICENSE-APACHE** (Apache text matches **qbitos-freya**).
