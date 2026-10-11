"""Original score for the e00 film, built on the episode palette with drums and a tempo map.

Design (the approved demo, laid on the timeline's beat times):
- Sound: the episode voices (music_composer.Voices: additive pad, soft pluck, FM bell, sine bass) and harmony are the
  base; trailer_orchestra adds strings, piano, horn, timpani; film_drums adds kit, toms, clap, cowbell and 808.
- film-flat: sparse ticks and the signature motif on piano. film-fold: accelerando with a harp arpeggio that speeds
  up with the beat, rising strings, toms and a timpani roll. film-worlds: a driving kit, string ostinato, the motif on
  horns, crash and tom fill at every shot. film-rebuild: half-time (kick on 1, snare on 3), sub, slow strings, bell
  accents on the four toolkit words. film-build: an accelerating snare roll and one empty beat. film-drop: a phonk
  groove (808, clap on 3, hat rolls, cowbell on the motif, pads pumping against the kick); its last bar is a tape
  stop and silence. film-title: the final hit, a ringing C chord and the bell signature. film-credits: a soft pad.
Everything is deterministic for a given timeline.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.signal import lfilter

from rvideo.music.film_drums import Drums
from rvideo.music.film_harmony import BarChord, FilmHarmony
from rvideo.music.music_composer import SIGNATURE, Voices
from rvideo.music.tape_stop import TapeStop
from rvideo.music.trailer_dsp import SR, hz
from rvideo.music.trailer_orchestra import Orchestra
from rvideo.music.trailer_reverb import Reverb
from rvideo.schema.timeline import Timeline

# The four toolkit words; their onsets follow player/src/episodes/e00-trailer/lib/toolkit-words.ts (wordOnsets).
TOOLKIT_WORDS = ("direction", "distance", "gradient", "step")
TOOLKIT_TRAILING_SILENCE = 0.45
# First bars of the worlds' shots (player/src/episodes/e00-trailer/lib/gallery-shots.ts).
WORLD_SHOT_BARS = (0, 4, 7, 10, 12, 14)
# The drop's cowbell riff on the signature tones: (16th position within two bars, semitones above C5).
RIFF = ((0, 0), (3, 0), (6, 7), (8, 14), (10, 9), (14, 7), (16, 9), (19, 9), (22, 7), (24, 4), (26, 2), (28, 0))
TAPE_STOP_SECONDS = 1.4
PANS = (-0.35, 0.35, -0.15, 0.15)
# the drop's 808 glides into the next bar's root on odd bars (vi–IV–I–V, twice, then the stop bar)
DROP_NEXT_ROOT = {1: 48, 3: 45, 5: 48, 7: 43}


@dataclass
class Buses:
    """Stereo buses of one part of the score; `pump` is sidechained by `kicks`, wet and pump go to the reverb."""
    dry: np.ndarray
    wet: np.ndarray
    pump: np.ndarray
    kicks: list[float] = field(default_factory=list)

    @staticmethod
    def empty(n: int) -> Buses:
        return Buses(np.zeros((n, 2)), np.zeros((n, 2)), np.zeros((n, 2)))


class FilmScore:
    def __init__(self) -> None:
        self.harmony = FilmHarmony()

    def key_log(self, timeline: Timeline) -> list[str]:
        return self.harmony.log(timeline)

    # -- cue times ----------------------------------------------------------------------------------------
    @staticmethod
    def word_onsets(timeline: Timeline) -> list[float]:
        """Heard onsets of the four toolkit words in the rebuild's second sentence: each word's character offset as a
        fraction of the sentence, mapped onto the spoken interval [start, end − trailing silence]. The same rule
        places the words on screen (toolkit-words.ts, which leads it by a fixed visual offset)."""
        chapter = next((c for c in timeline.chapters if c.music == "film-rebuild"), None)
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
        n = int(np.ceil(timeline.duration * SR))
        self._n = n                                      # samples of the score, for the mixdown
        chords = self.harmony.plan(timeline)
        # everything up to the tape stop is mixed first (the stop slows the finished mix); the title and credits after
        pre = Buses.empty(n)
        post = Buses.empty(n)
        for c in chords:
            buses = post if c.music in ("film-title", "film-credits") else pre
            self._bar(c, buses)
        self._words(timeline, chords, pre)

        mix = self._mixdown(pre)
        stop_bar = next(c for c in chords if c.music == "film-drop" and c.section_bar == 8)
        TapeStop(TAPE_STOP_SECONDS).apply(mix, stop_bar.start)
        mix += self._mixdown(post)
        fade = int(2.5 * SR)
        mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
        peak = float(np.abs(mix).max())
        return (mix / peak * 0.5).astype(np.float32) if peak > 0 else mix.astype(np.float32)

    def _mixdown(self, b: Buses) -> np.ndarray:
        gain = np.ones(self._n)
        tt = np.arange(int(0.4 * SR)) / SR
        for k in b.kicks:
            i0 = int(k * SR)
            seg = min(self._n - i0, len(tt))
            if seg > 0:
                gain[i0:i0 + seg] = np.minimum(gain[i0:i0 + seg], 1 - 0.75 * np.exp(-tt[:seg] / 0.13))
        pumped = b.pump * gain[:, None]
        return b.dry + pumped + Reverb().apply(b.wet + pumped * 0.5, 0.32)[: self._n]

    # -- per bar ------------------------------------------------------------------------------------------
    def _bar(self, c: BarChord, b: Buses) -> None:
        dry, wet, pump, kicks = b.dry, b.wet, b.pump, b.kicks
        m, bar, root, shape = c.music, c.section_bar, c.root, c.shape
        t0, length = c.start, c.length
        tones = [root + 24 + iv for iv in shape]
        add = self._add

        if m not in ("film-drop", "film-title", "film-credits"):
            pad_len = length
            if m == "film-build" and bar == 1:
                pad_len = c.beat(3) - t0                 # the last beat before the drop is left empty
            self._pad(wet, root, shape, t0, pad_len, 0.05)
            add(dry, Voices.bass(hz(root), int(pad_len * SR)), t0, 0.11)

        if m == "film-flat":
            for e in range(8):
                add(dry, Drums.tick(3 + e), c.beat(e / 2), 0.05 if e % 2 else 0.08, 0.3)
            if bar in (0, 2):
                beat_len = c.beat(1) - c.beat(0)
                for k, iv in enumerate(SIGNATURE):
                    add(wet, Orchestra.piano(root + 24 + iv, 0.9 * beat_len * (2 if k == 3 else 1), 0.8),
                        c.beat(k * 0.75), 0.08, -0.2 + 0.15 * k)

        elif m == "film-fold":
            for e in range(8):
                add(wet, Voices.pluck(hz(tones[(0, 1, 2, 1, 3, 1, 2, 1)[e] % len(tones)]), int(1.4 * SR)),
                    c.beat(e / 2), 0.045, 0.25 * np.sin(e))
            for j, iv in enumerate(shape):
                add(wet, Orchestra.strings(root + 12 + iv, length, 0.6, 2200 + 500 * bar, seed=bar * 5 + j), t0,
                    0.018 + 0.006 * bar, (-0.5, 0.5, -0.2, 0.2)[j % 4])
            if bar >= 2:
                for q in range(4):
                    add(dry, Drums.tom(40 if q % 2 == 0 else 45, 13 + q), c.beat(q), 0.35 + 0.1 * (bar - 2))
            if bar == 3:
                add(dry, Orchestra.timpani_roll(root - 12, length * 0.9, 0.1, 1.0), t0, 0.16)
                add(dry, Orchestra.cymbal_swell(length * 0.9), t0, 0.12)

        elif m == "film-worlds":
            dense = bar >= 7                             # the second half drives harder
            for q in range(4):
                if q in (0, 2):
                    add(dry, Drums.kick(), c.beat(q), 0.7)
                if q in (1, 3):
                    add(dry, Drums.snare(9 + q), c.beat(q), 0.45, 0.05)
            add(dry, Drums.kick(0.7), c.beat(2.5), 0.5)
            steps = 16 if dense else 8
            for e in range(steps):
                accent = dense and e % 4 == 2
                add(dry, Drums.hat(30 + e, open_=accent and e % 8 == 6), c.beat(4 * e / steps),
                    0.10 if e % 2 else 0.06, 0.4)
            for e in range(8):
                add(wet, Voices.pluck(hz(tones[(0, 1, 2, 3, 2, 1)[e % 6] % len(tones)]), int(1.0 * SR)),
                    c.beat(e / 2), 0.04, 0.3 * np.sin(e))
            if c.chord_start:
                span = c.beat(4 * c.chord_bars) - t0
                for j, iv in enumerate(shape):
                    add(wet, Orchestra.strings(root + 12 + iv, span, 0.25, 3200, seed=bar * 9 + j), t0, 0.022,
                        (-0.5, 0.5, -0.2, 0.2)[j % 4])
            if bar in WORLD_SHOT_BARS:
                add(dry, Orchestra.cymbal(), t0, 0.09 if bar else 0.12, -0.2)
                add(dry, Drums.tom(38, 31 + bar), t0, 0.4)
                if bar in (0, 7):                        # the signature motif on horns
                    for k, iv in enumerate(SIGNATURE):
                        note = root + 24 + iv - (12 if root + 24 + iv > 74 else 0)
                        dur = (c.beat(k + 1) - c.beat(k)) * (3.6 if k == 3 else 0.95)
                        add(wet, Orchestra.horn(note, dur, 0.08), c.beat(k), 0.05, -0.1 + 0.07 * k)
            if bar + 1 in WORLD_SHOT_BARS:               # tom fill into the next shot
                for k in range(4):
                    add(dry, Drums.tom(43 - 2 * k, 20 + k), c.beat(3 + k / 4), 0.3)

        elif m == "film-rebuild":
            add(dry, Drums.kick(1.1), t0, 0.8)
            if bar in (0, 8):
                add(dry, Orchestra.low_hit(), t0, 0.28)
            add(dry, Drums.snare(11), c.beat(2), 0.55)
            hats = 8 if bar >= 14 else 4                 # the last two bars lean towards the build
            for e in range(hats):
                add(dry, Drums.hat(50 + e), c.beat(4 * e / hats), 0.06, 0.4)
            if c.chord_start:
                span = c.beat(4 * c.chord_bars) - t0
                for j, iv in enumerate(shape):
                    add(wet, Orchestra.strings(root + 12 + iv, span, 1.0, 1800, seed=bar * 11 + j), t0, 0.03,
                        (-0.5, 0.5, -0.2, 0.2)[j % 4])
            add(wet, Orchestra.piano(tones[bar % len(tones)] + 12, length * 0.9, 0.8), t0, 0.07)

        elif m == "film-build":
            hits, span = (16, 4) if bar == 0 else (18, 3)  # the second bar's roll stops after three beats
            for k in range(hits):
                add(dry, Drums.snare(60 + k), c.beat(span * k / hits), 0.12 + 0.25 * (bar * 16 + k) / 34, 0.05)
            add(dry, Drums.kick(), t0, 0.6)
            for j, iv in enumerate(shape):
                add(wet, Orchestra.strings(root + 12 + iv, c.beat(span) - t0, 0.3, 3500, seed=70 + j), t0, 0.025)
            if bar == 1:                                 # the empty beat: only a reversed cymbal into the drop
                add(dry, Orchestra.cymbal_swell(c.beat(4) - c.beat(3)), c.beat(3), 0.16)

        elif m == "film-drop":
            self._drop_bar(c, dry, pump, kicks)

        elif m == "film-title":
            if bar == 0:                                 # the final hit
                add(dry, Orchestra.low_hit(), t0, 0.5)
                add(dry, Orchestra.cymbal(), t0, 0.14)
                add(dry, Drums.kick(1.2), t0, 0.8)
                add(dry, Orchestra.timpani(36, 1.0), t0, 0.35)
                for k, iv in enumerate(SIGNATURE):
                    add(wet, Voices.bell(hz(root + 24 + iv), int(5 * SR)), t0 + 0.6 + 0.5 * k, 0.1, -0.3 + 0.2 * k)
            if c.chord_start:
                span = c.beat(4 * c.chord_bars) - t0
                self._pad(wet, root, shape, t0, span, 0.07 if bar == 0 else 0.05, attack=0.05 if bar == 0 else 1.0)
                add(dry, Voices.bass(hz(root), int(span * SR)), t0, 0.11)
                for j, iv in enumerate(shape):
                    add(wet, Orchestra.strings(root + 12 + iv, span, 0.08 if bar == 0 else 0.9, 3000, seed=90 + bar + j),
                        t0, 0.03 if bar == 0 else 0.02, (-0.5, 0.5, -0.2, 0.2)[j % 4])

        elif m == "film-credits" and c.chord_start:
            span = c.beat(4 * c.chord_bars) - t0
            self._pad(wet, root, shape, t0, span, 0.035)
            add(wet, Orchestra.piano(root + 24, span * 0.9, 0.6), t0, 0.05)

    def _drop_bar(self, c: BarChord, dry: np.ndarray, pump: np.ndarray, kicks: list[float]) -> None:
        """The phonk drop: half-time kit, 808, cowbell on the motif, pads pumping against the kick."""
        add = self._add
        bar, root, shape, t0, length = c.section_bar, c.root, c.shape, c.start, c.length
        n_pad = int((length + 1.2) * SR)
        tt = np.arange(n_pad) / SR
        env = np.minimum(1.0, tt / 0.05) * np.clip((length + 1.2 - tt) / 1.2, 0, 1)
        for j, iv in enumerate(shape):
            tone = lfilter([0.09], [1.0, -0.91], Voices.pad_tone(hz(root + 12 + iv), n_pad, 6.0 + 2 * j))
            add(pump, tone * env, t0, 0.06, PANS[j % 4])
            if bar >= 4:
                add(pump, Orchestra.strings(root + 12 + iv, length, 0.1, 3500, seed=80 + bar * 4 + j), t0, 0.03,
                    (-0.5, 0.5, -0.2, 0.2)[j % 4])
        beat_len = c.beat(1) - c.beat(0)
        for q in [0.0, 2.75] + ([3.5] if bar % 2 else []):
            add(dry, Drums.kick(1.1), c.beat(q), 0.75)
            kicks.append(c.beat(q))
        low = root - 12 if root > 40 else root
        nxt = DROP_NEXT_ROOT.get(bar, root)
        add(dry, Drums.bass808(low, 2.75 * beat_len), t0, 0.3)
        add(dry, Drums.bass808(low, 1.25 * beat_len, (nxt - 12 if nxt > 40 else nxt) if bar % 2 else None),
            c.beat(2.75), 0.27)
        add(dry, Drums.clap(17), c.beat(2), 0.55)
        add(dry, Drums.snare(19), c.beat(2), 0.3, 0.05)
        for e in range(8):
            add(dry, Drums.hat(70 + e), c.beat(e / 2), 0.09 if e % 2 else 0.06, 0.35)
        roll = 6 if bar % 2 else 4                       # hat roll on the last beat: triplet 16ths or 16ths
        for k in range(roll):
            add(dry, Drums.hat(80 + k), c.beat(3 + k / roll), 0.05 + 0.02 * k / roll, -0.3)
        if bar % 2 == 0 and bar < 8:
            for pos, iv in RIFF:
                add(dry, Drums.cowbell(72 + iv), c.beat(pos / 4), 0.16, 0.15)
                if bar >= 4:
                    add(dry, Drums.cowbell(84 + iv), c.beat(pos / 4), 0.07, -0.25)
        if bar in (0, 4):
            add(dry, Orchestra.cymbal(), t0, 0.12 if bar == 0 else 0.1)
            add(dry, Orchestra.low_hit(), t0, 0.3 if bar == 0 else 0.2)

    def _words(self, timeline: Timeline, chords: list[BarChord], b: Buses) -> None:
        """Rising bell accents on the four toolkit words, on the chord of the moment."""
        wet = b.wet
        for k, at in enumerate(self.word_onsets(timeline)):
            c = max((x for x in chords if x.start <= at), key=lambda x: x.start)
            tones = sorted(c.root + 24 + iv for iv in c.shape)
            self._add(wet, Voices.bell(hz(tones[k % len(tones)] + 12), int(3 * SR)), at, 0.08, -0.3 + 0.2 * k)

    # -- helpers ------------------------------------------------------------------------------------------
    def _pad(self, bus: np.ndarray, root: int, shape: tuple[int, ...], t: float, length: float, gain: float,
             attack: float = 1.0) -> None:
        """The episode pad chord (music_composer._pad_chord): additive tones through a one-pole low-pass."""
        n = int((length + 1.2) * SR)
        tt = np.arange(n) / SR
        env = np.minimum(1.0, tt / attack) * np.clip((length + 1.2 - tt) / 1.2, 0, 1)
        for j, iv in enumerate(shape):
            tone = lfilter([0.07], [1.0, -0.93], Voices.pad_tone(hz(root + 12 + iv), n, 6.0 + 2 * j))
            self._add(bus, tone * env, t, gain, PANS[j % 4])

    @staticmethod
    def _add(bus: np.ndarray, mono: np.ndarray, at: float, gain: float, pan: float = 0.0) -> None:
        i0 = int(round(at * SR))
        if i0 < 0 or i0 >= bus.shape[0]:
            return
        i1 = min(bus.shape[0], i0 + len(mono))
        a = (pan + 1) * np.pi / 4
        bus[i0:i1, 0] += mono[: i1 - i0] * gain * np.cos(a)
        bus[i0:i1, 1] += mono[: i1 - i0] * gain * np.sin(a)

