import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TmdbClient } from "../src/tmdb/client";
import { pickTrailerUrl, youtubeTrailerUrl, type TmdbVideo } from "../src/tmdb/trailer";
import type { AppConfig, TmdbItem } from "../src/types";

function video(overrides: Partial<TmdbVideo>): TmdbVideo {
  return {
    key: "fallback",
    site: "YouTube",
    type: "Trailer",
    official: false,
    iso_639_1: "en",
    ...overrides
  };
}

describe("pickTrailerUrl", () => {
  it("returns null when there is no YouTube trailer", () => {
    const videos: TmdbVideo[] = [
      { key: "vimeo", site: "Vimeo", type: "Trailer", official: true },
      { key: "teaser", site: "YouTube", type: "Teaser", official: true }
    ];
    assert.equal(pickTrailerUrl(videos, ["en"]), null);
  });

  it("prefers an official trailer in the requested language", () => {
    const videos: TmdbVideo[] = [
      video({ key: "en-unofficial", official: false, iso_639_1: "en" }),
      video({ key: "pt-official", official: true, iso_639_1: "pt" }),
      video({ key: "en-official", official: true, iso_639_1: "en" })
    ];
    assert.equal(
      pickTrailerUrl(videos, ["pt-BR", "en"]),
      youtubeTrailerUrl("pt-official")
    );
  });

  it("falls back to any official YouTube trailer", () => {
    const videos: TmdbVideo[] = [
      video({ key: "unofficial-en", official: false, iso_639_1: "en" }),
      video({ key: "official-fr", official: true, iso_639_1: "fr" })
    ];
    assert.equal(pickTrailerUrl(videos, ["en-AU"]), youtubeTrailerUrl("official-fr"));
  });

  it("falls back to any YouTube trailer", () => {
    const videos: TmdbVideo[] = [
      video({ key: "plain", official: false, iso_639_1: "de" })
    ];
    assert.equal(pickTrailerUrl(videos, ["en"]), youtubeTrailerUrl("plain"));
  });

  it("builds a standard YouTube watch URL", () => {
    assert.equal(youtubeTrailerUrl("dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});

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

describe("TmdbClient.getTrailerUrl", () => {
  it("fetches /videos once and caches the ranked URL", async () => {
    const tmdb = new TmdbClient(baseConfig());
    const get = mock.method(tmdb, "get", async (path: string) => {
      assert.match(path, /\/movie\/42\/videos/);
      return {
        results: [
          video({ key: "en-official", official: true, iso_639_1: "en" }),
          video({ key: "pt-official", official: true, iso_639_1: "pt" })
        ]
      };
    });
    const item: TmdbItem = { id: 42, title: "Film", media_type: "movie" };
    const first = await tmdb.getTrailerUrl(item);
    const second = await tmdb.getTrailerUrl(item);
    assert.equal(first, youtubeTrailerUrl("pt-official"));
    assert.equal(second, first);
    assert.equal(get.mock.callCount(), 1);
  });

  it("returns null when TMDb has no trailer", async () => {
    const tmdb = new TmdbClient(baseConfig());
    mock.method(tmdb, "get", async () => ({ results: [] }));
    const item: TmdbItem = { id: 7, name: "Show", media_type: "tv" };
    assert.equal(await tmdb.getTrailerUrl(item), null);
  });

  it("does not cache a failed lookup so a later attempt can retry", async () => {
    const tmdb = new TmdbClient(baseConfig());
    let calls = 0;
    mock.method(tmdb, "get", async () => {
      calls += 1;
      if (calls === 1) throw new Error("timeout");
      return { results: [video({ key: "ok", official: true, iso_639_1: "en" })] };
    });
    const item: TmdbItem = { id: 42, title: "Film", media_type: "movie" };
    assert.equal(await tmdb.getTrailerUrl(item), null);
    assert.equal(await tmdb.getTrailerUrl(item), youtubeTrailerUrl("ok"));
    assert.equal(calls, 2);
  });
});
