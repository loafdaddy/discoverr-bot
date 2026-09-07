/** Calendar date `YYYY-MM-DD` in an IANA timezone (not UTC). */
export function localDateIso(timeZone: string, date = new Date()): string {
  const tz = timeZone.trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/** Subtract calendar days from a `YYYY-MM-DD` stamp. */
export function subtractDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  utc.setUTCDate(utc.getUTCDate() - days);
  return utc.toISOString().split("T")[0];
}
