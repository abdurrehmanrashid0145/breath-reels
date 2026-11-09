#!/usr/bin/env node
// Puts a "Make Reel" shortcut on the Desktop that opens the script window (src/prompt.js).
//   node src/shortcut.js     (also run by: npm run setup)
const fs = require('fs');
const path = require('path');
const { desktop } = require('./paths');

const ROOT = path.resolve(__dirname, '..');
const node = process.execPath;

function install() {
  const dir = desktop();
  fs.mkdirSync(dir, { recursive: true });
  let file;
  if (process.platform === 'win32') {
    file = path.join(dir, 'Make Reel.bat');
    fs.writeFileSync(file, `@echo off\r\ntitle Make Reel\r\ncd /d "${ROOT}"\r\n"${node}" src\\prompt.js\r\n`);
  } else {
    // .command opens in Terminal when double-clicked on a Mac
    file = path.join(dir, process.platform === 'darwin' ? 'Make Reel.command' : 'make-reel.sh');
    const q = s => `'${s.replace(/'/g, `'\\''`)}'`;
    fs.writeFileSync(file, `#!/bin/bash\ncd ${q(ROOT)} && ${q(node)} src/prompt.js\n`);
    fs.chmodSync(file, 0o755);
  }
  console.log('Shortcut ready: ' + file);
  return file;
}

if (require.main === module) install();
module.exports = { install };
