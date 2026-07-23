import "dotenv/config";
import { resolveCronSchedule } from "./lib/schedule";
import { loadSettings, settingsPath } from "./settings";
import type { AppConfig } from "./types";

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Load secrets from `.env` and operator settings from `data/settings.json`
 * (with env fallback so existing 2.x `.env` files keep working without edits).
 */
export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  const cronFromEnv = resolveCronSchedule(env);
  const settings = await loadSettings(env, settingsPath(), cronFromEnv);

  return {
    tmdbApiKey: required(env, "TMDB_API_KEY"),
    seerrUrl: required(env, "SEERR_URL").replace(/\/+$/, ""),
    seerrUsername: required(env, "SEERR_USERNAME"),
    seerrPassword: required(env, "SEERR_PASSWORD"),
    discordToken: required(env, "DISCORD_TOKEN"),
    watchRegion: settings.watchRegion,
    streamingServices: settings.streamingServices,
    streamingQuotas: settings.streamingQuotas,
    streamingIncludeTv: settings.streamingIncludeTv,
    streamingNewWindowDays: settings.streamingNewWindowDays,
    movieOfDayChannelId: settings.movieOfDayChannelId,
    tvOfDayChannelId: settings.tvOfDayChannelId,
    trendingChannelId: settings.trendingChannelId,
    newReleasesChannelId: settings.newReleasesChannelId,
    streamingChannelId: settings.streamingChannelId,
    hiddenGemsChannelId: settings.hiddenGemsChannelId,
    categoryPostCounts: settings.categoryPostCounts,
    postOnStart: settings.postOnStart,
    dryRun: settings.dryRun,
    cronSchedule: settings.cronSchedule,
    timezone: settings.timezone,
    tmdbLanguage: settings.tmdbLanguage,
    suggestedTtlDays: settings.suggestedTtlDays,
    requestedTtlDays: settings.requestedTtlDays,
    minRating: settings.minRating,
    minVotes: settings.minVotes,
    requireEnglish: settings.requireEnglish,
    seerrFailClosed: settings.seerrFailClosed,
    pagesToFetch: settings.pagesToFetch
  };
}
