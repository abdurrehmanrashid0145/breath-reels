#!/usr/bin/env node
// Renders one or more reels from config files.
//   node src/render.js configs/my-reel.json [more.json ...] [--workers 4] [--stills]
// --stills writes a few PNG frames instead of a video (quick look at a design).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { resolve } = require('./config');
const audio = require('./audio');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = 'file://' + path.join(__dirname, 'template.html');

function run(cmd, args, opts = {}) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'pipe'], ...opts });
    let err = '';
    p.stderr.on('data', d => (err += d));
    p.on('close', code => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`))));
    if (opts.feed) opts.feed(p.stdin);
  });
}

async function openPage(browser, cfg) {
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: cfg.width / 720 });
  await page.goto(TEMPLATE);
  await page.evaluate(c => init(c), cfg);
  await page.evaluate(async () => {
    for (const f of ['Lato', 'Montserrat', 'Poppins', 'Bebas']) for (const w of [400, 700, 900]) await document.fonts.load(`${w} 20px ${f}`);
    await document.fonts.load('50px Emoji', '😊🔥');
    await document.fonts.ready;
    fitText();
  });
  return page;
}

// Each worker renders a contiguous range of frames into its own video segment.
async function renderSegment(browser, cfg, from, to, file) {
  const page = await openPage(browser, cfg);
  const cdp = await page.context().newCDPSession(page);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(cfg.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(cfg.fps), file], { stdio: ['pipe', 'ignore', 'inherit'] });
  const done = new Promise((ok, fail) => ff.on('close', c => (c === 0 ? ok() : fail(new Error('ffmpeg segment failed')))));
  for (let f = from; f < to; f++) {
    await page.evaluate(t => render(t), f / cfg.fps);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true, clip: { x: 0, y: 0, width: 720, height: 1280, scale: cfg.width / 720 } });
    const jpg = Buffer.from(data, 'base64');
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  await page.close();
}

// Voiceover via src/tts.py (Kokoro). Saves the spoken script next to the video too.
async function voiceover(cfg, tmp, file) {
  const job = path.join(tmp, 'tts.json');
  fs.writeFileSync(job, JSON.stringify({ voice: cfg.voice.name, speed: cfg.voice.speed, duration: cfg.duration, lines: cfg.script }));
  const py = process.env.PYTHON || 'python3';
  const out = await new Promise((ok, fail) => {
    const p = spawn(py, [path.join(__dirname, 'tts.py'), job, file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let o = '', e = '';
    p.stdout.on('data', d => (o += d)); p.stderr.on('data', d => (e += d));
    p.on('close', c => (c === 0 ? ok(o) : fail(new Error('voiceover failed (run scripts/setup-voice.sh?)\n' + e.slice(-1500)))));
  });
  cfg.spoken = JSON.parse(out.trim().split('\n').pop());
}

async function renderReel(browser, cfg, workers) {
  const out = path.resolve(ROOT, cfg.output);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
  const total = Math.round(cfg.duration * cfg.fps);
  const per = Math.ceil(total / workers);
  const t0 = Date.now();

  const segs = [];
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const from = w * per, to = Math.min(total, from + per);
    if (from >= to) break;
    const file = path.join(tmp, `seg${w}.mp4`);
    segs.push(file);
    jobs.push(renderSegment(browser, cfg, from, to, file));
  }
  const wav = path.join(tmp, 'sfx.wav');
  const voice = path.join(tmp, 'voice.wav');
  if (cfg.sound.enabled) audio.generate(cfg, wav);
  if (cfg.voice.enabled) jobs.push(voiceover(cfg, tmp, voice));
  await Promise.all(jobs);

  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
  // audio: sound effects (+ optional music) form a bed that ducks under the voiceover
  const inputs = [];
  if (cfg.sound.enabled) inputs.push(['sfx', wav]);
  if (cfg.voice.enabled) inputs.push(['voice', voice]);
  if (cfg.sound.enabled && cfg.sound.music) inputs.push(['music', path.resolve(ROOT, cfg.sound.music)]);
  if (inputs.length) {
    const idx = {};
    inputs.forEach(([k, f], i) => { idx[k] = i + 1; if (k === 'music') args.push('-stream_loop', '-1'); args.push('-i', f); });
    const fmt = 'aformat=sample_rates=44100:channel_layouts=stereo';
    const fc = [];
    const bed = [];
    if (idx.sfx) { fc.push(`[${idx.sfx}:a]${fmt},volume=${cfg.sound.sfxVolume}[sfx]`); bed.push('[sfx]'); }
    if (idx.music) { fc.push(`[${idx.music}:a]${fmt},volume=${cfg.sound.musicVolume},afade=t=out:st=${cfg.duration - 2}:d=2[mus]`); bed.push('[mus]'); }
    if (bed.length > 1) fc.push(`${bed.join('')}amix=inputs=${bed.length}:duration=first:normalize=0[bed]`);
    else if (bed.length) fc.push(`${bed[0]}anull[bed]`);
    if (idx.voice) {
      fc.push(`[${idx.voice}:a]${fmt},volume=1.0,asplit=2[vo][vk]`);
      if (bed.length) fc.push('[bed][vk]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350[duck]', '[duck][vo]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]');
      else fc.push('[vk]anullsink', '[vo]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]');
    } else fc.push('[bed]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]');
    args.push('-filter_complex', fc.join(';'), '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k');
  }
  args.push('-c:v', 'copy', '-t', String(cfg.duration), '-movflags', '+faststart', out);
  await run('ffmpeg', args);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(out.replace(/\.mp4$/, '.json'), JSON.stringify(cfg, null, 2));
  console.log(`✓ ${path.relative(ROOT, out)}  (${((Date.now() - t0) / 1000).toFixed(1)}s, seed ${cfg.seed})`);
  return out;
}

async function renderStills(browser, cfg, times = [1.5, 21.5, 46.5, cfg.hold + 1.5]) {
  const page = await openPage(browser, cfg);
  const base = path.resolve(ROOT, cfg.output).replace(/\.mp4$/, '');
  fs.mkdirSync(path.dirname(base), { recursive: true });
  for (const t of times) {
    await page.evaluate(x => render(x), t);
    await page.screenshot({ path: `${base}-${t}s.png` });
  }
  await page.close();
  console.log(`✓ stills ${path.relative(ROOT, base)}-*.png`);
}

async function main(argv = process.argv.slice(2)) {
  const opt = { workers: Math.max(1, Math.min(4, os.cpus().length)), stills: false };
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--workers') opt.workers = +argv[++i];
    else if (argv[i] === '--stills') opt.stills = true;
    else files.push(argv[i]);
  }
  if (!files.length) { console.error('usage: node src/render.js <config.json> [...] [--workers N] [--stills]'); process.exit(1); }

  const browser = await chromium.launch();
  try {
    for (const f of files) {
      const cfg = resolve(JSON.parse(fs.readFileSync(f, 'utf8')));
      if (opt.stills) await renderStills(browser, cfg);
      else await renderReel(browser, cfg, opt.workers);
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { main, renderReel };
