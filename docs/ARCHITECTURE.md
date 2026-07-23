# Architecture

Discoverr is a single Node.js process: a Discord bot that runs a daily discovery job, posts embeds with Request buttons, and submits Seerr requests when those buttons are clicked.

## Runtime flow

```text
Cron / postOnStart / dryRun
        |
        v
    postAll()
        |
        +--> TMDb sources (per category, multi-page; streaming movie+TV)
        |
        +--> selectRecommendations()
                |-- memory TTL (suggested / requested; data/suggested.json)
                |-- quality filters
                |-- Seerr numeric media.status gate
                |-- weighted mid-list sampling
        |
        +--> Discord embeds + Request buttons (skipped when dryRun)
                |
                v
          Seerr POST /api/v1/request → history.requestedAt
```

## Modules

| Path | Responsibility |
|------|----------------|
| [`src/index.ts`](../src/index.ts) | Discord client login, cron schedule, `POST_ON_START` |
| [`src/lib/schedule.ts`](../src/lib/schedule.ts) | Resolve post time → cron expression |
| [`src/config.ts`](../src/config.ts) | Typed `.env` loading (primary) |
| [`src/settings.ts`](../src/settings.ts) | Optional extra post config (`data/settings.json`) |
| [`src/tmdb/client.ts`](../src/tmdb/client.ts) | TMDb HTTP client, multi-page fetch, genres, providers |
| [`src/tmdb/sources.ts`](../src/tmdb/sources.ts) | Category-specific candidate builders |
| [`src/discovery/select.ts`](../src/discovery/select.ts) | Filter + sample pipeline |
| [`src/discovery/history.ts`](../src/discovery/history.ts) | JSON suggestion history with dual TTL prune |
| [`src/discovery/filters.ts`](../src/discovery/filters.ts) | Rating / votes / language / year gates |
| [`src/discovery/postAll.ts`](../src/discovery/postAll.ts) | Orchestrates one full daily run |
| [`src/seerr/client.ts`](../src/seerr/client.ts) | Cookie login, media lookup, request submit |
| [`src/seerr/status.ts`](../src/seerr/status.ts) | Seerr `MediaStatus` numeric mapping |
| [`src/discord/embeds.ts`](../src/discord/embeds.ts) | Embeds and Request button rows |
| [`src/discord/interactions.ts`](../src/discord/interactions.ts) | Button handler (marks `requestedAt` on success) |
| [`src/lib/`](../src/lib/) | Watch region, shuffle/sample, media helpers |

## Discovery strategy

Categories intentionally avoid “page 1 of `/popular` only”:

| Category | Source approach |
|----------|-----------------|
| Movie / TV of the Day | `/discover` with day-rotated genre + sort, multiple pages |
| Trending | Day + week trending windows, shuffled then sampled |
| New releases | Recent release-date window, shuffled |
| Streaming | Multi-provider mix; TMDb `/discover` for movies (and optionally TV via `settings.json` `streaming.includeTv`). Prefers titles newly first-seen in local `data/streaming-catalog.json` (TMDb has no provider add-date — this is “new to our snapshot”, not a Netflix catalog timestamp). Falls back to available/popular on cold start or thin new window. |
| Hidden gems | Older titles, vote band, low max popularity, genre rotation |

Selection uses Fisher–Yates shuffle and weighted sampling that prefers mid-list candidates over index `0`, so popularity-sorted API responses do not always surface the same blockbusters.

## History

Suggestions are stored in `data/suggested.json` (gitignored). Keys look like `movie:12345` or `tv:67890`.

Streaming also maintains `data/streaming-catalog.json` (gitignored): first-seen dates per watch-region + provider + title, used only to prefer recently appeared titles in the New on Streaming category.

Memory cooldowns:
- `HISTORY_TTL_DAYS` in `.env` (default `90`) — unrequested suggestions
- Optional `memory.requestedTtlDays` / `memory.suggestedTtlDays` in `data/settings.json` — Request button sets `requestedAt` on history

Within a single `postAll()` run, `usedThisRun` prevents cross-category duplicates.

## Extra configuration for posts (optional)

`.env` is the primary config (channels, schedule, region, streaming list, quality floors, etc.).  
`data/settings.json` is **optional** — only if you want extra post configuration (counts, quotas, `includeTv`, dry-run, dual memory TTLs). See [`settings.example.json`](../settings.example.json) and [SETUP.md](../SETUP.md#8-extra-configuration-for-posts-optional).

## Seerr availability

Seerr returns `media.status` as a number:

| Value | Meaning | Recommend? |
|------:|---------|------------|
| 1 | UNKNOWN | yes |
| 2 | PENDING | no |
| 3 | PROCESSING | no |
| 4 | PARTIALLY_AVAILABLE | no |
| 5 | AVAILABLE | no |
| 6 | BLACKLISTED | no |
| 7 | DELETED | yes (treat as free) |

When lookup fails, `SEERR_FAIL_CLOSED=true` (default) skips the title instead of recommending it blindly.

## Build and deploy

Operators run **Docker only** — no host Node/npm required.

- Source: TypeScript in `src/`
- Image: [`Dockerfile`](../Dockerfile) multi-stage build (`npm ci` → `tsc` → production `node dist/index.js`)
- Compose: [`docker-compose.yml`](../docker-compose.yml) builds the image, loads `.env`, mounts `./data` for history
- Contributors may use `npm run typecheck` / `npm test` on the host — see [CONTRIBUTING.md](../CONTRIBUTING.md)
- Versions and tags: [RELEASES.md](RELEASES.md)
