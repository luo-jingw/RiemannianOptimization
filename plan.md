# Plan

Plan Status: approved

# Problem

## Current

- Six delivered episodes (E01–E06, `output/<eid>/v1/`) and a web version on GitHub Pages.
- Every episode is narration-driven: the timeline is built from measured sentence durations, the score is a restrained
  bed under the voice, and each episode has intro, chapter and outro cards.
- The series has no promotional piece.

## Problem

A trailer for the whole series needs the opposite structure: music leads, visuals cut on bar lines, narration is sparse,
and the content must not depend on which episodes exist (the course is ongoing). The current pipeline cannot place
sentences on a musical grid, has no richer score, and always draws episode title cards.

## Goal

- `e00-trailer`: about 2:20 (length follows the music, not fixed), 1920×1080, 30 fps, delivered like the episodes.
- Eight narration lines (af_heart), burned-in English/Chinese captions; narration lands on bar lines.
- Sections: flat world → fold onto a curved space → application gallery (robot arm, drone SLAM loop closure, neural
  network with orthogonal weights, hyperbolic embedding of a hierarchy, diffusion tensor brain slice, subspace fitting)
  → rebuilding the toolkit on a curved landscape → montage of series shots → title.
- Score richer than the episode beds: pads, arpeggios, bass, synthesized drums, lead, convolution reverb, risers and
  impacts; the key walks all twelve steps of the circle of fifths and returns to C at the title.
- No knowledge-point claims beyond standard, general statements; nothing tied to the current episode list.
- Listed first on the web index as "Trailer"; no title cards, no chapter segments.

# Structure

## Modules

| Module | Responsibility |
|---|---|
| Series kind | `series.json` entries gain `kind`: `episode` (default) or `trailer` |
| Story beats | trailer scenes declare their length in bars; sentences declare the bar they start on |
| Beat timeline builder | builds the timeline from the bar grid; checks every sentence fits before the next anchor |
| Trailer score | original score for the trailer (section-aware arrangement, drums, lead, reverb, key walk) |
| Mix profile | ducking depth and loudness target selected by kind (episode: 10 dB / −16 LUFS; trailer: 4 dB / −14 LUFS) |
| Trailer assets | third-party data and models with recorded source and licence; prepared data files for the scenes |
| Trailer scenes | one scene file per section under `player/src/episodes/e00-trailer/` |
| Kind-aware player | no intro/chapter/outro cards for trailers; web index lists trailers first; seek bar without segments |

## Responsibilities

- Content (sentences, bar anchors, section lengths) is edited only in `content/episodes/e00-trailer/`.
- The beat timeline builder is the only writer of the trailer timeline; the trailer score reads it.
- Downloaded assets are recorded with source URL, licence and SHA-256 before they are used.

## State Ownership

| State | Writer | File |
|---|---|---|
| Episode kind | Series registry (hand-edited) | `content/series.json` |
| Trailer script and bar anchors | Episode content | `content/episodes/e00-trailer/{storyboard.md, story.en.json}` |
| Trailer timeline | Beat timeline builder | `build/e00-trailer/en/timeline.json` |
| Trailer score | Trailer score | `build/e00-trailer/en/audio/music.wav` |
| Asset provenance | Trailer assets | `player/public/trailer/SOURCES.md` |
| Prepared asset data | Asset preparation scripts | `player/public/trailer/*.json` |

# Interface

## Interfaces

- `content/series.json` entry: `{ "id", "order", "title", "status", "kind"?: "episode" | "trailer" }` (absent = `episode`).
- `story.en.json` for a trailer:
  - scene: `"bars": int` (section length), `"music"`: one of `trailer-open | trailer-fold | trailer-gallery |
    trailer-toolkit | trailer-montage | trailer-title`;
  - sentence: `"bar": int` (start bar relative to the scene start).
- Python: `EpisodeKind = Literal["episode", "trailer"]`; `StoryScene.bars: int | None`; `StorySentence.bar: int | None`;
  `BeatTimelineBuilder(bpm: float, beats_per_bar: int).build(story, provenance) -> Timeline`;
  `TrailerScore().compose(timeline) -> np.ndarray`; `MixProfile.for_kind(kind) -> MixSettings`;
  muxer loudness target from the same profile.
- TypeScript: `SeriesEpisode.kind?: "episode" | "trailer"`; `ChapterTiming.barSeconds?: number`; `Cues.bar(i)` (time of
  bar i in the chapter); `TitleLayer` draws nothing for trailers; `EpisodeIndex` renders trailers in their own row.

## Inputs

- Downloaded assets, quality first, each with a licence that permits public video use (candidates: Stanford HARDI
  diffusion MRI via DIPY for a real tensor field; a scanned point cloud for subspace fitting; models where a procedural
  build would look worse).

## Outputs

- `output/e00-trailer/v1/` (MP4, SRT, cover, manifest); trailer on the web index; `player/public/trailer/SOURCES.md`.

## State Changes

- `series.json` gains `e00-trailer` with `kind: "trailer"`, status `planned → scripted → delivered`.

# Flow

## Main Flow

```
content/episodes/e00-trailer/story.en.json (bars, bar anchors)
  → rvideo validate (trailer rules: bars present, anchors inside sections)
  → rvideo narrate                       → sentence WAVs
  → BeatTimelineBuilder (120 BPM, 4/4)   → timeline.json   (fails if a sentence overruns its slot)
  → subtitles → TrailerScore → mix (trailer profile) → capture → mux (−14 LUFS) → check
  → npm run site:build                   → trailer row on the web index
```

`rvideo deliver e00-trailer` runs the chain; the CLI picks the builders from the episode's `kind`.

# Code Mapping

## Modules

| Module | Files |
|---|---|
| Series kind | `pipeline/rvideo/schema/series.py`, `player/src/core/EpisodeLoader.ts` |
| Story beats | `pipeline/rvideo/schema/story.py`, `pipeline/rvideo/validate/content_validator.py` |
| Beat timeline builder | `pipeline/rvideo/timing/beat_timeline_builder.py`, `pipeline/rvideo/cli/main.py` |
| Trailer score | `pipeline/rvideo/music/trailer_score.py` (+ helpers in `pipeline/rvideo/music/`) |
| Mix profile | `pipeline/rvideo/audio/mix_profile.py`, `pipeline/rvideo/audio/narration_mixer.py`, `pipeline/rvideo/delivery/muxer.py` |
| Trailer assets | `pipeline/rvideo/assets/*.py` (data preparation), `player/public/trailer/` |
| Trailer scenes | `player/src/episodes/e00-trailer/{index.ts, sNN-*.ts, lib/*.ts}`, `player/src/episodes/registry.ts` |
| Kind-aware player | `player/src/layers/TitleLayer.ts`, `player/src/core/EpisodeRenderer.ts`, `player/src/core/Scene.ts`, `player/src/primitives/Cues.ts`, `player/src/web/{EpisodeIndex,PlayerControls,SegmentedSeekBar}.ts` |

## Interfaces

See Interface; every interface lives in the files listed above.

## State

See Structure → State Ownership.

# Implementation

## Phase 1

Phase Status: active

Round: 1

### Goal

Episode kind and story beats end to end: schemas, validator rules for trailers, kind-aware title layer, web index row,
seek bar without segments for trailers. Existing episodes unchanged.

### Files

`pipeline/rvideo/schema/{series,story}.py`, `pipeline/rvideo/validate/content_validator.py`, `player/src/core/{EpisodeLoader,EpisodeRenderer,Scene}.ts`, `player/src/layers/TitleLayer.ts`, `player/src/primitives/Cues.ts`, `player/src/web/{EpisodeIndex,PlayerControls,SegmentedSeekBar}.ts`

### Structures

`EpisodeKind`, `StoryScene.bars`, `StorySentence.bar`, `ChapterTiming.barSeconds`, `Cues.bar`

### Affected Modules

Series kind, Story beats, Kind-aware player

### Dependencies

none

### Observation

`rvideo validate` on all six episodes (unchanged results); typecheck; stills of E03 at its intro card and one chapter
card identical (hash) before and after the change.

## Phase 2

Phase Status: pending

Round: 2

### Goal

Beat timeline builder and kind dispatch in the CLI; mix profile and muxer loudness by kind.

### Files

`pipeline/rvideo/timing/beat_timeline_builder.py`, `pipeline/rvideo/audio/mix_profile.py`, `pipeline/rvideo/audio/narration_mixer.py`, `pipeline/rvideo/delivery/muxer.py`, `pipeline/rvideo/cli/main.py`

### Structures

`BeatTimelineBuilder`, `MixProfile`

### Affected Modules

Beat timeline builder, Mix profile

### Dependencies

Phase 1

### Observation

A test trailer story: chapter starts are exact multiples of the bar length; a deliberately overlong sentence is
rejected with its slot size; E03 timeline rebuild is byte-identical.

## Phase 3

Phase Status: pending

Round: 2

### Goal

Trailer score: arrangement per section, drums, bass, lead, reverb, risers/impacts, twelve-key walk ending in C.

### Files

`pipeline/rvideo/music/trailer_score.py`, `pipeline/rvideo/music/` helper files

### Structures

`TrailerScore`

### Affected Modules

Trailer score

### Dependencies

Phase 1

### Observation

Key-per-bar log covering all twelve keys and ending on C; spectrogram and RMS per section; peak and LUFS of the score;
the user listens to a score preview before scenes are finalized.

## Phase 4

Phase Status: pending

Round: 2

### Goal

Trailer assets: search, evaluate and download (quality first, licence suitable for public video), prepare data files
(DTI tensor slice, point cloud), record provenance.

### Files

`pipeline/rvideo/assets/*.py`, `player/public/trailer/**`

### Structures

Prepared JSON formats for the tensor slice and point cloud

### Affected Modules

Trailer assets

### Dependencies

none

### Observation

`SOURCES.md` table (asset, source URL, licence, SHA-256, size); preview renders of each prepared asset.

## Phase 5

Phase Status: pending

Round: 3

### Goal

Trailer storyboard and script: sections with bar lengths, eight sentences with bar anchors and Chinese captions;
audio built with the beat timeline.

### Files

`content/series.json`, `content/episodes/e00-trailer/{storyboard.md, story.en.json}`

### Structures

none new

### Affected Modules

Story beats, Series kind

### Dependencies

Phase 2, Phase 3

### Observation

`rvideo audio e00-trailer`: every sentence fits its slot; transcript check; total duration.

## Phase 6

Phase Status: pending

Round: 4

### Goal

Trailer scenes: flat world, fold, six application vignettes, toolkit landscape, montage, title.

### Files

`player/src/episodes/e00-trailer/**`, `player/src/episodes/registry.ts`

### Structures

episode-local geometry helpers (robot arm, drone, network, Poincaré disk, tensor glyphs, terrain)

### Affected Modules

Trailer scenes

### Dependencies

Phase 4, Phase 5

### Observation

Stills at every bar where something changes; determinism and history checks clean; visual review of each vignette.

## Phase 7

Phase Status: pending

Round: 5

### Goal

Deliver v1, rebuild and publish the web version, update docs.

### Files

`output/e00-trailer/v1/`, `site/` (gh-pages), `docs/video-architecture.md`, `docs/scene-authoring.md`, `README.md`, `content/series.json`

### Structures

none new

### Affected Modules

Delivery, web version, documentation

### Dependencies

Phase 6

### Observation

`rvideo check` report (durations, decode, −14 LUFS); trailer plays on the web index; docs describe kinds and the
beat timeline.
