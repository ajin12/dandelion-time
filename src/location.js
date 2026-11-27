// Where on Earth the viewer is, for sunrise/sunset.
//
// Priority:
//   1. ?lat=..&lon=.. in the URL
//   2. A position the viewer shared before (cached in localStorage)
//   3. A rough guess from the browser's time zone (no permission needed)
// The browser's geolocation prompt is only shown when the viewer asks for it,
// or silently used if permission was already granted.

const STORAGE_KEY = 'dandelion-time:location';

// Time zones in the southern hemisphere get a southern default latitude, so the
// seasons (and day length) are at least the right way round.
const SOUTHERN = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Noumea)|^America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|Lima|La_Paz)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Lusaka)|^Indian\/(Mauritius|Reunion)/;

export function guessFromTimeZone() {
  const year = new Date().getFullYear();
  // Standard (non-DST) offset is the larger of January / July offsets.
  const std = Math.max(
    new Date(year, 0, 1).getTimezoneOffset(),
    new Date(year, 6, 1).getTimezoneOffset(),
  );
  const lon = Math.max(-180, Math.min(180, (-std / 60) * 15));
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    /* ignore */
  }
  const lat = SOUTHERN.test(tz) ? -34 : 40;
  return { lat, lon, source: 'timezone' };
}

function fromUrl() {
  const p = new URLSearchParams(window.location.search);
  const lat = parseFloat(p.get('lat'));
  const lon = parseFloat(p.get('lon'));
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, source: 'url' };
  return null;
}

function fromCache() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(v?.lat) && Number.isFinite(v?.lon)) return { ...v, source: 'device' };
  } catch {
    /* ignore */
  }
  return null;
}

export function initialLocation() {
  return fromUrl() || fromCache() || guessFromTimeZone();
}

/** Ask the browser for a position. Resolves to a location or null. */
export function requestDeviceLocation() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Two decimals (~1 km) is plenty for sun times and avoids storing more.
        const loc = {
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lon: Math.round(pos.coords.longitude * 100) / 100,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
        } catch {
          /* ignore */
        }
        resolve({ ...loc, source: 'device' });
      },
      () => resolve(null),
      { timeout: 10000, maximumAge: 6 * 60 * 60 * 1000 },
    );
  });
}

/** True if the viewer already granted geolocation (so no prompt will show). */
export async function locationAlreadyGranted() {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' });
    return status?.state === 'granted';
  } catch {
    return false;
  }
}
