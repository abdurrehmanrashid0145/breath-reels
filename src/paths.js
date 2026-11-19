// Where finished reels go: the Desktop (OneDrive's Desktop on Windows when that's the real one).
const fs = require('fs');
const os = require('os');
const path = require('path');

function desktop() {
  const home = os.homedir();
  const opts = [path.join(home, 'Desktop'), path.join(home, 'OneDrive', 'Desktop')];
  if (process.platform === 'win32') opts.reverse();
  return opts.find(d => fs.existsSync(d)) || path.join(home, 'Desktop');
}
const reelsFolder = () => path.join(desktop(), 'breath-reels');

module.exports = { desktop, reelsFolder };
