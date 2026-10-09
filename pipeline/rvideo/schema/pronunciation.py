"""Pronunciation lexicon: regex pattern -> Kokoro phonemes. Applied to TTS input only, never to captions."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PronunciationEntry:
    pattern: str
    phonemes: str
    note: str


@dataclass(frozen=True)
class PronunciationLexicon:
    entries: tuple[PronunciationEntry, ...]

    @staticmethod
    def load(path: Path) -> PronunciationLexicon:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return PronunciationLexicon(entries=tuple(
            PronunciationEntry(pattern=str(e["pattern"]), phonemes=str(e["phonemes"]), note=str(e.get("note", "")))
            for e in raw["entries"]))

    def apply(self, text: str) -> str:
        """Rewrite every match into Kokoro's inline syntax [matched text](/phonemes/)."""
        for entry in self.entries:
            text = re.sub(entry.pattern, lambda m, ph=entry.phonemes: f"[{m.group(0)}](/{ph}/)", text)
        return text
