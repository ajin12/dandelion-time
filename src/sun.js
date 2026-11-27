// Sun position and sunrise / sunset, computed entirely in the browser.
// Based on the formulas from https://aa.quae.nl/en/reken/zonpositie.html
// (the same ones used by the suncalc library), accurate to about a minute.

const rad = Math.PI / 180;
const dayMs = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397; // obliquity of the Earth
const J0 = 0.0009;

const toJulian = (date) => date.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (date) => toJulian(date) - J2000;

const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
const rightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
const altitudeOf = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
const siderealTime = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
const meanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d);

function eclipticLongitude(M) {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = rad * 102.9372; // perihelion of the Earth
  return M + C + P + Math.PI;
}

/** Sun altitude above the horizon, in degrees. */
export function sunAltitude(date, lat, lon) {
  const lw = rad * -lon;
  const phi = rad * lat;
  const d = toDays(date);
  const L = eclipticLongitude(meanAnomaly(d));
  const dec = declination(L, 0);
  const ra = rightAscension(L, 0);
  const H = siderealTime(d, lw) - ra;
  return altitudeOf(H, phi, dec) / rad;
}

/** Sunrise and sunset for the day containing `date`; null when the sun never crosses. */
export function sunriseSunset(date, lat, lon) {
  const lw = rad * -lon;
  const phi = rad * lat;
  const d = toDays(date);
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = meanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

  const h0 = -0.833 * rad; // sun's upper limb at the horizon, with refraction
  const cosW = (Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return { sunrise: null, sunset: null };
  const w = Math.acos(cosW);
  const Jset = J2000 + J0 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jrise = Jnoon - (Jset - Jnoon);
  return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
}
