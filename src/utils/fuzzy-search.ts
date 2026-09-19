export interface RankedItem<T> {
  item: T;
  score: number;
}

export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500 + (100 - Math.min(t.length, 90));
  const idx = t.indexOf(q);
  if (idx !== -1) return 300 - idx;

  let qIdx = 0;
  let score = 0;
  let prevMatch = -1;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      score += 10;
      if (prevMatch === i - 1) score += 15;
      prevMatch = i;
      qIdx++;
    }
  }
  return qIdx === q.length ? score : 0;
}

export function fuzzySearch<T extends { name: string; path: string }>(
  query: string,
  items: T[],
): T[] {
  const clean = query.trim();
  if (!clean) return items;

  const scored: RankedItem<T>[] = [];
  for (const item of items) {
    const nameScore = fuzzyScore(clean, item.name) * 2;
    const pathScore = fuzzyScore(clean, item.path);
    const total = Math.max(nameScore, pathScore);
    if (total > 0) {
      scored.push({ item, score: total });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
