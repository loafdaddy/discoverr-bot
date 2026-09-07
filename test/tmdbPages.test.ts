import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { buildRecommendationEmbed, trailerField } from "../src/discord/embeds";
import { itemKey, uniqueByItemKey } from "../src/lib/media";
import { TmdbClient } from "../src/tmdb/client";
import { fetchTrendingCandidates } from "../src/tmdb/sources";
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
      trending: 3,
      newReleases: 1,
      streaming: 3,
      hiddenGems: 1
    },
    postOnStart: false,
    dryRun: false,
    cronSchedule: "0 9 * * *",
    timezone: "UTC",
    tmdbLanguage: "en-AU",
    tmdbFallbackLanguage: "en",
    suggestedTtlDays: 90,
    requestedTtlDays: 90,
    minRating: 6,
    minVotes: 10,
    requireEnglish: false,
    seerrFailClosed: true,
    pagesToFetch: 2,
    ...overrides
  };
}

function movie(id: number): TmdbItem {
  return { id, title: `Movie ${id}`, media_type: "movie" };
}

function tv(id: number): TmdbItem {
  return { id, name: `Show ${id}`, media_type: "tv" };
}

describe("uniqueByItemKey", () => {
  it("keeps the first copy of each movie:/tv: identity", () => {
    const items = [movie(1), tv(1), movie(1), movie(2)];
    const unique = uniqueByItemKey(items);
    assert.deepEqual(unique.map(itemKey), ["movie:1", "tv:1", "movie:2"]);
  });
});

describe("TmdbClient.fetchPages", () => {
  it("keeps a movie and a TV show that share a numeric TMDb id", async () => {
    const tmdb = new TmdbClient(baseConfig());
    mock.method(tmdb, "get", async () => ({
      results: [movie(1), tv(1), movie(1)],
      total_pages: 1
    }));

    const items = await tmdb.fetchPages("/trending/all/day?language=en-AU", 1);
    assert.deepEqual(items.map(itemKey), ["movie:1", "tv:1"]);
  });

  it("still drops the same identity when it repeats across pages", async () => {
    const tmdb = new TmdbClient(baseConfig());
    mock.method(tmdb, "get", async (path: string) => {
      if (path.includes("page=2")) {
        return { results: [movie(1), movie(2)], total_pages: 2 };
      }
      return { results: [movie(1)], total_pages: 2 };
    });

    const items = await tmdb.fetchPages("/discover/movie", 2);
    assert.deepEqual(items.map(itemKey), ["movie:1", "movie:2"]);
  });

  it("skips people so they cannot hide a TV show with the same numeric id", async () => {
    const tmdb = new TmdbClient(baseConfig());
    mock.method(tmdb, "get", async () => ({
      results: [
        { id: 1, name: "Some Actor", media_type: "person" },
        tv(1),
        movie(1)
      ],
      total_pages: 1
    }));

    const items = await tmdb.fetchPages("/trending/all/day", 1);
    assert.deepEqual(items.map(itemKey), ["tv:1", "movie:1"]);
  });
});

describe("fetchTrendingCandidates", () => {
  it("dedupes overlapping day and week lists before shuffle", async () => {
    const tmdb = {
      fetchPages: async (path: string) => {
        if (path.includes("/day")) return [movie(1), tv(2)];
        return [movie(1), movie(3)];
      }
    } as unknown as TmdbClient;

    const items = await fetchTrendingCandidates(tmdb, baseConfig());
    const keys = items.map(itemKey).sort();
    assert.equal(items.length, 3);
    assert.deepEqual(keys, ["movie:1", "movie:3", "tv:2"]);
  });
});

describe("trailer embed field", () => {
  it("formats a YouTube markdown hyperlink", () => {
    const url = "https://www.youtube.com/watch?v=abc123";
    assert.deepEqual(trailerField(url), {
      name: "Trailer",
      value: `[Watch on YouTube](${url})`,
      inline: true
    });
  });

  it("adds the Trailer field on the card when TMDb has a trailer", async () => {
    const url = "https://www.youtube.com/watch?v=abc123";
    const tmdb = {
      withOverviewFallback: async (item: TmdbItem) => item,
      getGenres: async () => "Action",
      getTrailerUrl: async () => url
    } as unknown as TmdbClient;
    const embed = await buildRecommendationEmbed(tmdb, "Trending", movie(1));
    const fields = embed?.toJSON().fields ?? [];
    const trailer = fields.find((field) => field.name === "Trailer");
    assert.equal(trailer?.value, `[Watch on YouTube](${url})`);
    assert.equal(trailer?.inline, true);
  });

  it("omits the Trailer field when there is no trailer", async () => {
    const tmdb = {
      withOverviewFallback: async (item: TmdbItem) => item,
      getGenres: async () => "Drama",
      getTrailerUrl: async () => null
    } as unknown as TmdbClient;
    const embed = await buildRecommendationEmbed(tmdb, "Trending", movie(1));
    const fields = embed?.toJSON().fields ?? [];
    assert.equal(
      fields.some((field) => field.name === "Trailer"),
      false
    );
  });
});
