import type { AppConfig, MediaType } from "../types";
import { isUnavailableFromDetails, type SeerrMediaDetails } from "./status";

export class SeerrClient {
  private cookie = "";
  private readonly cache = new Map<string, SeerrMediaDetails | null>();

  constructor(private readonly config: AppConfig) {}

  clearCache(): void {
    this.cache.clear();
  }

  private async login(): Promise<void> {
    const res = await fetch(`${this.config.seerrUrl}/api/v1/auth/local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.config.seerrUsername,
        password: this.config.seerrPassword
      })
    });

    if (!res.ok) {
      throw new Error(`Seerr login failed: ${await res.text()}`);
    }

    const cookies = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);

    if (!cookies.length || !cookies[0]) {
      throw new Error("No session cookie returned from Seerr.");
    }

    this.cookie = String(cookies[0]).split(";")[0];
    console.log("Logged into Seerr.");
  }

  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    if (!this.cookie) {
      await this.login();
    }

    const url = `${this.config.seerrUrl}${path}`;
    const headers: Record<string, string> = {
      Cookie: this.cookie,
      ...(options.headers as Record<string, string> | undefined)
    };

    let res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      await this.login();
      res = await fetch(url, {
        ...options,
        headers: { ...headers, Cookie: this.cookie }
      });
    }

    return res;
  }

  async getMediaDetails(type: MediaType, tmdbId: number): Promise<SeerrMediaDetails | null> {
    const key = `${type}:${tmdbId}`;
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }

    try {
      const res = await this.fetch(`/api/v1/${type}/${tmdbId}`);
      if (!res.ok) {
        console.warn(`Seerr lookup failed for ${type}:${tmdbId}: ${res.status}`);
        this.cache.set(key, null);
        return null;
      }

      const json = (await res.json()) as SeerrMediaDetails & {
        data?: SeerrMediaDetails;
        movie?: SeerrMediaDetails;
        tv?: SeerrMediaDetails;
      };
      const details = json?.data || json?.movie || json?.tv || json;
      this.cache.set(key, details);
      return details;
    } catch (err) {
      console.warn(`Seerr lookup error for ${type}:${tmdbId}: ${(err as Error).message}`);
      this.cache.set(key, null);
      return null;
    }
  }

  /**
   * Returns true when the title should not be recommended
   * (already available, pending, processing, blacklisted, or fail-closed lookup miss).
   */
  async isUnavailable(type: MediaType, tmdbId: number): Promise<boolean> {
    const details = await this.getMediaDetails(type, tmdbId);
    if (!details) {
      return this.config.seerrFailClosed;
    }
    return isUnavailableFromDetails(details);
  }

  async request(mediaType: MediaType, tmdbId: number): Promise<unknown> {
    const body: Record<string, unknown> = {
      mediaType,
      mediaId: Number(tmdbId),
      is4k: false
    };

    if (mediaType === "tv") {
      body.seasons = "all";
    }

    const res = await this.fetch("/api/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    console.log("Seerr response:", res.status, text);

    if (!res.ok) {
      throw new Error(text || `Seerr request failed with status ${res.status}`);
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
