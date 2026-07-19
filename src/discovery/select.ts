import { isReleased, itemKey, mediaTypeOf } from "../lib/media";
import { shuffleArray, weightedSample } from "../lib/shuffle";
import type { SeerrClient } from "../seerr/client";
import type { QualityFilters, TmdbItem } from "../types";
import { passesQualityFilters } from "./filters";
import type { SuggestionHistory } from "./history";

export interface SelectOptions extends QualityFilters {
  /** Prefer mid-list weighted sampling after filtering. Default true. */
  weighted?: boolean;
}

export async function selectRecommendations(
  items: TmdbItem[],
  count: number,
  usedRecommendations: Set<string>,
  history: SuggestionHistory,
  seerr: SeerrClient,
  options: SelectOptions = {}
): Promise<TmdbItem[]> {
  const { weighted = true, ...filters } = options;

  const eligible: TmdbItem[] = [];
  const candidates = shuffleArray((items || []).filter((item) => !!item && item.id));

  for (const item of candidates) {
    const key = itemKey(item);
    if (usedRecommendations.has(key) || history.has(key)) continue;
    if (!isReleased(item)) continue;
    if (!passesQualityFilters(item, filters)) continue;
    if (await seerr.isUnavailable(mediaTypeOf(item), item.id)) continue;
    eligible.push(item);
  }

  if (!eligible.length) return [];

  const picked = weighted
    ? weightedSample(eligible, count)
    : shuffleArray(eligible).slice(0, count);

  for (const item of picked) {
    usedRecommendations.add(itemKey(item));
  }

  return picked;
}
