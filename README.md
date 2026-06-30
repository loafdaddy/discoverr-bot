# Discoverr

Discoverr is a Discord bot designed for Seerr and Jellyfin users who want a simple way to surface daily media recommendations in Discord. It posts curated recommendations for movies, TV shows, new releases, trending content, streaming availability, and hidden gems, and it adds request buttons so users can request items through Seerr without leaving Discord.

## What it does

Discoverr helps you keep a Discord server engaged with fresh media suggestions by posting scheduled recommendations into dedicated channels. The bot can:

- Post a daily movie recommendation
- Post a daily TV show recommendation
- Post trending picks
- Post new releases
- Post titles that are newly available on major streaming services
- Post hidden gems that may not be obvious to users
- Add request buttons that submit requests to Seerr

## Features

- Scheduled posting with cron-based timing
- TMDb-powered discovery and metadata lookups
- Seerr integration for request submission
- Support for custom watch regions such as AU, US, GB, or USA
- Configurable Discord channel targets for each category
- Persistent suggestion history so recommendations are less repetitive
- Docker Compose support for simple deployment

## Requirements

Before installing Discoverr, make sure you have:

- A Discord server and a bot application
- A Discord bot token
- A TMDb API key
- A working Seerr installation
- A dedicated Seerr/Jellyfin user for the bot
- Discord channels for the recommendation categories
- Node.js if you want to run it directly
- Docker and Docker Compose if you want to run it in containers

## Installation

### Option 1: Docker Compose

This is the simplest recommended approach.

1. Clone the repository
2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Edit .env and fill in your values
4. Start the bot:

```bash
docker compose up -d
```

5. Follow the logs if needed:

```bash
docker logs -f discoverr
```

### Option 2: Run directly with Node.js

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Fill in .env
4. Start the bot:

```bash
node bot.js
```

## Configuration

Discoverr uses environment variables for all important settings. The main configuration file is .env.

### Required environment variables

- TMDB_API_KEY: your TMDb API key
- SEERR_URL: your Seerr base URL
- SEERR_USERNAME: the dedicated Seerr username for the bot
- SEERR_PASSWORD: the password for that Seerr user
- DISCORD_TOKEN: your Discord bot token
- WATCH_REGION: the region to use for TMDb discovery, such as AU or US
- STREAMING_SERVICES: comma-separated streaming services to include
- Channel ID variables for each category you want to use
- POST_ON_START: set to true for testing, otherwise false

The example file [.env.example](.env.example) contains placeholders and examples for each value.

### Watch region

WATCH_REGION can be set as:

- A country code such as AU, US, GB, CA, or JP
- A friendly name such as USA or United States

The bot will normalize common values to a TMDb-compatible region code automatically.

## Discord setup

To use Discoverr, you need a Discord application with a bot:

1. Go to the Discord Developer Portal
2. Create a new application
3. Add a bot to the application
4. Copy the bot token into .env
5. Invite the bot to your server with the required permissions
6. Enable Developer Mode in Discord
7. Copy the channel IDs for each category channel

### Recommended permissions

The bot should have at least:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Use External Emojis

## Recommended Discord channels

A useful structure is a dedicated category with channels such as:

- 🎬 movie-of-the-day
- 📺 tv-show-of-the-day
- 🔥 trending-movies-tv
- 🆕 new-releases
- 📡 new-on-streaming
- 💎 hidden-gems

## TMDb setup

Discoverr uses TMDb to find recommendations and metadata. To use it:

1. Create a TMDb account
2. Go to the API section
3. Create a developer API key
4. Add it to .env as TMDB_API_KEY

## Seerr setup

Discoverr uses Seerr to submit requests when users click the request buttons.

### Recommended Seerr user

Create a dedicated Seerr/Jellyfin user for the bot, such as Discoverr.

Give it these permissions:

- Request
- Request Movies
- Request Series
- View Requests
- View Recently Added

Do not give it admin or auto-approve permissions if you want requests to stay in the normal approval queue.

## Usage

Once configured, the bot will post its scheduled recommendations based on the built-in posting logic. For immediate testing, set:

```env
POST_ON_START=true
```

Then switch it back to false after you confirm the bot behaves correctly.

## Updating

To update the bot from Git:

```bash
git pull
docker compose down
docker compose up -d
```

## Troubleshooting

- Bot posts nothing: check channel permissions and channel IDs
- Request buttons fail: check Seerr username/password and permissions
- Too many future releases: review the TMDb filters
- Duplicate recommendations: check the suggestion history file in data/
- Too many posts: review the posting logic and schedule settings

## Project structure

- bot.js: main bot logic
- lib/watchRegion.js: watch-region normalization helper
- data/: suggestion history and runtime data
- .env.example: example environment configuration
- SETUP.md: detailed setup guide

## License

This project is provided as-is for personal and community use.
