# Scene Authoring

Conventions for writing an episode's script and chapter scenes. Verified on the E04 pilot chapter
`c03-ift-proof` (`player/src/episodes/e04-implicit-level-sets/c03-ift-proof.ts`), which is the
reference implementation.

## Files of one episode

| File | Content |
|---|---|
| `content/episodes/<eid>/storyboard.md` | content design: dependencies, per-chapter goals, proof steps, necessity examples, visual events |
| `content/episodes/<eid>/story.en.json` | narration: one scene per chapter, explicit `sentences` list with `en` and `zh` |
| `player/src/episodes/<eid>/cNN-<slug>.ts` | one scene class per chapter |
| `player/src/episodes/<eid>/index.ts` | chapter id → scene factory |
| `player/src/episodes/<eid>/lib/*.ts` | helpers used only by this episode |
| `player/src/episodes/registry.ts` | episode id → scene table (one line per episode) |

Scene ids in `story.en.json`, `storyboard.md` and `index.ts` are identical (`cNN-slug`).

## Script rules (`story.en.json`)

- `en` is both the TTS input and the English caption; `zh` is the Chinese caption of the same sentence.
- One sentence per entry. English ≤ 150 characters, Chinese ≤ 60 characters (the validator warns beyond).
  A caption block of two English lines plus one Chinese line fits the caption band.
- Mathematics is written as it is spoken: "R transpose R", "D y f", "U zero", "F inverse of u, v",
  "x perp", "n times n minus one, over two". Chinese captions may use symbols: "RᵀR"、"D_y f"、"U₀".
- `music` per scene: `motivation | definition | proof | counterexample | recap`.
- Pronunciation fixes live in `content/pronunciation.json` (regex → Kokoro phonemes, TTS input only).
  Existing rules: "Riesz" → reese; "A inverse" → letter A; the variable "a" when followed by
  punctuation, "equals", "to" or "and"; "covector(s)" and "submanifold(s)" with corrected stress. Avoid other single-letter ambiguities by phrasing
  ("the point a, b", "capital F").
- Sentence audio is cached by content hash; editing or inserting sentences re-synthesizes only the changed ones.

## Scene contract

```ts
interface Scene {
  readonly id: string;
  setup(layers: SceneLayers, timing: ChapterTiming): void;   // create every object here
  draw(ctx: SceneContext): void;                              // set every animated property here
  teardown(layers: SceneLayers): void;
}
```

- `draw` is a pure function of `ctx.localTime`: every property that changes anywhere in the chapter
  is set on every frame. Objects are never created in `draw`. No `Math.random`, `Date`, or state
  accumulated across frames (use `primitives/Seeded.ts` for fixed pseudo-randomness).
- Chapter time 0 is the chapter title card; the first sentence starts at 2.4 s. The card dims the stage,
  so keep the stage calm before sentence 0.
- Timing is anchored to sentences through `Cues` (`primitives/Cues.ts`), built as
  `new Cues(ctx, ctx.localTime)` in `draw` or `new Cues(timing, 0)` in `setup`:
  `s(i)` start of sentence i, `e(i)` end, `in(i, f)` fraction f through sentence i,
  `p(i, dur, offset)` smooth 0→1 starting at sentence i, `over(i, a, b)` 0→1 across the spoken part
  of sentence i, `during(i, j)` visible from sentence i until sentence j.
  Sentence indices follow the order in `story.en.json`; inserting a sentence shifts later indices.
- Formula and object motion between layouts uses `keyframes(t, [...])` (`primitives/Keyframes.ts`).
- Never toggle shader-affecting material flags (`transparent`, `vertexColors`, `side` …) inside `draw`: three.js
  compiles them into the shader on first use, so the picture would depend on which frame compiled it. Fix them in
  `setup` (keep a material transparent and animate `opacity`).
- `THREE.InstancedMesh` computes its bounding sphere once, from the instance matrices present at its first
  render, and uses it to order transparent objects; give moving instanced meshes a fixed bounding sphere in `setup`.
- A `BufferGeometry` whose positions change in `draw` must recompute its bounding sphere after the change when it is
  transparent: three.js sorts transparent objects by the bounding-sphere centre, so a stale sphere makes the draw
  order depend on render history.
- Resources that load asynchronously (textures, glTF models) are loaded in the scene's optional `preload()`, which
  the renderer awaits after `setup` before the frame is final.

## Layout grid (1920 × 1080)

| Region | Pixels | Use |
|---|---|---|
| Caption band | y ≥ 860 | reserved for burned-in captions; nothing else is drawn here |
| Ledger column | x ≥ 1400, y 170–760 | `ProofLedger` at `{ x: 1400, y: 210, width: 480, rowHeight: 125, capacity: 4 }` |
| Work area | x 60–1360 | stage and formulas; horizontal center x = 750 |
| Top formula band | y ≈ 100 | current statement / formula |
| Bottom formula band | y ≈ 800 | derivation line under the plots |

Chapters without a proof ledger may use the full width (center x = 960).
2D views: `stage.setView2D(cx, cy, worldHeight)` maps `worldHeight` world units to 1080 px.
3D views: `stage.setView3D(position, target, fovDeg)` with `z` up, called in `draw` every frame.
World-anchored labels are placed with `stage.project(point)` after the view is set for the frame.

## Colors (`primitives/Palette.ts`)

blue = the manifold / main object · orange = points, current step · green = established, tangent,
correct · red = failure, counterexample · purple = second object (second chart, codomain region,
second metric) · yellow = emphasized formula, latest ledger entry · muted gray = free variables, axes.

## Primitives (`player/src/primitives/`)

| Primitive | Notes |
|---|---|
| `Polyline` | screen-space width. `setPoints` always shows the full line; call `setProgress` after it for partial drawing. Changing the point count recreates the geometry. |
| `sampleCurve`, `circlePoints` | point sampling helpers |
| `Dot`, `Arrow`, `CurvedArrow`, `Region` | points, straight/curved arrows (`mode: "3d"` for cones), filled polygons |
| `Axes2D` | axes with optional grid and KaTeX labels |
| `WorldLabel` | KaTeX label pinned to a world point (follows a moving 3D camera) |
| `Surface`, `sphereFn` | parametric surface with iso-parameter wireframe |
| `TangentPlane`, `addStandardLights` | 3D helpers |
| `ProofLedger` | established-facts column; entries appear at given times, oldest fades past `capacity` |
| `keyframes`, `Easing`, `Cues`, `seeded` | timing and interpolation |

`FormulaLayer.add(spec)` renders KaTeX (`tex`) or text (`text`). `setContent` re-renders only when the
string changes. For progressive reveal with a stable layout, render hidden parts as `\phantom{...}`.
Colors inside TeX: `\textcolor{#ffa94d}{...}`. Options: `size`, `align`, `valign`, `boxed`, `display`, `maxWidth`.

## Trailers (`kind: "trailer"`)

A series entry with `"kind": "trailer"` (`content/series.json`) is music-led instead of narration-led:

- `story.en.json`: every scene has `"bars"` (its length on a 120 BPM 4/4 grid, 2 s per bar) and a `music` category
  `trailer-open | trailer-fold | trailer-gallery | trailer-toolkit | trailer-montage | trailer-title |
  trailer-credits`; every sentence has `"bar"`, the bar (relative to the scene) it starts on, 0.08 s after the
  downbeat. The beat timeline builder rejects a sentence that does not end before the next anchor.
- No title cards, no chapter segments on the web seek bar; captions use the shadow style (no box).
- Scenes time their motion with `Cues.bar(i)` (start of bar i in the chapter).
- Several independent pictures in one scene are rendered offscreen: each has its own `THREE.Scene` and camera and is
  drawn into a `WebGLRenderTarget` in `draw` before the stage renders (e00 gallery compositor, montage tiles).
- Score: `pipeline/rvideo/music/trailer_score.py` (arrangement on the episode voices plus `trailer_orchestra.py`),
  chord per bar in `trailer_harmony.py`; section bar counts there must match `story.en.json`.

## Verification of a chapter

1. `cd player && npx tsc --noEmit`
2. `.venv/bin/python -m rvideo.cli.main audio <eid>` (validate → narrate → timeline → subtitles → music → mix)
3. `.venv/bin/python -m rvideo.cli.main transcribe <eid>`; inspect sentences with similarity < 0.9
   (ASR spelling such as "dyf" for "D y f" is not a defect; check phonemes when unsure).
4. `cd player && npx tsx render/stills.ts --episode <eid> --outdir ../build/<eid>/en/qa/<name> --times t1,t2,... --port <free port>`
   with at least one time per visual event. The JSON result must report
   `determinism_mismatches: []` and `history_mismatches: []`.
5. Look at every still: nothing in the caption band, no overlap with the ledger column, labels
   readable and separate, formulas inside the frame, the picture matches the sentence being spoken.
6. Record defects and their resolution in `build/<eid>/en/qa/review.md`.

Capture and delivery: `npx tsx render/capture.ts --episode <eid> --out ../build/<eid>/en/render/video.mp4 --workers 5`,
then `.venv/bin/python -m rvideo.cli.main mux <eid> --version <N>` (refuses to overwrite an existing version).
