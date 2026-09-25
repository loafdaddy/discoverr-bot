import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { SeerrClient } from "../src/seerr/client";
import type { AppConfig } from "../src/types";

function baseConfig(): AppConfig {
  return {
    tmdbApiKey: "k",
    seerrUrl: "http://seerr.test",
    seerrUsername: "bot@local",
    seerrPassword: "secret",
    discordToken: "t",
    watchRegion: "AU",
    streamingServices: [],
    streamingQuotas: {},
    streamingIncludeTv: false,
    streamingNewWindowDays: 21,
    movieOfDayChannelId: "",
    tvOfDayChannelId: "",
    trendingChannelId: "",
    newReleasesChannelId: "",
    streamingChannelId: "",
    hiddenGemsChannelId: "",
    categoryPostCounts: {
      movieOfTheDay: 1,
      tvOfTheDay: 1,
      trending: 1,
      newReleases: 1,
      streaming: 3,
      hiddenGems: 1
    },
    postOnStart: false,
    dryRun: false,
    cronSchedule: "0 9 * * *",
    timezone: "UTC",
    tmdbLanguage: "en",
    tmdbFallbackLanguage: "en",
    suggestedTtlDays: 90,
    requestedTtlDays: 90,
    minRating: 6,
    minVotes: 10,
    requireEnglish: false,
    seerrFailClosed: true,
    pagesToFetch: 1
  };
}

describe("SeerrClient.checkHealth", () => {
  it("succeeds when status and login work", async () => {
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/status")) {
        return new Response(JSON.stringify({ version: "2.0.0" }), { status: 200 });
      }
      if (url.endsWith("/api/v1/auth/local")) {
        return new Response("{}", {
          status: 200,
          headers: { "set-cookie": "connect.sid=abc; Path=/" }
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    await seerr.checkHealth();
    assert.equal(fetchMock.mock.callCount(), 2);
    fetchMock.mock.restore();
  });

  it("explains bad credentials", async () => {
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/status")) {
        return new Response("{}", { status: 200 });
      }
      return new Response("Unauthorized", { status: 401 });
    });

    await assert.rejects(
      () => seerr.checkHealth(),
      /SEERR_USERNAME|SEERR_PASSWORD|401/
    );
    fetchMock.mock.restore();
  });

  it("explains network failures", async () => {
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:5055");
    });

    await assert.rejects(() => seerr.checkHealth(), /ECONNREFUSED|unreachable/i);
    fetchMock.mock.restore();
  });
});

function loggedInFetch(requestStatus: number, requestBody: string) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/v1/auth/local")) {
      return new Response("{}", {
        status: 200,
        headers: { "set-cookie": "connect.sid=abc; Path=/" }
      });
    }
    if (url.endsWith("/api/v1/request")) {
      return new Response(requestBody, { status: requestStatus });
    }
    throw new Error(`unexpected url ${url}`);
  };
}

describe("SeerrClient.request", () => {
  it("logs the status and not the response body on success", async () => {
    const secret = "secret@example.com";
    const body = JSON.stringify({ id: 9, requestedBy: { email: secret, plexToken: "tok" } });
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", loggedInFetch(201, body));
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };

    try {
      await seerr.request("movie", 9);
    } finally {
      console.log = original;
      fetchMock.mock.restore();
    }

    const logged = lines.join("\n");
    assert.match(logged, /Seerr request accepted: 201/);
    assert.equal(logged.includes(secret), false);
    assert.equal(logged.includes("plexToken"), false);
  });

  it("still throws the failure body for request error matching", async () => {
    const body = JSON.stringify({ message: "Request already exists" });
    const seerr = new SeerrClient(baseConfig());
    const fetchMock = mock.method(globalThis, "fetch", loggedInFetch(409, body));
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };

    try {
      await assert.rejects(() => seerr.request("movie", 9), /already exists/);
    } finally {
      console.log = original;
      fetchMock.mock.restore();
    }

    assert.equal(lines.some((line) => line.includes("Seerr response:")), false);
    assert.equal(lines.some((line) => line.includes("already exists")), false);
  });
});
