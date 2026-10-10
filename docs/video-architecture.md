# Video Architecture

Verified production architecture of the series "Riemannian Optimization from the Ground Up".
Delivered: E01–E06 v1 (`output/<eid>/v1/`), 214 minutes in total.

## Modules and files

| Module | Files | Owns |
|---|---|---|
| Series registry | `content/series.json` | episode order, ids, titles, status |
| Glossary | `content/glossary.json` | term id → en / zh / symbol / spoken |
| Pronunciation | `content/pronunciation.json` | regex → Kokoro phonemes (TTS input only) |
| Episode content | `content/episodes/<eid>/{storyboard.md, story.en.json}` | content design; narration + Chinese captions |
| Build pipeline | `pipeline/rvideo/` | validate, narrate (Kokoro af_heart), timeline, SRT, music, mix, mux, check, deliver |
| Renderer | `player/src/{core,layers,primitives}` | `renderAt(t)`, Three.js stage, KaTeX formulas, captions, title cards |
| Episode scenes | `player/src/episodes/<eid>/` + one line in `registry.ts` | one scene class per chapter |
| Capture | `player/render/{PlayerSession,capture,stills}.ts` | headless Chrome frames → H.264 chunks; review stills with determinism checks |
| Generated | `build/<eid>/en/` | sentence WAVs, provenance, timeline, SRT, music, mix, render, qa |
| Delivered | `output/<eid>/v<N>/` | MP4 (video + AAC + mov_text), SRT, cover, manifest; never overwritten |

## Delivery chain

`.venv/bin/python -m rvideo.cli.main deliver <eid> --version <N> [--workers 3 --port 53xx]`

validate → narrate (cached by text hash) → timeline → subtitles → music → mix → capture → mux (two-pass loudnorm to −16 LUFS) → check.
`check` writes `build/<eid>/en/qa/delivery-v<N>.json` and sample frames; it fails when stream durations differ from the timeline by more than 0.2 s, decoding reports errors, the subtitle stream is missing, or the frame size is not 1920×1080.

Capture splits frames into 60 s chunks taken from a queue by N workers; a chunk whose browser dies is re-rendered in a new browser (up to 3 attempts). Measured throughput: 23–42 frames/s with 2–5 workers.

## Web version

`cd player && npx tsx render/build-site.ts` builds a static site into `site/`: the same renderer playing live in the
browser (landing page with all delivered episodes, control bar with a chapter-segmented seek bar — one segment per
chapter plus intro/outro, hover tooltip with the chapter title — chapter menu, keyboard shortcuts). The playback UI
exists only in the web player; rendered videos contain none.
Each episode ships `data/<eid>/timeline.json` and `data/<eid>/audio.m4a` (128 kb/s AAC encoded from
`build/<eid>/en/audio/mix.wav` with the delivery loudness normalization), so the site needs no rendered video.
Measured size: 222 MB. Playback time is owned by `PreviewClock` (performance.now based): seeking moves the live
rendering immediately and the audio is re-synced when it drifts by more than 0.25 s. Serve with
`npm run site:serve` (vite preview, supports HTTP Range requests for audio seeking).

Published on GitHub Pages from the `gh-pages` branch: https://luo-jingw.github.io/RiemannianOptimization/ .
`site/` holds its own git repository on branch `gh-pages`; after `npm run site:build`, publish with
`cd site && git add -A && git commit -m "<message>" && git push origin gh-pages`.
The dev server and the static site differ only in the `DataSource`
(`player/src/core/DataSource.ts`).

## Publishing assets

- `.venv/bin/python -m rvideo.cli.main publish` writes `output/publish/metadata.md`: Bilibili title, description,
  tags, part titles and per-part chapters; YouTube title, description with chapter timestamps (first chapter at 0:00),
  tags. Sources: `content/publish/episodes.json` (summaries, footers, tags) and each episode's timeline and storyboard
  chapter titles.
- `cd player && npx tsx render/covers.ts` renders covers from `content/publish/covers.json` into
  `output/publish/covers/`: `<id>-youtube.{png,jpg}` (1280×720) and `<id>-bilibili.{png,jpg}` (1146×717), each
  rendered natively at its aspect ratio; art is a cropped frame of the delivered video.

## Measured series results

| Episode | Minutes | Sentences | LUFS | Peak dBFS |
|---|---|---|---|---|
| E01 topology | 34.0 | 285 | −16.0 | −1.4 |
| E02 smooth manifolds | 35.2 | 299 | −16.0 | −1.3 |
| E03 inverse function | 35.9 | 297 | −16.0 | −1.4 |
| E04 implicit level sets | 31.1 | 273 | −16.0 | −1.5 |
| E05 tangent / orthogonal | 40.8 | 347 | −16.0 | −1.4 |
| E06 gradient / retraction | 37.4 | 301 | −16.0 | −1.4 |

## Adding an episode (new course notes)

1. Add the notes under `notes/`; extend `docs/knowledge-map.md`.
2. Append the episode to `content/series.json` (next `order`; its music key follows the circle of fifths automatically).
3. Write `content/episodes/<eid>/storyboard.md`, then `story.en.json` (rules in `docs/scene-authoring.md`).
4. Create `player/src/episodes/<eid>/` (scenes, `index.ts`) and add one import + one entry in `player/src/episodes/registry.ts`.
5. Verify chapters with `stills.ts`; then `rvideo deliver <eid> --version 1`.

Shared code (`pipeline/`, `player/src/{core,layers,primitives}`) needs no change; files touched outside the new episode: `series.json`, `registry.ts`, optionally `glossary.json` / `pronunciation.json`.

## Operating constraints

- At most 3 episode builds at a time on this machine; one heavy process (TTS, transcription, Chrome) per build.
- Never kill Chrome/node globally while a capture runs; capture retries but loses time.
- Wait for a background job by its PID, not by `pgrep -f` on a string that the waiting command itself contains.
