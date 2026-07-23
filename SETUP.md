# Discoverr setup

<p align="center">
  <img src="data/brand/discoverr-mark.svg" alt="Discoverr mark" width="72"/>
</p>

Dummy-proof install. Do the steps **in order** — secrets go in `.env`; channels, schedule, and tuning go in `data/settings.json` so upgrades do not wipe them.

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
| 4 | Settings | `data/settings.json` (region, streaming, channels, schedule) |
| 5 | Fill `.env` | Secrets only |
| 6 | Run | Container up |
| 7 | Smoke test | Posts + Request buttons working |

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

| Channel name | Settings key (`channels.*`) |
|--------------|------------------------------|
| `movie-of-the-day` | `movieOfTheDay` |
| `tv-show-of-the-day` | `tvOfTheDay` |
| `trending-movies-tv` | `trending` |
| `new-releases` | `newReleases` |
| `new-on-streaming` | `streaming` |
| `hidden-gems` | `hiddenGems` |

3. For each channel: right-click → **Copy Channel ID** → paste into a note for step 4 (`data/settings.json`).
4. Leave a channel ID blank to disable that category.
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

Optional later: `tmdb.language` / `discovery.pagesToFetch` in settings (defaults `en-AU` / `4`). See [Settings reference](#settings-reference).

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

## 4. Operator settings (`data/settings.json`)

```bash
cp settings.example.json data/settings.json
```

Edit `data/settings.json` (survives image upgrades; mounted with `./data`):

```json
{
  "tmdb": { "watchRegion": "AU", "language": "en-AU" },
  "streaming": {
    "services": ["Netflix", "Disney Plus", "Amazon Prime Video", "Stan"],
    "quotas": {},
    "includeTv": true,
    "newWindowDays": 21
  },
  "channels": {
    "movieOfTheDay": "paste_id",
    "tvOfTheDay": "paste_id",
    "trending": "paste_id",
    "newReleases": "paste_id",
    "streaming": "paste_id",
    "hiddenGems": "paste_id"
  },
  "schedule": { "postTime": "09:00", "timezone": "Australia/Melbourne" },
  "categories": {
    "trending": { "postCount": 3 },
    "streaming": { "postCount": 3 }
  },
  "memory": { "suggestedTtlDays": 90, "requestedTtlDays": 90 }
}
```

**Streaming tips**
- Provider names must match TMDb for your region.
- Empty `quotas` → soft shuffled mix (default). Example quotas for 3 posts: `"quotas": { "Netflix": 1, "Amazon Prime Video": 2 }` (sum must equal `categories.streaming.postCount`).
- `includeTv: true` mixes movies and TV in New on Streaming; set `false` for movies only.
- First-seen “new” preference uses `data/streaming-catalog.json` on the same volume.

**Memory tips**
- `suggestedTtlDays` — cooldown after a post if nobody requested it (`0` = never re-enter).
- `requestedTtlDays` — cooldown from the Request click (`0` = never); can be shorter so popular titles rotate sooner.

**Dry-run:** set `"discovery": { "dryRun": true }` to log picks without Discord posts.

**Checkpoint:** `data/settings.json` has region, streaming list, channel IDs, and schedule.

---

## 5. Fill `.env` (secrets)

```bash
cp .env.example .env
```

Open `.env` and paste secrets from steps 1–3:

```env
DISCORD_TOKEN=...
TMDB_API_KEY=...
SEERR_URL=...
SEERR_USERNAME=...
SEERR_PASSWORD=...
```

Non-secret env vars still work if you have not created `settings.json` yet (migration bridge). Prefer settings for new installs.

---

## 6. Run with Docker

Same commands on a NAS (Synology / TrueNAS / Unraid / etc.) or a regular Docker host:

```bash
docker compose up -d --build
docker logs -f discoverr
```

What this does:

- Builds from [`Dockerfile`](Dockerfile) (deps + TypeScript compile + `node dist/index.js`)
- Loads `.env` secrets + `data/settings.json` (or env fallback)
- Mounts `./data` for settings, suggestion history, and streaming catalog
- Names the container `discoverr`

Look for `Loaded operator settings from …` or `No …/settings.json found`, then `Scheduled discovery: every day at …`.

After changing settings or `.env`, recreate:

```bash
docker compose up -d --build
```

---

## 7. Smoke test

1. In `data/settings.json` set `"postOnStart": true` (or `POST_ON_START=true` in `.env` during migration).

2. Recreate and watch logs:

```bash
docker compose up -d --build
docker logs -f discoverr
```

3. In Discord, confirm embeds and **Request** buttons appear in the configured channels.
4. Click a Request button and confirm a request shows up in Seerr for the Discoverr user.
5. Set `postOnStart` back to `false` and recreate so you are not posting on every restart.

---

## Settings reference

Copy [settings.example.json](settings.example.json). Invalid values fail startup with a clear error in container logs.

| Area | Keys | Notes |
|------|------|-------|
| `categories.*.postCount` | 1–3 | Posts per category per run |
| `streaming.services` | string[] | TMDb provider names |
| `streaming.quotas` | map | Sum must equal streaming `postCount` when non-empty |
| `streaming.includeTv` | bool | Default `true` |
| `streaming.newWindowDays` | 1–90 | First-seen “new” window |
| `discovery.*` | rating, votes, pages, `dryRun`, `requireEnglish` | Global discovery knobs |
| `memory.suggestedTtlDays` / `requestedTtlDays` | 0–3650 | `0` = never re-enter that class |
| `schedule.postTime` / `cron` / `timezone` | | `cron` overrides `postTime` |
| `channels.*` | Discord snowflakes | Blank skips category |
| `seerr.failClosed` | bool | Skip on Seerr lookup failure |
| `tmdb.language` / `watchRegion` | | |

## Secrets (`.env`)

| Variable | Purpose |
|----------|---------|
| `DISCORD_TOKEN` | Discord bot token |
| `TMDB_API_KEY` | TMDb developer API key |
| `SEERR_URL` | Seerr base URL (reachable from the container) |
| `SEERR_USERNAME` / `SEERR_PASSWORD` | Dedicated Seerr user |

`WATCH_REGION` normalization lives in [`src/lib/watchRegion.ts`](src/lib/watchRegion.ts).

---

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

Your `data/settings.json`, `suggested.json`, and `streaming-catalog.json` stay on the volume. **`.env` is never overwritten by a pull** — git ignores it.

---

## Upgrading to 3.0.0 from 2.x

**Short answer:** keep your existing `.env`. You do not have to create `settings.json` on day one.

### Path A — rebuild only (safest, zero config edits)

Your current `.env` (secrets **and** channels / schedule / streaming / tuning) continues to work via the env migration bridge.

```bash
# optional backup
cp .env .env.backup
cp -a data data-backup

git pull
docker compose up -d --build
docker logs -f discoverr
```

Look for: `No …/settings.json found — using defaults and environment variables` and your usual schedule line.

**Note:** 3.0 defaults New on Streaming to **movies + TV**. To stay movies-only without a full settings file:

```bash
mkdir -p data
printf '%s\n' '{ "streaming": { "includeTv": false } }' > data/settings.json
docker compose up -d --build
```

(Blank channel fields are not required; missing keys keep your `.env` channels.)

### Path B — adopt `data/settings.json` (recommended when you want new knobs)

1. Keep `.env` secrets as they are (`DISCORD_TOKEN`, `TMDB_*`, `SEERR_*`).
2. Copy the example and fill values **from your current `.env`**:

```bash
cp settings.example.json data/settings.json
```

3. Edit `data/settings.json`:
   - Paste channel IDs into `channels.*`
   - Paste providers into `streaming.services`
   - Set `schedule.postTime` / `timezone` to match your old `POST_TIME` / `TZ`
   - Optionally set post counts, quotas, memory TTLs, `dryRun`
4. Recreate the container.
5. After it looks good, you may remove non-secret keys from `.env` (optional cleanup). **Never remove the five secrets.**

Empty channel strings in a copied example **fall back** to `.env` channel IDs so a half-filled file will not silently disable categories.

Full key list: [Settings reference](#settings-reference) · [Editing settings](#editing-settings).

---

## Editing settings

File: **`data/settings.json`** (Compose mounts `./data` → `/app/data`).

1. Edit on the host (nano, VS Code, NAS file browser — whatever you use).
2. Validate JSON (trailing commas will fail startup — the container log names the problem).
3. Apply:

```bash
docker compose up -d --build
docker logs -f discoverr
```

You should see `Loaded operator settings from …/data/settings.json`.

### Common edits

| Goal | Example |
|------|---------|
| 2 trending posts instead of 3 | `"categories": { "trending": { "postCount": 2 } }` |
| Force Netflix + Prime mix | `"streaming": { "quotas": { "Netflix": 1, "Amazon Prime Video": 2 } }` (sum = streaming `postCount`) |
| Movies-only streaming | `"streaming": { "includeTv": false }` |
| Shorter cooldown after Request | `"memory": { "requestedTtlDays": 30 }` |
| Test without posting | `"discovery": { "dryRun": true }` |
| Change daily time | `"schedule": { "postTime": "18:30", "timezone": "America/New_York" }` |

Only change the keys you care about — omitted keys keep defaults (and env bridge values where applicable).

---

## Upgrading from `bot.js` (v1)

1. Pull latest code (TypeScript + Dockerfile layout).
2. Keep secrets in `.env`; for 3.0 prefer `data/settings.json` for channels / schedule (see Path B above).
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
| Bot posts nothing | Channel IDs in settings; permissions; `docker logs -f discoverr` |
| Startup fails on settings | Invalid JSON or out-of-range values — read the error line |
| Request button fails | Seerr username/password and permissions; cookie login uses `email` |
| Library titles still appear | Seerr login; numeric status; `seerr.failClosed` |
| Same titles return too soon | `data/suggested.json` and `memory.*TtlDays` |
| Schedule wrong time | `schedule` in settings and recreate |
| Image build fails | Docker can pull `node:22-alpine`; disk space; valid `package-lock.json` |
| Streaming category silent | Provider names match TMDb for `watchRegion` |
| Seerr unreachable | URL from **inside** the container (not host `localhost` unless networked) |

More on Seerr status codes and discovery: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
