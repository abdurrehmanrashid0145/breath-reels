#!/usr/bin/env node
// Plans N reels that don't repeat each other (layout, colours, title, tiers,
// emoji, voice and every voiceover line), writes their configs and renders them.
// Usage counts live in .history.json, so later batches prefer unused options too.
//   node src/make.js --count 3 [--ball step|smooth] [--step 0.5] [--handle @you] [--no-render]
const fs = require('fs');
const path = require('path');
const { resolve, freshPicker } = require('./config');

const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, '.history.json');

const argv = process.argv.slice(2);
const get = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : def; };
const count = +get('--count', 1);
const stamp = new Date().toISOString().slice(0, 10);
const dir = path.join(ROOT, 'configs', stamp);
fs.mkdirSync(dir, { recursive: true });

let counts = {};
try { counts = JSON.parse(fs.readFileSync(HISTORY, 'utf8')); } catch {}
const choose = freshPicker(counts);

const files = [];
for (let i = 0; i < count; i++) {
  const seed = Math.floor(Math.random() * 1e9);
  const base = { seed, output: `out/${stamp}/reel-${seed}.mp4` };
  if (get('--ball')) base.ball = { mode: get('--ball'), step: +get('--step', 1) };
  if (get('--handle')) base.handle = get('--handle');
  const c = resolve(base, choose);
  // pin everything that was picked for freshness, so the render uses exactly these
  const cfg = {
    ...base,
    layout: c.layout, hue: Math.round(c.palette.hue / 10), scheme: c.palette.name.split('-')[1],
    background: c.style.background, header: c.style.header, cards: c.style.cards, titleFont: c.style.titleFont,
    accent: c.accent, title: c.title, subtitle: c.subtitle, pill: c.pill, timerLabel: c.timerLabel,
    tiers: c.tiers.map(({ color, ...t }) => t), statuses: c.statuses, doneStatus: c.doneStatus,
    ballFaces: c.ballFaces, voice: c.voice.name, script: c.script,
  };
  const f = path.join(dir, `reel-${seed}.json`);
  fs.writeFileSync(f, JSON.stringify(cfg, null, 2));
  files.push(f);
  console.log('wrote', path.relative(process.cwd(), f), `(${c.layout}, ${c.palette.name}, ${c.style.background})`);
}
fs.writeFileSync(HISTORY, JSON.stringify(counts));

if (!argv.includes('--no-render')) {
  const passthrough = argv.includes('--workers') ? ['--workers', get('--workers')] : [];
  require('./render').main([...files, ...passthrough]).catch(e => { console.error(e); process.exit(1); });
}
