# ISSUE-001

Status: resolved

Area: audio (narration and score)

## Observation

Narration (Kokoro af_heart) and the procedural score have only been checked numerically: Whisper transcripts match the script (mean similarity 0.97 on the pilot), loudness −16.0 LUFS, ducking ≈10.5 dB under speech. No human has listened to them.

## Impact

Prosody, pronunciation naturalness and musical pleasantness are unverified.

## Evidence

`build/e04-implicit-level-sets/en/qa/transcript-check.json`, `build/e04-implicit-level-sets/en/qa/review.md`, `output/e04-implicit-level-sets/v0/`.

## Hypotheses

Single-letter variables may sound unnatural in places; the score may be too busy in the 1–4 kHz band during proofs.

## Next Experiment

—

## Resolution

The user watched the pilot `output/e04-implicit-level-sets/v0/` (2026-10-08) and judged its overall quality good; voice, music and visual style stay as they are for the full series.

# ISSUE-002

## Observation

Trailer deliveries at −14 LUFS decode with a sample peak just above full scale: `astats` on `output/e00-trailer/v3/e00-trailer.en.mp4` reports +0.06 dB; the v3 check report shows the same kind of overshoot. Episodes at −16 LUFS stay near −1.4 dBFS.

## Evidence

`ffmpeg -i output/e00-trailer/v3/e00-trailer.en.mp4 -af astats=measure_overall=Peak_level -f null -`

v4 (rebuilt score, softer transients) checks at −1.2 dBFS peak with the same muxer settings, so the overshoot depends on the score's transient content.

## Hypotheses

The two-pass loudnorm reaches −14 LUFS by raising the gain; its true-peak limit is not enforced tightly enough for the dense trailer mix, and AAC encoding adds intersample overshoot.

## Next Experiments

Lower the muxer's loudnorm true-peak target (TP) for the trailer profile and re-measure the decoded peak.

# ISSUE-003

## Observation

In the Chinese captions, the combining macron U+0304 does not render: "f̄" (f + U+0304) appears as a plain "f". The E06 Chinese captions contain 8 such marks in 6 sentences: f̄ (the smooth extension, c02 s33–s36, 7:07–7:40) and t̄ (the step bound, c09 s25 and s29, 34:02 and 34:37). Delivered E06 v1 shows "f" and "t" there; c02 s33 then reads "f is the restriction of a smooth function f to M". The combining overline U+0305 renders correctly over "f" in the same font.

## Evidence

Headless Chrome with the player's `@fontsource/noto-sans-sc` 500 weight, 44 px: "f̄" shows no mark, "f̅" and "x̄" with the system fallback font show a bar. In the E07 v3 stills (c08 s26, s28), "∇f̄" written with U+0305 shows the bar.

## Hypotheses

The fontsource Noto Sans SC build positions or omits U+0304 for Latin bases in a way Chrome does not compose.

## Next Experiments

Re-render the affected E06 captions with U+0305 in a new E06 version, or add a caption font fallback that composes U+0304, and compare the stills.
