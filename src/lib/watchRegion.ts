const ALIASES: Record<string, string> = {
  USA: "US",
  UNITEDSTATES: "US",
  UNITEDSTATESOFAMERICA: "US",
  UK: "GB",
  UNITEDKINGDOM: "GB",
  AUSTRALIA: "AU",
  CANADA: "CA",
  NEWZEALAND: "NZ",
  GERMANY: "DE",
  FRANCE: "FR",
  JAPAN: "JP",
  SOUTHKOREA: "KR",
  MEXICO: "MX",
  BRAZIL: "BR",
  INDIA: "IN",
  CHINA: "CN",
  SPAIN: "ES",
  ITALY: "IT"
};

export function normalizeWatchRegion(value: unknown, fallback = "AU"): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const normalized = trimmed.toUpperCase().replace(/[^A-Z]/g, "");

  if (ALIASES[normalized]) return ALIASES[normalized];
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;

  return normalized || fallback;
}

export function getWatchRegion(
  env: NodeJS.ProcessEnv = process.env,
  fallback = "AU"
): string {
  return normalizeWatchRegion(env.WATCH_REGION, fallback);
}
