require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

const cron = require("node-cron");
const { getWatchRegion } = require("./lib/watchRegion");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const env = process.env;
const WATCH_REGION = getWatchRegion(env);

const STREAMING_SERVICES = (env.STREAMING_SERVICES || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const seerrCache = new Map();
const suggestionHistoryPath = path.join(__dirname, "data", "suggested.json");
let suggestionHistory = new Map();
let seerrCookie = "";

async function tmdb(path) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3${path}${sep}api_key=${env.TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb error ${res.status}: ${await res.text()}`);
  return res.json();
}

function trim(text, max = 350) {
  if (!text) return "No description available.";
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

function mediaTypeOf(item) {
  if (item.media_type) return item.media_type;
  return item.title ? "movie" : "tv";
}

function isReleased(item, today = new Date().toISOString().split("T")[0]) {
  const date = item.release_date || item.first_air_date;
  return !!date && date <= today;
}

function suggestionKey(item) {
  return `${mediaTypeOf(item)}:${item.id}`;
}

function titleOf(item) {
  return item.title || item.name || "Unknown title";
}

function itemKey(item) {
  const type = mediaTypeOf(item);
  return `${type}:${item.id}`;
}

function yearOf(item) {
  const date = item.release_date || item.first_air_date || "";
  return date ? date.slice(0, 4) : "";
}

function passesQualityFilters(item, filters = {}) {
  const minRating = filters.minRating;
  const minVotes = filters.minVotes;
  const maxPopularity = filters.maxPopularity;
  const maxReleaseYear = filters.maxReleaseYear;
  const minReleaseYear = filters.minReleaseYear;
  const requireEnglish = filters.requireEnglish !== false;

  if (requireEnglish) {
    const language = (item.original_language || item.language || "").toLowerCase();
    if (language && language !== "en" && language !== "en-us" && language !== "en-gb") {
      return false;
    }
  }

  if (minRating !== undefined) {
    const rating = Number(item.vote_average || 0);
    if (rating < minRating) return false;
  }

  if (minVotes !== undefined) {
    const votes = Number(item.vote_count || 0);
    if (votes < minVotes) return false;
  }

  if (maxPopularity !== undefined) {
    const popularity = Number(item.popularity || 0);
    if (popularity > maxPopularity) return false;
  }

  if (maxReleaseYear !== undefined) {
    const year = Number(yearOf(item));
    if (year && year > maxReleaseYear) return false;
  }

  if (minReleaseYear !== undefined) {
    const year = Number(yearOf(item));
    if (year && year < minReleaseYear) return false;
  }

  return true;
}

function findDeepValue(obj, keyPatterns) {
  if (obj == null) return undefined;
  if (Array.isArray(obj)) {
    for (const value of obj) {
      const found = findDeepValue(value, keyPatterns);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (typeof obj !== "object") return undefined;

  for (const [key, value] of Object.entries(obj)) {
    const normalized = key.toLowerCase();
    for (const pattern of keyPatterns) {
      const normalizedPattern = pattern.toLowerCase();
      if (normalized === normalizedPattern || normalized.includes(normalizedPattern)) {
        return value;
      }
    }
    const nested = findDeepValue(value, keyPatterns);
    if (nested !== undefined) return nested;
  }

  return undefined;
}

async function ensureSuggestionHistoryFile() {
  await fs.mkdir(path.dirname(suggestionHistoryPath), { recursive: true });
  try {
    await fs.access(suggestionHistoryPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(suggestionHistoryPath, "{}", "utf8");
    } else {
      throw err;
    }
  }
}

async function loadSuggestionHistory() {
  await ensureSuggestionHistoryFile();
  try {
    const raw = await fs.readFile(suggestionHistoryPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.warn(`Unable to read suggestion history: ${err.message}`);
  }
  return new Map();
}

async function saveSuggestionHistory() {
  await ensureSuggestionHistoryFile();
  const payload = Object.fromEntries(suggestionHistory.entries());
  await fs.writeFile(suggestionHistoryPath, JSON.stringify(payload, null, 2), "utf8");
}

async function seerrFetch(path, options = {}) {
  if (!seerrCookie) {
    await loginToSeerr();
  }

  const url = `${env.SEERR_URL.replace(/\/$/, "")}${path}`;
  const headers = {
    Cookie: seerrCookie,
    ...(options.headers || {})
  };

  let res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    await loginToSeerr();
    res = await fetch(url, { ...options, headers: { ...headers, Cookie: seerrCookie } });
  }

  return res;
}

async function getSeerrMediaDetails(type, tmdbId) {
  const key = `${type}:${tmdbId}`;
  if (seerrCache.has(key)) return seerrCache.get(key);

  try {
    const res = await seerrFetch(`/api/v1/${type}/${tmdbId}`);
    if (!res.ok) {
      console.warn(`Seerr lookup failed for ${type}:${tmdbId}: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const details = json?.data || json?.movie || json?.tv || json;
    seerrCache.set(key, details);
    return details;
  } catch (err) {
    console.warn(`Seerr lookup error for ${type}:${tmdbId}: ${err.message}`);
    return null;
  }
}

function isTruthyString(value, pattern) {
  return typeof value === "string" && pattern.test(value);
}

async function isSeerrUnavailable(type, tmdbId) {
  const details = await getSeerrMediaDetails(type, tmdbId);
  if (!details) return false;

  const available = findDeepValue(details, [
    "available",
    "partiallyavailable",
    "partially_available",
    "inlibrary",
    "isavailable",
    "exists"
  ]);
  if (available === true || isTruthyString(available, /available|yes|owned|exists|downloaded|in library/i)) {
    return true;
  }

  const requested = findDeepValue(details, [
    "requested",
    "alreadyrequested",
    "isrequested",
    "hasrequest"
  ]);
  if (requested === true || isTruthyString(requested, /requested|pending|queued|processing|downloading/i)) {
    return true;
  }

  const requestable = findDeepValue(details, ["requestable"]);
  if (requestable === false || requestable === "false") {
    return true;
  }

  const status = findDeepValue(details, ["status", "requeststatus", "mediastatus"]);
  if (typeof status === "string" && /(available|requested|partially|pending|processing|downloading|queued|owned|exists)/i.test(status)) {
    return true;
  }

  return false;
}

async function selectRecommendations(items, count, usedRecommendations, history, { random = false, ...filters } = {}) {
  const selected = [];
  const candidates = (items || []).filter((item) => !!item && item.id);
  if (random) candidates.sort(() => Math.random() - 0.5);

  for (const item of candidates) {
    if (selected.length >= count) break;

    const key = itemKey(item);
    if (usedRecommendations.has(key) || history.has(key)) continue;
    if (!isReleased(item)) continue;
    if (!passesQualityFilters(item, filters)) continue;
    if (await isSeerrUnavailable(mediaTypeOf(item), item.id)) continue;

    usedRecommendations.add(key);
    selected.push(item);
  }

  return selected;
}

async function getGenres(type, ids = []) {
  const data = await tmdb(`/genre/${type}/list?language=en`);
  const map = new Map((data.genres || []).map((g) => [g.id, g.name]));
  return ids.map((id) => map.get(id)).filter(Boolean).slice(0, 3).join(" • ");
}

async function buildRecommendationEmbed(heading, item) {
  if (!item) return null;

  const type = mediaTypeOf(item);
  const title = titleOf(item);
  const year = yearOf(item);
  const genres = await getGenres(type, item.genre_ids || []);

  const embed = new EmbedBuilder()
    .setTitle(`${heading}: ${title}${year ? ` (${year})` : ""}`)
    .setDescription(trim(item.overview))
    .addFields(
      { name: "Type", value: type === "movie" ? "Movie" : "TV Show", inline: true },
      { name: "Rating", value: item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}/10` : "N/A", inline: true },
      { name: "Genres", value: genres || "N/A", inline: false }
    );

  if (item.poster_path) {
    embed.setThumbnail(`https://image.tmdb.org/t/p/w500${item.poster_path}`);
  }

  return embed;
}

async function sendCategoryMessage(channelId, heading, items) {
  if (!channelId || !items.length) return;

  const channel = await client.channels.fetch(channelId);
  const embeds = [];
  const rows = [];

  for (const item of items) {
    const embed = await buildRecommendationEmbed(heading, item);
    if (embed) embeds.push(embed);
  }

  for (let index = 0; index < items.length; index += 5) {
    const slice = items.slice(index, index + 5);
    const row = new ActionRowBuilder().addComponents(
      ...slice.map((item) => {
        const type = mediaTypeOf(item);
        return new ButtonBuilder()
          .setCustomId(`request:${type}:${item.id}`)
          .setLabel("Request")
          .setStyle(ButtonStyle.Primary);
      })
    );
    rows.push(row);
  }

  await channel.send({ embeds, components: rows });
}

async function getProviderId(providerName, mediaType = "movie") {
  const data = await tmdb(`/watch/providers/${mediaType}?watch_region=${WATCH_REGION}`);
  const found = (data.results || []).find((provider) =>
    provider.provider_name.toLowerCase() === providerName.toLowerCase()
  );
  return found ? found.provider_id : null;
}

function todaysStreamingService() {
  if (!STREAMING_SERVICES.length) return null;
  const dayOffset = Math.floor(Date.now() / 86_400_000);
  return STREAMING_SERVICES[dayOffset % STREAMING_SERVICES.length];
}

async function postCategory(channelId, heading, categoryKey, items, usedRecommendations, history, today) {
  if (!items.length) return;

  try {
    await sendCategoryMessage(channelId, heading, items);
    for (const item of items) {
      const key = suggestionKey(item);
      usedRecommendations.add(key);
      history.set(key, {
        title: titleOf(item),
        type: mediaTypeOf(item),
        tmdbId: Number(item.id),
        category: categoryKey,
        suggestedAt: today
      });
    }
    await saveSuggestionHistory();
  } catch (err) {
    console.error(`Failed to post ${heading}: ${err.message}`);
  }
}

async function postAll() {
  console.log("Posting daily discovery...");

  suggestionHistory = await loadSuggestionHistory();
  const today = new Date().toISOString().split("T")[0];
  const usedThisRun = new Set();
  const multiItemCount = 3;

  const moviePopular = await tmdb("/movie/popular?language=en-AU&page=1");
  const tvPopular = await tmdb("/tv/popular?language=en-AU&page=1");
  const trending = await tmdb("/trending/all/day?language=en-AU");
  const newReleases = await tmdb(
    `/discover/movie?language=en-AU&region=${WATCH_REGION}&sort_by=primary_release_date.desc&primary_release_date.lte=${today}&include_adult=false`
  );

  const movieOfDay = (await selectRecommendations(moviePopular.results || [], 1, usedThisRun, suggestionHistory, { random: true, minRating: 6.7, minVotes: 200, requireEnglish: true }))[0];
  const tvOfDay = (await selectRecommendations(tvPopular.results || [], 1, usedThisRun, suggestionHistory, { random: true, minRating: 6.8, minVotes: 150, requireEnglish: true }))[0];

  if (movieOfDay) {
    await postCategory(env.MOVIE_OF_DAY_CHANNEL_ID, "🎬 Movie of the Day", "movie-of-the-day", [movieOfDay], usedThisRun, suggestionHistory, today);
  }

  if (tvOfDay) {
    await postCategory(env.TV_OF_DAY_CHANNEL_ID, "📺 TV Show of the Day", "tv-show-of-the-day", [tvOfDay], usedThisRun, suggestionHistory, today);
  }

  const trendingItems = (trending.results || []).filter((item) => item.media_type === "movie" || item.media_type === "tv");
  const trendingSelection = await selectRecommendations(trendingItems, multiItemCount, usedThisRun, suggestionHistory, { minRating: 6.0, minVotes: 80, requireEnglish: true });
  if (trendingSelection.length) {
    await postCategory(env.TRENDING_CHANNEL_ID, "🔥 Trending", "trending", trendingSelection, usedThisRun, suggestionHistory, today);
  }

  const newReleaseSelection = await selectRecommendations(
    (newReleases.results || []).map((item) => ({ ...item, media_type: "movie" })),
    multiItemCount,
    usedThisRun,
    suggestionHistory,
    { minRating: 6.2, minVotes: 100, requireEnglish: true }
  );
  if (newReleaseSelection.length) {
    await postCategory(env.NEW_RELEASES_CHANNEL_ID, "🆕 New Release", "new-releases", newReleaseSelection, usedThisRun, suggestionHistory, today);
  }

  const service = todaysStreamingService();
  if (service) {
    const providerId = await getProviderId(service, "movie");
    if (providerId) {
      const streaming = await tmdb(
        `/discover/movie?language=en-AU&watch_region=${WATCH_REGION}&with_watch_providers=${providerId}&sort_by=popularity.desc&include_adult=false`
      );

      const streamingSelection = await selectRecommendations(
        (streaming.results || []).map((item) => ({ ...item, media_type: "movie" })),
        multiItemCount,
        usedThisRun,
        suggestionHistory,
        { minRating: 6.2, minVotes: 100, requireEnglish: true }
      );
      if (streamingSelection.length) {
        await postCategory(env.STREAMING_CHANNEL_ID, `📡 New/Popular on ${service}`, `streaming-${service.toLowerCase()}`, streamingSelection, usedThisRun, suggestionHistory, today);
      }
    } else {
      console.warn(`Streaming provider not found: ${service}`);
    }
  } else {
    console.warn("No streaming providers configured.");
  }

  const cutoffYear = new Date().getFullYear() - 2;
  const cutoffDate = `${cutoffYear}-12-31`;
  const hiddenGemMovies = await tmdb(
    `/discover/movie?language=en-AU&sort_by=vote_average.desc&vote_count.gte=300&vote_count.lte=10000&primary_release_date.lte=${cutoffDate}&include_adult=false`
  );
  const hiddenGemSelection = await selectRecommendations(
    (hiddenGemMovies.results || []).map((item) => ({ ...item, media_type: "movie" })),
    1,
    usedThisRun,
    suggestionHistory,
    { minRating: 7.0, minVotes: 300, maxPopularity: 80, maxReleaseYear: cutoffYear, requireEnglish: true }
  );
  if (hiddenGemSelection.length) {
    await postCategory(env.HIDDEN_GEMS_CHANNEL_ID, "💎 Hidden Gem", "hidden-gems", hiddenGemSelection, usedThisRun, suggestionHistory, today);
  }

  console.log("Daily discovery posted.");
}

function getSeerrBaseUrl() {
  const raw = (env.SEERR_URL || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

async function loginToSeerr() {
  const baseUrl = getSeerrBaseUrl();
  if (!baseUrl) {
    throw new Error("SEERR_URL is not configured.");
  }

  const res = await fetch(`${baseUrl}/api/v1/auth/local`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: env.SEERR_USERNAME,
      password: env.SEERR_PASSWORD
    })
  });

  if (!res.ok) {
    throw new Error(`Seerr login failed: ${await res.text()}`);
  }

  const cookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")];

  if (!cookies || !cookies[0]) {
    throw new Error("No session cookie returned from Seerr.");
  }

  seerrCookie = cookies[0].split(";")[0];
  console.log("Logged into Seerr.");
}

async function requestInSeerr(mediaType, tmdbId) {
  const body = {
    mediaType,
    mediaId: Number(tmdbId),
    is4k: false
  };

  if (mediaType === "tv") {
    body.seasons = "all";
  }

  const res = await seerrFetch("/api/v1/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  console.log("Seerr response:", res.status, text);

  if (!res.ok) {
    throw new Error(text || `Seerr request failed with status ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return text;
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("request:")) return;

  const [, mediaType, tmdbId] = interaction.customId.split(":");
  if (!mediaType || !tmdbId) return;

  try {
    await interaction.deferReply({ ephemeral: true });
    await requestInSeerr(mediaType, tmdbId);
    await interaction.editReply(
      "✅ Request submitted successfully! It is now waiting for approval in Seerr."
    );
  } catch (err) {
    console.error("Request button failed:", err);

    try {
      const message = `❌ ${err.message || "Unable to submit request."}`;
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({
          content: message,
          ephemeral: true
        });
      }
    } catch (e) {
      console.error("Failed to send button error response:", e);
    }
  }
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  cron.schedule(
    "0 9 * * *",
    async () => {
      try {
        await postAll();
      } catch (err) {
        console.error(err);
      }
    },
    {
      timezone: "Australia/Melbourne"
    }
  );

  if (env.POST_ON_START === "true") {
    try {
      await postAll();
    } catch (err) {
      console.error(err);
    }
  }
});

client.login(env.DISCORD_TOKEN);
