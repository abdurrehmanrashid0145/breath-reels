---
name: breath-reels
description: Make Gen Z breath-hold "aura check" reels (vertical MP4 with lung tiers, moving emoji ball, hype voiceover, generated sound) from this repo. Use when asked to make, render or batch breath-hold / aura check reels.
---

# Breath-hold aura check reels

This repo renders 1080×1920, 66 s reels: four lung tiers (NPC → DELULU → SIGMA → LEGEND),
an emoji ball that moves during a 60 s breath hold, "+20 AURA" pop-ups at each level-up,
a timer/status bar, a hype Gen Z voiceover and a generated royalty-free sound bed.
Every reel is randomised from its seed: layout (track left / right / centre / ring),
palette (144), background style (5), fonts, card style, emoji set, voice (10) and script.

## Setup (once per machine or session)

```bash
npm install
npx playwright install chromium   # skip if Playwright's Chromium is already installed
bash scripts/setup-voice.sh       # free Kokoro voice model (~350 MB, from GitHub)
ffmpeg -version                    # must exist
```

## Making reels

1. Ask how many reels the user wants (default 1 if they say "test" or "sample").
2. **Quick batch, everything random:** `npm run make -- --count N`
   Options: `--ball step --step 0.5` (half-second ticks), `--ball smooth`, `--handle @name`.
3. **Fresh script written by you (best for daily posting):** write one JSON config per reel in `configs/<date>/` with a new `seed` and your own `script`, then `npm run render -- configs/<date>/*.json`.
   - `script` is a list of `{ "t": seconds, "say": "text" }`. Keep this shape for a 60 s hold: 0.3 intro, 4 inhale + "hold", **10.5 safety line, always keep it** ("if you feel dizzy, just breathe, no ego"), 15 level-1 banter, 20 level-up to tier 2 (say its name and aura), 26 and 33 banter, 40 level-up to tier 3, 46 banter, 51.5 final boss hype, 57/58/59 "Three." "Two." "One.", 60.1 exhale line ("Breathe out! Max aura unlocked. We are so back!"), 63.4 call to action ("Comment your aura level").
   - Each line must fit before the next cue (about 2.5 words per second). Lines that run long push the next one later.
   - Write for the ear, in lowercase normal sentences; spell numbers as words ("plus four twenty aura"); avoid "gooo"-style spellings (TTS mispronounces them; use "let's go!").
   - Style: Gen Z / brainrot slang (aura, delulu, sigma, NPC, main character, cooking, mogging, locked in, let him cook, absolute cinema, we are so back, GTA 6 jokes). Playful, never mean, no medical claims.
   - Any other field can be fixed in the config (see README); leave them out to randomise.
4. **Preview before a full render:** `npm run stills -- <config>` writes 4 PNGs next to the output path.
5. Render time is about 2.5 minutes per reel on 4 cores. Run batches in the background.
6. Each MP4 gets a `.json` beside it with the resolved config and the spoken lines and their timings. Hand the MP4s to the user (in a Claude project, copy them to the project's Files).

## Rules

- Keep the safety voice line ("if you feel dizzy, just breathe") in every reel. Do not add on-screen disclaimer footers such as "NOT A MEDICAL TEST"; the user removed them on purpose.
- Sound and voice are generated locally and are royalty-free. Only set `sound.music` to a track the user confirms is licensed for reuse.
- Trending platform audio can't be added by code; tell the user to add it in-app if they want it.
- To grow the content pool permanently, add entries to `src/bank.json` (script lines per phase, titles, subtitles, tier sets with a spoken `say`, emoji sets, pills, statuses).
