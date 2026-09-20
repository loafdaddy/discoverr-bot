import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config";
import { requestButtonLabel } from "../src/discord/embeds";
import { clipEmbedTitle, DISCORD_EMBED_TITLE_MAX } from "../src/discord/embedTitle";
import { userFacingRequestError } from "../src/discord/requestErrors";
import { passesQualityFilters } from "../src/discovery/filters";
import { postAll } from "../src/discovery/postAll";
import { isConfiguredChannel } from "../src/lib/channels";
import { localDateIso, subtractDaysIso } from "../src/lib/localDate";
import type { TmdbItem } from "../src/types";

function requiredEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    TMDB_API_KEY: "k",
    SEERR_URL: "http://seerr.test",
    SEERR_USERNAME: "u",
    SEERR_PASSWORD: "p",
    DISCORD_TOKEN: "t",
    WATCH_REGION: "AU",
    ...overrides
  };
}

describe("isConfiguredChannel", () => {
  it("treats blank and whitespace as disabled", () => {
    assert.equal(isConfiguredChannel(""), false);
    assert.equal(isConfiguredChannel("  "), false);
    assert.equal(isConfiguredChannel("123"), true);
  });
});

describe("localDateIso", () => {
  it("uses the operator timezone, not UTC", () => {
    const instant = new Date("2026-09-07T23:00:00.000Z");
    assert.equal(localDateIso("UTC", instant), "2026-09-07");
    assert.equal(localDateIso("Australia/Melbourne", instant), "2026-09-08");
  });

  it("subtracts calendar days from a date stamp", () => {
    assert.equal(subtractDaysIso("2026-09-08", 1), "2026-09-07");
  });
});

describe("requireEnglish", () => {
  it("rejects titles with no language when English is required", () => {
    const item: TmdbItem = { id: 1, title: "Film", media_type: "movie" };
    assert.equal(passesQualityFilters(item, { requireEnglish: true }), false);
  });

  it("accepts en", () => {
    const item: TmdbItem = {
      id: 1,
      title: "Film",
      media_type: "movie",
      original_language: "en"
    };
    assert.equal(passesQualityFilters(item, { requireEnglish: true }), true);
  });
});

describe("optionalInt env", () => {
  it("rejects non-integers", async () => {
    await assert.rejects(
      () => loadConfig(requiredEnv({ MIN_VOTES: "3.5" })),
      /Invalid integer/
    );
  });
});

describe("userFacingRequestError", () => {
  it("does not leak raw Seerr JSON", () => {
    const huge = `{"error":"${"x".repeat(3000)}"}`;
    const message = userFacingRequestError(new Error(huge));
    assert.ok(message.length < 200);
    assert.equal(message.includes("xxx"), false);
  });

  it("maps no-seasons failures", () => {
    assert.match(
      userFacingRequestError(new Error("no seasons were available to add")),
      /no seasons/i
    );
  });
});

describe("clipEmbedTitle", () => {
  it("stays within Discord's 256-character title limit", () => {
    const title = "A".repeat(400);
    const clipped = clipEmbedTitle("Trending", title, "2026");
    assert.ok(clipped.length <= DISCORD_EMBED_TITLE_MAX);
  });
});

describe("requestButtonLabel", () => {
  it("includes the title so multi-card rows are distinct", () => {
    const a: TmdbItem = { id: 1, title: "Dune", media_type: "movie" };
    const b: TmdbItem = { id: 2, title: "Arrival", media_type: "movie" };
    assert.equal(requestButtonLabel(a), "Request: Dune");
    assert.equal(requestButtonLabel(b), "Request: Arrival");
    assert.notEqual(requestButtonLabel(a), requestButtonLabel(b));
  });

  it("stays within Discord's 80-character button label limit", () => {
    const item: TmdbItem = { id: 1, title: "X".repeat(200), media_type: "movie" };
    assert.ok(requestButtonLabel(item).length <= 80);
  });
});

describe("postAll in-flight guard", () => {
  // A failing run used to leave a second, unhandled rejected promise behind,
  // which terminates the process even though callers wrap postAll in try/catch.
  function stubs(loadImpl: () => Promise<void>) {
    return {
      client: {} as never,
      tmdb: {} as never,
      seerr: { clearCache() {} } as never,
      history: { load: loadImpl } as never,
      config: {
        dryRun: true,
        timezone: "UTC",
        minRating: 0,
        minVotes: 0,
        requireEnglish: false,
        categoryPostCounts: {},
        movieOfDayChannelId: "",
        tvOfDayChannelId: "",
        trendingChannelId: "",
        newReleasesChannelId: "",
        streamingChannelId: "",
        hiddenGemsChannelId: ""
      } as never
    };
  }

  it("surfaces the failure without leaving an unhandled rejection", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    const log = console.log;
    console.log = () => {};

    try {
      const failing = stubs(async () => {
        throw new Error("TMDb error 429: rate limited");
      });
      await assert.rejects(
        postAll(failing.client, failing.config, failing.tmdb, failing.seerr, failing.history),
        /rate limited/
      );

      // Let Node settle the promise graph so any stray rejection is reported.
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(unhandled, []);

      // The guard must also reset, or every later run is skipped.
      let ran = false;
      const ok = stubs(async () => {
        ran = true;
      });
      await postAll(ok.client, ok.config, ok.tmdb, ok.seerr, ok.history);
      assert.equal(ran, true);
    } finally {
      console.log = log;
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
