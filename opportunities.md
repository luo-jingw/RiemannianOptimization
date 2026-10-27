# OPT-001

Status: proposed

Area: audio (E04, E05)

## Observation

E04 v1 and E05 v1 were narrated before the "submanifold" stress rule was added to `content/pronunciation.json`.

## Opportunity

Deliver v2 of E04/E05 with the corrected pronunciation.

## Expected Mechanism

`rvideo deliver <eid> --version 2` re-synthesizes only sentences containing the word; scenes are sentence-anchored.

## Required Evidence

Listening check of the affected sentences.

## Promotion Condition

The user asks for it.

# OPT-002

Status: proposed

Area: player primitives

## Observation

E04 needed an unlit translucent patch (`episodes/e04-implicit-level-sets/lib/FlatPatch.ts`) because lit `Surface`/`TangentPlane` patches facing away from the key light disappear.

## Opportunity

Add an `unlit` / `renderOrder` option to the shared `Surface` and `TangentPlane`.

## Expected Mechanism

MeshBasicMaterial variant selected by an option.

## Required Evidence

Stills of a back-facing patch with and without the option.

## Promotion Condition

A second episode needs the same workaround.

# OPT-003

Status: proposed

Area: player primitives

## Observation

E07 and E08 scenes import `SvgOverlay`, `MiniPlot` and `setOrbitView` from `player/src/episodes/e06-gradient-retraction/lib/`; the helpers are episode-independent. The promotion condition (a third episode) is met.

## Opportunity

Move the three helpers to `player/src/primitives/` and import them from there in E06 and E07.

## Expected Mechanism

Pure file move with import updates; no behavior change.

## Required Evidence

`tsc --noEmit`; E06 and E07 stills hash-identical before and after.

## Promotion Condition

A third episode needs the helpers, or the user asks for it.

# OPT-004

Status: proposed

Area: site build

## Observation

`render/build-site.ts` encodes each episode's site audio from `build/<eid>/en/audio/mix.wav` (about 0.8 GB per episode) and fails when it is missing, although the delivered MP4 already carries the same mix, loudness-normalized, as AAC.

## Opportunity

Take the site audio from the delivered MP4 of the published version, so intermediate WAVs can be deleted without breaking the site build.

## Expected Mechanism

Copy or re-encode the MP4's audio stream to `data/<eid>/audio.m4a`; the series manifest or the output directory names the published version.

## Required Evidence

Site audio duration equals the timeline; loudness within 0.5 LU of the current site audio.

## Promotion Condition

The user wants build/ kept small, or another cleanup removes the mixes again.
