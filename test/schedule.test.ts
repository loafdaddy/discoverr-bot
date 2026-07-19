import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cronFromPostTime,
  describeDailyCron,
  resolveCronSchedule
} from "../src/lib/schedule";

describe("cronFromPostTime", () => {
  it("builds a daily cron from HH:MM", () => {
    assert.equal(cronFromPostTime("09:00"), "0 9 * * *");
    assert.equal(cronFromPostTime("18:30"), "30 18 * * *");
    assert.equal(cronFromPostTime("0:05"), "5 0 * * *");
  });

  it("rejects invalid values", () => {
    assert.throws(() => cronFromPostTime("25:00"));
    assert.throws(() => cronFromPostTime("9"));
    assert.throws(() => cronFromPostTime("nine"));
  });
});

describe("resolveCronSchedule", () => {
  it("prefers CRON_SCHEDULE when set", () => {
    assert.equal(
      resolveCronSchedule({ CRON_SCHEDULE: "15 20 * * 1-5", POST_TIME: "09:00" }),
      "15 20 * * 1-5"
    );
  });

  it("uses POST_TIME when cron is unset", () => {
    assert.equal(resolveCronSchedule({ POST_TIME: "14:45" }), "45 14 * * *");
  });

  it("uses POST_HOUR and POST_MINUTE when cron and POST_TIME are unset", () => {
    assert.equal(resolveCronSchedule({ POST_HOUR: "7", POST_MINUTE: "15" }), "15 7 * * *");
    assert.equal(resolveCronSchedule({ POST_HOUR: "7" }), "0 7 * * *");
  });

  it("defaults to 09:00 daily", () => {
    assert.equal(resolveCronSchedule({}), "0 9 * * *");
  });
});

describe("describeDailyCron", () => {
  it("summarises simple daily crons", () => {
    assert.equal(describeDailyCron("0 9 * * *"), "09:00");
    assert.equal(describeDailyCron("30 18 * * *"), "18:30");
  });

  it("returns null for non-daily expressions", () => {
    assert.equal(describeDailyCron("0 9 * * 1"), null);
  });
});
