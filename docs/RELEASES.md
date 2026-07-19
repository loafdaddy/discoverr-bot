# Discoverr releases

Track every published version here. Update this file when cutting a release, then tag and publish on GitHub.

Current version in tree: **2.0.0** (`package.json`).

## Versioning

Discoverr uses [Semantic Versioning](https://semver.org/):

| Part | Meaning for Discoverr |
|------|------------------------|
| **MAJOR** | Breaking config, env, or run-path changes operators must migrate for |
| **MINOR** | New categories, discovery behaviour, or notable features |
| **PATCH** | Fixes and small polish |

Pre-1.0 history lived as an untagged JavaScript bot. **2.0.0** is the first SemVer release of the TypeScript rewrite — treat it as the baseline going forward.

## How to cut a release

1. Ensure `main` is green (build + tests) and docs match the code
2. Set `version` in [`package.json`](../package.json) (and keep lockfile in sync if you use `npm version`)
3. Add a section below in this file; bump version mentions in [`README.md`](../README.md) / [`SETUP.md`](../SETUP.md) if needed
4. Commit on `main` (or merge the release PR)
5. Tag: `git tag -a v2.0.0 -m "Discoverr 2.0.0"`
6. Push: `git push origin main --tags`
7. Create the GitHub release (notes can mirror the section below)
8. Sanity-check from a clean clone:

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
git checkout v2.0.0
cp .env.example .env
# fill required values
docker compose up -d --build
docker logs -f discoverr
```

### Release notes checklist

- Highlight user-facing changes (discovery, Seerr, Discord, config)
- Call out **breaking** env / run-path changes
- Link install: [SETUP.md](../SETUP.md)
- Link known gaps: [TODO.md](TODO.md)
- Include the AI note if the release involved substantial AI-assisted work

## Releases

### 2.0.0 — 2026-07-19 (TypeScript discovery rewrite)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.0.0)

**Highlights**
- Full rewrite to **TypeScript** (`src/` compiled inside the Docker image)
- Diversified discovery: multi-page TMDb pools, rotating genre/sort, weighted mid-list sampling
- Suggestion history cooldown via `HISTORY_TTL_DAYS` (default 90)
- Seerr availability uses numeric `media.status` (AVAILABLE / PENDING / etc.); fail-closed lookups by default
- Configurable `CRON_SCHEDULE`, `TZ`, `TMDB_LANGUAGE`, `TMDB_PAGES`, `MIN_RATING`, `MIN_VOTES`
- Runtime Discord strings without emoji; brand kit under `data/brand/`
- Unit tests for status mapping, history TTL, watch region, sampling
- **Docker-only** operator path: `Dockerfile` + `docker compose up -d --build` (container `discoverr`, `./data` mounted)

**Breaking (from the old `bot.js` bot)**
- No more `node bot.js` / host npm run — use Docker Compose
- New optional env knobs (see [`.env.example`](../.env.example)); merge them into existing `.env` files
- Compose service/container renamed to `discoverr`; image is built from the Dockerfile

**Install**
- Clone or checkout the `v2.0.0` tag
- Follow [SETUP.md](../SETUP.md)
- GitHub: https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.0.0

**Known gaps:** see [TODO.md](TODO.md)

**AI note:** Substantial parts of this release were developed with AI assistance. AI-assisted contributions remain welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).

### Pre-2.0 (unversioned JavaScript bot)

**Status:** superseded by 2.0.0

Single-file `bot.js` Discord bot with page-1 popularity discovery, string-based Seerr status heuristics, and hardcoded Melbourne cron. No SemVer tags were published for that line.
