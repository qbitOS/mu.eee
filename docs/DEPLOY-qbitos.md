# mu.eee.qbitos.ai — Cloudflare + GitHub Pages

Canonical **implementation** (Worker source, spine plans) lives in **[qbitOS/uvspeed](https://github.com/qbitOS/uvspeed)**. This file is the **operator checklist** for this repo.

## What gets served

| Public URL | Backing |
|------------|---------|
| **https://mu.eee.qbitos.ai/** | Worker maps `/` → **`mueee.html`** on Pages **`web/`** |
| **https://qbitos.github.io/uvspeed/web/mueee.html** | Direct Pages path (same app) |

## 1. Worker (Cloudflare)

1. Copy **[uvspeed `cloudflare/mu-eee-subdomain-worker.js`](https://github.com/qbitOS/uvspeed/blob/main/cloudflare/mu-eee-subdomain-worker.js)** into a new Worker.
2. **Environment variable** **`PAGES_WEB_ORIGIN`** (optional):  
   `https://qbitos.github.io/uvspeed/web`  
   (no trailing slash; must be the folder that contains `mueee.html`, `quantum-prefixes.js`, `sw.js`, …)
3. **Route:** `mu.eee.qbitos.ai/*`
4. **SSL/TLS:** Full (strict) to HTTPS origin.

## 2. DNS (zone `qbitos.ai`)

In Cloudflare **DNS**, add a **CNAME** for **`mu.eee`** pointing at your GitHub Pages host (e.g. `qbitos.github.io`) **or** follow your org’s pattern for Worker-only hostnames.

## 3. Verify

- Load **https://mu.eee.qbitos.ai/** — μ'search shell (prompt + Tonnetz spine + iframes).
- Run a search — embedded **search.html** emits **`mueee-spine-block`** to the parent shell (see uvspeed **`plans/mueee-spine-orchestration-v1.plan.md`**).

## Full spec

Upstream doc (may be updated first):  
**[uvspeed `docs/deployment/mu-eee-qbitos-subdomain.md`](https://github.com/qbitOS/uvspeed/blob/main/docs/deployment/mu-eee-qbitos-subdomain.md)**
