#!/usr/bin/env node
// Plans N reels that don't repeat each other (background shade, title, font,
// bar side, emoji, voice and every voiceover line), writes their configs and renders them.
// Usage counts live in .history.json, so later batches prefer unused options too.
//   node src/make.js --count 3 [--handle @you] [--no-render]
//   node src/make.js --script my-script.txt   (your own voiceover lines; see scripts/example-script.txt)
//   node src/make.js --script "Let's test your lungs. Hold! | Tap like | Congrats!"
//   --title "HOLD YOUR BREATH / LUNG TEST" sets the on-screen title.
//   Videos go to Desktop/breath-reels/<date>/ (Mac and Windows); --out <folder> saves them somewhere else.
const fs = require('fs');
const path = require('path');
const { reelsFolder } = require('./paths');
const { resolve, freshPicker, parseScript, estimateSpeech } = require('./config');

const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, '.history.json');

const argv = process.argv.slice(2);
const get = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : def; };
const count = +get('--count', 1);
const stamp = new Date().toISOString().slice(0, 10);
const dir = path.join(ROOT, 'configs', stamp);
fs.mkdirSync(dir, { recursive: true });

// your own script: a file path or the lines typed inline
let manual = null;
if (get('--script')) {
  const arg = get('--script');
  const text = fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg;
  manual = parseScript(text);
  console.log('using your script:');
  manual.script.forEach(l => console.log(`  ${l.t.toFixed(1).padStart(5)}s  ${l.say}`));
  estimateSpeech(manual.script).warnings.forEach(w => console.log('  heads-up: ' + w));
}
const title = get('--title') ? get('--title').split('/').map(x => x.trim().toUpperCase()).filter(Boolean).slice(0, 2)
  : manual && manual.title;

const outDir = path.resolve(get('--out') || reelsFolder(), stamp);

let counts = {};
try { counts = JSON.parse(fs.readFileSync(HISTORY, 'utf8')); } catch {}
const choose = freshPicker(counts);

const files = [];
for (let i = 0; i < count; i++) {
  const seed = Math.floor(Math.random() * 1e9);
  const base = { seed, output: path.join(outDir, `reel-${seed}.mp4`) };
  if (get('--handle')) base.handle = get('--handle');
  if (manual) base.script = manual.script;
  if (title) base.title = title;
  const c = resolve(base, choose);
  // pin everything that was picked for freshness, so the render uses exactly these
  const cfg = {
    ...base,
    shade: c.shade,
    icon: c.bg.icon, side: c.side, titleFont: c.titleFont, title: c.title, lungs: c.lungs,
    tiers: c.tiers, ballFaces: c.ballFaces, voice: c.voice.name, script: c.script,
  };
  const f = path.join(dir, `reel-${seed}.json`);
  fs.writeFileSync(f, JSON.stringify(cfg, null, 2));
  files.push(f);
  console.log('wrote', path.relative(process.cwd(), f), `(${c.title.join(' / ')}, bar ${c.side}, ${c.titleFont}, lungs ${c.lungs})`);
}
fs.writeFileSync(HISTORY, JSON.stringify(counts));

if (!argv.includes('--no-render')) {
  const passthrough = argv.includes('--workers') ? ['--workers', get('--workers')] : [];
  require('./render').main([...files, ...passthrough]).catch(e => { console.error(e); process.exit(1); });
}
