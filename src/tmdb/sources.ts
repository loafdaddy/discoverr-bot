import { shuffleArray } from "../lib/shuffle";
import { withMediaType } from "../lib/media";
import type { AppConfig, MediaType, TmdbItem } from "../types";
import type { TmdbClient } from "./client";

/** TMDb movie genre IDs used for weekly rotation. */
const MOVIE_GENRE_ROTATION = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 878, 53, 10752, 37];

/** TMDb TV genre IDs used for weekly rotation. */
const TV_GENRE_ROTATION = [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 37];

const DISCOVER_SORTS = [
  "popularity.desc",
  "vote_average.desc",
  "vote_count.desc",
  "primary_release_date.desc",
  "revenue.desc"
] as const;

const TV_DISCOVER_SORTS = [
  "popularity.desc",
  "vote_average.desc",
  "vote_count.desc",
  "first_air_date.desc"
] as const;

function daySeed(): number {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start) / 86_400_000);
  return day;
}

function pickRotated<T>(items: readonly T[], offset = 0): T {
  const index = (daySeed() + offset) % items.length;
  return items[index];
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export async function fetchMovieOfDayCandidates(
  tmdb: TmdbClient,
  config: AppConfig
): Promise<TmdbItem[]> {
  const genre = pickRotated(MOVIE_GENRE_ROTATION);
  const sort = pickRotated(DISCOVER_SORTS, 3);
  const lang = config.tmdbLanguage;
  const path =
    `/discover/movie?language=${lang}&region=${config.watchRegion}` +
    `&sort_by=${sort}&with_genres=${genre}&include_adult=false` +
    `&vote_count.gte=${Math.max(50, Math.floor(config.minVotes * 0.75))}` +
    `&primary_release_date.lte=${todayIso()}`;

  const items = await tmdb.fetchPages(path, config.pagesToFetch);
  return items.map((item) => withMediaType(item, "movie"));
}

export async function fetchTvOfDayCandidates(
  tmdb: TmdbClient,
  config: AppConfig
): Promise<TmdbItem[]> {
  const genre = pickRotated(TV_GENRE_ROTATION, 1);
  const sort = pickRotated(TV_DISCOVER_SORTS, 2);
  const lang = config.tmdbLanguage;
  const path =
    `/discover/tv?language=${lang}` +
    `&sort_by=${sort}&with_genres=${genre}&include_adult=false` +
    `&vote_count.gte=${Math.max(40, Math.floor(config.minVotes * 0.6))}` +
    `&first_air_date.lte=${todayIso()}`;

  const items = await tmdb.fetchPages(path, config.pagesToFetch);
  return items.map((item) => withMediaType(item, "tv"));
}

export async function fetchTrendingCandidates(
  tmdb: TmdbClient,
  config: AppConfig
): Promise<TmdbItem[]> {
  const lang = config.tmdbLanguage;
  const day = await tmdb.fetchPages(`/trending/all/day?language=${lang}`, Math.min(3, config.pagesToFetch));
  const week = await tmdb.fetchPages(`/trending/all/week?language=${lang}`, Math.min(3, config.pagesToFetch));
  const merged = [...day, ...week].filter(
    (item) => item.media_type === "movie" || item.media_type === "tv"
  );
  return shuffleArray(merged);
}

export async function fetchNewReleaseCandidates(
  tmdb: TmdbClient,
  config: AppConfig
): Promise<TmdbItem[]> {
  const today = todayIso();
  const past = new Date();
  past.setUTCMonth(past.getUTCMonth() - 3);
  const from = past.toISOString().split("T")[0];
  const lang = config.tmdbLanguage;
  const path =
    `/discover/movie?language=${lang}&region=${config.watchRegion}` +
    `&sort_by=primary_release_date.desc` +
    `&primary_release_date.gte=${from}&primary_release_date.lte=${today}` +
    `&include_adult=false&vote_count.gte=${Math.max(20, Math.floor(config.minVotes * 0.4))}`;

  const items = await tmdb.fetchPages(path, config.pagesToFetch);
  return shuffleArray(items.map((item) => withMediaType(item, "movie")));
}

export interface ResolvedStreamingService {
  service: string;
  providerId: number;
  mediaType: MediaType;
}

/** Resolve configured STREAMING_SERVICES names to TMDb provider IDs for the watch region. */
export async function resolveStreamingServices(
  tmdb: TmdbClient,
  config: AppConfig,
  mediaType: MediaType = "movie"
): Promise<ResolvedStreamingService[]> {
  if (!config.streamingServices.length) return [];

  const resolved: ResolvedStreamingService[] = [];
  for (const service of config.streamingServices) {
    const providerId = await tmdb.getProviderId(service, mediaType);
    if (providerId) {
      resolved.push({ service, providerId, mediaType });
    } else {
      console.warn(`Streaming provider not found (${mediaType}): ${service}`);
    }
  }

  return resolved;
}

export async function fetchStreamingCandidates(
  tmdb: TmdbClient,
  config: AppConfig,
  providerId: number,
  mediaType: MediaType = "movie"
): Promise<TmdbItem[]> {
  const lang = config.tmdbLanguage;
  const voteFloor = Math.max(40, Math.floor(config.minVotes * 0.5));

  if (mediaType === "tv") {
    const sorts = ["popularity.desc", "vote_average.desc", "first_air_date.desc"] as const;
    const sort = pickRotated(sorts, 5);
    const path =
      `/discover/tv?language=${lang}&watch_region=${config.watchRegion}` +
      `&with_watch_providers=${providerId}&with_watch_monetization_types=flatrate` +
      `&sort_by=${sort}&include_adult=false` +
      `&vote_count.gte=${voteFloor}`;
    const items = await tmdb.fetchPages(path, config.pagesToFetch);
    return shuffleArray(items.map((item) => withMediaType(item, "tv")));
  }

  const sorts = ["popularity.desc", "vote_average.desc", "primary_release_date.desc"] as const;
  const sort = pickRotated(sorts, 5);
  const path =
    `/discover/movie?language=${lang}&watch_region=${config.watchRegion}` +
    `&with_watch_providers=${providerId}&with_watch_monetization_types=flatrate` +
    `&sort_by=${sort}&include_adult=false` +
    `&vote_count.gte=${voteFloor}`;

  const items = await tmdb.fetchPages(path, config.pagesToFetch);
  return shuffleArray(items.map((item) => withMediaType(item, "movie")));
}

export async function fetchHiddenGemCandidates(
  tmdb: TmdbClient,
  config: AppConfig
): Promise<TmdbItem[]> {
  const cutoffYear = new Date().getFullYear() - 2;
  const cutoffDate = `${cutoffYear}-12-31`;
  const lang = config.tmdbLanguage;
  const genre = pickRotated(MOVIE_GENRE_ROTATION, 7);
  const path =
    `/discover/movie?language=${lang}` +
    `&sort_by=vote_average.desc` +
    `&vote_count.gte=300&vote_count.lte=8000` +
    `&primary_release_date.lte=${cutoffDate}` +
    `&with_genres=${genre}&include_adult=false` +
    `&with_runtime.gte=70`;

  const items = await tmdb.fetchPages(path, config.pagesToFetch);
  return shuffleArray(items.map((item) => withMediaType(item, "movie")));
}
