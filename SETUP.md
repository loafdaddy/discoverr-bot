# Discoverr setup

<p align="center">
  <img src="data/brand/discoverr-mark.svg" alt="Discoverr mark" width="72"/>
</p>

Discoverr posts daily movie and TV recommendations into Discord and adds request buttons that submit to Seerr. It is meant to run as a lightweight Docker companion in an ARR-style media stack (Sonarr, Radarr, Lidarr, Readarr, and friends).

For a shorter overview, see [README.md](README.md).

## Requirements

- Docker and Docker Compose **or** Node.js 18+
- Discord server where you can add a bot
- Discord bot token
- TMDb API key
- Working Seerr instance
- Dedicated Seerr/Jellyfin user for the bot
- Discord channels for each recommendation category you want

## Discord setup

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

### Recommended channels

Create a category such as **Discover** with:

- `movie-of-the-day`
- `tv-show-of-the-day`
- `trending-movies-tv`
- `new-releases`
- `new-on-streaming`
- `hidden-gems`

Each channel should allow the bot to send messages and embed links.

## TMDb setup

1. Create a [TMDb](https://www.themoviedb.org/) account.
2. Open account API settings and create a free developer API key.
3. Set `TMDB_API_KEY` in `.env`.

## Seerr setup

1. Create a dedicated Seerr/Jellyfin user named `Discoverr` (or similar).
2. Grant:
   - Request
   - Request Movies
   - Request Series
   - View Requests
   - View Recently Added
3. Do **not** grant admin or auto-approve if you want the normal approval queue.
4. Put that username and password in `.env` as `SEERR_USERNAME` and `SEERR_PASSWORD`.

Discoverr uses Seerr cookie-based login so requests behave like a normal Seerr user. Before recommending a title it checks Seerr numeric media status and skips available, pending, processing, partially available, and blacklisted items.

## Environment configuration

```bash
cp .env.example .env
```

Fill in every value you need before starting the bot. Unused channel IDs can stay blank if you skip that category.

| Variable | Purpose |
|----------|---------|
| `TMDB_API_KEY` | TMDb developer API key |
| `SEERR_URL` | Seerr base URL, e.g. `https://seerr.example.com` |
| `SEERR_USERNAME` | Dedicated Seerr user for Discoverr |
| `SEERR_PASSWORD` | Password for that user |
| `DISCORD_TOKEN` | Discord bot token |
| `WATCH_REGION` | Discovery region (`AU`, `US`, `GB`, or names like `USA`) |
| `STREAMING_SERVICES` | Comma-separated streaming services to feature |
| `MOVIE_OF_DAY_CHANNEL_ID` | Discord channel ID |
| `TV_OF_DAY_CHANNEL_ID` | Discord channel ID |
| `TRENDING_CHANNEL_ID` | Discord channel ID |
| `NEW_RELEASES_CHANNEL_ID` | Discord channel ID |
| `STREAMING_CHANNEL_ID` | Discord channel ID |
| `HIDDEN_GEMS_CHANNEL_ID` | Discord channel ID |
| `POST_ON_START` | `true` only while testing |
| `CRON_SCHEDULE` | Cron expression (default `0 9 * * *`) |
| `TZ` | IANA timezone (default `Australia/Melbourne`) |
| `TMDB_LANGUAGE` | TMDb language param (default `en-AU`) |
| `TMDB_PAGES` | How many TMDb pages to fetch per source (default `4`) |
| `HISTORY_TTL_DAYS` | Days before a suggested title can appear again (default `90`) |
| `MIN_RATING` / `MIN_VOTES` | Global quality floors |
| `SEERR_FAIL_CLOSED` | Skip titles when Seerr lookup fails (default `true`) |

### Watch region

`WATCH_REGION` can be:

- A two-letter country code such as `AU`, `US`, `GB`, `CA`, or `JP`
- A friendly value such as `USA`, `United States`, or `Australia`

The bot normalizes common names to TMDb-compatible codes (see `src/lib/watchRegion.ts`).

## Docker setup

```bash
docker compose up -d
docker logs -f discoverr
```

The Compose service mounts this directory, runs `npm ci`, builds TypeScript, then starts `node dist/index.js` on `node:22-alpine`.

## Node setup

```bash
npm install
npm run build
npm start
```

For development without a build step:

```bash
npm run dev
```

## Testing

```env
POST_ON_START=true
```

Confirm embeds and request buttons in Discord, then set `POST_ON_START=false`.

Unit tests (no live APIs):

```bash
npm test
```

## Updating

```bash
git pull
docker compose down
docker compose up -d
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot posts nothing | Channel permissions and `*_CHANNEL_ID` values |
| Request button fails | Seerr username/password and permissions |
| Library titles still appear | Seerr login; numeric status handling; `SEERR_FAIL_CLOSED` |
| Same titles return too soon | `data/suggested.json` and `HISTORY_TTL_DAYS` |
| Schedule wrong time | `CRON_SCHEDULE` and `TZ` |

## Brand

Visual assets: [data/brand/](data/brand/README.md) — teal accent on a deep slate mark, wordmark **Discoverr.**
