import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextChannel
} from "discord.js";
import { mediaTypeOf, titleOf, trimText, yearOf } from "../lib/media";
import type { TmdbClient } from "../tmdb/client";
import type { TmdbItem } from "../types";

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

  const embed = new EmbedBuilder()
    .setTitle(`${heading}: ${title}${year ? ` (${year})` : ""}`)
    .setDescription(trimText(resolved.overview))
    .addFields(
      { name: "Type", value: type === "movie" ? "Movie" : "TV Show", inline: true },
      {
        name: "Rating",
        value: resolved.vote_average ? `${resolved.vote_average.toFixed(1)}/10` : "N/A",
        inline: true
      },
      { name: "Genres", value: genres || "N/A", inline: false }
    );

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

  const embeds = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const itemHeading = itemHeadings?.[index] ?? heading;
    const embed = await buildRecommendationEmbed(tmdb, itemHeading, item);
    if (embed) embeds.push(embed);
  }

  const rows = [];
  for (let index = 0; index < items.length; index += 5) {
    const slice = items.slice(index, index + 5);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
