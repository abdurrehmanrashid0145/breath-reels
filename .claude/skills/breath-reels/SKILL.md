---
name: breath-reels
description: Make viral-style "HOLD YOUR BREATH" lung reels (vertical MP4, bright medical background, comic title, emoji ball sliding past four lungs from wrecked to strong, calm voiceover) from this repo. Use when asked to make, render or batch breath-hold / lung test reels.
---

# Hold-your-breath lung reels

This repo renders 1080×1920, 60 s reels copied from a format that got 27M views on Facebook:
saturated background in blue, navy, black, purple, yellow, red, green or orange with an always-moving background: rippling wave grid, square grid, 60° diagonal grid, turning sunburst or the original look (grids move one way per reel: up, down, left, right or diagonal; `npm run sheet` shows them all), no title on most reels (a small one on about 1 in 3), a bold bar with arms to each lung
("HOLD YOUR BREATH"), a plain white bar with four dots, a yellow emoji ball that slides
down the bar, and four big lungs beside it going from wrecked smoker lungs (top) to cute
flexing lungs (bottom). Each lung pops when the ball reaches it (no ding sound; `"sound": {"dings": true}` brings it back) (~12, 27, 41.7, 56.5 s, same as the original).
A calm, sparse voiceover (same structure as the original) runs over it. Keep the look minimal: the format works
because it reads at a glance. Do not add timers, tier cards, captions or other UI.

## Setup (once per machine or session)

```bash
npm run setup   # Mac or Windows: packages, Chromium, ffmpeg check (bundled fallback), Kokoro voice, Desktop "Make Reel" shortcut
```

Non-technical users make reels by double-clicking **Make Reel** on the Desktop (runs `src/prompt.js`: paste lines, Enter on an empty line, choose a count). Output goes to Desktop/breath-reels/<date>/.

## Making reels

1. Ask how many reels the user wants (default 1 if they say "test" or "sample").
2. **Make a batch (the normal way):** `npm run make -- --count N` (optional `--handle @name`, `--no-render` to only write configs).
   The planner makes sure reels in one batch don't share a title, background shade, font, emoji set, voice or any voiceover line (until a pool runs out), alternates the bar side, and remembers usage in `.history.json` so later days prefer unused material. Never hand-pick seeds for a batch.
3. **Preview before a full render:** `npm run stills -- <config>` writes 4 PNGs next to the output path.
4. Render time is about 2.5 minutes per reel on 4 cores (about 4.5 on an M-series Mac). Run batches in the background.
5. `make` saves videos to the Desktop in `breath-reels/<date>/` (`--out <folder>` overrides). Each MP4 gets a `.json` beside it with the resolved config and the spoken lines and timings. Hand the MP4s to the user (in a Claude project, copy them to the project's Files).

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
- When the user writes their own script: save it to a text file (one line per spoken line, optional `TITLE: A / B` line, optional `0:05`-style times) and run `npm run make -- --script <file>` (or pass the lines inline separated by ` | `). Untimed lines are spread out automatically; the last lands on the last lung. Format example: `scripts/example-script.txt`. Remind them to keep a "breathe if you need to" line if their script lacks one.

## Rules

- Keep the `breathe` line (it lets viewers breathe) in every reel. No on-screen disclaimers such as "NOT A MEDICAL TEST"; the user removed them on purpose.
- Don't promote other people's apps (the original viral reel had an App Store ad; we leave it out).
- Sound and voice are generated locally and royalty-free. Only set `sound.music` to a track the user confirms is licensed. Trending platform audio has to be added in-app.
- To grow the pools, add to `src/bank.json` (`titles`: 1 or 2 lines, all caps; `shades`: background blues; `ballFaces`: breathing-related emojis only, 5 slots each, either one emoji repeated or two (A,A,B,B,B: switches at the 2nd lung); `titleColors`) and voiceover lines to `src/scripts.json`.
- Current pools: 20 titles, 23 shades in 8 colour families (blue, navy, black, purple, yellow, red, green, orange), 5 background designs, 5 grid directions, 2 bar styles, 5 bar layouts, 4 comic fonts, 2 bar sides, 4 icon types, 20 breathing emoji sets (10 single, 10 pairs), 9 voices, 141 voiceover lines.

- Each finished reel is appended to `.generations/<date>.log` (local, not in git). `npm run generations` lists counts per day.
