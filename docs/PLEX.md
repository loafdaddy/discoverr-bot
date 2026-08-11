# Discoverr with Plex and Jellyfin

How Discoverr works with Seerr-backed media stacks (Plex or Jellyfin), verification status for **v3.2.0**, and later themes.

Related: [SETUP.md](../SETUP.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [TODO.md](TODO.md)

## TL;DR

**Discoverr talks only to Seerr** (plus Discord and TMDb). It never talks to Plex or Jellyfin directly. Seerr scans the media server library and exposes `media.status`; Discoverr uses that for availability gating and request buttons.

Same bot config works for **Plex + Seerr** and **Jellyfin + Seerr**. No Plex/Jellyfin URL, token, or library ID in Discoverr’s `.env`.

```text
Discord users
      |
      v
 Discoverr  ----->  TMDb
      |
      +---------->  Seerr
                         |
                         +----> Plex  OR  Jellyfin  (library scan)
                         +----> Radarr / Sonarr
```

| Service | Role | Media-server specific? |
|---------|------|------------------------|
| Discord | Embeds + Request buttons | No |
| TMDb | Discovery metadata | No |
| Seerr | Auth, status, requests | No — same API for Plex and Jellyfin |

## Seerr status gating

Discoverr reads status through the dedicated Seerr account:

| `media.status` | Meaning | Recommend? |
|---------------:|---------|------------|
| 1 | UNKNOWN | yes |
| 2 | PENDING | no |
| 3 | PROCESSING | no |
| 4 | PARTIALLY_AVAILABLE | no |
| 5 | AVAILABLE | no |
| 6 | BLACKLISTED | no |
| 7 | DELETED | yes (treat as free) |

Implementation: [`src/seerr/status.ts`](../src/seerr/status.ts), [`src/seerr/client.ts`](../src/seerr/client.ts).  
Default `SEERR_FAIL_CLOSED=true` skips titles when lookup fails.

## Operator setup

### Shared (Plex or Jellyfin)

1. Working [Seerr](https://docs.seerr.dev/) with Sonarr/Radarr
2. Dedicated Seerr user with Request / Request Movies / Request Series (prefer a **local** email+password user — Discoverr uses `/api/v1/auth/local`)
3. `SEERR_URL` reachable **from the Discoverr container**
4. Same `.env` keys as any Discoverr install — see [SETUP.md](../SETUP.md)

### Plex-backed Seerr

1. Link Plex in Seerr and complete at least one full library sync before trusting AVAILABLE filtering
2. Do not put a Plex token in Discoverr — only Seerr credentials
3. If Plex-imported users cannot use local login, create a local Seerr user for the bot

### Jellyfin-backed Seerr

Same Discoverr config as today. No v3.2.0 migration.

### Gotchas

| Issue | Symptom | Mitigation |
|-------|---------|------------|
| Library not scanned / stale | Titles on Plex/Jellyfin still recommended | Sync libraries in Seerr; wait for scan |
| Wrong Seerr URL | Login failures | Fix `SEERR_URL` for container network |
| Bot user lacks request perms | Request button errors | Adjust Seerr user permissions |
| OAuth-only Seerr user | Cookie login fails | Use a local email/password user |
| `SEERR_FAIL_CLOSED=false` | Lookup errors may recommend owned titles | Keep default `true` |

## v3.2.0 verification record

| Check | Result |
|-------|--------|
| Media-server-specific code in `src/` | None — Seerr + TMDb + Discord only |
| Unit tests (status, AVAILABLE skip, Seerr pool) | Pass (`npm test`, 41 tests) |
| Typecheck | Pass |
| Live Plex-backed Seerr smoke (this workspace) | **Not runnable** — no `.env` / Seerr instance available during 3.2.0 prep |
| Code gaps requiring Phase B fix | **None identified** |

Live operator smoke checklist (run on your stack):

1. Seerr has Plex (or Jellyfin) linked; library sync completed
2. Dedicated local Seerr user with request perms
3. `POST_ON_START=true` once; `docker compose up -d --build && docker logs -f discoverr`
4. Confirm Discord posts; Request an unowned title → Seerr request created
5. Confirm a title **AVAILABLE** in Seerr is **not** recommended
6. Set `POST_ON_START=false` when done

See [SETUP.md § Smoke test](../SETUP.md#7-smoke-test).

## Later (post-3.2.0 — not required for this release)

Tracked in [TODO.md](TODO.md) / [ROADMAP.md](ROADMAP.md):

1. **Startup health checks** — Seerr reachability / clearer login errors on boot
2. **Optional new env vars** — only if a concrete need appears (e.g. API-key auth); must stay optional for existing operators
3. **Direct Plex / Jellyfin APIs** — out of current ARR-companion scope unless demand is proven (watchlist, continue watching, etc.)

## Explicitly out of 3.2.0

- Direct Plex/Jellyfin clients
- New **required** env vars
- Startup health checks (deferred)
- Discovery, Docker, or settings redesign
