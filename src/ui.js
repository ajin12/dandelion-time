// The small HTML overlay: title, legend, sun times, and a spoken time for
// screen readers. Fades away when the pointer is idle so the sky gets the stage.
import { CONFIG } from './config.js';
import { sunTimes } from './sky.js';

const fmt = (d) =>
  d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

export function initUi({ getLocation, onRequestLocation, music }) {
  const body = document.body;
  const legend = document.getElementById('legend');
  const legendToggle = document.getElementById('legend-toggle');
  const sunrise = document.getElementById('sunrise');
  const sunset = document.getElementById('sunset');
  const locButton = document.getElementById('use-location');
  const locNote = document.getElementById('location-note');
  const spoken = document.getElementById('spoken-time');

  // Fluff slider: feathers per seed.
  const FEATHERS_KEY = 'dandelion-time:feathers';
  const slider = document.getElementById('feathers');
  const sliderValue = document.getElementById('feathers-value');
  slider.min = String(CONFIG.featherMin);
  slider.max = String(CONFIG.featherMax);
  const setFeathers = (n, save) => {
    const v = Math.round(Math.min(CONFIG.featherMax, Math.max(CONFIG.featherMin, Number(n))));
    if (!Number.isFinite(v)) return;
    CONFIG.featherCount = v;
    slider.value = String(v);
    sliderValue.textContent = String(v);
    slider.setAttribute('aria-valuetext', `${v} feather${v === 1 ? '' : 's'} per seed`);
    if (save) {
      try {
        localStorage.setItem(FEATHERS_KEY, String(v));
      } catch {
        /* ignore */
      }
    }
  };
  let initialFeathers = CONFIG.featherCount;
  try {
    initialFeathers = localStorage.getItem(FEATHERS_KEY) ?? initialFeathers;
  } catch {
    /* ignore */
  }
  initialFeathers = new URLSearchParams(window.location.search).get('feathers') ?? initialFeathers;
  setFeathers(initialFeathers, false);
  slider.addEventListener('input', () => setFeathers(slider.value, true));

  // Sound toggle. Browsers only allow audio after a user gesture, so a saved
  // "on" preference starts the music on the first click or key press.
  const SOUND_KEY = 'dandelion-time:sound';
  const soundToggle = document.getElementById('sound-toggle');
  const showSound = (on) => {
    soundToggle.textContent = on ? 'sound on' : 'sound off';
    soundToggle.setAttribute('aria-pressed', String(on));
  };
  const saveSound = (on) => {
    try {
      localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  };
  soundToggle.addEventListener('click', async () => {
    const on = !music.playing;
    if (on) {
      const ok = await music.start();
      if (!ok) {
        soundToggle.textContent = 'sound unavailable';
        return;
      }
    } else {
      music.stop();
    }
    showSound(on);
    saveSound(on);
  });
  let soundPref = 'off';
  try {
    soundPref = localStorage.getItem(SOUND_KEY) || 'off';
  } catch {
    /* ignore */
  }
  if (soundPref === 'on') {
    const resume = (e) => {
      if (e.target === soundToggle) return; // the toggle handles itself
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      music.start().then((ok) => ok && showSound(true));
    };
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
  }

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
