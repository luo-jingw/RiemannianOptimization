"""Bar-by-bar chord plan of the e00 film, in the episode score's harmonic language (music_composer.py).

Keys: C (flat), the fold turns to G through D (V of G), the worlds and the rebuild stay in G, the build's IV–V leads
back to C for the drop (vi–IV–I–V) and the title. The worlds' chords follow the shots of 4, 3, 3, 2, 2, 2 bars
(player/src/episodes/e00-trailer/lib/gallery-shots.ts).
"""
from __future__ import annotations

from dataclasses import dataclass

from rvideo.music.music_composer import ADD9, MAJ, MAJ7, MIN7, SUS4
from rvideo.schema.timeline import Timeline, TimelineChapter

BEATS_PER_BAR = 4
# chord roots in the episode bass register (MIDI)
C, D, E, F, G, A, B = 48, 50, 52, 41, 43, 45, 47

# chords as (root, shape, bars) per music category
SECTION_CHORDS: dict[str, tuple[tuple[int, tuple[int, ...], int], ...]] = {
    "film-flat": ((C, MAJ7, 2), (F, MAJ7, 1), (G, SUS4, 1)),
    "film-fold": ((A, MIN7, 1), (F, MAJ7, 1), (D, SUS4, 1), (D, MAJ, 1)),
    "film-worlds": ((G, ADD9, 2), (E, MIN7, 2),            # robot arm (4 bars)
                    (C, MAJ7, 2), (D, MAJ, 1),             # drone (3)
                    (G, ADD9, 2), (B, MIN7, 1),            # network (3)
                    (C, MAJ7, 1), (A, MIN7, 1),            # hyperbolic (2)
                    (E, MIN7, 1), (D, MAJ, 1),             # brain (2)
                    (C, MAJ7, 1), (D, SUS4, 1)),           # data (2)
    "film-rebuild": ((E, MIN7, 2), (C, MAJ7, 2),           # "They all live on manifolds ..."
                     (G, ADD9, 2), (E, MIN7, 1), (C, MAJ7, 1),  # the four words, from bar 4
                     (A, MIN7, 2), (D, MAJ, 2)),               # the descent
    "film-build": ((F, MAJ7, 1), (G, MAJ, 1)),
    "film-drop": ((A, MIN7, 1), (F, MAJ7, 1), (C, ADD9, 1), (G, MAJ, 1),
                  (A, MIN7, 1), (F, MAJ7, 1), (C, ADD9, 1), (G, MAJ, 1), (G, MAJ, 1)),
    "film-title": ((C, ADD9, 3), (F, MAJ7, 1), (C, ADD9, 2)),
    "film-credits": ((C, MAJ7, 4),),
}
NAMES = ("C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B")


@dataclass(frozen=True)
class BarChord:
    chapter: TimelineChapter
    music: str
    section_bar: int              # bar index within the section
    root: int
    shape: tuple[int, ...]
    chord_start: bool             # first bar of its chord
    chord_bars: int

    def beat(self, b: float) -> float:
        """Absolute time of beat `b` of this bar (fractional, linear inside a beat; may run into the next bar)."""
        bt = self.chapter.beat_times
        assert bt is not None
        g = self.section_bar * BEATS_PER_BAR + b
        last = len(bt) - 1
        if g >= last:
            return self.chapter.start + bt[last] + (g - last) * (bt[last] - bt[last - 1])
        k = int(g)
        return self.chapter.start + bt[k] + (g - k) * (bt[k + 1] - bt[k])

    @property
    def start(self) -> float:
        return self.beat(0)

    @property
    def length(self) -> float:
        return self.beat(4) - self.beat(0)


class FilmHarmony:
    def plan(self, timeline: Timeline) -> list[BarChord]:
        out: list[BarChord] = []
        for ch in timeline.chapters:
            if ch.beat_times is None:
                raise ValueError(f"{ch.id}: film chapter without beat times")
            bars = (len(ch.beat_times) - 1) // BEATS_PER_BAR
            chords = SECTION_CHORDS[ch.music]
            if sum(c[2] for c in chords) != bars:
                raise ValueError(f"{ch.id}: chord plan covers {sum(c[2] for c in chords)} bars, section has {bars}")
            b = 0
            for root, shape, length in chords:
                for j in range(length):
                    out.append(BarChord(ch, ch.music, b, root, shape, j == 0, length))
                    b += 1
        return out

    def log(self, timeline: Timeline) -> list[str]:
        """Chord root and tempo per bar, for observation."""
        rows = []
        for c in self.plan(timeline):
            bpm = 60 * 4 / c.length
            rows.append(f"{NAMES[c.root % 12]}@{bpm:.0f}")
        return rows
