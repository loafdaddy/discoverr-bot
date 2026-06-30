# Discoverr Setup

Discoverr is a Discord bot for Seerr/Jellyfin users that posts daily movie and TV discovery recommendations into Discord and adds request buttons so users can request media through Seerr.

## Requirements

Before installing Discoverr, make sure you have:

- Docker and Docker Compose
- A Discord server where you can add a bot
- A Discord bot token
- A TMDb API key
- A working Seerr instance
- A dedicated Seerr/Jellyfin user for the bot
- Discord channels for each recommendation category

## Discord setup

1. Go to the Discord Developer Portal.
2. Create a new application.
3. Open the Bot section and add a bot.
4. Copy the bot token and keep it private.
5. Invite the bot to your Discord server with the following permissions:
   - View Channels
   - Send Messages
   - Embed Links
   - Read Message History
   - Use External Emojis
6. In Discord, enable Developer Mode.
7. Right-click each channel you want the bot to use and copy the channel IDs.

## Recommended Discord channels

Create a category such as Discover with these channels:

- 🎬 movie-of-the-day
- 📺 tv-show-of-the-day
- 🔥 trending-movies-tv
- 🆕 new-releases
- 📡 new-on-streaming
- 💎 hidden-gems

Each channel should allow the bot to send messages.

## TMDb setup

1. Create a TMDb account.
2. Open your account API settings.
3. Create a free developer API key.
4. Add that key to your local .env file.

## Seerr setup

1. Create a dedicated Seerr/Jellyfin user named Discoverr.
2. Give it the following permissions:
   - Request
   - Request Movies
   - Request Series
   - View Requests
   - View Recently Added
3. Do not give it admin permissions or auto-approve permissions.
4. Keep the request flow on the manual approval queue.
5. Add the username and password for this dedicated account to .env.

Discoverr uses Seerr cookie-based login so requests behave like a normal Seerr user.

## Environment configuration

Copy the example file and edit it:

```bash
cp .env.example .env
```

Then fill in your own values in .env.

### Filling out .env

Open .env in your preferred editor and set each value before starting the bot.

Required values include:

- TMDB_API_KEY: your TMDb developer API key
- SEERR_URL: your Seerr base URL, for example https://seerr.example.com
- SEERR_USERNAME: the dedicated Seerr user you created for Discoverr
- SEERR_PASSWORD: the password for that Seerr user
- DISCORD_TOKEN: your Discord bot token
- WATCH_REGION: your preferred watch region, such as AU, US, GB, or USA
- STREAMING_SERVICES: a comma-separated list of services you want to feature
- Channel IDs for each category you want the bot to post into
- POST_ON_START: set to true only for testing, otherwise false

You can leave any unused values blank if you do not need that feature.

### Watch region

Set WATCH_REGION to the region you want Discoverr to use for TMDb discovery queries. You can enter either:

- A two-letter country code such as AU, US, GB, CA, or JP
- A friendly value such as USA, United States, or Australia

The bot will normalize common names to TMDb-compatible values automatically.

## Docker setup

Build and start the bot with Docker Compose:

```bash
docker compose up -d
docker logs -f discoverr
```

## Testing

To test immediately after startup, set:

```env
POST_ON_START=true
```

Then switch it back to false after you confirm the bot is posting correctly.

## Updating

When you pull updates from GitHub:

```bash
git pull
docker compose down
docker compose up -d
```

## Troubleshooting

- Bot posts nothing: verify Discord channel permissions and channel IDs.
- Request button fails: check Seerr username/password and user permissions.
- Future releases appear too often: review the TMDb query filters.
- Duplicate recommendations: check the suggestion history file in data/.
- Too many posts: review the category posting logic in the bot configuration.
