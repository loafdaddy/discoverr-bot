# Discoverr releases

Track every published version here. Update this file when cutting a release, then tag and publish on GitHub.

Current version in tree: **3.0.0** (`package.json`).

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
5. Tag: `git tag -a v3.0.0 -m "Discoverr 3.0.0"`
6. Push: `git push origin main --tags`
7. Create the GitHub release (notes can mirror the section below)
8. Sanity-check from a clean clone:

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
git checkout v3.0.0
cp .env.example .env
cp settings.example.json data/settings.json
# fill secrets + settings
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

### 3.0.0 — Config Update (2026-07-23)

**Status:** in tree · tag when publishing

**Headline:** Operator settings move to durable `data/settings.json`. Secrets stay in `.env`. Existing `.env` files keep working without edits.

**Highlights**
- **`data/settings.json`** on the Compose volume — channels, schedule, post counts, streaming mix, memory, dry-run (survives image upgrades)
- **Secrets-only `.env`** — `DISCORD_TOKEN`, `TMDB_API_KEY`, `SEERR_*` (required as before)
- **Env migration bridge** — if `settings.json` is missing, all previous non-secret env vars still apply (`*_CHANNEL_ID`, `STREAMING_SERVICES`, `POST_TIME`, `HISTORY_TTL_DAYS`, …)
- Per-category **post counts (1–3)** and optional **streaming quotas** (e.g. Netflix:1, Prime:2)
- **TV in New on Streaming** (`streaming.includeTv`, default `true`)
- **Dual memory TTLs** — `suggestedTtlDays` / `requestedTtlDays`; Request button writes `requestedAt`
- **`discovery.dryRun`** — log picks without Discord posts
- Clearer startup validation errors for invalid settings

**Your `.env` is safe**
- Do **not** delete or rewrite your existing `.env` to upgrade
- Required secrets are unchanged
- Optional: leave non-secret keys in `.env`; they still work until you move them into `settings.json`
- Copying `settings.example.json` with blank channel IDs does **not** wipe channels still set in `.env` (blank strings fall back to env)

**Behaviour change to know**
- Without a settings file, **New on Streaming includes TV** by default (`includeTv: true`). Set `"streaming": { "includeTv": false }` in `data/settings.json` for 2.x movies-only behaviour.

**Upgrade from 2.x (recommended path)**

1. Back up `.env` and `./data` (optional but smart)
2. Pull and rebuild — **do not create `settings.json` yet** if you want zero config work:

```bash
git pull
docker compose up -d --build
docker logs -f discoverr
```

3. Confirm logs show schedule + posts still using your env channels/services
4. When ready for the new knobs, follow [SETUP.md § Upgrading to 3.0.0](../SETUP.md#upgrading-to-300-from-2x) and [Editing settings](../SETUP.md#editing-settings)

**Install (new)**
- Follow [SETUP.md](../SETUP.md): secrets in `.env`, copy `settings.example.json` → `data/settings.json`

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
