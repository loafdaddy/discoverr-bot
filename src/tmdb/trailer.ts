export interface TmdbVideo {
  key?: string;
  site?: string;
  type?: string;
  official?: boolean;
  iso_639_1?: string;
}

export function youtubeTrailerUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`;
}

function languageTags(code: string): string[] {
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) return [];
  const primary = trimmed.split(/[-_]/)[0];
  return primary && primary !== trimmed ? [trimmed, primary] : [trimmed];
}

function videoLang(video: TmdbVideo): string {
  return (video.iso_639_1 || "").trim().toLowerCase();
}

function matchesLanguage(video: TmdbVideo, tags: readonly string[]): boolean {
  const lang = videoLang(video);
  if (!lang) return false;
  return tags.some((tag) => lang === tag || tag.startsWith(`${lang}-`) || tag.startsWith(`${lang}_`));
}

/**
 * Prefer an official YouTube Trailer in the requested languages,
 * then any official YouTube Trailer, then any YouTube Trailer.
 */
export function pickTrailerUrl(
  videos: readonly TmdbVideo[],
  preferredLanguages: readonly string[] = []
): string | null {
  const youtubeTrailers = videos.filter(
    (video) =>
      video.site === "YouTube" &&
      video.type === "Trailer" &&
      typeof video.key === "string" &&
      video.key.trim().length > 0
  );
  if (!youtubeTrailers.length) return null;

  const preferredTags = preferredLanguages.flatMap(languageTags);
  const official = youtubeTrailers.filter((video) => video.official);

  for (const tag of preferredTags) {
    const match = official.find((video) => matchesLanguage(video, [tag]));
    if (match?.key) return youtubeTrailerUrl(match.key);
  }

  if (official[0]?.key) return youtubeTrailerUrl(official[0].key);

  return youtubeTrailerUrl(youtubeTrailers[0].key as string);
}
