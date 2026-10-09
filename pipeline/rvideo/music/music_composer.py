"""Original procedural score.

Design:
- Episode key walks the circle of fifths (E01 C, E02 G, E03 D, ...): the series travels around S¹.
- Each chapter's music category selects a chord progression and a texture:
    motivation      warm pad + slow bell figures
    definition      pad + sparse quarter-note plucks
    proof           pad + steady eighth-note arpeggio ("one step follows from the last")
    counterexample  darker borrowed chords + an unresolved two-note question motif
    recap           pad + bells over a progression that resolves to I
- A bell chime marks every chapter start; a four-note signature motif opens and closes the episode.
Everything is deterministic for a given (timeline, episode order).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.signal import lfilter

from rvideo.schema.timeline import Timeline, TimelineChapter

SAMPLE_RATE = 48000
BPM = 72.0
BEAT = 60.0 / BPM
CHORD_BEATS = 8                     # two bars of 4/4 per chord

# Chords as semitone offsets from the key root (root position, close voicing).
MAJ7 = (0, 4, 7, 11)
MIN7 = (0, 3, 7, 10)
MAJ = (0, 4, 7)
MIN = (0, 3, 7)
SUS4 = (0, 5, 7)
ADD9 = (0, 4, 7, 14)

# (degree offset in semitones, chord shape)
PROGRESSIONS: dict[str, tuple[tuple[int, tuple[int, ...]], ...]] = {
    "motivation": ((0, MAJ7), (5, MAJ7), (9, MIN7), (7, SUS4)),
    "definition": ((0, ADD9), (4, MIN7), (5, MAJ7), (0, MAJ)),
    "proof": ((9, MIN7), (5, MAJ7), (0, ADD9), (7, MAJ)),
    "counterexample": ((9, MIN), (5, MIN), (8, MAJ), (7, SUS4)),
    "recap": ((5, MAJ7), (7, MAJ), (4, MIN7), (9, MIN7), (2, MIN7), (7, SUS4), (7, MAJ), (0, ADD9)),
}
SIGNATURE = (0, 7, 14, 9)           # root, fifth, ninth, sixth


def _midi_to_hz(m: float) -> float:
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


@dataclass(frozen=True)
class EpisodeKey:
    root_midi: int

    @staticmethod
    def for_order(order: int) -> EpisodeKey:
        offset = (7 * (order - 1)) % 12
        root = 48 + offset                     # C3 + offset
        if root > 54:
            root -= 12                         # keep the root between F#2 and F#3
        return EpisodeKey(root_midi=root)


class Voices:
    """Stateless instrument renderers returning mono float arrays."""

    @staticmethod
    def pad_tone(freq: float, n: int, detune_cents: float) -> np.ndarray:
        t = np.arange(n) / SAMPLE_RATE
        out = np.zeros(n)
        for sign in (-1.0, 1.0):
            f = freq * 2.0 ** (sign * detune_cents / 1200.0)
            for h in range(1, 7):
                out += np.sin(2 * np.pi * f * h * t + h * 0.7) / h ** 1.6
        return out

    @staticmethod
    def pluck(freq: float, n: int) -> np.ndarray:
        t = np.arange(n) / SAMPLE_RATE
        env = np.exp(-t / 0.45) * (1 - np.exp(-t / 0.004))
        return env * (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.1 * np.sin(6 * np.pi * freq * t))

    @staticmethod
    def bell(freq: float, n: int) -> np.ndarray:
        t = np.arange(n) / SAMPLE_RATE
        index = 2.2 * np.exp(-t / 0.9)
        env = np.exp(-t / 2.2) * (1 - np.exp(-t / 0.003))
        return env * np.sin(2 * np.pi * freq * t + index * np.sin(2 * np.pi * freq * 1.4 * t))

    @staticmethod
    def bass(freq: float, n: int) -> np.ndarray:
        t = np.arange(n) / SAMPLE_RATE
        env = np.exp(-t / 2.5) * (1 - np.exp(-t / 0.02))
        return env * (np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(4 * np.pi * freq * t))


class MusicComposer:
    """Owns build/<eid>/en/audio/music.wav."""

    def compose(self, timeline: Timeline, episode_order: int) -> np.ndarray:
        n_total = int(np.ceil(timeline.duration * SAMPLE_RATE)) + SAMPLE_RATE
        left = np.zeros(n_total)
        right = np.zeros(n_total)
        key = EpisodeKey.for_order(episode_order)
        rng = np.random.default_rng(1000 + episode_order)

        first_start = timeline.chapters[0].start if timeline.chapters else timeline.duration
        self._signature(left, right, key, 0.4, rng)
        self._category_bed(left, right, key, "motivation", 0.0, first_start + 1.0, rng)
        for chapter in timeline.chapters:
            self._chapter(left, right, key, chapter, rng)
        outro_start = timeline.chapters[-1].end if timeline.chapters else 0.0
        self._category_bed(left, right, key, "recap", outro_start - 1.0, timeline.duration + 0.5, rng)
        self._signature(left, right, key, outro_start + 0.3, rng)

        stereo = np.stack([left, right], axis=1)[: int(np.ceil(timeline.duration * SAMPLE_RATE))]
        stereo = self._fade(stereo, 2.0, 3.5)
        peak = np.abs(stereo).max()
        return (stereo / peak * 0.5).astype(np.float32) if peak > 0 else stereo.astype(np.float32)

    # -- structure -------------------------------------------------------------------------------
    def _chapter(self, left: np.ndarray, right: np.ndarray, key: EpisodeKey, chapter: TimelineChapter,
                 rng: np.random.Generator) -> None:
        self._category_bed(left, right, key, chapter.music, chapter.start - 1.0, chapter.end + 1.0, rng)
        chime_freq = _midi_to_hz(key.root_midi + 36)
        self._add(left, right, Voices.bell(chime_freq, int(4 * SAMPLE_RATE)) * 0.10, chapter.start + 0.2, pan=0.15)
        self._add(left, right, Voices.bell(chime_freq * 1.5, int(4 * SAMPLE_RATE)) * 0.06, chapter.start + 0.5, pan=-0.15)

    def _category_bed(self, left: np.ndarray, right: np.ndarray, key: EpisodeKey, category: str,
                      start: float, end: float, rng: np.random.Generator) -> None:
        start = max(0.0, start)
        if end <= start:
            return
        progression = PROGRESSIONS[category]
        chord_len = CHORD_BEATS * BEAT
        seg = np.zeros((int(np.ceil((end - start) * SAMPLE_RATE)), 2))
        t = 0.0
        ci = 0
        while t < end - start:
            degree, shape = progression[ci % len(progression)]
            root = key.root_midi + degree
            self._pad_chord(seg, root, shape, t, chord_len)
            self._texture(seg, category, root, shape, t, chord_len, rng)
            t += chord_len
            ci += 1
        seg = self._fade(seg, 1.0, 1.0)
        i0 = int(start * SAMPLE_RATE)
        i1 = min(i0 + seg.shape[0], left.shape[0])
        left[i0:i1] += seg[: i1 - i0, 0]
        right[i0:i1] += seg[: i1 - i0, 1]

    def _pad_chord(self, seg: np.ndarray, root: int, shape: tuple[int, ...], t: float, length: float) -> None:
        n = int((length + 1.5) * SAMPLE_RATE)               # overlap into the next chord for a legato crossfade
        tt = np.arange(n) / SAMPLE_RATE
        env = np.minimum(1.0, tt / 1.2) * np.clip((length + 1.5 - tt) / 1.5, 0.0, 1.0)
        for j, interval in enumerate(shape):
            tone = Voices.pad_tone(_midi_to_hz(root + 12 + interval), n, detune_cents=6.0 + 2.0 * j)
            tone = lfilter([0.06], [1.0, -0.94], tone)    # one-pole low-pass: soft, dark pad
            pan = (-0.35, 0.35, -0.15, 0.15)[j % 4]
            self._add_seg(seg, tone * env * 0.05, t, pan)
        bass_n = int(length * SAMPLE_RATE)
        self._add_seg(seg, Voices.bass(_midi_to_hz(root - 12 if root > 45 else root), bass_n) * 0.10, t, 0.0)

    def _texture(self, seg: np.ndarray, category: str, root: int, shape: tuple[int, ...], t: float,
                 length: float, rng: np.random.Generator) -> None:
        tones = [root + 24 + iv for iv in shape]
        pluck_n = int(1.6 * SAMPLE_RATE)
        bell_n = int(4.5 * SAMPLE_RATE)
        if category == "proof":
            pattern = [0, 1, 2, 1, 3 % len(tones), 1, 2, 1]
            for k in range(int(length / (BEAT / 2))):
                note = tones[pattern[k % 8] % len(tones)]
                vel = 0.045 * (1.0 if k % 2 == 0 else 0.7) * (0.9 + 0.2 * rng.random())
                self._add_seg(seg, Voices.pluck(_midi_to_hz(note), pluck_n) * vel, t + k * BEAT / 2, 0.25 * np.sin(k))
        elif category == "definition":
            for k in range(int(length / BEAT)):
                if k % 2 == 1 and rng.random() < 0.5:
                    continue
                note = tones[(k * 2) % len(tones)]
                self._add_seg(seg, Voices.pluck(_midi_to_hz(note), pluck_n) * 0.04, t + k * BEAT, -0.2 + 0.1 * k % 0.4)
        elif category == "counterexample":
            # A rising question that does not resolve: fifth -> raised fourth.
            self._add_seg(seg, Voices.pluck(_midi_to_hz(root + 31), pluck_n) * 0.05, t + 2 * BEAT, 0.3)
            self._add_seg(seg, Voices.pluck(_midi_to_hz(root + 30), pluck_n) * 0.05, t + 3 * BEAT, 0.3)
            self._add_seg(seg, Voices.bell(_midi_to_hz(root + 36), bell_n) * 0.025, t + 6 * BEAT, -0.3)
        elif category in ("motivation", "recap"):
            for k, iv in enumerate((0, 2) if category == "motivation" else (0, 1, 2)):
                note = tones[iv % len(tones)] + 12
                self._add_seg(seg, Voices.bell(_midi_to_hz(note), bell_n) * 0.03, t + (1 + 2 * k) * BEAT, 0.3 - 0.3 * k)

    def _signature(self, left: np.ndarray, right: np.ndarray, key: EpisodeKey, at: float,
                   rng: np.random.Generator) -> None:
        for k, iv in enumerate(SIGNATURE):
            f = _midi_to_hz(key.root_midi + 24 + iv)
            self._add(left, right, Voices.bell(f, int(5 * SAMPLE_RATE)) * 0.09, at + k * BEAT * 0.75, pan=-0.3 + 0.2 * k)

    # -- mixing helpers ---------------------------------------------------------------------------
    @staticmethod
    def _gains(pan: float) -> tuple[float, float]:
        angle = (pan + 1.0) * np.pi / 4.0
        return float(np.cos(angle)), float(np.sin(angle))

    def _add_seg(self, seg: np.ndarray, mono: np.ndarray, at: float, pan: float) -> None:
        i0 = int(at * SAMPLE_RATE)
        if i0 >= seg.shape[0]:
            return
        i1 = min(i0 + mono.shape[0], seg.shape[0])
        gl, gr = self._gains(pan)
        seg[i0:i1, 0] += mono[: i1 - i0] * gl
        seg[i0:i1, 1] += mono[: i1 - i0] * gr

    def _add(self, left: np.ndarray, right: np.ndarray, mono: np.ndarray, at: float, pan: float) -> None:
        i0 = int(max(0.0, at) * SAMPLE_RATE)
        if i0 >= left.shape[0]:
            return
        i1 = min(i0 + mono.shape[0], left.shape[0])
        gl, gr = self._gains(pan)
        left[i0:i1] += mono[: i1 - i0] * gl
        right[i0:i1] += mono[: i1 - i0] * gr

    @staticmethod
    def _fade(x: np.ndarray, fade_in: float, fade_out: float) -> np.ndarray:
        n = x.shape[0]
        env = np.ones(n)
        a = min(n, int(fade_in * SAMPLE_RATE))
        b = min(n, int(fade_out * SAMPLE_RATE))
        if a > 0:
            env[:a] = np.linspace(0.0, 1.0, a)
        if b > 0:
            env[n - b:] = np.minimum(env[n - b:], np.linspace(1.0, 0.0, b))
        return x * env[:, None]
