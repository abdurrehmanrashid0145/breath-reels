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
2. **Make a batch (the normal way):** `npm run make -- --count N`
   Options: `--ball step --step 0.5` (half-second ticks), `--ball smooth`, `--handle @name`, `--no-render` (only write configs).
   The batch planner guarantees reels in one batch never share a voiceover line, palette, layout, title, subtitle, tier ladder, emoji set or voice (until a pool runs out), spreads colours around the wheel, and remembers usage in `.history.json` so later days prefer unused material. Never hand-pick seeds for a batch; always go through `make`.
3. **Writing new roast lines (when the user wants fresh jokes or the pools feel stale):** add lines to `src/scripts.json`, one array per moment of the reel. The planner picks them up automatically.
   - Tone: **roast the viewer hard** the whole way through (their stamina, screen time, dry texting, attention span, NPC energy, the face they're making right now), with Gen Z / brainrot slang (aura, delulu, sigma, NPC, rizz, mogging, cooked, locked in, Ohio, skibidi, fanum tax, GTA 6, "you ate"). Savage but playful: never about real appearance, weight, race, gender, disability or health conditions; no slurs; no medical claims.
   - Moments and cue times (60 s hold): `intro` 0.3 hook/challenge, `inhale` 4.6 "breathe in like... hold", `safety` 10.5 **always a joke version of "dizzy? just breathe"**, `lvl0` 15, `up1` 20 level-up to tier 2, `lvl1` 26, `lvl1b` 33 (starts with "Halfway."), `up2` 40 level-up to tier 3, `lvl2` 46, `boss` 51.5 (starts with "Final boss."), then "Three." "Two." "One.", `exhale` 59.7 (starts with "Breathe out."), `cta` 63.4.
   - `{t2}`/`{t3}` become the tier's spoken name + aura ("delulu mode, plus twenty aura"), `{n1}` just its name. Level-up lines must start with `{t2}` / `{t3}`.
   - Respect `maxWords` in `scripts.json` (intro 13, exhale 11, cta 8 are the tight ones); a line that runs long pushes the next one later and a long `cta` gets cut at the end. Roughly 3 words per second.
   - Write for the ear: spell numbers as words ("plus four twenty"), no "gooo"-style spellings, "wifi" not "Wi-Fi", "C E O" for spelled-out letters.
   - For a one-off custom reel, run `make --count 1 --no-render`, edit the `script` in the written config, then `npm run render -- <config>`.
4. **Preview before a full render:** `npm run stills -- <config>` writes 4 PNGs next to the output path.
5. Render time is about 2.5 minutes per reel on 4 cores (about 4.5 on an M-series Mac). Run batches in the background.
6. Each MP4 gets a `.json` beside it with the resolved config and the spoken lines and their timings. Hand the MP4s to the user (in a Claude project, copy them to the project's Files).

## Rules

- Keep the safety voice line ("if you feel dizzy, just breathe") in every reel. Do not add on-screen disclaimer footers such as "NOT A MEDICAL TEST"; the user removed them on purpose.
- Sound and voice are generated locally and are royalty-free. Only set `sound.music` to a track the user confirms is licensed for reuse.
- Trending platform audio can't be added by code; tell the user to add it in-app if they want it.
- To grow the visual/word pools, add entries to `src/bank.json` (titles, subtitles, tier sets with a spoken `say`, emoji sets, pills, statuses, done statuses, timer labels); voiceover lines go in `src/scripts.json`.
- Current pool sizes: ~460 voiceover lines (30-40 per moment), 30 titles, 30 subtitles, 15 tier ladders, 15 emoji sets, 6 layouts (track-left, track-right, track-center, ring, ring-top, zigzag), 144 palettes, 5 backgrounds, 9 voices.
