"""Synthesized voices for the trailer score. Every voice is a pure function of its arguments (seeded noise)."""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, lfilter

SR = 48000


def hz(midi: float) -> float:
    return 440.0 * 2.0 ** ((midi - 69.0) / 12.0)


def _t(n: int) -> np.ndarray:
    return np.arange(n) / SR


def _noise(n: int, seed: int) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal(n)


def _bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    return lfilter(b, a, x)


def _lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, cutoff / (SR / 2), btype="low")
    return lfilter(b, a, x)


def _highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, cutoff / (SR / 2), btype="high")
    return lfilter(b, a, x)


def _saw(freq: float, n: int, phase: float = 0.0, max_freq: float = 12000.0) -> np.ndarray:
    """Band-limited sawtooth by additive synthesis (harmonics below max_freq)."""
    t = _t(n)
    out = np.zeros(n)
    for k in range(1, max(2, int(max_freq / freq))):
        out += np.sin(2 * np.pi * k * freq * t + k * phase) / k
    return out * (2 / np.pi)


class Drums:
    @staticmethod
    def kick(n: int = int(0.5 * SR), punch: float = 1.0) -> np.ndarray:
        t = _t(n)
        f = 45 + 95 * np.exp(-t / 0.045)                     # pitch drop 140 Hz -> 45 Hz
        phase = 2 * np.pi * np.cumsum(f) / SR
        body = np.sin(phase) * np.exp(-t / 0.28)
        click = _highpass(_noise(n, 11), 2000) * np.exp(-t / 0.004) * 0.25
        return (body + click) * punch

    @staticmethod
    def snare(n: int = int(0.35 * SR), seed: int = 21) -> np.ndarray:
        t = _t(n)
        tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.06) * 0.5
        noise = _bandpass(_noise(n, seed), 1200, 8000) * np.exp(-t / 0.12)
        return tone + noise * 0.9

    @staticmethod
    def hat(n: int = int(0.09 * SR), seed: int = 31, open_: bool = False) -> np.ndarray:
        t = _t(n)
        return _highpass(_noise(n, seed), 7000, 3) * np.exp(-t / (0.12 if open_ else 0.025)) * 0.5

    @staticmethod
    def crash(n: int = int(2.5 * SR), seed: int = 37) -> np.ndarray:
        """Crash cymbal: bright noise with a fast transient and a long decay."""
        t = _t(n)
        body = _highpass(_noise(n, seed), 3500, 2) * np.exp(-t / 0.9)
        return (body + _highpass(_noise(n, seed + 1), 6000, 2) * np.exp(-t / 0.05)) * 0.5

    @staticmethod
    def heartbeat(n: int = int(0.6 * SR)) -> np.ndarray:
        t = _t(n)
        f = 38 + 30 * np.exp(-t / 0.06)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)


class Synths:
    @staticmethod
    def pad(midis: list[float], n: int, brightness: float = 1200.0, seed: int = 0, attack: float = 0.9) -> np.ndarray:
        """Detuned saw stack, low-passed, `attack` seconds of attack and a slow release; returns mono."""
        out = np.zeros(n)
        rng = np.random.default_rng(seed)
        for m in midis:
            for cents in (-9.0, 0.0, 8.0):
                out += _saw(hz(m) * 2 ** (cents / 1200), n, rng.uniform(0, 6.28), brightness * 2.0) / 3
        out = _lowpass(out / max(1, len(midis)), brightness)
        tt = _t(n)
        dur = n / SR
        env = np.minimum(1.0, tt / attack) * np.clip((dur - tt) / 0.8, 0.0, 1.0)
        return out * env

    @staticmethod
    def pluck(midi: float, n: int = int(0.7 * SR), bright: float = 4000.0) -> np.ndarray:
        t = _t(n)
        x = _saw(hz(midi), n, 0.0, bright * 1.5) * np.exp(-t / 0.18) * (1 - np.exp(-t / 0.002))
        return _lowpass(x, bright)

    @staticmethod
    def bass(midi: float, n: int, cutoff: float = 700.0) -> np.ndarray:
        t = _t(n)
        x = _saw(hz(midi), n, 0.0, cutoff * 2.0) * 0.6 + np.sin(2 * np.pi * hz(midi) * t) * 0.6
        env = np.minimum(1.0, t / 0.005) * np.exp(-t / 0.35)
        return _lowpass(x * env, cutoff)

    @staticmethod
    def lead(notes: list[tuple[float, float, float]], n: int) -> np.ndarray:
        """Monophonic lead: (start_s, dur_s, midi) notes, glide between notes, vibrato after onset."""
        t = _t(n)
        pitch = np.full(n, np.nan)
        amp = np.zeros(n)
        for start, dur, m in notes:
            a, b = int(start * SR), min(n, int((start + dur) * SR))
            if a >= n:
                continue
            pitch[a:b] = m
            local = t[a:b] - start
            amp[a:b] = np.minimum(1.0, local / 0.03) * np.clip((dur - local) / 0.08, 0, 1)
        # hold last pitch through gaps so glides are continuous
        last = notes[0][2] if notes else 60.0
        for i in range(n):
            if np.isnan(pitch[i]):
                pitch[i] = last
            else:
                last = pitch[i]
        glide = lfilter([0.004], [1, -0.996], pitch - pitch[0]) + pitch[0]
        vibrato = 0.12 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1.0, t % 1.0 / 0.4)
        f = hz(0) * 2 ** ((glide + vibrato) / 12)
        phase = 2 * np.pi * np.cumsum(f) / SR
        tone = np.zeros(n)
        for k in range(1, 9):
            tone += np.sin(k * phase) / k ** 1.3
        return _lowpass(tone * amp, 3500)

    @staticmethod
    def bell(midi: float, n: int = int(4 * SR)) -> np.ndarray:
        t = _t(n)
        f = hz(midi)
        index = 2.2 * np.exp(-t / 0.9)
        env = np.exp(-t / 2.2) * (1 - np.exp(-t / 0.003))
        return env * np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * 1.4 * t))


class Fx:
    @staticmethod
    def riser(n: int, seed: int = 41) -> np.ndarray:
        """Noise swell with a rising band and pitch, ends at full level."""
        t = _t(n)
        dur = n / SR
        x = _noise(n, seed)
        out = np.zeros(n)
        steps = 24
        for k in range(steps):            # piecewise band sweep 300 Hz -> 9 kHz
            a, b = k * n // steps, (k + 1) * n // steps
            lo = 300 * (30 ** (k / steps))
            seg = _bandpass(x[max(0, a - 2000):b], lo, min(lo * 2.2, 20000))
            out[a:b] = seg[-(b - a):]
        sweep = np.sin(2 * np.pi * np.cumsum(200 * 2 ** (3 * t / dur)) / SR) * 0.25
        return (out + sweep) * (t / dur) ** 2

    @staticmethod
    def impact(n: int = int(3.0 * SR), seed: int = 51) -> np.ndarray:
        t = _t(n)
        boom = np.sin(2 * np.pi * np.cumsum(32 + 40 * np.exp(-t / 0.15)) / SR) * np.exp(-t / 1.1)
        burst = _lowpass(_noise(n, seed), 3000) * np.exp(-t / 0.35) * 0.5
        return boom + burst
