import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MediaStatus,
  isUnavailableFromDetails,
  shouldSkipMediaStatus
} from "../src/seerr/status";

describe("shouldSkipMediaStatus", () => {
  it("skips numeric Seerr statuses", () => {
    assert.equal(shouldSkipMediaStatus(MediaStatus.AVAILABLE), true);
    assert.equal(shouldSkipMediaStatus(MediaStatus.PARTIALLY_AVAILABLE), true);
    assert.equal(shouldSkipMediaStatus(MediaStatus.PENDING), true);
    assert.equal(shouldSkipMediaStatus(MediaStatus.PROCESSING), true);
    assert.equal(shouldSkipMediaStatus(MediaStatus.BLACKLISTED), true);
    assert.equal(shouldSkipMediaStatus(MediaStatus.UNKNOWN), false);
    assert.equal(shouldSkipMediaStatus(MediaStatus.DELETED), false);
  });

  it("accepts numeric strings", () => {
    assert.equal(shouldSkipMediaStatus("5"), true);
    assert.equal(shouldSkipMediaStatus("1"), false);
  });
});

describe("isUnavailableFromDetails", () => {
  it("reads top-level numeric status", () => {
    assert.equal(isUnavailableFromDetails({ status: 5 }), true);
    assert.equal(isUnavailableFromDetails({ status: 1 }), false);
  });

  it("reads nested mediaInfo.status", () => {
    assert.equal(isUnavailableFromDetails({ mediaInfo: { status: 4 } }), true);
  });
});
