# breath-reels

Makes vertical (1080×1920) "HOLD YOUR BREATH" reels in the style of the viral lung-test reels:
a saturated background (blue, navy, black, purple, yellow, red, green or orange) with an always-moving background (rippling grid, square grid, 60° grid, turning sunburst or the original look), usually no title (about 1 in 3 reels gets a small one), a bold bar with arms reaching to each lung and an emoji ball sliding down it,
and four lungs going from wrecked to strong. A short, calm voiceover and a "ding" each time the ball
reaches a lung. Everything is generated locally and royalty-free. Every reel is randomised from its seed.

## Setup (Mac or Windows)

Install [Node.js](https://nodejs.org) (LTS), [Python 3.12](https://www.python.org/downloads/) (on Windows tick
"Add python.exe to PATH") and [Git](https://git-scm.com/downloads). Then, once:

```bash
git clone https://github.com/abdurrehmanrashid0145/breath-reels.git
cd breath-reels
npm run setup
```

On Windows you can skip the terminal after cloning: open the `breath-reels` folder (in your user folder)
and double-click **Setup (Windows).bat**. If you do type commands in PowerShell, use `npm.cmd run setup`
(plain `npm` is blocked by PowerShell's script policy on many PCs).

`npm run setup` installs everything else (browser, ffmpeg if missing, the free Kokoro voice, ~350 MB)
and puts a **Make Reel** shortcut on the Desktop. Running it again is safe.

## Make a reel without the terminal

Double-click **Make Reel** on the Desktop. A window opens: type or paste your lines, press Enter on an
empty line, pick how many reels (each gets a different look), and wait. The folder with the finished
reel opens by itself (Desktop/breath-reels/&lt;date&gt;/). The shortcut also pulls the latest version first.
Same thing from a terminal: `npm run reel`. Lost the shortcut? `npm run shortcut`.

## Make reels

```bash
npm run make -- --count 3                        # 3 reels that don't repeat each other
npm run make -- --count 2 --handle @yourhandle   # small handle at the bottom
npm run render -- configs/example.json           # a specific config
npm run stills -- configs/example.json           # 4 PNG previews instead of a video
```

Videos land on your Desktop in `breath-reels/<date>/` (Mac and Windows; add `--out <folder>` to save elsewhere), each with a `.json` holding the resolved config and the spoken lines with timings.
About 2.5–4.5 minutes per reel.

### Your own script

Write the voiceover yourself and the reel is timed to it (visuals still rotate as usual):

```bash
npm run make -- --script my-script.txt                                   # from a text file
npm run make -- --script "Let's test your lungs. Hold! | Tap like | Congrats!"   # inline, lines split by |
npm run make -- --script my-script.txt --title "HOLD YOUR BREATH / LUNG TEST"
```

One spoken line per line. Optional `TITLE: LINE ONE / LINE TWO` sets the on-screen title.
Start a line with a time like `0:05` to pin it; lines without a time are spaced out for you
(the first starts at once, the last lands on the last lung). The lungs ding at about 0:12, 0:27, 0:42 and 0:56.
See `scripts/example-script.txt`. `{n1}`..`{n4}` still say the tier names.

## The reel (60 s, timed like the viral original)

- 0–1 s: the ball pops in at the top of the bar. "Let's test your lungs. Ready? Hold!"
- The ball slides down and hits lung 1 (12 s), lung 2 (27 s), lung 3 (41.7 s) and lung 4 (56.5 s). Each lung pops and dings.
- In between, a few calm lines: like, comment which lungs you have, send to a friend, you can breathe if you need to, follow, "just a little more", "almost there", then "Congrats!" on the last lung.

## What gets randomised

| Thing | Options |
|---|---|
| Background | 5 designs × 8 colour families (`bank.json` `shades`; a batch spreads across both). Designs (`gridMode`): `wave` (rippling grid), `grid` (square), `diagonal` (60° grid), `rays` (turning sunburst), `classic` (original faint grid with ECG lines and icons). Grids move one way per reel (`gridDir`: `up`, `down`, `left`, `right` or `diagonal`). `npm run sheet` makes a picture of every background |
| Bar | white or black rotate automatically (`barStyle`). More designs can be set by hand: `neon`, `diamond`, `fill`, `thermo`, `candy`, `seconds`, `glass`, `dots`, `rainbow`. Arms to each lung (`"arms": false` turns them off) |
| Bar layout | `layout`: `left` (left to right), `right` (right to left), `straight` (no arms, `side` picks the side), `center` (lungs alternate sides), `zigzag` (the ball zigzags between stops). A batch spreads across them |
| Title | none on about 2 in 3 reels (`"title": []` forces none), otherwise small; 20 titles (`bank.json` `titles`), 4 comic fonts (Bangers, Luckiest Guy, Titan One, Lilita One) |
| Bar side | left or right |
| Ball | 12 sets of yellow emoji faces (one per lung reached) |
| Lungs | 3 generated picture sets in `assets/lungs/` (cartoon SVG fallback) |
| Voice | 9 Kokoro voices; voiceover lines in `src/scripts.json`, one per moment |

## Your own lung pictures

Put four images in `assets/lungs/<set-name>/` named `1.png` (worst) to `4.png` (strongest).
See `assets/lungs/README.md`. Reels rotate between all complete sets.

## Config

Every field is optional; leave it out (or `"random"`) to randomise it.

```json
{
  "seed": 42,
  "output": "out/my-reel.mp4",
  "duration": 60,
  "hold": 57,
  "title": ["HOLD YOUR BREATH", "AURA CHECK"],
  "titleFont": "Bangers",
  "side": "right",
  "shade": 3,
  "lungs": "cartoon",
  "ballFaces": ["😮", "😌", "😤", "🥵", "😮‍💨"],
  "voice": "am_puck",
  "voiceSpeed": 1.1,
  "script": [{ "t": 0.3, "say": "Hold your breath. Let's go." }],
  "handle": "@yourhandle",
  "sound": { "enabled": true, "sfxVolume": 0.6, "music": null, "musicVolume": 0.3 }
}
```

- `script`: `"auto"` (default) builds the voiceover from `src/scripts.json`; or pass your own `{ t, say }` list.
- `voiceover: false` turns the voice off; `sound.enabled: false` turns the effects off.
- `sound.music`: optional path to a licensed track, mixed under the effects and ducked under the voice.

## Files

- `src/template.html`: the picture (HTML/CSS/SVG); `init(cfg)` builds it, `render(t)` sets every element for time `t`.
- `src/render.js`: drives headless Chromium frame by frame in parallel, encodes with ffmpeg, mixes audio.
- `src/tts.py`: voiceover with Kokoro.
- `src/audio.js`: sound effects (pop, lung dings, heartbeat, exhale whoosh, quiet pad).
- `src/config.js`: fills in a full config from a partial one.
- `src/make.js`: plans a batch so reels don't repeat, writes configs and renders.
- Every finished reel is logged in `.generations/<date>.log` on the computer that made it (script, background, lungs, voice, file). `npm run generations` shows how many were made each day; `npm run generations -- 2026-11-19` shows one day.
- `src/bank.json`, `src/scripts.json`: titles, shades, emoji sets, voices and voiceover lines.
- `.claude/skills/breath-reels/SKILL.md`: the Claude Code skill for making reels from this repo.
