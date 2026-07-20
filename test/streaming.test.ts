import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it } from "node:test";
import {
  STREAMING_NEW_WINDOW_DAYS,
  StreamingCatalog
} from "../src/discovery/streamingCatalog";
import {
  allocateStreamingSlots,
  buildStreamingTryOrder
} from "../src/discovery/streamingSlots";
import type { TmdbItem } from "../src/types";

function movie(id: number): TmdbItem {
  return { id, title: `Movie ${id}`, media_type: "movie" };
}

describe("allocateStreamingSlots", () => {
  it("prefers distinct providers for 3 slots when 3+ services resolve", () => {
    const services = [
      { service: "Netflix", providerId: 8 },
      { service: "Disney Plus", providerId: 337 },
      { service: "Amazon Prime Video", providerId: 119 }
    ];

    const slots = allocateStreamingSlots(services, 3);
    assert.equal(slots.length, 3);
    const ids = slots.map((s) => s.providerId);
    assert.equal(new Set(ids).size, 3);
  });

  it("reuses providers only after uniqueness is exhausted", () => {
    const services = [
      { service: "Netflix", providerId: 8 },
      { service: "Stan", providerId: 21 }
    ];

    const slots = allocateStreamingSlots(services, 3);
    assert.equal(slots.length, 3);
    assert.equal(new Set(slots.map((s) => s.providerId)).size, 2);
  });
});

describe("buildStreamingTryOrder", () => {
  it("lists unused providers before used ones", () => {
    const services = [
      { service: "Netflix", providerId: 8 },
      { service: "Stan", providerId: 21 },
      { service: "BINGE", providerId: 385 }
    ];
    const used = new Set([8]);
    const order = buildStreamingTryOrder(services, used);
    assert.equal(order.length, 3);
    const unusedFirst = order.slice(0, 2).every((s) => s.providerId !== 8);
    assert.equal(unusedFirst, true);
    assert.equal(order[2].providerId, 8);
  });
});

describe("StreamingCatalog", () => {
  it("cold start seeds outside the new window and filterNewWindow returns empty", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-catalog-"));
    const filePath = path.join(dir, "streaming-catalog.json");
    const catalog = new StreamingCatalog(filePath);
    await catalog.load();

    const today = "2026-07-20";
    const items = [movie(1), movie(2), movie(3)];
    const { coldStart } = catalog.observe("AU", 8, items, today);
    assert.equal(coldStart, true);
    assert.equal(catalog.hasProvider("AU", 8), true);

    const firstSeen = catalog.getFirstSeen("AU", 8, movie(1));
    assert.ok(firstSeen);
    assert.ok(firstSeen < today);

    const neu = catalog.filterNewWindow("AU", 8, items, today, true);
    assert.equal(neu.length, 0);

    await catalog.save();
  });

  it("marks newly observed titles as new after cold start seed", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-catalog-"));
    const filePath = path.join(dir, "streaming-catalog.json");
    const catalog = new StreamingCatalog(filePath);
    await catalog.load();

    const day1 = "2026-07-01";
    catalog.observe("AU", 8, [movie(1), movie(2)], day1);
    assert.equal(
      catalog.filterNewWindow("AU", 8, [movie(1), movie(2)], day1, true).length,
      0
    );

    await catalog.save();

    const catalog2 = new StreamingCatalog(filePath);
    await catalog2.load();

    const day2 = "2026-07-02";
    const { coldStart } = catalog2.observe("AU", 8, [movie(1), movie(2), movie(99)], day2);
    assert.equal(coldStart, false);

    const neu = catalog2.filterNewWindow(
      "AU",
      8,
      [movie(1), movie(2), movie(99)],
      day2,
      false
    );
    assert.equal(neu.length, 1);
    assert.equal(neu[0].id, 99);
    assert.equal(catalog2.getFirstSeen("AU", 8, movie(99)), day2);
  });

  it("keeps firstSeen stable on re-observe", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-catalog-"));
    const catalog = new StreamingCatalog(path.join(dir, "streaming-catalog.json"));
    await catalog.load();

    catalog.observe("AU", 8, [movie(10)], "2026-07-10", STREAMING_NEW_WINDOW_DAYS);
    const seeded = catalog.getFirstSeen("AU", 8, movie(10));
    catalog.observe("AU", 8, [movie(10)], "2026-07-15", STREAMING_NEW_WINDOW_DAYS);
    assert.equal(catalog.getFirstSeen("AU", 8, movie(10)), seeded);
  });
});
