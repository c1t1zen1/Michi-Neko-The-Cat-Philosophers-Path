"""Shared timing grid for the cat-evolution video: picture and music both
read it, so every cut, label pop and drum hit lands on the same frame.

150 BPM at 30 fps -> one beat is exactly 12 frames, one bar 48 frames.
"""

FPS = 30
BPM = 150
BEAT = 12
BAR = 48


def B(bar, beat=0.0):
    """Frame index of a bar (+ beats) on the grid."""
    return int(round(bar * BAR + beat * BEAT))


END = B(30)          # final downbeat of the song (48.0 s)
TOTAL = END + 42     # ring-out and fade (49.4 s)

# (name, first frame, end frame)
SECTIONS = [
    ('hook', B(0), B(2)),
    ('rewind', B(2), B(3)),
    ('v09', B(3), B(6)),
    ('sep06', B(6), B(8)),
    ('study', B(8), B(11)),
    ('sep29', B(11), B(12)),
    ('oct04', B(12), B(13)),
    ('teardown', B(13), B(14)),
    ('skel', B(14), B(15)),
    ('prims', B(15), B(16, 2)),
    ('blend', B(16, 2), B(17)),
    ('nets', B(17), B(18)),
    ('weights', B(18), B(19)),
    ('face', B(19), B(20, 2)),
    ('gait', B(20, 2), B(22)),
    ('poses', B(22), B(23, 3)),
    ('builds', B(23, 3), B(25)),
    ('ba', B(25), B(27)),
    ('final', B(27), TOTAL),
]

# Chord per bar (the J-pop "royal road" IV-V-iii-vi in D, resolving to I
# only at the very end, when the finished cat takes its bow)
CHORDS = {
    0: 'G', 1: 'A', 2: None,
    3: 'G', 4: 'A', 5: 'F#m', 6: 'Bm', 7: 'G', 8: 'A', 9: 'F#m', 10: 'Bm', 11: 'G', 12: 'A',
    13: 'G',
    14: 'G', 15: 'A', 16: 'F#m', 17: 'Bm', 18: 'G', 19: 'A', 20: 'F#m', 21: 'Bm',
    22: 'G', 23: 'A', 24: 'F#m', 25: 'Bm', 26: 'G', 27: 'A', 28: 'GA', 29: 'D',
}

# Song form (bar ranges, end exclusive)
FORM = {
    'intro': (0, 2), 'rewind': (2, 3), 'drop1': (3, 13), 'break': (13, 14),
    'drop2': (14, 29), 'end': (29, 31),
}
