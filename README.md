# Discoverr.

<p align="center">
  <img src="data/brand/discoverr-lockup.svg" alt="Discoverr." width="460"/>
</p>

<p align="center">
  <strong>Daily media recommendations in Discord, with Seerr request buttons</strong><br/>
  TypeScript · TMDb · Seerr · Jellyfin · Docker · ARR companion
</p>

<p align="center">
  <a href="SETUP.md">Setup guide</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="data/brand/README.md">Brand</a>
  ·
  <a href=".env.example">Config example</a>
</p>

Discoverr is a lightweight Discord bot for Seerr and Jellyfin users. It posts scheduled movie and TV picks into dedicated channels and lets people request titles through Seerr without leaving Discord.

Built to sit beside an ARR-style stack — Sonarr, Radarr, and friends — as a small Docker companion, not another heavyweight service.

Discovery is diversified on purpose: multi-page TMDb pools, rotating genres/sorts, weighted sampling away from the top of popularity lists, and a history cooldown so the same blockbusters do not dominate every week.

> TMDb discovery + Discord embeds + one-click Seerr requests.

<p align="center">
  <img src="images/discoverr-screenshot.png" alt="Discoverr Discord embed with request button" width="640"/>
</p>

## What it does

- Movie of the Day and TV of the Day (rotating genre/sort discover)
- Trending picks (day + week windows, sampled)
- New releases
- Titles on configured streaming services
- Hidden gems (older, lower popularity, high rating)
- Request buttons that submit to Seerr

## Quick start

### Docker Compose (recommended)

```bash
cp .env.example .env
# edit .env — Discord token, TMDb key, Seerr URL/creds, channel IDs
docker compose up -d
docker logs -f discoverr
```

### Node.js

```bash
npm install
cp .env.example .env
# edit .env
npm run build
npm start

# or for local development:
npm run dev
```

Full walkthrough: [SETUP.md](SETUP.md).

## Requirements

- Discord server + bot token
- TMDb API key
- Working Seerr install and a dedicated Seerr/Jellyfin user for the bot
- Discord channels for each category you want to use
- Docker Compose **or** Node.js 18+

## Configuration

All settings live in `.env`. Copy [.env.example](.env.example) and fill in:

| Variable | Purpose |
|----------|---------|
| `TMDB_API_KEY` | TMDb API key |
| `SEERR_URL` | Seerr base URL |
| `SEERR_USERNAME` / `SEERR_PASSWORD` | Dedicated bot Seerr user |
| `DISCORD_TOKEN` | Discord bot token |
| `WATCH_REGION` | Region for discovery (`AU`, `US`, `GB`, or names like `USA`) |
| `STREAMING_SERVICES` | Comma-separated TMDb provider names |
| `*_CHANNEL_ID` | Discord channel per category |
| `POST_ON_START` | `true` to post immediately on boot (testing) |
| `CRON_SCHEDULE` | Cron expression (default `0 9 * * *`) |
| `TZ` | IANA timezone (default `Australia/Melbourne`) |
| `TMDB_LANGUAGE` | TMDb language (default `en-AU`) |
| `TMDB_PAGES` | Pages fetched per source (default `4`) |
| `HISTORY_TTL_DAYS` | Cooldown before a title can be suggested again (default `90`) |
| `MIN_RATING` / `MIN_VOTES` | Global quality floors |
| `SEERR_FAIL_CLOSED` | Skip titles when Seerr lookup fails (default `true`) |

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

## Seerr setup

Create a dedicated Seerr/Jellyfin user (for example `Discoverr`) with:

- Request · Request Movies · Request Series
- View Requests · View Recently Added

Skip admin and auto-approve if you want requests to stay in the normal approval queue. Discoverr uses Seerr cookie login so requests behave like that user. Availability checks use Seerr numeric `media.status` values so titles already in your library are skipped.

## Usage

Once running, the bot posts on the configured schedule. For a smoke test:

```env
POST_ON_START=true
```

Confirm posts and request buttons, then set it back to `false`.

## Updating

```bash
git pull
docker compose down
docker compose up -d
```

## Project map

| Path | What it is |
|------|------------|
| `src/index.ts` | Discord client, cron, startup |
| `src/tmdb/` | TMDb client and category sources |
| `src/seerr/` | Seerr auth, requests, media status |
| `src/discovery/` | Selection, history TTL, daily posting |
| `src/discord/` | Embeds, buttons, interactions |
| `data/` | Runtime suggestion history |
| `data/brand/` | Lockup, mark, brand notes |
| `test/` | Unit tests |
| `.env.example` | Environment template |
| `SETUP.md` | Detailed setup guide |
| `docker-compose.yml` | Node 22 Alpine service (build + run) |

## Troubleshooting

- **Bot posts nothing** — channel permissions and channel IDs
- **Request buttons fail** — Seerr username/password and permissions
- **Still seeing library titles** — confirm Seerr login works; check `SEERR_FAIL_CLOSED`
- **Duplicate recommendations** — `data/suggested.json` and `HISTORY_TTL_DAYS`
- **Too many posts** — posting logic and `CRON_SCHEDULE` / `TZ`

## Brand

Lockup and mark live in [data/brand/](data/brand/README.md). Accent teal `#4FD1C5` on deep `#0C1C28`; wordmark ends with a teal period.

## AI disclaimer

Parts of Discoverr — including code, docs, and branding — may have been written or edited with **AI assistance** (for example Cursor and similar tools). That is intentional for a small project moving quickly.

**AI-assisted contributions are welcome.** You remain responsible for what you submit: understand the change, keep pull requests focused, and verify what you can. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is provided as-is for personal and community use.
