# Discoverr releases

Track every published version here. Update this file when cutting a release, then tag and publish on GitHub.

Current version in tree: **3.2.1** (`package.json`).

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
5. Tag: `git tag -a v3.2.1 -m "Discoverr 3.2.1"`
6. Push: `git push origin main --tags`
7. Create the GitHub release (notes can mirror the section below)
8. Sanity-check from a clean clone:

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
git checkout v3.2.1
cp .env.example .env
# fill secrets in .env — see SETUP.md
# optional: cp settings.example.json data/settings.json
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

### 3.2.1 — CI, license, overview fallback, Seerr health (2026-08-11)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.2.1)

**Branch:** `release/3.2.1`

**Headline:** Operator and contributor hygiene — GitHub Actions CI, MIT license, TMDb overview language fallback ([#4](https://github.com/loafdaddy/discoverr-bot/issues/4)), Seerr startup health check, and GHCR publish workflow.

**Highlights**
- CI workflow: `npm run typecheck` + `npm test` on pushes/PRs to `main`
- MIT `LICENSE` (README license section updated)
- `TMDB_FALLBACK_LANGUAGE` (default `en`) when primary language has no overview
- Startup Seerr probe (`/api/v1/status` + login) with clearer URL / TLS / credential errors
- GHCR workflow on `v*` tags; optional `image:` notes in Compose / SETUP (Compose-from-source remains primary)

**Upgrade from 3.2.0**

```bash
git pull
docker compose up -d --build
```

Optional new env: `TMDB_FALLBACK_LANGUAGE=en` (default if unset).

**Install (new)**
- Follow [SETUP.md](../SETUP.md)

**Known gaps:** see [TODO.md](TODO.md)

**AI note:** Parts of this release were developed with AI assistance. AI-assisted contributions remain welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

### 3.2.0 — Plex and Jellyfin via Seerr (2026-08-11)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.2.0)

**Headline:** Discoverr supports **Plex** and **Jellyfin** servers that use Seerr for requests. No app redesign — still talks only to Seerr, Discord, and TMDb. Same `.env` / Compose path for both stacks.

**Highlights**
- README “Works with” and FAQ: Plex and Jellyfin via Seerr
- SETUP §3: shared Seerr user steps + short Plex vs Jellyfin notes (local Seerr user, library sync)
- Troubleshooting: scan lag, AVAILABLE still recommended, OAuth-only login failures, container Seerr URL
- Architecture notes that `media.status` gating is the same for both media servers
- Code audit + unit tests: no media-server-specific code; AVAILABLE gating unchanged; **no Phase B code changes**

**Verification**
- Unit tests and typecheck pass
- Live Plex-backed Seerr smoke checklist remains in [TODO.md](TODO.md) for operators

**Upgrade from 3.1.1**

```bash
git pull
docker compose up -d --build
```

No config or env changes. Existing Jellyfin operators need no migration.

**Install (new)**
- Follow [SETUP.md](../SETUP.md): fill `.env` from `.env.example` (Plex or Jellyfin behind Seerr)

**Deferred (post-3.2.0):** Seerr startup health checks; optional new env vars; direct Plex/Jellyfin APIs — see [ROADMAP.md](ROADMAP.md) · [TODO.md](TODO.md)

**Known gaps:** see [TODO.md](TODO.md)

**AI note:** Parts of this release were developed with AI assistance. AI-assisted contributions remain welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

### 3.1.1 — Discovery performance polish (2026-07-26)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.1.1)

**Headline:** Small discovery-run optimizations — fewer Seerr lookups per pick, parallel TMDb category fetches, cached watch-provider lists.

**Highlights**
- Cap Seerr availability checks to a modest sample pool (keeps mid-list bias, skips scanning every discover hit)
- Fetch movie / TV / trending / new / hidden candidate pools in parallel before sequential selection
- Cache TMDb watch-provider lists per region; resolve configured streaming services concurrently
- Parallel day + week trending page fetches
- Unit coverage for Seerr pool capping and AVAILABLE skip behaviour

**Upgrade from 3.1.0**

```bash
git pull
docker compose up -d --build
```

No config or env changes.

**Install (new)**
- Follow [SETUP.md](../SETUP.md): fill `.env` from `.env.example`
- GitHub: https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.1.1

**Known gaps:** see [TODO.md](TODO.md)

---

### 3.1.0 — Optional settings clarified (2026-07-23)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.1.0)

**Headline:** Restores the simple **`.env`-first** install path. Optional `data/settings.json` is only for extra post configuration, with `#` comments on every setting so it is easy to edit.

**Highlights**
- Full `.env.example` restored (same style as 2.x) — channels, schedule, region, streaming list, secrets
- `settings.json` is never required; missing file uses built-in defaults
- Commented `settings.example.json` (`#` / `//` supported) for post counts, quotas, TV in streaming, memory, dry-run
- SETUP is step-by-step again; extra post config is step 8 at the end
- Docs scrubbed so settings do not feel mandatory

**Upgrade from 3.0.0 / 2.x**

```bash
git pull
docker compose up -d --build
```

Keep your `.env`. Add `data/settings.json` only if you want [extra configuration for posts](../SETUP.md#8-extra-configuration-for-posts-optional).

**Install (new)**
- Follow [SETUP.md](../SETUP.md): fill `.env` from `.env.example`
- GitHub: https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.1.0

**Known gaps:** see [TODO.md](TODO.md)

---

### 3.0.0 — Config Update (2026-07-23)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.0.0)

**Headline:** Optional `data/settings.json` if you want extra configuration for posts (counts, quotas, TV in streaming, memory, dry-run). **`.env` stays the primary config** — same template and workflow as 2.x. Existing `.env` files keep working without edits; `settings.json` is never required.

**Highlights**
- **`.env` unchanged as the install path** — channels, schedule, region, streaming list, quality floors, secrets (see `.env.example`)
- **Optional `data/settings.json`** — only if you want extra post config; copy `settings.example.json` when ready (comments explain each line)
- Per-category **post counts (1–3)** and optional **streaming quotas**
- **TV in New on Streaming** via `streaming.includeTv` (default `false` = 2.x movies-only)
- **Dual memory TTLs** — optional; Request button writes `requestedAt`
- **`discovery.dryRun`** — log picks without Discord posts
- Clearer startup validation when a settings file is present and invalid

**Your `.env` is safe**
- Do **not** delete or rewrite your existing `.env` to upgrade
- Required and optional env vars work exactly as in 2.x
- Skip `settings.json` entirely unless you want extra post configuration

**Upgrade from 2.x**

```bash
git pull
docker compose up -d --build
```

Keep your `.env`. Optionally add `data/settings.json` later — [SETUP.md § Extra configuration](../SETUP.md#8-extra-configuration-for-posts-optional).

**Install (new)**
- Follow [SETUP.md](../SETUP.md): fill `.env` from `.env.example`
- GitHub: https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.0.0

**Clarification:** Early 3.0.0 docs briefly steered toward settings-first; that was wrong. Fixed in **3.1.0** — `.env` is primary; `settings.json` is optional extra post config only.

**Known gaps:** see [TODO.md](TODO.md)

---

### 2.2.0 — 2026-07-21 (streaming mix + first-seen “new”)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.2.0)

**Highlights**
- **New on streaming** no longer posts three titles from a single provider each day
- Daily post mixes up to **3** titles across a **shuffled** set of configured `STREAMING_SERVICES` (different services when possible)
- Each embed still uses `New or popular on {service}` for that title’s provider
- Better “new” preference within TMDb limits: local `data/streaming-catalog.json` tracks first-seen membership per region/provider (TMDb has no official “added to Netflix” date)
- Cold start seeds the catalog without treating the whole discover page as new; falls back to available/popular when the new window is thin
- Unit tests for slot diversity and catalog first-seen behaviour

**How it works**
1. Resolve configured provider names for `WATCH_REGION` via TMDb
2. Shuffle and fill three slots, preferring distinct services
3. For each slot, fetch `/discover/movie` with `with_watch_providers` + `flatrate`
4. Prefer titles newly first-seen in the local catalog (≈21-day window), else the usual available pool
5. Post one Discord message with up to three embeds

**Upgrade from 2.1.0**
- Pull / rebuild: `git pull && docker compose up -d --build`
- No new required env vars — existing `STREAMING_SERVICES` and `STREAMING_CHANNEL_ID` keep working
- First run after upgrade may log catalog seeding (`cold start`); “new” preference improves on later runs
- Optional: delete `data/streaming-catalog.json` to re-seed first-seen dates

**Install**
- Clone or checkout the `v2.2.0` tag
- Follow [SETUP.md](../SETUP.md)
- GitHub: https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.2.0

**Known gaps:** see [TODO.md](TODO.md)

**AI note:** Parts of this release were developed with AI assistance. AI-assisted contributions remain welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).

### 2.1.0 — 2026-07-19 (configurable post time)

**Status:** published · [GitHub release](https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.1.0)

**Highlights**
- Set the daily post time in `.env` with simple **`POST_TIME=HH:MM`** (24-hour) plus **`TZ`**
- Alternatives: `POST_HOUR` / `POST_MINUTE`, or full **`CRON_SCHEDULE`** (overrides the simple options)
- Clearer startup log: `Scheduled discovery: every day at 18:30 …`
- Docs and `.env.example` updated for operators

**Upgrade from 2.0.0**
- Pull / rebuild: `git pull && docker compose up -d --build`
- Optional: add `POST_TIME` (e.g. `18:30`) and confirm `TZ` matches your region
- Existing `CRON_SCHEDULE` still works and takes precedence if set

**Install**
- Clone or checkout the `v2.1.0` tag
- Follow [SETUP.md](../SETUP.md)
- GitHub: https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.1.0

**Known gaps:** see [TODO.md](TODO.md)

**AI note:** Parts of this release were developed with AI assistance. AI-assisted contributions remain welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).

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
- New optional env vars (see [`.env.example`](../.env.example)); merge them into existing `.env` files
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
