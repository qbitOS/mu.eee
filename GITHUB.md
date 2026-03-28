# GitHub — first push

Use this folder as **`github.com/qbitOS/mu.eee`** (or your org’s equivalent).

## One-time setup

```bash
cd /Volumes/qbitOS/00.dev/mu.eee

git branch -M main
git remote add origin git@github.com:qbitOS/mu.eee.git
# or HTTPS: https://github.com/qbitOS/mu.eee.git

git add -A
git status
git commit -m "docs: mu.eee compliance + build (μ'search shell reference)"
git push -u origin main
```

## After uvspeed changes

See **UPSTREAM.md** and **docs/BUILD.md**.
