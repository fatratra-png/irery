#!/usr/bin/env python3
"""
Pre-computes, for every sound, what the visuals need to follow the audio:

- an amplitude envelope (20 values per second, 0-255), and
- onsets: moments where the sound suddenly gets louder (a thunder clap, a
  drop, a bowl strike, a wave breaking).

The app reads these at the current playback position, so scenes react to the
real sound without a microphone permission, a backend or any network.

Usage:  python3 scripts/analyze-sounds.py      (needs numpy + ffmpeg)
Output: src/audio/envelopes.json
"""
import base64
import json
import os
import subprocess

import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..')
SOUNDS = os.path.join(ROOT, 'assets', 'sounds')
OUT = os.path.join(ROOT, 'src', 'audio', 'envelopes.json')
SR = 8000
RATE = 20  # envelope values per second
HOP = SR // RATE


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768


def analyze(x):
    n = len(x) // HOP
    frames = x[: n * HOP].reshape(n, HOP)
    rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    # Map each sound's own dynamic range to 0..1 (quiet floor → loud peaks).
    lo, hi = np.percentile(db, 5), np.percentile(db, 99.5)
    env = np.clip((db - lo) / max(hi - lo, 3), 0, 1)
    # Light smoothing (attack fast, release slow), like a VU meter.
    smooth = np.empty_like(env)
    acc = env[0]
    for i, v in enumerate(env):
        acc = v if v > acc else acc * 0.85 + v * 0.15
        smooth[i] = acc

    # Onsets: the level jumps well above its recent average.
    onsets = []
    win = RATE  # 1 s of context
    last = -10.0
    for i in range(1, n):
        recent = db[max(0, i - win):i].mean()
        jump = db[i] - recent
        t = i / RATE
        # 8 dB: real attacks (strikes, claps, drops), not the slow beating of a ringing bowl.
        if jump > 8 and db[i] > lo + (hi - lo) * 0.45 and t - last > 0.6:
            onsets.append(round(t, 2))
            last = t
    return smooth, onsets, n / RATE


def main():
    result = {}
    for name in sorted(os.listdir(SOUNDS)):
        if not name.endswith('.mp3'):
            continue
        sid = name[:-4]
        env, onsets, duration = analyze(decode(os.path.join(SOUNDS, name)))
        result[sid] = {
            'duration': round(duration, 2),
            'rate': RATE,
            'env': base64.b64encode((env * 255).round().astype(np.uint8).tobytes()).decode(),
            'onsets': onsets,
        }
        print(f'{sid:14s} {duration:6.1f}s  onsets={len(onsets):3d}  mean={env.mean():.2f}')
    with open(OUT, 'w') as f:
        json.dump(result, f, separators=(',', ':'))
    print('wrote', os.path.relpath(OUT, ROOT), os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
