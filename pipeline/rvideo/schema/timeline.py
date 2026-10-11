"""Timeline written by the timeline builder and read by subtitles, music, mixer and player."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class TimelineCaption:
    start: float
    end: float
    text: str
    translation: str


@dataclass(frozen=True)
class TimelineChapter:
    id: str
    index: int
    start: float
    end: float
    title: str
    music: str
    sentence_starts: tuple[float, ...]
    sentence_ends: tuple[float, ...]


@dataclass(frozen=True)
class Timeline:
    language: str
    episode: str
    duration: float
    chapters: tuple[TimelineChapter, ...]
    captions: tuple[TimelineCaption, ...]
    bar_seconds: float | None = None    # trailers: seconds per bar of the musical grid

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        data = asdict(self)
        bar = data.pop("bar_seconds")
        if bar is not None:
            data["barSeconds"] = bar
        # JSON uses the player's camelCase keys for sentence anchors.
        for ch in data["chapters"]:
            ch["sentenceStarts"] = ch.pop("sentence_starts")
            ch["sentenceEnds"] = ch.pop("sentence_ends")
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    @staticmethod
    def load(path: Path) -> Timeline:
        raw = json.loads(path.read_text(encoding="utf-8"))
        chapters = tuple(
            TimelineChapter(id=c["id"], index=int(c["index"]), start=float(c["start"]), end=float(c["end"]),
                            title=c["title"], music=c["music"],
                            sentence_starts=tuple(float(x) for x in c["sentenceStarts"]),
                            sentence_ends=tuple(float(x) for x in c["sentenceEnds"]))
            for c in raw["chapters"]
        )
        captions = tuple(TimelineCaption(start=float(c["start"]), end=float(c["end"]), text=c["text"],
                                         translation=c["translation"]) for c in raw["captions"])
        bar = raw.get("barSeconds")
        return Timeline(language=raw["language"], episode=raw["episode"], duration=float(raw["duration"]),
                        chapters=chapters, captions=captions, bar_seconds=float(bar) if bar is not None else None)
