#!/usr/bin/env node
// Writes N random reel configs (new seed each, so new palette, captions and title)
// and renders them.
//   node src/make.js --count 3 [--ball step|smooth] [--step 0.5] [--handle @you] [--no-render]
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const get = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : def; };
const count = +get('--count', 1);
const stamp = new Date().toISOString().slice(0, 10);
const dir = path.join(__dirname, '..', 'configs', stamp);
fs.mkdirSync(dir, { recursive: true });

const files = [];
for (let i = 0; i < count; i++) {
  const seed = Math.floor(Math.random() * 1e9);
  const cfg = { seed, output: `out/${stamp}/reel-${seed}.mp4` };
  if (get('--ball')) cfg.ball = { mode: get('--ball'), step: +get('--step', 1) };
  if (get('--handle')) cfg.handle = get('--handle');
  const f = path.join(dir, `reel-${seed}.json`);
  fs.writeFileSync(f, JSON.stringify(cfg, null, 2));
  files.push(f);
  console.log('wrote', path.relative(process.cwd(), f));
}

if (!argv.includes('--no-render')) {
  const passthrough = argv.includes('--workers') ? ['--workers', get('--workers')] : [];
  require('./render').main([...files, ...passthrough]).catch(e => { console.error(e); process.exit(1); });
}
