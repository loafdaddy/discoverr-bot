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
}

export interface AppConfig {
  tmdbApiKey: string;
  seerrUrl: string;
  seerrUsername: string;
  seerrPassword: string;
  discordToken: string;
  watchRegion: string;
  streamingServices: string[];
  movieOfDayChannelId: string;
  tvOfDayChannelId: string;
  trendingChannelId: string;
  newReleasesChannelId: string;
  streamingChannelId: string;
  hiddenGemsChannelId: string;
  postOnStart: boolean;
  cronSchedule: string;
  timezone: string;
  tmdbLanguage: string;
  historyTtlDays: number;
  minRating: number;
  minVotes: number;
  seerrFailClosed: boolean;
  pagesToFetch: number;
}
