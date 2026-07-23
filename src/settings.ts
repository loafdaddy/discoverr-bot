import fs from "fs/promises";
import path from "path";
import { cronFromPostTime } from "./lib/schedule";
import { normalizeWatchRegion } from "./lib/watchRegion";
import type { CategoryPostCounts } from "./types";

export interface SettingsFile {
  categories?: {
    movieOfTheDay?: { postCount?: number };
    tvOfTheDay?: { postCount?: number };
    trending?: { postCount?: number };
    newReleases?: { postCount?: number };
    streaming?: { postCount?: number };
    hiddenGems?: { postCount?: number };
  };
  streaming?: {
    services?: string[];
    quotas?: Record<string, number>;
    includeTv?: boolean;
    newWindowDays?: number;
  };
  discovery?: {
    minRating?: number;
    minVotes?: number;
    requireEnglish?: boolean;
    pagesToFetch?: number;
    dryRun?: boolean;
  };
  memory?: {
    suggestedTtlDays?: number;
    requestedTtlDays?: number;
  };
  schedule?: {
    postTime?: string;
    cron?: string;
    timezone?: string;
  };
  channels?: {
    movieOfTheDay?: string;
    tvOfTheDay?: string;
    trending?: string;
    newReleases?: string;
    streaming?: string;
    hiddenGems?: string;
  };
  postOnStart?: boolean;
  seerr?: {
    failClosed?: boolean;
  };
  tmdb?: {
    language?: string;
    watchRegion?: string;
  };
}

export interface ResolvedSettings {
  categoryPostCounts: CategoryPostCounts;
  streamingServices: string[];
  streamingQuotas: Record<string, number>;
  streamingIncludeTv: boolean;
  streamingNewWindowDays: number;
  minRating: number;
  minVotes: number;
  requireEnglish: boolean;
  pagesToFetch: number;
  dryRun: boolean;
  suggestedTtlDays: number;
  requestedTtlDays: number;
  cronSchedule: string;
  timezone: string;
  movieOfDayChannelId: string;
  tvOfDayChannelId: string;
  trendingChannelId: string;
  newReleasesChannelId: string;
  streamingChannelId: string;
  hiddenGemsChannelId: string;
  postOnStart: boolean;
  seerrFailClosed: boolean;
  tmdbLanguage: string;
  watchRegion: string;
}

const POST_COUNT_MIN = 1;
const POST_COUNT_MAX = 3;

export function defaultSettings(): SettingsFile {
  return {
    categories: {
      movieOfTheDay: { postCount: 1 },
      tvOfTheDay: { postCount: 1 },
      trending: { postCount: 3 },
      newReleases: { postCount: 3 },
      streaming: { postCount: 3 },
      hiddenGems: { postCount: 1 }
    },
    streaming: {
      services: [],
      quotas: {},
      includeTv: true,
      newWindowDays: 21
    },
    discovery: {
      minRating: 6.2,
      minVotes: 80,
      requireEnglish: true,
      pagesToFetch: 4,
      dryRun: false
    },
    memory: {
      suggestedTtlDays: 90,
      requestedTtlDays: 90
    },
    schedule: {
      timezone: "Australia/Melbourne"
    },
    channels: {
      movieOfTheDay: "",
      tvOfTheDay: "",
      trending: "",
      newReleases: "",
      streaming: "",
      hiddenGems: ""
    },
    postOnStart: false,
    seerr: {
      failClosed: true
    },
    tmdb: {
      language: "en-AU",
      watchRegion: "AU"
    }
  };
}

export function settingsPath(): string {
  return path.join(process.cwd(), "data", "settings.json");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Deep-merge source onto target (objects only; arrays/scalars replace). */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const existing = out[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      out[key] = deepMerge(existing, value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

const TOP_LEVEL_KEYS = new Set([
  "categories",
  "streaming",
  "discovery",
  "memory",
  "schedule",
  "channels",
  "postOnStart",
  "seerr",
  "tmdb"
]);

function warnUnknownKeys(raw: SettingsFile): void {
  const unknown: string[] = [];
  for (const key of Object.keys(raw as object)) {
    if (!TOP_LEVEL_KEYS.has(key)) unknown.push(key);
  }
  if (unknown.length) {
    console.warn(
      `settings.json: ignoring unknown top-level key(s): ${unknown.join(", ")}`
    );
  }
}

function requireIntInRange(
  value: unknown,
  label: string,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`settings.json: ${label} must be an integer (${min}-${max})`);
  }
  if (value < min || value > max) {
    throw new Error(`settings.json: ${label} must be between ${min} and ${max} (got ${value})`);
  }
  return value;
}

function requireNumber(value: unknown, label: string, min: number, max?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`settings.json: ${label} must be a number`);
  }
  if (value < min || (max !== undefined && value > max)) {
    const range = max === undefined ? `>= ${min}` : `${min}-${max}`;
    throw new Error(`settings.json: ${label} must be ${range} (got ${value})`);
  }
  return value;
}

function requireBool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`settings.json: ${label} must be a boolean`);
  }
  return value;
}

function optionalString(value: unknown, label: string, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") {
    throw new Error(`settings.json: ${label} must be a string`);
  }
  return value;
}

function parseQuotas(value: unknown): Record<string, number> {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    throw new Error("settings.json: streaming.quotas must be an object of service → count");
  }
  const quotas: Record<string, number> = {};
  for (const [name, count] of Object.entries(value)) {
    if (typeof count !== "number" || !Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
      throw new Error(
        `settings.json: streaming.quotas["${name}"] must be an integer >= 0`
      );
    }
    quotas[name] = count;
  }
  return quotas;
}

function parseServices(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error("settings.json: streaming.services must be an array of strings");
  }
  return value.map((s) => s.trim()).filter(Boolean);
}

/**
 * Validate a fully merged settings object and produce ResolvedSettings.
 * `cronFromEnv` is used when schedule.cron / schedule.postTime are absent.
 */
export function resolveSettings(
  merged: SettingsFile,
  options: { cronFromEnv: string }
): ResolvedSettings {
  const categories = merged.categories ?? {};
  const streaming = merged.streaming ?? {};
  const discovery = merged.discovery ?? {};
  const memory = merged.memory ?? {};
  const schedule = merged.schedule ?? {};
  const channels = merged.channels ?? {};
  const seerr = merged.seerr ?? {};
  const tmdb = merged.tmdb ?? {};

  const categoryPostCounts: CategoryPostCounts = {
    movieOfTheDay: requireIntInRange(
      categories.movieOfTheDay?.postCount ?? 1,
      "categories.movieOfTheDay.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    ),
    tvOfTheDay: requireIntInRange(
      categories.tvOfTheDay?.postCount ?? 1,
      "categories.tvOfTheDay.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    ),
    trending: requireIntInRange(
      categories.trending?.postCount ?? 3,
      "categories.trending.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    ),
    newReleases: requireIntInRange(
      categories.newReleases?.postCount ?? 3,
      "categories.newReleases.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    ),
    streaming: requireIntInRange(
      categories.streaming?.postCount ?? 3,
      "categories.streaming.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    ),
    hiddenGems: requireIntInRange(
      categories.hiddenGems?.postCount ?? 1,
      "categories.hiddenGems.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    )
  };

  const streamingQuotas = parseQuotas(streaming.quotas);
  const quotaSum = Object.values(streamingQuotas).reduce((a, b) => a + b, 0);
  if (Object.keys(streamingQuotas).length > 0 && quotaSum !== categoryPostCounts.streaming) {
    throw new Error(
      `settings.json: streaming.quotas sum (${quotaSum}) must equal ` +
        `categories.streaming.postCount (${categoryPostCounts.streaming})`
    );
  }

  const streamingServices = parseServices(streaming.services) ?? [];
  const streamingIncludeTv = requireBool(
    streaming.includeTv ?? true,
    "streaming.includeTv"
  );
  const streamingNewWindowDays = requireIntInRange(
    streaming.newWindowDays ?? 21,
    "streaming.newWindowDays",
    1,
    90
  );

  const minRating = requireNumber(discovery.minRating ?? 6.2, "discovery.minRating", 0, 10);
  const minVotes = requireNumber(discovery.minVotes ?? 80, "discovery.minVotes", 0);
  if (!Number.isInteger(minVotes)) {
    throw new Error("settings.json: discovery.minVotes must be an integer >= 0");
  }
  const requireEnglish = requireBool(
    discovery.requireEnglish ?? true,
    "discovery.requireEnglish"
  );
  const pagesToFetch = requireIntInRange(
    discovery.pagesToFetch ?? 4,
    "discovery.pagesToFetch",
    1,
    10
  );
  const dryRun = requireBool(discovery.dryRun ?? false, "discovery.dryRun");

  const suggestedTtlDays = requireIntInRange(
    memory.suggestedTtlDays ?? 90,
    "memory.suggestedTtlDays",
    0,
    3650
  );
  const requestedTtlDays = requireIntInRange(
    memory.requestedTtlDays ?? 90,
    "memory.requestedTtlDays",
    0,
    3650
  );

  let cronSchedule = options.cronFromEnv;
  if (typeof schedule.cron === "string" && schedule.cron.trim()) {
    cronSchedule = schedule.cron.trim();
  } else if (typeof schedule.postTime === "string" && schedule.postTime.trim()) {
    cronSchedule = cronFromPostTime(schedule.postTime.trim());
  }

  const timezone = optionalString(
    schedule.timezone,
    "schedule.timezone",
    "Australia/Melbourne"
  ).trim() || "Australia/Melbourne";

  return {
    categoryPostCounts,
    streamingServices,
    streamingQuotas,
    streamingIncludeTv,
    streamingNewWindowDays,
    minRating,
    minVotes,
    requireEnglish,
    pagesToFetch,
    dryRun,
    suggestedTtlDays,
    requestedTtlDays,
    cronSchedule,
    timezone,
    movieOfDayChannelId: optionalString(channels.movieOfTheDay, "channels.movieOfTheDay", ""),
    tvOfDayChannelId: optionalString(channels.tvOfTheDay, "channels.tvOfTheDay", ""),
    trendingChannelId: optionalString(channels.trending, "channels.trending", ""),
    newReleasesChannelId: optionalString(channels.newReleases, "channels.newReleases", ""),
    streamingChannelId: optionalString(channels.streaming, "channels.streaming", ""),
    hiddenGemsChannelId: optionalString(channels.hiddenGems, "channels.hiddenGems", ""),
    postOnStart: requireBool(merged.postOnStart ?? false, "postOnStart"),
    seerrFailClosed: requireBool(seerr.failClosed ?? true, "seerr.failClosed"),
    tmdbLanguage: optionalString(tmdb.language, "tmdb.language", "en-AU").trim() || "en-AU",
    watchRegion: normalizeWatchRegion(
      optionalString(tmdb.watchRegion, "tmdb.watchRegion", "AU"),
      "AU"
    )
  };
}

/** Build settings overlay from env (migration bridge). */
export function settingsFromEnv(env: NodeJS.ProcessEnv): SettingsFile {
  const streamingServices = (env.STREAMING_SERVICES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const overlay: SettingsFile = {
    categories: {},
    streaming: {},
    discovery: {},
    memory: {},
    schedule: {},
    channels: {},
    seerr: {},
    tmdb: {}
  };

  if (streamingServices.length) {
    overlay.streaming!.services = streamingServices;
  }

  if (env.WATCH_REGION?.trim()) {
    overlay.tmdb!.watchRegion = env.WATCH_REGION.trim();
  }
  if (env.TMDB_LANGUAGE?.trim()) {
    overlay.tmdb!.language = env.TMDB_LANGUAGE.trim();
  }
  if (env.TMDB_PAGES?.trim()) {
    const n = Number(env.TMDB_PAGES);
    if (Number.isFinite(n)) overlay.discovery!.pagesToFetch = n;
  }
  if (env.MIN_RATING?.trim()) {
    const n = Number(env.MIN_RATING);
    if (Number.isFinite(n)) overlay.discovery!.minRating = n;
  }
  if (env.MIN_VOTES?.trim()) {
    const n = Number(env.MIN_VOTES);
    if (Number.isFinite(n)) overlay.discovery!.minVotes = n;
  }
  if (env.HISTORY_TTL_DAYS?.trim()) {
    const n = Number(env.HISTORY_TTL_DAYS);
    if (Number.isFinite(n)) {
      overlay.memory!.suggestedTtlDays = n;
      // Keep requested TTL in sync for env-only installs unless settings.json overrides.
      overlay.memory!.requestedTtlDays = n;
    }
  }
  if (env.SEERR_FAIL_CLOSED?.trim()) {
    const v = env.SEERR_FAIL_CLOSED.trim().toLowerCase();
    overlay.seerr!.failClosed = v === "true" || v === "1" || v === "yes";
  }
  if (env.POST_ON_START?.trim()) {
    const v = env.POST_ON_START.trim().toLowerCase();
    overlay.postOnStart = v === "true" || v === "1" || v === "yes";
  }

  const tz = env.TZ?.trim() || env.TIMEZONE?.trim();
  if (tz) overlay.schedule!.timezone = tz;
  if (env.POST_TIME?.trim()) overlay.schedule!.postTime = env.POST_TIME.trim();
  if (env.CRON_SCHEDULE?.trim()) overlay.schedule!.cron = env.CRON_SCHEDULE.trim();

  if (env.MOVIE_OF_DAY_CHANNEL_ID?.trim()) {
    overlay.channels!.movieOfTheDay = env.MOVIE_OF_DAY_CHANNEL_ID.trim();
  }
  if (env.TV_OF_DAY_CHANNEL_ID?.trim()) {
    overlay.channels!.tvOfTheDay = env.TV_OF_DAY_CHANNEL_ID.trim();
  }
  if (env.TRENDING_CHANNEL_ID?.trim()) {
    overlay.channels!.trending = env.TRENDING_CHANNEL_ID.trim();
  }
  if (env.NEW_RELEASES_CHANNEL_ID?.trim()) {
    overlay.channels!.newReleases = env.NEW_RELEASES_CHANNEL_ID.trim();
  }
  if (env.STREAMING_CHANNEL_ID?.trim()) {
    overlay.channels!.streaming = env.STREAMING_CHANNEL_ID.trim();
  }
  if (env.HIDDEN_GEMS_CHANNEL_ID?.trim()) {
    overlay.channels!.hiddenGems = env.HIDDEN_GEMS_CHANNEL_ID.trim();
  }

  return overlay;
}

export async function readSettingsFile(filePath: string): Promise<SettingsFile | null> {
  try {
    await fs.access(filePath);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") return null;
    throw err;
  }

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (err) {
    throw new Error(
      `Unable to read settings file ${filePath}: ${(err as Error).message}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Invalid JSON in ${filePath}: ${(err as Error).message}`
    );
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`settings.json must be a JSON object (${filePath})`);
  }

  return parsed as SettingsFile;
}

/**
 * After merging a settings file, restore blank string fields from the
 * pre-file baseline (defaults+env). Prevents copying settings.example.json
 * with empty channel IDs from wiping a working `.env` channel configuration.
 */
export function restoreBlankStringsFromBaseline(
  merged: SettingsFile,
  baseline: SettingsFile
): SettingsFile {
  const out = deepMerge(
    {} as Record<string, unknown>,
    merged as unknown as Record<string, unknown>
  ) as SettingsFile;

  const channelKeys = [
    "movieOfTheDay",
    "tvOfTheDay",
    "trending",
    "newReleases",
    "streaming",
    "hiddenGems"
  ] as const;

  out.channels = { ...(out.channels ?? {}) };
  const baseChannels = baseline.channels ?? {};
  for (const key of channelKeys) {
    const current = out.channels[key];
    const fallback = baseChannels[key];
    if ((!current || !current.trim()) && fallback?.trim()) {
      out.channels[key] = fallback;
    }
  }

  // Empty services array in a copied example should not wipe STREAMING_SERVICES.
  const fileServices = out.streaming?.services;
  const baseServices = baseline.streaming?.services;
  if (
    Array.isArray(fileServices) &&
    fileServices.length === 0 &&
    Array.isArray(baseServices) &&
    baseServices.length > 0
  ) {
    out.streaming = { ...(out.streaming ?? {}), services: [...baseServices] };
  }

  return out;
}

/**
 * Load defaults ← env ← settings.json, validate, return resolved operator settings.
 * Missing settings.json is fine (logs once); invalid JSON/values fail startup.
 */
export async function loadSettings(
  env: NodeJS.ProcessEnv = process.env,
  filePath: string = settingsPath(),
  cronFromEnv: string
): Promise<ResolvedSettings> {
  const defaults = defaultSettings();
  const fromEnv = settingsFromEnv(env);
  const baseline = deepMerge(
    defaults as unknown as Record<string, unknown>,
    fromEnv as unknown as Record<string, unknown>
  ) as SettingsFile;
  let merged = baseline;

  const file = await readSettingsFile(filePath);
  if (file) {
    warnUnknownKeys(file);
    merged = deepMerge(
      baseline as unknown as Record<string, unknown>,
      file as unknown as Record<string, unknown>
    ) as SettingsFile;
    merged = restoreBlankStringsFromBaseline(merged, baseline);
    console.log(`Loaded operator settings from ${filePath}`);
  } else {
    console.log(
      `No ${filePath} found — using defaults` +
        (Object.keys(fromEnv.channels ?? {}).length || fromEnv.streaming?.services?.length
          ? " and environment variables"
          : "") +
        `. Copy settings.example.json to data/settings.json to customize.`
    );
  }

  return resolveSettings(merged, { cronFromEnv });
}
