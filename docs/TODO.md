# Discoverr — TODO

Single living status list. Keep it honest: only check items when verified with a running bot.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [RELEASES.md](RELEASES.md) · [SETUP.md](../SETUP.md) · [CONTRIBUTING.md](../CONTRIBUTING.md)

## Done (through v3.2.0)

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
- [x] Publish **v2.0.0**–**v3.3.0** on GitHub
- [x] Live Discord / NAS smoke test (`POST_ON_START` + Docker Compose) — verified by author
- [x] New on streaming: shuffled multi-provider mix + first-seen catalog (v2.2.0)
- [x] Optional `settings.json` extra post config (v3.0.0 / clarified v3.1.0)
- [x] Discovery performance polish (v3.1.1)
- [x] Docs: supports Plex and Jellyfin servers that use Seerr (v3.2.0)

## v3.2.1 (`release/3.2.1`)

- [x] GitHub Actions CI (typecheck + test on PRs / `main`)
- [x] MIT `LICENSE`
- [x] TMDb overview language fallback (`TMDB_FALLBACK_LANGUAGE`, issue #4)
- [x] Startup Seerr health check + clearer login/URL/TLS errors
- [x] GHCR publish workflow on `v*` tags (optional Compose `image:`)
- [x] Cut **v3.2.1** release / publish package visibility on GHCR if needed

## v3.3.0 (`release/3.3.0`)

- [x] Deduplicate Trending day+week lists and selection pool (issue #7)
- [x] Key TMDb `fetchPages` by `itemKey`; skip people so they cannot hide a TV id
- [x] YouTube trailer hyperlink on recommendation embeds (issue #6)
- [x] Distinct `Request: {title}` button labels; `customId` unchanged
- [x] Blank channel IDs skip that category (no title reservation)
- [x] Timezone-local calendar dates (`TZ`) for release gates and history
- [x] Atomic history/catalog writes; Request clicks do not reload-wipe memory
- [x] Overlap lock on `postAll`; invalid cron exits before login
- [x] Seerr 200/201 only; 202 (no seasons) is an error; serialized login
- [x] Safer Request error replies; `requireEnglish` / integer env / status regex fixes
- [x] Cut **v3.3.0** release / tag / GHCR publish

## Operator follow-up (live stack)

- [ ] Live smoke against a **Plex-backed** Seerr instance (login, posts, Request button)
- [ ] Confirm AVAILABLE library titles never post (spot-check in Seerr UI)
- [ ] Confirm overview fallback on a non-English `TMDB_LANGUAGE` install
- [ ] Confirm Seerr health check fails clearly with a bad `SEERR_URL`
- [ ] Confirm Trending with default `postCount: 3` never 50035s (`COMPONENT_CUSTOM_ID_DUPLICATED`)
- [ ] Confirm embed Trailer hyperlink opens YouTube; **Request: {title}** still submits as the Discoverr Seerr user
- [ ] Confirm a blank `MOVIE_OF_DAY_CHANNEL_ID` still lets the same film appear in Trending

## Next (after 3.3.0)

- [ ] Discord user → Seerr requester mapping (issue #5) — Request clicks attributed to the Discord user’s Seerr account
- [ ] Optional new env vars only if a concrete need appears (e.g. Seerr API-key auth)
- [ ] Direct Plex / Jellyfin APIs — only if demand is proven; prefer Seerr-only until then
- [ ] Optional: paid streaming source-change API (e.g. Watchmode Changes) for true catalog-add feeds

## Later

- [ ] Per-server or per-channel genre allow/deny lists
- [ ] Make GHCR the documented default install path once packages stay public
