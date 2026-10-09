"""Per-episode English script: scenes with explicit sentence list and Chinese translation."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

MusicCategory = Literal["motivation", "definition", "proof", "counterexample", "recap"]
MUSIC_CATEGORIES: tuple[MusicCategory, ...] = ("motivation", "definition", "proof", "counterexample", "recap")


@dataclass(frozen=True)
class StorySentence:
    en: str
    zh: str


@dataclass(frozen=True)
class StoryScene:
    id: str
    chapter: str
    title: str
    music: MusicCategory
    terms: tuple[str, ...]
    sentences: tuple[StorySentence, ...]


@dataclass(frozen=True)
class Story:
    episode: str
    title: str
    voice: str
    rate: float
    scenes: tuple[StoryScene, ...]

    @staticmethod
    def load(path: Path) -> Story:
        raw = json.loads(path.read_text(encoding="utf-8"))
        scenes: list[StoryScene] = []
        for s in raw["scenes"]:
            music = s["music"]
            if music not in MUSIC_CATEGORIES:
                raise ValueError(f"scene {s['id']}: invalid music category {music!r}")
            sentences = tuple(StorySentence(en=str(x["en"]), zh=str(x["zh"])) for x in s["sentences"])
            scenes.append(StoryScene(id=str(s["id"]), chapter=str(s["chapter"]), title=str(s["title"]),
                                     music=music, terms=tuple(str(t) for t in s.get("terms", [])),
                                     sentences=sentences))
        return Story(episode=str(raw["episode"]), title=str(raw["title"]), voice=str(raw["voice"]),
                     rate=float(raw["rate"]), scenes=tuple(scenes))
