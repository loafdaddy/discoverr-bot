function normalizeWatchRegion(value, fallback = "AU") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const normalized = trimmed.toUpperCase().replace(/[^A-Z]/g, "");

  const aliases = {
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

  if (aliases[normalized]) return aliases[normalized];
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;

  return normalized || fallback;
}

function getWatchRegion(env = process.env, fallback = "AU") {
  return normalizeWatchRegion(env && env.WATCH_REGION, fallback);
}

module.exports = {
  normalizeWatchRegion,
  getWatchRegion
};
