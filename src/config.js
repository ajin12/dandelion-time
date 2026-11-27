// Tunable constants for the visualization. Everything that affects the look
// lives here so it can be tweaked without digging through drawing code.

export const CONFIG = {
  hoursOnFace: 12, // one dandelion per hour on a 12-hour face
  seedsPerHead: 60, // one seed per minute

  // Seeds: each seed is a thin stalk ending in a fan of feathers (the pappus).
  featherCount: 4, // feathers per seed (replaces the old slider)
  featherSpread: Math.PI / 6, // total fan angle of the feathers

  // Brightness of dandelions relative to the current hour.
  alpha: {
    past: 0.95, // bare stems for hours already gone
    future: 0.42, // stems / heads of hours still to come
    futureSeeds: 0.8,
  },

  // A seed that detaches on the minute drifts away for this many seconds.
  releaseSeconds: 14,

  // Background stars, visible once the sun is well below the horizon.
  starCount: 140,

  // The overlay UI fades out after this much idle time (ms).
  uiIdleMs: 4000,
};
