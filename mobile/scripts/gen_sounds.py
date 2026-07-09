#!/usr/bin/env python3
"""Generate short notification chime WAV files for Dr. Dose.

These are bundled via the expo-notifications config plugin (see app.json
"sounds"). iOS requires custom notification sounds to be short (<30s) and in
wav/caf/aiff; we output 44.1 kHz 16-bit mono PCM WAV.

Run: python3 scripts/gen_sounds.py
"""
import math
import os
import struct
import wave

SAMPLE_RATE = 44100
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")


def _write(name, samples):
    os.makedirs(OUT_DIR, exist_ok=True)
    # Normalize to -3 dBFS.
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = (10 ** (-3 / 20)) / peak
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for s in samples:
            v = int(max(-1.0, min(1.0, s * gain)) * 32767)
            frames += struct.pack("<h", v)
        w.writeframes(bytes(frames))
    print("wrote", os.path.abspath(path), f"({len(samples)/SAMPLE_RATE:.2f}s)")


def _tone(freq, dur, harmonics=(1.0,), attack=0.005, decay=None):
    """A single note: sum of harmonics with soft attack + exponential decay."""
    n = int(SAMPLE_RATE * dur)
    decay = decay if decay is not None else dur
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = min(1.0, t / attack) * math.exp(-t / (decay / 4))
        v = 0.0
        for k, amp in enumerate(harmonics, start=1):
            v += amp * math.sin(2 * math.pi * freq * k * t)
        out.append(v * env)
    return out


def _concat(*parts):
    out = []
    for p in parts:
        out.extend(p)
    return out


def _silence(dur):
    return [0.0] * int(SAMPLE_RATE * dur)


def make_chime():
    # Gentle two-note rising chime (A5 -> D6).
    return _concat(
        _tone(880.0, 0.5, harmonics=(1.0, 0.25), decay=0.5),
        _tone(1174.7, 0.8, harmonics=(1.0, 0.25), decay=0.8),
    )


def make_bell():
    # Bell: strong upper harmonics, long-ish decay (E5 fundamental).
    return _tone(659.3, 1.4, harmonics=(1.0, 0.6, 0.4, 0.25), attack=0.002, decay=1.4)


def make_alert():
    # Attention-grabbing triple beep (C6), brighter timbre for accessibility.
    beep = _tone(1046.5, 0.16, harmonics=(1.0, 0.5, 0.3), attack=0.004, decay=0.16)
    gap = _silence(0.09)
    return _concat(beep, gap, beep, gap, beep)


if __name__ == "__main__":
    _write("chime.wav", make_chime())
    _write("bell.wav", make_bell())
    _write("alert.wav", make_alert())
