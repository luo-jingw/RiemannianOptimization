"""Bilingual SRT: English line above Chinese line, same visible intervals as the timeline."""
from __future__ import annotations

from pathlib import Path

from rvideo.schema.timeline import Timeline


def _stamp(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


class SrtWriter:
    def write(self, timeline: Timeline, path: Path) -> int:
        lines: list[str] = []
        for i, cap in enumerate(timeline.captions, start=1):
            lines += [str(i), f"{_stamp(cap.start)} --> {_stamp(cap.end)}", cap.text, cap.translation, ""]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(lines), encoding="utf-8")
        return len(timeline.captions)
