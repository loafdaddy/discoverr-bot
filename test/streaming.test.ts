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
  buildStreamingTryOrder,
  expandStreamingQuotas
} from "../src/discovery/streamingSlots";
import { mediaTypesForConfig } from "../src/discovery/streamingSelect";
import type { TmdbItem } from "../src/types";

function movie(id: number): TmdbItem {
  return { id, title: `Movie ${id}`, media_type: "movie" };
}

function tv(id: number): TmdbItem {
  return { id, name: `Show ${id}`, media_type: "tv" };
}

describe("allocateStreamingSlots", () => {
  it("prefers distinct providers for 3 slots when 3+ services resolve", () => {
    const services = [
      { service: "Netflix", providerId: 8, mediaType: "movie" as const },
      { service: "Disney Plus", providerId: 337, mediaType: "movie" as const },
      { service: "Amazon Prime Video", providerId: 119, mediaType: "movie" as const }
    ];

    const slots = allocateStreamingSlots(services, 3);
    assert.equal(slots.length, 3);
    const ids = slots.map((s) => s.providerId);
    assert.equal(new Set(ids).size, 3);
  });

  it("reuses providers only after uniqueness is exhausted", () => {
    const services = [
      { service: "Netflix", providerId: 8, mediaType: "movie" as const },
      { service: "Stan", providerId: 21, mediaType: "movie" as const }
    ];

    const slots = allocateStreamingSlots(services, 3);
    assert.equal(slots.length, 3);
    assert.equal(new Set(slots.map((s) => s.providerId)).size, 2);
  });
});

describe("expandStreamingQuotas", () => {
  it("expands named quotas into slots", () => {
    const services = [
      { service: "Netflix", providerId: 8, mediaType: "movie" as const },
      { service: "Stan", providerId: 21, mediaType: "movie" as const }
    ];
    const slots = expandStreamingQuotas(services, { Netflix: 1, Stan: 2 });
    assert.equal(slots.length, 3);
    assert.equal(slots.filter((s) => s.service === "Netflix").length, 1);
    assert.equal(slots.filter((s) => s.service === "Stan").length, 2);
  });
});

describe("buildStreamingTryOrder", () => {
  it("lists unused providers before used ones", () => {
    const services = [
      { service: "Netflix", providerId: 8, mediaType: "movie" as const },
      { service: "Stan", providerId: 21, mediaType: "movie" as const },
      { service: "BINGE", providerId: 385, mediaType: "movie" as const }
    ];
    const used = new Set(["movie:8"]);
    const order = buildStreamingTryOrder(services, used);
    assert.equal(order.length, 3);
    const unusedFirst = order.slice(0, 2).every((s) => s.providerId !== 8);
    assert.equal(unusedFirst, true);
    assert.equal(order[2].providerId, 8);
  });
});

describe("streaming includeTv helper", () => {
  it("reports movie-only or movie+tv", () => {
    assert.deepEqual(mediaTypesForConfig(false), ["movie"]);
    assert.deepEqual(mediaTypesForConfig(true), ["movie", "tv"]);
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

  it("observes tv keys alongside movies", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "discoverr-catalog-"));
    const catalog = new StreamingCatalog(path.join(dir, "streaming-catalog.json"));
    await catalog.load();

    catalog.observe("AU", 8, [movie(1), tv(2)], "2026-07-10", STREAMING_NEW_WINDOW_DAYS);
    assert.ok(catalog.getFirstSeen("AU", 8, movie(1)));
    assert.ok(catalog.getFirstSeen("AU", 8, tv(2)));
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
