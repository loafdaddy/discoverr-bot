import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { postAll } from "../src/discovery/postAll";
import type { SuggestionHistory } from "../src/discovery/history";
import type { SeerrClient } from "../src/seerr/client";
import type { TmdbClient } from "../src/tmdb/client";
import type { AppConfig } from "../src/types";
import type { Client } from "discord.js";

function config(): AppConfig {
  return {
    dryRun: true,
    timezone: "UTC",
    categoryPostCounts: {
      movieOfTheDay: 1,
      tvOfTheDay: 1,
      trending: 1,
      newReleases: 1,
      streaming: 3,
      hiddenGems: 1
    },
    movieOfDayChannelId: "",
    tvOfDayChannelId: "",
    trendingChannelId: "",
    newReleasesChannelId: "",
    streamingChannelId: "",
    hiddenGemsChannelId: ""
  } as AppConfig;
}

const client = {} as Client;
const tmdb = {} as TmdbClient;
const seerr = { clearCache() {} } as SeerrClient;

describe("postAll in-flight guard", { concurrency: 1 }, () => {
  it("rejects to the caller without an unhandled rejection", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => {
      unhandled.push(err);
    };
    process.on("unhandledRejection", onUnhandled);

    const history = {
      load: async () => {
        throw new Error("TMDb error 429: rate limited");
      }
    } as unknown as SuggestionHistory;

    await assert.rejects(
      () => postAll(client, config(), tmdb, seerr, history),
      /TMDb error 429: rate limited/
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    process.off("unhandledRejection", onUnhandled);
    assert.equal(unhandled.length, 0);
  });

  it("skips a second call while a run is in progress", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const history = {
      load: () => gate
    } as unknown as SuggestionHistory;

    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };

    const first = postAll(client, config(), tmdb, seerr, history);
    await new Promise((resolve) => setImmediate(resolve));
    await postAll(client, config(), tmdb, seerr, history);

    console.warn = originalWarn;
    release();
    await first;

    assert.equal(
      warnings.some((line) => line.includes("already in progress")),
      true
    );
  });
});
