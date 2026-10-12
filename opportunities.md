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

E07 scenes import `SvgOverlay`, `MiniPlot` and `setOrbitView` from `player/src/episodes/e06-gradient-retraction/lib/`; the helpers are episode-independent.

## Opportunity

Move the three helpers to `player/src/primitives/` and import them from there in E06 and E07.

## Expected Mechanism

Pure file move with import updates; no behavior change.

## Required Evidence

`tsc --noEmit`; E06 and E07 stills hash-identical before and after.

## Promotion Condition

A third episode needs the helpers, or the user asks for it.
