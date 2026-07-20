# Discoverr — TODO

Single living status list. Keep it honest: only check items when verified with a running bot.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [RELEASES.md](RELEASES.md) · [SETUP.md](../SETUP.md) · [CONTRIBUTING.md](../CONTRIBUTING.md)

## Done (v2.0.0 / v2.1.0)

- [x] TypeScript modular layout (`src/` → `dist/`)
- [x] Multi-page / rotating discovery sources
- [x] Weighted sampling + history TTL
- [x] Numeric Seerr `media.status` gating
- [x] Configurable cron / timezone / TMDb language
- [x] Strip runtime emoji from Discord strings
- [x] Unit tests for status, history, region, sampling
- [x] Brand kit + Cadence-style docs / release structure
- [x] Docker-only operator path (`Dockerfile` + Compose mount for `data/`)
- [x] Simple `POST_TIME` / `POST_HOUR` schedule env (v2.1.0)
- [x] Publish **v2.0.0** and **v2.1.0** on GitHub
- [x] Live Discord / NAS smoke test (`POST_ON_START` + Docker Compose) — verified by author

## Next

- [ ] Confirm AVAILABLE library titles never post against a real Seerr instance (spot-check in Seerr UI)
- [ ] Optional: dry-run / log-only mode for discovery without posting
- [ ] Optional: TV support in the streaming category (movies-only today)
- [ ] Optional: clearer startup config validation errors in container logs
- [ ] Per-channel recommendation counts (1–5) and streaming mix quotas (e.g. `Netflix:2,HBO:1`)
- [ ] Optional: paid streaming source-change API (e.g. Watchmode Changes) for true catalog-add feeds

## Later

- [ ] Per-server or per-channel genre allow/deny lists
- [ ] CI (typecheck + test) on pull requests
- [ ] Publish prebuilt image to GHCR (optional; Compose-from-source remains primary)
