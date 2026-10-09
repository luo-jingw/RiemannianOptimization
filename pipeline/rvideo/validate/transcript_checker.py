"""Observational pronunciation check: Whisper transcript of each sentence WAV vs. the script text."""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from difflib import SequenceMatcher
from pathlib import Path

from rvideo.schema.provenance import VoiceProvenance

NUMBER_WORDS = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six",
                "7": "seven", "8": "eight", "9": "nine", "10": "ten"}


def _normalize(text: str) -> list[str]:
    text = text.lower().replace("-", " ")
    words = re.findall(r"[a-z0-9']+", text)
    out: list[str] = []
    for w in words:
        if w in NUMBER_WORDS:
            out.append(NUMBER_WORDS[w])
        elif re.fullmatch(r"[a-z]+\d+", w):                  # "u0" -> "u zero"
            letters, digits = re.match(r"([a-z]+)(\d+)", w).groups()  # type: ignore[union-attr]
            out += [letters] + [NUMBER_WORDS.get(d, d) for d in digits]
        else:
            out.append(w)
    return out


@dataclass(frozen=True)
class SentenceCheck:
    scene_id: str
    index: int
    script: str
    heard: str
    similarity: float
    differing: str


class TranscriptChecker:
    def __init__(self, model_size: str = "small.en") -> None:
        from faster_whisper import WhisperModel   # optional QA dependency
        self._model = WhisperModel(model_size, device="cuda", compute_type="float16")

    def check(self, provenance: VoiceProvenance, sentence_dir: Path) -> list[SentenceCheck]:
        results: list[SentenceCheck] = []
        for s in provenance.sentences:
            segments, _ = self._model.transcribe(str(sentence_dir / s.file), beam_size=5)
            heard = " ".join(seg.text.strip() for seg in segments)
            a, b = _normalize(s.text), _normalize(heard)
            sm = SequenceMatcher(a=a, b=b, autojunk=False)
            diffs = [f"{' '.join(a[i1:i2]) or '∅'}→{' '.join(b[j1:j2]) or '∅'}"
                     for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != "equal"]
            results.append(SentenceCheck(scene_id=s.scene_id, index=s.index, script=s.text, heard=heard,
                                         similarity=round(sm.ratio(), 3), differing="; ".join(diffs)))
        return results

    @staticmethod
    def save(results: list[SentenceCheck], path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=1), encoding="utf-8")
