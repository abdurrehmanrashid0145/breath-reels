#!/usr/bin/env node
// Lists the reels made on this computer, per day, from .generations/<date>.log.
//   npm run generations            (count per day)
//   npm run generations -- 2026-11-19   (everything made that day)
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '.generations');
const day = process.argv[2];
let files = [];
try { files = fs.readdirSync(DIR).filter(f => f.endsWith('.log')).sort(); } catch {}
if (!files.length) { console.log('No reels logged yet. Each reel you make is added to .generations/<date>.log'); process.exit(0); }
if (day) {
  const f = path.join(DIR, day + '.log');
  console.log(fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : `Nothing logged on ${day}.`);
} else {
  let total = 0;
  for (const f of files) {
    const n = (fs.readFileSync(path.join(DIR, f), 'utf8').match(/^\[\d\d:\d\d\]/gm) || []).length;
    total += n;
    console.log(`${f.replace('.log', '')}  ${n} reel${n === 1 ? '' : 's'}`);
  }
  console.log(`total      ${total}`);
  console.log(`\nDetails for a day: npm run generations -- ${files[files.length - 1].replace('.log', '')}`);
}
