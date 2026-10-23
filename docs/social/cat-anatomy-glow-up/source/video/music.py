"""Original soundtrack for the cat-evolution video, synthesised from scratch.

150 BPM future-funk with a Kyoto accent: four-on-the-floor kick, sidechained
saw bass, supersaw chord stabs on the J-pop royal-road progression, a
Karplus-Strong koto hook, suzu bells, taiko accents, a real tape-rewind made
from the intro, and the edit's SFX cues (whooshes, impacts, label ticks).

    python music.py [cues.json] [out.wav]
"""
import json
import sys
import wave
from functools import lru_cache

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

import timeline as T

SR = 48000
BEAT = 60.0 / T.BPM          # 0.4 s
STEP = BEAT / 4              # 16th note
BARS = BEAT * 4
DUR = T.TOTAL / T.FPS + 0.6
N = int(DUR * SR)
rng = np.random.default_rng(20261022)


def bar_t(bar, step=0.0):
    return bar * BARS + step * STEP


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def sos(kind, f, order=2):
    return butter(order, f, kind, fs=SR, output='sos')


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x * (peak / m)


# ---------------------------------------------------------------- buses
BUS_NAMES = ['kick', 'drums', 'bass', 'stabs', 'pad', 'koto', 'lead', 'bell', 'fx']
bus = {k: np.zeros((N, 2), np.float32) for k in BUS_NAMES}
send = np.zeros((N, 2), np.float32)       # reverb send


def place(name, sig, t, gain=1.0, pan=0.0, verb=0.0):
    i = int(round(t * SR))
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        st = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)
    else:
        st = sig
    bus[name][i:i + len(st)] += st * gain
    if verb:
        send[i:i + len(st)] += st * gain * verb


# ---------------------------------------------------------------- drums
@lru_cache(None)
def kick(muffled=False):
    t = tt(0.5)
    f = 46 + 120 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.24) * np.minimum(1, t / 0.0015)
    click = sosfilt(sos('highpass', 2500), rng.standard_normal(len(t))) * np.exp(-t / 0.003) * 0.35
    k = np.tanh(1.8 * (body + click))
    if muffled:
        k = sosfilt(sos('lowpass', 260), k) * 1.4
    return k.astype(np.float32)


@lru_cache(None)
def clap():
    t = tt(0.4)
    n = sosfilt(sos('bandpass', [850, 4200]), rng.standard_normal(len(t)))
    env = np.zeros_like(t)
    for k, t0 in enumerate([0, 0.010, 0.021]):
        env += (t >= t0) * np.exp(-np.maximum(t - t0, 0) / 0.0055) * (1 - 0.15 * k)
    env += (t >= 0.028) * np.exp(-np.maximum(t - 0.028, 0) / 0.13) * 0.55
    return norm(n * env, 0.9).astype(np.float32)


@lru_cache(None)
def snare(bright=1.0):
    t = tt(0.3)
    tone = np.sin(2 * np.pi * 186 * t) * np.exp(-t / 0.05) + 0.5 * np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.035)
    n = sosfilt(sos('bandpass', [1400, 9000]), rng.standard_normal(len(t))) * np.exp(-t / (0.11 * bright))
    return norm(tone * 0.6 + n, 0.9).astype(np.float32)


@lru_cache(None)
def hat(open_=False):
    t = tt(0.35 if open_ else 0.08)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in [317, 449, 541, 666, 789, 1013]) / 6
    n = rng.standard_normal(len(t)) * 0.7 + metal * 0.6
    n = sosfilt(sos('highpass', 7200, 4), n)
    env = np.exp(-t / (0.16 if open_ else 0.028)) * np.minimum(1, t / 0.0008)
    return norm(n * env, 0.8).astype(np.float32)


@lru_cache(None)
def shaker():
    t = tt(0.07)
    n = sosfilt(sos('bandpass', [5000, 12000]), rng.standard_normal(len(t)))
    env = np.minimum(1, t / 0.012) * np.exp(-t / 0.025)
    return norm(n * env, 0.6).astype(np.float32)


@lru_cache(None)
def taiko():
    t = tt(1.4)
    f = 52 + 46 * np.exp(-t / 0.045)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.42)
    skin = sosfilt(sos('lowpass', 900), rng.standard_normal(len(t))) * np.exp(-t / 0.05) * 0.7
    return norm(np.tanh(2.2 * (body + skin)), 0.95).astype(np.float32)


@lru_cache(None)
def crash(dur=2.2):
    t = tt(dur)
    n = sosfilt(sos('highpass', 3800), rng.standard_normal(len(t)))
    ring = sum(np.sin(2 * np.pi * f * t + p) for f, p in [(4170, 0.3), (5530, 1.1), (6890, 2.0), (8120, 0.7)]) * 0.08
    env = np.exp(-t / 0.75) * np.minimum(1, t / 0.002)
    return norm((n + ring) * env, 0.7).astype(np.float32)


@lru_cache(None)
def impact():
    t = tt(2.4)
    f = 38 + 70 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    thud = sosfilt(sos('lowpass', 500), rng.standard_normal(len(t))) * np.exp(-t / 0.09)
    hiss = sosfilt(sos('highpass', 2500), rng.standard_normal(len(t))) * np.exp(-t / 0.6) * 0.18
    return norm(np.tanh(1.6 * (boom + 0.6 * thud)) + hiss, 0.95).astype(np.float32)


def noise_sweep(dur, f0, f1, env, q=0.9, chunk=0.025):
    """Band-passed noise whose centre glides f0 -> f1 (log), shaped by env(t)."""
    t = tt(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(n)
    hop = int(chunk * SR)
    win = np.hanning(hop * 2)
    for s in range(0, len(n), hop):
        frac = s / max(1, len(n) - 1)
        fc = f0 * (f1 / f0) ** frac
        lo, hi = fc / (1 + q), min(fc * (1 + q), SR / 2 - 200)
        seg = n[max(0, s - hop): s + hop]
        y = sosfilt(sos('bandpass', [max(30, lo), hi]), seg)
        w = win[: len(y)] if len(y) == len(win) else np.hanning(len(y))
        a = max(0, s - hop)
        out[a: a + len(y)] += y * w
    return norm(out * env(t / dur), 1.0).astype(np.float32)


@lru_cache(None)
def whoosh(dur=0.5):
    return noise_sweep(dur, 300, 6000, lambda u: np.sin(np.pi * u) ** 1.6, q=0.7)


@lru_cache(None)
def swish_down(dur=0.45):
    return noise_sweep(dur, 7000, 400, lambda u: (1 - u) ** 1.5 * np.minimum(1, u * 12), q=0.8)


@lru_cache(None)
def riser(dur):
    t = tt(dur)
    n = noise_sweep(dur, 250, 9000, lambda u: u ** 2.2, q=0.6)
    f = 180 * (8 ** (t / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / dur) ** 2 * 0.25
    return norm(n + tone, 1.0).astype(np.float32)


@lru_cache(None)
def tick():
    t = tt(0.03)
    s = np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 5100 * t) * np.exp(-t / 0.002) * 0.5
    return norm(s, 0.8).astype(np.float32)


@lru_cache(None)
def pop():
    t = tt(0.08)
    f = 900 + 1400 * np.exp(-t / 0.01)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.02)
    return norm(s, 0.8).astype(np.float32)


@lru_cache(None)
def typekey(seed):
    r = np.random.default_rng(seed)
    t = tt(0.04)
    s = sosfilt(sos('bandpass', [1800, 6500]), r.standard_normal(len(t))) * np.exp(-t / 0.006)
    s += np.sin(2 * np.pi * (1200 + 300 * r.random()) * t) * np.exp(-t / 0.003) * 0.4
    return norm(s, 0.7).astype(np.float32)


@lru_cache(None)
def glitch():
    t = tt(0.22)
    sq = np.sign(np.sin(2 * np.pi * 110 * t * (1 + 6 * (t / 0.22))))
    bits = np.round(rng.standard_normal(len(t)) * 3) / 3
    gate = (np.sin(2 * np.pi * 38 * t) > 0)
    return norm((sq * 0.5 + bits * 0.4) * gate * np.exp(-t / 0.15), 0.6).astype(np.float32)


@lru_cache(None)
def shutter():
    t = tt(0.12)
    a = sosfilt(sos('bandpass', [1500, 7000]), rng.standard_normal(len(t)))
    env = np.exp(-t / 0.008) + (t > 0.05) * np.exp(-np.maximum(t - 0.05, 0) / 0.01) * 0.8
    return norm(a * env, 0.8).astype(np.float32)


# ---------------------------------------------------------------- tonal
def additive_saw(f, t, cutoff, detune_cents=0.0, phase=0.0, odd_only=False, max_h=None):
    ff = f * 2 ** (detune_cents / 1200)
    out = np.zeros_like(t)
    cmax = float(np.max(cutoff)) if np.ndim(cutoff) else float(cutoff)
    K = int(min(18000, cmax * 2.5) // ff)
    if max_h:
        K = min(K, max_h)
    for k in range(1, max(K, 1) + 1):
        if odd_only and k % 2 == 0:
            continue
        a = (1.0 / k) / (1 + (k * ff / cutoff) ** 4)
        out += a * np.sin(2 * np.pi * k * ff * t + phase * k)
    return out


@lru_cache(None)
def bass_note(m, dur):
    t = tt(dur + 0.04)
    f = mtof(m)
    cut = 260 + 1500 * np.exp(-t / 0.07)
    s = additive_saw(f, t, cut) * 0.9 + np.sin(2 * np.pi * f * t) * 0.7
    if m < 40:
        s += np.sin(2 * np.pi * f * t) * 0.5
    env = np.minimum(1, t / 0.003) * np.clip((dur + 0.04 - t) / 0.04, 0, 1)
    return np.tanh(1.3 * s * env).astype(np.float32)


@lru_cache(None)
def stab(chord, dur=0.16, bright=3600):
    t = tt(dur + 0.1)
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    cut = 700 + bright * np.exp(-t / 0.09)
    for m in VOICING[chord]:
        f = mtof(m)
        for d, pan in [(-11, -0.8), (0, 0.0), (11, 0.8)]:
            v = additive_saw(f, t, cut, d, phase=rng.random() * 6)
            a = (pan + 1) * np.pi / 4
            L += v * np.cos(a)
            R += v * np.sin(a)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.11) * np.clip((dur + 0.1 - t) / 0.06, 0, 1)
    st = np.stack([L * env, R * env], axis=1)
    return norm(st, 1.0).astype(np.float32)


@lru_cache(None)
def pad(chord, dur, bright=1800):
    t = tt(dur + 0.6)
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    lfo = 1 + 0.25 * np.sin(2 * np.pi * 0.4 * t)
    for m in VOICING[chord]:
        f = mtof(m)
        for i, d in enumerate([-14, -6, 0, 7, 15]):
            v = additive_saw(f, t, bright * lfo, d, phase=rng.random() * 6, max_h=24)
            pan = (i - 2) / 2.2
            a = (pan + 1) * np.pi / 4
            L += v * np.cos(a)
            R += v * np.sin(a)
    env = np.minimum(1, t / 0.35) * np.clip((dur + 0.6 - t) / 0.6, 0, 1)
    return norm(np.stack([L * env, R * env], axis=1), 1.0).astype(np.float32)


@lru_cache(None)
def koto(m, dur=1.3, bright=0.5):
    f = mtof(m)
    P = SR / f
    p = int(round(P))
    n = int(dur * SR * P / p) + p + 2
    y = np.zeros(n)
    exc = rng.standard_normal(p)
    # pluck near the bridge: bright, with a little tsume click
    exc = sosfilt(sos('lowpass', min(SR / 2 - 100, 2500 + 6000 * bright)), exc)
    y[:p] = exc
    decay = 0.9965 if m < 70 else 0.9945
    for s in range(p, n - 1, p):
        e = min(n, s + p)
        prev = y[s - p: e - p]
        prev1 = y[s - p - 1: e - p - 1] if s - p - 1 >= 0 else np.concatenate([[0.0], y[s - p: e - p - 1]])
        y[s:e] = decay * (0.5 + 0.5 * bright * 0.6) * prev + decay * (0.5 - 0.5 * bright * 0.6) * prev1
    # correct the integer delay's tuning error
    idx = np.arange(int(dur * SR)) * (p / P)
    y = np.interp(idx, np.arange(n), y)
    t = np.arange(len(y)) / SR
    body = sosfilt(sos('bandpass', [300, 3800]), y)
    click = np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.006) * 0.25
    out = (y * 0.55 + body * 0.6 + click) * np.clip((dur - t) / 0.08, 0, 1)
    return norm(out, 1.0).astype(np.float32)


@lru_cache(None)
def lead(m, dur):
    t = tt(dur + 0.12)
    f = mtof(m)
    vib = 1 + 0.012 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.14) / 0.2, 0, 1)
    ph = np.cumsum(f * vib) / SR
    cut = 2200 + 2600 * np.exp(-t / 0.15)
    s = np.zeros_like(t)
    K = int(9000 // f)
    for k in range(1, K + 1):
        a = (1.0 / k) / (1 + (k * f / cut) ** 4) * (1.0 if k % 2 else 0.55)
        s += a * np.sin(2 * np.pi * k * ph)
    env = np.minimum(1, t / 0.006) * (0.65 + 0.35 * np.exp(-t / 0.12)) * np.clip((dur + 0.12 - t) / 0.12, 0, 1)
    return norm(np.tanh(1.4 * s) * env, 1.0).astype(np.float32)


@lru_cache(None)
def bell(f0=1318.5, dur=3.0, bowl=False):
    t = tt(dur)
    if bowl:
        parts = [(1, 1, 4.5), (2.71, 0.5, 3.0), (5.15, 0.3, 2.0), (8.3, 0.15, 1.2)]
    else:
        parts = [(1, 1, 1.4), (2.0, 0.35, 0.9), (2.76, 0.55, 0.7), (4.07, 0.25, 0.45), (5.4, 0.3, 0.3), (6.8, 0.12, 0.2)]
    s = np.zeros_like(t)
    for r, a, d in parts:
        for beat in (0.0, 0.7):
            s += a * np.sin(2 * np.pi * (f0 * r + beat) * t + rng.random() * 6) * np.exp(-t / d) * 0.5
    s *= np.minimum(1, t / 0.0015)
    return norm(s, 1.0).astype(np.float32)


VOICING = {
    'G': (55, 59, 62, 66),       # Gmaj7
    'A': (57, 61, 64, 67),       # A7
    'F#m': (54, 57, 61, 64),     # F#m7
    'Bm': (57, 59, 62, 66),      # Bm7 (A in the bass voice of the stab)
    'D': (50, 57, 61, 64, 66),   # Dmaj9
    'Em': (55, 59, 62, 64),
}
ROOT = {'G': 31, 'A': 33, 'F#m': 30, 'Bm': 35, 'D': 26, 'Em': 28}

HOOK = {
    'G': [(0, 71, 2), (2, 74, 1), (3, 76, 3), (6, 74, 2), (8, 71, 2), (10, 69, 1), (11, 71, 3), (14, 74, 2)],
    'A': [(0, 76, 3), (3, 74, 1), (4, 76, 2), (6, 81, 4), (10, 78, 2), (12, 76, 2), (14, 73, 2)],
    'F#m': [(0, 78, 2), (2, 76, 1), (3, 78, 3), (6, 81, 2), (8, 78, 2), (10, 76, 1), (11, 73, 3), (14, 69, 2)],
    'Bm': [(0, 71, 3), (3, 74, 1), (4, 71, 2), (6, 69, 2), (8, 66, 4), (12, 69, 2), (14, 71, 2)],
}
LEAD = {
    'G': [(0, 83, 3), (3, 81, 1), (4, 83, 2), (6, 86, 2), (8, 83, 2), (10, 81, 2), (12, 79, 2), (14, 78, 2)],
    'A': [(0, 76, 2), (2, 78, 2), (4, 81, 4), (8, 85, 2), (10, 83, 2), (12, 81, 4)],
    'F#m': [(0, 81, 3), (3, 78, 1), (4, 81, 2), (6, 85, 2), (8, 83, 2), (10, 81, 2), (12, 78, 4)],
    'Bm': [(0, 74, 2), (2, 76, 2), (4, 78, 4), (8, 81, 3), (11, 83, 1), (12, 86, 4)],
}
CLIMAX = {
    26: [(0, 86, 6), (6, 83, 2), (8, 88, 8)],
    27: [(0, 85, 6), (6, 83, 2), (8, 88, 4), (12, 90, 4)],
    28: [(0, 86, 8), (8, 85, 8)],
    29: [(0, 86, 16)],
}
ARP = {
    'G': [55, 59, 62, 66, 67, 66, 62, 59],
    'A': [57, 61, 64, 67, 69, 67, 64, 61],
    'F#m': [54, 57, 61, 64, 66, 64, 61, 57],
    'Bm': [59, 62, 66, 69, 71, 69, 66, 62],
    'D': [62, 66, 69, 73, 74, 73, 69, 66],
}


def chords_in(bar):
    c = T.CHORDS.get(bar)
    if c == 'GA':
        return [('G', 0, 8), ('A', 8, 8)]
    return [(c, 0, 16)] if c else []


def in_form(bar, name):
    a, b = T.FORM[name]
    return a <= bar < b


kick_times = []


def kick_at(t, muffled=False, gain=1.0):
    place('kick', kick(muffled), t, gain)
    if not muffled:
        kick_times.append(t)


# ---------------------------------------------------------------- arrangement
def arrange():
    # Intro: title slam, bell, muffled pulse, filtered pad + koto arp
    place('fx', impact(), 0.0, 0.8, verb=0.25)
    place('bell', bell(), 0.0, 0.42, 0.25, verb=0.5)
    place('bell', bell(1975.5, 2.0), bar_t(1, 0), 0.25, -0.3, verb=0.5)
    for bar in range(0, 2):
        c = T.CHORDS[bar]
        place('pad', sosfilt(sos('lowpass', 900), pad(c, BARS), axis=0).astype(np.float32), bar_t(bar), 0.45, verb=0.3)
        for b in range(4):
            kick_at(bar_t(bar, b * 4), muffled=True, gain=0.8)
            place('drums', hat(False), bar_t(bar, b * 4 + 2), 0.12 + 0.05 * bar, 0.3)
        for s in range(8):
            m = ARP[c][s % 8] + 12
            place('koto', koto(m, 0.9, 0.3), bar_t(bar, s * 2), 0.18 + 0.04 * bar, -0.4 + 0.1 * (s % 3), verb=0.35)
    for s in range(8, 16):
        place('drums', snare(), bar_t(1, s), 0.08 + 0.03 * (s - 8), 0.0, verb=0.15)

    # Rewind bar: riser into the drop (the reversed intro is added after mixing)
    place('fx', riser(BARS), bar_t(2), 0.5, verb=0.2)
    rc = crash(1.4)[::-1].copy()
    place('fx', rc, bar_t(3) - len(rc) / SR, 0.35)

    for bar in range(3, 30):
        drop = in_form(bar, 'drop1') or in_form(bar, 'drop2')
        brk = in_form(bar, 'break')
        endbar = bar == 29
        chords = chords_in(bar)
        d2 = in_form(bar, 'drop2')

        # crashes on phrase starts
        if bar in (3, 7, 11, 14, 18, 22, 26):
            place('drums', crash(), bar_t(bar), 0.32, 0.2, verb=0.2)
        if bar in (3, 14):
            place('fx', impact(), bar_t(bar), 0.55, verb=0.3)

        if drop:
            for b in range(4):
                kick_at(bar_t(bar, b * 4))
                if b in (1, 3):
                    place('drums', clap(), bar_t(bar, b * 4), 0.5, 0.05, verb=0.25)
                place('drums', hat(True), bar_t(bar, b * 4 + 2), 0.16, 0.25)
            for s in range(16):
                acc = 0.13 if s % 4 == 2 else (0.09 if s % 2 == 0 else 0.06)
                place('drums', hat(False), bar_t(bar, s), acc, -0.3)
                if d2:
                    place('drums', shaker(), bar_t(bar, s), 0.05 + (0.03 if s % 2 else 0), 0.45)
            # fills into the next phrase
            if bar in (6, 10, 17, 21, 25):
                for s in (12, 13, 14, 15):
                    place('drums', snare(), bar_t(bar, s), 0.22 + 0.06 * (s - 12), 0.0, verb=0.2)
            if bar == 12:
                for s in range(8, 16):
                    place('drums', snare(), bar_t(bar, s), 0.15 + 0.03 * (s - 8), 0, verb=0.2)

            # bass: 8ths, octave bounce, pickup on the last 8th
            for c, s0, ln in chords:
                r = ROOT[c]
                for e in range(ln // 2):
                    m = r + (12 if e % 2 else 0)
                    if s0 + e * 2 == 14 and c in ('Bm', 'A'):
                        m = r + 10
                    place('bass', bass_note(m, STEP * 1.7), bar_t(bar, s0 + e * 2), 0.5)
                # offbeat supersaw stabs
                for s in (2, 6, 10, 14):
                    if s0 <= s < s0 + ln:
                        place('stabs', stab(c), bar_t(bar, s), 0.3, verb=0.18)
                if d2:
                    place('pad', pad(c, STEP * ln), bar_t(bar, s0), 0.16, verb=0.3)
                    # koto 16th arpeggio (quiet, wide)
                    for s in range(s0, s0 + ln):
                        m = ARP[c][s % 8] + 12
                        place('koto', koto(m, 0.5, 0.6), bar_t(bar, s), 0.09, 0.55 if s % 2 else -0.55, verb=0.2)

            # melody
            c0 = T.CHORDS[bar]
            if in_form(bar, 'drop1') and c0 in HOOK:
                up = 12 if bar in (9, 10) else 0
                for s, m, ln in HOOK[c0]:
                    place('koto', koto(m + up, 1.1, 0.55), bar_t(bar, s), 0.42, -0.1, verb=0.3)
            if d2:
                notes = CLIMAX.get(bar) or LEAD.get(c0)
                if notes:
                    for s, m, ln in notes:
                        place('lead', lead(m, STEP * ln * 0.95), bar_t(bar, s), 0.24, 0.1, verb=0.35)
                        place('koto', koto(m - 12, 1.0, 0.6), bar_t(bar, s), 0.22, -0.2, verb=0.25)
            # taiko on the rebuild's chapter downbeats
            if bar in (14, 15, 17, 18, 19, 22, 25, 27):
                place('drums', taiko(), bar_t(bar), 0.5, 0.0, verb=0.35)

        if brk:
            # teardown: no kick, swelling pad, accelerating snare roll, riser
            place('pad', pad('G', BARS * 0.75, 2600), bar_t(bar), 0.75, verb=0.4)
            place('stabs', stab('A', 0.3), bar_t(bar, 12), 0.35, verb=0.3)
            for s in range(0, 8, 2):
                place('drums', snare(), bar_t(bar, s), 0.18 + 0.02 * s, 0, verb=0.2)
            for s in range(8, 12):
                place('drums', snare(), bar_t(bar, s), 0.3 + 0.03 * (s - 8), 0, verb=0.2)
            for k in range(8):
                place('drums', snare(0.6), bar_t(bar, 12 + k * 0.5), 0.36 + 0.03 * k, 0, verb=0.2)
            place('fx', riser(BARS * 0.95), bar_t(bar), 0.6, verb=0.25)
            place('fx', glitch(), bar_t(bar, 13), 0.3)

        if endbar:
            # resolve to D: big hit, sustained chord, rin bowl, koto run
            place('fx', impact(), bar_t(bar), 0.7, verb=0.4)
            place('drums', crash(3.0), bar_t(bar), 0.4, 0.0, verb=0.3)
            place('drums', taiko(), bar_t(bar), 0.6, 0.0, verb=0.4)
            kick_at(bar_t(bar))
            place('bass', bass_note(26, 1.8), bar_t(bar), 0.5)
            place('stabs', stab('D', 0.9, 4200), bar_t(bar), 0.45, verb=0.5)
            place('pad', pad('D', 2.6, 2200), bar_t(bar), 0.4, verb=0.5)
            place('bell', bell(659.3, 5.0, bowl=True), bar_t(bar), 0.45, 0.0, verb=0.6)
            place('bell', bell(), bar_t(bar, 4), 0.3, 0.35, verb=0.6)
            for k, m in enumerate([74, 76, 78, 81, 83, 86]):
                place('koto', koto(m, 1.6, 0.6), bar_t(bar, 2 + k * 0.5), 0.3, -0.3 + 0.12 * k, verb=0.45)


def apply_cues(path):
    try:
        cues = json.load(open(path))
    except FileNotFoundError:
        print('no cues file; skipping SFX')
        return
    for c in cues:
        t = c['f'] / T.FPS
        g = c.get('gain', 1.0)
        kind = c['type']
        if kind == 'whoosh':
            w = whoosh(0.42)
            place('fx', w, t - 0.3, 0.32 * g, c.get('pan', 0), verb=0.15)
        elif kind == 'swish':
            place('fx', swish_down(), t, 0.22 * g, c.get('pan', 0), verb=0.1)
        elif kind == 'impact':
            place('fx', impact(), t, 0.35 * g, verb=0.25)
        elif kind == 'tick':
            place('fx', tick(), t, 0.16 * g, c.get('pan', 0))
        elif kind == 'pop':
            place('fx', pop(), t, 0.16 * g, c.get('pan', 0))
        elif kind == 'type':
            place('fx', typekey(int(c['f'] * 7 + int(c.get('i', 0)))), t, 0.12 * g, 0.1)
        elif kind == 'glitch':
            place('fx', glitch(), t, 0.22 * g)
        elif kind == 'shutter':
            place('fx', shutter(), t, 0.3 * g)
        elif kind == 'ding':
            place('bell', bell(1975.5, 1.6), t, 0.18 * g, c.get('pan', 0), verb=0.5)


def pump_envelope():
    t = np.arange(N) / SR
    env = np.ones(N, np.float32)
    for k in kick_times:
        i = int(k * SR)
        j = min(N, i + int(0.32 * SR))
        u = t[i:j] - k
        env[i:j] = np.minimum(env[i:j], 1 - 0.62 * np.exp(-u / 0.11) * np.minimum(1, u / 0.004 + 0.4))
    return env


def reverb_ir(dur=1.9):
    t = tt(dur)
    ir = np.stack([rng.standard_normal(len(t)), rng.standard_normal(len(t))], axis=1)
    ir *= np.exp(-t / 0.42)[:, None]
    ir = sosfilt(sos('lowpass', 6500), ir, axis=0)
    pre = int(0.022 * SR)
    ir = np.concatenate([np.zeros((pre, 2)), ir])
    return (ir / np.sqrt(np.sum(ir ** 2, axis=0))).astype(np.float32)


def mixdown():
    pump = pump_envelope()[:, None]
    gains = {'kick': 0.62, 'drums': 0.95, 'bass': 0.46, 'stabs': 0.85, 'pad': 0.55, 'koto': 1.15,
             'lead': 0.9, 'bell': 0.8, 'fx': 0.85}
    ducked = {'bass': 1.0, 'stabs': 1.0, 'pad': 0.8, 'koto': 0.35, 'lead': 0.3}
    mix = np.zeros((N, 2), np.float32)
    for k, g in gains.items():
        x = bus[k] * g
        if k in ducked:
            x = x * (1 - ducked[k] * (1 - pump))
        mix += x
    ir = reverb_ir()
    wet = np.stack([fftconvolve(send[:, ch], ir[:, ch])[:N] for ch in range(2)], axis=1)
    mix += wet.astype(np.float32) * 0.55
    # ping-pong echo on the koto bus
    d = int(STEP * 3 * SR)
    echo = np.zeros_like(mix)
    src = bus['koto'] * 0.8
    for k in range(1, 4):
        sh = d * k
        ch = k % 2
        echo[sh:, ch] += src[:-sh, 1 - ch] * (0.32 ** k)
    mix += echo
    return mix


def add_rewind(mix):
    """Bar 2: the intro played backwards at ~2.6x, wobbling, into the drop."""
    a, b = int(bar_t(0) * SR), int(bar_t(2) * SR)
    seg = mix[a:b][::-1]
    out_len = int(BARS * 0.82 * SR)
    # accelerating playback (rate rises 1.6x -> 4x through the bar)
    u = np.linspace(0, 1, out_len)
    rate = 1.6 + 2.4 * u ** 1.5
    pos = np.cumsum(rate)
    pos = pos / pos[-1] * (len(seg) - 1)
    wob = 1 + 0.004 * np.sin(2 * np.pi * 7 * u * BARS)
    pos = np.clip(pos * wob, 0, len(seg) - 1)
    rw = np.stack([np.interp(pos, np.arange(len(seg)), seg[:, ch]) for ch in range(2)], axis=1)
    rw = sosfilt(sos('bandpass', [180, 7000]), rw, axis=0)
    env = np.minimum(1, u / 0.05) * np.clip((1 - u) / 0.08, 0, 1)
    rw *= env[:, None] * 1.25
    i = int(bar_t(2) * SR)
    # duck everything else in the rewind bar except the riser
    mix[i:i + out_len] = mix[i:i + out_len] * 0.8 + rw
    # tape-stop thump right before the drop
    t = tt(0.18)
    stop = np.sin(2 * np.pi * np.cumsum(220 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.08) * 0.3
    j = int((bar_t(3) - 0.2) * SR)
    mix[j:j + len(stop)] += stop[:, None]
    return mix


def master(mix):
    # gentle glue: soft clip, then normalise and fade the very end
    # presence lift for phone speakers, then soft clip
    mix = mix + 0.45 * sosfilt(sos('highpass', 1800), mix, axis=0)
    mix = mix - 0.25 * sosfilt(sos('lowpass', 70), mix, axis=0)
    mix = np.tanh(mix * 1.25) / np.tanh(1.25)
    mix = sosfilt(sos('highpass', 28), mix, axis=0)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.93
    fade_from = T.TOTAL / T.FPS - 1.0
    t = np.arange(N) / SR
    mix *= np.clip(1 - (t - fade_from) / 1.0, 0, 1)[:, None] ** 1.5
    return mix


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    cues = sys.argv[1] if len(sys.argv) > 1 else 'cues.json'
    out = sys.argv[2] if len(sys.argv) > 2 else 'music.wav'
    arrange()
    apply_cues(cues)
    mix = mixdown()
    mix = add_rewind(mix)
    mix = master(mix)
    write_wav(out, mix)
    print(f'wrote {out}: {N / SR:.2f} s, {len(kick_times)} kicks')
