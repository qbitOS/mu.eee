# `web/` — μ'search mirror

**Canonical source:** [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed) (`web/mueee.html`, `web/mueee-throughline-spine.js`).

This folder is a **checked-in mirror** for compliance, review, and optional GitHub Pages on **`qbitOS/mu.eee`**. Regenerate the shell in uvspeed (`uv run python scripts/build_mueee.py`), then run **`scripts/sync-mueee-from-uvspeed.sh`** from this repo.

**GitHub Pages**

- **Actions (artifact = `web/` only):** site root is **`/`** → **`mueee.html`** (no **`/web/`** in the URL).
- **Branch deploy (repo root):** the shell stays under **`web/`**, so **`https://qbitos.github.io/mu.eee/web/mueee.html`** is the app path; **repo root `index.html`** redirects to **`web/mueee.html`** so **`https://qbitos.github.io/mu.eee/`** is not a 404.

Embedded iframes load sibling apps (`search.html`, `history.html`, …) by relative URL — those assets live in **uvspeed** `web/` unless you deploy a fuller static bundle.
