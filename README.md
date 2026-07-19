# Discoverr.

<p align="center">
  <img src="data/brand/discoverr-lockup.svg" alt="Discoverr." width="460"/>
</p>

<p align="center">
  <strong>Daily media recommendations in Discord, with Seerr request buttons</strong><br/>
  TypeScript · TMDb · Seerr · Jellyfin · Docker · ARR companion
</p>

<p align="center">
  <a href="https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.0.0">v2.0.0</a>
  ·
  <a href="docs/RELEASES.md">Release history</a>
  ·
  <a href="SETUP.md">Setup</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

Discoverr is a lightweight Discord bot for Seerr and Jellyfin users. It posts scheduled movie and TV picks into dedicated channels and lets people request titles through Seerr without leaving Discord.

Built to sit beside an ARR-style stack — Sonarr, Radarr, and friends — as a small Docker companion, not another heavyweight service.

This is **v2.0.0** of the TypeScript rewrite. Features work; discovery and Seerr behaviour are actively hardening. **Contributors are welcome** — see [CONTRIBUTING.md](CONTRIBUTING.md).

> TMDb discovery + Discord embeds + one-click Seerr requests.

<p align="center">
  <img src="docs/assets/screenshot-discord.png" alt="Discoverr Discord embed with request button" width="640"/>
</p>

## Releases

Published notes live in [docs/RELEASES.md](docs/RELEASES.md). Tag GitHub releases when cutting a version.

| Version | Date | Notes |
|---------|------|-------|
| **[2.0.0](https://github.com/loafdaddy/discoverr-bot/releases/tag/v2.0.0)** | 2026-07-19 | TypeScript rewrite, diversified discovery, Docker-only runtime |

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Status: [docs/TODO.md](docs/TODO.md) · Direction: [docs/ROADMAP.md](docs/ROADMAP.md) · Brand: [data/brand/README.md](data/brand/README.md) · Config: [.env.example](.env.example)

## What it does

- **Movie of the Day** / **TV of the Day** — `/discover` with rotating genre and sort
- **Trending** — day + week windows, sampled (not just the top three)
- **New releases** — recent release-date window
- **Streaming** — titles on a configured watch provider for your region
- **Hidden gems** — older, lower-popularity, higher-rated titles
- **Request buttons** — submit to Seerr for approval

Discovery is diversified on purpose: multi-page TMDb pools, rotating genres/sorts, weighted sampling away from the top of popularity lists, and a history cooldown so the same blockbusters do not dominate every week.

## Quick start

Discoverr is meant to run with **Docker Compose** alongside the rest of your ARR stack. You do not need Node or npm on the host.

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
cp .env.example .env
# edit .env — Discord token, TMDb key, Seerr URL/creds, channel IDs
docker compose up -d --build
docker logs -f discoverr
```

Compose builds the image from the [`Dockerfile`](Dockerfile) (TypeScript compile happens inside the image) and mounts `./data` for suggestion history.

Full walkthrough: [SETUP.md](SETUP.md). Design notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Contributor tooling: [CONTRIBUTING.md](CONTRIBUTING.md).

## Requirements

- Docker and Docker Compose
- Discord server and bot token
- TMDb API key
- Working Seerr install + dedicated Seerr/Jellyfin user for the bot
- Discord channels for each category you want to use

## Configuration

All settings live in `.env`. Start from [.env.example](.env.example).

### Required

| Variable | Purpose |
|----------|---------|
| `TMDB_API_KEY` | TMDb API key |
| `SEERR_URL` | Seerr base URL (no trailing slash required) |
| `SEERR_USERNAME` / `SEERR_PASSWORD` | Dedicated bot Seerr user (sent as local email login) |
| `DISCORD_TOKEN` | Discord bot token |
| `WATCH_REGION` | Region for discovery (`AU`, `US`, `GB`, or names like `USA`) |
| `STREAMING_SERVICES` | Comma-separated TMDb provider names |
| `*_CHANNEL_ID` | Discord channel per category (blank to skip) |

### Optional (defaults shown in `.env.example`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `POST_ON_START` | `false` | Post immediately on boot (testing) |
| `POST_TIME` | `09:00` | Daily post time (`HH:MM`, 24-hour) in `TZ` |
| `POST_HOUR` / `POST_MINUTE` | — | Alternative to `POST_TIME` if that is unset |
| `CRON_SCHEDULE` | — | Full cron expression; **overrides** `POST_TIME` / `POST_HOUR` when set |
| `TZ` | `Australia/Melbourne` | IANA timezone for the schedule (`TIMEZONE` also accepted) |
| `TMDB_LANGUAGE` | `en-AU` | TMDb language |
| `TMDB_PAGES` | `4` | Pages fetched per source |
| `HISTORY_TTL_DAYS` | `90` | Cooldown before a title can be suggested again |
| `MIN_RATING` / `MIN_VOTES` | `6.2` / `80` | Global quality floors |
| `SEERR_FAIL_CLOSED` | `true` | Skip titles when Seerr lookup fails |

`WATCH_REGION` accepts country codes or friendly names; the bot normalizes common values for TMDb.

### Setting the post time

Posts run once per day in your chosen timezone. Easiest:

```env
POST_TIME=18:30
TZ=America/New_York
```

Or use a cron expression (overrides `POST_TIME`):

```env
CRON_SCHEDULE=30 18 * * *
TZ=America/New_York
```

After changing schedule env vars, recreate the container: `docker compose up -d --build`. Check logs for `Scheduled discovery: every day at …`.

## Discord setup

1. Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications)
2. Copy the bot token into `.env`
3. Invite the bot with at least: View Channels, Send Messages, Embed Links, Read Message History, Use External Emojis
4. Enable Developer Mode and copy channel IDs for each category

Recommended channels under a **Discover** category:

- `movie-of-the-day`
- `tv-show-of-the-day`
- `trending-movies-tv`
- `new-releases`
- `new-on-streaming`
- `hidden-gems`

Optional: set the Discord bot avatar from [`data/brand/discoverr-mark.svg`](data/brand/discoverr-mark.svg).

## Seerr setup

Create a dedicated Seerr/Jellyfin user (for example `Discoverr`) with:

- Request · Request Movies · Request Series
- View Requests · View Recently Added

Skip admin and auto-approve if you want requests to stay in the normal approval queue.

Discoverr uses Seerr cookie login so requests behave like that user. Before recommending a title it checks numeric `media.status` and skips available, pending, processing, partially available, and blacklisted items.

## How discovery works

1. Each category builds a **large candidate pool** (multiple TMDb pages, rotated genre/sort where useful).
2. Candidates are filtered for release date, language, rating/votes, suggestion history, and Seerr availability.
3. Picks use **weighted sampling** that prefers mid-list titles over the first popular hit.
4. Posted titles are written to `data/suggested.json` and blocked until `HISTORY_TTL_DAYS` expires.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Usage

Once running, the bot posts daily at `POST_TIME` (or `CRON_SCHEDULE`) in `TZ`. For a smoke test, set in `.env`:

```env
POST_ON_START=true
```

Then recreate so the container picks up the change:

```bash
docker compose up -d --build
```

Confirm posts and request buttons, set `POST_ON_START=false`, and recreate again.

## Upgrading from the old JavaScript bot

If you previously ran `node bot.js` or bind-mounted Compose + `npm`:

1. Pull the latest code.
2. Merge new keys from `.env.example` into your `.env`.
3. Recreate with a rebuild: `docker compose down && docker compose up -d --build`
4. Keep `data/suggested.json` if you want existing cooldown history; delete it to reset.

Logs: `docker logs -f discoverr`.

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

## Project map

| Path | What it is |
|------|------------|
| `Dockerfile` | Image build (compile + run) |
| `docker-compose.yml` | Operator run path |
| `src/` | TypeScript application |
| `test/` | Unit tests (contributors) |
| `data/` | Mounted volume: suggestion history |
| `data/brand/` | Lockup, mark, brand notes |
| `docs/` | Architecture, releases, roadmap, TODO |
| `.env.example` | Environment template |
| `SETUP.md` | Detailed setup guide |
| `CONTRIBUTING.md` | Contributor workflow |

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot posts nothing | Channel permissions and `*_CHANNEL_ID` values |
| Request buttons fail | Seerr username/password and permissions |
| Library titles still appear | Seerr login; `SEERR_FAIL_CLOSED`; see architecture status table |
| Same titles return too soon | `data/suggested.json` and `HISTORY_TTL_DAYS` |
| Schedule at the wrong time | `POST_TIME` / `CRON_SCHEDULE` and `TZ`; recreate container after `.env` edits |
| Container restarts / build fails | `docker logs -f discoverr`; Docker build output; valid `.env` |

## Brand

Lockup and mark: [data/brand/](data/brand/README.md). Accent teal `#4FD1C5` on deep `#0C1C28`; wordmark ends with a teal period.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Focused PRs and AI-assisted contributions are welcome.

## AI disclaimer

Parts of Discoverr — including code, docs, and branding — may have been written or edited with **AI assistance** (for example Cursor and similar tools). That is intentional for a small project moving quickly.

**AI-assisted contributions are welcome.** You remain responsible for what you submit: understand the change, keep pull requests focused, and verify what you can.

## License

This project is provided as-is for personal and community use.
