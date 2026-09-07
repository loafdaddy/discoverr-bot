/** Discord embed titles max out at 256 characters. */
export const DISCORD_EMBED_TITLE_MAX = 256;

export function clipEmbedTitle(heading: string, title: string, year: string): string {
  const suffix = year ? ` (${year})` : "";
  const full = `${heading}: ${title}${suffix}`;
  if (full.length <= DISCORD_EMBED_TITLE_MAX) return full;

  const ellipsis = "...";
  const budget =
    DISCORD_EMBED_TITLE_MAX - `${heading}: `.length - ellipsis.length - suffix.length;
  if (budget <= 0) {
    return full.slice(0, DISCORD_EMBED_TITLE_MAX);
  }
  return `${heading}: ${title.slice(0, budget)}${ellipsis}${suffix}`;
}
