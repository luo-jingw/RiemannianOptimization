"""Tape stop: playback slows to a halt and darkens, like a tape machine losing power."""
from __future__ import annotations

import numpy as np

from rvideo.music.trailer_dsp import SR


class TapeStop:
    def __init__(self, seconds: float, exponent: float = 1.3, boost: float = 1.1) -> None:
        self.seconds = seconds              # real time the stop lasts
        self.exponent = exponent            # speed(u) = (1 − u)^exponent, u from 0 to 1 over the stop
        self.boost = boost                  # the stop sits a little above the music it stops

    def consumed(self) -> float:
        """Seconds of music the stop plays through."""
        return self.seconds / (self.exponent + 1)

    def apply(self, mix: np.ndarray, at: float) -> None:
        """Replaces mix[at : at + seconds] by the slowed music from `at`, and silences everything after it."""
        n_total = mix.shape[0]
        i0 = int(round(at * SR))
        n_stop = int(self.seconds * SR)
        u = np.arange(n_stop) / n_stop
        speed = (1 - u) ** self.exponent
        read = at * SR + np.cumsum(speed)
        cutoff = 150 + 11850 * speed ** 1.5             # a one-pole low-pass that follows the speed
        k = 1 - np.exp(-2 * np.pi * cutoff / SR)
        tail = np.clip((1 - u) / 0.08, 0, 1)
        for ch in range(mix.shape[1]):
            y = np.interp(read, np.arange(n_total), mix[:, ch])
            out = np.empty(n_stop)
            state = 0.0
            for i in range(n_stop):
                state += k[i] * (y[i] - state)
                out[i] = state
            mix[i0:i0 + n_stop, ch] = out * self.boost * tail
        mix[i0 + n_stop:] = 0.0
