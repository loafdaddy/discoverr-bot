# Contributing to Discoverr

Thanks for considering a contribution. Discoverr is a small TypeScript Discord + Seerr companion bot — focused changes help a lot.

**Operators run the bot with Docker only** ([SETUP.md](SETUP.md)). npm on the host is for contributors (typecheck / tests / image build context), not the supported production run path.

## Quick start (contributors)

```bash
git clone https://github.com/loafdaddy/discoverr-bot.git
cd discoverr-bot
npm install
cp .env.example .env
# fill in .env for a live smoke test via Docker
# optional extra post config: cp settings.example.json data/settings.json
```

Validate without starting Discord:

```bash
npm run typecheck
npm test
```

Smoke-test the real bot the same way operators do:

```bash
docker compose up -d --build
docker logs -f discoverr
```

Docs:

- [README.md](README.md) — short product overview
- [SETUP.md](SETUP.md) — ordered install (Discord → TMDb → Seerr → Docker)
- [docs/README.md](docs/README.md) — docs index
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules and discovery pipeline
- [docs/RELEASES.md](docs/RELEASES.md) — version history and how to cut a release
- [docs/TODO.md](docs/TODO.md) / [docs/ROADMAP.md](docs/ROADMAP.md) — status and direction
- [data/brand/README.md](data/brand/README.md) — brand assets

## Development loop

```bash
npm run typecheck
npm test
docker compose up -d --build
```

| Script | Purpose |
|--------|---------|
| `npm run build` | Emit `dist/` (also used inside the Dockerfile) |
| `npm test` | Unit tests (no live APIs) |
| `npm run typecheck` | Typecheck without emit |

Typical change flow:

1. Branch from `main` (`git checkout -b improve/short-name`)
2. Make a focused change
3. Run `npm run typecheck` and `npm test`
4. Rebuild the container if you need a live check
5. Open a pull request against `main` with a short “why” in the description

## Project map

| Path | What it is |
|------|------------|
| `Dockerfile` | Production image build |
| `docker-compose.yml` | Operator / smoke-test run path |
| `src/` | TypeScript application |
| `test/` | Unit tests (no live TMDb/Seerr) |
| `docs/` | Architecture, releases, roadmap, TODO |
| `data/brand/` | Lockup and mark |

## Releases

When shipping a version, follow [docs/RELEASES.md](docs/RELEASES.md): bump `package.json` version, add a release section, tag `vX.Y.Z`, and publish a GitHub release. Keep [docs/TODO.md](docs/TODO.md) honest.

## Conventions

- Prefer TypeScript in `src/`; do not reintroduce a root `bot.js`.
- Do not document `npm start` as the operator path — Docker is the product runtime.
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
