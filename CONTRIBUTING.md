# Contributing to Discoverr

Thanks for considering a contribution. Discoverr is a small TypeScript Discord + Seerr companion bot — focused changes help a lot.

## Quick start

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
npm install
cp .env.example .env
# fill in .env
npm run dev
```

Docs:

- [README.md](README.md) — product overview
- [SETUP.md](SETUP.md) — install walkthrough
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules and discovery pipeline
- [data/brand/README.md](data/brand/README.md) — brand assets

## Development loop

```bash
npm run typecheck
npm test
npm run build
npm start
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Run `src/index.ts` with `tsx` |
| `npm run build` | Emit `dist/` |
| `npm start` | Run compiled bot |
| `npm test` | Unit tests (no live APIs) |
| `npm run typecheck` | Typecheck without emit |

Typical change flow:

1. Branch from `main` (`git checkout -b improve/short-name`)
2. Make a focused change
3. Run `npm run typecheck` and `npm test`
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
| `docs/` | Architecture and design notes |
| `data/brand/` | Lockup and mark |

## Conventions

- Prefer TypeScript in `src/`; do not reintroduce a root `bot.js`.
- Keep runtime Discord strings plain text (no emoji in `src/**` user-facing messages).
- Discovery changes should widen or diversify pools — avoid regressing to “page 1 popular only”.
- Seerr availability must use numeric `media.status` (see `src/seerr/status.ts`).
- Add or update unit tests when changing filters, history TTL, sampling, or status mapping.
- Keep PRs focused; update README/SETUP when env vars or run commands change.

## What helps most

- Bug reports with logs and which category misbehaved
- Better discovery sources / sampling without exploding API usage
- Seerr edge cases (TV seasons, 4K, auth failures)
- Docs clarity for ARR-stack operators

## AI-assisted contributions

**AI tools are welcome.** You can use Cursor, Copilot, ChatGPT, Claude, or similar to help write code, docs, or tests.

Expectations:

- You understand and stand behind the change
- You have built and/or run the relevant bits (or say clearly what you could not verify)
- Keep pull requests focused — avoid unrelated rewrites
