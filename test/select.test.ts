import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  seerrPoolTarget,
  selectRecommendations
} from "../src/discovery/select";
import type { SuggestionHistory } from "../src/discovery/history";
import type { SeerrClient } from "../src/seerr/client";
import type { TmdbItem } from "../src/types";

function movie(id: number): TmdbItem {
  return {
    id,
    title: `Movie ${id}`,
    media_type: "movie",
    vote_average: 7.5,
    vote_count: 500,
    original_language: "en",
    release_date: "2020-01-01"
  };
}

function mockHistory(keys: string[] = []): SuggestionHistory {
  const set = new Set(keys);
  return {
    has: (key: string) => set.has(key),
    get: () => undefined,
    set: () => undefined
  } as unknown as SuggestionHistory;
}

function mockSeerr(lookupLog: number[]): SeerrClient {
  return {
    isUnavailable: async (_type: string, tmdbId: number) => {
      lookupLog.push(tmdbId);
      return false;
    }
  } as unknown as SeerrClient;
}

describe("seerrPoolTarget", () => {
  it("keeps a modest pool for small post counts", () => {
    assert.equal(seerrPoolTarget(1), 16);
    assert.equal(seerrPoolTarget(3), 24);
    assert.equal(seerrPoolTarget(0), 0);
  });
});

describe("selectRecommendations", () => {
  it("stops Seerr lookups once the sample pool is full", async () => {
    const lookupLog: number[] = [];
    const items = Array.from({ length: 80 }, (_, i) => movie(i + 1));
    const used = new Set<string>();

    const picked = await selectRecommendations(
      items,
      1,
      used,
      mockHistory(),
      mockSeerr(lookupLog),
      { minRating: 6, minVotes: 50, requireEnglish: true, weighted: false }
    );

    assert.equal(picked.length, 1);
    assert.equal(lookupLog.length, seerrPoolTarget(1));
    assert.ok(lookupLog.length < items.length);
  });

  it("skips AVAILABLE / unavailable titles before picking", async () => {
    const items = [movie(1), movie(2), movie(3)];
    const used = new Set<string>();
    const seerr = {
      isUnavailable: async (_type: string, tmdbId: number) => tmdbId === 1 || tmdbId === 2
    } as unknown as SeerrClient;

    const picked = await selectRecommendations(
      items,
      1,
      used,
      mockHistory(),
      seerr,
      { minRating: 6, minVotes: 50, requireEnglish: true, weighted: false }
    );

    assert.equal(picked.length, 1);
    assert.equal(picked[0].id, 3);
    assert.ok(used.has("movie:3"));
  });
});
