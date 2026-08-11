import type { AppConfig, MediaType } from "../types";
import { isUnavailableFromDetails, type SeerrMediaDetails } from "./status";

function describeFetchFailure(seerrUrl: string, err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const hints: string[] = [];

  if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(message)) {
    hints.push("hostname does not resolve from this container/host");
  }
  if (/ECONNREFUSED/i.test(message)) {
    hints.push("connection refused — is Seerr running and reachable at SEERR_URL?");
  }
  if (/certificate|SSL|TLS|UNABLE_TO_VERIFY/i.test(message)) {
    hints.push("TLS/certificate problem — check HTTPS cert or use http:// on a private LAN");
  }
  if (/fetch failed|network/i.test(message) && !hints.length) {
    hints.push("network error — confirm SEERR_URL is reachable from the Discoverr container (not host localhost unless shared network)");
  }

  const hint = hints.length ? ` (${hints.join("; ")})` : "";
  return `Seerr unreachable at ${seerrUrl}: ${message}${hint}`;
}

export class SeerrClient {
  private cookie = "";
  private readonly cache = new Map<string, SeerrMediaDetails | null>();

  constructor(private readonly config: AppConfig) {}

  clearCache(): void {
    this.cache.clear();
  }

  private async login(): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.config.seerrUrl}/api/v1/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: this.config.seerrUsername,
          password: this.config.seerrPassword
        })
      });
    } catch (err) {
      throw new Error(describeFetchFailure(this.config.seerrUrl, err));
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Seerr login failed (${res.status}) at ${this.config.seerrUrl} — check SEERR_USERNAME / SEERR_PASSWORD (use a local Seerr user with email+password, not OAuth-only)`
      );
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Seerr login failed (${res.status}) at ${this.config.seerrUrl}: ${body || res.statusText}`
      );
    }

    const cookies = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);

    if (!cookies.length || !cookies[0]) {
      throw new Error(
        `No session cookie returned from Seerr at ${this.config.seerrUrl} — login may have succeeded without Set-Cookie; check reverse-proxy cookie settings`
      );
    }

    this.cookie = String(cookies[0]).split(";")[0];
    console.log("Logged into Seerr.");
  }

  /**
   * Probe Seerr on startup: optional public status, then cookie login.
   * Throws with actionable messages for bad URL, TLS, or credentials.
   */
  async checkHealth(): Promise<void> {
    const base = this.config.seerrUrl;

    try {
      const statusRes = await fetch(`${base}/api/v1/status`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (statusRes.ok) {
        try {
          const status = (await statusRes.json()) as {
            version?: string;
            commitTag?: string;
          };
          const label = status.version || status.commitTag;
          if (label) {
            console.log(`Seerr reachable at ${base} (version ${label}).`);
          } else {
            console.log(`Seerr reachable at ${base}.`);
          }
        } catch {
          console.log(`Seerr reachable at ${base}.`);
        }
      } else if (statusRes.status !== 401 && statusRes.status !== 403) {
        console.warn(
          `Seerr status probe at ${base}/api/v1/status returned ${statusRes.status}; continuing with login check.`
        );
      }
    } catch (err) {
      throw new Error(describeFetchFailure(base, err));
    }

    await this.login();
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

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err) {
      throw new Error(describeFetchFailure(this.config.seerrUrl, err));
    }

    if (res.status === 401 || res.status === 403) {
      await this.login();
      try {
        res = await fetch(url, {
          ...options,
          headers: { ...headers, Cookie: this.cookie }
        });
      } catch (err) {
        throw new Error(describeFetchFailure(this.config.seerrUrl, err));
      }
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
