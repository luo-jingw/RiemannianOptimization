# Plan

Plan Status: completed

# Problem

## Current

- E01–E07 are delivered and published. E07 ends with first-order methods and names the Riemannian Hessian and
  vector transport as the tools still missing.
- The lecture notes in `notes/08/` (`笔记 2026年9月15日(2).pdf` pp. 25–30, blackboard photos) continue from RGD
  convergence and backtracking (pp. 22–24, covered by E07) into second-order geometry: the velocity field of the
  circle and why its naive derivative fails, affine connections (three axioms), coordinates and Christoffel symbols,
  metric compatibility, torsion-freeness and the Lie bracket, the fundamental theorem with the Koszul formula, the
  Riemannian connection of a submanifold ∇_v X = Proj(DX̄(p)[v]), geodesics ∇_γ̇ γ̇ = 0, the exponential map and
  parallel transport. Several handwritten words are unclear; the storyboard records the reading used for each.
- Reference text: Boumal (2023) §5.1–5.8, §5.10, §10.2–10.3 (`notes/07/IntroOptimManifolds_Boumal_2022.pdf`).
  Christoffel symbols and the coordinate form of the geodesic equation come from the lecture, not from Boumal.

## Problem

No episode explains how to differentiate a vector field on a manifold, which connection is the right one, and what
geodesics, the exponential map and parallel transport are.

## Goal

E08 v1 (`e08-connections-geodesics`, "Connections, Geodesics and Parallel Transport") in the series format,
published on the site:

- Every theorem with motivation, proof (or a labelled proof sketch where the lecture gives one) and an animated
  counterexample for each hypothesis that has one.
- Running examples verified numerically: the circle's velocity field; Lie bracket of U = (1,0), V = (0, x₁x₂)
  (flow gap / ε² → 1); polar coordinates (Γ^r_θθ = −r, Γ^θ_rθ = Γ^θ_θr = 1/r; straight lines solve the geodesic
  ODE to 1e-16); connections on ℝ³ that fail one axiom (DY[X] + X×Y compatible with torsion 2X×Y; DY[X] + ⟨X,Y⟩a
  torsion-free, incompatible); latitude circles on S² (tangential acceleration sinθ cosθ, zero only on the
  equator); normalization retraction vs Exp (error/t³ → 1/3) and a first-order-only retraction (error/t² → 1/2);
  parallel transport around the octant triangle (rotation 90.0°, length 1).

# Structure

## Modules

| Module | Responsibility | Owned state |
|---|---|---|
| Series registry | order, id, title, status | `content/series.json` |
| Knowledge map | course dependency structure | `docs/knowledge-map.md` |
| Content design | chapter goals, dependencies, proofs, counterexamples, visual events, note readings | `content/episodes/e08-connections-geodesics/storyboard.md` |
| Script | narration and translations | `content/episodes/e08-connections-geodesics/story.en.json` |
| Glossary | terms | `content/glossary.json` |
| E08 scenes | one scene per chapter, `draw(t)` only; E08 helpers in `lib/` | `player/src/episodes/e08-connections-geodesics/` |
| Episode registry | id → scenes | `player/src/episodes/registry.ts` |
| Audio / capture / delivery (existing) | TTS, timeline, mix, cached capture, mux, check | `build/e08-connections-geodesics/`, `output/e08-connections-geodesics/v1/` |
| Review | defects and closure evidence | `build/e08-connections-geodesics/en/qa/review.md` |
| Docs | delivered list, measurements | `README.md`, `docs/video-architecture.md` |

## Ownership

- Narration has one owner, `story.en.json`; timing is read from the generated timeline through `Cues`.
- Shared player code and the pipeline are unchanged; E08 reuses E06/E07 helpers by import.

# Interface

- Story schema and scene contract unchanged (`Scene.setup/draw/teardown`, sentence cues, caption band y ≥ 860,
  ledger x ≥ 1400).
- Chapters:

| id | Content |
|---|---|
| c01-why-new-derivative | circle velocity field; γ̈ leaves the tangent line; difference quotient compares vectors in different tangent spaces; D(grad f) on the sphere is not tangent (BM §5.1) |
| c02-vector-fields-brackets | X f, Lie bracket, mixed partials cancel, flow commutator gap ε²[X,Y], coordinate fields commute (BM Def 5.5, Prop 5.10) |
| c03-affine-connections | axioms (lecture; BM Def 5.20/5.1), Euclidean connection, role of each axiom, many connections |
| c04-christoffel-symbols | coordinate expansion of ∇_X Y, Γ^k_ij, polar coordinates, constant components ≠ parallel |
| c05-compatibility-torsion | metric compatibility, torsion-free, [X,Y]; counterexamples on ℝ³/ℝ²; torsion-free ⇔ Γ symmetric |
| c06-fundamental-theorem | Koszul formula derived; uniqueness; existence sketch; Γ = ½g⁻¹(∂g + ∂g − ∂g), polar check (BM Thm 5.6) |
| c07-submanifold-connection | ∇_v X = Proj(DX̄[v]): independent of extension, compatible, torsion-free; rotation field on S² (BM Thm 5.2, 5.8, 5.9) |
| c08-geodesics | covariant derivative along curves, acceleration, ∇_γ̇γ̇ = 0, great circles vs latitudes, coordinate ODE, existence and uniqueness (BM §5.7–5.8) |
| c09-exponential-map | Exp_x(tv) = γ_v(t), sphere formula, injectivity radius π, Exp is a second-order retraction, normalization vs first-order-only retraction (BM Def 10.16, Prop 10.18, Def 5.42) |
| c10-parallel-transport | D/dt Z = 0, linear isometry, great-circle transport, octant holonomy, use in transporters (BM Def 10.35, Prop 10.36) |
| c11-recap | chain of results; Riemannian Hessian Hess f(x)[u] = ∇_u grad f as the next step (BM Def 5.14) |

# Flow

storyboard → story.en.json → validate → audio → scenes → stills at every third sentence and all dense frames →
fixes → deliver v1 → frames from the delivered file → review → series status, knowledge map, docs → site build →
push main and gh-pages.

# Code Mapping

| Item | File |
|---|---|
| storyboard, story | `content/episodes/e08-connections-geodesics/{storyboard.md,story.en.json}` |
| glossary, series | `content/glossary.json`, `content/series.json` |
| scenes | `player/src/episodes/e08-connections-geodesics/{index.ts,c01…c11-*.ts,lib/*.ts}` |
| registry | `player/src/episodes/registry.ts` |
| docs | `docs/knowledge-map.md`, `docs/video-architecture.md`, `README.md` |

# Tasks

## Phase 1 — Storyboard and script

Phase Status: completed

- Validation: `rvideo validate e08-connections-geodesics` 0 errors, 0 warnings; every numeric claim in the script
  matches the verification run above.

## Phase 2 — Audio

Phase Status: completed

- Validation: narrate/timeline/mix reports; transcription similarity listed, low scores inspected.

## Phase 3 — Scenes

Phase Status: completed

- Validation: typecheck; stills every third sentence with determinism/history checks; dense frames viewed at full
  size; no overlap with captions or ledger.

## Phase 4 — Delivery and publication

Phase Status: completed

- Validation: check OK (durations, decode, loudness, peak); frames from the delivered file at each chapter; site
  serves the new timeline.
