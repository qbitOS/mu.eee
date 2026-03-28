# qbitOS — mu.eee (μ'search shell)

**mu.eee** is the **standalone reference + compliance home** for the **μ'search** unified chrome: header prompt, Tonnetz spine footer, and iframe stack (Search, History, GridPad, kbatch, throughline, games, globe, uvqbit, Core Race, Gridlock, Notes, …) from the [uvspeed](https://github.com/qbitOS/uvspeed) monorepo.

Internal HTML name: **`mueee.html`**. This repo tracks **org alignment** (same envelope as [qbitos-freya](https://github.com/qbitOS/qbitos-freya), [qbitos-iron-line](https://github.com/qbitOS/qbitos-iron-line), [qbitos-gluelam](https://github.com/qbitOS/qbitos-gluelam), [qbitos-gameHUB](https://github.com/qbitOS/qbitos-gameHUB)). **Canonical build** stays in [uvspeed](https://github.com/qbitOS/uvspeed); this repo **mirrors** a **same-origin bundle** under **`web/`** for GitHub Pages and the Cloudflare Worker (see sync below).

## Upstream

| Source | Role |
|--------|------|
| [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed) | `scripts/build_mueee.py` → `web/mueee.html`, `web/mueee-throughline-spine.js`, embedded apps; **`scripts/sync-mueee-to-mu-eee.sh`** pushes the mirror bundle here |
| [qbitOS/qbitos-freya](https://github.com/qbitOS/qbitos-freya) | Compliance pattern (`COMPLIANCE.qmd`) |
| [qbitOS/qbitos-iron-line](https://github.com/qbitOS/qbitos-iron-line) | Iron Line + spine semantics |
| [qbitOS/qbitos-gluelam](https://github.com/qbitOS/qbitos-gluelam) | Shared modules consumed inside iframes |

See **[UPSTREAM.md](UPSTREAM.md)** and **[docs/BUILD.md](docs/BUILD.md)** for sync and build.

## Live (Cloudflare + GitHub Pages)

The shell is **same-origin** on this repo’s Pages site. **`mueee.html`** does **not** pull iframes from live uvspeed Pages by default (release cadence); optional **`?paneBase=uvspeed`** tests against uvspeed.

| URL | Role |
|-----|------|
| **https://mueee.qbitos.ai/** | Worker → **`PAGES_WEB_ORIGIN`** (see below) |
| **https://mu.eee.qbitos.ai/** | Same Worker (second route) |
| **https://qbitos.github.io/mu.eee/mueee.html** | Direct GitHub Pages (paths are repo-root URLs; see **web/** in repo) |

| Step | Action |
|------|--------|
| Worker source | [uvspeed `cloudflare/mu-eee-subdomain-worker.js`](https://github.com/qbitOS/uvspeed/blob/main/cloudflare/mu-eee-subdomain-worker.js) |
| Deploy | From **uvspeed**: `cd cloudflare && npm run deploy:mueee` (see [uvspeed `cloudflare/README.md`](https://github.com/qbitOS/uvspeed/blob/main/cloudflare/README.md)) |
| Env | **`PAGES_WEB_ORIGIN`** = **`https://qbitos.github.io/mu.eee`** (no trailing slash; must match where **`mueee.html`** and pane assets live) |
| Routes | **`mueee.qbitos.ai/*`**, **`mu.eee.qbitos.ai/*`** (zone **`qbitos.ai`**) |
| DNS | Proxied hostnames for **`mueee`** / **`mu.eee`** on **`qbitos.ai`** per org policy |

**Operator checklist:** **[docs/DEPLOY-qbitos.md](docs/DEPLOY-qbitos.md)** · **Full spec:** [uvspeed `docs/deployment/mu-eee-qbitos-subdomain.md`](https://github.com/qbitOS/uvspeed/blob/main/docs/deployment/mu-eee-qbitos-subdomain.md)

## Sync from uvspeed (recommended)

**From uvspeed repo root** (copies shell + Search bundle + `web/index.html`):

```bash
./scripts/sync-mueee-to-mu-eee.sh
# optional: MU_EEE_FULL_WEB=1 ./scripts/sync-mueee-to-mu-eee.sh
```

**From this repo** (pulls the same file set if **`UVSPEED`** points at your uvspeed clone):

```bash
./scripts/sync-mueee-from-uvspeed.sh
```

## Contents (this repo)

| Path | Purpose |
|------|---------|
| [web/](web/) | Mirrored **mueee** shell, spine, **search.html** + shared JS, theme, sw, **`web/index.html`** → mueee |
| [index.html](index.html) | Root redirect / landing (repo layout dependent) |
| [COMPLIANCE.qmd](COMPLIANCE.qmd) | Runtime path + control envelope (qbitOS baseline) |
| [docs/BUILD.md](docs/BUILD.md) | Regenerate mueee in uvspeed; mirror checklist |
| [scripts/sync-mueee-from-uvspeed.sh](scripts/sync-mueee-from-uvspeed.sh) | Pull bundle from uvspeed into **`web/`** |
| [docs/DEPLOY-qbitos.md](docs/DEPLOY-qbitos.md) | Cloudflare Worker + DNS |
| [reference/mu-eee-manifest.json](reference/mu-eee-manifest.json) | Machine-readable upstream pointers |
| [.github/workflows](.github/workflows) | Compliance + CI checks |

## Community

- **[Code of Conduct](CODE_OF_CONDUCT.md)**
- **[Contributing](CONTRIBUTING.md)**
- **[Security](SECURITY.md)**

## License

Licensed under **MIT OR Apache-2.0** — [LICENSE](LICENSE), [LICENSE-MIT](LICENSE-MIT), [LICENSE-APACHE](LICENSE-APACHE). Apache-2.0 text matches [qbitOS/qbitos-freya](https://github.com/qbitOS/qbitos-freya).

Copyright © 2026 Tad R. Ericson.

## GitHub

Push instructions: **[GITHUB.md](GITHUB.md)**.
