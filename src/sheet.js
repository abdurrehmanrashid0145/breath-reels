#!/usr/bin/env node
// Contact sheet of every background: each design (rows) in every colour family (columns).
//   npm run sheet [-- --out backgrounds.png]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { resolve, BANK, GRID_MODES } = require('./config');

const TEMPLATE = 'file://' + path.join(__dirname, 'template.html');
const LABEL = {
  wave: 'Wave grid (ripples, drifts one way)', grid: 'Square grid (moves up, down, left, right or 60°)',
  diagonal: '60° diagonal grid (moves one way)', rays: 'Sunburst (turns slowly)', classic: 'Original (faint grid, ECG lines, icons)',
};

async function main() {
  const argv = process.argv.slice(2);
  const out = path.resolve(argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'backgrounds.png');
  const families = [...new Set(BANK.shades.map(s => s.family))];
  const browser = await chromium.launch();
  const tiles = {};
  for (const mode of GRID_MODES) {
    for (const fam of families) {
      const shade = BANK.shades.findIndex(s => s.family === fam);
      const cfg = resolve({ seed: 7, shade, gridMode: mode, gridDir: 'diagonal', title: [], lungs: 'set-c', side: 'left', barStyle: 'white', voiceover: false });
      const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
      await page.goto(TEMPLATE);
      await page.evaluate(c => init(c), cfg);
      await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); await document.fonts.ready; });
      await page.evaluate(() => render(20));
      tiles[mode + fam] = (await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64');
      await page.close();
    }
  }
  const W = 200, H = 356;
  const html = `<body style="margin:0;background:#111;color:#fff;font:600 20px system-ui;padding:24px">
    <div style="font-size:34px;margin-bottom:6px">Breath Hold Club: every background</div>
    <div style="opacity:.75;margin-bottom:20px">${GRID_MODES.length} designs × ${families.length} colours = ${GRID_MODES.length * families.length}. Grids move one way per reel: up, down, left, right or diagonal (60°). Each colour also has 2–4 shades.</div>
    <div style="display:grid;grid-template-columns:250px repeat(${families.length},${W}px);gap:10px;align-items:center">
      <div></div>${families.map(f => `<div style="text-align:center;text-transform:capitalize">${f}</div>`).join('')}
      ${GRID_MODES.map(m => `<div style="font-size:19px;line-height:1.3">${LABEL[m]}</div>` + families.map(f => `<img style="width:${W}px;height:${H}px;border-radius:10px;display:block" src="data:image/jpeg;base64,${tiles[m + f]}">`).join('')).join('')}
    </div></body>`;
  const page = await browser.newPage({ viewport: { width: 300 + families.length * (W + 10), height: 400 } });
  await page.setContent(html);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log('✓ ' + out);
}
main().catch(e => { console.error(e); process.exit(1); });
