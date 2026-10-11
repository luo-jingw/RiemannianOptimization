"""Extracts the trailer montage shots (content/episodes/e00-trailer/montage.json) from delivered episode videos.

Each shot is a 16:9 crop above the caption band, scaled to 1600×900, written to player/public/trailer-montage/NN.jpg.

    .venv/bin/python -m rvideo.assets.montage_frames
"""
from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass

from rvideo.paths import ProjectPaths

CAPTION_TOP = 860


@dataclass(frozen=True)
class MontageShot:
    episode: str
    time: float
    x: int
    y: int
    w: int

    @property
    def h(self) -> int:
        return round(self.w * 9 / 16)


def extract_montage(paths: ProjectPaths) -> list[str]:
    spec = json.loads((paths.episode_content("e00-trailer") / "montage.json").read_text(encoding="utf-8"))
    shots = [MontageShot(**s) for s in spec["shots"]]
    out_dir = paths.root / "player" / "public" / "trailer-montage"
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for i, shot in enumerate(shots, start=1):
        if shot.y + shot.h > CAPTION_TOP:
            raise ValueError(f"shot {i}: crop reaches y={shot.y + shot.h}, inside the caption band")
        mp4 = paths.output_dir(shot.episode, 1) / f"{shot.episode}.en.mp4"
        out = out_dir / f"{i:02d}.jpg"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{shot.time:.2f}", "-i", str(mp4),
                        "-frames:v", "1", "-vf", f"crop={shot.w}:{shot.h}:{shot.x}:{shot.y},scale=1600:900:flags=lanczos",
                        "-q:v", "2", str(out)], check=True)
        written.append(str(out))
    return written


if __name__ == "__main__":
    for f in extract_montage(ProjectPaths.discover()):
        print(f)
