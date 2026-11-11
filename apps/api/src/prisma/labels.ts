/** First free "<prefix> N" not already used in `taken` (case-insensitive). */
export const nextLabel = (prefix: string, taken: string[]) => {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  let n = 1;
  while (used.has(`${prefix} ${n}`.toLowerCase())) n++;
  return `${prefix} ${n}`;
};
