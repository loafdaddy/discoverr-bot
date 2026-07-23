import type { SeerrClient } from "../seerr/client";
import type { TmdbClient } from "../tmdb/client";
import {
  fetchStreamingCandidates,
  resolveStreamingServices,
  type ResolvedStreamingService
} from "../tmdb/sources";
import type { AppConfig, MediaType, TmdbItem } from "../types";
import type { SuggestionHistory } from "./history";
import { selectRecommendations } from "./select";
import { StreamingCatalog } from "./streamingCatalog";
import {
  buildStreamingTryOrder,
  expandStreamingQuotas
} from "./streamingSlots";

export interface StreamingPick {
  item: TmdbItem;
  service: string;
}

export const STREAMING_PICK_COUNT = 3;

interface QualityBase {
  minRating: number;
  minVotes: number;
  requireEnglish: boolean;
}

function providerKey(entry: ResolvedStreamingService): string {
  return `${entry.mediaType}:${entry.providerId}`;
}

async function resolveStreamingPool(
  tmdb: TmdbClient,
  config: AppConfig
): Promise<ResolvedStreamingService[]> {
  const movie = await resolveStreamingServices(tmdb, config, "movie");
  if (!config.streamingIncludeTv) return movie;
  const tv = await resolveStreamingServices(tmdb, config, "tv");
  return [...movie, ...tv];
}

/**
 * Pick up to `pickCount` streaming titles across shuffled providers.
 * Prefers titles newly first-seen in the local TMDb catalog snapshot;
 * falls back to the full available-on-provider pool when that window is empty.
 *
 * When `config.streamingQuotas` is non-empty, tries to fill those quotas first
 * (soft-fail to other providers when a slot cannot be filled).
 */
export async function selectStreamingPicks(
  tmdb: TmdbClient,
  config: AppConfig,
  seerr: SeerrClient,
  history: SuggestionHistory,
  usedThisRun: Set<string>,
  catalog: StreamingCatalog,
  today: string,
  filters: QualityBase,
  pickCount = STREAMING_PICK_COUNT
): Promise<{ picks: StreamingPick[]; resolvedCount: number }> {
  const resolved = await resolveStreamingPool(tmdb, config);
  if (!resolved.length) return { picks: [], resolvedCount: 0 };

  const picks: StreamingPick[] = [];
  const usedProviderKeys = new Set<string>();
  const candidateCache = new Map<string, TmdbItem[]>();
  const coldProviders = new Set<string>();
  const failedProviders = new Set<string>();
  const windowDays = config.streamingNewWindowDays;

  const quotaSlots =
    Object.keys(config.streamingQuotas).length > 0
      ? expandStreamingQuotas(resolved, config.streamingQuotas)
      : [];

  const preferredQueue = [...quotaSlots];

  while (picks.length < pickCount) {
    let preferred: ResolvedStreamingService | undefined;
    while (preferredQueue.length && !preferred) {
      const next = preferredQueue.shift();
      if (next && !failedProviders.has(providerKey(next))) {
        preferred = next;
      }
    }

    const tryOrder = preferred
      ? [
          preferred,
          ...buildStreamingTryOrder(resolved, usedProviderKeys).filter(
            (entry) =>
              providerKey(entry) !== providerKey(preferred!) &&
              !failedProviders.has(providerKey(entry))
          )
        ]
      : buildStreamingTryOrder(resolved, usedProviderKeys).filter(
          (entry) => !failedProviders.has(providerKey(entry))
        );

    if (!tryOrder.length) break;

    let filled = false;

    for (const entry of tryOrder) {
      const pick = await tryPickFromProvider(
        entry,
        tmdb,
        config,
        seerr,
        history,
        usedThisRun,
        catalog,
        today,
        filters,
        candidateCache,
        coldProviders,
        windowDays
      );

      if (pick) {
        picks.push(pick);
        usedProviderKeys.add(providerKey(entry));
        filled = true;
        break;
      }

      failedProviders.add(providerKey(entry));
    }

    if (!filled) break;
  }

  return { picks, resolvedCount: resolved.length };
}

async function tryPickFromProvider(
  entry: ResolvedStreamingService,
  tmdb: TmdbClient,
  config: AppConfig,
  seerr: SeerrClient,
  history: SuggestionHistory,
  usedThisRun: Set<string>,
  catalog: StreamingCatalog,
  today: string,
  filters: QualityBase,
  candidateCache: Map<string, TmdbItem[]>,
  coldProviders: Set<string>,
  windowDays: number
): Promise<StreamingPick | null> {
  const { service, providerId, mediaType } = entry;
  const cacheKey = providerKey(entry);

  let candidates = candidateCache.get(cacheKey);
  if (!candidates) {
    candidates = await fetchStreamingCandidates(tmdb, config, providerId, mediaType);
    candidateCache.set(cacheKey, candidates);
    const { coldStart } = catalog.observe(
      config.watchRegion,
      providerId,
      candidates,
      today,
      windowDays
    );
    if (coldStart) {
      coldProviders.add(cacheKey);
      console.log(
        `Streaming catalog: seeding ${service} (${mediaType}) for ${config.watchRegion} ` +
          `(cold start — using available/popular pool until first-seen history exists).`
      );
    }
  }

  const coldStart = coldProviders.has(cacheKey);
  const newPool = catalog.filterNewWindow(
    config.watchRegion,
    providerId,
    candidates,
    today,
    coldStart,
    windowDays
  );
  const pools =
    !coldStart && newPool.length > 0 ? [newPool, candidates] : [candidates];

  for (const pool of pools) {
    const [item] = await selectRecommendations(
      pool,
      1,
      usedThisRun,
      history,
      seerr,
      filters
    );
    if (item) {
      return { item, service };
    }
  }

  return null;
}

/** @internal test helper */
export function mediaTypesForConfig(includeTv: boolean): MediaType[] {
  return includeTv ? ["movie", "tv"] : ["movie"];
}
