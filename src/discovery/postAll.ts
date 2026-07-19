import type { Client, TextChannel } from "discord.js";
import { itemKey, mediaTypeOf, titleOf } from "../lib/media";
import { sendCategoryMessage } from "../discord/embeds";
import type { SeerrClient } from "../seerr/client";
import type { TmdbClient } from "../tmdb/client";
import {
  fetchHiddenGemCandidates,
  fetchMovieOfDayCandidates,
  fetchNewReleaseCandidates,
  fetchStreamingCandidates,
  fetchTrendingCandidates,
  fetchTvOfDayCandidates,
  pickStreamingService
} from "../tmdb/sources";
import type { AppConfig, TmdbItem } from "../types";
import type { SuggestionHistory } from "./history";
import { selectRecommendations } from "./select";

async function postCategory(
  client: Client,
  tmdb: TmdbClient,
  channelId: string,
  heading: string,
  categoryKey: string,
  items: TmdbItem[],
  usedRecommendations: Set<string>,
  history: SuggestionHistory,
  today: string
): Promise<void> {
  if (!channelId || !items.length) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      console.warn(`Channel ${channelId} is not a guild text channel.`);
      return;
    }

    await sendCategoryMessage(channel as TextChannel, tmdb, heading, items);

    for (const item of items) {
      const key = itemKey(item);
      usedRecommendations.add(key);
      history.set(key, {
        title: titleOf(item),
        type: mediaTypeOf(item),
        tmdbId: Number(item.id),
        category: categoryKey,
        suggestedAt: today
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
  console.log("Posting daily discovery...");

  await history.load();
  seerr.clearCache();

  const today = new Date().toISOString().split("T")[0];
  const usedThisRun = new Set<string>();
  const multiItemCount = 3;
  const baseFilters = {
    minRating: config.minRating,
    minVotes: config.minVotes,
    requireEnglish: true as const
  };

  const movieCandidates = await fetchMovieOfDayCandidates(tmdb, config);
  const movieOfDay = (
    await selectRecommendations(movieCandidates, 1, usedThisRun, history, seerr, {
      ...baseFilters,
      minRating: Math.max(config.minRating, 6.5),
      minVotes: Math.max(config.minVotes, 120)
    })
  )[0];

  if (movieOfDay) {
    await postCategory(
      client,
      tmdb,
      config.movieOfDayChannelId,
      "Movie of the Day",
      "movie-of-the-day",
      [movieOfDay],
      usedThisRun,
      history,
      today
    );
  }

  const tvCandidates = await fetchTvOfDayCandidates(tmdb, config);
  const tvOfDay = (
    await selectRecommendations(tvCandidates, 1, usedThisRun, history, seerr, {
      ...baseFilters,
      minRating: Math.max(config.minRating, 6.6),
      minVotes: Math.max(config.minVotes, 100)
    })
  )[0];

  if (tvOfDay) {
    await postCategory(
      client,
      tmdb,
      config.tvOfDayChannelId,
      "TV Show of the Day",
      "tv-show-of-the-day",
      [tvOfDay],
      usedThisRun,
      history,
      today
    );
  }

  const trendingCandidates = await fetchTrendingCandidates(tmdb, config);
  const trendingSelection = await selectRecommendations(
    trendingCandidates,
    multiItemCount,
    usedThisRun,
    history,
    seerr,
    baseFilters
  );
  if (trendingSelection.length) {
    await postCategory(
      client,
      tmdb,
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
    multiItemCount,
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
      config.newReleasesChannelId,
      "New Release",
      "new-releases",
      newReleaseSelection,
      usedThisRun,
      history,
      today
    );
  }

  const streamingService = await pickStreamingService(tmdb, config, "movie");
  if (streamingService) {
    const { service, providerId } = streamingService;
    const streamingCandidates = await fetchStreamingCandidates(tmdb, config, providerId);
    const streamingSelection = await selectRecommendations(
      streamingCandidates,
      multiItemCount,
      usedThisRun,
      history,
      seerr,
      baseFilters
    );
    if (streamingSelection.length) {
      await postCategory(
        client,
        tmdb,
        config.streamingChannelId,
        `New or popular on ${service}`,
        `streaming-${service.toLowerCase()}`,
        streamingSelection,
        usedThisRun,
        history,
        today
      );
    }
  } else {
    console.warn("No streaming providers configured or available.");
  }

  const cutoffYear = new Date().getFullYear() - 2;
  const hiddenCandidates = await fetchHiddenGemCandidates(tmdb, config);
  const hiddenGemSelection = await selectRecommendations(
    hiddenCandidates,
    1,
    usedThisRun,
    history,
    seerr,
    {
      minRating: 7.0,
      minVotes: 300,
      maxPopularity: 60,
      maxReleaseYear: cutoffYear,
      requireEnglish: true
    }
  );
  if (hiddenGemSelection.length) {
    await postCategory(
      client,
      tmdb,
      config.hiddenGemsChannelId,
      "Hidden Gem",
      "hidden-gems",
      hiddenGemSelection,
      usedThisRun,
      history,
      today
    );
  }

  console.log("Daily discovery posted.");
}
