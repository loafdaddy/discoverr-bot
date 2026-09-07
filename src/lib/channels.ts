/** True when a Discord channel ID is set (blank disables that category). */
export function isConfiguredChannel(channelId: string | undefined | null): boolean {
  return Boolean(channelId?.trim());
}
