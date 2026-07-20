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
  const usedIds = new Set<number>();

  for (const entry of shuffled) {
    if (slots.length >= slotCount) break;
    if (usedIds.has(entry.providerId)) continue;
    usedIds.add(entry.providerId);
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
 * Ordered try-list for filling streaming picks: unused providers first,
 * then already-used ones, so empty slots can soft-fail to another service.
 */
export function buildStreamingTryOrder(
  services: readonly ResolvedStreamingService[],
  usedProviderIds: ReadonlySet<number>
): ResolvedStreamingService[] {
  const shuffled = shuffleArray(services);
  const unused = shuffled.filter((s) => !usedProviderIds.has(s.providerId));
  const used = shuffled.filter((s) => usedProviderIds.has(s.providerId));
  return [...unused, ...used];
}
