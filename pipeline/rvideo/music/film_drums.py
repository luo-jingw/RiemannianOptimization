"""Drums and edit-style percussion for the e00 film score. Each renderer is a pure function returning mono audio."""
from __future__ import annotations

import numpy as np

from rvideo.music.trailer_dsp import SR, bandpass, highpass, hz, lowpass, noise, time_axis


class Drums:
    @staticmethod
    def kick(punch: float = 1.0) -> np.ndarray:
        """A punchy kick: sine falling from 138 Hz to 48 Hz with a short click."""
        n = int(0.5 * SR)
        t = time_axis(n)
        f = 48 + 90 * np.exp(-t / 0.035)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3)
        click = highpass(noise(n, 5), 2000) * np.exp(-t / 0.004) * 0.25
        return (body + click) * punch

    @staticmethod
    def snare(seed: int = 9) -> np.ndarray:
        n = int(0.45 * SR)
        t = time_axis(n)
        tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.07) * 0.6
        wires = bandpass(noise(n, seed), 1500, 7500) * np.exp(-t / 0.16)
        return tone + wires * 0.8

    @staticmethod
    def tom(midi: float, seed: int = 13) -> np.ndarray:
        """Taiko-style low tom: a pitched membrane falling a little, with a skin slap."""
        n = int(1.2 * SR)
        t = time_axis(n)
        f = hz(midi) * (1 + 0.25 * np.exp(-t / 0.05))
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45)
        slap = lowpass(noise(n, seed), 1200) * np.exp(-t / 0.02) * 0.4
        return body + slap

    @staticmethod
    def hat(seed: int, open_: bool = False) -> np.ndarray:
        n = int((0.3 if open_ else 0.08) * SR)
        t = time_axis(n)
        return bandpass(noise(n, seed), 6000, 13000) * np.exp(-t / (0.12 if open_ else 0.02)) * 0.6

    @staticmethod
    def tick(seed: int = 3) -> np.ndarray:
        """A woodblock-like tick (clockwork)."""
        n = int(0.08 * SR)
        t = time_axis(n)
        return (np.sin(2 * np.pi * 1700 * t) * 0.5 + bandpass(noise(n, seed), 2500, 6000) * 0.3) * np.exp(-t / 0.015)

    @staticmethod
    def clap(seed: int = 17) -> np.ndarray:
        """Three quick noise bursts and a short tail."""
        n = int(0.3 * SR)
        t = time_axis(n)
        env = np.exp(-t / 0.12) * 0.6
        for d in (0.0, 0.01, 0.022):
            env = env + np.where(t >= d, np.exp(-np.clip(t - d, 0, None) / 0.012), 0.0)
        return bandpass(noise(n, seed), 900, 6000) * env * 0.5

    @staticmethod
    def cowbell(midi: float) -> np.ndarray:
        """808-style cowbell: two squares a ratio 1.48 apart through a band-pass, pitched by `midi`."""
        n = int(0.35 * SR)
        t = time_axis(n)
        f = hz(midi)
        sq = np.sign(np.sin(2 * np.pi * f * t)) + np.sign(np.sin(2 * np.pi * f * 1.48 * t))
        return bandpass(sq, f * 0.9, f * 5) * (np.exp(-t / 0.06) * 0.6 + np.exp(-t / 0.22) * 0.4) * 0.5

    @staticmethod
    def bass808(midi: float, seconds: float, glide_to: float | None = None) -> np.ndarray:
        """Distorted 808: sine with an attack pitch drop, long sustain, optional glide into the next note."""
        n = int(seconds * SR)
        t = time_axis(n)
        f = hz(midi) * (1 + 0.6 * np.exp(-t / 0.02))
        if glide_to is not None:
            g = np.clip((t - (seconds - 0.12)) / 0.12, 0, 1)
            f = f * (hz(glide_to) / hz(midi)) ** g
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.003) * np.clip((seconds - t) / 0.05, 0, 1)
        return np.tanh(2.8 * x) * 0.8
