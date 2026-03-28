# mueee.qbitos.ai / mu.eee.qbitos.ai — Cloudflare + GitHub Pages

Canonical **Worker source** lives in **[qbitOS/uvspeed](https://github.com/qbitOS/uvspeed)** (`cloudflare/`). This file is the **operator checklist** for **[qbitOS/mu.eee](https://github.com/qbitOS/mu.eee)** Pages + custom domains.

## What gets served

| Public URL | Backing |
|------------|---------|
| **https://mueee.qbitos.ai/** | Worker maps `/` → **`mueee.html`** on **`PAGES_WEB_ORIGIN`** |
| **https://mu.eee.qbitos.ai/** | Same Worker (second route) |
| **https://qbitos.github.io/mu.eee/mueee.html** | GitHub Pages (**this** repo — same static tree the Worker proxies) |

The Worker default origin is **`https://qbitos.github.io/mu.eee`** (see Worker source). Do **not** point **`PAGES_WEB_ORIGIN`** at uvspeed Pages unless you intentionally want the live monorepo **`web/`** tree instead of this mirror.

## 1. Worker (Cloudflare)

1. Deploy from **uvspeed**: **`cd cloudflare && npm run deploy:mueee`** (see **[uvspeed `cloudflare/README.md`](https://github.com/qbitOS/uvspeed/blob/main/cloudflare/README.md)**). Uses **`wrangler-mueee.jsonc`**.
2. **Environment variable** **`PAGES_WEB_ORIGIN`**:  
   **`https://qbitos.github.io/mu.eee`**  
   (no trailing slash; must be the site root where **`mueee.html`**, **`search.html`**, **`quantum-prefixes.js`**, **`sw.js`**, … are served for this repo’s Pages build.)
3. **Routes:** **`mueee.qbitos.ai/*`**, **`mu.eee.qbitos.ai/*`** (zone **`qbitos.ai`**).
4. **SSL/TLS:** Full (strict) to HTTPS origin.

## 2. DNS (zone `qbitos.ai`)

Proxied **CNAME** or A/AAAA for **`mueee`** and **`mu.eee`** per org policy so traffic hits the Worker routes.

## 3. Verify

- Load **https://mueee.qbitos.ai/** — μ'search shell (prompt + spine + Search iframe; not GitHub 404 in the iframe).
- **`curl -sI https://mueee.qbitos.ai/`** → **200**, `content-type: text/html`.

## Full spec

**[uvspeed `docs/deployment/mu-eee-qbitos-subdomain.md`](https://github.com/qbitOS/uvspeed/blob/main/docs/deployment/mu-eee-qbitos-subdomain.md)**
