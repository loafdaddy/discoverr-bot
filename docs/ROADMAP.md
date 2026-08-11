# Discoverr — roadmap

High-level history and direction. Day-to-day status: [TODO.md](TODO.md).  
Install / contribute: [SETUP.md](../SETUP.md) · [CONTRIBUTING.md](../CONTRIBUTING.md).  
Version history: [RELEASES.md](RELEASES.md).

## Direction

Stay a **small ARR companion**: Discord recommendations + Seerr request buttons. Prefer better discovery quality and reliable Seerr/Discord behaviour over becoming a full request portal or media manager.

Supports **Plex** and **Jellyfin** servers that use Seerr for requests (same Discoverr config). Media servers stay behind Seerr unless a later release intentionally adds direct APIs.

## Themes

1. **Discovery quality** — less blockbuster repetition, clearer category identity
2. **Operator UX** — boring Docker Compose installs (no host Node), honest docs, predictable `.env`; optional extra post config in `settings.json`; later: Seerr startup health checks
3. **Integrations** — solid Seerr status/request handling; TMDb as the metadata source; Plex/Jellyfin via Seerr (not direct media-server APIs in 3.2.x)
4. **Project hygiene** — TypeScript, tests for filter/status logic, SemVer releases

## Milestones

- **Pre-2.0** — unversioned JavaScript bot
- **v2.0.0** — TypeScript rewrite + diversified discovery — see [RELEASES.md](RELEASES.md)
- **v2.1.0** — `POST_TIME` env for daily schedule — see [RELEASES.md](RELEASES.md)
- **v2.2.0** — New on streaming multi-provider mix + local first-seen preference — see [RELEASES.md](RELEASES.md)
- **v3.0.0** — Optional extra post config in `settings.json` (post counts, quotas, TV streaming, memory, dry-run); `.env` primary — see [RELEASES.md](RELEASES.md)
- **v3.1.0** — Clarify optional settings: `.env`-first setup, commented `settings.example.json` — see [RELEASES.md](RELEASES.md)
- **v3.1.1** — Discovery performance polish (fewer Seerr lookups, parallel TMDb fetches) — see [RELEASES.md](RELEASES.md)
- **v3.2.0** — Docs for Plex and Jellyfin servers that use Seerr; no required env or app redesign — see [RELEASES.md](RELEASES.md) · [SETUP.md](../SETUP.md)
- **v3.2.1** *(in progress, `release/3.2.1`)* — CI, MIT license, TMDb overview fallback (#4), Seerr startup health check, GHCR workflow — see [RELEASES.md](RELEASES.md)
- **Next** — items under **Next** in [TODO.md](TODO.md)

## Post-3.2.0 (planned themes — not in 3.2.0)

1. **Startup health checks / operator niceties** — Seerr reachability on boot (`GET /status` or login probe); clearer login errors. Still no media-server API.
2. **Optional new env vars** — only when a concrete need appears (e.g. Seerr API-key auth, health-check toggle). Prefer optional; avoid required vars that break existing `.env` files.
3. **Direct Plex / Jellyfin APIs** — larger product change (library browse, watchlist, continue watching). Out of ARR-companion scope until demand is proven; stay Seerr-only until then.

## Non-goals (for now)

- Per-user Discord preference profiles / recommendation accounts
- Replacing Seerr’s UI
- Flatpak / desktop packaging (this is a server-side bot)
- Required env vars for Plex/Jellyfin in Discoverr itself
