# Discoverr.

<p align="center">
  <img src="data/brand/discoverr-lockup.svg" alt="Discoverr." width="460"/>
</p>

<p align="center">
  <strong>Daily media recommendations in Discord, with Seerr request buttons</strong><br/>
  TypeScript · TMDb · Seerr · Jellyfin · Docker · ARR companion
</p>

<p align="center">
  <a href="https://github.com/loafdaddy/discoverr-bot/releases/latest"><img src="https://img.shields.io/github/v/release/loafdaddy/discoverr-bot?label=release" alt="Latest release"/></a>
  <a href="Dockerfile"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose"/></a>
  <a href="tsconfig.json"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/></a>
</p>

<p align="center">
  <a href="https://github.com/loafdaddy/discoverr-bot/releases/tag/v3.0.0">v3.0.0</a>
  ·
  <a href="SETUP.md">Setup</a>
  ·
  <a href="docs/RELEASES.md">Releases</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="docs/README.md">Docs index</a>
</p>

Discoverr is a lightweight Discord bot for Seerr and Jellyfin users. It posts scheduled movie and TV picks into dedicated channels and lets people request titles through Seerr without leaving Discord.

Built to complement an ARR stack (Sonarr, Radarr and Seerr) as a lightweight Docker companion.

## Why Discoverr?

Most media servers rely on users searching for something to watch. Discoverr flips that around by bringing fresh recommendations directly into Discord every day, complete with one-click Seerr request buttons, making it effortless for your community to discover and request new content.

## Features

- 🎬 Daily Movie & TV recommendations
- 📈 Trending movies and TV
- 🆕 New releases
- 📺 New on streaming (mixed providers; prefers newly seen titles)
- 💎 Hidden gems
- ✅ One-click Seerr requests
- 🔒 Prevents duplicate requests through Seerr status checks
- 🐳 Docker-first deployment
- ⚡ Lightweight and self-hosted

Discovery pipeline details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

<p align="center">
  <img src="docs/assets/screenshot-discord.png" alt="Discoverr Discord embed with request button" width="640"/>
</p>

## Current categories

Recommended Discord channel layout (create these, then paste each channel ID into `data/settings.json` — or `.env` during migration):

<p align="center">
  <img src="docs/assets/screenshot-categories.png" alt="Discoverr Discord category channels" width="280"/>
</p>

| Channel | Settings key | Env fallback |
|---------|--------------|--------------|
| `movie-of-the-day` | `channels.movieOfTheDay` | `MOVIE_OF_DAY_CHANNEL_ID` |
| `tv-show-of-the-day` | `channels.tvOfTheDay` | `TV_OF_DAY_CHANNEL_ID` |
| `trending-movies-tv` | `channels.trending` | `TRENDING_CHANNEL_ID` |
| `new-releases` | `channels.newReleases` | `NEW_RELEASES_CHANNEL_ID` |
| `new-on-streaming` | `channels.streaming` | `STREAMING_CHANNEL_ID` |
| `hidden-gems` | `channels.hiddenGems` | `HIDDEN_GEMS_CHANNEL_ID` |

Full install steps: [SETUP.md](SETUP.md).

## Works with

- Jellyfin
- Seerr
- Sonarr
- Radarr
- Docker
- Discord

## Quick start

**Docker only** — no Node/npm on the host. Full walkthrough (Discord → TMDb → Seerr → `.env` → run): **[SETUP.md](SETUP.md)**.

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
cp .env.example .env
cp settings.example.json data/settings.json
# fill .env secrets + data/settings.json using SETUP.md
docker compose up -d --build
docker logs -f discoverr
```

## Docs

| Doc | What it covers |
|-----|----------------|
| **[SETUP.md](SETUP.md)** | Step-by-step install: Discord, TMDb, Seerr, env, Docker, smoke test |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, discovery pipeline, Seerr status |
| [docs/RELEASES.md](docs/RELEASES.md) | Version history and how to cut a release |
| [docs/TODO.md](docs/TODO.md) / [docs/ROADMAP.md](docs/ROADMAP.md) | Status and direction |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributor workflow (npm for tests) |
| [data/brand/README.md](data/brand/README.md) | Lockup, mark, palette |
| [.env.example](.env.example) | Secrets template |
| [settings.example.json](settings.example.json) | Operator settings template → `data/settings.json` |

## Requirements

- Docker and Docker Compose
- Discord server + bot token
- TMDb API key
- Working Seerr + dedicated Seerr/Jellyfin user for the bot
- Discord channels for each category you want

Details: [SETUP.md](SETUP.md).

## Configuration

**Secrets** live in `.env` (Discord token, TMDb key, Seerr URL/creds). Start from [.env.example](.env.example).

**Operator settings** live in `data/settings.json` on the Compose volume (channels, schedule, post counts, streaming mix/TV, memory TTLs, dry-run, quality floors). Copy [settings.example.json](settings.example.json) → `data/settings.json`. Upgrades keep this file; you do not re-paste channels into `.env`.

Env vars for non-secrets still work if `settings.json` is missing (2.x → 3.0 migration bridge). **Your existing `.env` is not invalidated** — see [SETUP.md § Upgrading to 3.0.0](SETUP.md#upgrading-to-300-from-2x).

Schedule example in settings:

```json
"schedule": { "postTime": "18:30", "timezone": "America/New_York" }
```

How to edit knobs day-to-day: [SETUP.md § Editing settings](SETUP.md#editing-settings). Full reference: [SETUP.md](SETUP.md).

## Security

Discoverr talks to Discord, TMDb, and Seerr. It does not access Jellyfin directly. Requests and availability checks use the dedicated Seerr account you configure, so behaviour stays within the permissions you grant that user in Seerr.

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

Upgrading from 2.x: [SETUP.md § Upgrading to 3.0.0](SETUP.md#upgrading-to-300-from-2x) (keep your `.env`).  
Upgrading from the old JavaScript bot: [SETUP.md § Upgrading from bot.js](SETUP.md#upgrading-from-botjs-v1).

## FAQ

**Does Discoverr download media?**  
No. It only recommends titles and submits Seerr requests. Sonarr, Radarr, and your download clients handle the rest.

**Does it work without Jellyfin?**  
It needs Seerr. Seerr can be backed by Jellyfin or Plex; Discoverr itself never talks to the media server.

**Does it require Node.js on the host?**  
No. Operators run it with Docker Compose only. Node is for contributors (tests / typecheck).

**Can multiple Discord users use it?**  
Yes. Anyone who can see the channels and click **Request** can submit through the bot’s Seerr account (subject to that account’s permissions).

## Upcoming

From [docs/ROADMAP.md](docs/ROADMAP.md) (day-to-day items: [docs/TODO.md](docs/TODO.md)):

- Better discovery quality — less blockbuster repetition, clearer category identity
- Stronger Seerr status and request handling
- Operator UX — predictable Docker Compose installs, `data/settings.json` + secrets in `.env`
- Project hygiene — TypeScript tests and SemVer releases

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Focused PRs and AI-assisted contributions are welcome.

Parts of Discoverr may have been written or edited with AI assistance. Contributors remain responsible for what they submit.

## License

This project is provided as-is for personal and community use.
