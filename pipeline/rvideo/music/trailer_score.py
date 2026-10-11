"""Original trailer score, arranged on the timeline's bar grid.

The key walks the circle of fifths: each "key slot" (a whole opening section, each 4-bar gallery vignette, each
8-bar toolkit half, each 4-bar montage half) takes the next key, and the title returns to C, closing the circle.
Sections (by music category) choose the arrangement: heartbeat and bells for the opening, a riser into the
gallery groove, a half-time lead over the toolkit, the densest texture in the montage, an impact and a sustained
chord for the title.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from rvideo.music.trailer_instruments import SR, Drums, Fx, Synths
from rvideo.music.trailer_reverb import Reverb
from rvideo.schema.timeline import Timeline

CIRCLE = (0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5)
KEY_NAMES = ("C", "G", "D", "A", "E", "B", "F#", "C#", "Ab", "Eb", "Bb", "F")
# Bars (relative to the section start) where a new key begins. Gallery: one key per vignette; toolkit: the second
# key arrives with the second narration line (bar 7), when the word row appears; montage: halfway.
KEY_SPLITS = {"trailer-gallery": (0, 4, 8, 12, 16, 20), "trailer-toolkit": (0, 7), "trailer-montage": (0, 4)}
# chords as semitones above the key root (degree root + voicing)
I_ADD9 = (0, 4, 7, 14)
V = (7, 11, 14, 19)
VI = (9, 12, 16, 21)
IV = (5, 9, 12, 16)
VSUS = (7, 12, 14, 19)
PROGRESSIONS = {
    "trailer-open": (I_ADD9,),
    "trailer-fold": (IV, IV, VSUS, V),
    "trailer-gallery": (I_ADD9, VI, IV, V),
    "trailer-toolkit": (VI, IV, I_ADD9, V),
    "trailer-montage": (I_ADD9, V, VI, IV),
    "trailer-title": (I_ADD9,),
    "trailer-credits": (I_ADD9,),
}
SIGNATURE = (0, 7, 14, 9)
LEAD_PHRASE = ((0, 1, 0), (1, 1, 7), (2, 1.5, 14), (3.5, 0.5, 12), (4, 2, 9), (6, 2, 7),
               (8, 1, 4), (9, 1, 7), (10, 2, 11), (12, 3, 9), (15, 1, 7),
               (16, 1, 0), (17, 1, 7), (18, 1.5, 14), (19.5, 0.5, 16), (20, 2, 14), (22, 2, 12),
               (24, 1, 11), (25, 1, 9), (26, 2, 7), (28, 4, 4))


@dataclass(frozen=True)
class KeySegment:
    section: str
    music: str
    start: float          # seconds
    bars: int
    key_index: int        # index into CIRCLE


def _wrap(midi: int, lo: int, hi: int) -> int:
    while midi > hi:
        midi -= 12
    while midi < lo:
        midi += 12
    return midi


class TrailerScore:
    def __init__(self) -> None:
        self._pluck_cache: dict[tuple[int, int], np.ndarray] = {}
        self._bass_cache: dict[tuple[int, int], np.ndarray] = {}

    # -- key plan -----------------------------------------------------------------------------------------
    def key_plan(self, timeline: Timeline) -> list[KeySegment]:
        if timeline.bar_seconds is None:
            raise ValueError("trailer score needs a bar-grid timeline")
        bar = timeline.bar_seconds
        segments: list[KeySegment] = []
        k = 0
        for ch in timeline.chapters:
            bars = round((ch.end - ch.start) / bar)
            if ch.music in ("trailer-title", "trailer-credits"):
                segments.append(KeySegment(ch.id, ch.music, ch.start, bars, 0))
                continue
            splits = [b for b in KEY_SPLITS.get(ch.music, (0,)) if b < bars]
            for n, b0 in enumerate(splits):
                b1 = splits[n + 1] if n + 1 < len(splits) else bars
                segments.append(KeySegment(ch.id, ch.music, ch.start + b0 * bar, b1 - b0, k % 12))
                k += 1
        return segments

    def key_log(self, timeline: Timeline) -> list[str]:
        """One key name per bar, for observation."""
        out: list[str] = []
        for seg in self.key_plan(timeline):
            out += [KEY_NAMES[seg.key_index]] * seg.bars
        return out

    # -- rendering helpers --------------------------------------------------------------------------------
    @staticmethod
    def _add(bus: np.ndarray, mono: np.ndarray, at: float, gain: float, pan: float = 0.0) -> None:
        i0 = int(round(at * SR))
        if i0 >= bus.shape[0] or i0 < 0:
            return
        i1 = min(bus.shape[0], i0 + mono.shape[0])
        angle = (pan + 1) * np.pi / 4
        bus[i0:i1, 0] += mono[: i1 - i0] * gain * np.cos(angle)
        bus[i0:i1, 1] += mono[: i1 - i0] * gain * np.sin(angle)

    def _pluck(self, midi: int, bright: int) -> np.ndarray:
        key = (midi, bright)
        if key not in self._pluck_cache:
            self._pluck_cache[key] = Synths.pluck(midi, bright=float(bright))
        return self._pluck_cache[key]

    def _bass(self, midi: int, n: int) -> np.ndarray:
        key = (midi, n)
        if key not in self._bass_cache:
            self._bass_cache[key] = Synths.bass(midi, n)
        return self._bass_cache[key]

    # -- composition --------------------------------------------------------------------------------------
    def compose(self, timeline: Timeline) -> np.ndarray:
        bar = float(timeline.bar_seconds or 2.0)
        beat = bar / 4
        n = int(np.ceil(timeline.duration * SR))
        dry = np.zeros((n, 2))          # drums, bass, impacts
        wet = np.zeros((n, 2))          # pad, arp, lead, bells: sent to reverb
        pads = np.zeros((n, 2))         # sidechained by the kick
        kicks: list[float] = []

        segments = self.key_plan(timeline)
        for si, seg in enumerate(segments):
            root = _wrap(36 + CIRCLE[seg.key_index], 34, 45)      # bass register
            prog = PROGRESSIONS[seg.music]
            for b in range(seg.bars):
                t0 = seg.start + b * bar
                chord = prog[b % len(prog)] if len(prog) > 1 else prog[0]
                self._bar(seg, b, t0, bar, beat, root, chord, dry, wet, pads, kicks)
            # transitions: impact at the start of the gallery, of each vignette and of the title
            if seg.music in ("trailer-gallery", "trailer-montage") and (si == 0 or segments[si - 1].music != seg.music):
                self._add(dry, Fx.impact(), seg.start, 0.55)
            elif seg.music == "trailer-gallery":
                self._add(dry, Fx.impact(int(1.5 * SR)), seg.start, 0.22)
            if seg.music == "trailer-title":
                self._add(dry, Fx.impact(int(5.0 * SR)), seg.start, 0.85)
                for k, iv in enumerate(SIGNATURE):
                    self._add(wet, Synths.bell(_wrap(72 + iv, 72, 90), int(6 * SR)), seg.start + 1.5 * beat + k * beat * 1.5,
                              0.16, -0.3 + 0.2 * k)
            # risers into the gallery and the title
            nxt = segments[si + 1] if si + 1 < len(segments) else None
            if nxt is not None and nxt.music != seg.music and nxt.music in ("trailer-gallery", "trailer-title"):
                rlen = 2 * bar
                self._add(dry, Fx.riser(int(rlen * SR)), nxt.start - rlen, 0.32)

        # sidechain: pads dip after each kick
        tt = np.arange(n) / SR
        gain = np.ones(n)
        for k in kicks:
            i0 = int(k * SR)
            seg_len = min(n - i0, int(0.45 * SR))
            if seg_len > 0:
                gain[i0:i0 + seg_len] = np.minimum(gain[i0:i0 + seg_len], 1 - 0.55 * np.exp(-tt[:seg_len] / 0.14))
        pads *= gain[:, None]

        verb = Reverb().apply(wet + pads * 0.6, wet=0.32)[:n]
        mix = dry + verb + pads * 0.4
        fade = int(3.0 * SR)
        mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
        peak = float(np.abs(mix).max())
        return (mix / peak * 0.5).astype(np.float32) if peak > 0 else mix.astype(np.float32)

    def _bar(self, seg: KeySegment, b: int, t0: float, bar: float, beat: float, root: int, chord: tuple[int, ...],
             dry: np.ndarray, wet: np.ndarray, pads: np.ndarray, kicks: list[float]) -> None:
        m = seg.music
        pad_root = _wrap(root + 24, 55, 66)
        pad_notes = [float(pad_root + iv) for iv in chord]
        brightness = {"trailer-open": 700.0, "trailer-fold": 1300.0, "trailer-gallery": 1800.0,
                      "trailer-toolkit": 1600.0, "trailer-montage": 2400.0, "trailer-title": 2000.0,
                      "trailer-credits": 600.0}[m]
        long_chord = m in ("trailer-open", "trailer-title", "trailer-credits")
        hold = bar * (4 if long_chord and b % 4 == 0 else 1)
        if long_chord and b % 4 != 0:
            pass                                          # long chords re-trigger every 4 bars only
        else:
            pad = Synths.pad(pad_notes, int((hold + 1.0) * SR), brightness, seed=b)
            self._add(pads, pad, t0, {"trailer-open": 0.24, "trailer-credits": 0.12}.get(m, 0.30), 0.0)

        def kick(at: float, punch: float = 1.0) -> None:
            self._add(dry, Drums.kick(punch=punch), at, 0.85)
            kicks.append(at)

        if m == "trailer-open":
            self._add(dry, Drums.heartbeat(), t0, 0.55)
            self._add(dry, Drums.heartbeat(), t0 + 0.32 * beat * 4 / 4 + 0.25, 0.38)
            if b in (1, 5):
                for k, iv in enumerate(SIGNATURE):
                    self._add(wet, Synths.bell(_wrap(72 + root % 12 + iv, 72, 90)), t0 + k * beat * 0.75, 0.13, -0.3 + 0.2 * k)
        elif m == "trailer-fold":
            if b < 4:
                self._add(dry, Drums.heartbeat(), t0, 0.45)
            for k in range(8):
                note = pad_root + 12 + chord[(k * 2) % len(chord)]
                self._add(wet, self._pluck(note, 3000), t0 + k * beat / 2, 0.08 + 0.01 * b, 0.25 * np.sin(k))
        elif m == "trailer-gallery":
            for q in range(4):
                if q in (0, 2):
                    kick(t0 + q * beat)
                if q in (1, 3):
                    self._add(dry, Drums.snare(), t0 + q * beat, 0.42, 0.05)
            if b % 2 == 1:
                kick(t0 + 2.5 * beat, 0.7)
            for e in range(8):
                self._add(dry, Drums.hat(seed=31 + e), t0 + e * beat / 2, 0.16 if e % 2 else 0.1, 0.35)
                note = root + (12 if e % 2 else 0) + chord[0]
                self._add(dry, self._bass(note, int(beat / 2 * SR)), t0 + e * beat / 2, 0.30)
            for s16 in range(16):
                note = pad_root + 12 + chord[(s16 * 3) % len(chord)]
                self._add(wet, self._pluck(note, 4000), t0 + s16 * beat / 4, 0.055, 0.4 * np.sin(1.3 * s16))
        elif m == "trailer-toolkit":
            kick(t0)
            self._add(dry, Drums.snare(), t0 + 2 * beat, 0.4)
            for e in range(8):
                self._add(dry, Drums.hat(seed=61 + e), t0 + e * beat / 2, 0.09, 0.35)
            self._add(dry, self._bass(root + chord[0], int(bar * SR)), t0, 0.32)
            for s16 in range(0, 16, 2):
                note = pad_root + 12 + chord[(s16 // 2) % len(chord)]
                self._add(wet, self._pluck(note, 3500), t0 + s16 * beat / 4, 0.045, 0.3 * np.cos(s16))
            if b == 0:                                      # one lead phrase per toolkit key, cut to the segment
                lead_base = _wrap(60 + root % 12, 57, 68)
                span = seg.bars * 4                         # beats available in this key
                notes = [(st * beat, min(du, span - st) * beat * 0.95, float(lead_base + iv))
                         for st, du, iv in LEAD_PHRASE if st < span]
                self._add(wet, Synths.lead(notes, int(seg.bars * bar * SR + SR)), seg.start, 0.17, -0.1)
        elif m == "trailer-montage":
            for q in range(4):
                kick(t0 + q * beat)
                if q in (1, 3):
                    self._add(dry, Drums.snare(), t0 + q * beat, 0.46)
            for s16 in range(16):
                self._add(dry, Drums.hat(seed=91 + s16), t0 + s16 * beat / 4, 0.12 if s16 % 2 else 0.07, 0.4)
                note = pad_root + 12 + chord[(s16 * 3) % len(chord)]
                self._add(wet, self._pluck(note, 5000), t0 + s16 * beat / 4, 0.06, 0.4 * np.sin(1.7 * s16))
            for e in range(8):
                self._add(dry, self._bass(root + (12 if e % 2 else 0) + chord[0], int(beat / 2 * SR)), t0 + e * beat / 2, 0.32)
            if b % 4 == 0:
                lead_base = _wrap(67 + root % 12, 64, 76)
                notes = [(st * beat, du * beat * 0.95, float(lead_base + iv)) for st, du, iv in LEAD_PHRASE if st < 16]
                self._add(wet, Synths.lead(notes, int(4 * bar * SR + SR)), t0, 0.15, 0.1)
        elif m == "trailer-title":
            if b == 0:
                self._add(dry, self._bass(root, int(4 * bar * SR)), t0, 0.35)
