import type { Client, TextChannel } from "discord.js";
import { sendCategoryMessage } from "../discord/embeds";
import { isConfiguredChannel } from "../lib/channels";
import { localDateIso } from "../lib/localDate";
import { itemKey, mediaTypeOf, titleOf } from "../lib/media";
import type { SeerrClient } from "../seerr/client";
import type { TmdbClient } from "../tmdb/client";
import {
  fetchHiddenGemCandidates,
  fetchMovieOfDayCandidates,
  fetchNewReleaseCandidates,
  fetchTrendingCandidates,
  fetchTvOfDayCandidates
} from "../tmdb/sources";
import type { AppConfig, TmdbItem } from "../types";
import type { SuggestionHistory } from "./history";
import { selectRecommendations } from "./select";
import { StreamingCatalog } from "./streamingCatalog";
import { selectStreamingPicks } from "./streamingSelect";

let discoveryInFlight: Promise<void> | null = null;

async function postCategory(
  client: Client,
  tmdb: TmdbClient,
  config: AppConfig,
  channelId: string,
  heading: string,
  categoryKey: string,
  items: TmdbItem[],
  usedRecommendations: Set<string>,
  history: SuggestionHistory,
  today: string,
  options?: {
    itemHeadings?: string[];
    itemCategoryKeys?: string[];
  }
): Promise<void> {
  if (!channelId || !items.length) return;

  if (config.dryRun) {
    const titles = items.map((item) => titleOf(item)).join(", ");
    console.log(`[dry-run] Would post to ${categoryKey}: ${heading} — ${titles}`);
    for (const item of items) {
      usedRecommendations.add(itemKey(item));
    }
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      console.warn(`Channel ${channelId} is not a guild text channel.`);
      return;
    }

    await sendCategoryMessage(
      channel as TextChannel,
      tmdb,
      heading,
      items,
      options?.itemHeadings
    );

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const key = itemKey(item);
      usedRecommendations.add(key);
      const existing = history.get(key);
      history.set(key, {
        title: titleOf(item),
        type: mediaTypeOf(item),
        tmdbId: Number(item.id),
        category: options?.itemCategoryKeys?.[index] ?? categoryKey,
        suggestedAt: today,
        requestedAt: existing?.requestedAt
      });
    }
    await history.save();
  } catch (err) {
    console.error(`Failed to post ${heading}: ${(err as Error).message}`);
  }
}

export async function postAll(
  client: Client,
  config: AppConfig,
  tmdb: TmdbClient,
  seerr: SeerrClient,
  history: SuggestionHistory
): Promise<void> {
  if (discoveryInFlight) {
    console.warn("Skipping discovery; a run is already in progress.");
    return;
  }

  const run = runDiscovery(client, config, tmdb, seerr, history);
  discoveryInFlight = run.finally(() => {
    discoveryInFlight = null;
  });
  await run;
}

async function runDiscovery(
  client: Client,
  config: AppConfig,
  tmdb: TmdbClient,
  seerr: SeerrClient,
  history: SuggestionHistory
): Promise<void> {
  console.log(config.dryRun ? "Dry-run discovery (no Discord posts)..." : "Posting daily discovery...");

  await history.load();
  seerr.clearCache();

  const today = localDateIso(config.timezone);
  const usedThisRun = new Set<string>();
  const counts = config.categoryPostCounts;
  const baseFilters = {
    minRating: config.minRating,
    minVotes: config.minVotes,
    requireEnglish: config.requireEnglish,
    today
  };

  const empty: TmdbItem[] = [];

  // Fetch only enabled categories; selection stays sequential for usedThisRun.
  const [
    movieCandidates,
    tvCandidates,
    trendingCandidates,
    newReleaseCandidates,
    hiddenCandidates
  ] = await Promise.all([
    isConfiguredChannel(config.movieOfDayChannelId)
      ? fetchMovieOfDayCandidates(tmdb, config)
      : Promise.resolve(empty),
    isConfiguredChannel(config.tvOfDayChannelId)
      ? fetchTvOfDayCandidates(tmdb, config)
      : Promise.resolve(empty),
    isConfiguredChannel(config.trendingChannelId)
      ? fetchTrendingCandidates(tmdb, config)
      : Promise.resolve(empty),
    isConfiguredChannel(config.newReleasesChannelId)
      ? fetchNewReleaseCandidates(tmdb, config)
      : Promise.resolve(empty),
    isConfiguredChannel(config.hiddenGemsChannelId)
      ? fetchHiddenGemCandidates(tmdb, config)
      : Promise.resolve(empty)
  ]);

  if (isConfiguredChannel(config.movieOfDayChannelId)) {
    const movieOfDaySelection = await selectRecommendations(
      movieCandidates,
      counts.movieOfTheDay,
      usedThisRun,
      history,
      seerr,
      {
        ...baseFilters,
        minRating: Math.max(config.minRating, 6.5),
        minVotes: Math.max(config.minVotes, 120)
      }
    );

    if (movieOfDaySelection.length) {
      await postCategory(
        client,
        tmdb,
        config,
        config.movieOfDayChannelId,
        "Movie of the Day",
        "movie-of-the-day",
        movieOfDaySelection,
        usedThisRun,
        history,
        today
      );
    }
  }

  if (isConfiguredChannel(config.tvOfDayChannelId)) {
    const tvOfDaySelection = await selectRecommendations(
      tvCandidates,
      counts.tvOfTheDay,
      usedThisRun,
      history,
      seerr,
      {
        ...baseFilters,
        minRating: Math.max(config.minRating, 6.6),
        minVotes: Math.max(config.minVotes, 100)
      }
    );

    if (tvOfDaySelection.length) {
      await postCategory(
        client,
        tmdb,
        config,
        config.tvOfDayChannelId,
        "TV Show of the Day",
        "tv-show-of-the-day",
        tvOfDaySelection,
        usedThisRun,
        history,
        today
      );
    }
  }

  if (isConfiguredChannel(config.trendingChannelId)) {
    const trendingSelection = await selectRecommendations(
      trendingCandidates,
      counts.trending,
      usedThisRun,
      history,
      seerr,
      baseFilters
    );
    if (trendingSelection.length) {
      await postCategory(
        client,
        tmdb,
        config,
        config.trendingChannelId,
        "Trending",
        "trending",
        trendingSelection,
        usedThisRun,
        history,
        today
      );
    }
  }

  if (isConfiguredChannel(config.newReleasesChannelId)) {
    const newReleaseSelection = await selectRecommendations(
      newReleaseCandidates,
      counts.newReleases,
      usedThisRun,
      history,
      seerr,
      {
        ...baseFilters,
        minVotes: Math.max(20, Math.floor(config.minVotes * 0.5))
      }
    );
    if (newReleaseSelection.length) {
      await postCategory(
        client,
        tmdb,
        config,
        config.newReleasesChannelId,
        "New Release",
        "new-releases",
        newReleaseSelection,
        usedThisRun,
        history,
        today
      );
    }
  }

  if (isConfiguredChannel(config.streamingChannelId)) {
    const streamingCatalog = new StreamingCatalog(StreamingCatalog.defaultPath());
    await streamingCatalog.load();
    const { picks: streamingPicks, resolvedCount: streamingResolved } =
      await selectStreamingPicks(
        tmdb,
        config,
        seerr,
        history,
        usedThisRun,
        streamingCatalog,
        today,
        baseFilters,
        counts.streaming
      );
    await streamingCatalog.save();

    if (streamingPicks.length) {
      const streamingItems = streamingPicks.map((pick) => pick.item);
      const itemHeadings = streamingPicks.map(
        (pick) => `New or popular on ${pick.service}`
      );
      const itemCategoryKeys = streamingPicks.map(
        (pick) => `streaming-${pick.service.toLowerCase()}`
      );
      await postCategory(
        client,
        tmdb,
        config,
        config.streamingChannelId,
        itemHeadings[0],
        itemCategoryKeys[0],
        streamingItems,
        usedThisRun,
        history,
        today,
        { itemHeadings, itemCategoryKeys }
      );
    } else if (streamingResolved === 0) {
      console.warn("No streaming providers configured or available.");
    }
  }

  if (isConfiguredChannel(config.hiddenGemsChannelId)) {
    const cutoffYear = new Date().getFullYear() - 2;
    const hiddenGemSelection = await selectRecommendations(
      hiddenCandidates,
      counts.hiddenGems,
      usedThisRun,
      history,
      seerr,
      {
        minRating: 7.0,
        minVotes: 300,
        maxPopularity: 60,
        maxReleaseYear: cutoffYear,
        requireEnglish: config.requireEnglish,
        today
      }
    );
    if (hiddenGemSelection.length) {
      await postCategory(
        client,
        tmdb,
        config,
        config.hiddenGemsChannelId,
        "Hidden Gem",
        "hidden-gems",
        hiddenGemSelection,
        usedThisRun,
        history,
        today
      );
    }
  }

  console.log(config.dryRun ? "Dry-run discovery finished." : "Daily discovery posted.");
}
