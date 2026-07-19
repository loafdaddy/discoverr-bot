import fs from "fs/promises";
import path from "path";
import type { HistoryEntry } from "../types";

export class SuggestionHistory {
  private entries = new Map<string, HistoryEntry>();

  constructor(
    private readonly filePath: string,
    private readonly ttlDays: number
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
    if (this.ttlDays <= 0) return;

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - this.ttlDays);
    const cutoffIso = cutoff.toISOString().split("T")[0];

    for (const [key, entry] of this.entries) {
      if (!entry.suggestedAt || entry.suggestedAt < cutoffIso) {
        this.entries.delete(key);
      }
    }
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  set(key: string, entry: HistoryEntry): void {
    this.entries.set(key, entry);
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
