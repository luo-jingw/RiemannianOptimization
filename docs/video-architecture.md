# Video Architecture

Verified production architecture of the series "Riemannian Optimization from the Ground Up".
Delivered: E01, E02, E04, E05 v1, E03 v2, E06 v2, E07 v3 and E08 v1 (`output/<eid>/v<N>/`), 300 minutes in total; series trailer E00 v8 (`output/e00-trailer/v8/`, 1:58).

## Modules and files

| Module | Files | Owns |
|---|---|---|
| Series registry | `content/series.json` | episode order, ids, titles, status, kind (`episode` / `trailer`) |
| Glossary | `content/glossary.json` | term id → en / zh / symbol / spoken |
| Pronunciation | `content/pronunciation.json` | regex → Kokoro phonemes (TTS input only) |
| Episode content | `content/episodes/<eid>/{storyboard.md, story.en.json}` | content design; narration + Chinese captions |
| Build pipeline | `pipeline/rvideo/` | validate, narrate (Kokoro af_heart), timeline, SRT, music, mix, mux, check, deliver |
| Renderer | `player/src/{core,layers,primitives}` | `renderAt(t)`, Three.js stage, KaTeX formulas, captions, title cards |
| Episode scenes | `player/src/episodes/<eid>/` + one line in `registry.ts` | one scene class per chapter |
| Capture | `player/render/{PlayerSession,capture,SegmentPlan,ChunkCache,ModuleGraphHasher,stills}.ts` | headless Chrome frames → cached H.264 chunks; review stills with determinism checks |
| Generated | `build/<eid>/en/` | sentence WAVs, provenance, timeline, SRT, music, mix, render, qa |
| Delivered | `output/<eid>/v<N>/` | MP4 (video + AAC + mov_text), SRT, cover, manifest; never overwritten |

## Delivery chain

`.venv/bin/python -m rvideo.cli.main deliver <eid> --version <N> [--workers 3 --port 53xx]`

validate → narrate (cached by text hash) → timeline → subtitles → music → mix → capture → mux (two-pass loudnorm to −16 LUFS) → check.
`check` writes `build/<eid>/en/qa/delivery-v<N>.json` and sample frames; it fails when stream durations differ from the timeline by more than 0.2 s, decoding reports errors, the subtitle stream is missing, or the frame size is not 1920×1080.

Trailers (`kind: "trailer"`) take a different branch at three points: the timeline comes from
`BeatTimelineBuilder` (scene lengths in bars on a per-scene tempo map, sentences on bar anchors; chapters carry
`beatTimes`), the music from `FilmScore` (episode voices plus orchestra and drums, a phonk drop and a tape stop), and
the mix profile ducks music by 4 dB and loudness-normalizes to −14 LUFS. Trailer chapter boundaries are zoom-throughs
(`TransitionPass`: the stage rendered offscreen, magnified about the scenes' exit / entry points with a radial blur
and periphery darkening). The trailer cover is the title card (title scene start + 3.5 bars).

Timeline chapter starts and the episode end lie on the 30 fps frame grid (`TimelineLayout.fps`; a chapter's tail
absorbs the padding, < 1 frame), so a chapter is sampled at the same local times whatever precedes it.

Capture splits an episode into segments — the intro card, one per chapter, and the outro card (which keeps the last
chapter's scene drawn, so its key includes that chapter); a trailer is one segment because its transitions cross
chapter boundaries — and each segment into chunks of up to 60 s. A chunk's cache key hashes render settings, the
Chrome version, the player shell (module graph of `main.ts` without the scene registry, `index.html`,
`package-lock.json`, `public/`), the displayed episode metadata, and the segment's timing, captions and the module
graph of `src/episodes/<eid>/<chapterId>.ts` (esbuild resolution). Chunks found in `build/<eid>/en/render/cache/` are
reused; the rest are rendered by N workers from a queue (a chunk whose browser dies is re-rendered in a new browser,
up to 3 attempts). After concatenation the cache keeps only the chunks of the latest run.

Measured on E03 (64564 frames, 3 workers): cold capture 1596 s (40.5 frames/s); after a one-line change in the last
chapter's scene, 131 s (4099 frames rendered: c10 and the outro); with nothing changed, 1.6 s. Rendering and encoding
are deterministic: all decoded frames of the cold capture and of the delivered v2, whose c10 and outro were rendered
again, are identical (framemd5). Throughput depends on the scenes: E07 v3 (pre-cache, 87076 frames) ran at 14.6 frames/s.

`validate` rejects caption text with combining marks other than U+0302, U+0303 and U+0305
(`CaptionGlyphRule`): U+0304 renders invisibly or misplaced in the caption fonts.

## Web version

`cd player && npx tsx render/build-site.ts` builds a static site into `site/`: the same renderer playing live in the
browser (landing page with all delivered episodes, control bar with a chapter-segmented seek bar — one segment per
chapter plus intro/outro, hover tooltip with the chapter title — chapter menu, keyboard shortcuts). The playback UI
exists only in the web player; rendered videos contain none.
Each episode ships `data/<eid>/timeline.json` and `data/<eid>/audio.m4a`: 128 kb/s AAC re-encoded from the audio of
the highest delivered version `output/<eid>/v<N>/<eid>.en.mp4`, which the muxer already normalized to −16 LUFS
(E08: −16.0 LUFS, duration within 0.03 s of the timeline). Intermediate WAVs under `build/<eid>/en/audio/`
(`music.wav`, `narration.wav`, `mix.wav`) are not needed after delivery; `rvideo music` and `rvideo mix` regenerate
them bit-identically from the existing timeline when a new version needs them.
Measured size: 228 MB. Playback time is owned by `PreviewClock` (performance.now based): seeking moves the live
rendering immediately and the audio is re-synced when it drifts by more than 0.25 s. Serve with
`npm run site:serve` (vite preview, supports HTTP Range requests for audio seeking).

Published on GitHub Pages from the `gh-pages` branch: https://luo-jingw.github.io/RiemannianOptimization/ .
`site/` holds its own git repository on branch `gh-pages`; after `npm run site:build`, publish with
`cd site && git add -A && git commit -m "<message>" && git push origin gh-pages`.
The dev server and the static site differ only in the `DataSource`
(`player/src/core/DataSource.ts`).

## Measured series results

| Episode | Minutes | Sentences | LUFS | Peak dBFS |
|---|---|---|---|---|
| E01 topology | 34.0 | 285 | −16.0 | −1.4 |
| E02 smooth manifolds | 35.2 | 299 | −16.0 | −1.3 |
| E03 inverse function | 35.9 | 297 | −16.0 | −1.4 |
| E04 implicit level sets | 31.1 | 273 | −16.0 | −1.5 |
| E05 tangent / orthogonal | 40.8 | 347 | −16.0 | −1.4 |
| E06 gradient / retraction | 37.4 | 301 | −16.0 | −1.4 |
| E07 gradient descent | 48.4 | 381 | −16.0 | −1.4 |
| E08 connections / geodesics | 36.8 | 309 | −16.0 | −1.4 |
| E00 trailer (v8) | 2.0 | 7 | −14.2 | −1.2 |

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
