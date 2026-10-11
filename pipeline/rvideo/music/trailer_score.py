"""Original score for the series trailer, built on the episode palette and enriched.

Design:
- Sound: the episode voices (music_composer.Voices: additive pad, soft pluck as harp, FM bell, sine bass) and the
  episode harmony (maj7 / min7 / add9, legato chords, the four-note signature) are the core; trailer_orchestra adds
  strings, piano, horn, timpani and soft percussion.
- Harmony: trailer_harmony gives one chord per bar; five key changes, each prepared (C → G → D → A → C).
- Dynamics: one continuous intensity curve over the bars (INTENSITY). Every layer fades in over its own intensity
  threshold, so the texture thickens gradually instead of switching at section lines.
- Transitions breathe: the gallery's last bar thins out and a cymbal swell leads into the toolkit; the four toolkit
  words get pitched bell accents over the unbroken bed; timpani rolls and cymbal swells lead into the montage and the
  title, which lands on full C with a soft low hit and the bell signature.
Everything is deterministic for a given timeline.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import lfilter

from rvideo.music.music_composer import SIGNATURE, Voices
from rvideo.music.trailer_dsp import SR, hz
from rvideo.music.trailer_harmony import BarChord, TrailerHarmony
from rvideo.music.trailer_orchestra import Orchestra
from rvideo.music.trailer_reverb import Reverb
from rvideo.schema.timeline import Timeline

# (bar from the trailer start, intensity 0..1); linear between keyframes. Sections: open 0–7, fold 8–14,
# gallery 15–38 (shots from 15, 21, 26, 30, 33, 36), toolkit 39–54, montage 55–64, title 65–72, credits 73–76.
INTENSITY = ((0, 0.10), (8, 0.22), (15, 0.38), (21, 0.50), (26, 0.58), (30, 0.66), (33, 0.74), (36, 0.82),
             (37, 0.86), (38, 0.28), (39, 0.30), (46, 0.40), (50, 0.56), (54, 0.78), (55, 0.86), (64, 0.97),
             (65, 1.00), (69, 0.60), (73, 0.30), (77, 0.10))

# The four toolkit words; their onsets follow player/src/episodes/e00-trailer/lib/toolkit-words.ts (wordOnsets).
TOOLKIT_WORDS = ("direction", "distance", "gradient", "step")
TOOLKIT_TRAILING_SILENCE = 0.45
# Gallery cuts land this many seconds before their bar line (player/src/episodes/e00-trailer/lib/gallery-shots.ts).
CUT_LEAD = 0.25

# Piano phrase rhythms by chord length in bars: (start beat, length in beats); contour up, up, down, down.
PHRASES = {
    1: ((0, 1), (1, 0.5), (1.5, 0.5), (2, 2)),
    2: ((0, 1.5), (1.5, 0.5), (2, 2), (4, 4)),
    3: ((0, 1.5), (1.5, 0.5), (2, 2), (4, 2), (6, 6)),
    4: ((0, 2), (2, 1), (3, 1), (4, 4), (8, 8)),
}
CONTOUR = (0, 1, 1, -1, -1)
MELODY_SECTIONS = ("trailer-gallery", "trailer-toolkit", "trailer-montage")


def _ramp(intensity: float, threshold: float) -> float:
    """Gain of a layer: 0 below its threshold, 1 a little above, smooth in between."""
    u = min(1.0, max(0.0, (intensity - threshold + 0.05) / 0.15))
    return u * u * (3 - 2 * u)


def _low(root: int) -> int:
    """The chord root in the episode bass register."""
    return root - 12 if root > 45 else root


class TrailerScore:
    def __init__(self) -> None:
        self.harmony = TrailerHarmony()

    # -- observation --------------------------------------------------------------------------------------
    def key_log(self, timeline: Timeline) -> list[str]:
        return self.harmony.log(timeline)

    @staticmethod
    def intensity(bar: float) -> float:
        for (b0, v0), (b1, v1) in zip(INTENSITY, INTENSITY[1:]):
            if b0 <= bar < b1:
                return v0 + (v1 - v0) * (bar - b0) / (b1 - b0)
        return INTENSITY[-1][1]

    # -- cue times ----------------------------------------------------------------------------------------
    @staticmethod
    def word_onsets(timeline: Timeline) -> list[float]:
        """Heard onsets of the four toolkit words in the toolkit's second sentence: each word's character offset as a
        fraction of the sentence, mapped onto the spoken interval [start, end − trailing silence]. The same rule
        places the words on screen (toolkit-words.ts, which leads it by a fixed visual offset)."""
        chapter = next((c for c in timeline.chapters if c.music == "trailer-toolkit"), None)
        if chapter is None or len(chapter.sentence_starts) < 2:
            return []
        start = chapter.start + chapter.sentence_starts[1]          # sentence times are chapter-relative
        end = chapter.start + chapter.sentence_ends[1]
        text = next(c.text for c in timeline.captions if abs(c.start - start) < 1e-6)
        spoken = end - TOOLKIT_TRAILING_SILENCE - start
        onsets: list[float] = []
        for word in TOOLKIT_WORDS:
            offset = text.find(word)
            if offset < 0:
                raise ValueError(f"toolkit word {word!r} not in {text!r}")
            onsets.append(start + spoken * offset / len(text))
        return onsets

    # -- composition --------------------------------------------------------------------------------------
    def compose(self, timeline: Timeline) -> np.ndarray:
        bar = float(timeline.bar_seconds or 2.0)
        beat = bar / 4
        n = int(np.ceil(timeline.duration * SR))
        dry = np.zeros((n, 2))          # bass, drums, timpani, hits
        wet = np.zeros((n, 2))          # pad, strings, piano, harp, bells, horn: through the reverb
        chords = self.harmony.plan(timeline)
        melody_note = 76

        for c in chords:
            level = self.intensity(c.bar)
            if c.chord_start:
                self._chord(c, level, bar, wet, dry)
                if c.music in MELODY_SECTIONS and self._melody_allowed(c):
                    melody_note = self._phrase(c, level, beat, wet, melody_note)
            self._bar_texture(c, level, beat, wet, dry)

        self._section_events(chords, timeline, bar, beat, wet, dry)

        verb = Reverb().apply(wet, wet=0.34)[:n]
        mix = dry + verb
        fade = int(3.0 * SR)
        mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
        peak = float(np.abs(mix).max())
        return (mix / peak * 0.5).astype(np.float32) if peak > 0 else mix.astype(np.float32)

    # -- per chord ----------------------------------------------------------------------------------------
    def _chord(self, c: BarChord, level: float, bar: float, wet: np.ndarray, dry: np.ndarray) -> None:
        length = c.chord_bars * bar
        landing = c.music == "trailer-title" and c.section_bar == 0
        # episode pad and bass (music_composer._pad_chord), a little brighter as the intensity rises
        n = int((length + 1.5) * SR)
        tt = np.arange(n) / SR
        attack = 0.12 if landing else 1.2
        env = np.minimum(1.0, tt / attack) * np.clip((length + 1.5 - tt) / 1.5, 0.0, 1.0)
        pole = 0.94 - 0.05 * level
        for j, iv in enumerate(c.shape):
            tone = Voices.pad_tone(hz(c.root + 12 + iv), n, detune_cents=6.0 + 2.0 * j)
            tone = lfilter([1 - pole], [1.0, -pole], tone)
            self._add(wet, tone * env, c.start, 0.05, (-0.35, 0.35, -0.15, 0.15)[j % 4])
        self._add(dry, Voices.bass(hz(_low(c.root)), int(length * SR)), c.start, 0.10 + 0.04 * level)

        # strings: chord, cello root, high octave; horns on top of the build
        s_attack = 0.15 if landing else 0.9
        g = _ramp(level, 0.25)
        if g > 0:
            for j, iv in enumerate(c.shape):
                self._add(wet, Orchestra.strings(c.root + 12 + iv, length, s_attack, 1800 + 1600 * level, seed=c.bar * 7 + j),
                          c.start, 0.020 * g, (-0.5, 0.5, -0.2, 0.2)[j % 4])
        g = _ramp(level, 0.45)
        if g > 0:
            self._add(wet, Orchestra.strings(_low(c.root) + 12, length, s_attack, 1200, seed=c.bar * 7 + 5), c.start, 0.030 * g, -0.1)
        g = _ramp(level, 0.75)
        if g > 0:
            top = c.root + 24 + c.shape[-1]
            self._add(wet, Orchestra.strings(top, length, s_attack, 4000, seed=c.bar * 7 + 6), c.start, 0.016 * g, 0.3)
        g = _ramp(level, 0.80)
        if g > 0:
            for j, iv in enumerate((0, 7)):
                self._add(wet, Orchestra.horn(c.root + 12 + iv, length, 0.25 if landing else 0.45), c.start, 0.022 * g,
                          -0.25 + 0.5 * j)

    @staticmethod
    def _melody_allowed(c: BarChord) -> bool:
        # the toolkit leaves its first bar and the word line (bars 7–8) to the voice and the bell accents
        return not (c.music == "trailer-toolkit" and c.section_bar in (0, 7, 8))

    def _phrase(self, c: BarChord, level: float, beat: float, wet: np.ndarray, previous: int) -> int:
        """A piano phrase on the chord's tones, starting next to the previous phrase's last note (voice leading)."""
        g = _ramp(level, 0.35)
        pitch_classes = sorted({(c.root + iv) % 12 for iv in c.shape})
        candidates = [m for m in range(67, 89) if m % 12 in pitch_classes]
        idx = min(range(len(candidates)), key=lambda i: abs(candidates[i] - previous))
        note = candidates[idx]
        for k, (at, dur) in enumerate(PHRASES[min(4, c.chord_bars)]):
            idx = max(0, min(len(candidates) - 1, idx + CONTOUR[k]))
            note = candidates[idx]
            if g > 0:
                vel = 0.85 if k == 0 else 0.7
                self._add(wet, Orchestra.piano(note, dur * beat * 0.95, vel), c.start + at * beat, 0.07 * g,
                          0.15 * np.sin(k + c.bar))
        return note

    # -- per bar ------------------------------------------------------------------------------------------
    def _bar_texture(self, c: BarChord, level: float, beat: float, wet: np.ndarray, dry: np.ndarray) -> None:
        t0 = c.start
        tones = [c.root + 24 + iv for iv in c.shape]
        quiet = c.music in ("trailer-title", "trailer-credits") and c.section_bar > 0
        # harp (the episode pluck): quarter notes, then the episode proof arpeggio in eighths
        g = _ramp(level, 0.20)
        if g > 0 and not quiet:
            if level < 0.5:
                for k in range(4):
                    self._add(wet, Voices.pluck(hz(tones[(k * 2) % len(tones)]), int(1.6 * SR)), t0 + k * beat,
                              0.04 * g, -0.2 + 0.13 * k)
            else:
                pattern = (0, 1, 2, 1, 3, 1, 2, 1)
                for k in range(8):
                    note = tones[pattern[k] % len(tones)]
                    vel = 0.045 * (1.0 if k % 2 == 0 else 0.7)
                    self._add(wet, Voices.pluck(hz(note), int(1.6 * SR)), t0 + k * beat / 2, vel, 0.25 * np.sin(k))
                    if level > 0.8 and k % 2 == 1:
                        self._add(wet, Voices.pluck(hz(note + 12), int(1.2 * SR)), t0 + k * beat / 2, 0.022, -0.3)
        # celesta counter-figure (the episode bell, high)
        g = _ramp(level, 0.68)
        if g > 0 and not quiet:
            for k, at in enumerate((1.5, 3.5)):
                self._add(wet, Voices.bell(hz(tones[(c.bar + k) % len(tones)] + 12), int(2.5 * SR)), t0 + at * beat,
                          0.022 * g, 0.4 - 0.8 * k)
        # soft percussion
        if c.music in ("trailer-title", "trailer-credits"):
            return
        g = _ramp(level, 0.55)
        if g > 0:
            for q in (0, 2):
                self._add(dry, Orchestra.soft_kick(), t0 + q * beat, 0.42 * g)
            if level > 0.85:
                self._add(dry, Orchestra.soft_kick(0.7), t0 + 3.5 * beat, 0.30 * g)
        g = _ramp(level, 0.62)
        if g > 0:
            for e in range(8):
                self._add(dry, Orchestra.shaker(81 + e), t0 + e * beat / 2, (0.025 if e % 2 else 0.012) * g, 0.4)

    # -- events -------------------------------------------------------------------------------------------
    def _section_events(self, chords: list[BarChord], timeline: Timeline, bar: float, beat: float,
                        wet: np.ndarray, dry: np.ndarray) -> None:
        starts = {ch.music: ch.start for ch in timeline.chapters}
        first = {c.music: c for c in chords if c.section_bar == 0}

        # the series signature, as in the episodes: twice in the opening, once at the title
        for at in (starts["trailer-open"] + bar, starts["trailer-open"] + 5 * bar):
            self._signature(wet, first["trailer-open"].root, at, 0.09)
        # episode-style chimes at section starts, on the section's key
        for m in ("trailer-fold", "trailer-gallery", "trailer-toolkit", "trailer-montage"):
            key_root = 48 + first[m].key
            self._add(wet, Voices.bell(hz(key_root + 36), int(4 * SR)), starts[m] + 0.2, 0.10, 0.15)
            self._add(wet, Voices.bell(hz(key_root + 43), int(4 * SR)), starts[m] + 0.5, 0.06, -0.15)

        # gallery cuts: a high chime on the new chord, with the visual cut
        for c in chords:
            if c.music == "trailer-gallery" and c.section_bar in (6, 11, 15, 18, 21):
                self._add(wet, Voices.bell(hz(c.root + 36 + c.shape[2]), int(3 * SR)), c.start - CUT_LEAD, 0.05, 0.25)

        # into the toolkit: the gallery's last bar thins out (INTENSITY), a cymbal swell leads to a soft low hit
        tk = starts["trailer-toolkit"]
        self._add(dry, Orchestra.cymbal_swell(bar), tk - bar, 0.10, -0.2)
        self._add(dry, Orchestra.low_hit(), tk, 0.30)
        # the four toolkit words: rising bell accents on the chord of the moment, with a light timpani stroke
        for k, at in enumerate(self.word_onsets(timeline)):
            c = max((x for x in chords if x.start <= at), key=lambda x: x.start)
            tones = sorted(c.root + 24 + iv for iv in c.shape)
            self._add(wet, Voices.bell(hz(tones[k % len(tones)] + 12), int(3 * SR)), at, 0.08, -0.3 + 0.2 * k)
            self._add(dry, Orchestra.timpani(_low(c.root), 0.5), at, 0.18)

        # into the montage and into the title: timpani roll and cymbal swell over the last bar, cymbal on the landing
        for m, gain in (("trailer-montage", 0.10), ("trailer-title", 0.16)):
            at = starts[m]
            prev = max((x for x in chords if x.start < at), key=lambda x: x.start)
            self._add(dry, Orchestra.timpani_roll(_low(prev.root), bar * 0.95, 0.1, 1.0), at - bar, gain)
            self._add(dry, Orchestra.cymbal_swell(bar), at - bar, 0.09, 0.2)
            self._add(dry, Orchestra.cymbal(), at, 0.07 if m == "trailer-montage" else 0.11, -0.2)
            self._add(dry, Orchestra.timpani(_low(first[m].root), 1.0), at, 0.30)
        # montage: a timpani stroke on each chord change
        for c in chords:
            if c.music == "trailer-montage" and c.chord_start and c.section_bar > 0:
                self._add(dry, Orchestra.timpani(_low(c.root), 0.8), c.start, 0.22)
        # the title: soft low hit and the signature over the held chord
        title = starts["trailer-title"]
        self._add(dry, Orchestra.low_hit(), title, 0.45)
        self._signature(wet, first["trailer-title"].root, title + 1.5 * beat, 0.12)

    def _signature(self, bus: np.ndarray, root: int, at: float, gain: float) -> None:
        """The episode signature motif (music_composer._signature): root, fifth, ninth, sixth on bells."""
        for k, iv in enumerate(SIGNATURE):
            self._add(bus, Voices.bell(hz(root + 24 + iv), int(5 * SR)), at + k * 0.625, gain, -0.3 + 0.2 * k)

    # -- mixing -------------------------------------------------------------------------------------------
    @staticmethod
    def _add(bus: np.ndarray, mono: np.ndarray, at: float, gain: float, pan: float = 0.0) -> None:
        i0 = int(round(at * SR))
        if i0 >= bus.shape[0] or i0 < 0:
            return
        i1 = min(bus.shape[0], i0 + mono.shape[0])
        angle = (pan + 1) * np.pi / 4
        bus[i0:i1, 0] += mono[: i1 - i0] * gain * np.cos(angle)
        bus[i0:i1, 1] += mono[: i1 - i0] * gain * np.sin(angle)
