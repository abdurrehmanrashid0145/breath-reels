// Procedural, royalty-free soundtrack: ambient pad, a tick on every ball step,
// a chime on each level-up, a heartbeat that speeds up near the end, an exhale
// whoosh when the hold ends and a soft resolve chord. Writes a 16-bit stereo WAV.
const fs = require('fs');
const { rng } = require('./config');

const SR = 44100;
const CHORDS = [
  [45, 52, 55, 59, 60],   // Am9
  [41, 48, 52, 55, 57],   // Fmaj7add9
  [43, 50, 53, 57, 58],   // Gm9
  [38, 45, 48, 52, 53],   // Dm9
  [40, 47, 50, 54, 55],   // Em9
];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

function generate(cfg, file) {
  const r = rng(cfg.seed + 7);
  const N = Math.ceil(cfg.duration * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  const H = cfg.hold;
  const chord = CHORDS[Math.floor(r() * CHORDS.length)];

  // --- ambient pad (detuned sines, slow swells, one-pole lowpass) ---
  const voices = chord.map((n, i) => ({ f: midi(n + 12), ph: r() * 6.28, ph2: r() * 6.28, lfo: 0.05 + r() * 0.08, pan: (i / (chord.length - 1)) * 1.4 - 0.7 }));
  let lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let l = 0, rr = 0;
    for (const v of voices) {
      v.ph += 2 * Math.PI * v.f / SR; v.ph2 += 2 * Math.PI * v.f * 1.003 / SR;
      const amp = 0.6 + 0.4 * Math.sin(2 * Math.PI * v.lfo * t + v.pan * 3);
      const s = (Math.sin(v.ph) + Math.sin(v.ph2) + 0.25 * Math.sin(2 * v.ph)) * amp;
      l += s * (0.5 - v.pan * 0.5); rr += s * (0.5 + v.pan * 0.5);
    }
    // pad gets darker towards the end of the hold, opens back up on the exhale
    const bright = t < H ? 0.08 - 0.05 * Math.min(1, t / H) : 0.12;
    lpL += (l - lpL) * bright; lpR += (rr - lpR) * bright;
    const env = Math.min(1, t / 2.5) * Math.min(1, (cfg.duration - t) / 2);
    L[i] += lpL * 0.045 * env; R[i] += lpR * 0.045 * env;
  }

  const add = (t0, fn, len, gain = 1, pan = 0) => {
    const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
    for (let k = 0; k < n && s0 + k < N; k++) {
      const v = fn(k / SR) * gain;
      L[s0 + k] += v * (1 - pan) * 0.5 * 2; R[s0 + k] += v * (1 + pan) * 0.5 * 2;
    }
  };

  // --- ticks on every ball step (every 1 s in smooth mode) ---
  const step = cfg.ball.mode === 'smooth' ? 1 : cfg.ball.step;
  for (let t = step, k = 1; t < H - 0.01; t += step, k++) {
    const f = k % 2 ? 1750 : 1320;
    const g = (k * step) % 10 === 0 ? 0.32 : 0.2;
    add(t, x => (Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 90) + (r() * 2 - 1) * Math.exp(-x * 400) * 0.4), 0.08, g, k % 2 ? 0.15 : -0.15);
  }

  // --- level-up chimes ---
  const bell = f => x => (Math.sin(2 * Math.PI * f * x) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * x) * Math.exp(-x * 4) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * x) * Math.exp(-x * 8)) * Math.exp(-x * 2.2);
  for (let lv = 1; lv <= 3; lv++) {
    const t = (H / 3) * lv;
    const root = chord[0] + 24 + lv * 2;
    [0, 4, 7, 12].slice(0, lv + 1).forEach((iv, j) => add(t + j * 0.09, bell(midi(root + iv)), 2.2, 0.09, (j - 1.5) * 0.3));
  }

  // --- heartbeat in the final quarter, speeding up ---
  let t = H * 0.75;
  while (t < H - 0.3) {
    const p = (t - H * 0.75) / (H * 0.25);
    const thump = (x) => Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-x * 30)) * x) * Math.exp(-x * 18);
    add(t, thump, 0.3, 0.35 + 0.25 * p);
    add(t + 0.22, thump, 0.3, 0.22 + 0.15 * p);
    t += 1.0 - 0.35 * p;
  }

  // --- low "final boss" swell into the end of the hold ---
  add(H - 8, x => Math.sin(2 * Math.PI * midi(chord[0] - 12) * x) * Math.pow(x / 8, 2), 8, 0.22);

  // --- exhale whoosh (filtered noise) ---
  let w = 0;
  add(H - 0.1, x => { w += ((r() * 2 - 1) - w) * (0.02 + 0.1 * Math.exp(-x * 2)); return w * Math.min(1, x / 0.25) * Math.exp(-x * 1.6) * 3; }, 2.5, 0.5);

  // --- resolve chord on the exhale ---
  chord.forEach((n, j) => add(H + 0.15 + j * 0.06, bell(midi(n + 24)), 4, 0.06, (j - 2) * 0.25));

  // master: gain, soft clip, normalise
  let peak = 0;
  for (let i = 0; i < N; i++) {
    L[i] = Math.tanh(L[i] * 1.2 * cfg.sound.volume); R[i] = Math.tanh(R[i] * 1.2 * cfg.sound.volume);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = peak > 0 ? 0.89 / peak : 1;
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

module.exports = { generate };
