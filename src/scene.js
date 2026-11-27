// Drawing for Dandelion Time.
//
// How to read it:
//   hours   = dandelions that have lost all their seeds (12-hour face)
//   minutes = seeds gone from the current (pulsing) dandelion, clockwise from 12
//   seconds = bits of fluff drifting across the sky
//
// The whole scene is a pure function of the current time and window size:
// nothing accumulates between frames, so the clock can never drift, and
// reloading or resizing mid-minute shows exactly the same picture.
import { CONFIG } from './config.js';
import { hash, rand } from './random.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

// --- layout ----------------------------------------------------------------

export function computeLayout(width, height) {
  const n = CONFIG.hoursOnFace;
  const margin = Math.max(12, width * 0.035);
  // Tall, narrow screens (phones in portrait) use two staggered rows of six,
  // read left to right then top to bottom, so each dandelion stays legible.
  const rows = width / height < 0.8 ? 2 : 1;
  const perRow = n / rows;
  const spacing = (width - 2 * margin) / perRow;
  // Seed reach scales with the column width but is capped by height, so the
  // heads stay round on very wide or very short screens.
  const reach = Math.max(10, Math.min(spacing * 0.46, height * 0.075));
  const heads = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const jitter = hash(i, 11);
    let x;
    let y;
    if (rows === 1) {
      x = margin + spacing * (col + 0.5);
      y = height * (0.5 + 0.32 * jitter);
    } else {
      x = margin + spacing * (col + (row === 0 ? 0.3 : 0.7));
      y = height * (row === 0 ? 0.4 + 0.12 * jitter : 0.64 + 0.14 * jitter);
    }
    heads.push({
      index: i,
      x,
      y,
      bow: spacing * (0.08 + 0.12 * hash(i, 23)) / rows,
      swayPhase: hash(i, 5) * TAU,
    });
  }
  return {
    width,
    height,
    margin,
    spacing,
    reach,
    headR: Math.max(2.5, reach * 0.2),
    featherLen: reach * 0.36,
    stroke: Math.max(0.6, Math.min(1.2, reach / 36)),
    fluffBottom: rows === 1 ? 0.42 : 0.3,
    heads,
  };
}

// --- primitives --------------------------------------------------------------

/**
 * Add one seed to the given paths: a stalk from r0 to r1 along `angle`, then a
 * fan of feathers at the tip. (cx, cy) is the point the stalk grows from.
 */
function addSeed(stalks, feathers, cx, cy, angle, r0, r1, featherLen) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const tx = cx + c * r1;
  const ty = cy + s * r1;
  stalks.moveTo(cx + c * r0, cy + s * r0);
  stalks.lineTo(tx, ty);

  const count = CONFIG.featherCount;
  const spread = CONFIG.featherGap * (count - 1);
  for (let f = 0; f < count; f++) {
    const a = angle + (count === 1 ? 0 : -spread / 2 + (spread * f) / (count - 1));
    feathers.moveTo(tx, ty);
    feathers.lineTo(tx + Math.cos(a) * featherLen, ty + Math.sin(a) * featherLen);
  }
}

function strokePaths(ctx, stalks, feathers, alpha, lineWidth) {
  ctx.lineWidth = lineWidth * 0.8;
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.45})`;
  ctx.stroke(stalks);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.stroke(feathers);
}

// --- scene pieces ----------------------------------------------------------

export function drawSky(ctx, layout, sky) {
  const { width, height } = layout;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, sky.stops[0]);
  g.addColorStop(0.55, sky.stops[1]);
  g.addColorStop(1, sky.stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

export function drawStars(ctx, layout, sky, t) {
  if (sky.starAlpha <= 0) return;
  const { width, height } = layout;
  // Fewer stars on small screens so they don't crowd.
  const count = Math.round(CONFIG.starCount * Math.min(1, (width * height) / (1400 * 800)));
  ctx.fillStyle = '#fff';
  for (let i = 0; i < count; i++) {
    const x = hash(i, 101) * width;
    const y = hash(i, 202) ** 1.4 * height * 0.75; // denser near the top
    const r = 0.4 + hash(i, 303) * 1.0;
    const twinkle = 0.6 + 0.4 * Math.sin(t * (0.6 + hash(i, 404) * 1.5) + i);
    ctx.globalAlpha = sky.starAlpha * twinkle * (0.35 + 0.65 * hash(i, 505));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A faint haze along the ground so the stems feel planted. */
export function drawGround(ctx, layout) {
  const { width, height } = layout;
  const g = ctx.createLinearGradient(0, height * 0.86, 0, height);
  g.addColorStop(0, 'rgba(0, 0, 20, 0)');
  g.addColorStop(1, 'rgba(0, 0, 20, 0.1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, height * 0.86, width, height * 0.14);
}

function headPosition(layout, head, t) {
  const sway = Math.sin(t * 0.45 + head.swayPhase) * layout.spacing * 0.035;
  return { x: head.x + sway, y: head.y + Math.abs(sway) * 0.15 };
}

function seedAngle(index, k) {
  // Seed 0 sits at 12 o'clock; seeds leave clockwise, like a clock hand sweeping.
  return -Math.PI / 2 + (TAU * (k + 0.5)) / CONFIG.seedsPerHead + rand(-0.03, 0.03, index, k, 1);
}

function seedLength(layout, index, k) {
  return layout.reach * rand(0.5, 0.64, index, k, 2);
}

export function drawDandelions(ctx, layout, time, t) {
  const { hours, minutes, seconds } = time;
  const { headR, height, stroke } = layout;

  for (const head of layout.heads) {
    const i = head.index;
    const state = i < hours ? 'past' : i === hours ? 'current' : 'future';
    const { x, y } = headPosition(layout, head, t);

    // The current hour pulses once a second, as in the original sketch:
    // brightening through each second, then dropping back on the tick.
    // Stem and core share one opacity so the dandelion reads as one shape.
    const pulse = 0.6 + 0.4 * (seconds % 1);
    const alpha =
      state === 'current' ? pulse : state === 'past' ? CONFIG.alpha.past : CONFIG.alpha.future;
    const solid = `rgba(255,255,255,${alpha})`;

    // Stem: a gentle curve from the ground up to the edge of the core. It stops
    // at the core's edge (with a flat cap) so the two never overlap, which
    // would otherwise show as a brighter line through a translucent core.
    const cx = x + head.bow;
    const cy = (y + height) / 2;
    const dLen = Math.hypot(cx - x, cy - y) || 1;
    const ex = x + ((cx - x) / dLen) * headR * 0.97;
    const ey = y + ((cy - y) / dLen) * headR * 0.97;
    ctx.lineWidth = stroke * 1.6;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = solid;
    ctx.beginPath();
    ctx.moveTo(head.x + head.bow * 0.25, height + 2);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.lineCap = 'round';

    // Seeds still attached. Stalks start at the core's edge for the same reason.
    const firstSeed = state === 'past' ? CONFIG.seedsPerHead : state === 'current' ? minutes : 0;
    if (firstSeed < CONFIG.seedsPerHead) {
      const stalks = new Path2D();
      const feathers = new Path2D();
      for (let k = firstSeed; k < CONFIG.seedsPerHead; k++) {
        addSeed(stalks, feathers, x, y, seedAngle(i, k), headR + stroke * 0.4, seedLength(layout, i, k), layout.featherLen);
      }
      const seedAlpha = state === 'current' ? 1 : CONFIG.alpha.futureSeeds;
      strokePaths(ctx, stalks, feathers, seedAlpha, stroke);
    }

    // Core.
    ctx.fillStyle = solid;
    ctx.beginPath();
    ctx.arc(x, y, headR, 0, TAU);
    ctx.fill();
  }
}

/** The seed that let go at the top of this minute, drifting off on the wind. */
export function drawReleasedSeed(ctx, layout, time, t) {
  const e = time.seconds;
  if (e >= CONFIG.releaseSeconds) return;
  const n = CONFIG.hoursOnFace;
  const owner = time.minutes > 0 ? time.hours : (time.hours - 1 + n) % n;
  const k = (time.minutes - 1 + CONFIG.seedsPerHead) % CONFIG.seedsPerHead;
  const head = layout.heads[owner];
  const { x, y } = headPosition(layout, head, t);
  const a0 = seedAngle(owner, k);
  const len = seedLength(layout, owner, k);

  const p = e / CONFIG.releaseSeconds;
  const lift = smooth(clamp01(e / 1.5)); // first ease off the head
  // Drift left with the same wind as the fluff, rising and wobbling.
  const dx = -layout.width * 0.35 * p ** 1.3 + Math.cos(a0) * layout.reach * lift;
  const dy = -layout.height * 0.3 * p + Math.sin(a0) * layout.reach * lift + Math.sin(e * 1.7) * layout.reach * 0.25;
  const angle = a0 + e * 0.35;
  // Draw the seed with its base (the achene) at the moving point.
  const bx = x + Math.cos(a0) * layout.headR * 0.8 + dx;
  const by = y + Math.sin(a0) * layout.headR * 0.8 + dy;

  const stalks = new Path2D();
  const feathers = new Path2D();
  addSeed(stalks, feathers, bx, by, angle, 0, len - layout.headR * 0.8, layout.featherLen);
  const alpha = 1 - smooth(clamp01((p - 0.6) / 0.4));
  strokePaths(ctx, stalks, feathers, alpha, layout.stroke);
}

/**
 * Seconds: one bit of fluff arrives from the right each second and joins a
 * calm, evenly spaced stream drifting left on a steady breeze. Every bit moves
 * at the same speed, so by :59 the stream spans the sky; as the minute turns,
 * a soft gust carries the whole stream off as it fades.
 */
const GUST_SECONDS = 1.6;

function addFluffBit(stalks, feathers, layout, minuteStamp, j, x, wallT) {
  const { margin, reach, height, featherLen } = layout;
  const top = margin + reach;
  const bottom = Math.max(top + 10, height * layout.fluffBottom);
  // Golden-ratio spacing spreads the heights evenly with no clumps, plus a
  // little jitter so it doesn't look gridded.
  const slot = (j * 0.618034 + hash(minuteStamp, 3)) % 1;
  const baseY = top + (bottom - top) * (0.08 + 0.84 * slot) + rand(-0.04, 0.04, minuteStamp, j, 7) * (bottom - top);
  // One shared, slow wave rolls through the stream rather than every bit
  // bobbing on its own.
  const y = baseY + Math.sin(wallT * 0.8 - x * 0.006) * reach * 0.18;
  // Float upright like a real seed (feathers up), rocking gently.
  const tilt = rand(-0.35, 0.35, minuteStamp, j, 8);
  const angle = -Math.PI / 2 + tilt + Math.sin(wallT * 0.7 + j * 1.9) * 0.12;
  // Draw from the achene upwards: shift so the fan sits at (x, y).
  const len = reach * 0.35;
  addSeed(stalks, feathers, x - Math.cos(angle) * len, y - Math.sin(angle) * len, angle, 0, len, featherLen);
}

export function drawFluff(ctx, layout, time) {
  const { width, margin, reach } = layout;
  const t = time.seconds;
  const pad = reach * 1.5;
  const enterX = width + pad;
  // Steady breeze: the first bit (arriving at :01) reaches the left margin at :60.
  const speed = (enterX - margin) / 59;
  const xAt = (j, elapsed) => enterX - (elapsed - (j + 1)) * speed;

  // This minute's fluff: exactly floor(seconds) bits.
  const count = Math.floor(t);
  let stalks = new Path2D();
  let feathers = new Path2D();
  for (let j = 0; j < count; j++) {
    addFluffBit(stalks, feathers, layout, time.minuteStamp, j, xAt(j, t), t);
  }
  strokePaths(ctx, stalks, feathers, 0.95, layout.stroke);

  // Last minute's stream, carried off by a gust and fading out.
  if (t < GUST_SECONDS) {
    const p = t / GUST_SECONDS;
    const gust = width * 0.45 * p * p;
    stalks = new Path2D();
    feathers = new Path2D();
    for (let j = 0; j < 59; j++) {
      addFluffBit(stalks, feathers, layout, time.minuteStamp - 1, j, xAt(j, 60 + t) - gust, 60 + t);
    }
    strokePaths(ctx, stalks, feathers, 0.95 * (1 - smooth(p)), layout.stroke);
  }
}
