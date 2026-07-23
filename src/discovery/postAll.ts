import type { Client, TextChannel } from "discord.js";
import { itemKey, mediaTypeOf, titleOf } from "../lib/media";
import { sendCategoryMessage } from "../discord/embeds";
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
  console.log(config.dryRun ? "Dry-run discovery (no Discord posts)..." : "Posting daily discovery...");

  await history.load();
  seerr.clearCache();

  const today = new Date().toISOString().split("T")[0];
  const usedThisRun = new Set<string>();
  const counts = config.categoryPostCounts;
  const baseFilters = {
    minRating: config.minRating,
    minVotes: config.minVotes,
    requireEnglish: config.requireEnglish
  };

  const movieCandidates = await fetchMovieOfDayCandidates(tmdb, config);
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

  const tvCandidates = await fetchTvOfDayCandidates(tmdb, config);
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

  const trendingCandidates = await fetchTrendingCandidates(tmdb, config);
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

  const newReleaseCandidates = await fetchNewReleaseCandidates(tmdb, config);
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

  const cutoffYear = new Date().getFullYear() - 2;
  const hiddenCandidates = await fetchHiddenGemCandidates(tmdb, config);
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
      requireEnglish: config.requireEnglish
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

  console.log(config.dryRun ? "Dry-run discovery finished." : "Daily discovery posted.");
}
