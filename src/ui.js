// The small HTML overlay: title, legend, sun times, and a spoken time for
// screen readers. Fades away when the pointer is idle so the sky gets the stage.
import { CONFIG } from './config.js';
import { sunTimes } from './sky.js';

const fmt = (d) =>
  d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

export function initUi({ getLocation, onRequestLocation }) {
  const body = document.body;
  const legend = document.getElementById('legend');
  const legendToggle = document.getElementById('legend-toggle');
  const sunrise = document.getElementById('sunrise');
  const sunset = document.getElementById('sunset');
  const locButton = document.getElementById('use-location');
  const locNote = document.getElementById('location-note');
  const spoken = document.getElementById('spoken-time');

  // Idle fade.
  let idleTimer;
  const wake = () => {
    body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (legend.hidden) body.classList.add('idle');
    }, CONFIG.uiIdleMs);
  };
  ['pointermove', 'pointerdown', 'keydown', 'focusin'].forEach((ev) =>
    window.addEventListener(ev, wake, { passive: true }),
  );
  wake();

  legendToggle.addEventListener('click', () => {
    legend.hidden = !legend.hidden;
    legendToggle.setAttribute('aria-expanded', String(!legend.hidden));
    wake();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !legend.hidden) legendToggle.click();
  });

  locButton.addEventListener('click', async () => {
    locButton.disabled = true;
    locButton.textContent = 'locating…';
    const ok = await onRequestLocation();
    locButton.disabled = false;
    locButton.textContent = 'use my location';
    if (!ok) locNote.textContent = 'location unavailable, using an estimate';
  });

  let lastMinute = -1;
  let lastDay = -1;

  function refresh(date) {
    const loc = getLocation();
    const { sunrise: rise, sunset: set } = sunTimes(date, loc.lat, loc.lon);
    sunrise.textContent = fmt(rise);
    sunset.textContent = fmt(set);
    const approx = loc.source === 'timezone';
    locButton.hidden = !approx;
    locNote.textContent = approx ? 'estimated from your time zone' : '';
    lastDay = date.getDate();
  }

  function tick(date) {
    if (date.getDate() !== lastDay) refresh(date);
    if (date.getMinutes() !== lastMinute) {
      lastMinute = date.getMinutes();
      spoken.textContent = `It is ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    }
  }

  return { refresh, tick };
}
