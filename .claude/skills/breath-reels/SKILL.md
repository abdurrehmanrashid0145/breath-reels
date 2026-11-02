---
name: breath-reels
description: Make viral-style "HOLD YOUR BREATH" lung reels (vertical MP4, bright medical background, comic title, emoji ball sliding past four lungs from wrecked to strong, roast voiceover, dings) from this repo. Use when asked to make, render or batch breath-hold / lung test reels.
---

# Hold-your-breath lung reels

This repo renders 1080×1920, 60 s reels copied from a format that got 27M views on Facebook:
bright medical background in blue, yellow, red, green or orange (the original is blue) (grid, ECG line, hexagon icons), one huge comic title
("HOLD YOUR BREATH"), a plain white bar with four dots, a yellow emoji ball that slides
down the bar, and four big lungs beside it going from wrecked smoker lungs (top) to cute
flexing lungs (bottom). Each lung pops with a "ding" when the ball reaches it (~12, 27, 41.7, 56.5 s, same as the original).
A calm, sparse voiceover (same structure as the original) runs over it. Keep the look minimal: the format works
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
- Tone: copy the original. Short, calm, friendly lines that push engagement (like, comment which lungs you have, send to a friend, follow, save) plus encouragement. **No roasting**: the user switched away from roast scripts on 2026-11-02 to match the viral reel.
- Moments (57 s hold, 60 s reel): `intro` 0.3 "Let's test your lungs. Ready? Hold!", `like` 4.7, `comment` 8.8, `share` 16.1, `breathe` 21.9 (**always tells the viewer they can breathe if they need to**; this is the safety line), `mid` 31.2 calm tip or "halfway", `follow` 34.6, `push` 46.9 "Come on, just a little more", `almost` 49.2 "almost at the finish line", `done` on the last lung "Congrats!". Silence between lines is intentional.
- Respect `maxWords` in `scripts.json` (`comment` 7, `push` 6, `almost` 8, `done` 3 are tight). About 3 words per second.
- Write for the ear: numbers as words, no odd spellings.
- For a one-off custom reel: `make --count 1 --no-render`, edit `script` in the written config, then `npm run render -- <config>`.

## Rules

- Keep the `breathe` line (it lets viewers breathe) in every reel. No on-screen disclaimers such as "NOT A MEDICAL TEST"; the user removed them on purpose.
- Don't promote other people's apps (the original viral reel had an App Store ad; we leave it out).
- Sound and voice are generated locally and royalty-free. Only set `sound.music` to a track the user confirms is licensed. Trending platform audio has to be added in-app.
- To grow the pools, add to `src/bank.json` (`titles`: 1 or 2 lines, all caps; `shades`: background blues; `ballFaces`: 5 yellow faces each; `titleColors`) and voiceover lines to `src/scripts.json`.
- Current pools: 20 titles, 16 bright shades in 5 colour families (blue, yellow, red, green, orange), 4 comic fonts, 2 bar sides, 4 icon types, 12 emoji sets, 9 voices, 141 voiceover lines.
