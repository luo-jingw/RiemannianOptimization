# Plan

Plan Status: approved

# Problem

## Current

- E01–E06 are delivered and published; E06 ends with the Riemannian gradient, retractions and the descent property
  d/dt f(R_x(−t grad f(x)))|₀ = −‖grad f(x)‖²_x.
- The course's next reading is Boumal, *An Introduction to Optimization on Smooth Manifolds* (2023), Chapter 4
  "First-order optimization algorithms" (`notes/07/IntroOptimManifolds_Boumal_2022.pdf`, PDF pages 69–98). No
  lecture notes for this topic exist yet; they arrive after the lecture and will drive a revision.
- `docs/knowledge-map.md` stops at the retraction; Riemannian gradient descent is marked "next topic, not yet in notes".

## Problem

There is no episode that turns the gradient and the retraction into an algorithm and proves what it achieves: where
it stops (critical points), how many steps it needs (O(1/√K) under a Lipschitz-type condition), how to choose step
sizes without knowing L (backtracking), how fast it converges near a minimizer (linear, rate 1 − 1/κ), and how to
obtain and check gradients in practice.

## Goal

E07 v1 (`e07-gradient-descent`, "Riemannian Gradient Descent"), a full episode in the series format, built from
Boumal Chapter 4 alone, delivered as a draft for review before the lecture:

- Every section of Chapter 4, including the starred 4.6–4.8; 4.7 condensed to the recipe and three examples.
- Every theorem with motivation, complete proof and an animated counterexample for each hypothesis
  (PROJECT.md constraint).
- Notions used before the series defines them (Riemannian distance, exponential map, Hessian in 4.6) are introduced
  with exactly the properties the proofs use and labelled as previews.
- Narration English (Kokoro af_heart), bilingual captions, procedural score in the next key of the circle of fifths;
  output `output/e07-gradient-descent/v1/`. Length follows content (E01–E06: 31–41 min).
- The storyboard records Boumal section/theorem numbers as sources so the lecture notes can be mapped onto it.

# Structure

## Modules

| Module | Responsibility | Owned state |
|---|---|---|
| Series registry | episode order, id, title, status | `content/series.json` |
| Knowledge map | course dependency structure | `docs/knowledge-map.md` |
| Content design | chapter goals, dependencies, proofs, counterexamples, visual events | `content/episodes/e07-gradient-descent/storyboard.md` |
| Script | narration and translations per chapter | `content/episodes/e07-gradient-descent/story.en.json` |
| Glossary | terms and pronunciations | `content/glossary.json`, `content/pronunciation.json` |
| Audio pipeline (existing) | TTS, timeline, captions, score, mix, delivery | `build/e07-gradient-descent/`, `output/e07-gradient-descent/` |
| E07 scenes | one scene per chapter, `draw(t)` only | `player/src/episodes/e07-gradient-descent/` |
| Episode registry | episode id → scenes | `player/src/episodes/registry.ts` |
| Review | defects and closure evidence | `build/e07-gradient-descent/en/qa/review.md` |

## Ownership

- Narration text has one owner, `story.en.json`; the storyboard holds no final narration.
- Timing has one owner, the generated `timeline.json`; scenes read sentence starts/ends through `Cues`.
- Shared player code (`core`, `layers`, `primitives`) and the pipeline are not changed; E07 helpers live in the
  episode's `lib/`.

# Interface

- Story: the existing episode schema (`episode`, `title`, `voice`, `rate`, `scenes[] {id, chapter, title, music,
  terms, sentences[] {en, zh}}`), checked by `rvideo validate`.
- Scenes: `Scene` (`setup(layers, timing)`, `draw(ctx)`, `teardown`) registered in
  `player/src/episodes/e07-gradient-descent/index.ts` under the chapter ids.
- Chapters (ids are the interface between storyboard, story and scenes):

| id | Content (Boumal) |
|---|---|
| c01-problem-and-sequences | problem (4.1), global / local / strict minimizers, independence from smooth structure, limit vs accumulation point (Def 4.1, Ex 4.2) |
| c02-taylor-on-curves | first-order Taylor expansion along curves and along retractions, the pullback f∘R_x (4.1, eqs 4.2–4.5) |
| c03-critical-points | critical points (Def 4.4), Prop 4.5 local minimizer ⇒ critical, Prop 4.6 critical ⇔ grad f = 0 |
| c04-rgd-and-sufficient-decrease | Algorithm 4.1, step-size strategies, A4.1, A4.2, Prop 4.7 and its limits (accumulation points, not convergence) |
| c05-lipschitz-type-condition | A4.3, Euclidean motivation (4.10 ⇒ 4.11), Prop 4.8, Cor 4.9, dimension-free rate, Ex 4.11 |
| c06-backtracking | Armijo condition, Algorithm 4.2, Lemma 4.12, Cor 4.13, scale-invariant initial steps (4.13) |
| c07-local-convergence | global vs local, rates (Defs 4.14–4.15), Thm 4.16 and Cors 4.17–4.18, Thm 4.19 local contraction, Thm 4.20 with Lemmas 4.21–4.22 |
| c08-computing-gradients | Df → adjoint → grad, the three rules, grad of ‖F‖², X⁻¹, log det, projection onto tangent spaces (4.7) |
| c09-checking-gradients | E(t) = O(t²), log–log slope test, Stiefel example with a sign error (4.8, Fig 4.1) |
| c10-recap | the first-order toolkit and what needs new geometry: transporters (CG, BFGS), Hessian (Newton, trust regions) |

- Running example: the Rayleigh quotient f(x) = ½ xᵀAx on S² with the normalization retraction (Ex 4.11), so RGD
  finds the eigenvector of the smallest eigenvalue; 1-D functions for counterexamples; Stiefel only in c09.

# Flow

storyboard.md (P1) → story.en.json (P2) → `rvideo validate` → sample chapter c06: `rvideo audio`, scene, stills
(P3) → full `rvideo audio` and `transcribe` (P4) → all scenes, stills per visual event (P5) →
`rvideo deliver e07-gradient-descent --version 1` and `check` (P6) → frame and listening review, fixes (P7) →
user review; after approval: site rebuild, docs, push (P8).

# Code Mapping

| Item | Files |
|---|---|
| Registry | `content/series.json`, `player/src/episodes/registry.ts` |
| Content | `content/episodes/e07-gradient-descent/storyboard.md`, `story.en.json`; `content/glossary.json`, `content/pronunciation.json` |
| Scenes | `player/src/episodes/e07-gradient-descent/{index.ts, c01…c10-*.ts, lib/*.ts}` |
| Knowledge | `docs/knowledge-map.md` (RGD subtree, source tag BM4) |
| Review | `build/e07-gradient-descent/en/qa/review.md` |
| Delivery | `output/e07-gradient-descent/v1/` |
| Publication (after approval) | `site/`, `README.md`, `docs/video-architecture.md` |

# Implementation Phases

## Phase 1

Phase Status: completed

Round: 1

### Goal

Storyboard: dependency table, ten chapters with question, requires, teaching sequence, proof steps, one
counterexample per hypothesis, visual events, outcome check, sources; knowledge-map extension; glossary additions.

### Files

`content/episodes/e07-gradient-descent/storyboard.md`, `docs/knowledge-map.md`, `content/glossary.json`

### Structures

chapter ids above

### Affected Modules

Content design, knowledge map, glossary

### Dependencies

none

### Observation

Every content id has its prerequisites established earlier or in E01–E06; every hypothesis of every theorem has a
counterexample entry; every chapter cites Boumal numbers.

## Phase 2

Phase Status: active

Round: 1

### Goal

Script and registration: story.en.json with Chinese translations, series entry, pronunciation fixes.

### Files

`content/episodes/e07-gradient-descent/story.en.json`, `content/series.json`, `content/pronunciation.json`

### Structures

none new

### Affected Modules

Script, series registry

### Dependencies

Phase 1

### Observation

`rvideo validate` with zero errors; sentence count and estimated minutes printed.

## Phase 3

Phase Status: pending

Round: 1

### Goal

Sample: c06-backtracking end to end (audio, scene, stills), plus the episode's shared lib (sphere with the
Rayleigh quotient, 1-D plot panel, ledger).

### Files

`player/src/episodes/e07-gradient-descent/{index.ts, c06-backtracking.ts, lib/*}`, `player/src/episodes/registry.ts`

### Structures

E07 `lib` helpers

### Affected Modules

E07 scenes, episode registry

### Dependencies

Phase 2

### Observation

Audio report; stills at every visual event of c06 with determinism and history checks; transcription similarity.

## Phase 4

Phase Status: pending

Round: 1

### Goal

Full audio and timeline; transcription check.

### Files

`build/e07-gradient-descent/en/`

### Structures

none

### Affected Modules

Audio pipeline (run only)

### Dependencies

Phase 3

### Observation

Narration and mix report; sentences with similarity < 0.9 inspected.

## Phase 5

Phase Status: pending

Round: 1

### Goal

Remaining nine chapter scenes.

### Files

`player/src/episodes/e07-gradient-descent/c0*-*.ts`, `c10-recap.ts`, `lib/*`

### Structures

none new

### Affected Modules

E07 scenes

### Dependencies

Phase 4

### Observation

`tsc --noEmit`; stills at every visual event; determinism and history checks; visual review against the storyboard.

## Phase 6

Phase Status: pending

Round: 1

### Goal

Deliver v1 and review it.

### Files

`output/e07-gradient-descent/v1/`, `build/e07-gradient-descent/en/qa/review.md`

### Structures

none

### Affected Modules

Delivery, review

### Dependencies

Phase 5

### Observation

`rvideo check` report; frames every 10 s and at every chapter boundary reviewed; listening spot checks.

## Phase 7

Phase Status: pending

Round: 1

### Goal

After the user's review: site rebuild, README episode row, docs, push.

### Files

`site/`, `README.md`, `docs/video-architecture.md`

### Structures

none

### Affected Modules

Web version, documentation

### Dependencies

Phase 6

### Observation

Web index plays E07.
