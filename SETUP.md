# Discoverr setup

<p align="center">
  <img src="data/brand/discoverr-mark.svg" alt="Discoverr mark" width="72"/>
</p>

Step-by-step install for Discoverr — a Discord bot that posts daily movie and TV recommendations and submits Seerr requests from Discord buttons.

**Runtime is Docker only.** You do not install Node or npm on the host. Contributors who change code can use npm for tests — see [CONTRIBUTING.md](CONTRIBUTING.md).

Overview: [README.md](README.md) · Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Releases: [docs/RELEASES.md](docs/RELEASES.md).

## Requirements

- Docker and Docker Compose
- Discord server where you can add a bot
- Discord bot token
- TMDb API key
- Working Seerr instance
- Dedicated Seerr/Jellyfin user for the bot
- Discord channels for each recommendation category you want

## 1. Discord setup

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application, then add a bot.
3. Copy the bot token and keep it private.
4. Invite the bot with at least:
   - View Channels
   - Send Messages
   - Embed Links
   - Read Message History
   - Use External Emojis
5. In Discord, enable Developer Mode.
6. Right-click each channel and copy its channel ID.
7. Optional: upload [`data/brand/discoverr-mark.svg`](data/brand/discoverr-mark.svg) as the bot avatar (export to PNG if Discord requires it).

### Recommended channels

Create a category such as **Discover** with:

| Channel | Env variable |
|---------|----------------|
| `movie-of-the-day` | `MOVIE_OF_DAY_CHANNEL_ID` |
| `tv-show-of-the-day` | `TV_OF_DAY_CHANNEL_ID` |
| `trending-movies-tv` | `TRENDING_CHANNEL_ID` |
| `new-releases` | `NEW_RELEASES_CHANNEL_ID` |
| `new-on-streaming` | `STREAMING_CHANNEL_ID` |
| `hidden-gems` | `HIDDEN_GEMS_CHANNEL_ID` |

Each channel should allow the bot to send messages and embed links. Leave an env value blank to disable that category.

## 2. TMDb setup

1. Create a [TMDb](https://www.themoviedb.org/) account.
2. Open account API settings and create a free developer API key.
3. Set `TMDB_API_KEY` in `.env`.

Discoverr uses TMDb discover/trending/provider endpoints. `TMDB_LANGUAGE` (default `en-AU`) and `WATCH_REGION` shape results for your locale.

## 3. Seerr setup

1. Create a dedicated Seerr/Jellyfin user named `Discoverr` (or similar).
2. Grant:
   - Request
   - Request Movies
   - Request Series
   - View Requests
   - View Recently Added
3. Do **not** grant admin or auto-approve if you want the normal approval queue.
4. Put that username and password in `.env` as `SEERR_USERNAME` and `SEERR_PASSWORD`.

Discoverr uses Seerr cookie-based local login (`email` + password). Before recommending a title it checks numeric media status and skips pending, processing, partially available, available, and blacklisted items.

If a Seerr lookup fails, `SEERR_FAIL_CLOSED=true` (default) skips the title.

## 4. Environment configuration

```bash
cp .env.example .env
```

Edit `.env` before starting. Full template: [.env.example](.env.example).

### Required values

| Variable | Purpose |
|----------|---------|
| `TMDB_API_KEY` | TMDb developer API key |
| `SEERR_URL` | Seerr base URL, e.g. `https://seerr.example.com` |
| `SEERR_USERNAME` | Dedicated Seerr user for Discoverr |
| `SEERR_PASSWORD` | Password for that user |
| `DISCORD_TOKEN` | Discord bot token |
| `WATCH_REGION` | Discovery region (`AU`, `US`, `GB`, or names like `USA`) |
| `STREAMING_SERVICES` | Comma-separated streaming services to feature |
| `*_CHANNEL_ID` | One Discord channel ID per category you use |

### Scheduling and discovery tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `POST_ON_START` | `false` | `true` only while testing |
| `CRON_SCHEDULE` | `0 9 * * *` | Cron expression |
| `TZ` | `Australia/Melbourne` | IANA timezone (`TIMEZONE` alias OK) |
| `TMDB_LANGUAGE` | `en-AU` | TMDb language param |
| `TMDB_PAGES` | `4` | Pages fetched per source |
| `HISTORY_TTL_DAYS` | `90` | Days before a suggested title can appear again |
| `MIN_RATING` | `6.2` | Global rating floor |
| `MIN_VOTES` | `80` | Global vote-count floor |
| `SEERR_FAIL_CLOSED` | `true` | Skip titles when Seerr lookup fails |

### Watch region

`WATCH_REGION` can be a two-letter code (`AU`, `US`, `GB`, …) or a friendly name (`USA`, `Australia`). Normalization lives in [`src/lib/watchRegion.ts`](src/lib/watchRegion.ts).

### Streaming services

Names must match TMDb watch-provider names for your region, for example:

```env
STREAMING_SERVICES="Netflix,Disney Plus,Amazon Prime Video,Apple TV Plus,Stan,BINGE,Paramount Plus"
```

Unknown names are logged and skipped; the bot tries the next configured service.

## 5. Run with Docker

Works the same on a NAS (Synology / TrueNAS / Unraid / etc.) as on a regular Docker host: put the repo on a Docker-accessible path, fill `.env`, then Compose.

```bash
docker compose up -d --build
docker logs -f discoverr
```

What this does:

- Builds an image from [`Dockerfile`](Dockerfile) (installs deps, compiles TypeScript, runs `node dist/index.js`)
- Loads `.env`
- Mounts `./data` into the container for `suggested.json` persistence
- Container name: `discoverr`

Tips:

- `SEERR_URL` must be reachable **from inside the container** (Compose service name, LAN IP, or reverse-proxy hostname — not `localhost` unless Seerr is in the same container network namespace).
- Rebuild after pulling code or changing `.env` values that should apply on next start:

```bash
docker compose up -d --build
```

## 6. Smoke test

```env
POST_ON_START=true
```

```bash
docker compose up -d --build
docker logs -f discoverr
```

Confirm embeds and Request buttons in Discord, then set `POST_ON_START=false` and recreate:

```bash
docker compose up -d --build
```

## Upgrading from `bot.js` (v1)

1. Pull latest code with the TypeScript + Dockerfile layout.
2. Copy any new variables from `.env.example` into your existing `.env`.
3. Stop using `node bot.js` / bind-mount `npm` Compose — use the image build path:
   ```bash
   docker compose down
   docker compose up -d --build
   ```
4. Optional: delete `data/suggested.json` if you want a clean recommendation history.

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot posts nothing | Channel permissions and `*_CHANNEL_ID` values; `docker logs -f discoverr` |
| Request button fails | Seerr username/password and permissions; cookie login uses `email` field |
| Library titles still appear | Seerr login works; numeric status handling; `SEERR_FAIL_CLOSED` |
| Same titles return too soon | `data/suggested.json` and `HISTORY_TTL_DAYS` |
| Schedule wrong time | `CRON_SCHEDULE` and `TZ` |
| Image build fails | Docker can pull `node:22-alpine`; disk space; valid `package-lock.json` |
| Streaming category silent | Provider names match TMDb for `WATCH_REGION` |

## Releases

Version history and cut-a-release checklist: [docs/RELEASES.md](docs/RELEASES.md).  
Living status: [docs/TODO.md](docs/TODO.md).

## Brand

Visual assets: [data/brand/](data/brand/README.md) — teal accent on a deep slate mark, wordmark **Discoverr.**
