# Discoverr setup

<p align="center">
  <img src="data/brand/discoverr-mark.svg" alt="Discoverr mark" width="72"/>
</p>

Dummy-proof install. Do the steps **in order** — each step collects a value you will paste into `.env` at the end. Extra configuration for posts is optional (step 8).

**Runtime is Docker only.** You do not install Node or npm on the host. Contributors: [CONTRIBUTING.md](CONTRIBUTING.md).

Overview: [README.md](README.md) · Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Releases: [docs/RELEASES.md](docs/RELEASES.md).

---

## Checklist (what you will end up with)

| # | Step | You will have |
|---|------|----------------|
| 0 | Prerequisites | Docker working |
| 1 | Discord | `DISCORD_TOKEN` + channel IDs |
| 2 | TMDb | `TMDB_API_KEY` |
| 3 | Seerr | `SEERR_URL`, `SEERR_USERNAME`, `SEERR_PASSWORD` |
| 4 | Region & streaming | `WATCH_REGION`, `STREAMING_SERVICES` |
| 5 | Fill `.env` | Complete config file |
| 6 | Run | Container up |
| 7 | Smoke test | Posts + Request buttons working |
| 8 | Extra post config *(optional)* | `data/settings.json` only if you want it |

---

## 0. Prerequisites

- [ ] Docker and Docker Compose installed
- [ ] A Discord server where you can manage channels and invite bots
- [ ] A working [Seerr](https://docs.seerr.dev/) instance (with Jellyfin or Plex behind it)
- [ ] Ability to reach Seerr from the machine that will run Discoverr (LAN IP, hostname, or Compose network — not `localhost` unless Seerr shares the container network)

Clone the repo (or copy it onto your NAS / Docker host):

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
```

---

## 1. Discord (do this first)

### 1a. Create the bot and get the token

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. **New Application** → name it (e.g. `Discoverr`) → Create.
3. Open the **Bot** tab → **Reset Token** / **View Token** → copy it.
4. Keep it private. You will set:

```env
DISCORD_TOKEN=paste_token_here
```

5. Under **Bot**, disable Privileged Gateway Intents unless you know you need them (Discoverr does not need Message Content Intent for normal use).

### 1b. Invite the bot

1. Open **OAuth2 → URL Generator**.
2. Scopes: tick **`bot`**.
3. Bot permissions — tick at least:
   - View Channels
   - Send Messages
   - Embed Links
   - Read Message History
   - Use External Emojis
4. Copy the generated URL, open it, pick your server, authorize.

### 1c. Create channels and copy IDs

1. In Discord: **User Settings → Advanced → Developer Mode** = on.
2. Create a category (e.g. **Discover**) with channels like:

| Channel name | Env variable |
|--------------|--------------|
| `movie-of-the-day` | `MOVIE_OF_DAY_CHANNEL_ID` |
| `tv-show-of-the-day` | `TV_OF_DAY_CHANNEL_ID` |
| `trending-movies-tv` | `TRENDING_CHANNEL_ID` |
| `new-releases` | `NEW_RELEASES_CHANNEL_ID` |
| `new-on-streaming` | `STREAMING_CHANNEL_ID` |
| `hidden-gems` | `HIDDEN_GEMS_CHANNEL_ID` |

3. For each channel: right-click → **Copy Channel ID** → paste into a note for step 5.
4. Leave a variable blank in `.env` to disable that category.
5. Confirm the bot role can view and send in those channels.

Optional: set the bot avatar from [`data/brand/discoverr-mark.svg`](data/brand/discoverr-mark.svg) (export PNG if Discord asks for it). Brand notes: [data/brand/README.md](data/brand/README.md).

**Checkpoint:** you have `DISCORD_TOKEN` and every channel ID you plan to use.

---

## 2. TMDb API key (second)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/).
2. Open **Settings → API**.
3. Request a developer API key (the short **API Key**, not only the longer read-access token).
4. You will set:

```env
TMDB_API_KEY=paste_key_here
```

Optional later: `TMDB_LANGUAGE` (default `en-AU`) and `TMDB_PAGES` (default `4`). See [Environment reference](#environment-reference).

**Checkpoint:** you have `TMDB_API_KEY`.

---

## 3. Seerr (third)

1. In Seerr (or Jellyfin, then Seerr), create a **dedicated** user for the bot, e.g. `Discoverr`.
2. Grant that user:
   - Request
   - Request Movies
   - Request Series
   - View Requests
   - View Recently Added
3. Do **not** grant admin or auto-approve if you want requests to stay in the normal approval queue.
4. Note the Seerr base URL **as the Discoverr container will see it**, for example:
   - `https://seerr.example.com`
   - `http://192.168.1.50:5055`
   - `http://seerr:5055` (Compose service name on a shared network)
5. You will set:

```env
SEERR_URL=https://your-seerr-host
SEERR_USERNAME=Discoverr
SEERR_PASSWORD=that_users_password
```

Discoverr logs into Seerr with cookie-based local login (`email` + password). Before recommending a title it checks numeric `media.status` and skips pending, processing, partially available, available, and blacklisted items. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Checkpoint:** you have `SEERR_URL`, `SEERR_USERNAME`, `SEERR_PASSWORD`.

---

## 4. Region and streaming services

Pick your watch region (TMDb country). Codes work (`AU`, `US`, `GB`, …) and so do common names (`Australia`, `USA`).

```env
WATCH_REGION=AU
```

List streaming services you want featured. Names must match TMDb watch-provider names for that region:

```env
STREAMING_SERVICES="Netflix,Disney Plus,Amazon Prime Video,Apple TV Plus,Stan,BINGE,Paramount Plus"
```

Each daily **New on streaming** post picks up to **3** titles across a **shuffled mix** of these providers (different services when possible). Unknown names are logged and skipped — adjust the list to what you actually subscribe to.

TMDb does not expose “date added to Netflix.” Discoverr approximates “new” with a local first-seen snapshot in `data/streaming-catalog.json` (same Compose volume as suggestion history). It prefers titles newly visible in that snapshot, and falls back to available/popular on cold start or a thin new window. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Also pick when to post (24-hour time + timezone):

```env
POST_TIME=09:00
TZ=Australia/Melbourne
```

Examples: `POST_TIME=18:30` with `TZ=America/New_York`, or `POST_TIME=07:30` with `TZ=Europe/London`.

**Checkpoint:** you have `WATCH_REGION`, `STREAMING_SERVICES`, `POST_TIME`, and `TZ`.

---

## 5. Fill `.env`

```bash
cp .env.example .env
```

Open `.env` and paste everything from steps 1–4. Full template comments: [.env.example](.env.example).

Minimum to start:

```env
DISCORD_TOKEN=...
TMDB_API_KEY=...
SEERR_URL=...
SEERR_USERNAME=...
SEERR_PASSWORD=...
WATCH_REGION=AU
STREAMING_SERVICES="Netflix,Disney Plus,Amazon Prime Video"
MOVIE_OF_DAY_CHANNEL_ID=...
TV_OF_DAY_CHANNEL_ID=...
TRENDING_CHANNEL_ID=...
NEW_RELEASES_CHANNEL_ID=...
STREAMING_CHANNEL_ID=...
HIDDEN_GEMS_CHANNEL_ID=...
POST_TIME=09:00
TZ=Australia/Melbourne
```

Leave any `*_CHANNEL_ID` blank to skip that category.

---

## 6. Run with Docker

Same commands on a NAS (Synology / TrueNAS / Unraid / etc.) or a regular Docker host:

```bash
docker compose up -d --build
docker logs -f discoverr
```

What this does:

- Builds from [`Dockerfile`](Dockerfile) (deps + TypeScript compile + `node dist/index.js`)
- Loads `.env`
- Mounts `./data` for suggestion history (`suggested.json`) and streaming first-seen catalog (`streaming-catalog.json`)
- Names the container `discoverr`

Look for a log line like `Scheduled discovery: every day at …`.

After changing `.env` or pulling code, recreate:

```bash
docker compose up -d --build
```

---

## 7. Smoke test

1. In `.env` set:

```env
POST_ON_START=true
```

2. Recreate and watch logs:

```bash
docker compose up -d --build
docker logs -f discoverr
```

3. In Discord, confirm embeds and **Request** buttons appear in the configured channels.
4. Click a Request button and confirm a request shows up in Seerr for the Discoverr user.
5. Set `POST_ON_START=false` and recreate again so you are not posting on every restart:

```bash
docker compose up -d --build
```

---

## 8. Extra configuration for posts (optional)

**Skip this unless you want it.** Discoverr works with `.env` alone.

If you want extra configuration for posts — for example how many titles per channel, streaming mix quotas, TV in the streaming channel, or longer cooldowns after someone requests a title — use a settings file:

```bash
cp settings.example.json data/settings.json
```

Open `data/settings.json`. Every setting has a `#` comment above it explaining what it does. Change only what you care about; you can delete whole sections you do not need.

| Section | What you can change |
|---------|---------------------|
| `categories` | Titles per day per category (1–3) |
| `streaming.quotas` | Exact count per service (must add up to streaming post count) |
| `streaming.includeTv` | `true` = movies and TV in streaming (default `false` = movies only) |
| `streaming.newWindowDays` | Prefer titles newly seen in the catalog |
| `discovery.dryRun` | Log posts without sending to Discord |
| `memory` | Separate cooldowns for suggested vs requested titles |

Then rebuild:

```bash
docker compose up -d --build
```

`data/settings.json` is not wiped by upgrades. You can remove the file anytime to go back to built-in defaults.

---

## Environment reference

### Required

| Variable | Purpose |
|----------|---------|
| `DISCORD_TOKEN` | Discord bot token |
| `TMDB_API_KEY` | TMDb developer API key |
| `SEERR_URL` | Seerr base URL (reachable from the container) |
| `SEERR_USERNAME` / `SEERR_PASSWORD` | Dedicated Seerr user |
| `WATCH_REGION` | Discovery region |
| `STREAMING_SERVICES` | Comma-separated TMDb provider names (mixed across daily posts) |
| `*_CHANNEL_ID` | Discord channel per category (blank to skip) |

### Schedule

| Variable | Purpose |
|----------|---------|
| `POST_TIME` | Daily time `HH:MM` (24-hour) in `TZ` — easiest |
| `POST_HOUR` / `POST_MINUTE` | Alternative if `POST_TIME` is unset |
| `CRON_SCHEDULE` | Full cron; **overrides** `POST_TIME` / `POST_HOUR` when set |
| `TZ` | IANA timezone (`TIMEZONE` also accepted). Default `Australia/Melbourne` |

Default if nothing is set: **09:00** daily.

### Optional tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `POST_ON_START` | `false` | `true` only while testing |
| `TMDB_LANGUAGE` | `en-AU` | TMDb language |
| `TMDB_PAGES` | `4` | Pages fetched per source |
| `HISTORY_TTL_DAYS` | `90` | Days before a title can be suggested again |
| `MIN_RATING` / `MIN_VOTES` | `6.2` / `80` | Global quality floors |
| `SEERR_FAIL_CLOSED` | `true` | Skip titles when Seerr lookup fails |

`WATCH_REGION` normalization lives in [`src/lib/watchRegion.ts`](src/lib/watchRegion.ts).

---

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

Your existing `.env` keeps working. You do not need `settings.json` unless you want [extra configuration for posts](#8-extra-configuration-for-posts-optional).

## Upgrading from `bot.js` (v1)

1. Pull latest code (TypeScript + Dockerfile layout).
2. Merge new keys from `.env.example` into your `.env`.
3. Stop using `node bot.js` / bind-mount npm Compose:

```bash
docker compose down
docker compose up -d --build
```

4. Keep `data/suggested.json` for existing cooldown history, or delete it to reset. Optional: delete `data/streaming-catalog.json` to re-seed streaming first-seen dates.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot posts nothing | Channel permissions and `*_CHANNEL_ID`; `docker logs -f discoverr` |
| Startup fails on settings | Invalid `data/settings.json` — read the error line (`#` comments are fine) |
| Request button fails | Seerr username/password and permissions; cookie login uses `email` |
| Library titles still appear | Seerr login; numeric status; `SEERR_FAIL_CLOSED` |
| Same titles return too soon | `data/suggested.json` and `HISTORY_TTL_DAYS` (or `memory.*` in settings) |
| Schedule wrong time | `POST_TIME` / `CRON_SCHEDULE` and `TZ`; recreate after `.env` edits |
| Image build fails | Docker can pull `node:22-alpine`; disk space; valid `package-lock.json` |
| Streaming category silent | Provider names match TMDb for `WATCH_REGION` |
| Seerr unreachable | URL from **inside** the container (not host `localhost` unless networked) |

More on Seerr status codes and discovery: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
