import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { SeerrClient } from "../src/seerr/client";
import type { AppConfig } from "../src/types";

function baseConfig(): AppConfig {
  return {
    tmdbApiKey: "k",
    seerrUrl: "http://seerr.test",
    seerrUsername: "bot@local",
    seerrPassword: "secret",
    discordToken: "t",
    watchRegion: "AU",
    streamingServices: [],
    streamingQuotas: {},
    streamingIncludeTv: false,
    streamingNewWindowDays: 21,
    movieOfDayChannelId: "",
    tvOfDayChannelId: "",
    trendingChannelId: "",
    newReleasesChannelId: "",
    streamingChannelId: "",
    hiddenGemsChannelId: "",
    categoryPostCounts: {
      movieOfTheDay: 1,
      tvOfTheDay: 1,
      trending: 1,
      newReleases: 1,
      streaming: 3,
      hiddenGems: 1
    },
    postOnStart: false,
    dryRun: false,
    cronSchedule: "0 9 * * *",
    timezone: "UTC",
    tmdbLanguage: "en",
    tmdbFallbackLanguage: "en",
    suggestedTtlDays: 90,
    requestedTtlDays: 90,
    minRating: 6,
    minVotes: 10,
    requireEnglish: false,
    seerrFailClosed: true,
    pagesToFetch: 1
  };
}

describe("SeerrClient.checkHealth", () => {
  it("succeeds when status and login work", async () => {
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/status")) {
        return new Response(JSON.stringify({ version: "2.0.0" }), { status: 200 });
      }
      if (url.endsWith("/api/v1/auth/local")) {
        return new Response("{}", {
          status: 200,
          headers: { "set-cookie": "connect.sid=abc; Path=/" }
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    await seerr.checkHealth();
    assert.equal(fetchMock.mock.callCount(), 2);
    fetchMock.mock.restore();
  });

  it("explains bad credentials", async () => {
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/status")) {
        return new Response("{}", { status: 200 });
      }
      return new Response("Unauthorized", { status: 401 });
    });

    await assert.rejects(
      () => seerr.checkHealth(),
      /SEERR_USERNAME|SEERR_PASSWORD|401/
    );
    fetchMock.mock.restore();
  });

  it("explains network failures", async () => {
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:5055");
    });

    await assert.rejects(() => seerr.checkHealth(), /ECONNREFUSED|unreachable/i);
    fetchMock.mock.restore();
  });
});
