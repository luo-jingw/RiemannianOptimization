"""Mix and loudness settings per episode kind."""
from __future__ import annotations

from dataclasses import dataclass

from rvideo.audio.narration_mixer import MixSettings


@dataclass(frozen=True)
class MixProfile:
    mix: MixSettings
    target_lufs: float

    @staticmethod
    def for_kind(kind: str) -> MixProfile:
        if kind == "trailer":
            # Music leads: louder bed, light ducking, louder delivery.
            return MixProfile(mix=MixSettings(music_bed_dbfs=-19.0, duck_db=4.0), target_lufs=-14.0)
        return MixProfile(mix=MixSettings(), target_lufs=-16.0)
