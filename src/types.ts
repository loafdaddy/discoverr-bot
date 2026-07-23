export type MediaType = "movie" | "tv";

export interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  overview?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  language?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  poster_path?: string | null;
}

export interface QualityFilters {
  minRating?: number;
  minVotes?: number;
  maxPopularity?: number;
  maxReleaseYear?: number;
  minReleaseYear?: number;
  requireEnglish?: boolean;
}

export interface HistoryEntry {
  title: string;
  type: MediaType;
  tmdbId: number;
  category: string;
  suggestedAt: string;
  /** Set when a Discord Request button succeeds. */
  requestedAt?: string;
}

export interface CategoryPostCounts {
  movieOfTheDay: number;
  tvOfTheDay: number;
  trending: number;
  newReleases: number;
  streaming: number;
  hiddenGems: number;
}

export interface AppConfig {
  tmdbApiKey: string;
  seerrUrl: string;
  seerrUsername: string;
  seerrPassword: string;
  discordToken: string;
  watchRegion: string;
  streamingServices: string[];
  streamingQuotas: Record<string, number>;
  streamingIncludeTv: boolean;
  streamingNewWindowDays: number;
  movieOfDayChannelId: string;
  tvOfDayChannelId: string;
  trendingChannelId: string;
  newReleasesChannelId: string;
  streamingChannelId: string;
  hiddenGemsChannelId: string;
  categoryPostCounts: CategoryPostCounts;
  postOnStart: boolean;
  dryRun: boolean;
  cronSchedule: string;
  timezone: string;
  tmdbLanguage: string;
  /** Cooldown after a suggestion when the title was not requested. 0 = never re-enter. */
  suggestedTtlDays: number;
  /** Cooldown after a successful Request. 0 = never re-enter. */
  requestedTtlDays: number;
  minRating: number;
  minVotes: number;
  requireEnglish: boolean;
  seerrFailClosed: boolean;
  pagesToFetch: number;
}
