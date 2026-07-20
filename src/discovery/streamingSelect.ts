import type { SeerrClient } from "../seerr/client";
import type { TmdbClient } from "../tmdb/client";
import {
  fetchStreamingCandidates,
  resolveStreamingServices,
  type ResolvedStreamingService
} from "../tmdb/sources";
import type { AppConfig, TmdbItem } from "../types";
import type { SuggestionHistory } from "./history";
import { selectRecommendations } from "./select";
import {
  STREAMING_NEW_WINDOW_DAYS,
  StreamingCatalog
} from "./streamingCatalog";
import { buildStreamingTryOrder } from "./streamingSlots";

export interface StreamingPick {
  item: TmdbItem;
  service: string;
}

export const STREAMING_PICK_COUNT = 3;

interface QualityBase {
  minRating: number;
  minVotes: number;
  requireEnglish: true;
}

/**
 * Pick up to `pickCount` streaming titles across shuffled providers.
 * Prefers titles newly first-seen in the local TMDb catalog snapshot;
 * falls back to the full available-on-provider pool when that window is empty.
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
  const resolved = await resolveStreamingServices(tmdb, config, "movie");
  if (!resolved.length) return { picks: [], resolvedCount: 0 };

  const picks: StreamingPick[] = [];
  const usedProviderIds = new Set<number>();
  const candidateCache = new Map<number, TmdbItem[]>();
  const coldProviders = new Set<number>();
  const failedProviders = new Set<number>();

  while (picks.length < pickCount) {
    const tryOrder = buildStreamingTryOrder(resolved, usedProviderIds).filter(
      (entry) => !failedProviders.has(entry.providerId)
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
        coldProviders
      );

      if (pick) {
        picks.push(pick);
        usedProviderIds.add(entry.providerId);
        filled = true;
        break;
      }

      failedProviders.add(entry.providerId);
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
  candidateCache: Map<number, TmdbItem[]>,
  coldProviders: Set<number>
): Promise<StreamingPick | null> {
  const { service, providerId } = entry;

  let candidates = candidateCache.get(providerId);
  if (!candidates) {
    candidates = await fetchStreamingCandidates(tmdb, config, providerId);
    candidateCache.set(providerId, candidates);
    const { coldStart } = catalog.observe(
      config.watchRegion,
      providerId,
      candidates,
      today,
      STREAMING_NEW_WINDOW_DAYS
    );
    if (coldStart) {
      coldProviders.add(providerId);
      console.log(
        `Streaming catalog: seeding ${service} for ${config.watchRegion} ` +
          `(cold start — using available/popular pool until first-seen history exists).`
      );
    }
  }

  const coldStart = coldProviders.has(providerId);
  const newPool = catalog.filterNewWindow(
    config.watchRegion,
    providerId,
    candidates,
    today,
    coldStart,
    STREAMING_NEW_WINDOW_DAYS
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
