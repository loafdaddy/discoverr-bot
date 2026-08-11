import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TmdbClient } from "../src/tmdb/client";
import type { AppConfig, TmdbItem } from "../src/types";

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    tmdbApiKey: "test-key",
    seerrUrl: "http://seerr.test",
    seerrUsername: "u",
    seerrPassword: "p",
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
    tmdbLanguage: "pt-BR",
    tmdbFallbackLanguage: "en",
    suggestedTtlDays: 90,
    requestedTtlDays: 90,
    minRating: 6,
    minVotes: 10,
    requireEnglish: false,
    seerrFailClosed: true,
    pagesToFetch: 1,
    ...overrides
  };
}

describe("TmdbClient.withOverviewFallback", () => {
  it("returns the item unchanged when overview is present", async () => {
    const tmdb = new TmdbClient(baseConfig());
    const get = mock.method(tmdb, "get", async () => {
      throw new Error("should not fetch");
    });
    const item: TmdbItem = { id: 1, title: "Film", overview: "Já tem texto", media_type: "movie" };
    const result = await tmdb.withOverviewFallback(item);
    assert.equal(result.overview, "Já tem texto");
    assert.equal(get.mock.callCount(), 0);
  });

  it("fetches fallback language when overview is empty", async () => {
    const tmdb = new TmdbClient(baseConfig());
    mock.method(tmdb, "get", async (path: string) => {
      assert.match(path, /\/movie\/42\?language=en/);
      return { overview: "English overview" };
    });
    const item: TmdbItem = { id: 42, title: "Film", overview: "", media_type: "movie" };
    const result = await tmdb.withOverviewFallback(item);
    assert.equal(result.overview, "English overview");
  });

  it("skips fetch when primary language equals fallback", async () => {
    const tmdb = new TmdbClient(
      baseConfig({ tmdbLanguage: "en", tmdbFallbackLanguage: "en" })
    );
    const get = mock.method(tmdb, "get", async () => {
      throw new Error("should not fetch");
    });
    const item: TmdbItem = { id: 7, title: "Film", overview: "  ", media_type: "movie" };
    const result = await tmdb.withOverviewFallback(item);
    assert.equal(result.overview, "  ");
    assert.equal(get.mock.callCount(), 0);
  });

  it("uses tv endpoint for TV items", async () => {
    const tmdb = new TmdbClient(baseConfig());
    mock.method(tmdb, "get", async (path: string) => {
      assert.match(path, /\/tv\/9\?language=en/);
      return { overview: "TV overview" };
    });
    const item: TmdbItem = { id: 9, name: "Show", overview: undefined, media_type: "tv" };
    const result = await tmdb.withOverviewFallback(item);
    assert.equal(result.overview, "TV overview");
  });
});
