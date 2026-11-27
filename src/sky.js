// Sky colours driven by the sun's real position.
//
// We compute the sun's altitude (degrees above the horizon) for the viewer's
// location and pick a three-stop vertical gradient from a table of keyframes.
// Dawn and dusk get different palettes (dawn cooler and pinker, dusk warmer),
// chosen by whether the sun is currently rising or setting. Using altitude
// rather than clock times means polar day/night and every season just work.
import { sunAltitude, sunriseSunset } from './sun.js';

// [altitude°, [top, middle, horizon]]
const DAWN = [
  [-18, ['#04061a', '#0a0e29', '#12173a']],
  [-12, ['#070a22', '#111637', '#232853']],
  [-6, ['#121a46', '#363a75', '#86699c']],
  [-2, ['#1f3376', '#6f6aa6', '#eaa597']],
  [2, ['#2f5fb2', '#8aa9da', '#ffd2ac']],
  [8, ['#2b80df', '#6eb4f0', '#e2ecf5']],
  [25, ['#1e8ef0', '#3aadfc', '#acdcff']],
];

const DUSK = [
  [-18, ['#04061a', '#0a0e29', '#12173a']],
  [-12, ['#070a22', '#14163a', '#2b2653']],
  [-6, ['#141844', '#3b336e', '#9c5a82']],
  [-2, ['#1f2d6e', '#7d5590', '#f08a62']],
  [2, ['#2c56a8', '#b5839f', '#ffae6e']],
  [8, ['#2a7bd8', '#7cb0e2', '#ffdcb0']],
  [25, ['#1e8ef0', '#3aadfc', '#acdcff']],
];

// --- colour maths (OKLab interpolation avoids muddy midpoints) -------------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
}
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255));
}

function mix(hexA, hexB, t) {
  const a = rgbToOklab(hexToRgb(hexA));
  const b = rgbToOklab(hexToRgb(hexB));
  const [r, g, bl] = oklabToRgb(a.map((v, i) => v + (b[i] - v) * t));
  return `rgb(${r}, ${g}, ${bl})`;
}

const smooth = (t) => t * t * (3 - 2 * t);

function sample(table, altitude) {
  if (altitude <= table[0][0]) return table[0][1].map((c) => mix(c, c, 0));
  const last = table[table.length - 1];
  if (altitude >= last[0]) return last[1].map((c) => mix(c, c, 0));
  for (let i = 0; i < table.length - 1; i++) {
    const [a0, c0] = table[i];
    const [a1, c1] = table[i + 1];
    if (altitude <= a1) {
      const t = smooth((altitude - a0) / (a1 - a0));
      return c0.map((c, k) => mix(c, c1[k], t));
    }
  }
  return last[1];
}

// --- public API ------------------------------------------------------------

/**
 * Sky state for a moment and place.
 * @returns {{stops: string[], altitude: number, rising: boolean, starAlpha: number}}
 */
export function skyAt(date, lat, lon) {
  const altitude = sunAltitude(date, lat, lon);
  const later = sunAltitude(new Date(date.getTime() + 10 * 60000), lat, lon);
  const rising = later > altitude;
  const stops = sample(rising ? DAWN : DUSK, altitude);
  const starAlpha = Math.min(1, Math.max(0, (-altitude - 3) / 9));
  return { stops, altitude, rising, starAlpha };
}

/** Today's sunrise and sunset (may be null in polar day / night). */
export function sunTimes(date, lat, lon) {
  return sunriseSunset(date, lat, lon);
}
