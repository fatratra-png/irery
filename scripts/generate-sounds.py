#!/usr/bin/env python3
"""
Generates Irery's synthesized ambiences and normalizes every sound's loudness.

Everything is computed locally from maths (no samples, no downloads, no
licences to worry about). Each ambience is a seamless loop: the tail of the
signal is cross-faded into its head, so playback never clicks when it wraps.

Usage:  python3 scripts/generate-sounds.py          # needs numpy + ffmpeg
Output: assets/sounds/<id>.mp3  (all sounds at the same perceived loudness)
"""
import json
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
LOOP = 60.0          # seconds per loop
XFADE = 4.0          # seconds of loop cross-fade
TARGET_LUFS = -23.0  # same perceived loudness for every sound
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'sounds')
rng = np.random.default_rng(7)

N = int((LOOP + XFADE) * SR)
t = np.arange(N) / SR


# ---------------------------------------------------------------- helpers

def spectral_filter(x, low=None, high=None, tilt=0.0):
    """Zero-phase FFT filter: band limits plus an optional dB/octave tilt."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.ones_like(f)
    if low:
        gain *= 1 / np.sqrt(1 + (low / np.maximum(f, 1e-3)) ** 4)
    if high:
        gain *= 1 / np.sqrt(1 + (f / high) ** 4)
    if tilt:
        gain *= (np.maximum(f, 20) / 1000) ** (tilt / 6.02)
    return np.fft.irfft(spec * gain, len(x))


def unit(x):
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-12)


def noise(color='white', n=N):
    """Coloured noise at unit RMS, so mix coefficients mean what they say."""
    w = rng.standard_normal(n)
    if color == 'white':
        return w
    if color == 'pink':
        return unit(spectral_filter(w, low=20, tilt=-3.01))
    if color == 'brown':
        return unit(spectral_filter(w, low=20, tilt=-6.02))
    raise ValueError(color)


def lfo(rate, depth=1.0, phase=0.0):
    return 1 - depth * (0.5 - 0.5 * np.cos(2 * np.pi * rate * t + phase))


def smooth_random(rate, n=N):
    """Slowly wandering control signal in [0, 1]."""
    pts = max(4, int(n / SR * rate) + 2)
    knots = rng.random(pts)
    xs = np.linspace(0, n, pts)
    return np.interp(np.arange(n), xs, knots)


def bell(freq, dur, partials, decay):
    """Inharmonic bell/bowl strike: partials with individual decays and slight beating."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, dk in partials:
        f = freq * ratio
        beat = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * tt)  # gentle shimmer
        out += amp * np.sin(2 * np.pi * f * tt * beat) * np.exp(-tt * decay * dk)
    attack = np.minimum(1, tt / 0.004)
    return out * attack


def place(track, sig, start):
    i = int(start * SR)
    j = min(len(track), i + len(sig))
    if i < len(track):
        track[i:j] += sig[: j - i]


def stereo(left, right=None):
    return np.stack([left, left if right is None else right], axis=1)


def loopify(x):
    """Seamless loop: equal-power cross-fade of the overshoot into the start."""
    L, X = int(LOOP * SR), int(XFADE * SR)
    out = x[:L].copy()
    ramp = np.linspace(0, np.pi / 2, X)[:, None]
    out[:X] = x[:X] * np.sin(ramp) + x[L:L + X] * np.cos(ramp)
    return out


def write_wav(path, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    pcm = (x * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------------------------------------------------------------- ambiences

def brown_noise():
    l, r = noise('brown'), noise('brown')
    return stereo(spectral_filter(l, high=900), spectral_filter(r, high=900))


def pink_noise():
    l, r = noise('pink'), noise('pink')
    return stereo(spectral_filter(l, high=9000), spectral_filter(r, high=9000))


def singing_bowl():
    partials = [(1.0, 1.0, 1.0), (2.76, 0.5, 1.6), (5.40, 0.25, 2.4), (8.93, 0.12, 3.5), (1.003, 0.6, 1.1)]
    l, r = np.zeros(N), np.zeros(N)
    pos = 0.5
    notes = [196.0, 220.0, 174.6, 196.0, 261.6]  # G3 A3 F3 G3 C4, a slow calm cycle
    k = 0
    while pos < LOOP + XFADE:
        s = bell(notes[k % len(notes)], 16, partials, decay=0.28) * rng.uniform(0.7, 1.0)
        pan = rng.uniform(0.35, 0.65)
        place(l, s * (1 - pan), pos)
        place(r, s * pan, pos + 0.012)
        pos += rng.uniform(7.5, 10.5)
        k += 1
    bed = unit(spectral_filter(noise('pink'), low=80, high=600)) * 0.01
    return stereo(l + bed, r + bed)


def wind_chimes():
    scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]  # C major pentatonic, bright octave
    partials = [(1.0, 1.0, 1.0), (2.76, 0.35, 2.2), (5.40, 0.15, 3.5)]
    l, r = np.zeros(N), np.zeros(N)
    gust = smooth_random(0.15)
    pos = 0.0
    while pos < LOOP + XFADE:
        g = gust[min(N - 1, int(pos * SR))]
        s = bell(rng.choice(scale), 5, partials, decay=0.9) * rng.uniform(0.25, 0.7)
        pan = rng.uniform(0.2, 0.8)
        place(l, s * (1 - pan), pos)
        place(r, s * pan, pos)
        pos += rng.exponential(1.4 - g)  # more chimes when the breeze picks up
    breeze = unit(spectral_filter(noise('pink'), low=200, high=1800)) * (0.015 + 0.03 * gust)
    breeze_r = unit(spectral_filter(noise('pink'), low=200, high=1800)) * (0.015 + 0.03 * gust)
    return stereo(l + breeze, r + breeze_r)


def night_crickets():
    l, r = np.zeros(N), np.zeros(N)
    for c in range(6):
        carrier = rng.uniform(3800, 5200)
        period = rng.uniform(0.55, 0.9)
        pan = rng.uniform(0.1, 0.9)
        vol = rng.uniform(0.15, 0.45) * (0.6 if c > 2 else 1)
        chirp_t = np.arange(int(0.12 * SR)) / SR
        # a chirp = 3 quick pulses
        env = sum(np.exp(-((chirp_t - p) / 0.008) ** 2) for p in (0.015, 0.05, 0.085))
        chirp = np.sin(2 * np.pi * carrier * chirp_t) * env * vol
        pos = rng.uniform(0, period)
        active = smooth_random(0.08)
        while pos < LOOP + XFADE:
            if active[min(N - 1, int(pos * SR))] > 0.3:  # crickets pause now and then
                place(l, chirp * (1 - pan), pos)
                place(r, chirp * pan, pos)
            pos += period * rng.uniform(0.97, 1.03)
    # A faint night bed only: after loudness normalization a louder bed would bury the chirps.
    night = unit(spectral_filter(noise('brown'), high=400)) * 0.02
    night_r = unit(spectral_filter(noise('brown'), high=400)) * 0.02
    return stereo(l + night, r + night_r)


def deep_space():
    chord = [55.0, 82.41, 110.0, 164.81, 220.0]  # A1 E2 A2 E3 A3
    l, r = np.zeros(N), np.zeros(N)
    for i, f in enumerate(chord):
        amp = 1 / (1 + i * 0.6)
        mod = 0.55 + 0.45 * smooth_random(0.05 + 0.02 * i)
        l += amp * mod * np.sin(2 * np.pi * f * 0.998 * t + rng.uniform(0, 6))
        r += amp * mod * np.sin(2 * np.pi * f * 1.002 * t + rng.uniform(0, 6))
    wash = unit(spectral_filter(noise('pink'), low=100, high=2500)) * (0.04 + 0.04 * smooth_random(0.04))
    return stereo(l + wash, r + wash)


def theta_focus():
    base, beat = 200.0, 6.0  # 6 Hz difference: theta range, best with headphones
    swell = 0.85 + 0.15 * lfo(0.03)
    l = np.sin(2 * np.pi * base * t) * swell
    r = np.sin(2 * np.pi * (base + beat) * t) * swell
    bed = unit(spectral_filter(noise('pink'), low=60, high=1200)) * 0.08
    return stereo(l + bed, r + bed)


NEW_SOUNDS = {
    'brown-noise': brown_noise,
    'pink-noise': pink_noise,
    'singing-bowl': singing_bowl,
    'wind-chimes': wind_chimes,
    'crickets': night_crickets,
    'deep-space': deep_space,
    'theta-focus': theta_focus,
}

# Existing recordings, renamed to the new layout (source → id).
EXISTING = {
    'sound-rain.mp3': 'rain', 'sound-thunder.mp3': 'thunder', 'sound-ocean.mp3': 'ocean',
    'sound-waves.mp3': 'waves', 'sound-stream.mp3': 'stream', 'sound-water.mp3': 'water',
    'sound-forest.mp3': 'forest', 'sound-campfire.mp3': 'campfire', 'sound-wind.mp3': 'wind',
    'sound-lofi.mp3': 'lofi', 'sound-keyboard.mp3': 'keyboard', 'sound-noise.mp3': 'white-noise',
}


def measure(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    line = [l for l in out.splitlines() if l.strip().startswith('I:')][-1]
    return float(line.split()[1])


def normalize(src, dst):
    """Two-pass EBU R128 loudness normalization, then MP3 encode.
    Very peaky recordings (e.g. fire crackle) cannot reach the target linearly
    without clipping; those get a second, dynamic pass."""
    _normalize(src, dst, linear=True)
    if abs(measure(dst) - TARGET_LUFS) > 1.0:
        _normalize(src, dst, linear=False, pre='acompressor=threshold=0.08:ratio=6:attack=2:release=80,')


def _normalize(src, dst, linear, pre=''):
    probe = subprocess.run(
        ['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', f'{pre}loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True,
    ).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    flt = (f"{pre}loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
           f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear={'true' if linear else 'false'}")
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', flt, '-ar', '44100',
                    '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '160k', dst], check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for sid, fn in NEW_SOUNDS.items():
            wav = os.path.join(tmp, f'{sid}.wav')
            write_wav(wav, loopify(fn()))
            normalize(wav, os.path.join(OUT, f'{sid}.mp3'))
            print('generated', sid)
        for src, sid in EXISTING.items():
            path = os.path.join(ROOT, 'assets', src)
            if os.path.exists(path):
                normalize(path, os.path.join(OUT, f'{sid}.mp3'))
                print('normalized', sid)


if __name__ == '__main__':
    main()
