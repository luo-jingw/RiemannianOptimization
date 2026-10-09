"""Sentence-level Kokoro synthesis with content-addressed caching and provenance."""
from __future__ import annotations

import hashlib
import importlib.metadata
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

from rvideo.schema.pronunciation import PronunciationLexicon
from rvideo.schema.provenance import SentenceAudio, VoiceProvenance
from rvideo.schema.story import Story

MODEL_REPO = "hexgrad/Kokoro-82M"
SAMPLE_RATE = 24000


@dataclass(frozen=True)
class SynthesisJob:
    scene_index: int
    scene_id: str
    sentence_index: int
    text: str
    tts_text: str
    cache_key: str
    file_name: str


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


class KokoroSynthesizer:
    """Owns build/<eid>/en/audio/sentences/ and voice-provenance.json."""

    def __init__(self, lexicon: PronunciationLexicon) -> None:
        self._lexicon = lexicon
        self._pipeline: object | None = None

    def plan_jobs(self, story: Story) -> list[SynthesisJob]:
        jobs: list[SynthesisJob] = []
        for si, scene in enumerate(story.scenes):
            for ti, sentence in enumerate(scene.sentences):
                tts_text = self._lexicon.apply(sentence.en)
                key = hashlib.sha256(f"{story.voice}|{story.rate}|{tts_text}".encode()).hexdigest()
                jobs.append(SynthesisJob(scene_index=si, scene_id=scene.id, sentence_index=ti, text=sentence.en,
                                         tts_text=tts_text, cache_key=key,
                                         file_name=f"{key[:20]}.wav"))   # content-addressed: survives reordering
        return jobs

    def _kpipeline(self) -> object:
        if self._pipeline is None:
            from kokoro import KPipeline  # heavy import, only when synthesis is needed
            self._pipeline = KPipeline(lang_code="a", repo_id=MODEL_REPO)
        return self._pipeline

    def _synthesize(self, tts_text: str, voice: str, rate: float) -> np.ndarray:
        pipeline = self._kpipeline()
        chunks = [audio.numpy() for _, _, audio in pipeline(tts_text, voice=voice, speed=rate, split_pattern=None)]
        if not chunks:
            raise RuntimeError(f"Kokoro produced no audio for: {tts_text!r}")
        return np.concatenate(chunks).astype(np.float32)

    def run(self, story: Story, sentence_dir: Path, provenance_path: Path) -> tuple[VoiceProvenance, int, int]:
        """Returns (provenance, synthesized_count, reused_count)."""
        sentence_dir.mkdir(parents=True, exist_ok=True)
        jobs = self.plan_jobs(story)
        records: list[SentenceAudio] = []
        synthesized = 0
        reused = 0
        for job in jobs:
            path = sentence_dir / job.file_name
            if path.exists():
                reused += 1
                audio, sr = sf.read(path, dtype="float32")
                if sr != SAMPLE_RATE:
                    raise RuntimeError(f"{path}: sample rate {sr} != {SAMPLE_RATE}")
            else:
                audio = self._synthesize(job.tts_text, story.voice, story.rate)
                sf.write(path, audio, SAMPLE_RATE, subtype="PCM_16")
                synthesized += 1
            peak = float(np.abs(audio).max())
            records.append(SentenceAudio(
                scene_id=job.scene_id, index=job.sentence_index, text=job.text, text_sha256=job.cache_key,
                file=job.file_name, samples=int(audio.shape[0]), duration=audio.shape[0] / SAMPLE_RATE,
                peak_dbfs=20.0 * float(np.log10(max(peak, 1e-9)))))
        referenced = {j.file_name for j in jobs}
        for stale in sentence_dir.glob("*.wav"):
            if stale.name not in referenced:
                stale.unlink()
        snapshot = self._snapshot_dir()
        provenance = VoiceProvenance(
            model_repo=MODEL_REPO, model_revision=snapshot.name,
            weights_sha256=_sha256_file(snapshot / "kokoro-v1_0.pth"), voice=story.voice,
            voice_sha256=_sha256_file(snapshot / "voices" / f"{story.voice}.pt"), rate=story.rate,
            sample_rate=SAMPLE_RATE, kokoro_version=importlib.metadata.version("kokoro"),
            misaki_version=importlib.metadata.version("misaki"), sentences=tuple(records))
        provenance.save(provenance_path)
        return provenance, synthesized, reused

    @staticmethod
    def _snapshot_dir() -> Path:
        from huggingface_hub import snapshot_download
        return Path(snapshot_download(MODEL_REPO, allow_patterns=["config.json", "kokoro-v1_0.pth", "voices/af_heart.pt"]))
