// Clock source. Normally the real time, but for development you can override:
//   ?at=06:45        start the clock at 06:45 today
//   ?at=2026-06-21T20:30   start at a specific date and time
//   ?speed=60        run the clock 60x faster
const params = new URLSearchParams(window.location.search);
const bootReal = Date.now();
let bootVirtual = bootReal;

const at = params.get('at');
if (at) {
  if (at.includes('T') || at.includes('-')) {
    const parsed = new Date(at);
    if (!Number.isNaN(parsed.getTime())) bootVirtual = parsed.getTime();
  } else {
    const [h = 0, m = 0, s = 0] = at.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, s, 0);
    bootVirtual = d.getTime();
  }
}

const speed = Number(params.get('speed')) || 1;

export function now() {
  return new Date(bootVirtual + (Date.now() - bootReal) * speed);
}

/** Break a Date into the pieces the visualization encodes. */
export function timeParts(date) {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
  return {
    hours24,
    hours: hours24 % 12,
    minutes,
    seconds, // fractional
    // Stable id for the current minute, used to seed per-minute randomness.
    minuteStamp: Math.floor(date.getTime() / 60000),
  };
}
