import type { MediaType, TmdbItem } from "../types";

export function mediaTypeOf(item: TmdbItem): MediaType {
  if (item.media_type === "movie" || item.media_type === "tv") {
    return item.media_type;
  }
  return item.title ? "movie" : "tv";
}

export function titleOf(item: TmdbItem): string {
  return item.title || item.name || "Unknown title";
}

export function itemKey(item: TmdbItem): string {
  return `${mediaTypeOf(item)}:${item.id}`;
}

export function yearOf(item: TmdbItem): string {
  const date = item.release_date || item.first_air_date || "";
  return date ? date.slice(0, 4) : "";
}

export function isReleased(
  item: TmdbItem,
  today = new Date().toISOString().split("T")[0]
): boolean {
  const date = item.release_date || item.first_air_date;
  return !!date && date <= today;
}

export function trimText(text: string | undefined, max = 350): string {
  if (!text) return "No description available.";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export function withMediaType(item: TmdbItem, type: MediaType): TmdbItem {
  return { ...item, media_type: type };
}
