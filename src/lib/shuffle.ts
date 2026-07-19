/** Fisher–Yates shuffle (new array). */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/**
 * Weighted random pick without replacement.
 * Mid-list bias: index weight rises toward the middle of the candidate list.
 */
export function weightedSample<T>(items: readonly T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return shuffleArray(items);

  const pool = items.map((item, index) => ({ item, index }));
  const selected: T[] = [];
  const n = pool.length;

  while (selected.length < count && pool.length > 0) {
    const weights = pool.map(({ index }) => {
      const mid = (n - 1) / 2;
      const distance = Math.abs(index - mid);
      // Prefer mid-tier over the very top of a popularity-sorted list.
      return 1 + (mid - distance) + index * 0.15;
    });
    const total = weights.reduce((sum, w) => sum + Math.max(w, 0.1), 0);
    let roll = Math.random() * total;
    let pick = 0;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= Math.max(weights[i], 0.1);
      if (roll <= 0) {
        pick = i;
        break;
      }
    }
    selected.push(pool[pick].item);
    pool.splice(pick, 1);
  }

  return selected;
}
