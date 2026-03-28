# Build — μ'search shell (mueee)

Canonical build lives in **uvspeed**. This document is the operator checklist.

## 1. Regenerate `mueee.html`

From the uvspeed repo:

```bash
uv run python scripts/build_mueee.py
```

This overwrites **`web/mueee.html`** from the template embedded in **`scripts/build_mueee.py`**.

## 2. Verify spine + scripts

- **`web/mueee-throughline-spine.js`** — `ORDER`, `LABELS`, `postToAllFrames` (skip unloaded iframes)
- **`web/mueee.html`** — iframe `data-src` lazy panes; Search `fetchpriority` where applicable

## 3. Service worker

Bump **`web/sw.js`** `CACHE_NAME` when shell or precache list changes.

## 4. Static mirror in **mu.eee** (`web/`)

This repo keeps a **checked-in copy** of the **same-origin bundle**: shell, spine, theme, **`search.html`**, shared JS, **`web/index.html`** (redirect → mueee). Without **`search.html`** on Pages, the Search **iframe** shows GitHub’s 404 inside the shell.

After changing uvspeed:

- **From uvspeed:** **`./scripts/sync-mueee-to-mu-eee.sh`** (recommended), or  
- **From mu.eee:** **`./scripts/sync-mueee-from-uvspeed.sh`**

Do not hand-edit mirrored **`mueee.html`** here — edit the uvspeed generator + spine, then sync.

Optional: **`MU_EEE_FULL_WEB=1`** with **`sync-mueee-to-mu-eee.sh`** rsyncs all of **`uvspeed/web/`** (every pane).

## 5. Compliance

Root **COMPLIANCE.qmd** must stay aligned with [qbitOS/compliance](https://github.com/qbitOS/compliance) policy. License triple: **LICENSE**, **LICENSE-MIT**, **LICENSE-APACHE** (Apache text matches **qbitos-freya**).
