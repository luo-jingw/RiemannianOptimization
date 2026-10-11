"""Instruments that enrich the episode palette for the trailer. Each renderer is a pure function returning mono audio.

The episode voices (music_composer.Voices: additive pad, soft pluck, FM bell, sine bass) stay the core of the sound;
these add an ensemble string section, piano, horn, timpani and soft cinematic percussion in the same warm register.
"""
from __future__ import annotations

import numpy as np

from rvideo.music.trailer_dsp import SR, bandpass, highpass, hz, lowpass, noise, time_axis


def _release(n_note: int, n_total: int, release: float) -> np.ndarray:
    """1 while the note is held (n_note samples), then a linear release over `release` seconds."""
    env = np.ones(n_total)
    r = max(1, int(release * SR))
    tail = np.arange(n_total - n_note)
    env[n_note:] = np.clip(1 - tail / r, 0.0, 1.0)
    return env


class Orchestra:
    @staticmethod
    def strings(midi: float, seconds: float, attack: float = 0.8, brightness: float = 2400.0, seed: int = 0) -> np.ndarray:
        """Ensemble strings: three detuned additive voices with delayed vibrato, slow bow attack, soft release."""
        n_note = int(seconds * SR)
        n = n_note + int(1.2 * SR)
        t = time_axis(n)
        rng = np.random.default_rng(seed)
        f0 = hz(midi)
        vib = 1 + 0.0028 * np.sin(2 * np.pi * 5.1 * t + rng.uniform(0, 6.28)) * np.clip((t - 0.35) / 0.6, 0.0, 1.0)
        out = np.zeros(n)
        for cents in (-7.0, 0.0, 6.0):
            f = f0 * 2 ** (cents / 1200)
            phase = 2 * np.pi * np.cumsum(f * vib) / SR
            for h in range(1, 9):
                if f * h > brightness * 2.5:
                    break
                out += np.sin(h * phase + rng.uniform(0, 6.28)) / h ** 1.15
        out = lowpass(out / 3, brightness)
        env = np.minimum(1.0, t / attack) ** 1.5 * _release(n_note, n, 1.0)
        return out * env

    @staticmethod
    def piano(midi: float, seconds: float, velocity: float = 1.0) -> np.ndarray:
        """Piano: slightly inharmonic partials, upper partials decaying faster, a soft hammer, damper on release."""
        n_note = int(seconds * SR)
        n = n_note + int(0.5 * SR)
        t = time_axis(n)
        f0 = hz(midi)
        out = np.zeros(n)
        b = 0.00035
        for k in range(1, 9):
            fk = k * f0 * np.sqrt(1 + b * k * k)
            if fk > 9000:
                break
            decay = 3.2 / k ** 0.8 * (261.6 / f0) ** 0.35
            out += np.sin(2 * np.pi * fk * t) * np.exp(-t / decay) * (velocity ** (0.5 * k)) / k ** 1.3
        hammer = lowpass(noise(n, int(midi)), 1800) * np.exp(-t / 0.012) * 0.08
        env = (1 - np.exp(-t / 0.003)) * _release(n_note, n, 0.25)
        return (out + hammer) * env

    @staticmethod
    def horn(midi: float, seconds: float, attack: float = 0.35) -> np.ndarray:
        """Horn section: harmonic tone with a formant near 700 Hz, slow swell, gentle vibrato."""
        n_note = int(seconds * SR)
        n = n_note + int(0.8 * SR)
        t = time_axis(n)
        f0 = hz(midi)
        phase = 2 * np.pi * np.cumsum(f0 * (1 + 0.002 * np.sin(2 * np.pi * 4.6 * t))) / SR
        out = np.zeros(n)
        for h in range(1, 11):
            fh = f0 * h
            if fh > 5000:
                break
            formant = np.exp(-((np.log2(fh / 700.0)) ** 2) / 0.8)
            out += np.sin(h * phase) * (0.35 / h + formant)
        out = lowpass(out, 1800)
        env = np.minimum(1.0, t / attack) ** 2 * _release(n_note, n, 0.7)
        return out * env

    @staticmethod
    def timpani(midi: float, velocity: float = 1.0, seconds: float = 2.5) -> np.ndarray:
        """Timpani: membrane partials with short decays and a felt-mallet thump."""
        n = int(seconds * SR)
        t = time_axis(n)
        f0 = hz(midi)
        out = np.zeros(n)
        for ratio, amp, decay in ((1.0, 1.0, 1.1), (1.5, 0.5, 0.7), (1.98, 0.3, 0.5), (2.44, 0.15, 0.35)):
            out += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / decay)
        thump = lowpass(noise(n, 71), 500) * np.exp(-t / 0.03) * 0.6
        return (out + thump) * (1 - np.exp(-t / 0.002)) * velocity

    @staticmethod
    def timpani_roll(midi: float, seconds: float, start: float = 0.15, end: float = 1.0) -> np.ndarray:
        """A crescendo roll: strokes every 1/24 s whose level rises from `start` to `end`."""
        n = int((seconds + 2.0) * SR)
        out = np.zeros(n)
        strokes = int(seconds * 24)
        stroke = Orchestra.timpani(midi, 1.0, 1.5)
        for k in range(strokes):
            i0 = int(k / 24 * SR)
            level = start + (end - start) * (k / max(1, strokes - 1)) ** 1.6
            i1 = min(n, i0 + stroke.shape[0])
            out[i0:i1] += stroke[: i1 - i0] * level * 0.35
        return out

    @staticmethod
    def soft_kick(punch: float = 1.0) -> np.ndarray:
        """A rounded low drum (no click): a sine falling from 85 Hz to 48 Hz."""
        n = int(0.6 * SR)
        t = time_axis(n)
        f = 48 + 37 * np.exp(-t / 0.05)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28) * (1 - np.exp(-t / 0.004)) * punch

    @staticmethod
    def shaker(seed: int = 81) -> np.ndarray:
        n = int(0.12 * SR)
        t = time_axis(n)
        return bandpass(noise(n, seed), 3500, 8000) * np.minimum(1.0, t / 0.006) * np.exp(-t / 0.035)

    @staticmethod
    def cymbal_swell(seconds: float, seed: int = 91) -> np.ndarray:
        """A soft suspended-cymbal roll that swells into the next downbeat and stops there."""
        n = int(seconds * SR)
        t = time_axis(n)
        body = lowpass(highpass(noise(n, seed), 1800), 7000)                  # warm wash, no hiss on top
        env = (t / seconds) ** 2.2
        env[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
        return body * env

    @staticmethod
    def cymbal(seed: int = 93) -> np.ndarray:
        """A soft cymbal wash with a long decay (mallet, not stick)."""
        n = int(4.0 * SR)
        t = time_axis(n)
        body = lowpass(highpass(noise(n, seed), 1500), 6500) * np.exp(-t / 1.4)
        return body * (1 - np.exp(-t / 0.02))

    @staticmethod
    def low_hit() -> np.ndarray:
        """A soft cinematic low hit: a 44 Hz sine settling to 36 Hz with a long decay."""
        n = int(3.5 * SR)
        t = time_axis(n)
        f = 36 + 8 * np.exp(-t / 0.3)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.5) * (1 - np.exp(-t / 0.01))
