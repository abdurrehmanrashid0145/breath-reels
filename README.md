# breath-reels

Config-driven generator for vertical (1080×1920) Gen Z "breath-hold aura check" reels:
four lung tiers, an emoji ball that moves while you hold your breath, aura pop-ups,
a hype voiceover and a generated, royalty-free sound bed. No on-screen disclaimers; optional `footerLeft` / `footers` config fields add footer text if you want it. Every reel is randomised
from its seed, so no two look or sound the same.

## Setup

Needs Node 18+, Python 3.9+ and ffmpeg.

```bash
npm install
npx playwright install chromium
bash scripts/setup-voice.sh     # Python venv + Kokoro TTS model (~350 MB), free and offline
```

The voice model goes to `~/.cache/breath-reels/tts` (override with `BREATH_REELS_TTS`).

## Make reels

```bash
npm run make -- --count 3                        # 3 fully random reels
npm run make -- --count 2 --ball step --step 0.5 --handle @yourhandle
npm run render -- configs/example.json           # a specific config
npm run stills -- configs/example.json           # 4 PNG previews instead of a video
```

Videos land in `out/`, each with a `.json` holding the resolved config and the spoken
script with timings. About 2.5 minutes per reel on a 4-core machine.

## What gets randomised

| Thing | Options |
|---|---|
| Layout | `track-left`, `track-right`, `track-center`, `ring` |
| Palette | 36 hues × 4 schemes (`analogous`, `complement`, `triad`, `split`) |
| Background | `blobs`, `spotlight`, `stripes`, `aurora`, `dots` + grid/dots/none pattern |
| Type | title and body fonts from Lato, Montserrat, Poppins, Bebas |
| Cards | `glass`, `neon`, `solid`; lung icons `filled` or `outline`; corner radius |
| Ball | emoji set (changes per level), glow colour |
| Words | title, subtitle, header pill, tier set, status texts |
| Voice | 10 Kokoro voices, speed 1.05–1.17, script mixed from `bank.json` |

## Config

Every field is optional; leave it out (or set `"random"`) to randomise it.

```json
{
  "seed": 42,
  "output": "out/my-reel.mp4",
  "duration": 66,
  "hold": 60,
  "layout": "ring",
  "hue": 27,
  "scheme": "triad",
  "background": "aurora",
  "titleFont": "Montserrat",
  "cards": "neon",
  "title": ["BREATH-HOLD", "AURA CHECK"],
  "tiers": 0,
  "ballFaces": ["😊", "😤", "🥵", "😵", "😮‍💨"],
  "ball": { "mode": "step", "step": 1 },
  "voice": "am_puck",
  "voiceSpeed": 1.1,
  "script": [
    { "t": 0.3, "say": "Yo! Welcome to the lung aura check." },
    { "t": 4, "say": "Big breath in... and hold it." }
  ],
  "handle": "@yourhandle",
  "sound": { "enabled": true, "sfxVolume": 0.55, "music": null, "musicVolume": 0.3 }
}
```

- `script`: `"auto"` (default) builds the voiceover from `bank.json`; or pass your own `{ t, say }` list. Lines that run long push the next one back.
- `voiceover: false` turns the voice off; `sound.enabled: false` turns the effects off.
- `sound.music`: optional path to a royalty-free track, mixed under the effects and ducked under the voice.
- `palette`: pass `{ "colors": [3 hex], "blobs": [3 hex] }` to use your own colours.
- `tiers`: an index into `bank.json` `tierSets`, or 4 `{ "name", "aura", "note", "say" }`.

## Layout

- `src/template.html`: the overlay (HTML/CSS); `init(cfg)` builds it, `render(t)` sets every element for time `t`.
- `src/render.js`: drives headless Chromium frame by frame in parallel, encodes with ffmpeg, mixes audio.
- `src/tts.py`: voiceover with Kokoro.
- `src/audio.js`: sound bed (pad, ticks, level-up chimes, heartbeat, exhale whoosh).
- `src/config.js`: fills in a full config from a partial one.
- `src/bank.json`: all the words, emoji sets, voices and colours to pick from.
- `.claude/skills/breath-reels/SKILL.md`: the Claude Code skill for making reels from this repo.
