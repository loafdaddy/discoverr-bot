import fs from "fs/promises";
import path from "path";
import type { CategoryPostCounts } from "./types";

/**
 * Optional post configuration in `data/settings.json`.
 * Everything for a normal install still lives in `.env` —
 * this file is only if you want extra configuration for posts.
 */
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
    quotas?: Record<string, number>;
    includeTv?: boolean;
    newWindowDays?: number;
  };
  discovery?: {
    dryRun?: boolean;
    requireEnglish?: boolean;
  };
  memory?: {
    /** Override HISTORY_TTL_DAYS for unrequested suggestions. */
    suggestedTtlDays?: number;
    /** Cooldown after a successful Request (defaults to suggested TTL). */
    requestedTtlDays?: number;
  };
}

export interface OptionalSettings {
  categoryPostCounts: CategoryPostCounts;
  streamingQuotas: Record<string, number>;
  streamingIncludeTv: boolean;
  streamingNewWindowDays: number;
  dryRun: boolean;
  requireEnglish: boolean;
  /** undefined = leave env HISTORY_TTL_DAYS alone */
  suggestedTtlDays?: number;
  requestedTtlDays?: number;
}

const POST_COUNT_MIN = 1;
const POST_COUNT_MAX = 3;

/** Built-in defaults when no settings.json (or partial file). Matches pre-3.0 behaviour. */
export function defaultOptionalSettings(): OptionalSettings {
  return {
    categoryPostCounts: {
      movieOfTheDay: 1,
      tvOfTheDay: 1,
      trending: 3,
      newReleases: 3,
      streaming: 3,
      hiddenGems: 1
    },
    streamingQuotas: {},
    streamingIncludeTv: false,
    streamingNewWindowDays: 21,
    dryRun: false,
    requireEnglish: true
  };
}

export function settingsPath(): string {
  return path.join(process.cwd(), "data", "settings.json");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Allow `#` and `//` comments in settings.json so the example file is readable.
 * Full-line comments and end-of-line comments (outside strings) are stripped.
 */
export function stripJsonComments(raw: string): string {
  // Block comments /* ... */
  let text = raw.replace(/\/\*[\s\S]*?\*\//g, "");

  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
      out.push("");
      continue;
    }

    let result = "";
    let inString = false;
    let escape = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inString) {
        result += ch;
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        result += ch;
        continue;
      }

      // Start of // or # comment
      if (ch === "#" || (ch === "/" && line[i + 1] === "/")) {
        break;
      }
      result += ch;
    }
    out.push(result);
  }
  return out.join("\n");
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

function requireBool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`settings.json: ${label} must be a boolean`);
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
    if (
      typeof count !== "number" ||
      !Number.isFinite(count) ||
      !Number.isInteger(count) ||
      count < 0
    ) {
      throw new Error(
        `settings.json: streaming.quotas["${name}"] must be an integer >= 0`
      );
    }
    quotas[name] = count;
  }
  return quotas;
}

const TOP_LEVEL_KEYS = new Set(["categories", "streaming", "discovery", "memory"]);

/**
 * Apply a partial settings file onto built-in optional defaults.
 * Only keys present in the file change behaviour.
 */
export function applySettingsFile(
  file: SettingsFile,
  base: OptionalSettings = defaultOptionalSettings()
): OptionalSettings {
  for (const key of Object.keys(file as object)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      console.warn(`settings.json: ignoring unknown top-level key "${key}"`);
    }
  }

  const counts = { ...base.categoryPostCounts };
  const cats = file.categories ?? {};
  if (cats.movieOfTheDay?.postCount !== undefined) {
    counts.movieOfTheDay = requireIntInRange(
      cats.movieOfTheDay.postCount,
      "categories.movieOfTheDay.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    );
  }
  if (cats.tvOfTheDay?.postCount !== undefined) {
    counts.tvOfTheDay = requireIntInRange(
      cats.tvOfTheDay.postCount,
      "categories.tvOfTheDay.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    );
  }
  if (cats.trending?.postCount !== undefined) {
    counts.trending = requireIntInRange(
      cats.trending.postCount,
      "categories.trending.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    );
  }
  if (cats.newReleases?.postCount !== undefined) {
    counts.newReleases = requireIntInRange(
      cats.newReleases.postCount,
      "categories.newReleases.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    );
  }
  if (cats.streaming?.postCount !== undefined) {
    counts.streaming = requireIntInRange(
      cats.streaming.postCount,
      "categories.streaming.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    );
  }
  if (cats.hiddenGems?.postCount !== undefined) {
    counts.hiddenGems = requireIntInRange(
      cats.hiddenGems.postCount,
      "categories.hiddenGems.postCount",
      POST_COUNT_MIN,
      POST_COUNT_MAX
    );
  }

  const streaming = file.streaming ?? {};
  let streamingQuotas = base.streamingQuotas;
  if (streaming.quotas !== undefined) {
    streamingQuotas = parseQuotas(streaming.quotas);
  }
  const quotaSum = Object.values(streamingQuotas).reduce((a, b) => a + b, 0);
  if (Object.keys(streamingQuotas).length > 0 && quotaSum !== counts.streaming) {
    throw new Error(
      `settings.json: streaming.quotas sum (${quotaSum}) must equal ` +
        `categories.streaming.postCount (${counts.streaming})`
    );
  }

  let streamingIncludeTv = base.streamingIncludeTv;
  if (streaming.includeTv !== undefined) {
    streamingIncludeTv = requireBool(streaming.includeTv, "streaming.includeTv");
  }

  let streamingNewWindowDays = base.streamingNewWindowDays;
  if (streaming.newWindowDays !== undefined) {
    streamingNewWindowDays = requireIntInRange(
      streaming.newWindowDays,
      "streaming.newWindowDays",
      1,
      90
    );
  }

  const discovery = file.discovery ?? {};
  let dryRun = base.dryRun;
  if (discovery.dryRun !== undefined) {
    dryRun = requireBool(discovery.dryRun, "discovery.dryRun");
  }
  let requireEnglish = base.requireEnglish;
  if (discovery.requireEnglish !== undefined) {
    requireEnglish = requireBool(discovery.requireEnglish, "discovery.requireEnglish");
  }

  const memory = file.memory ?? {};
  let suggestedTtlDays = base.suggestedTtlDays;
  if (memory.suggestedTtlDays !== undefined) {
    suggestedTtlDays = requireIntInRange(
      memory.suggestedTtlDays,
      "memory.suggestedTtlDays",
      0,
      3650
    );
  }
  let requestedTtlDays = base.requestedTtlDays;
  if (memory.requestedTtlDays !== undefined) {
    requestedTtlDays = requireIntInRange(
      memory.requestedTtlDays,
      "memory.requestedTtlDays",
      0,
      3650
    );
  }

  return {
    categoryPostCounts: counts,
    streamingQuotas,
    streamingIncludeTv,
    streamingNewWindowDays,
    dryRun,
    requireEnglish,
    suggestedTtlDays,
    requestedTtlDays
  };
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
    throw new Error(`Unable to read settings file ${filePath}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonComments(raw));
  } catch (err) {
    throw new Error(`Invalid JSON in ${filePath}: ${(err as Error).message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`settings.json must be a JSON object (${filePath})`);
  }

  return parsed as SettingsFile;
}

/**
 * Load optional settings. Missing file → built-in defaults (same as no file).
 * Present file → validate and overlay onto defaults.
 */
export async function loadOptionalSettings(
  filePath: string = settingsPath()
): Promise<OptionalSettings> {
  const base = defaultOptionalSettings();
  const file = await readSettingsFile(filePath);
  if (!file) {
    return base;
  }
  console.log(`Loaded optional settings from ${filePath}`);
  return applySettingsFile(file, base);
}
