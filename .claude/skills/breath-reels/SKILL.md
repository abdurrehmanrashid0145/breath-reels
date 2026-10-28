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
   Each reel randomly gets one of three roast scripts from `src/bank.json` `scriptStyles` (the user picked rotating all three): `roast` (roast master), `coach` (disappointed coach), `brainrot` (unhinged brainrot). Force one with `"scriptStyle": "roast"` in a config.
3. **New script written by you (when the user wants fresh jokes):** write one JSON config per reel in `configs/<date>/` with a new `seed` and your own `script`, then `npm run render -- configs/<date>/*.json`. To add a lasting new style instead, add a new entry under `scriptStyles` with the same 12 slot keys.
   - Tone: funny and **roasting the viewer** the whole way through (their stamina, their face, their NPC energy), with Gen Z / brainrot slang (aura, delulu, sigma, NPC, rizz, mogging, cooking, locked in, Ohio, skibidi, GTA 6, "you ate"). Playful teasing, never about real appearance, weight, health or identity; no medical claims.
   - `script` is a list of `{ "t": seconds, "say": "text" }`. Slots for a 60 s hold: 0.3 hook/challenge, 4 inhale + "hold", **10.5 safety line, always keep it** (a joke version of "dizzy? just breathe"), 15 level-1 roast, 20 level-up to tier 2 (say its name and aura), 26 and 33 roasts, 40 level-up to tier 3, 46 roast, 51.5 final boss, 57/58/59 "Three." "Two." "One.", 60.1 exhale + backhanded compliment, 63.4 call to action ("Comment your time").
   - In `scriptStyles`, `{t2}` becomes tier 2's spoken name + aura ("delulu mode, plus twenty aura") and `{n2}` just its name; a slot can be a list of alternatives.
   - Each line must fit before the next cue (about 3 words per second). Lines that run long push the next one later.
   - Write for the ear: spell numbers as words ("plus four twenty"), no "gooo"-style spellings (TTS mispronounces them), write "wifi" not "Wi-Fi".
   - Any other field can be fixed in the config (see README); leave them out to randomise.
4. **Preview before a full render:** `npm run stills -- <config>` writes 4 PNGs next to the output path.
5. Render time is about 2.5 minutes per reel on 4 cores. Run batches in the background.
6. Each MP4 gets a `.json` beside it with the resolved config and the spoken lines and their timings. Hand the MP4s to the user (in a Claude project, copy them to the project's Files).

## Rules

- Keep the safety voice line ("if you feel dizzy, just breathe") in every reel. Do not add on-screen disclaimer footers such as "NOT A MEDICAL TEST"; the user removed them on purpose.
- Sound and voice are generated locally and are royalty-free. Only set `sound.music` to a track the user confirms is licensed for reuse.
- Trending platform audio can't be added by code; tell the user to add it in-app if they want it.
- To grow the content pool permanently, add entries to `src/bank.json` (script lines per phase, titles, subtitles, tier sets with a spoken `say`, emoji sets, pills, statuses).
