import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWatchRegion } from "../src/lib/watchRegion";

describe("normalizeWatchRegion", () => {
  it("maps common aliases", () => {
    assert.equal(normalizeWatchRegion("USA"), "US");
    assert.equal(normalizeWatchRegion("United Kingdom"), "GB");
    assert.equal(normalizeWatchRegion("Australia"), "AU");
  });

  it("accepts two-letter codes", () => {
    assert.equal(normalizeWatchRegion("nz"), "NZ");
    assert.equal(normalizeWatchRegion("JP"), "JP");
  });

  it("falls back for empty values", () => {
    assert.equal(normalizeWatchRegion(""), "AU");
    assert.equal(normalizeWatchRegion(undefined), "AU");
  });
});
