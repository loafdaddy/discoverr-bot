import { yearOf } from "../lib/media";
import type { QualityFilters, TmdbItem } from "../types";

export function passesQualityFilters(item: TmdbItem, filters: QualityFilters = {}): boolean {
  const {
    minRating,
    minVotes,
    maxPopularity,
    maxReleaseYear,
    minReleaseYear,
    requireEnglish = true
  } = filters;

  if (requireEnglish) {
    const language = (item.original_language || item.language || "").toLowerCase();
    if (language && language !== "en" && language !== "en-us" && language !== "en-gb") {
      return false;
    }
  }

  if (minRating !== undefined) {
    if (Number(item.vote_average || 0) < minRating) return false;
  }

  if (minVotes !== undefined) {
    if (Number(item.vote_count || 0) < minVotes) return false;
  }

  if (maxPopularity !== undefined) {
    if (Number(item.popularity || 0) > maxPopularity) return false;
  }

  if (maxReleaseYear !== undefined) {
    const year = Number(yearOf(item));
    if (year && year > maxReleaseYear) return false;
  }

  if (minReleaseYear !== undefined) {
    const year = Number(yearOf(item));
    if (year && year < minReleaseYear) return false;
  }

  return true;
}
