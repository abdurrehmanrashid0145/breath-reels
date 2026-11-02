// Turns a (possibly partial) reel config into a fully resolved one.
// Anything set to "random" or left out is picked using the seed, so the same
// seed always gives the same reel and a new seed gives a different one.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANK = JSON.parse(fs.readFileSync(path.join(__dirname, 'bank.json'), 'utf8'));
const SCRIPTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'scripts.json'), 'utf8'));

const FONTS = ['Bangers', 'Luckiest', 'Titan', 'Lilita'];
const SIDES = ['left', 'right'];
const ICONS = ['heart', 'plus', 'lung', 'pulse'];

// Lung picture sets: assets/lungs/<name>/1.png..4.png (worst to best). "cartoon" is the built-in SVG set.
function lungSets() {
  const dir = path.join(ROOT, 'assets', 'lungs');
  let sets = [];
  try {
    sets = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory()).filter(d => {
      const files = fs.readdirSync(path.join(dir, d));
      return [1, 2, 3, 4].every(i => files.some(f => new RegExp(`^${i}\\.(png|webp|jpe?g|svg)$`, 'i').test(f)));
    });
  } catch {}
  return sets.length ? sets.sort() : ['cartoon'];
}
function lungImages(set) {
  if (set === 'cartoon') return null;
  const dir = path.join(ROOT, 'assets', 'lungs', set);
  const files = fs.readdirSync(dir);
  return [1, 2, 3, 4].map(i => '../assets/lungs/' + set + '/' + files.find(f => new RegExp(`^${i}\\.(png|webp|jpe?g|svg)$`, 'i').test(f)));
}

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
const between = (r, a, b) => a + r() * (b - a);

// Ball path: where the nodes sit on the bar (fraction of its length) and where the ball starts.
const NODE_FRAC = [0.17, 0.44, 0.71, 0.97];
const START_FRAC = 0.03;
const DROP = 1.0;
// Same moments as the viral reel: dings at ~12, 27, 41.7 and 56.5 s of a 57 s hold.
function nodeTimes(hold) {
  return [12, 27, 41.7, 56.5].map(t => +(t * hold / 57).toFixed(2));
}

// Picks the least-used option so far (random among ties) and counts it, so a
// batch never repeats anything until a pool runs out, and later batches
// prefer things earlier ones didn't use. `counts` is { dim: { key: n } }.
function freshPicker(counts = {}) {
  return (r, dim, options) => {
    const c = (counts[dim] = counts[dim] || {});
    const key = o => (typeof o === 'string' ? o : JSON.stringify(o));
    const min = Math.min(...options.map(o => c[key(o)] || 0));
    const choice = pick(r, options.filter(o => (c[key(o)] || 0) === min));
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

// Voiceover modelled on the viral reel: a few short, calm lines that ask for likes,
// comments and shares, a "you can breathe" line, encouragement near the end, "Congrats!" on the last lung.
const CUES = [[0.3, 'intro'], [4.7, 'like'], [8.8, 'comment'], [16.1, 'share'], [21.9, 'breathe'],
  [31.2, 'mid'], [34.6, 'follow'], [46.9, 'push'], [49.2, 'almost']];
function autoScript(r, choose, hold, duration, tiers) {
  const s = hold / 57;
  const line = slot => fill(choose(r, 'script.' + slot, SCRIPTS[slot]), tiers);
  const out = CUES.map(([t, slot]) => ({ t: +(t * s).toFixed(2), say: line(slot) }));
  out.push({ t: nodeTimes(hold)[3] + 0.15, say: line('done') });
  return out;
}

function resolve(user = {}, choose = plainPicker()) {
  const seed = user.seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(seed);
  const rand = (v, fn) => (v === undefined || v === 'random' ? fn() : v);
  const fresh = (v, dim, options) => rand(v, () => choose(r, dim, options));
  const idx = n => [...Array(n).keys()];

  const duration = user.duration ?? 60;
  const hold = user.hold ?? 57;

  // pick a colour family first (so a batch spreads across blue, yellow, red, green, orange), then a shade in it
  const families = [...new Set(BANK.shades.map(x => x.family))];
  const family = user.shade !== undefined && user.shade !== 'random' ? BANK.shades[user.shade].family : fresh(user.color, 'color', families);
  const shade = fresh(user.shade, 'shade', idx(BANK.shades.length).filter(i => BANK.shades[i].family === family));
  const sh = BANK.shades[shade];
  const bg = {
    hue: sh.hue, sat: sh.sat, light: sh.light,
    angle: Math.round(between(r, 150, 210)),
    spotX: Math.round(between(r, 10, 90)), spotY: Math.round(between(r, 5, 60)),
    grid: pick(r, [60, 66, 72, 80, 90]), gx: Math.round(r() * 60), gy: Math.round(r() * 60),
    icon: fresh(user.icon, 'icon', ICONS),
    ecg: idx(1 + Math.floor(r() * 2)).map(i => ({ y: Math.round(i === 0 ? between(r, 150, 330) : between(r, 900, 1120)), amp: Math.round(between(r, 50, 90)), o: +between(r, 0.45, 0.75).toFixed(2), speed: Math.round(between(r, 18, 40)) })),
    icons: idx(7).map(i => ({ x: Math.round(between(r, 10, 650)), y: Math.round(180 + i * 150 + between(r, -40, 40)), s: Math.round(between(r, 28, 48)), o: +between(r, 0.35, 0.7).toFixed(2), ph: +(r() * 6.28).toFixed(2) })),
    motes: idx(10).map(() => ({ x: Math.round(r() * 720), y: Math.round(r() * 1280), r: Math.round(between(r, 4, 10)), v: +between(r, 4, 12).toFixed(1) })),
    ...(user.bg || {}),
  };

  let tiers = fresh(user.tiers, 'tiers', idx(BANK.tierSets.length));
  if (typeof tiers === 'number') tiers = BANK.tierSets[tiers];
  tiers = tiers.map(t => ({ say: t.name.toLowerCase(), ...t }));

  const lungs = fresh(user.lungs, 'lungs', lungSets());
  const voice = fresh(user.voice, 'voice', BANK.voices);

  return {
    seed,
    output: user.output ?? `out/reel-${seed}.mp4`,
    width: 1080, height: 1920,
    fps: user.fps ?? 30,
    duration, hold,
    nodeFrac: NODE_FRAC, startFrac: START_FRAC, dropTime: DROP, nodeTimes: nodeTimes(hold),
    shade, bg,
    side: fresh(user.side, 'side', SIDES),
    mirrorLungs: user.mirrorLungs ?? false,
    titleFont: fresh(user.titleFont, 'titleFont', FONTS),
    titleColor: rand(user.titleColor, () => (['yellow', 'orange'].includes(family) ? '#ffffff' : pick(r, BANK.titleColors))),
    title: fresh(user.title, 'title', BANK.titles),
    lungs, lungImages: user.lungImages ?? lungImages(lungs),
    ballFaces: fresh(user.ballFaces, 'ballFaces', BANK.ballFaces),
    tiers,
    handle: user.handle ?? '',
    script: user.script && user.script !== 'auto' ? user.script : autoScript(r, choose, hold, duration, tiers),
    voice: { name: voice, speed: user.voiceSpeed ?? +(1.0 + r() * 0.08).toFixed(2), enabled: user.voiceover !== false },
    sound: { enabled: true, music: null, musicVolume: 0.3, sfxVolume: 0.6, volume: 1, ...(user.sound || {}) },
  };
}

module.exports = { resolve, rng, freshPicker, nodeTimes, lungSets, BANK, SCRIPTS, FONTS };
