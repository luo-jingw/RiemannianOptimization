"""Places sentence WAVs on the timeline and mixes them over the score with envelope-driven ducking."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import lfilter, resample_poly

from rvideo.schema.provenance import VoiceProvenance
from rvideo.schema.timeline import Timeline

MIX_RATE = 48000


@dataclass(frozen=True)
class MixSettings:
    speech_rms_dbfs: float = -20.0      # target RMS of narration while speaking
    music_bed_dbfs: float = -30.0       # music RMS when nobody speaks
    duck_db: float = 10.0               # extra attenuation of music under speech
    attack_s: float = 0.08
    release_s: float = 0.9
    peak_ceiling: float = 0.89          # -1 dBFS


@dataclass(frozen=True)
class MixReport:
    narration_rms_dbfs: float
    music_rms_silence_dbfs: float
    music_rms_speech_dbfs: float
    mix_peak_dbfs: float
    duration: float


def _db(x: float) -> float:
    return 20.0 * float(np.log10(max(x, 1e-12)))


def _rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x)))) if x.size else 0.0


class NarrationMixer:
    """Owns build/<eid>/en/audio/narration.wav and mix.wav."""

    def __init__(self, settings: MixSettings) -> None:
        self._s = settings

    def build_narration(self, timeline: Timeline, provenance: VoiceProvenance, sentence_dir: Path) -> np.ndarray:
        n = int(np.ceil(timeline.duration * MIX_RATE))
        out = np.zeros(n)
        by_key = {(s.scene_id, s.index): s for s in provenance.sentences}
        for chapter in timeline.chapters:
            for i, local_start in enumerate(chapter.sentence_starts):
                record = by_key[(chapter.id, i)]
                audio, sr = sf.read(sentence_dir / record.file, dtype="float64")
                audio = resample_poly(audio, MIX_RATE // 8000, sr // 8000) if sr != MIX_RATE else audio
                i0 = int(round((chapter.start + local_start) * MIX_RATE))
                i1 = min(i0 + audio.shape[0], n)
                out[i0:i1] += audio[: i1 - i0]
        return out

    def _speech_envelope(self, narration: np.ndarray) -> np.ndarray:
        """0..1 activity envelope with fast attack and slow release."""
        frame = int(0.02 * MIX_RATE)
        frames = narration[: narration.size // frame * frame].reshape(-1, frame)
        active = (np.sqrt(np.mean(frames ** 2, axis=1)) > 10 ** (-45 / 20)).astype(float)
        env = np.zeros_like(active)
        a = np.exp(-0.02 / self._s.attack_s)
        r = np.exp(-0.02 / self._s.release_s)
        level = 0.0
        for k, x in enumerate(active):
            coeff = a if x > level else r
            level = coeff * level + (1 - coeff) * x
            env[k] = level
        env = np.repeat(env, frame)
        env = np.concatenate([env, np.full(narration.size - env.size, env[-1] if env.size else 0.0)])
        return lfilter([0.002], [1.0, -0.998], env)  # remove frame steps

    def mix(self, narration: np.ndarray, music: np.ndarray) -> tuple[np.ndarray, np.ndarray, MixReport]:
        s = self._s
        n = narration.size
        music = music[:n] if music.shape[0] >= n else np.pad(music, ((0, n - music.shape[0]), (0, 0)))
        speaking = np.abs(narration) > 0
        speech_rms = _rms(narration[speaking]) if speaking.any() else 1e-9
        narration = narration * (10 ** (s.speech_rms_dbfs / 20) / speech_rms)

        env = self._speech_envelope(narration)
        silence = env < 0.05
        music_mono = music.mean(axis=1)
        bed_rms = _rms(music_mono[silence]) if silence.any() else _rms(music_mono)
        music = music * (10 ** (s.music_bed_dbfs / 20) / max(bed_rms, 1e-9))
        gain = 10 ** (-s.duck_db * env / 20)
        music = music * gain[:, None]

        mix = music + narration[:, None]
        peak = float(np.abs(mix).max())
        if peak > s.peak_ceiling:
            mix *= s.peak_ceiling / peak
            narration = narration * s.peak_ceiling / peak
            music = music * s.peak_ceiling / peak
        talking = env > 0.95
        report = MixReport(
            narration_rms_dbfs=_db(_rms(narration[np.abs(narration) > 0])),
            music_rms_silence_dbfs=_db(_rms(music.mean(axis=1)[silence])) if silence.any() else float("nan"),
            music_rms_speech_dbfs=_db(_rms(music.mean(axis=1)[talking])) if talking.any() else float("nan"),
            mix_peak_dbfs=_db(float(np.abs(mix).max())), duration=n / MIX_RATE)
        return narration, mix, report

    @staticmethod
    def save(path: Path, audio: np.ndarray) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(path, audio.astype(np.float32), MIX_RATE, subtype="PCM_24")
