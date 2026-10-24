#!/usr/bin/env python3
"""
Original procedural soundtrack generator for the Michi-Neko Tree & Cat Devlog.
Synthesizes a 94.2-second stereo 44.1 kHz WAV track featuring:
  - Koto & kalimba pentatonic arpeggios (D Hirajoshi / Yo modal progression)
  - Warm stereo harmonic pad + sub-bass foundation
  - Breathy shakuhachi flute phrases on act transitions
  - Gentle foliage breeze texture during the Tree wind showcase (30.8s–49.0s)
  - Soft rhythmic paw-step pulse during the Cat gait showcase (81.2s–86.2s)
  - Subtle crystalline UI transition chimes synchronized to all 21 scene cuts
"""

import os
import wave
import numpy as np
from timeline import get_total_duration, get_scene_ranges

SR = 44100


def midi_to_freq(m):
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def add_stereo(mix, start_sec, left_sig, right_sig=None):
    if right_sig is None:
        right_sig = left_sig
    i0 = int(round(start_sec * SR))
    if i0 >= mix.shape[0]:
        return
    n = min(len(left_sig), mix.shape[0] - i0)
    if n <= 0:
        return
    mix[i0 : i0 + n, 0] += left_sig[:n]
    mix[i0 : i0 + n, 1] += right_sig[:n]


def synth_koto_pluck(freq, dur=1.8, amp=0.14, pan=0.0, bright=1.0):
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Slight pitch bend attack characteristic of koto bridge pressure
    f_env = freq * (1.0 + 0.008 * np.exp(-t * 38.0))
    phase = 2.0 * np.pi * np.cumsum(f_env) / SR

    sig = np.zeros(n, dtype=np.float64)
    harmonics = [
        (1.0, 1.0, 3.2),
        (2.0, 0.48 * bright, 5.0),
        (3.0, 0.26 * bright, 7.5),
        (4.0, 0.12 * bright, 11.0),
        (5.0, 0.06 * bright, 15.0),
    ]
    for mult, h_amp, decay in harmonics:
        sig += h_amp * np.sin(mult * phase) * np.exp(-t * decay)

    # Short silk pluck transient
    attack = np.minimum(1.0, t / 0.004)
    click = np.sin(2.0 * np.pi * (freq * 6.5) * t) * np.exp(-t * 95.0) * 0.18
    sig = (sig * attack + click) * amp

    pan_l = np.cos((pan + 1.0) * np.pi * 0.25)
    pan_r = np.sin((pan + 1.0) * np.pi * 0.25)
    return sig * pan_l, sig * pan_r


def synth_shakuhachi_note(freq, dur=2.6, amp=0.075):
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float64) / SR
    env = np.sin(np.pi * (t / dur)) ** 1.35
    vib = 1.0 + 0.0045 * np.sin(2.0 * np.pi * 5.2 * t) * np.clip((t - 0.3) / 0.8, 0.0, 1.0)
    phase = 2.0 * np.pi * np.cumsum(freq * vib) / SR
    tone = (
        np.sin(phase)
        + 0.32 * np.sin(2.0 * phase + 0.4)
        + 0.11 * np.sin(3.0 * phase + 1.1)
    )
    # Soft breath chiff
    rng = np.random.default_rng(int(freq * 100) + n)
    noise = rng.standard_normal(n)
    # Simple moving-average bandpass approximation
    k = 18
    smooth = np.convolve(noise, np.ones(k) / k, mode="same")
    breath = smooth * np.exp(-t * 3.5) * 0.28
    sig = (tone + breath) * env * amp
    # Stereo decorrelation via tiny delay on right channel
    d = int(0.011 * SR)
    r = np.zeros_like(sig)
    r[d:] = sig[:-d]
    return sig * 0.92, r * 0.92


def synth_ui_chime(freq=1174.66, amp=0.055):
    dur = 0.42
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float64) / SR
    sig = (
        np.sin(2.0 * np.pi * freq * t) * np.exp(-t * 14.0)
        + 0.45 * np.sin(2.0 * np.pi * (freq * 1.5) * t) * np.exp(-t * 22.0)
        + 0.25 * np.sin(2.0 * np.pi * (freq * 2.0) * t) * np.exp(-t * 32.0)
    )
    attack = np.minimum(1.0, t / 0.002)
    sig = sig * attack * amp
    return sig * 0.85, sig * 0.95


def synth_paw_step(pitch=190.0, amp=0.06):
    dur = 0.09
    n = int(SR * dur)
    t = np.arange(n, dtype=np.float64) / SR
    f = pitch * np.exp(-t * 28.0)
    phase = 2.0 * np.pi * np.cumsum(f) / SR
    thump = np.sin(phase) * np.exp(-t * 42.0) * amp
    return thump, thump


def build_soundtrack(out_wav_path):
    total_dur = get_total_duration()
    total_samples = int(np.ceil((total_dur + 0.5) * SR))
    mix = np.zeros((total_samples, 2), dtype=np.float64)

    # 1. Warm continuous stereo harmonic pad (Dmaj9 / Bm11 / Gmaj9 / Asus4 cycle)
    t_full = np.arange(total_samples, dtype=np.float64) / SR
    chords = [
        # (root_midi, chord_midis)
        (38, [50, 57, 61, 64, 66]),  # Dmaj9
        (47, [47, 54, 57, 62, 66]),  # Bm9
        (43, [43, 50, 55, 59, 62]),  # Gmaj7
        (45, [45, 52, 57, 61, 64]),  # A6/9
    ]
    bar_dur = 4.8
    num_bars = int(np.ceil(total_dur / bar_dur))
    for b in range(num_bars):
        t0 = b * bar_dur
        root_m, notes = chords[b % len(chords)]
        dur = bar_dur + 1.2
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float64) / SR
        env = np.sin(np.pi * np.clip(t / dur, 0.0, 1.0)) ** 1.4
        pad_l = np.zeros(n, dtype=np.float64)
        pad_r = np.zeros(n, dtype=np.float64)
        # Sub-bass root
        rf = midi_to_freq(root_m)
        sub = np.sin(2.0 * np.pi * rf * t) * 0.048 * env
        pad_l += sub
        pad_r += sub
        for idx, nm in enumerate(notes):
            f = midi_to_freq(nm)
            det = 1.0 + (idx - 2) * 0.0009
            s1 = np.sin(2.0 * np.pi * f * t + idx * 0.7)
            s2 = np.sin(2.0 * np.pi * (f * det) * t + idx * 1.3)
            pan = -0.55 + 1.1 * (idx / max(1, len(notes) - 1))
            w_l = np.cos((pan + 1.0) * np.pi * 0.25)
            w_r = np.sin((pan + 1.0) * np.pi * 0.25)
            pad_l += (s1 * w_l + 0.3 * s2 * w_r) * 0.017 * env
            pad_r += (s2 * w_r + 0.3 * s1 * w_l) * 0.017 * env
        add_stereo(mix, t0, pad_l, pad_r)

    # 2. Koto / Kalimba melodic arpeggio pattern (100 BPM = 0.6s quarter, 0.3s eighth)
    # D Yo / Hirajoshi pentatonic scale notes: D4, E4, F#4, A4, B4, D5, E5, F#5, A5, B5
    scale_tree = [62, 64, 66, 69, 71, 74, 76, 78, 81]
    scale_cat = [62, 66, 69, 71, 73, 74, 78, 81, 83]
    pattern = [0, 2, 4, 5, 3, 6, 4, 2, 1, 3, 5, 7, 6, 4, 2, 3]
    step_sec = 0.30
    total_steps = int(total_dur / step_sec)
    for st in range(total_steps):
        t_pos = st * step_sec
        # Leave brief breathing spaces on major act headers
        if 48.6 <= t_pos <= 49.4:
            continue
        sc = scale_tree if t_pos < 49.0 else scale_cat
        deg = pattern[st % len(pattern)]
        if (st // 16) % 2 == 1:
            deg = (deg + 1) % len(sc)
        midi_note = sc[deg]
        freq = midi_to_freq(midi_note)
        accent = 1.18 if (st % 4 == 0) else (0.92 if (st % 2 == 0) else 0.72)
        # Lift energy during Hero Tree (30.8-49.0), Cat Gaits (81.2-86.2), and Finale (90.2-94.2)
        if 30.8 <= t_pos < 49.0 or 81.2 <= t_pos <= 94.2:
            accent *= 1.15
        pan = np.sin(st * 0.65) * 0.52
        pl, pr = synth_koto_pluck(freq, dur=1.45, amp=0.088 * accent, pan=pan, bright=1.05)
        add_stereo(mix, t_pos, pl, pr)
        # Add octave shimmer on bar downbeats
        if st % 8 == 0:
            hl, hr = synth_koto_pluck(freq * 2.0, dur=1.1, amp=0.036 * accent, pan=-pan * 0.7, bright=0.8)
            add_stereo(mix, t_pos + 0.015, hl, hr)

    # 3. Expressive Shakuhachi flute phrases at key narrative milestones
    flute_cues = [
        (0.35, 74, 2.8),   # Hook opening D5
        (8.4, 69, 2.5),    # Act I Tree Stage 1 A4
        (26.0, 76, 3.0),   # Stage 5 Breakthrough E5
        (31.0, 78, 3.2),   # Hero Sakura F#5
        (49.2, 74, 2.8),   # Act II Cat Transition D5
        (67.4, 76, 2.8),   # Smooth-Min Surface Nets E5
        (76.8, 78, 2.6),   # Shader Face F#5
        (90.3, 81, 3.4),   # Finale A5
    ]
    for t_cue, m_note, dur in flute_cues:
        fl, fr = synth_shakuhachi_note(midi_to_freq(m_note), dur=dur, amp=0.068)
        add_stereo(mix, t_cue, fl, fr)

    # 4. Gentle Kyoto wind rustle during Hero Tree & Shared Wind scenes (30.8s -> 44.6s)
    rng = np.random.default_rng(20261022)
    wind_start = 30.8
    wind_dur = 13.8
    wn = int(wind_dur * SR)
    wt = np.arange(wn, dtype=np.float64) / SR
    raw_noise = rng.standard_normal(wn)
    kernel = np.hanning(64)
    kernel /= kernel.sum()
    filtered = np.convolve(raw_noise, kernel, mode="same")
    gust_env = (0.45 + 0.55 * np.sin(2.0 * np.pi * 0.28 * wt) ** 2) * np.sin(np.pi * wt / wind_dur)
    wind_sig = filtered * gust_env * 0.028
    add_stereo(mix, wind_start, wind_sig * 0.9, np.roll(wind_sig, 220) * 0.9)

    # 5. Soft paw-step pulse during Cat Gaits scene (81.2s -> 86.2s)
    gait_t = 81.35
    while gait_t < 86.0:
        u = (gait_t - 81.2) / 5.0
        if u < 0.33:
            dt_step = 0.28
            pitch = 165.0
        elif u < 0.66:
            dt_step = 0.19
            pitch = 195.0
        else:
            dt_step = 0.13
            pitch = 225.0
        sl, sr = synth_paw_step(pitch=pitch, amp=0.048)
        add_stereo(mix, gait_t, sl, sr)
        gait_t += dt_step

    # 6. Scene-cut UI chimes synchronized to all 21 scene transitions
    chime_notes = [74, 76, 78, 81, 83, 86]
    for idx, start_t, _end_t, _scene in get_scene_ranges():
        cn = chime_notes[idx % len(chime_notes)]
        cl, cr = synth_ui_chime(midi_to_freq(cn), amp=0.042)
        add_stereo(mix, start_t, cl, cr)

    # 7. Master stereo reverb tail (2 feedback comb taps) + fade-in/out + soft limiter
    delay1 = int(0.11 * SR)
    delay2 = int(0.19 * SR)
    rev = np.zeros_like(mix)
    rev[delay1:, 0] += mix[:-delay1, 1] * 0.22
    rev[delay2:, 1] += mix[:-delay2, 0] * 0.18
    mix += rev

    # Trim to exact total_dur
    exact_n = int(round(total_dur * SR))
    mix = mix[:exact_n]

    # Fade in (0.35s) and fade out (1.4s)
    fi = int(0.35 * SR)
    fo = int(1.4 * SR)
    mix[:fi] *= np.linspace(0.0, 1.0, fi)[:, None]
    mix[-fo:] *= np.linspace(1.0, 0.0, fo)[:, None]

    # Soft tanh mastering and normalize to -1.2 dBFS
    mix = np.tanh(mix * 1.15)
    peak = np.max(np.abs(mix))
    if peak > 1e-6:
        mix = mix * (0.87 / peak)

    os.makedirs(os.path.dirname(os.path.abspath(out_wav_path)), exist_ok=True)
    pcm16 = np.clip(mix * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(out_wav_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm16.tobytes())
    print(f"[music] Wrote stereo soundtrack ({total_dur:.1f}s, {SR}Hz) -> {out_wav_path}")


if __name__ == "__main__":
    import tempfile
    out = os.path.join(tempfile.gettempdir(), "tree-cat-cap", "soundtrack.wav")
    build_soundtrack(out)
