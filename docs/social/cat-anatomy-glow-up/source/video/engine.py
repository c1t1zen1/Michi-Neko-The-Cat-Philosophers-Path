"""Tiny motion-graphics engine for the cat-evolution video (PIL + numpy).

Elements draw onto a 1080x1920 RGBA canvas in z order; effects then run on
the flattened RGB frame. Everything is a pure function of the frame index,
so any frame can be rendered on its own (handy for stills and spot checks).
"""
import functools
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.normpath(os.path.join(HERE, '..', 'frames'))
FONT_DIR = 'C:/Windows/Fonts/'

INK = (13, 17, 33)
NAVY = (20, 28, 58)
PAPER = (243, 234, 219)
VERM = (233, 72, 48)
GOLD = (245, 186, 72)
SAKURA = (255, 150, 182)
CYAN = (84, 230, 255)
MINT = (118, 236, 190)
WHITE = (255, 255, 255)
CREAM = (255, 246, 232)
LILAC = (176, 150, 255)
CORAL = (255, 112, 96)

M = 24  # margin baked around chips for their drop shadow


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def prog(f, t0, dur):
    return clamp((f - t0) / float(dur)) if dur > 0 else (1.0 if f >= t0 else 0.0)


def ease_out(t):
    return 1 - (1 - t) ** 3


def ease_in(t):
    return t ** 3


def ease_io(t):
    return t * t * (3 - 2 * t)


def ease_back(t, s=1.9):
    t -= 1
    return t * t * ((s + 1) * t + s) + 1


def lerp(a, b, t):
    return a + (b - a) * t


# ---------------------------------------------------------------- fonts / text
@functools.lru_cache(None)
def font(kind, size):
    if kind in ('display', 'semi', 'bahn', 'cond'):
        f = ImageFont.truetype(FONT_DIR + 'bahnschrift.ttf', size)
        want = {'display': 'Bold Condensed', 'semi': 'SemiBold SemiCondensed', 'bahn': 'Bold',
                'cond': 'SemiBold Condensed'}[kind]
        for n in f.get_variation_names():
            name = n.decode() if isinstance(n, bytes) else n
            if name == want:
                f.set_variation_by_name(n)
                break
        return f
    path = {'black': 'seguibl.ttf', 'mono': 'consolab.ttf', 'jp': 'YuGothB.ttc', 'hand': 'segoeprb.ttf',
            'impact': 'impact.ttf', 'ui': 'segoeuib.ttf', 'sym': 'seguisym.ttf'}[kind]
    return ImageFont.truetype(FONT_DIR + path, size)


def rgba(c, a=255):
    return tuple(c[:3]) + ((c[3],) if len(c) == 4 else (a,))


@functools.lru_cache(None)
def _notdef(kind):
    return np.array(font(kind, 40).getmask('￿'))


@functools.lru_cache(None)
def has_glyph(kind, ch):
    if ch == ' ':
        return True
    m = np.array(font(kind, 40).getmask(ch))
    nd = _notdef(kind)
    return not (m.size == 0 or (m.shape == nd.shape and (m == nd).all()))


FALLBACKS = ('ui', 'sym', 'jp')


def glyph_font(kind, ch):
    if has_glyph(kind, ch):
        return kind
    for k in FALLBACKS:
        if has_glyph(k, ch):
            return k
    return kind


@functools.lru_cache(maxsize=2048)
def text_img(text, kind, size, fill, tracking=0, stroke=0, stroke_fill=(0, 0, 0)):
    f = font(kind, size)
    asc, desc = f.getmetrics()
    pad = stroke + 4
    kw = dict(fill=rgba(fill), stroke_width=stroke, stroke_fill=rgba(stroke_fill))
    mixed = any(not has_glyph(kind, c) for c in text)
    if not tracking and not mixed:
        w = f.getlength(text)
        img = Image.new('RGBA', (int(math.ceil(w)) + 2 * pad, asc + desc + 2 * pad), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((pad, pad), text, font=f, **kw)
        return img
    # per character: tracking, and fallback fonts for missing glyphs, all
    # sharing the primary font's baseline
    runs = [(c, font(glyph_font(kind, c), size)) for c in text]
    w = sum(fc.getlength(c) for c, fc in runs) + tracking * max(0, len(text) - 1)
    img = Image.new('RGBA', (int(math.ceil(w)) + 2 * pad, asc + desc + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = pad
    for c, fc in runs:
        d.text((x, pad + asc), c, font=fc, anchor='ls', **kw)
        x += fc.getlength(c) + tracking
    return img


def shadowed(img, offset=(0, 10), blur=12, alpha=0.5, color=(0, 0, 0)):
    """Pad by M and add a soft drop shadow under the image."""
    w, h = img.size
    out = Image.new('RGBA', (w + 2 * M, h + 2 * M), (0, 0, 0, 0))
    a = img.getchannel('A').point(lambda v: int(v * alpha))
    sh = Image.new('RGBA', img.size, rgba(color))
    sh.putalpha(a)
    layer = Image.new('RGBA', out.size, (0, 0, 0, 0))
    layer.paste(sh, (M + offset[0], M + offset[1]))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    out.alpha_composite(layer)
    out.alpha_composite(img, (M, M))
    return out


@functools.lru_cache(maxsize=1024)
def chip(text, bg=WHITE, fg=INK, size=36, kind='semi', accent=None, pad=(24, 12), radius=12, tracking=1,
         alpha=242, shadow=True):
    t = text_img(text, kind, size, fg, tracking)
    ax = 12 if accent else 0
    w = t.width + pad[0] * 2 + ax - 8
    h = t.height + pad[1] * 2 - 8
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=rgba(bg, alpha))
    if accent:
        d.rounded_rectangle([0, 0, ax + radius * 2, h - 1], radius, fill=rgba(accent))
        d.rectangle([ax, 0, ax + radius * 2, h - 1], fill=rgba(bg, alpha))
    base.alpha_composite(t, (pad[0] + ax - 4, pad[1] - 4))
    return shadowed(base, (0, 8), 10, 0.45) if shadow else base


@functools.lru_cache(maxsize=256)
def stat_img(num, caption, color=GOLD, size=150):
    n = text_img(num, 'display', size, color, 2)
    c = text_img(caption, 'semi', 34, WHITE, 3)
    w = max(n.width, c.width) + 56
    h = n.height + c.height - int(size * 0.28)
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([0, 0, w - 1, h - 1], 18, fill=rgba(INK, 196))
    d.rounded_rectangle([0, 0, 14, h - 1], 7, fill=rgba(color))
    base.alpha_composite(n, (30, -int(size * 0.1)))
    base.alpha_composite(c, (34, n.height - int(size * 0.34)))
    return shadowed(base, (0, 10), 14, 0.5)


@functools.lru_cache(maxsize=256)
def slab(text, size=118, fg=WHITE, bg=VERM, skew=0.22, tracking=3, kind='display'):
    t = text_img(text, kind, size, fg, tracking)
    h = int(t.height * 0.86)
    sk = int(h * skew)
    w = t.width + 56 + sk
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    d.polygon([(sk, 0), (w, 0), (w - sk, h), (0, h)], fill=rgba(bg))
    base.alpha_composite(t, (28 + sk // 2, (h - t.height) // 2 + 2))
    return shadowed(base, (0, 12), 14, 0.5)


@functools.lru_cache(maxsize=64)
def kanji_img(ch, size, color):
    return text_img(ch, 'jp', size, color)


# ---------------------------------------------------------------- compositing
def paste(base, img, x, y, alpha=1.0):
    """alpha_composite with clipping and an opacity multiplier."""
    x, y = int(round(x)), int(round(y))
    if alpha <= 0.003:
        return
    if alpha < 0.997:
        img = img.copy()
        a = np.asarray(img.getchannel('A'), np.float32) * alpha
        img.putalpha(Image.fromarray(a.astype(np.uint8)))
    w, h = img.size
    sx, sy = max(0, -x), max(0, -y)
    ex, ey = min(w, W - x), min(h, H - y)
    if ex <= sx or ey <= sy:
        return
    if sx or sy or ex < w or ey < h:
        img = img.crop((sx, sy, ex, ey))
    base.alpha_composite(img, (x + sx, y + sy))


def scaled(img, s, resample=Image.BILINEAR):
    if abs(s - 1) < 1e-3:
        return img
    w, h = img.size
    return img.resize((max(1, int(round(w * s))), max(1, int(round(h * s)))), resample)


def rotated(img, deg):
    if abs(deg) < 0.05:
        return img
    return img.rotate(deg, Image.BICUBIC, expand=True)


class AA:
    """2x supersampled drawing layer over a canvas region, for smooth lines."""

    def __init__(self, box, ss=2):
        x0, y0, x1, y1 = [int(v) for v in box]
        self.x0, self.y0 = max(0, x0), max(0, y0)
        self.x1, self.y1 = min(W, x1), min(H, y1)
        self.ss = ss
        self.ok = self.x1 > self.x0 and self.y1 > self.y0
        if self.ok:
            self.img = Image.new('RGBA', ((self.x1 - self.x0) * ss, (self.y1 - self.y0) * ss), (0, 0, 0, 0))
            self.d = ImageDraw.Draw(self.img)

    def p(self, x, y):
        return ((x - self.x0) * self.ss, (y - self.y0) * self.ss)

    def line(self, pts, fill, width):
        if self.ok:
            self.d.line([self.p(*q) for q in pts], fill=fill, width=int(width * self.ss), joint='curve')

    def circle(self, x, y, r, fill=None, outline=None, width=1):
        if self.ok:
            cx, cy = self.p(x, y)
            rr = r * self.ss
            self.d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=fill, outline=outline, width=int(width * self.ss))

    def arc(self, x, y, rx, ry, a0, a1, fill, width):
        if self.ok:
            cx, cy = self.p(x, y)
            self.d.arc([cx - rx * self.ss, cy - ry * self.ss, cx + rx * self.ss, cy + ry * self.ss], a0, a1,
                       fill=fill, width=int(width * self.ss))

    def polygon(self, pts, fill):
        if self.ok:
            self.d.polygon([self.p(*q) for q in pts], fill=fill)

    def commit(self, canvas, blur=0):
        if not self.ok:
            return
        img = self.img.resize((self.x1 - self.x0, self.y1 - self.y0), Image.LANCZOS)
        if blur:
            img = img.filter(ImageFilter.GaussianBlur(blur))
        canvas.alpha_composite(img, (self.x0, self.y0))


# ---------------------------------------------------------------- cat frames
@functools.lru_cache(maxsize=40)
def load_frame(shot, i):
    im = Image.open(os.path.join(FRAMES, shot, '%04d.png' % i)).convert('RGBA')
    im.load()
    return im


@functools.lru_cache(None)
def meta(shot):
    with open(os.path.join(FRAMES, shot, 'meta.json')) as fh:
        return json.load(fh)


def nframes(shot):
    return len(meta(shot)['frames'])


def cat_image(shot, fi):
    n = nframes(shot)
    fi = clamp(fi, 0, n - 1)
    i0 = int(math.floor(fi))
    a = fi - i0
    if a < 0.06 or i0 + 1 >= n:
        return load_frame(shot, i0)
    if a > 0.94:
        return load_frame(shot, i0 + 1)
    return Image.blend(load_frame(shot, i0), load_frame(shot, i0 + 1), a)


def frame_meta(shot, fi):
    fr = meta(shot)['frames']
    i = int(round(clamp(fi, 0, len(fr) - 1)))
    # frame 0 was projected before the camera matrix updated: use frame 1
    if i == 0 and len(fr) > 1:
        i = 1
    return fr[i]


def anchor(shot, fi, name):
    fm = frame_meta(shot, fi)
    if name in fm.get('anchors', {}):
        a = fm['anchors'][name]
        return a[0], a[1]
    names = meta(shot).get('boneNames') or []
    if name in names and 'bones' in fm:
        a = fm['bones'][names.index(name)]
        return a[0], a[1]
    raise KeyError(f'{shot}: no anchor {name}')


# ---------------------------------------------------------------- backgrounds
def _grid(img, step, color, width=1):
    d = ImageDraw.Draw(img)
    for x in range(0, W + 1, step):
        d.line([(x, 0), (x, H)], fill=color, width=width)
    for y in range(0, H + 1, step):
        d.line([(0, y), (W, y)], fill=color, width=width)


def radial(c0, c1, cx=0.5, cy=0.45, power=1.4):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx / W - cx) * 1.0) ** 2 + ((yy / H - cy) * 0.75) ** 2) / 0.72
    t = np.clip(r, 0, 1) ** power
    c0 = np.array(c0, np.float32)
    c1 = np.array(c1, np.float32)
    return (c0 * (1 - t[..., None]) + c1 * t[..., None]).astype(np.uint8)


def vertical(stops):
    """stops: [(pos 0..1, (r,g,b)), ...] top to bottom."""
    y = np.linspace(0, 1, H, dtype=np.float32)
    out = np.zeros((H, 3), np.float32)
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        m = (y >= p0) & (y <= p1)
        t = ((y[m] - p0) / max(1e-6, p1 - p0))[:, None]
        out[m] = np.array(c0) * (1 - t) + np.array(c1) * t
    return np.repeat(out[:, None, :], W, axis=1).astype(np.uint8)


@functools.lru_cache(None)
def background(style):
    rng = np.random.default_rng(7)
    if style == 'teal':
        arr = radial((52, 132, 140), (10, 36, 48))
    elif style == 'indigo':
        arr = radial((70, 80, 170), (14, 16, 44))
    elif style == 'paper':
        arr = radial((248, 240, 226), (222, 208, 186), power=2.0)
        n = rng.normal(0, 5, (H, W, 1)).astype(np.float32)
        arr = np.clip(arr + n, 0, 255).astype(np.uint8)
    elif style == 'plum':
        arr = radial((150, 56, 96), (34, 10, 30))
    elif style == 'night':
        arr = vertical([(0, (6, 10, 30)), (0.6, (20, 26, 70)), (1, (52, 40, 90))])
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        for _ in range(240):
            x, y = rng.integers(0, W), rng.integers(0, int(H * 0.8))
            r = rng.choice([1, 1, 1, 2, 2, 3])
            v = int(rng.integers(140, 255))
            d.ellipse([x - r, y - r, x + r, y + r], fill=(v, v, min(255, v + 20)))
        arr = np.asarray(img)
    elif style == 'dark':
        arr = radial((70, 16, 18), (6, 6, 10), cy=0.55)
    elif style == 'blueprint':
        arr = radial((18, 46, 88), (6, 14, 32))
        img = Image.fromarray(arr)
        _grid(img, 36, (32, 70, 120))
        _grid(img, 180, (52, 104, 168), 2)
        arr = np.asarray(img)
    elif style == 'peach':
        arr = radial((255, 214, 186), (214, 124, 112), power=1.6)
    elif style == 'sunset':
        arr = vertical([(0, (34, 18, 64)), (0.38, (120, 44, 98)), (0.62, (236, 104, 82)), (0.8, (252, 176, 96)),
                        (1, (255, 214, 140))])
        img = Image.fromarray(arr).convert('RGBA')
        glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(glow)
        d.ellipse([540 - 300, 1250 - 300, 540 + 300, 1250 + 300], fill=(255, 226, 160, 150))
        glow = glow.filter(ImageFilter.GaussianBlur(90))
        img.alpha_composite(glow)
        d = ImageDraw.Draw(img)
        d.ellipse([540 - 170, 1250 - 170, 540 + 170, 1250 + 170], fill=(255, 236, 190, 255))
        arr = np.asarray(img.convert('RGB'))
    elif style == 'cream':
        arr = radial((255, 246, 228), (236, 212, 178), power=1.8)
    elif style == 'crt':
        arr = radial((24, 30, 40), (2, 3, 6))
    elif style == 'mint':
        arr = radial((40, 120, 110), (8, 30, 36))
        img = Image.fromarray(arr)
        _grid(img, 120, (46, 118, 112))
        arr = np.asarray(img)
    elif style.startswith('pop:'):
        r, g, b = [int(v) for v in style[4:].split(',')]
        arr = radial((min(255, r + 40), min(255, g + 40), min(255, b + 40)), (r // 3, g // 3, b // 3), power=1.2)
    else:
        raise ValueError(style)
    return Image.fromarray(np.ascontiguousarray(arr)).convert('RGBA')


# ---------------------------------------------------------------- post effects
def to_img(arr):
    return Image.fromarray(arr)


def zoom(arr, s, cx=W / 2, cy=H / 2):
    if abs(s - 1) < 1e-3:
        return arr
    img = Image.fromarray(arr)
    w, h = W / s, H / s
    box = (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    return np.asarray(img.resize((W, H), Image.BILINEAR, box=box))


def zoom_blur(arr, amount, steps=6):
    if amount < 0.004:
        return arr
    acc = arr.astype(np.float32)
    for k in range(1, steps):
        acc += zoom(arr, 1 + amount * k / (steps - 1)).astype(np.float32)
    return (acc / steps).astype(np.uint8)


def shift(arr, dx, dy=0):
    dx, dy = int(round(dx)), int(round(dy))
    out = np.zeros_like(arr)
    xs0, xs1 = max(0, -dx), min(W, W - dx)
    ys0, ys1 = max(0, -dy), min(H, H - dy)
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = arr[ys0:ys1, xs0:xs1]
    return out


def hblur(arr, length, steps=8):
    if abs(length) < 2:
        return arr
    acc = np.zeros(arr.shape, np.float32)
    for k in range(steps):
        acc += np.roll(arr, int(length * k / (steps - 1) - length / 2), axis=1)
    return (acc / steps).astype(np.uint8)


def vblur(arr, length, steps=8):
    if abs(length) < 2:
        return arr
    acc = np.zeros(arr.shape, np.float32)
    for k in range(steps):
        acc += np.roll(arr, int(length * k / (steps - 1) - length / 2), axis=0)
    return (acc / steps).astype(np.uint8)


def rgb_split(arr, d):
    d = int(round(d))
    if d == 0:
        return arr
    out = arr.copy()
    out[..., 0] = np.roll(arr[..., 0], -d, axis=1)
    out[..., 2] = np.roll(arr[..., 2], d, axis=1)
    return out


def slices(arr, seed, amount, bands=9):
    r = np.random.default_rng(seed)
    out = arr.copy()
    for _ in range(bands):
        y0 = int(r.integers(0, H - 20))
        h = int(r.integers(8, 90))
        dx = int(r.normal(0, amount))
        out[y0:y0 + h] = np.roll(arr[y0:y0 + h], dx, axis=1)
    return out


def flash(arr, a, color=(255, 255, 255)):
    if a <= 0.003:
        return arr
    c = np.array(color, np.float32)
    return (arr.astype(np.float32) * (1 - a) + c * a).astype(np.uint8)


def darken(arr, a):
    return (arr.astype(np.float32) * (1 - a)).astype(np.uint8)


@functools.lru_cache(None)
def _vignette():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.6)) ** 2)
    return np.clip(1.0 - 0.42 * np.clip(r - 0.55, 0, 1) ** 1.6, 0, 1)[..., None].astype(np.float32)


@functools.lru_cache(None)
def _grain(k):
    r = np.random.default_rng(100 + k)
    g = r.normal(0, 1, (H // 2, W // 2, 1)).astype(np.float32)
    g = np.repeat(np.repeat(g, 2, axis=0), 2, axis=1)
    return (g * 3.2).astype(np.float32)


def finish(arr, f, grain=True):
    x = arr.astype(np.float32) * _vignette()
    if grain:
        x += _grain(f % 6)
    return np.clip(x, 0, 255).astype(np.uint8)


def scanlines(arr, strength=0.18):
    out = arr.astype(np.float32)
    out[1::3] *= (1 - strength)
    out[2::3] *= (1 - strength * 0.5)
    return out.astype(np.uint8)
