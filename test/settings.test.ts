import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deepMerge,
  defaultSettings,
  resolveSettings,
  restoreBlankStringsFromBaseline,
  settingsFromEnv
} from "../src/settings";

describe("settings merge and validation", () => {
  it("deepMerge overlays nested objects without dropping siblings", () => {
    const merged = deepMerge(
      { a: 1, nested: { x: 1, y: 2 } } as Record<string, unknown>,
      { nested: { y: 9, z: 3 }, b: true }
    );
    assert.deepEqual(merged, { a: 1, b: true, nested: { x: 1, y: 9, z: 3 } });
  });

  it("defaults resolve to current shipping behavior", () => {
    const resolved = resolveSettings(defaultSettings(), {
      cronFromEnv: "0 9 * * *"
    });
    assert.equal(resolved.categoryPostCounts.trending, 3);
    assert.equal(resolved.categoryPostCounts.movieOfTheDay, 1);
    assert.equal(resolved.streamingIncludeTv, true);
    assert.equal(resolved.suggestedTtlDays, 90);
    assert.equal(resolved.requestedTtlDays, 90);
    assert.equal(resolved.dryRun, false);
    assert.equal(resolved.cronSchedule, "0 9 * * *");
  });

  it("rejects postCount outside 1–3", () => {
    assert.throws(
      () =>
        resolveSettings(
          {
            ...defaultSettings(),
            categories: { trending: { postCount: 5 } }
          },
          { cronFromEnv: "0 9 * * *" }
        ),
      /postCount/
    );
  });

  it("rejects streaming quotas that do not sum to postCount", () => {
    assert.throws(
      () =>
        resolveSettings(
          {
            ...defaultSettings(),
            categories: { streaming: { postCount: 3 } },
            streaming: {
              quotas: { Netflix: 2, Stan: 2 },
              includeTv: true,
              newWindowDays: 21,
              services: []
            }
          },
          { cronFromEnv: "0 9 * * *" }
        ),
      /quotas sum/
    );
  });

  it("accepts matching streaming quotas", () => {
    const resolved = resolveSettings(
      {
        ...defaultSettings(),
        categories: {
          ...defaultSettings().categories,
          streaming: { postCount: 3 }
        },
        streaming: {
          services: ["Netflix", "Stan"],
          quotas: { Netflix: 1, Stan: 2 },
          includeTv: false,
          newWindowDays: 14
        }
      },
      { cronFromEnv: "0 9 * * *" }
    );
    assert.equal(resolved.streamingQuotas.Netflix, 1);
    assert.equal(resolved.streamingIncludeTv, false);
    assert.equal(resolved.streamingNewWindowDays, 14);
  });

  it("settingsFromEnv maps channel and history env vars", () => {
    const overlay = settingsFromEnv({
      STREAMING_SERVICES: "Netflix, Stan",
      HISTORY_TTL_DAYS: "45",
      MOVIE_OF_DAY_CHANNEL_ID: "123",
      POST_TIME: "18:30",
      TZ: "UTC"
    });
    assert.deepEqual(overlay.streaming?.services, ["Netflix", "Stan"]);
    assert.equal(overlay.memory?.suggestedTtlDays, 45);
    assert.equal(overlay.memory?.requestedTtlDays, 45);
    assert.equal(overlay.channels?.movieOfTheDay, "123");
    assert.equal(overlay.schedule?.postTime, "18:30");
    assert.equal(overlay.schedule?.timezone, "UTC");
  });

  it("schedule.cron in settings overrides cronFromEnv", () => {
    const resolved = resolveSettings(
      {
        ...defaultSettings(),
        schedule: { cron: "15 7 * * *", timezone: "UTC" }
      },
      { cronFromEnv: "0 9 * * *" }
    );
    assert.equal(resolved.cronSchedule, "15 7 * * *");
  });
});

describe("settings file load path", () => {
  it("resolveSettings uses postTime when cron absent", () => {
    const resolved = resolveSettings(
      {
        ...defaultSettings(),
        schedule: { postTime: "18:30", timezone: "UTC" }
      },
      { cronFromEnv: "0 9 * * *" }
    );
    assert.equal(resolved.cronSchedule, "30 18 * * *");
  });

  it("restoreBlankStringsFromBaseline keeps env channels when file has empty strings", () => {
    const baseline = {
      channels: { movieOfTheDay: "111", trending: "222" },
      streaming: { services: ["Netflix"] }
    };
    const merged = {
      channels: { movieOfTheDay: "", trending: "333", tvOfTheDay: "" },
      streaming: { services: [] as string[] }
    };
    const out = restoreBlankStringsFromBaseline(merged, baseline);
    assert.equal(out.channels?.movieOfTheDay, "111");
    assert.equal(out.channels?.trending, "333");
    assert.deepEqual(out.streaming?.services, ["Netflix"]);
  });
});
