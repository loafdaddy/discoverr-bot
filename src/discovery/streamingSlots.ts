import { shuffleArray } from "../lib/shuffle";
import type { ResolvedStreamingService } from "../tmdb/sources";

/**
 * Allocate `slotCount` provider slots, preferring distinct services.
 * Reuses services only after uniqueness is exhausted (or fewer providers than slots).
 */
export function allocateStreamingSlots(
  services: readonly ResolvedStreamingService[],
  slotCount: number
): ResolvedStreamingService[] {
  if (slotCount <= 0 || !services.length) return [];

  const shuffled = shuffleArray(services);
  const slots: ResolvedStreamingService[] = [];
  const usedIds = new Set<string>();

  for (const entry of shuffled) {
    if (slots.length >= slotCount) break;
    const slotKey = `${entry.mediaType}:${entry.providerId}`;
    if (usedIds.has(slotKey)) continue;
    usedIds.add(slotKey);
    slots.push(entry);
  }

  let index = 0;
  while (slots.length < slotCount) {
    slots.push(shuffled[index % shuffled.length]);
    index += 1;
  }

  return slots;
}

/**
 * Expand explicit per-service quotas into an ordered slot list.
 * Quota keys match service names case-insensitively.
 */
export function expandStreamingQuotas(
  services: readonly ResolvedStreamingService[],
  quotas: Record<string, number>
): ResolvedStreamingService[] {
  const byName = new Map<string, ResolvedStreamingService[]>();
  for (const entry of services) {
    const key = entry.service.toLowerCase();
    const list = byName.get(key) ?? [];
    list.push(entry);
    byName.set(key, list);
  }

  const slots: ResolvedStreamingService[] = [];
  for (const [name, count] of Object.entries(quotas)) {
    if (count <= 0) continue;
    const matches = byName.get(name.toLowerCase());
    if (!matches?.length) {
      console.warn(`Streaming quota: provider not resolved for "${name}"`);
      continue;
    }
    for (let i = 0; i < count; i += 1) {
      slots.push(matches[i % matches.length]);
    }
  }

  return shuffleArray(slots);
}

/**
 * Ordered try-list for filling streaming picks: unused providers first,
 * then already-used ones, so empty slots can soft-fail to another service.
 */
export function buildStreamingTryOrder(
  services: readonly ResolvedStreamingService[],
  usedProviderKeys: ReadonlySet<string>
): ResolvedStreamingService[] {
  const shuffled = shuffleArray(services);
  const unused = shuffled.filter(
    (s) => !usedProviderKeys.has(`${s.mediaType}:${s.providerId}`)
  );
  const used = shuffled.filter((s) =>
    usedProviderKeys.has(`${s.mediaType}:${s.providerId}`)
  );
  return [...unused, ...used];
}
