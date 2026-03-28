# qbitOS — mu.eee (μ'search shell)

**mu.eee** is the **standalone reference + compliance home** for the **μ'search** unified chrome: header prompt, Tonnetz spine footer, and iframe stack that loads Search, History, GridPad, kbatch, throughline, games, globe, uvqbit, Core Race, Gridlock, Notes, and more from the [uvspeed](https://github.com/qbitOS/uvspeed) monorepo.

Internal HTML name: **`mueee.html`**. This repo tracks **org alignment** (same envelope as [qbitos-freya](https://github.com/qbitOS/qbitos-freya), [qbitos-iron-line](https://github.com/qbitOS/qbitos-iron-line), [qbitos-gluelam](https://github.com/qbitOS/qbitos-gluelam), [qbitos-gameHUB](https://github.com/qbitOS/qbitos-gameHUB)) while **canonical source** remains `web/mueee.html` + `scripts/build_mueee.py` + `web/mueee-throughline-spine.js`.

## Upstream

| Source | Role |
|--------|------|
| [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed) | `web/mueee.html`, `scripts/build_mueee.py`, `web/mueee-throughline-spine.js`, embedded apps under `web/` |
| [qbitOS/qbitos-freya](https://github.com/qbitOS/qbitos-freya) | Compliance pattern (`COMPLIANCE.qmd`) |
| [qbitOS/qbitos-iron-line](https://github.com/qbitOS/qbitos-iron-line) | Iron Line + spine semantics |
| [qbitOS/qbitos-gluelam](https://github.com/qbitOS/qbitos-gluelam) | Shared modules consumed inside iframes |

See **[UPSTREAM.md](UPSTREAM.md)** and **[docs/BUILD.md](docs/BUILD.md)** for sync and build.

## Live: mu.eee.qbitos.ai (Cloudflare)

The public **μ'search** shell is intended at **https://mu.eee.qbitos.ai/** via a **Cloudflare Worker** that serves **`mueee.html`** and proxies static assets from the uvspeed **`web/`** tree on GitHub Pages.

| Step | Action |
|------|--------|
| Worker source | [uvspeed `cloudflare/mu-eee-subdomain-worker.js`](https://github.com/qbitOS/uvspeed/blob/main/cloudflare/mu-eee-subdomain-worker.js) |
| Env | `PAGES_WEB_ORIGIN` = `https://qbitos.github.io/uvspeed/web` (or your Pages `web` base) |
| Route | `mu.eee.qbitos.ai/*` |
| DNS | CNAME **`mu.eee`** on zone **`qbitos.ai`** → Pages / org policy |

**Operator checklist:** **[docs/DEPLOY-qbitos.md](docs/DEPLOY-qbitos.md)** · **Upstream mirror:** [uvspeed `docs/deployment/mu-eee-qbitos-subdomain.md`](https://github.com/qbitOS/uvspeed/blob/main/docs/deployment/mu-eee-qbitos-subdomain.md)

## Contents (this repo)

| Path | Purpose |
|------|---------|
| [COMPLIANCE.qmd](COMPLIANCE.qmd) | Runtime path + control envelope (qbitOS baseline) |
| [docs/BUILD.md](docs/BUILD.md) | Regenerate mueee shell from uvspeed; optional static mirror |
| [docs/DEPLOY-qbitos.md](docs/DEPLOY-qbitos.md) | **mu.eee.qbitos.ai** — Cloudflare Worker + DNS |
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
