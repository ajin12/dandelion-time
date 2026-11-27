// Small deterministic PRNG helpers. Everything on screen is derived from the
// clock + a stable seed, so resizing the window or reloading mid-minute never
// reshuffles the scene.

export function hash(...values) {
  let h = 2166136261 >>> 0;
  for (const v of values) {
    h ^= Math.imul((v | 0) + 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296; // [0, 1)
}

export function rand(min, max, ...seed) {
  return min + (max - min) * hash(...seed);
}
