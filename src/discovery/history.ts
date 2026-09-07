import fs from "fs/promises";
import path from "path";
import { writeJsonAtomic } from "../lib/atomicWrite";
import { subtractDaysIso, localDateIso } from "../lib/localDate";
import type { HistoryEntry, MediaType } from "../types";

function cutoffIso(ttlDays: number, timeZone: string): string {
  return subtractDaysIso(localDateIso(timeZone), ttlDays);
}

function isExpired(
  entry: HistoryEntry,
  suggestedTtlDays: number,
  requestedTtlDays: number,
  timeZone: string
): boolean {
  if (entry.requestedAt) {
    if (requestedTtlDays <= 0) return false;
    return entry.requestedAt < cutoffIso(requestedTtlDays, timeZone);
  }
  if (suggestedTtlDays <= 0) return false;
  if (!entry.suggestedAt) return true;
  return entry.suggestedAt < cutoffIso(suggestedTtlDays, timeZone);
}

export class SuggestionHistory {
  private entries = new Map<string, HistoryEntry>();
  private loaded = false;
  private loadFailed = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly suggestedTtlDays: number,
    private readonly requestedTtlDays: number = suggestedTtlDays,
    private readonly timeZone: string = "UTC"
  ) {}

  static defaultPath(): string {
    return path.join(process.cwd(), "data", "suggested.json");
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  /** Load from disk if this instance has not successfully loaded yet. */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.load();
  }

  async load(): Promise<void> {
    await this.enqueue(() => this.loadUnlocked());
  }

  private async loadUnlocked(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        await writeJsonAtomic(this.filePath, {});
      } else {
        throw err;
      }
    }

    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, "utf8");
    } catch (err) {
      console.warn(`Unable to read suggestion history: ${(err as Error).message}`);
      this.loadFailed = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, HistoryEntry>;
      if (parsed && typeof parsed === "object") {
        this.entries = new Map(Object.entries(parsed));
      } else {
        this.entries = new Map();
      }
    } catch (err) {
      console.warn(
        `Unable to parse suggestion history (${this.filePath}): ${(err as Error).message}. ` +
          "Keeping in-memory entries and refusing to overwrite the file."
      );
      this.loadFailed = true;
      return;
    }

    this.pruneExpired();
    this.loaded = true;
    this.loadFailed = false;
  }

  private pruneExpired(): void {
    for (const [key, entry] of this.entries) {
      if (isExpired(entry, this.suggestedTtlDays, this.requestedTtlDays, this.timeZone)) {
        this.entries.delete(key);
      }
    }
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): HistoryEntry | undefined {
    return this.entries.get(key);
  }

  set(key: string, entry: HistoryEntry): void {
    this.entries.set(key, entry);
  }

  /** Record a successful Seerr request for memory cooldowns. */
  markRequested(
    mediaType: MediaType,
    tmdbId: number,
    today: string,
    title?: string
  ): void {
    const key = `${mediaType}:${tmdbId}`;
    const existing = this.entries.get(key);
    this.entries.set(key, {
      title: title ?? existing?.title ?? `${mediaType} ${tmdbId}`,
      type: mediaType,
      tmdbId,
      category: existing?.category ?? "request",
      suggestedAt: existing?.suggestedAt ?? today,
      requestedAt: today
    });
  }

  async save(): Promise<void> {
    await this.enqueue(() => this.saveUnlocked());
  }

  private async saveUnlocked(): Promise<void> {
    if (this.loadFailed) {
      console.warn(
        `Skipping suggestion history save to avoid overwriting unreadable file ${this.filePath}`
      );
      return;
    }
    const payload = Object.fromEntries(this.entries.entries());
    await writeJsonAtomic(this.filePath, payload);
  }

  /** Exposed for tests. */
  get size(): number {
    return this.entries.size;
  }

  /** Exposed for tests. */
  getMap(): Map<string, HistoryEntry> {
    return this.entries;
  }
}
