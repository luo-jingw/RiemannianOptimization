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
