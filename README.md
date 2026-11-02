# breath-reels

Makes vertical (1080×1920) "HOLD YOUR BREATH" reels in the style of the viral lung-test reels:
a bright blue medical background, a big comic title, a white bar with an emoji ball sliding down it,
and four lungs going from wrecked to strong. A short roast voiceover and a "ding" each time the ball
reaches a lung. Everything is generated locally and royalty-free. Every reel is randomised from its seed.

## Setup

Needs Node 18+, Python 3.9+ and ffmpeg.

```bash
npm install
npx playwright install chromium
bash scripts/setup-voice.sh     # Python venv + Kokoro TTS model (~350 MB), free and offline
```

## Make reels

```bash
npm run make -- --count 3                        # 3 reels that don't repeat each other
npm run make -- --count 2 --handle @yourhandle   # small handle at the bottom
npm run render -- configs/example.json           # a specific config
npm run stills -- configs/example.json           # 4 PNG previews instead of a video
```

Videos land in `out/<date>/`, each with a `.json` holding the resolved config and the spoken lines with timings.
About 2.5–4.5 minutes per reel.

## The reel (62 s)

- 0–1 s: the ball pops in at the top of the bar.
- The ball slides down and hits lung 1 (~9 s), lung 2 (~25 s), lung 3 (~40 s) and lung 4 (55 s). Each lung pops and dings.
- Countdown "Three, two, one", exhale line at 55 s, then a short call to action.

## What gets randomised

| Thing | Options |
|---|---|
| Background | 12 blue shades (`bank.json` `shades`), gradient angle, light spot, grid size, ECG lines, 4 icon types |
| Title | 20 titles (`bank.json` `titles`), 4 comic fonts (Bangers, Luckiest Guy, Titan One, Lilita One) |
| Bar side | left or right |
| Ball | 12 sets of yellow emoji faces (one per lung reached) |
| Lungs | 3 generated picture sets in `assets/lungs/` (cartoon SVG fallback) |
| Voice | 9 Kokoro voices; roast lines in `src/scripts.json`, one per moment |

## Your own lung pictures

Put four images in `assets/lungs/<set-name>/` named `1.png` (worst) to `4.png` (strongest).
See `assets/lungs/README.md`. Reels rotate between all complete sets.

## Config

Every field is optional; leave it out (or `"random"`) to randomise it.

```json
{
  "seed": 42,
  "output": "out/my-reel.mp4",
  "duration": 62,
  "hold": 55,
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
- `src/bank.json`, `src/scripts.json`: titles, shades, emoji sets, voices and voiceover lines.
- `.claude/skills/breath-reels/SKILL.md`: the Claude Code skill for making reels from this repo.
