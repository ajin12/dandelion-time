// Calm ambient music, generated live with the Web Audio API: no audio files,
// no licensing, and it never repeats exactly. Slow, airy pad chords drift
// through a soft reverb, with the occasional high pentatonic chime and a
// gentle bell each time a seed lets go at the top of the minute.

const CHORDS = [
  // MIDI note numbers: lush, unresolved voicings that loop gently.
  [48, 55, 62, 64, 71], // Cmaj9
  [45, 52, 59, 60, 67], // Am9
  [41, 48, 55, 57, 64], // Fmaj9
  [43, 50, 57, 59, 62], // G6/9
];
const PENTATONIC = [72, 74, 76, 79, 81, 84, 86, 88];
const CHORD_SECONDS = 12;
const MASTER_VOLUME = 0.6;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function makeReverb(ctx, seconds = 5) {
  // Synthesised impulse response: decaying stereo noise.
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  return conv;
}

export class AmbientMusic {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.timers = [];
  }

  #setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Warm the tone and add space.
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1400;
    this.filter.Q.value = 0.3;
    const reverb = makeReverb(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    const dry = ctx.createGain();
    dry.gain.value = 0.5;
    this.filter.connect(dry).connect(this.master);
    this.filter.connect(reverb).connect(wet).connect(this.master);

    // A very slow sweep on the filter so the pad breathes.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.03;
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain).connect(this.filter.frequency);
    lfo.start();
    return true;
  }

  #padNote(freq, start, dur) {
    const { ctx } = this;
    const gain = ctx.createGain();
    const peak = 0.05;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + dur * 0.35);
    gain.gain.linearRampToValueAtTime(peak * 0.8, start + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    gain.connect(this.filter);
    // Two slightly detuned voices for a soft chorus.
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = detune < 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + dur + 0.1);
    }
  }

  #chime(midi, start, volume = 0.035) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = hz(midi);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 4);
    osc.connect(gain).connect(this.filter);
    osc.start(start);
    osc.stop(start + 4.1);
  }

  #scheduleChord(index) {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    // Chords overlap by a few seconds so there is never silence.
    const dur = CHORD_SECONDS + 4;
    for (const n of CHORDS[index % CHORDS.length]) this.#padNote(hz(n), now, dur);
    // A couple of sparse chimes somewhere in this chord.
    const chimes = Math.random() < 0.7 ? 2 : 1;
    for (let i = 0; i < chimes; i++) {
      const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      this.#chime(note, now + 1 + Math.random() * (CHORD_SECONDS - 2));
    }
    this.timers.push(setTimeout(() => this.#scheduleChord(index + 1), CHORD_SECONDS * 1000));
  }

  /** A soft bell for the seed that lets go each minute. */
  seedBell() {
    if (!this.playing) return;
    const t = this.ctx.currentTime + 0.05;
    this.#chime(84, t, 0.03);
    this.#chime(91, t + 0.18, 0.018);
  }

  async start() {
    if (this.playing) return true;
    if (!this.ctx && !this.#setup()) return false;
    await this.ctx.resume();
    this.playing = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(MASTER_VOLUME, t + 4); // fade in
    this.#scheduleChord(0);
    return true;
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 1.5); // fade out
    setTimeout(() => !this.playing && this.ctx.suspend(), 1700);
  }
}
