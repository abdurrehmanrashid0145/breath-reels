// Turns a (possibly partial) reel config into a fully resolved one.
// Anything set to "random" or left out is picked using the seed, so the same
// seed always gives the same reel and a new seed gives a different look,
// layout and script.
const fs = require('fs');
const path = require('path');

const BANK = JSON.parse(fs.readFileSync(path.join(__dirname, 'bank.json'), 'utf8'));

const LAYOUTS = ['track-left', 'track-right', 'track-center', 'ring', 'ring-top', 'zigzag'];
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

const SCRIPTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'scripts.json'), 'utf8'));
const CUES = [
  [0.3, 'intro'], [4.6, 'inhale'], [10.5, 'safety'], [15, 'lvl0'],
  [20, 'up1'], [26, 'lvl1'], [33, 'lvl1b'],
  [40, 'up2'], [46, 'lvl2'], [51.5, 'boss'],
];

// Picks the least-used option so far (random among ties) and counts it, so a
// batch never repeats anything until a pool runs out, and later batches
// prefer things earlier ones didn't use. `counts` is { dim: { key: n } }.
function freshPicker(counts = {}) {
  const batchHues = [];
  const hueGap = h => Math.min(...batchHues.map(b => Math.min(Math.abs(h - b), 36 - Math.abs(h - b))));
  return (r, dim, options) => {
    const c = (counts[dim] = counts[dim] || {});
    const key = o => (typeof o === 'string' ? o : JSON.stringify(o));
    const min = Math.min(...options.map(o => c[key(o)] || 0));
    let pool = options.filter(o => (c[key(o)] || 0) === min);
    // hues: also keep reels in the same batch far apart on the colour wheel
    if (dim === 'hue' && batchHues.length) { const best = Math.max(...pool.map(hueGap)); pool = pool.filter(h => hueGap(h) >= best - 2); }
    const choice = pick(r, pool);
    if (dim === 'hue') batchHues.push(choice);
    c[key(choice)] = (c[key(choice)] || 0) + 1;
    return choice;
  };
}
const plainPicker = () => (r, dim, options) => pick(r, options);

// {t1}..{t4} become a tier's spoken name + aura, {n1}..{n4} just its name.
function fill(line, tiers) {
  const vars = {};
  tiers.forEach((t, i) => { vars['t' + (i + 1)] = t.say; vars['n' + (i + 1)] = t.say.split(',')[0]; });
  return line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Voiceover timeline. Cue times scale with the hold length (defaults: 60 s hold, 66 s reel).
function autoScript(r, choose, hold, duration, tiers) {
  const s = hold / 60;
  const line = slot => fill(choose(r, 'script.' + slot, SCRIPTS[slot]), tiers);
  const out = CUES.map(([t, slot]) => ({ t: +(t * s).toFixed(2), say: line(slot) }));
  out.push({ t: hold - 3, say: 'Three.' }, { t: hold - 2, say: 'Two.' }, { t: hold - 1, say: 'One.' });
  out.push({ t: hold - 0.3, say: line('exhale') });
  if (duration - hold > 4) out.push({ t: hold + 3.4, say: line('cta') });
  return out;
}

function resolve(user = {}, choose = plainPicker()) {
  const seed = user.seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(seed);
  const rand = (v, fn) => (v === undefined || v === 'random' ? fn() : v);
  const fresh = (v, dim, options) => rand(v, () => choose(r, dim, options));
  const idx = n => [...Array(n).keys()];

  const duration = user.duration ?? 66;
  const hold = user.hold ?? 60;

  const scheme = fresh(user.scheme, 'scheme', Object.keys(SCHEMES));
  const hueIdx = fresh(user.hue, 'hue', idx(36));
  const palette = typeof user.palette === 'object' ? { angle: 135, ...user.palette } : makePalette(r, hueIdx, scheme);

  const accent = fresh(user.accent, 'accent', BANK.accents);
  const pillColor = rand(user.pillColor, () => pick(r, BANK.accents.filter(a => a !== accent)));

  let tiers = fresh(user.tiers, 'tiers', idx(BANK.tierSets.length));
  if (typeof tiers === 'number') tiers = BANK.tierSets[tiers];
  // tier colours: the classic set, or four hues spread around the palette
  const tierHue = r() < 0.5 ? null : palette.hue ?? 0;
  tiers = tiers.map((t, i) => ({ color: tierHue === null ? BANK.tierColors[i] : hsl(tierHue + 60 + i * 75, 85, 68), say: t.name.toLowerCase(), ...t }));

  const titleFont = fresh(user.titleFont, 'titleFont', FONTS);
  const style = {
    titleFont,
    bodyFont: rand(user.bodyFont, () => pick(r, FONTS.filter(f => f !== 'Bebas'))),
    header: fresh(user.header, 'header', ['card', 'open']),
    cards: fresh(user.cards, 'cards', CARD_STYLES),
    icons: rand(user.icons, () => pick(r, ['filled', 'filled', 'outline'])),
    background: fresh(user.background, 'background', BACKGROUNDS),
    pattern: rand(user.pattern, () => pick(r, ['grid', 'dots', 'none'])),
    radius: rand(user.radius, () => pick(r, [12, 18, 24, 30])),
    frame: rand(user.frame, () => r() < 0.6),
    sweep: rand(user.sweep, () => r() < 0.6),
    dimInactive: rand(user.dimInactive, () => r() < 0.5),
  };

  const voice = fresh(user.voice, 'voice', BANK.voices);

  return {
    seed,
    output: user.output ?? `out/reel-${seed}.mp4`,
    width: 1080, height: 1920,
    fps: user.fps ?? 30,
    duration, hold,
    layout: fresh(user.layout, 'layout', LAYOUTS),
    style,
    palette, accent, pillColor,
    trackColors: user.trackColors ?? [hsl((palette.hue ?? 260) + 20, 100, 90), hsl((palette.hue ?? 260) + 20, 90, 72)],
    ballGlow: rand(user.ballGlow, () => pick(r, BANK.accents)),
    ballFaces: fresh(user.ballFaces, 'ballFaces', BANK.ballFaces),
    title: fresh(user.title, 'title', BANK.titles),
    subtitle: fresh(user.subtitle, 'subtitle', BANK.subtitles),
    pill: fresh(user.pill, 'pill', BANK.pills),
    timerLabel: fresh(user.timerLabel, 'timerLabel', BANK.timerLabels),
    statuses: fresh(user.statuses, 'statuses', BANK.statuses),
    doneStatus: fresh(user.doneStatus, 'doneStatus', BANK.doneStatus),
    tiers,
    levels: user.levels ?? BANK.levels,
    footers: user.footers ?? BANK.footers,
    footerLeft: user.footerLeft ?? '',
    handle: user.handle ?? '',
    ball: { mode: 'step', step: 1, ...(user.ball || {}) },
    script: user.script && user.script !== 'auto' ? user.script : autoScript(r, choose, hold, duration, tiers),
    voice: { name: voice, speed: user.voiceSpeed ?? +(1.05 + r() * 0.12).toFixed(2), enabled: user.voiceover !== false },
    sound: { enabled: true, music: null, musicVolume: 0.3, sfxVolume: 0.55, ...(user.sound || {}) },
  };
}

module.exports = { resolve, rng, freshPicker, BANK, SCRIPTS, LAYOUTS, BACKGROUNDS };
