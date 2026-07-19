import type { AppConfig, TmdbItem } from "../types";

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

  async getProviderId(providerName: string, mediaType: "movie" | "tv"): Promise<number | null> {
    const data = await this.get<{ results?: TmdbProvider[] }>(
      `/watch/providers/${mediaType}?watch_region=${this.config.watchRegion}`
    );
    const found = (data.results || []).find(
      (provider) => provider.provider_name.toLowerCase() === providerName.toLowerCase()
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
