# Contributing to Discoverr

Thanks for considering a contribution. Discoverr is a small Discord + Seerr companion bot — focused changes help a lot.

## Quick start

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
npm install
cp .env.example .env
# fill in .env
npm run dev
```

## Development loop

```bash
npm run typecheck
npm test
npm run build
npm start
```

Typical change flow:

1. Branch from `main` (`git checkout -b improve/short-name`)
2. Make a focused change
3. Run tests / typecheck
4. Open a pull request against `main` with a short “why” in the description

## Project map

| Path | What it is |
|------|------------|
| `src/index.ts` | Discord client, cron, startup |
| `src/config.ts` | Typed environment config |
| `src/tmdb/` | TMDb client and category sources |
| `src/seerr/` | Seerr auth, requests, media status |
| `src/discovery/` | Selection, history TTL, daily posting |
| `src/discord/` | Embeds, buttons, interactions |
| `src/lib/` | Shared helpers |
| `test/` | Unit tests (no live TMDb/Seerr) |
| `data/brand/` | Lockup and mark |

## AI-assisted contributions

**AI tools are welcome.** You can use Cursor, Copilot, ChatGPT, Claude, or similar to help write code, docs, or tests.

Expectations:

- You understand and stand behind the change
- You have built and/or run the relevant bits (or say clearly what you could not verify)
- Keep pull requests focused — avoid unrelated rewrites
