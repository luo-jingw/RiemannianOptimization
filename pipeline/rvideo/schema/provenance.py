"""Voice provenance: which model, weights, voice and settings produced each sentence WAV."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class SentenceAudio:
    scene_id: str
    index: int
    text: str
    text_sha256: str
    file: str
    samples: int
    duration: float
    peak_dbfs: float


@dataclass(frozen=True)
class VoiceProvenance:
    model_repo: str
    model_revision: str
    weights_sha256: str
    voice: str
    voice_sha256: str
    rate: float
    sample_rate: int
    kokoro_version: str
    misaki_version: str
    sentences: tuple[SentenceAudio, ...]

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self), ensure_ascii=False, indent=1), encoding="utf-8")

    @staticmethod
    def load(path: Path) -> VoiceProvenance:
        raw = json.loads(path.read_text(encoding="utf-8"))
        sentences = tuple(SentenceAudio(**s) for s in raw.pop("sentences"))
        return VoiceProvenance(sentences=sentences, **raw)
