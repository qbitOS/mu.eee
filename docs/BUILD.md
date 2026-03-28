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

## 4. Optional: static mirror

If this **mu.eee** repo later holds a **static export** (e.g. CI copies `mueee.html` + assets), document the exact `cp` list in **UPSTREAM.md** — do not duplicate `web/` without a version pin.

## 5. Compliance

Root **COMPLIANCE.qmd** must stay aligned with [qbitOS/compliance](https://github.com/qbitOS/compliance) policy. License triple: **LICENSE**, **LICENSE-MIT**, **LICENSE-APACHE** (Apache text matches **qbitos-freya**).
