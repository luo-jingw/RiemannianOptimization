"""Series registry: episode order, IDs, titles, status."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

EpisodeStatus = Literal["planned", "scripted", "delivered"]
EPISODE_STATUSES: tuple[EpisodeStatus, ...] = ("planned", "scripted", "delivered")
EpisodeKind = Literal["episode", "trailer"]
EPISODE_KINDS: tuple[EpisodeKind, ...] = ("episode", "trailer")


@dataclass(frozen=True)
class EpisodeEntry:
    id: str
    order: int
    title: str
    status: EpisodeStatus
    kind: EpisodeKind = "episode"


@dataclass(frozen=True)
class SeriesManifest:
    title: str
    episodes: tuple[EpisodeEntry, ...]

    @staticmethod
    def load(path: Path) -> SeriesManifest:
        raw = json.loads(path.read_text(encoding="utf-8"))
        episodes: list[EpisodeEntry] = []
        for item in raw["episodes"]:
            status = item["status"]
            if status not in EPISODE_STATUSES:
                raise ValueError(f"episode {item['id']}: invalid status {status!r}")
            kind = item.get("kind", "episode")
            if kind not in EPISODE_KINDS:
                raise ValueError(f"episode {item['id']}: invalid kind {kind!r}")
            episodes.append(EpisodeEntry(id=str(item["id"]), order=int(item["order"]),
                                         title=str(item["title"]), status=status, kind=kind))
        episodes.sort(key=lambda e: e.order)
        return SeriesManifest(title=str(raw["title"]), episodes=tuple(episodes))

    def episode(self, episode_id: str) -> EpisodeEntry:
        for entry in self.episodes:
            if entry.id == episode_id:
                return entry
        raise KeyError(f"episode {episode_id!r} is not registered in series.json")
