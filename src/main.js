import p5 from 'p5';
import './style.css';
import { now, timeParts } from './clock.js';
import { initialLocation, locationAlreadyGranted, requestDeviceLocation } from './location.js';
import { skyAt } from './sky.js';
import {
  computeLayout,
  drawDandelions,
  drawFluff,
  drawGround,
  drawReleasedSeed,
  drawSky,
  drawStars,
} from './scene.js';
import { initUi } from './ui.js';
import { AmbientMusic } from './music.js';

const music = new AmbientMusic();
let lastMinute = -1;

let place = initialLocation();
let sky = null;
let skyComputedAt = 0;
let layout = null;

const ui = initUi({
  music,
  getLocation: () => place,
  onRequestLocation: async () => {
    const loc = await requestDeviceLocation();
    if (loc) setLocation(loc);
    return Boolean(loc);
  },
});

function setLocation(loc) {
  place = loc;
  skyComputedAt = 0; // recompute immediately
  ui.refresh(now());
}

// Use the real position without prompting if the viewer already allowed it.
if (place.source === 'timezone') {
  locationAlreadyGranted().then((granted) => {
    if (granted) requestDeviceLocation().then((loc) => loc && setLocation(loc));
  });
}

const sketch = (p) => {
  p.setup = () => {
    const stage = document.getElementById('stage');
    p.createCanvas(window.innerWidth, window.innerHeight).parent(stage);
    p.frameRate(60);
    layout = computeLayout(p.width, p.height);
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
    layout = computeLayout(p.width, p.height);
  };

  p.draw = () => {
    const date = now();
    const time = timeParts(date);
    const t = p.millis() / 1000; // continuous time for sway / twinkle
    const ctx = p.drawingContext;

    // The sun moves slowly; recomputing the sky once a second is plenty.
    if (!sky || Math.abs(date.getTime() - skyComputedAt) > 1000) {
      sky = skyAt(date, place.lat, place.lon);
      skyComputedAt = date.getTime();
    }

    ctx.save();
    ctx.lineCap = 'round';
    drawSky(ctx, layout, sky);
    drawStars(ctx, layout, sky, t);
    drawGround(ctx, layout);
    drawDandelions(ctx, layout, time, t);
    drawReleasedSeed(ctx, layout, time, t);
    drawFluff(ctx, layout, time);
    ctx.restore();

    // A soft bell as each minute's seed lets go.
    if (time.minutes !== lastMinute) {
      if (lastMinute !== -1) music.seedBell();
      lastMinute = time.minutes;
    }

    ui.tick(date);
  };
};

new p5(sketch);
