# Plan

Plan Status: completed

# Problem

## Current

- E07 v2 (`output/e07-gradient-descent/v2/`) covers Boumal Chapter 4. Its chapters c03–c07 and c09 (critical
  points, sufficient decrease, Lipschitz-type condition, backtracking, local convergence, gradient checks) match the
  course, which states those results as formulas at the end of the lecture.
- The lecture (`notes/07/笔记 2026年9月15日(1).pdf` pp. 19–21, blackboard photos in `notes/07/`) derives two things
  E07 only cites:
  - grad f(x) = Proj_x(∇f̄(x)) for any smooth extension f̄, by splitting ∇f̄(x) into tangent and normal parts
    (Boumal Prop. 3.61);
  - the projector onto T_xM for M = {x : c(x) = 0}: Proj_x = I − Jᵀ(JJᵀ)⁻¹J with J = Dc(x), from the least-squares
    problem min_w ‖q − Jᵀw‖² and (ker J)^⊥ = im Jᵀ (Boumal §7.7, (7.70)–(7.75)); on the sphere this is I − xxᵀ, and
    f̄(x) = ‖x‖² has Euclidean gradient 2x but Riemannian gradient 0.
- The lecture writes the pullback as f̂_x = f∘R_x; E07 c02 writes f∘R_x only.

## Problem

E07 states the projection rule for submanifold gradients without proof and never derives the projector, and its
pullback notation differs from the course.

## Goal

E07 v3 in `output/e07-gradient-descent/v3/` (v1, v2 kept):

- c08 proves grad f = Proj_x ∇f̄, derives Proj_x = I − Jᵀ(JJᵀ)⁻¹J, specializes it to the sphere, and checks it on
  f̄ = ‖x‖² before the Rayleigh example.
- c02 introduces the name f̂_x for the pullback and uses it in the derivative identity.
- All other chapters unchanged; their sentences reuse cached audio.

# Structure

## Modules

| Module | Responsibility | Owned state |
|---|---|---|
| Content design | c02 and c08 teaching sequence and visual events | `content/episodes/e07-gradient-descent/storyboard.md` |
| Script | narration and translations | `content/episodes/e07-gradient-descent/story.en.json` |
| Glossary | new terms | `content/glossary.json` |
| E07 scenes | c02 pullback formulas, c08 projection section | `player/src/episodes/e07-gradient-descent/c02-taylor-on-curves.ts`, `c08-computing-gradients.ts` |
| Audio pipeline (existing) | TTS, timeline, mix, delivery | `build/e07-gradient-descent/`, `output/e07-gradient-descent/v3/` |
| Review | defects and closure evidence | `build/e07-gradient-descent/en/qa/review.md` |
| Docs | delivered version and measurements | `docs/video-architecture.md`, `README.md` |

## Ownership

- Narration has one owner, `story.en.json`; scene timing is read from the generated timeline through `Cues`.
- Shared player code and the pipeline are unchanged.

# Interface

- Story schema and chapter ids unchanged. c08 sentence indices after s21 shift; c08 scene cues are rewritten to the
  new indices. c02 keeps its sentence count.
- c08 new sentences s22–s43: proof of the projection rule (s22–s28), projector derivation (s29–s36), sphere and
  ‖x‖² check (s37–s40), Rayleigh example and caveats (s41–s43); cheap-gradient section moves to s44–s48.

# Flow

storyboard → story.en.json → `rvideo validate` → `rvideo audio` (only changed sentences synthesize) → scenes →
stills at the changed sentences → `rvideo deliver --version 3` → review of v3 frames → docs.

# Code Mapping

| Change | File |
|---|---|
| c02, c08 storyboard entries | `content/episodes/e07-gradient-descent/storyboard.md` |
| c02 s14, s18, s19, s21 wording; c08 s22–s48 | `content/episodes/e07-gradient-descent/story.en.json` |
| ambient-gradient, orthogonal-projector terms | `content/glossary.json` |
| f̂_x in pullback label, ledger and derivation | `player/src/episodes/e07-gradient-descent/c02-taylor-on-curves.ts` |
| projection proof, projector, sphere check | `player/src/episodes/e07-gradient-descent/c08-computing-gradients.ts` |
| v3 row and duration | `docs/video-architecture.md`, `README.md` |

# Tasks

## Phase 1 — Script and storyboard

Phase Status: completed

- Edit storyboard c02/c08, story sentences, glossary.
- Validation: `rvideo validate` reports 0 errors, 0 warnings; projector identities checked numerically
  (J Proj = 0, Proj² = Proj, sphere case equals I − xxᵀ).

## Phase 2 — Audio and timeline

Phase Status: completed

- `rvideo audio`, `rvideo transcribe`.
- Validation: changed sentences synthesized, others cached; c08 duration and transcription similarity reported.

## Phase 3 — Scenes

Phase Status: completed

- c02 notation; c08 new section.
- Validation: stills at every new c08 sentence and c02 s14–s21, read at full size; no overlap with captions
  (y ≥ 860) or ledger (x ≥ 1400).

## Phase 4 — Delivery and review

Phase Status: completed

- `rvideo deliver --version 3`; frames from the v3 file at c02 and c08; review record; docs.
- Validation: check OK, duration, loudness, peak, full decode; publish only after user approval.
