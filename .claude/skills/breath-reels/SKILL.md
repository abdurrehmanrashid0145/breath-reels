---
name: breath-reels
description: Make viral-style "HOLD YOUR BREATH" lung reels (vertical MP4, blue medical background, comic title, emoji ball sliding past four lungs from wrecked to strong, roast voiceover, dings) from this repo. Use when asked to make, render or batch breath-hold / lung test reels.
---

# Hold-your-breath lung reels

This repo renders 1080×1920, 62 s reels copied from a format that got 27M views on Facebook:
bright blue medical background (grid, ECG line, hexagon icons), one huge comic title
("HOLD YOUR BREATH"), a plain white bar with four dots, a yellow emoji ball that slides
down the bar, and four big lungs beside it going from wrecked smoker lungs (top) to cute
flexing lungs (bottom). Each lung pops with a "ding" when the ball reaches it (~9, 25, 40, 55 s).
A short, sparse Gen Z roast voiceover runs over it. Keep the look minimal: the format works
because it reads at a glance. Do not add timers, tier cards, captions or other UI.

## Setup (once per machine or session)

```bash
npm install
npx playwright install chromium   # skip if Playwright's Chromium is already installed
bash scripts/setup-voice.sh       # free Kokoro voice model (~350 MB, from GitHub)
ffmpeg -version                    # must exist
```

## Making reels

1. Ask how many reels the user wants (default 1 if they say "test" or "sample").
2. **Make a batch (the normal way):** `npm run make -- --count N` (optional `--handle @name`, `--no-render` to only write configs).
   The planner makes sure reels in one batch don't share a title, background shade, font, emoji set, voice or any voiceover line (until a pool runs out), alternates the bar side, and remembers usage in `.history.json` so later days prefer unused material. Never hand-pick seeds for a batch.
3. **Preview before a full render:** `npm run stills -- <config>` writes 4 PNGs next to the output path.
4. Render time is about 2.5 minutes per reel on 4 cores (about 4.5 on an M-series Mac). Run batches in the background.
5. Each MP4 gets a `.json` beside it with the resolved config and the spoken lines and timings. Hand the MP4s to the user (in a Claude project, copy them to the project's Files).

## Lung pictures

- In the repo: 3 generated sets (`set-a` semi-realistic 3D, `set-b` glossy Pixar-style, `set-c` flat sticker), made with fal Flux dev + BiRefNet background removal (~$0.03 each). Reels rotate between them.
- Fallback: a code-drawn cartoon set (`lungSVG` in `src/template.html`), used only when no complete picture set exists.
- Better: picture sets in `assets/lungs/<set-name>/1.png` … `4.png` (1 = wrecked, 4 = strongest; transparent PNG ideal). Once any complete set exists, reels rotate between the sets instead of the cartoon. If the user sends lung images, save them there.

## Writing voiceover lines

Lines live in `src/scripts.json`, one array per moment. The planner picks them up automatically.
- Tone: **roast the viewer hard** (stamina, screen time, dry texting, attention span, NPC energy, the face they're making) with Gen Z / brainrot slang (aura, delulu, sigma, NPC, rizz, mogging, cooked, locked in, Ohio, fanum tax, "you ate"). Savage but playful: never about real appearance, weight, race, gender, disability or health conditions; no slurs; no medical claims.
- Moments (55 s hold): `intro` 0.3 hook, `inhale` 4 "breathe in like... hold", `safety` ~9.5 as the ball hits lung 1 (**always a joke version of "dizzy? just breathe"**), `lvl0` 15.5, `up1` ~25 as the ball hits lung 2, `lvl1b` 31 (starts with "Halfway."), `up2` ~40 at lung 3, `boss` 46.5 (starts with "Final boss."), then "Three." "Two." "One.", `exhale` at 54.7 (starts with "Breathe out."), `cta` 58.4.
- `{t2}`/`{t3}` become a tier's spoken name + aura (from `bank.json` `tierSets`), `{n1}` just its name. Level-up lines start with `{t2}` / `{t3}`.
- Respect `maxWords` in `scripts.json` (intro 13, exhale 11, cta 8 are tight). Roughly 3 words per second. Write for the ear: numbers as words, no "gooo" spellings, "C E O" for spelled-out letters.
- For a one-off custom reel: `make --count 1 --no-render`, edit `script` in the written config, then `npm run render -- <config>`.

## Rules

- Keep the spoken safety line in every reel. No on-screen disclaimers such as "NOT A MEDICAL TEST"; the user removed them on purpose.
- Don't promote other people's apps (the original viral reel had an App Store ad; we leave it out).
- Sound and voice are generated locally and royalty-free. Only set `sound.music` to a track the user confirms is licensed. Trending platform audio has to be added in-app.
- To grow the pools, add to `src/bank.json` (`titles`: 1 or 2 lines, all caps; `shades`: background blues; `ballFaces`: 5 yellow faces each; `titleColors`) and voiceover lines to `src/scripts.json`.
- Current pools: 20 titles, 12 blue shades, 4 comic fonts, 2 bar sides, 4 icon types, 12 emoji sets, 9 voices, ~370 voiceover lines.
