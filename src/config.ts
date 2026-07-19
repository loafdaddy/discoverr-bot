import "dotenv/config";
import { resolveCronSchedule } from "./lib/schedule";
import { getWatchRegion } from "./lib/watchRegion";
import type { AppConfig } from "./types";

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const value = env[name]?.trim();
  return value || fallback;
}

function optionalBool(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const value = env[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function optionalInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer for ${name}: ${raw}`);
  }
  return parsed;
}

function optionalFloat(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${name}: ${raw}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const streamingServices = optional(env, "STREAMING_SERVICES", "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    tmdbApiKey: required(env, "TMDB_API_KEY"),
    seerrUrl: required(env, "SEERR_URL").replace(/\/+$/, ""),
    seerrUsername: required(env, "SEERR_USERNAME"),
    seerrPassword: required(env, "SEERR_PASSWORD"),
    discordToken: required(env, "DISCORD_TOKEN"),
    watchRegion: getWatchRegion(env),
    streamingServices,
    movieOfDayChannelId: optional(env, "MOVIE_OF_DAY_CHANNEL_ID", ""),
    tvOfDayChannelId: optional(env, "TV_OF_DAY_CHANNEL_ID", ""),
    trendingChannelId: optional(env, "TRENDING_CHANNEL_ID", ""),
    newReleasesChannelId: optional(env, "NEW_RELEASES_CHANNEL_ID", ""),
    streamingChannelId: optional(env, "STREAMING_CHANNEL_ID", ""),
    hiddenGemsChannelId: optional(env, "HIDDEN_GEMS_CHANNEL_ID", ""),
    postOnStart: optionalBool(env, "POST_ON_START", false),
    cronSchedule: resolveCronSchedule(env),
    timezone: optional(env, "TZ", optional(env, "TIMEZONE", "Australia/Melbourne")),
    tmdbLanguage: optional(env, "TMDB_LANGUAGE", "en-AU"),
    historyTtlDays: optionalInt(env, "HISTORY_TTL_DAYS", 90),
    minRating: optionalFloat(env, "MIN_RATING", 6.2),
    minVotes: optionalInt(env, "MIN_VOTES", 80),
    seerrFailClosed: optionalBool(env, "SEERR_FAIL_CLOSED", true),
    pagesToFetch: optionalInt(env, "TMDB_PAGES", 4)
  };
}
