"""Deterministic stereo convolution reverb (seeded exponentially decaying noise impulse response)."""
from __future__ import annotations

import numpy as np
from scipy.signal import fftconvolve

from rvideo.music.trailer_instruments import SR, _lowpass


class Reverb:
    def __init__(self, seconds: float = 2.6, seed: int = 7, predelay: float = 0.02) -> None:
        n = int(seconds * SR)
        t = np.arange(n) / SR
        rng = np.random.default_rng(seed)
        decay = np.exp(-t / (seconds / 6.9))          # -60 dB at `seconds`
        pre = int(predelay * SR)
        self.ir = np.zeros((n + pre, 2))
        for ch in range(2):
            self.ir[pre:, ch] = _lowpass(rng.standard_normal(n), 6000) * decay
        self.ir /= np.sqrt(np.sum(self.ir ** 2, axis=0, keepdims=True))

    def apply(self, stereo: np.ndarray, wet: float) -> np.ndarray:
        out = np.zeros((stereo.shape[0] + self.ir.shape[0] - 1, 2))
        for ch in range(2):
            out[:, ch] = fftconvolve(stereo[:, ch], self.ir[:, ch])
        dry = np.pad(stereo, ((0, out.shape[0] - stereo.shape[0]), (0, 0)))
        return dry * (1 - wet) + out * wet
