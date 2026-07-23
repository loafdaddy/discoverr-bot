import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySettingsFile,
  defaultOptionalSettings,
  stripJsonComments
} from "../src/settings";

describe("optional settings.json", () => {
  it("defaults match pre-3.0 behaviour when no file overrides are set", () => {
    const d = defaultOptionalSettings();
    assert.equal(d.categoryPostCounts.trending, 3);
    assert.equal(d.categoryPostCounts.movieOfTheDay, 1);
    assert.equal(d.streamingIncludeTv, false);
    assert.equal(d.dryRun, false);
    assert.deepEqual(d.streamingQuotas, {});
  });

  it("strips # and // comments so the example file is editable", () => {
    const raw = `
# top comment
{
  // how many titles
  "categories": {
    "trending": { "postCount": 2 } # end of line
  },
  "streaming": {
    "includeTv": true
  }
}
`;
    const parsed = JSON.parse(stripJsonComments(raw)) as {
      categories: { trending: { postCount: number } };
      streaming: { includeTv: boolean };
    };
    assert.equal(parsed.categories.trending.postCount, 2);
    assert.equal(parsed.streaming.includeTv, true);
  });

  it("does not strip # inside strings", () => {
    const raw = `{ "note": "use #hash carefully" }`;
    const parsed = JSON.parse(stripJsonComments(raw)) as { note: string };
    assert.equal(parsed.note, "use #hash carefully");
  });

  it("partial file only overrides provided keys", () => {
    const resolved = applySettingsFile({
      categories: { trending: { postCount: 2 } },
      streaming: { includeTv: true }
    });
    assert.equal(resolved.categoryPostCounts.trending, 2);
    assert.equal(resolved.categoryPostCounts.newReleases, 3);
    assert.equal(resolved.streamingIncludeTv, true);
    assert.equal(resolved.streamingNewWindowDays, 21);
  });

  it("rejects postCount outside 1–3", () => {
    assert.throws(
      () => applySettingsFile({ categories: { trending: { postCount: 5 } } }),
      /postCount/
    );
  });

  it("rejects streaming quotas that do not sum to postCount", () => {
    assert.throws(
      () =>
        applySettingsFile({
          categories: { streaming: { postCount: 3 } },
          streaming: { quotas: { Netflix: 2, Stan: 2 } }
        }),
      /quotas sum/
    );
  });

  it("accepts matching streaming quotas", () => {
    const resolved = applySettingsFile({
      categories: { streaming: { postCount: 3 } },
      streaming: { quotas: { Netflix: 1, Stan: 2 }, newWindowDays: 14 }
    });
    assert.equal(resolved.streamingQuotas.Netflix, 1);
    assert.equal(resolved.streamingNewWindowDays, 14);
  });
});
