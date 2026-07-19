import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it } from "node:test";
import { SuggestionHistory } from "../src/discovery/history";

describe("SuggestionHistory TTL", () => {
  it("prunes entries older than ttlDays", async () => {
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

    const history = new SuggestionHistory(filePath, 90);
    await history.load();

    assert.equal(history.has("movie:1"), false);
    assert.equal(history.has("movie:2"), true);
    assert.equal(history.size, 1);
  });
});
