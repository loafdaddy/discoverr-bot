# Discoverr.

<p align="center">
  <img src="data/brand/discoverr-lockup.svg" alt="Discoverr." width="460"/>
</p>

<p align="center">
  <strong>Daily media recommendations in Discord, with Seerr request buttons</strong><br/>
  TypeScript · TMDb · Seerr · Jellyfin · Docker · ARR companion
</p>

<p align="center">
  <a href="SETUP.md">Setup</a>
  ·
  <a href="docs/ARCHITECTURE.md">Architecture</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="data/brand/README.md">Brand</a>
  ·
  <a href=".env.example">Config</a>
</p>

Discoverr is a lightweight Discord bot for Seerr and Jellyfin users. It posts scheduled movie and TV picks into dedicated channels and lets people request titles through Seerr without leaving Discord.

Built to sit beside an ARR-style stack — Sonarr, Radarr, and friends — as a small Docker companion, not another heavyweight service.

> TMDb discovery + Discord embeds + one-click Seerr requests.

<p align="center">
  <img src="images/discoverr-screenshot.png" alt="Discoverr Discord embed with request button" width="640"/>
</p>

## What it does

- **Movie of the Day** / **TV of the Day** — `/discover` with rotating genre and sort
- **Trending** — day + week windows, sampled (not just the top three)
- **New releases** — recent release-date window
- **Streaming** — titles on a configured watch provider for your region
- **Hidden gems** — older, lower-popularity, higher-rated titles
- **Request buttons** — submit to Seerr for approval

Discovery is diversified on purpose: multi-page TMDb pools, rotating genres/sorts, weighted sampling away from the top of popularity lists, and a history cooldown so the same blockbusters do not dominate every week.

## Quick start

### Docker Compose (recommended)

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
cp .env.example .env
# edit .env — Discord token, TMDb key, Seerr URL/creds, channel IDs
docker compose up -d
docker logs -f discoverr
```

Compose runs `npm ci`, compiles TypeScript, then starts `node dist/index.js`.

### Node.js 18+

```bash
npm install
cp .env.example .env
# edit .env
npm run build
npm start
```

Local development (no compile step):

```bash
npm run dev
```

Full walkthrough: [SETUP.md](SETUP.md). Design notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requirements

- Discord server and bot token
- TMDb API key
- Working Seerr install + dedicated Seerr/Jellyfin user for the bot
- Discord channels for each category you want to use
- Docker Compose **or** Node.js 18+

## npm scripts

| Script | What it does |
|--------|----------------|
| `npm run build` | Compile `src/` → `dist/` |
| `npm start` | Run `node dist/index.js` |
| `npm run dev` | Run TypeScript directly with `tsx` |
| `npm test` | Unit tests (no live TMDb/Seerr) |
| `npm run typecheck` | `tsc --noEmit` |

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
| `CRON_SCHEDULE` | `0 9 * * *` | Daily schedule |
| `TZ` | `Australia/Melbourne` | IANA timezone (`TIMEZONE` also accepted) |
| `TMDB_LANGUAGE` | `en-AU` | TMDb language |
| `TMDB_PAGES` | `4` | Pages fetched per source |
| `HISTORY_TTL_DAYS` | `90` | Cooldown before a title can be suggested again |
| `MIN_RATING` / `MIN_VOTES` | `6.2` / `80` | Global quality floors |
| `SEERR_FAIL_CLOSED` | `true` | Skip titles when Seerr lookup fails |

`WATCH_REGION` accepts country codes or friendly names; the bot normalizes common values for TMDb.

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

Once running, the bot posts on `CRON_SCHEDULE` in `TZ`. For a smoke test:

```env
POST_ON_START=true
```

Confirm posts and request buttons, then set it back to `false`.

## Upgrading from the old JavaScript bot

If you previously ran `node bot.js`:

1. Pull the latest code (TypeScript lives under `src/`).
2. Run `npm install` (or let Compose run `npm ci`).
3. Merge new keys from `.env.example` into your `.env` (`CRON_SCHEDULE`, `TZ`, `HISTORY_TTL_DAYS`, etc.).
4. Start with `npm run build && npm start` or `docker compose up -d`.
5. Keep `data/suggested.json` if you want existing cooldown history; delete it to reset.

The Compose service is named `discoverr` (logs: `docker logs -f discoverr`).

## Updating

```bash
git pull
docker compose down
docker compose up -d
```

## Project map

| Path | What it is |
|------|------------|
| `src/` | TypeScript application |
| `dist/` | Compiled output (`npm run build`, gitignored) |
| `test/` | Unit tests |
| `data/` | Runtime suggestion history |
| `data/brand/` | Lockup, mark, brand notes |
| `docs/ARCHITECTURE.md` | Design and module map |
| `.env.example` | Environment template |
| `SETUP.md` | Detailed setup guide |
| `CONTRIBUTING.md` | Contributor workflow |
| `docker-compose.yml` | Node 22 Alpine build + run |

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot posts nothing | Channel permissions and `*_CHANNEL_ID` values |
| Request buttons fail | Seerr username/password and permissions |
| Library titles still appear | Seerr login; `SEERR_FAIL_CLOSED`; see architecture status table |
| Same titles return too soon | `data/suggested.json` and `HISTORY_TTL_DAYS` |
| Schedule at the wrong time | `CRON_SCHEDULE` and `TZ` |
| Container restarts / build fails | `docker logs -f discoverr`; Node 18+; valid `.env` |

## Brand

Lockup and mark: [data/brand/](data/brand/README.md). Accent teal `#4FD1C5` on deep `#0C1C28`; wordmark ends with a teal period.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Focused PRs and AI-assisted contributions are welcome.

## AI disclaimer

Parts of Discoverr — including code, docs, and branding — may have been written or edited with **AI assistance** (for example Cursor and similar tools). That is intentional for a small project moving quickly.

**AI-assisted contributions are welcome.** You remain responsible for what you submit: understand the change, keep pull requests focused, and verify what you can.

## License

This project is provided as-is for personal and community use.
