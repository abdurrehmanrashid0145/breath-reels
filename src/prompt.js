#!/usr/bin/env node
// What the "Make Reel" desktop shortcut runs: asks for the script in a window,
// then makes the reel(s) and opens the folder they were saved in.
//   node src/prompt.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');
const { parseScript } = require('./config');
const { reelsFolder } = require('./paths');

const ROOT = path.join(__dirname, '..');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lines = [];
let stage = 'script';

function finish(code) {
  rl.question('\nPress Enter to close this window.', () => process.exit(code));
}

console.log(`
  ===  MAKE A HOLD-YOUR-BREATH REEL  ===

  Type or paste your voiceover, one line per spoken line.
  When you're done, press Enter on an empty line.

  Optional extras:
    TITLE: HOLD YOUR BREATH / LUNG TEST     sets the big heading ("/" = new line)
    0:05 Tap like if you're still holding.  starts that line at 0:05
  Lines without a time are spaced out for you; the last one lands on the last lung.
  The lungs ding at about 0:12, 0:27, 0:42 and 0:56.
`);
process.stdout.write('> ');

rl.on('line', line => {
  if (stage === 'script') {
    if (line.trim() || !lines.length) {
      if (line.trim()) lines.push(line);
      process.stdout.write('> ');
      return;
    }
    let parsed;
    try { parsed = parseScript(lines.join('\n')); } catch (e) { console.log('\n' + e.message); return finish(1); }
    console.log('\nYour reel will say:');
    if (parsed.title) console.log('  Title:  ' + parsed.title.join(' / '));
    parsed.script.forEach(l => console.log(`  ${fmt(l.t)}  ${l.say}`));
    stage = 'count';
    process.stdout.write('\nHow many reels with this script? (each gets a different look) [1]: ');
    return;
  }
  if (stage === 'count') {
    stage = 'busy';
    const n = Math.max(1, Math.min(20, parseInt(line, 10) || 1));
    rl.pause();
    make(n);
  }
});
rl.on('close', () => { if (stage === 'script') process.exit(0); });

function fmt(t) {
  const s = Math.round(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function make(n) {
  // stay up to date if this is a git checkout (quietly skipped if offline or not git)
  spawnSync('git', ['pull', '--quiet'], { cwd: ROOT, stdio: 'ignore' });
  const file = path.join(os.tmpdir(), `breath-reel-script-${Date.now()}.txt`);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`\nMaking ${n} reel${n > 1 ? 's' : ''}. This takes about 3 to 5 minutes each, keep this window open...\n`);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'make.js'), '--script', file, '--count', String(n)], { cwd: ROOT, stdio: 'inherit' });
  fs.rmSync(file, { force: true });
  if (r.status !== 0) {
    console.log('\nSomething went wrong (see above). Send a screenshot of this window to Abdur.');
    return finish(1);
  }
  const dir = path.join(reelsFolder(), new Date().toISOString().slice(0, 10));
  console.log(`\nDone! Your reel${n > 1 ? 's are' : ' is'} in ${dir}`);
  const opener = process.platform === 'win32' ? ['explorer', [dir]] : process.platform === 'darwin' ? ['open', [dir]] : ['xdg-open', [dir]];
  spawnSync(opener[0], opener[1], { stdio: 'ignore' });
  finish(0);
}
