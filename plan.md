# Plan

Plan Status: completed

# Problem

## Current

- `render/capture.ts` renders every frame of an episode in headless Chrome (scene, formulas, captions and title cards
  in one page) and encodes 1800-frame chunks with x264. Measured: 14.6 frames/s with 3 workers; E07 v3 (87076
  frames) took 99 min although only c02 and c08 changed.
- Chapter starts are wherever the narration ends (4-decimal seconds). When an earlier chapter's duration changes,
  every later chapter moves by a fraction of a frame, so its frames are sampled at different local times.
- Caption text reaches the frame through the browser's fonts. The combining macron U+0304 renders invisibly over
  "f" and misplaced over "B" in Noto Sans SC (caption font); E06 v1 and E03 v1 shipped such captions. Nothing in
  `rvideo validate` looks at combining marks. U+0302, U+0303 and U+0305 render correctly (glyph test, 44 px).

## Problem

A local change (one chapter, one caption) costs a full-episode render, and a caption glyph that the caption font
cannot display passes validation and reaches the delivered video.

## Goal

- `rvideo validate` reports an error for any combining mark in captions outside the set verified to render.
- A delivery re-renders only the chapters whose frames can differ; unchanged chapters are reused from a cache.
- E03 v2 with the B̄ captions corrected, delivered through the new capture path.

Out of scope: a separate caption overlay track. With per-chapter reuse, a caption change costs one chapter render
(5–7 min of video), which removes most of the benefit at the cost of a second caption renderer.

# Structure

## Modules

| Module | Responsibility | Owned state |
|---|---|---|
| Caption glyph rule | allowed combining marks in caption text | `pipeline/rvideo/validate/caption_glyph_rule.py` |
| Content validator (existing) | reports rule violations as errors | `pipeline/rvideo/validate/content_validator.py` |
| Timeline builder (existing) | chapter starts and episode end on the frame grid | `pipeline/rvideo/timing/timeline_builder.py` |
| Module graph hasher | content hash of TS entries and everything they import | `player/render/ModuleGraphHasher.ts` |
| Segment planner | intro / chapter / outro segments, their frame ranges and cache keys | `player/render/SegmentPlan.ts` |
| Chunk cache | cached chunk files, lookup, pruning | `player/render/ChunkCache.ts` |
| Capture (existing) | renders missing chunks, concatenates all | `player/render/capture.ts` |

## Ownership

- Cached chunks are owned by the chunk cache under `build/<eid>/en/render/cache/`; capture writes a chunk only
  through it, and the cache prunes entries not used by the latest successful run.
- The cache key is the only statement of what a chunk's pixels depend on.

# Interface

- `CaptionGlyphRule.violations(text: str) -> list[str]`; allowed combining marks: U+0302, U+0303, U+0305.
- `TimelineLayout.fps: int = 30`; every chapter start and the episode duration are multiples of 1/fps (the
  preceding chapter's tail absorbs the padding, < 1 frame).
- `ModuleGraphHasher.hash(entries: string[]): Promise<string>` — esbuild metafile inputs, contents hashed in sorted
  path order.
- `SegmentPlan.build(...)` → `Segment { name, start, frames, key }`:
  - episodes: `intro` [0, first chapter), one segment per chapter, `outro` [last end, duration) (the outro keeps the
    last chapter's scene drawn at its end time, so its key includes that chapter);
  - trailers: one segment for the whole timeline (section transitions cross chapter boundaries);
  - frame k of a segment is rendered at `start + k/fps`, so a reused chapter is sampled at identical local times.
- Key ingredients: render settings (fps, chunk size, x264 and JPEG parameters), Chrome version, shell hash (renderer,
  layers, loader, `main.ts`, `styles.css`, `index.html`, `package-lock.json`, `public/`), displayed episode metadata
  (series title, episode title/order/kind, next episode title/order), and per segment the chapter's timing,
  title, captions relative to the segment start, and the module-graph hash of
  `src/episodes/<eid>/<chapterId>.ts` (or `index.ts` for trailers).
- `capture.ts` CLI: `--episode --out [--workers] [--series] [--port] [--allow-placeholders]`; `--from/--to` removed
  (unused). Output JSON adds `frames_rendered`, `frames_reused`.

# Flow

timeline (frame grid) → capture: plan segments → key every chunk → render missing chunks in parallel → store →
concat all chunks in order → prune unused → mux / check (unchanged).

# Code Mapping

| Change | File |
|---|---|
| glyph rule | `pipeline/rvideo/validate/caption_glyph_rule.py`, `content_validator.py` |
| frame grid | `pipeline/rvideo/timing/timeline_builder.py` |
| hasher, planner, cache | `player/render/ModuleGraphHasher.ts`, `SegmentPlan.ts`, `ChunkCache.ts` |
| capture orchestration | `player/render/capture.ts` |
| esbuild declared | `player/package.json` |
| E03 captions | `content/episodes/e03-inverse-function/story.en.json` |
| pipeline facts | `docs/video-architecture.md` |

# Tasks

## Phase 1 — Caption glyph rule

Phase Status: completed

- Validation: validate reports the U+0304 captions in E03 as errors before the fix and 0 errors after; all other
  episodes still 0 errors.

## Phase 2 — Frame-grid timeline

Phase Status: completed

- Validation: rebuilt E03 timeline has every chapter start × 30 within 1e-3 of an integer; per-chapter shift
  < 1/30 s; sentence-relative times unchanged.

## Phase 3 — Chunk cache in capture

Phase Status: completed

- Validation: typecheck; on E03 v2 the cold run renders all frames; an immediate second capture renders 0 frames and
  its video matches the first (decoded frame checksums); a comment edit in one chapter file re-renders only that
  chapter's chunks (the cache keeps only the latest run's entries, so reverting renders that chapter once more).

## Phase 4 — E03 v2 and docs

Phase Status: completed

- `rvideo deliver e03-inverse-function --version 2`; frames at the seven B̄ captions from the delivered file; docs.
- Validation: check OK; captions show the bar over B.
