import type { AppConfig, TmdbItem } from "../types";
import { mediaTypeOf } from "../lib/media";

interface TmdbListResponse {
  results?: TmdbItem[];
  page?: number;
  total_pages?: number;
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
}

interface TmdbGenre {
  id: number;
  name: string;
}

export class TmdbClient {
  private genreCache = new Map<string, Map<number, string>>();
  private providerCache = new Map<string, TmdbProvider[]>();
  private overviewFallbackCache = new Map<string, string | null>();

  constructor(private readonly config: AppConfig) {}

  async get<T = unknown>(apiPath: string): Promise<T> {
    const sep = apiPath.includes("?") ? "&" : "?";
    const url = `https://api.themoviedb.org/3${apiPath}${sep}api_key=${this.config.tmdbApiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TMDb error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async fetchPages(apiPath: string, pages: number): Promise<TmdbItem[]> {
    const results: TmdbItem[] = [];
    const seen = new Set<number>();
    const maxPages = Math.max(1, pages);

    for (let page = 1; page <= maxPages; page += 1) {
      const sep = apiPath.includes("?") ? "&" : "?";
      const data = await this.get<TmdbListResponse>(`${apiPath}${sep}page=${page}`);
      const batch = data.results || [];
      if (!batch.length) break;

      for (const item of batch) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        results.push(item);
      }

      const totalPages = data.total_pages ?? page;
      if (page >= totalPages) break;
    }

    return results;
  }

  /**
   * If the item has no overview in the primary TMDb language, refetch details
   * using TMDB_FALLBACK_LANGUAGE (default `en`). See GitHub issue #4.
   */
  async withOverviewFallback(item: TmdbItem): Promise<TmdbItem> {
    if (item.overview?.trim()) return item;

    const fallback = this.config.tmdbFallbackLanguage?.trim();
    if (!fallback) return item;

    const primary = this.config.tmdbLanguage.trim().toLowerCase();
    const fallbackNorm = fallback.toLowerCase();
    if (primary === fallbackNorm) return item;

    const type = mediaTypeOf(item);
    const cacheKey = `${type}:${item.id}:${fallbackNorm}`;
    if (this.overviewFallbackCache.has(cacheKey)) {
      const cached = this.overviewFallbackCache.get(cacheKey);
      return cached ? { ...item, overview: cached } : item;
    }

    try {
      const details = await this.get<{ overview?: string }>(
        `/${type}/${item.id}?language=${encodeURIComponent(fallback)}`
      );
      const overview = details.overview?.trim() || null;
      this.overviewFallbackCache.set(cacheKey, overview);
      return overview ? { ...item, overview } : item;
    } catch (err) {
      console.warn(
        `TMDb overview fallback failed for ${type}:${item.id}: ${(err as Error).message}`
      );
      this.overviewFallbackCache.set(cacheKey, null);
      return item;
    }
  }

  private async listProviders(mediaType: "movie" | "tv"): Promise<TmdbProvider[]> {
    const cacheKey = `${mediaType}:${this.config.watchRegion}`;
    const cached = this.providerCache.get(cacheKey);
    if (cached) return cached;

    const data = await this.get<{ results?: TmdbProvider[] }>(
      `/watch/providers/${mediaType}?watch_region=${this.config.watchRegion}`
    );
    const providers = data.results || [];
    this.providerCache.set(cacheKey, providers);
    return providers;
  }

  async getProviderId(providerName: string, mediaType: "movie" | "tv"): Promise<number | null> {
    const providers = await this.listProviders(mediaType);
    const needle = providerName.toLowerCase();
    const found = providers.find(
      (provider) => provider.provider_name.toLowerCase() === needle
    );
    return found ? found.provider_id : null;
  }

  async getGenres(type: "movie" | "tv", ids: number[] = []): Promise<string> {
    if (!this.genreCache.has(type)) {
      const data = await this.get<{ genres?: TmdbGenre[] }>(`/genre/${type}/list?language=en`);
      this.genreCache.set(
        type,
        new Map((data.genres || []).map((g) => [g.id, g.name]))
      );
    }
    const map = this.genreCache.get(type)!;
    return ids
      .map((id) => map.get(id))
      .filter(Boolean)
      .slice(0, 3)
      .join(" · ");
  }
}
