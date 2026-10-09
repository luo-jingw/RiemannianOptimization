"""Shared glossary: term ID -> English, Chinese, display symbol, spoken form."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class GlossaryTerm:
    id: str
    en: str
    zh: str
    symbol: str
    spoken: str


@dataclass(frozen=True)
class Glossary:
    terms: tuple[GlossaryTerm, ...]

    @staticmethod
    def load(path: Path) -> Glossary:
        raw = json.loads(path.read_text(encoding="utf-8"))
        terms = tuple(
            GlossaryTerm(id=str(t["id"]), en=str(t["en"]), zh=str(t["zh"]),
                         symbol=str(t["symbol"]), spoken=str(t["spoken"]))
            for t in raw["terms"]
        )
        return Glossary(terms=terms)

    def ids(self) -> set[str]:
        return {t.id for t in self.terms}
