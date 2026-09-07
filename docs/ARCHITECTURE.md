# Architecture

Discoverr is a single Node.js process: a Discord bot that runs a daily discovery job, posts embeds with Request buttons, and submits Seerr requests when those buttons are clicked.

## Runtime flow

```text
Cron / postOnStart / dryRun
        |
        v
  Seerr checkHealth()  (startup; invalid cron exits first)
        |
        v
    postAll()  (overlap lock — skip if a run is already in flight)
        |
        +--> per category: skip if *_CHANNEL_ID is blank
        |
        +--> TMDb sources (per category, multi-page; streaming movie+TV;
        |                   Trending day+week merged then uniqueByItemKey)
        |
        +--> selectRecommendations()
                |-- memory TTL (suggested / requested; data/suggested.json)
                |   calendar dates use TZ, not UTC
                |-- quality filters
                |-- identity seen-guard (no duplicate movie:/tv: keys)
                |-- Seerr numeric media.status gate (capped sample pool)
                |-- weighted mid-list sampling
        |
        +--> Discord embeds (overview fallback language if empty;
                optional Trailer YouTube hyperlink on the card)
                + Request: {title} buttons (shared row)
                |
                v
          Seerr POST /api/v1/request (HTTP 200/201 only)
                → history.requestedAt
```

## Modules

| Path | Responsibility |
|------|----------------|
| [`src/index.ts`](../src/index.ts) | Discord client login, cron schedule, `POST_ON_START` |
| [`src/lib/schedule.ts`](../src/lib/schedule.ts) | Resolve post time → cron expression |
| [`src/lib/localDate.ts`](../src/lib/localDate.ts) | Calendar `YYYY-MM-DD` in `TZ` (posts, history, TMDb date windows) |
| [`src/lib/atomicWrite.ts`](../src/lib/atomicWrite.ts) | Temp-file + rename JSON writes |
| [`src/lib/channels.ts`](../src/lib/channels.ts) | Treat blank channel IDs as disabled |
| [`src/lib/media.ts`](../src/lib/media.ts) | `itemKey` / `uniqueByItemKey` identity helpers |
| [`src/config.ts`](../src/config.ts) | Typed `.env` loading (primary); integer env validation |
| [`src/settings.ts`](../src/settings.ts) | Optional extra post config (`data/settings.json`) |
| [`src/tmdb/client.ts`](../src/tmdb/client.ts) | TMDb HTTP client, multi-page fetch (`itemKey` identity), genres, providers, trailers |
| [`src/tmdb/sources.ts`](../src/tmdb/sources.ts) | Category-specific candidate builders |
| [`src/tmdb/trailer.ts`](../src/tmdb/trailer.ts) | Rank TMDb videos into a YouTube trailer URL |
| [`src/discovery/select.ts`](../src/discovery/select.ts) | Filter + sample pipeline |
| [`src/discovery/history.ts`](../src/discovery/history.ts) | JSON suggestion history with dual TTL prune, write mutex |
| [`src/discovery/filters.ts`](../src/discovery/filters.ts) | Rating / votes / language / year gates |
| [`src/discovery/postAll.ts`](../src/discovery/postAll.ts) | Orchestrates one full daily run |
| [`src/seerr/client.ts`](../src/seerr/client.ts) | Cookie login (serialized), media lookup, request submit |
| [`src/seerr/status.ts`](../src/seerr/status.ts) | Seerr `MediaStatus` numeric mapping |
| [`src/discord/embeds.ts`](../src/discord/embeds.ts) | Embeds (optional Trailer hyperlink) and Request button rows |
| [`src/discord/embedTitle.ts`](../src/discord/embedTitle.ts) | Clip Discord embed titles to 256 characters |
| [`src/discord/requestErrors.ts`](../src/discord/requestErrors.ts) | Short Discord-safe Seerr error text |
| [`src/discord/interactions.ts`](../src/discord/interactions.ts) | Button handler (marks `requestedAt` on success; no disk reload) |
| [`src/lib/`](../src/lib/) | Watch region, shuffle/sample, media helpers |

## Discovery strategy

Categories intentionally avoid “page 1 of `/popular` only”:

| Category | Source approach |
|----------|-----------------|
| Movie / TV of the Day | `/discover` with day-rotated genre + sort, multiple pages |
| Trending | Day + week trending windows, unique by `movie:`/`tv:` key, shuffled then sampled |
| New releases | Recent release-date window, shuffled |
| Streaming | Multi-provider mix; TMDb `/discover` for movies (and optionally TV via `settings.json` `streaming.includeTv`). Prefers titles newly first-seen in local `data/streaming-catalog.json` (TMDb has no provider add-date — this is “new to our snapshot”, not a Netflix catalog timestamp). Falls back to available/popular on cold start or thin new window. |
| Hidden gems | Older titles, vote band, low max popularity, genre rotation |

Selection uses Fisher–Yates shuffle and weighted sampling that prefers mid-list candidates over index `0`, so popularity-sorted API responses do not always surface the same blockbusters.

`fetchPages` keys mixed movie/TV pages by `itemKey` (`movie:123` vs `tv:123`). TMDb `person` results are dropped so they cannot hide a TV show that shares the same numeric id.

If a category’s Discord channel ID is blank, that category is skipped entirely: no TMDb fetch and no reservation in `usedThisRun`, so those titles can still appear in other channels.

## History

Suggestions are stored in `data/suggested.json` (gitignored). Keys look like `movie:12345` or `tv:67890`.

Streaming also maintains `data/streaming-catalog.json` (gitignored): first-seen dates per watch-region + provider + title, used only to prefer recently appeared titles in the New on Streaming category.

Both files are written atomically (temp file + rename). A corrupt `suggested.json` is refused rather than overwritten with an empty map. Request clicks use in-memory history (`ensureLoaded`) and do not re-read disk, so a concurrent daily post is not wiped.

Memory cooldowns:
- `HISTORY_TTL_DAYS` in `.env` (default `90`) — unrequested suggestions
- Optional `memory.requestedTtlDays` / `memory.suggestedTtlDays` in `data/settings.json` — Request button sets `requestedAt` on history

TTL “today” and TMDb release-date windows use [`localDateIso(timezone)`](../src/lib/localDate.ts) so Melbourne (or other `TZ`) morning posts do not treat UTC-tomorrow as already released.

Within a single `postAll()` run, `usedThisRun` prevents cross-category duplicates. `selectRecommendations` also skips a title already accepted into the current eligible pool so mixed lists cannot emit two Discord buttons with the same `customId`. Overlapping `postAll` invocations (cron vs `POST_ON_START`) are skipped.

## Discord cards and buttons

Request buttons stay on a shared action row (`customId` `request:${type}:${id}` — unchanged from 3.2.x so old messages still work). Button labels are `Request: {title}` (clipped to Discord’s 80-character limit) so multi-card posts are not a row of identical “Request” buttons.

When TMDb has a YouTube trailer, the embed includes a **Trailer** field with a `[Watch on YouTube](url)` hyperlink. Trailer lookup is `GET /movie/{id}/videos` or `GET /tv/{id}/videos`, ranked in [`src/tmdb/trailer.ts`](../src/tmdb/trailer.ts) (official + matching language preferred). Trailers are not Discord buttons.

Embed titles are clipped to 256 characters. Failed Request clicks reply with a short message from [`userFacingRequestError`](../src/discord/requestErrors.ts) rather than raw Seerr JSON.

## Extra configuration for posts (optional)

`.env` is the primary config (channels, schedule, region, streaming list, quality floors, etc.).  
`data/settings.json` is **optional** — only if you want extra post configuration (counts, quotas, `includeTv`, dry-run, dual memory TTLs). See [`settings.example.json`](../settings.example.json) and [SETUP.md](../SETUP.md#8-extra-configuration-for-posts-optional).

## Seerr availability

Seerr returns `media.status` as a number. The same gate applies for Plex and Jellyfin stacks that use Seerr for requests (and Emby via Seerr). Discoverr never talks to the media server.

| Value | Meaning | Recommend? |
|------:|---------|------------|
| 1 | UNKNOWN | yes |
| 2 | PENDING | no |
| 3 | PROCESSING | no |
| 4 | PARTIALLY_AVAILABLE | no |
| 5 | AVAILABLE | no |
| 6 | BLACKLISTED | no |
| 7 | DELETED | yes (treat as free) |

String statuses (when present) use word-boundary matching so `"unavailable"` is not treated as `"available"`.

When lookup fails, `SEERR_FAIL_CLOSED=true` (default) skips the title instead of recommending it blindly. Transient TMDb/Seerr HTTP failures are not cached as empty results for the process lifetime.

`POST /api/v1/request` succeeds only on HTTP **200** or **201**. HTTP **202** (typically “no seasons available”) is treated as a failure so Discord does not claim a request that Seerr did not create. Cookie logins are serialized so concurrent Request clicks do not race.

On process start, Discoverr calls `SeerrClient.checkHealth()` (public `/api/v1/status` when available, then cookie login) and exits with an actionable error if Seerr is unreachable or credentials fail.

## Build and deploy

Operators run **Docker only** — no host Node/npm required.

- Source: TypeScript in `src/`
- Image: [`Dockerfile`](../Dockerfile) multi-stage build (`npm ci` → `tsc` → production `node dist/index.js`)
- Compose: [`docker-compose.yml`](../docker-compose.yml) builds the image, loads `.env`, mounts `./data` for history
- Contributors may use `npm run typecheck` / `npm test` on the host — see [CONTRIBUTING.md](../CONTRIBUTING.md)
- Versions and tags: [RELEASES.md](RELEASES.md)
