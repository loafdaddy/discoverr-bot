import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextChannel
} from "discord.js";
import { uniqueByItemKey, mediaTypeOf, titleOf, trimText, yearOf } from "../lib/media";
import type { TmdbClient } from "../tmdb/client";
import type { TmdbItem } from "../types";
import { clipEmbedTitle } from "./embedTitle";

/** Discord button labels max out at 80 characters. */
export function requestButtonLabel(item: TmdbItem): string {
  const title = titleOf(item);
  const prefix = "Request: ";
  const max = 80;
  const full = `${prefix}${title}`;
  if (full.length <= max) return full;
  return `${full.slice(0, max - 1)}…`;
}

/** Discord markdown hyperlink shown as an embed field. */
export function trailerField(url: string): { name: string; value: string; inline: true } {
  return { name: "Trailer", value: `[Watch on YouTube](${url})`, inline: true };
}

export async function buildRecommendationEmbed(
  tmdb: TmdbClient,
  heading: string,
  item: TmdbItem
): Promise<EmbedBuilder | null> {
  if (!item) return null;

  const resolved = await tmdb.withOverviewFallback(item);
  const type = mediaTypeOf(resolved);
  const title = titleOf(resolved);
  const year = yearOf(resolved);
  const genres = await tmdb.getGenres(type, resolved.genre_ids || []);
  const trailerUrl = await tmdb.getTrailerUrl(resolved);

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: "Type", value: type === "movie" ? "Movie" : "TV Show", inline: true },
    {
      name: "Rating",
      value: resolved.vote_average ? `${resolved.vote_average.toFixed(1)}/10` : "N/A",
      inline: true
    }
  ];
  if (trailerUrl) {
    fields.push(trailerField(trailerUrl));
  }
  fields.push({ name: "Genres", value: genres || "N/A", inline: false });

  const embed = new EmbedBuilder()
    .setTitle(clipEmbedTitle(heading, title, year))
    .setDescription(trimText(resolved.overview))
    .addFields(fields);

  if (resolved.poster_path) {
    embed.setThumbnail(`https://image.tmdb.org/t/p/w500${resolved.poster_path}`);
  }

  return embed;
}

export async function sendCategoryMessage(
  channel: TextChannel,
  tmdb: TmdbClient,
  heading: string,
  items: TmdbItem[],
  /** Optional per-item headings (e.g. mixed streaming providers). Falls back to `heading`. */
  itemHeadings?: string[]
): Promise<void> {
  if (!items.length) return;

  const uniqueItems = uniqueByItemKey(items);
  if (!uniqueItems.length) return;

  const embeds = [];
  const posted: TmdbItem[] = [];
  for (let index = 0; index < uniqueItems.length; index += 1) {
    const item = uniqueItems[index];
    const itemHeading = itemHeadings?.[index] ?? heading;
    const embed = await buildRecommendationEmbed(tmdb, itemHeading, item);
    if (!embed) continue;
    embeds.push(embed);
    posted.push(item);
  }

  if (!embeds.length) return;

  const rows = [];
  for (let index = 0; index < posted.length; index += 5) {
    const slice = posted.slice(index, index + 5);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...slice.map((item) => {
        const type = mediaTypeOf(item);
        return new ButtonBuilder()
          .setCustomId(`request:${type}:${item.id}`)
          .setLabel(requestButtonLabel(item))
          .setStyle(ButtonStyle.Primary);
      })
    );
    rows.push(row);
  }

  await channel.send({ embeds, components: rows });
}
