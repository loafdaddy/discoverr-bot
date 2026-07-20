import fs from "fs/promises";
import path from "path";
import { itemKey } from "../lib/media";
import type { TmdbItem } from "../types";

/** Prefer titles first seen on a provider within this many days. */
export const STREAMING_NEW_WINDOW_DAYS = 21;

interface CatalogEntry {
  firstSeen: string;
}

/** region → providerId → movie:id → firstSeen */
type CatalogData = Record<string, Record<string, Record<string, CatalogEntry>>>;

function daysBefore(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split("T")[0];
}

/**
 * Local first-seen store for TMDb watch-provider membership.
 * TMDb does not expose “date added to Netflix”; this approximates
 * “newly visible in our TMDb snapshot for this provider/region”.
 */
export class StreamingCatalog {
  private data: CatalogData = {};

  constructor(private readonly filePath: string) {}

  static defaultPath(): string {
    return path.join(process.cwd(), "data", "streaming-catalog.json");
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
      const parsed = JSON.parse(raw) as CatalogData;
      this.data = parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.warn(`Unable to read streaming catalog: ${(err as Error).message}`);
      this.data = {};
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  hasProvider(region: string, providerId: number): boolean {
    const provider = this.data[region]?.[String(providerId)];
    return !!provider && Object.keys(provider).length > 0;
  }

  getFirstSeen(region: string, providerId: number, item: TmdbItem): string | null {
    return this.data[region]?.[String(providerId)]?.[itemKey(item)]?.firstSeen ?? null;
  }

  /**
   * Record titles seen on a provider. Cold start (no prior entries for this
   * provider/region) seeds firstSeen outside the new window so the whole
   * discover page is not treated as “new” on day one.
   */
  observe(
    region: string,
    providerId: number,
    items: TmdbItem[],
    todayIso: string,
    windowDays = STREAMING_NEW_WINDOW_DAYS
  ): { coldStart: boolean } {
    const coldStart = !this.hasProvider(region, providerId);
    const providerKey = String(providerId);
    if (!this.data[region]) this.data[region] = {};
    if (!this.data[region][providerKey]) this.data[region][providerKey] = {};

    const bucket = this.data[region][providerKey];
    const seedDate = daysBefore(todayIso, windowDays + 1);

    for (const item of items) {
      if (!item?.id) continue;
      const key = itemKey(item);
      if (bucket[key]?.firstSeen) continue;
      bucket[key] = { firstSeen: coldStart ? seedDate : todayIso };
    }

    return { coldStart };
  }

  /**
   * Titles whose firstSeen falls within the new window.
   * Cold start always returns [] so callers fall back to the full pool.
   */
  filterNewWindow(
    region: string,
    providerId: number,
    items: TmdbItem[],
    todayIso: string,
    coldStart: boolean,
    windowDays = STREAMING_NEW_WINDOW_DAYS
  ): TmdbItem[] {
    if (coldStart) return [];

    const cutoff = daysBefore(todayIso, windowDays);
    return items.filter((item) => {
      const firstSeen = this.getFirstSeen(region, providerId, item);
      return !!firstSeen && firstSeen >= cutoff && firstSeen <= todayIso;
    });
  }
}
