import fs from "fs/promises";
import path from "path";
import type { HistoryEntry, MediaType } from "../types";

function cutoffIso(ttlDays: number): string {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - ttlDays);
  return cutoff.toISOString().split("T")[0];
}

function isExpired(
  entry: HistoryEntry,
  suggestedTtlDays: number,
  requestedTtlDays: number
): boolean {
  if (entry.requestedAt) {
    if (requestedTtlDays <= 0) return false;
    return entry.requestedAt < cutoffIso(requestedTtlDays);
  }
  if (suggestedTtlDays <= 0) return false;
  if (!entry.suggestedAt) return true;
  return entry.suggestedAt < cutoffIso(suggestedTtlDays);
}

export class SuggestionHistory {
  private entries = new Map<string, HistoryEntry>();

  constructor(
    private readonly filePath: string,
    private readonly suggestedTtlDays: number,
    private readonly requestedTtlDays: number = suggestedTtlDays
  ) {}

  static defaultPath(): string {
    return path.join(process.cwd(), "data", "suggested.json");
  }

  async load(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        await fs.writeFile(this.filePath, "{}", "utf8");
      } else {
        throw err;
      }
    }

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, HistoryEntry>;
      if (parsed && typeof parsed === "object") {
        this.entries = new Map(Object.entries(parsed));
      }
    } catch (err) {
      console.warn(`Unable to read suggestion history: ${(err as Error).message}`);
      this.entries = new Map();
    }

    this.pruneExpired();
  }

  private pruneExpired(): void {
    for (const [key, entry] of this.entries) {
      if (isExpired(entry, this.suggestedTtlDays, this.requestedTtlDays)) {
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
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const payload = Object.fromEntries(this.entries.entries());
    await fs.writeFile(this.filePath, JSON.stringify(payload, null, 2), "utf8");
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
