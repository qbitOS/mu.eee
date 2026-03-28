# `web/` — μ'search mirror

**Canonical source:** [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed) (`web/mueee.html`, `web/mueee-throughline-spine.js`).

This folder is a **checked-in mirror** for compliance, review, and optional GitHub Pages on **`qbitOS/mu.eee`**. Regenerate the shell in uvspeed (`uv run python scripts/build_mueee.py`), then run **`scripts/sync-mueee-from-uvspeed.sh`** from this repo.

Embedded iframes load sibling apps (`search.html`, `history.html`, …) by relative URL — those assets live in **uvspeed** `web/` unless you deploy a fuller static bundle.
