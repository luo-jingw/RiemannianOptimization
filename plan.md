# Plan

Plan Status: approved

# Problem

## Current

- `e00-trailer` v6 is delivered and published: seven sections on a fixed 120 BPM grid (flat → fold → gallery →
  toolkit → montage → title → credits), an orchestral score on the episode palette, 2:34.
- Each section fades in from and out to the background; the sections use different visual languages; the montage is
  a tile wall and the title carries a promotional tagline.

## Problem

The piece reads as a course advertisement: it argues (problem → examples → conclusion → contents) instead of carrying
the viewer, the sections are separated by fades, and the music keeps one tempo and one gentle energy level.

## Goal

`e00` v7 replaces v6 as a short film led by sight and sound:

- One protagonist, the orange point (the optimizer), on one journey: it descends in a flat world, its straight step
  falls off the curved world, it passes through six real worlds, it learns to move on the curved landscape, the
  course's geometry flashes past, and it lands on the title.
- No fades between sections: every boundary is a zoom-through match cut on the protagonist or the key element.
- Music on the episode palette with a tempo map and an edit-style energy arc (demo
  `output/e00-trailer/previews/tempo-demo-phonk.mp3`, approved): sparse 80 BPM → accelerando to 120 → driving 120 with
  drums → half-time 120 → snare build to 128 with one empty beat → phonk drop at 128 (808, cowbell on the signature
  motif, clap, hat rolls, pumping pads) → tape stop (1.5 s, darkening) → half a second of silence → final hit and
  the bell signature.
- Narration only where it is reasonable: short lines on bar anchors; none over the drop.
- Length follows the music (about 2:10); title card without tagline; credits unchanged.

# Structure

## Modules

| Module | Responsibility |
|---|---|
| Tempo map | a scene declares its tempo (`tempo: [bpm_start, bpm_end]`, linear across its beats); bar times follow from it |
| Beat timeline builder | builds chapter starts and sentence anchors from the tempo map; writes per-chapter beat times |
| Bar cues (player) | `Cues.beat(b)` / `Cues.bar(i)` read the chapter's beat times |
| Film score | arrangement per music category on the episode voices + orchestra + drums; tape stop as an audio effect |
| Section transitions (player) | zoom-through between consecutive trailer scenes: the outgoing scene zooms into its exit point, the incoming one out of its entry point, with radial blur |
| Film scenes | one scene per section: flat, fold, worlds (gallery), rebuild (toolkit), build, drop (montage flash cuts + visual tape stop), title, credits |

## Responsibilities

- The tempo map is declared only in `story.en.json`; the timeline builder is the only place that turns it into
  seconds; the score and the scenes read beat times from `timeline.json`.
- A scene owns its picture; the transition pass owns only the zoom/blur across boundaries and asks each scene for its
  exit / entry point.

## State Ownership

| State | Writer | File |
|---|---|---|
| Tempo per scene, bars, narration anchors | episode content (hand-edited) | `content/episodes/e00-trailer/story.en.json` |
| Beat times per chapter | beat timeline builder | `build/e00-trailer/en/timeline.json` |
| Score | film score | `build/e00-trailer/en/audio/music.wav` |

# Interface

## Interfaces

- `story.en.json` scene: `"bars": int`, `"tempo": [number, number]` (BPM at the first and last beat; default
  `[120, 120]`), `"music"`: `film-flat | film-fold | film-worlds | film-rebuild | film-build | film-drop | film-title |
  film-credits`.
- Python: `StoryScene.tempo: tuple[float, float] | None`; `TimelineChapter.beat_times: tuple[float, ...] | None`
  (chapter-relative start of every beat, 4 per bar, plus the end); `Timeline.bar_seconds` is removed.
- TypeScript: `ChapterTiming.beatTimes?: number[]`; `Cues.beat(b)` interpolates `beatTimes`, `Cues.bar(i) = beat(4i)`.
- Score: `FilmScore().compose(timeline) -> np.ndarray`; `TapeStop(seconds, exponent).apply(mix, at) -> None`.
- Transitions: optional `Scene.exitPoint?(): Vector2` and `Scene.entryPoint?(): Vector2` (frame uv);
  `TransitionPass` renders the stage offscreen for the last / first `TRANSITION_SECONDS` of a trailer chapter.

## Inputs

The approved music demo (prototype, ported into the score modules); existing vignettes, terrain and montage
visualizations.

## Outputs

`output/e00-trailer/v7/` (MP4, SRT, cover from the title card, manifest); web version rebuilt after review.

## State Changes

`series.json` keeps `e00-trailer` (kind `trailer`); its content changes to the film structure.

# Flow

## Main Flow

```
story.en.json (bars, tempo, music, anchors)
  → validate → narrate → BeatTimelineBuilder (tempo map → bar times) → timeline.json
  → subtitles → FilmScore (+ tape stop) → mix (trailer profile) → capture (scenes + TransitionPass) → mux → check
```

Film sections (tempo, bars, picture, narration):

| Section | Tempo | Bars | Picture | Narration (bar) |
|---|---|---|---|---|
| s01-flat | 80 | 4 | contour map, the point steps down on the ticks | "Optimization usually lives in flat space." (1) |
| s02-fold | 80→120 | 4 | the plane curls into a sphere; the straight step leaves it and turns red | "But the world is curved." (2) |
| s03-worlds | 120 | 16 | six worlds, shots of 4, 3, 3, 2, 2, 2 bars, match cuts | robot arm (0), drone (4), weights (7), hierarchies (10), brain (12), data (14) |
| s04-rebuild | 120 half-time | 16 | the terrain, tangent plane, four words, descent | "They all live on manifolds…" (1), "To optimize there, every familiar idea must be rebuilt: direction, distance, gradient, step." (7) |
| s05-build | 120→128 | 2 | camera rushes down the valley with the snare roll; last beat black with one orange point | — |
| s06-drop | 128 | 9 | the course's geometry in full-screen flash cuts on the beat (twelve visualizations); bar 9 is the tape stop (1.4 s) and its silence, the picture slows, darkens and freezes | — |
| s07-title | 120 | 8 | black, then the hit: title, circle of fifths landing on C | "Riemannian Optimization, from the Ground Up." (1) |
| s08-credits | 120 | 4 | credits as now | — |

# Code Mapping

## Modules

| Module | Files |
|---|---|
| Tempo map | `pipeline/rvideo/schema/{story,timeline}.py`, `pipeline/rvideo/validate/content_validator.py` |
| Beat timeline builder | `pipeline/rvideo/timing/beat_timeline_builder.py` |
| Bar cues | `player/src/core/Scene.ts`, `player/src/core/EpisodeLoader.ts`, `player/src/primitives/Cues.ts` |
| Film score | `pipeline/rvideo/music/{film_score.py, film_harmony.py, film_drums.py, tape_stop.py}`, `trailer_orchestra.py`, `trailer_dsp.py`, `trailer_reverb.py`; `trailer_score.py` and `trailer_harmony.py` removed; `pipeline/rvideo/cli/main.py` |
| Section transitions | `player/src/core/TransitionPass.ts`, `player/src/core/EpisodeRenderer.ts`, `player/src/core/Scene.ts` |
| Film scenes | `player/src/episodes/e00-trailer/{index.ts, s01-flat.ts … s08-credits.ts, lib/*}` |
| Content | `content/episodes/e00-trailer/{storyboard.md, story.en.json}` |

## Interfaces

See Interface.

## State

See Structure → State Ownership.

# Implementation

## Phase 1

Phase Status: completed

Round: 1

### Goal

Tempo map end to end: schema, validator, timeline builder writing bar times, player cues reading them; the score
reads bar times.

### Files

`pipeline/rvideo/schema/{story,timeline}.py`, `pipeline/rvideo/validate/content_validator.py`,
`pipeline/rvideo/timing/beat_timeline_builder.py`, `player/src/core/{Scene,EpisodeLoader}.ts`,
`player/src/primitives/Cues.ts`

### Structures

`StoryScene.tempo`, `TimelineChapter.bar_times`, `ChapterTiming.barTimes`

### Affected Modules

Tempo map, Beat timeline builder, Bar cues

### Dependencies

none

### Observation

The current e00 story (all 120 BPM) rebuilds to the same chapter and caption times; a test story with 80→120
prints bar durations from 0.75 s falling to 0.5 s per beat; E01–E06 timelines unchanged (hash).

## Phase 2

Phase Status: completed

Round: 1

### Goal

Film story: eight sections with tempo, bars, music categories and narration anchors; storyboard rewritten; audio
built.

### Files

`content/episodes/e00-trailer/{story.en.json, storyboard.md}`

### Structures

none new

### Affected Modules

Content

### Dependencies

Phase 1

### Observation

`rvideo audio e00-trailer`: every sentence fits; transcript check; chapter starts and total duration.

## Phase 3

Phase Status: active

Round: 2

### Goal

Film score ported from the approved demo onto the timeline: categories film-*, drums, phonk drop, tape stop,
gallery shot accents; old trailer score removed.

### Files

`pipeline/rvideo/music/{film_score.py, film_harmony.py, film_drums.py, tape_stop.py}`, `pipeline/rvideo/cli/main.py`

### Structures

`FilmScore`, `FilmHarmony`, `Drums`, `TapeStop`

### Affected Modules

Film score

### Dependencies

Phase 2

### Observation

Chord and tempo per bar log; RMS every 2 s and around each boundary; the tape stop and silence measured; score preview
for the user.

## Phase 4

Phase Status: pending

Round: 2

### Goal

Section transitions: zoom-through between consecutive trailer chapters; section fades removed from the scenes.

### Files

`player/src/core/{TransitionPass,EpisodeRenderer,Scene}.ts`, the e00 scenes' fade code

### Structures

`TransitionPass`, `Scene.exitPoint`, `Scene.entryPoint`

### Affected Modules

Section transitions, Film scenes

### Dependencies

Phase 1

### Observation

Stills across every boundary (−0.3 s … +0.3 s); determinism and history checks; E01–E06 stills unchanged (hash).

## Phase 5

Phase Status: pending

Round: 3

### Goal

Film scenes: flat and fold on the tempo map, worlds with 4/3/3/2/2/2 shots, rebuild in half-time, new build scene,
drop as flash cuts with the visual tape stop, title without tagline, credits.

### Files

`player/src/episodes/e00-trailer/**`

### Structures

`BuildScene`, `DropScene` (flash-cut schedule, time remap of the tape stop)

### Affected Modules

Film scenes

### Dependencies

Phase 3, Phase 4

### Observation

Stills at every cut and event; determinism and history checks; visual review.

## Phase 6

Phase Status: pending

Round: 4

### Goal

Deliver v7; after the user's review, publish the web version and update the docs.

### Files

`output/e00-trailer/v7/`, `site/`, `docs/video-architecture.md`, `docs/scene-authoring.md`, `README.md`

### Structures

none new

### Affected Modules

Delivery, web version, documentation

### Dependencies

Phase 5

### Observation

`rvideo check` report; the user reviews v7; web index plays it.
