import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it } from "node:test";
import { SuggestionHistory } from "../src/discovery/history";

describe("SuggestionHistory TTL", () => {
  it("prunes entries older than suggestedTtlDays", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-history-"));
    const filePath = path.join(dir, "suggested.json");

    const oldDate = new Date();
    oldDate.setUTCDate(oldDate.getUTCDate() - 120);
    const recentDate = new Date();
    recentDate.setUTCDate(recentDate.getUTCDate() - 10);

    await fs.writeFile(
      filePath,
      JSON.stringify({
        "movie:1": {
          title: "Old",
          type: "movie",
          tmdbId: 1,
          category: "trending",
          suggestedAt: oldDate.toISOString().split("T")[0]
        },
        "movie:2": {
          title: "Recent",
          type: "movie",
          tmdbId: 2,
          category: "trending",
          suggestedAt: recentDate.toISOString().split("T")[0]
        }
      }),
      "utf8"
    );

    const history = new SuggestionHistory(filePath, 90, 90);
    await history.load();

    assert.equal(history.has("movie:1"), false);
    assert.equal(history.has("movie:2"), true);
    assert.equal(history.size, 1);
  });

  it("uses requestedTtlDays when requestedAt is set", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-history-"));
    const filePath = path.join(dir, "suggested.json");

    const suggested = new Date();
    suggested.setUTCDate(suggested.getUTCDate() - 60);
    const requested = new Date();
    requested.setUTCDate(requested.getUTCDate() - 40);

    await fs.writeFile(
      filePath,
      JSON.stringify({
        "movie:9": {
          title: "Requested",
          type: "movie",
          tmdbId: 9,
          category: "trending",
          suggestedAt: suggested.toISOString().split("T")[0],
          requestedAt: requested.toISOString().split("T")[0]
        }
      }),
      "utf8"
    );

    // Suggested TTL 90 would keep it; requested TTL 30 expires it.
    const history = new SuggestionHistory(filePath, 90, 30);
    await history.load();
    assert.equal(history.has("movie:9"), false);
  });

  it("ttl 0 never prunes that memory class", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-history-"));
    const filePath = path.join(dir, "suggested.json");

    const oldDate = new Date();
    oldDate.setUTCDate(oldDate.getUTCDate() - 400);

    await fs.writeFile(
      filePath,
      JSON.stringify({
        "movie:3": {
          title: "Forever",
          type: "movie",
          tmdbId: 3,
          category: "trending",
          suggestedAt: oldDate.toISOString().split("T")[0]
        }
      }),
      "utf8"
    );

    const history = new SuggestionHistory(filePath, 0, 90);
    await history.load();
    assert.equal(history.has("movie:3"), true);
  });

  it("markRequested sets requestedAt", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-history-"));
    const filePath = path.join(dir, "suggested.json");
    const history = new SuggestionHistory(filePath, 90, 90);
    await history.load();

    history.set("tv:5", {
      title: "Show",
      type: "tv",
      tmdbId: 5,
      category: "tv-show-of-the-day",
      suggestedAt: "2026-01-01"
    });
    history.markRequested("tv", 5, "2026-07-20");
    const entry = history.get("tv:5");
    assert.ok(entry);
    assert.equal(entry.requestedAt, "2026-07-20");
    assert.equal(entry.suggestedAt, "2026-01-01");
  });
});
