// Turns a (possibly partial) reel config into a fully resolved one.
// Anything set to "random" or left out is picked using the seed, so the same
// seed always gives the same reel and a new seed gives a different look,
// layout and script.
const fs = require('fs');
const path = require('path');

const BANK = JSON.parse(fs.readFileSync(path.join(__dirname, 'bank.json'), 'utf8'));

const LAYOUTS = ['track-left', 'track-right', 'track-center', 'ring'];
const BACKGROUNDS = ['blobs', 'spotlight', 'stripes', 'aurora', 'dots'];
const CARD_STYLES = ['glass', 'neon', 'solid'];
const FONTS = ['Lato', 'Montserrat', 'Poppins', 'Bebas'];
const SCHEMES = { analogous: [0, 30, -30], complement: [0, 180, 30], triad: [0, 120, 240], split: [0, 150, 210] };

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

// 36 base hues x 4 colour schemes = 144 palettes; `hue` (0-35) and `scheme` can be fixed in config.
function makePalette(r, hueIdx, scheme) {
  const h = hueIdx * 10;
  const off = SCHEMES[scheme];
  return {
    name: `hue${hueIdx}-${scheme}`,
    hue: h,
    angle: Math.floor(r() * 360),
    colors: [hsl(h, 65, 9), hsl(h + off[1] / 3, 60, 17), hsl(h - 15, 70, 6)],
    blobs: off.map(o => hsl(h + o, 90, 55)),
  };
}

function lineFor(r, used, phase, vars) {
  const pool = BANK.script[phase].filter(l => !used.has(l));
  const line = pick(r, pool.length ? pool : BANK.script[phase]);
  used.add(line);
  return line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Voiceover timeline. Cue times scale with the hold length (defaults: 60 s hold, 66 s reel).
function autoScript(r, hold, duration, tiers) {
  const used = new Set();
  const vars = { t1: tiers[0].say, t2: tiers[1].say, t3: tiers[2].say, t4: tiers[3].say };
  const s = hold / 60;
  const cues = [
    [0.3, 'intro'], [4, 'inhale'], [10.5, 'safety'], [15, 'lvl0'],
    [20, 'up1'], [26, 'lvl1'], [33, 'lvl1b'],
    [40, 'up2'], [46, 'lvl2'], [51.5, 'boss'],
  ];
  const out = cues.map(([t, ph]) => ({ t: +(t * s).toFixed(2), say: lineFor(r, used, ph, vars) }));
  out.push({ t: hold - 3, say: 'Three.' }, { t: hold - 2, say: 'Two.' }, { t: hold - 1, say: 'One.' });
  out.push({ t: hold + 0.1, say: lineFor(r, used, 'exhale', vars) });
  if (duration - hold > 4) out.push({ t: hold + 3.4, say: lineFor(r, used, 'cta', vars) });
  return out;
}

function resolve(user = {}) {
  const seed = user.seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(seed);
  const rand = (v, fn) => (v === undefined || v === 'random' ? fn() : v);

  const duration = user.duration ?? 66;
  const hold = user.hold ?? 60;

  const scheme = rand(user.scheme, () => pick(r, Object.keys(SCHEMES)));
  const hueIdx = rand(user.hue, () => Math.floor(r() * 36));
  const palette = typeof user.palette === 'object' ? { angle: 135, ...user.palette } : makePalette(r, hueIdx, scheme);

  const accent = rand(user.accent, () => pick(r, BANK.accents));
  const pillColor = rand(user.pillColor, () => pick(r, BANK.accents.filter(a => a !== accent)));

  let tiers = rand(user.tiers, () => pick(r, BANK.tierSets));
  if (typeof tiers === 'number') tiers = BANK.tierSets[tiers];
  // tier colours: the classic set, or four hues spread around the palette
  const tierHue = r() < 0.5 ? null : palette.hue ?? 0;
  tiers = tiers.map((t, i) => ({ color: tierHue === null ? BANK.tierColors[i] : hsl(tierHue + 60 + i * 75, 85, 68), say: t.name.toLowerCase(), ...t }));

  const titleFont = rand(user.titleFont, () => pick(r, FONTS));
  const style = {
    titleFont,
    bodyFont: rand(user.bodyFont, () => pick(r, FONTS.filter(f => f !== 'Bebas'))),
    header: rand(user.header, () => pick(r, ['card', 'open'])),
    cards: rand(user.cards, () => pick(r, CARD_STYLES)),
    icons: rand(user.icons, () => pick(r, ['filled', 'filled', 'outline'])),
    background: rand(user.background, () => pick(r, BACKGROUNDS)),
    pattern: rand(user.pattern, () => pick(r, ['grid', 'dots', 'none'])),
    radius: rand(user.radius, () => pick(r, [12, 18, 24, 30])),
    frame: rand(user.frame, () => r() < 0.6),
    sweep: rand(user.sweep, () => r() < 0.6),
    dimInactive: rand(user.dimInactive, () => r() < 0.5),
  };

  const voice = rand(user.voice, () => pick(r, BANK.voices));

  return {
    seed,
    output: user.output ?? `out/reel-${seed}.mp4`,
    width: 1080, height: 1920,
    fps: user.fps ?? 30,
    duration, hold,
    layout: rand(user.layout, () => pick(r, LAYOUTS)),
    style,
    palette, accent, pillColor,
    trackColors: user.trackColors ?? [hsl((palette.hue ?? 260) + 20, 100, 90), hsl((palette.hue ?? 260) + 20, 90, 72)],
    ballGlow: rand(user.ballGlow, () => pick(r, BANK.accents)),
    ballFaces: rand(user.ballFaces, () => pick(r, BANK.ballFaces)),
    title: rand(user.title, () => pick(r, BANK.titles)),
    subtitle: rand(user.subtitle, () => pick(r, BANK.subtitles)),
    pill: rand(user.pill, () => pick(r, BANK.pills)),
    timerLabel: rand(user.timerLabel, () => pick(r, BANK.timerLabels)),
    statuses: rand(user.statuses, () => pick(r, BANK.statuses)),
    doneStatus: rand(user.doneStatus, () => pick(r, BANK.doneStatus)),
    tiers,
    levels: user.levels ?? BANK.levels,
    footers: user.footers ?? BANK.footers,
    footerLeft: user.footerLeft ?? '',
    handle: user.handle ?? '',
    ball: { mode: 'step', step: 1, ...(user.ball || {}) },
    script: user.script && user.script !== 'auto' ? user.script : autoScript(r, hold, duration, tiers),
    voice: { name: voice, speed: user.voiceSpeed ?? +(1.05 + r() * 0.12).toFixed(2), enabled: user.voiceover !== false },
    sound: { enabled: true, music: null, musicVolume: 0.3, sfxVolume: 0.55, ...(user.sound || {}) },
  };
}

module.exports = { resolve, rng, BANK, LAYOUTS, BACKGROUNDS };
