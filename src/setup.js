#!/usr/bin/env node
// One-time setup on a new Mac or Windows PC:  npm run setup
// Installs the video browser, ffmpeg (if missing), the free Kokoro voice, and puts a
// "Make Reel" shortcut on the Desktop. Safe to run again; finished steps are skipped.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WIN = process.platform === 'win32';
const TTS = process.env.BREATH_REELS_TTS || path.join(os.homedir(), '.cache', 'breath-reels', 'tts');
const MODEL = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/';

const step = s => console.log(`\n== ${s}`);
const ok = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: WIN, ...opts });
  return !r.error && r.status === 0;
};
function fail(msg) { console.error('\nSetup stopped: ' + msg); process.exit(1); }

async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1e6) return;
  console.log('downloading ' + path.basename(file) + ' ...');
  const res = await fetch(url);
  if (!res.ok) fail(`download failed (${res.status}) ${url}`);
  const tmp = file + '.part';
  const out = fs.createWriteStream(tmp);
  const total = +res.headers.get('content-length') || 0;
  let got = 0, last = 0;
  for await (const chunk of res.body) {
    got += chunk.length;
    if (!out.write(chunk)) await new Promise(r => out.once('drain', r));
    if (total && got - last > total / 20) { last = got; process.stdout.write(`  ${Math.round(got / total * 100)}%\r`); }
  }
  await new Promise(r => out.end(r));
  fs.renameSync(tmp, file);
}

// Kokoro's onnxruntime needs Python 3.10 to 3.13
function findPython() {
  const tries = WIN ? [['py', ['-3.12']], ['py', ['-3.13']], ['py', ['-3.11']], ['py', ['-3.10']], ['python', []]]
    : [['python3.12', []], ['python3.13', []], ['python3.11', []], ['python3.10', []], ['python3', []]];
  for (const [cmd, pre] of tries) {
    const r = spawnSync(cmd, [...pre, '-c', 'import sys; print(sys.version_info[:2] >= (3, 10) and sys.version_info[:2] <= (3, 13))'], { encoding: 'utf8' });
    if (!r.error && r.stdout.trim() === 'True') return [cmd, pre];
  }
  return null;
}

(async () => {
  step('Installing packages');
  if (!ok('npm', ['install'])) fail('npm install failed');

  step('Installing the browser used to draw frames');
  if (!ok('npx', ['playwright', 'install', 'chromium'])) fail('could not install Chromium');

  step('Checking ffmpeg');
  const sys = !spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).error;
  let bundled = false;
  try { bundled = fs.existsSync(require(path.join(ROOT, 'node_modules', 'ffmpeg-static'))); } catch {}
  if (!sys && !bundled) fail('no ffmpeg found. Mac: brew install ffmpeg   Windows: winget install Gyan.FFmpeg   then run setup again');
  console.log(sys ? 'using the installed ffmpeg' : 'using the bundled ffmpeg');

  step('Setting up the voice (Python + Kokoro)');
  const venvPy = WIN ? path.join(ROOT, '.venv', 'Scripts', 'python.exe') : path.join(ROOT, '.venv', 'bin', 'python');
  if (!fs.existsSync(venvPy)) {
    const py = findPython();
    if (!py) fail('Python 3.10 to 3.13 is needed for the voice. Install 3.12 from https://www.python.org/downloads/ (on Windows tick "Add python.exe to PATH"), then run setup again');
    if (!ok(py[0], [...py[1], '-m', 'venv', path.join(ROOT, '.venv')], { shell: false })) fail('could not create the Python environment');
  }
  if (!ok(venvPy, ['-m', 'pip', 'install', '--quiet', '--timeout', '60', 'kokoro-onnx', 'soundfile'], { shell: false })) fail('pip install failed (check the internet connection and run setup again)');
  fs.mkdirSync(TTS, { recursive: true });
  await download(MODEL + 'kokoro-v1.0.onnx', path.join(TTS, 'kokoro-v1.0.onnx'));
  await download(MODEL + 'voices-v1.0.bin', path.join(TTS, 'voices-v1.0.bin'));

  step('Adding the "Make Reel" shortcut to the Desktop');
  require('./shortcut').install();

  console.log('\nAll set! Double-click "Make Reel" on the Desktop to make a reel.');
})().catch(e => fail(e.message));
