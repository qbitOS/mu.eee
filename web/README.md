# `web/` — μ'search mirror

**Canonical source:** [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed) (`web/mueee.html`, `web/mueee-throughline-spine.js`).

This folder is a **checked-in mirror** for compliance, review, and optional GitHub Pages on **`qbitOS/mu.eee`**. Regenerate the shell in uvspeed (`uv run python scripts/build_mueee.py`), then run **`scripts/sync-mueee-from-uvspeed.sh`** from this repo.

**GitHub Pages:** set **Build and deployment → Branch `main` / folder `/web`** so **`https://qbitos.github.io/mu.eee/`** serves **`index.html`**, which redirects to **`mueee.html`**.

Embedded iframes load sibling apps (`search.html`, `history.html`, …) by relative URL — those assets live in **uvspeed** `web/` unless you deploy a fuller static bundle.
