# Dandelion Time

An abstract clock. A field of twelve dandelions slowly blows away over the course of a day.

- **Hours** are the bare stems. The softly pulsing dandelion is the current hour (12-hour face).
- **Minutes** are the seeds gone from the current dandelion, sweeping clockwise from 12 o'clock.
  A seed lets go and drifts off at the top of every minute.
- **Seconds** are the bits of fluff blowing across the sky. One arrives each second, and the whole
  cloud clears the screen together as the minute turns over.
- **The sky** follows the real sun at your location: night, dawn, day, golden hour and dusk are
  all driven by the sun's altitude, with stars once it is properly dark.

## Running locally

Requires Node 22.12+ (or 20.19+). With nvm, run `nvm install` in the repo to use the version in `.nvmrc`.

```bash
npm install
npm run dev       # dev server with hot reload at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build
```

`dist/` is a fully static site and can be deployed to any static host (Netlify, Vercel,
GitHub Pages, Cloudflare Pages, S3…).

### Handy URL parameters

| Parameter | Example | What it does |
| --- | --- | --- |
| `at` | `?at=06:45` or `?at=2026-06-21T20:30` | Start the clock at a given time |
| `speed` | `?speed=60` | Run the clock faster (60 = a minute per second) |
| `lat`, `lon` | `?lat=51.5&lon=-0.13` | Use a fixed location for the sky |

e.g. watch a sunset in fast forward: `/?at=16:00&speed=120&lat=40.7&lon=-74`

## Location and privacy

Sun times are computed entirely in the browser (`src/sun.js`); nothing is sent anywhere.
By default the location is estimated from the browser's time zone, which needs no permission.
Viewers can tap **use my location** for an exact sky; the position (rounded to ~1 km) is kept
in `localStorage` only. If permission was already granted, it is used without a prompt.

## Project layout

```
index.html        page shell and overlay UI
src/main.js       p5 sketch: setup, resize, draw loop
src/scene.js      all drawing (layout, dandelions, seeds, fluff, sky, stars)
src/sky.js        sky gradient keyframes for dawn and dusk, OKLab blending
src/sun.js        sun altitude, sunrise and sunset
src/location.js   URL / saved / time-zone / geolocation location
src/clock.js      clock source with dev overrides
src/ui.js         legend, sun times, idle fade, screen-reader time
src/config.js     tunable constants (feathers, brightness, timings)
```

The scene is a pure function of the current time and window size, so it never drifts,
and reloading or resizing mid-minute shows the same picture.
