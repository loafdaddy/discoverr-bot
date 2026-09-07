const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Safe ephemeral reply for Request failures.
 * Never forwards raw Seerr JSON (size + internals).
 */
export function userFacingRequestError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const compact = raw.replace(/\s+/g, " ").trim();

  if (/already.?requested|duplicate|exists/i.test(compact)) {
    return "This title has already been requested in Seerr.";
  }
  if (/no seasons|seasons were available/i.test(compact)) {
    return "Seerr could not request this title (no seasons available).";
  }
  if (/quota/i.test(compact)) {
    return "Seerr request quota is full. Try again later.";
  }
  if (/permission|forbidden|not allowed/i.test(compact)) {
    return "Seerr denied this request (permissions).";
  }
  if (/401|403|login|unauthorized|unauthorised/i.test(compact)) {
    return "Discoverr could not authenticate with Seerr. Check logs.";
  }
  if (/ENOTFOUND|ECONNREFUSED|unreachable|fetch failed|network/i.test(compact)) {
    return "Seerr is unreachable from Discoverr right now. Check logs.";
  }

  return "Unable to submit request. Check Discoverr logs for details.".slice(
    0,
    DISCORD_MESSAGE_LIMIT
  );
}
