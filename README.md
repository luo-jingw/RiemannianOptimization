# Riemannian Optimization from the Ground Up

A narrated explainer series for the EECE7223 *Riemannian Optimization* course, rebuilt from the course notes
from the foundations up. Every theorem is presented with its motivation, a complete proof, and an animated
counterexample showing why each hypothesis is needed.

- English narration (Kokoro TTS, voice `af_heart`), bilingual captions (English above Chinese)
- Original procedural score; each episode's key moves one step around the circle of fifths
- Animations are rendered with Three.js + KaTeX — the same code produces the MP4 videos and plays live in the browser

## Episodes

| # | Title | Length | Topics |
|---|---|---|---|
| 1 | Nearness Without Coordinates: Topology | 34 min | open sets, convergence, continuity (≡ ε–δ), homeomorphism, why the inverse must be continuous |
| 2 | Charts, Atlases and Smooth Manifolds | 35 min | charts, Hausdorff (line with two origins), transition maps, smooth compatibility, smooth maps, diffeomorphisms |
| 3 | The Inverse Function Theorem | 36 min | derivative as linear map, contraction principle, full Rudin proof, four counterexamples |
| 4 | Implicit Functions and Regular Level Sets | 31 min | implicit function theorem from the IFT, regular values, regular level-set theorem, crossings and cusps |
| 5 | Tangent Spaces and the Orthogonal Group | 41 min | tangent vectors as velocities, T_pM = ker Dh(p), rank–nullity, O(n) and SO(n) |
| 6 | Riemannian Gradient and Retraction | 37 min | differential, dual space, Riesz, Riemannian metric and gradient, steepest ascent, retractions, descent property |

The series stops at the current course frontier (retraction and the first-order descent property); new episodes
are appended as the notes grow.

## Watch in the browser

Online: **https://luo-jingw.github.io/RiemannianOptimization/** — every frame is rendered live by Three.js (no video files).

Locally:

```bash
cd player
npm install
npm run site:build     # builds ../site from build/ (needs the episode audio, see below)
npm run site:serve     # http://localhost:8000
```

Controls: play/pause, seek bar, chapter menu; keys `space`, `←`/`→` (±5 s), `n`/`p` (next/previous chapter).

## Repository layout

```
content/      hand-edited sources: series.json, glossary.json, pronunciation.json,
              episodes/<eid>/{storyboard.md, story.en.json}
pipeline/     Python build pipeline (package rvideo): narration, timeline, subtitles, music, mix, mux, checks
player/       TypeScript renderer: core/ layers/ primitives/ (shared), episodes/<eid>/ (one scene per chapter),
              render/ (frame capture, review stills, static site build), web/ (browser player UI)
docs/         knowledge map, architecture, scene-authoring rules
build/        generated (not in git)      output/   delivered videos (not in git)      site/   web build (not in git)
```

Course notes (`notes/`) are not part of the repository.

## Building

Requirements: Python 3.11 (uv), Node 22+, ffmpeg, Google Chrome, an NVIDIA GPU for fast TTS (CPU works, slower).

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python torch --index-url https://download.pytorch.org/whl/cu124
uv pip install --python .venv/bin/python -e pipeline "transformers>=4.44" faster-whisper \
  "en_core_web_sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
(cd player && npm install)

# audio for one episode: validate → narrate → timeline → subtitles → music → mix
.venv/bin/python -m rvideo.cli.main audio e04-implicit-level-sets

# full video delivery: audio → capture → mux → automated checks → output/<eid>/v1/
.venv/bin/python -m rvideo.cli.main deliver e04-implicit-level-sets --version 1
```

Preview while editing: `cd player && npm run dev`, then open `http://127.0.0.1:5173/?episode=<eid>`.

## Adding an episode

See `docs/video-architecture.md` (pipeline, delivery, web version, adding episodes) and
`docs/scene-authoring.md` (script rules, scene contract, layout grid, verification).
