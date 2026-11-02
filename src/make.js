#!/usr/bin/env node
// Plans N reels that don't repeat each other (background shade, title, font,
// bar side, emoji, voice and every voiceover line), writes their configs and renders them.
// Usage counts live in .history.json, so later batches prefer unused options too.
//   node src/make.js --count 3 [--handle @you] [--no-render]
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
  if (get('--handle')) base.handle = get('--handle');
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
