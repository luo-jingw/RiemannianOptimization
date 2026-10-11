"""Bar-by-bar chord plan of the trailer, in the episode score's harmonic language (music_composer.py).

One key per large section, each change prepared by a sus4 or dominant chord at the end of the previous section:
C (open, fold) → G (gallery) → D (toolkit) → A (montage, ending ♭VI–♭VII) → C (title, credits).
The gallery's harmonic rhythm follows its shots of 6, 5, 4, 3, 3, 3 bars
(player/src/episodes/e00-trailer/lib/gallery-shots.ts): chords get shorter as the shots do.
"""
from __future__ import annotations

from dataclasses import dataclass

from rvideo.music.music_composer import ADD9, MAJ, MAJ7, MIN7, SUS4, EpisodeKey
from rvideo.schema.timeline import Timeline

KEY_NAMES = {0: "C", 7: "G", 2: "D", 9: "A"}

# key (semitones above C) and chords as (degree above the key, shape, bars) per music category
SECTION_HARMONY: dict[str, tuple[int, tuple[tuple[int, tuple[int, ...], int], ...]]] = {
    "trailer-open": (0, ((0, MAJ7, 4), (5, MAJ7, 2), (7, SUS4, 2))),
    "trailer-fold": (0, ((5, MAJ7, 2), (9, MIN7, 2), (2, SUS4, 2), (2, MAJ, 1))),                 # D: V of G
    "trailer-gallery": (7, ((0, ADD9, 3), (9, MIN7, 3),                                           # shot 1 (6 bars)
                            (5, MAJ7, 3), (7, SUS4, 1), (7, MAJ, 1),                              # shot 2 (5)
                            (0, ADD9, 2), (4, MIN7, 2),                                           # shot 3 (4)
                            (5, MAJ7, 2), (2, MIN7, 1),                                           # shot 4 (3)
                            (9, MIN7, 2), (7, MAJ, 1),                                            # shot 5 (3)
                            (5, MAJ7, 1), (9, MIN7, 1), (2, SUS4, 1))),                           # shot 6: ii–V of D
    "trailer-toolkit": (2, ((0, MAJ7, 2), (9, MIN7, 2), (5, MAJ7, 2), (7, SUS4, 1), (7, MAJ, 1),
                            (0, ADD9, 2), (4, MIN7, 2), (5, MAJ7, 2), (2, SUS4, 1), (2, MAJ, 1))),  # E: V of A
    "trailer-montage": (9, ((0, ADD9, 2), (9, MIN7, 2), (4, MIN7, 1), (5, MAJ7, 1), (2, MIN7, 2),
                            (8, MAJ, 1), (10, MAJ, 1))),                                          # F, G → C
    "trailer-title": (0, ((0, ADD9, 4), (5, MAJ7, 2), (0, ADD9, 2))),
    "trailer-credits": (0, ((0, MAJ7, 4),)),
}


@dataclass(frozen=True)
class BarChord:
    bar: int                      # bar index from the start of the trailer
    start: float                  # seconds
    music: str                    # music category of the section
    section_bar: int              # bar index within the section
    key: int                      # semitones above C
    root: int                     # MIDI root of the chord, in the episode bass register
    shape: tuple[int, ...]
    chord_start: bool             # True on the first bar of a chord
    chord_bars: int               # length of the chord this bar belongs to


class TrailerHarmony:
    def plan(self, timeline: Timeline) -> list[BarChord]:
        if timeline.bar_seconds is None:
            raise ValueError("trailer harmony needs a bar-grid timeline")
        bar = timeline.bar_seconds
        out: list[BarChord] = []
        for ch in timeline.chapters:
            bars = round((ch.end - ch.start) / bar)
            key, chords = SECTION_HARMONY[ch.music]
            if sum(c[2] for c in chords) != bars:
                raise ValueError(f"{ch.id}: chord plan covers {sum(c[2] for c in chords)} bars, section has {bars}")
            key_root = EpisodeKey.for_order(1 + _fifths_from_c(key)).root_midi
            b = 0
            for degree, shape, length in chords:
                for j in range(length):
                    out.append(BarChord(len(out), ch.start + b * bar, ch.music, b, key, key_root + degree, shape,
                                        j == 0, length))
                    b += 1
        return out

    def log(self, timeline: Timeline) -> list[str]:
        """Key and chord root per bar, for observation."""
        names = ("C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B")
        return [f"{KEY_NAMES[c.key]}:{names[c.root % 12]}" for c in self.plan(timeline)]


def _fifths_from_c(key: int) -> int:
    """Number of fifths from C to `key` (EpisodeKey numbers keys by circle-of-fifths order)."""
    return next(k for k in range(12) if (7 * k) % 12 == key)
