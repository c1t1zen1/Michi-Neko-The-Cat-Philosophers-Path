"""The edit: every layer, label and effect of the cat-evolution video.

    python edit.py cues  out.json          # SFX cue sheet for music.py
    python edit.py still out.png <frame>   # one frame
    python edit.py render out.mp4 music.wav [from to]
"""
import math
import os
import subprocess
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import timeline as T
from timeline import B
from engine import *  # noqa: F401,F403
import engine as E

REPO = 'D:/GitHub/Michi-Neko-The-Cat-Philosophers-Path'
SEC = {name: (a, b) for name, a, b in T.SECTIONS}
CUES = []


def cue(f, kind, gain=1.0, pan=0.0, **kw):
    CUES.append(dict(f=int(f), type=kind, gain=gain, pan=pan, **kw))


# ================================================================= elements
class El:
    def __init__(self, t0, t1, z=0):
        self.t0, self.t1, self.z = int(t0), int(t1), z

    def active(self, f):
        return self.t0 <= f < self.t1


class BG(El):
    def __init__(self, t0, t1, style, kanji=None, kcolor=(255, 255, 255, 26), size=900, at=(540, 980),
                 drift=(0, -70), z=-100):
        super().__init__(t0, t1, z)
        self.style, self.kanji, self.kcolor, self.size, self.at, self.drift = style, kanji, kcolor, size, at, drift

    def draw(self, cv, f):
        cv.paste(background(self.style), (0, 0))
        if self.kanji:
            u = (f - self.t0) / max(1, self.t1 - self.t0)
            chars = list(self.kanji)
            step = self.size * 0.92
            y0 = self.at[1] - step * (len(chars) - 1) / 2
            for i, ch in enumerate(chars):
                k = kanji_img(ch, self.size if len(chars) == 1 else int(self.size * 0.82), self.kcolor)
                x = self.at[0] - k.width / 2 + self.drift[0] * u
                y = y0 + i * step - k.height / 2 + self.drift[1] * u
                paste(cv, k, x, y)


class CatL(El):
    """A rendered cat plate. fi(f) maps output frame -> source frame."""

    def __init__(self, t0, t1, shot, start=0.0, speed=1.0, cx=540, cy=1060, s=1.0, z=0, alpha=1.0,
                 xray=False, onion=None, clip=None, scale_fn=None, dy_fn=None, dx_fn=None, ping=False):
        super().__init__(t0, t1, z)
        self.shot, self.start, self.speed = shot, start, speed
        self.cx, self.cy, self.s, self.alpha = cx, cy, s, alpha
        self.xray, self.onion, self.clip = xray, onion, clip
        self.scale_fn, self.dy_fn, self.dx_fn, self.ping = scale_fn, dy_fn, dx_fn, ping

    def fi(self, f):
        x = self.start + (f - self.t0) * self.speed
        n = nframes(self.shot)
        if self.ping and n > 1:
            period = 2 * (n - 1)
            x = x % period
            if x > n - 1:
                x = period - x
        return clamp(x, 0, n - 1)

    def geom(self, f):
        s = self.s * (self.scale_fn(f) if self.scale_fn else 1.0)
        cx = self.cx + (self.dx_fn(f) if self.dx_fn else 0)
        cy = self.cy + (self.dy_fn(f) if self.dy_fn else 0)
        return cx, cy, s

    def pt(self, f, name, dx=0, dy=0):
        cx, cy, s = self.geom(f)
        x, y = anchor(self.shot, self.fi(f), name)
        return cx + (x - 540) * s + dx, cy + (y - 540) * s + dy

    def draw(self, cv, f):
        img = cat_image(self.shot, self.fi(f))
        cx, cy, s = self.geom(f)
        if self.xray or self.onion:
            a = np.asarray(img).astype(np.float32)
            if self.xray:
                lum = a[..., :3].mean(-1, keepdims=True)
                a[..., :3] = lum * np.array([0.30, 0.52, 0.72]) + 8
                a[..., 3] *= 0.9
            if self.onion:
                a[..., :3] = a[..., :3] * 0.25 + np.array(self.onion) * 0.75
                a[..., 3] *= 0.55
            img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        img = scaled(img, s)
        x0, y0 = cx - img.width / 2, cy - img.height / 2
        if self.clip:
            lo, hi = self.clip(f)
            lo_i, hi_i = int(clamp(lo - x0, 0, img.width)), int(clamp(hi - x0, 0, img.width))
            if hi_i <= lo_i:
                return
            img = img.crop((lo_i, 0, hi_i, img.height))
            x0 += lo_i
        paste(cv, img, x0, y0, self.alpha(f) if callable(self.alpha) else self.alpha)


# ---- label placement: tags find a free spot around their anchor ----------
PLACED = []   # (t0, t1, x0, y0, x1, y1)
BOUNDS = (36, 250, W - 36, 1640)


def reserve(t0, t1, box):
    PLACED.append((t0, t1) + tuple(box))


def free(t0, t1, box):
    x0, y0, x1, y1 = box
    if x0 < BOUNDS[0] or y0 < BOUNDS[1] or x1 > BOUNDS[2] or y1 > BOUNDS[3]:
        return False
    for a0, a1, px0, py0, px1, py1 in PLACED:
        if a1 <= t0 or a0 >= t1:
            continue
        if x0 < px1 + 10 and x1 > px0 - 10 and y0 < py1 + 10 and y1 > py0 - 10:
            return False
    return True


def place_near(t0, t1, w, h, ax, ay, prefer, dist=190):
    dirs = {'left': (-1, -0.35), 'right': (1, -0.35), 'up': (0, -1), 'down': (0, 1), 'upleft': (-0.8, -0.8),
            'upright': (0.8, -0.8), 'downleft': (-0.8, 0.8), 'downright': (0.8, 0.8)}
    order = [prefer] + [k for k in ['left', 'right', 'upleft', 'upright', 'up', 'downleft', 'downright', 'down']
                        if k != prefer]
    for d in (dist, dist * 1.45, dist * 2.0, dist * 0.7):
        for k in order:
            vx, vy = dirs[k]
            n = math.hypot(vx, vy)
            px, py = ax + vx / n * d, ay + vy / n * d
            x0 = px - w / 2 + (vx / n) * w / 2
            y0 = py - h / 2 + (vy / n) * h / 2
            box = (x0, y0, x0 + w, y0 + h)
            if free(t0, t1, box):
                return box
    # fall back to clamping
    x0 = clamp(ax - w / 2, BOUNDS[0], BOUNDS[2] - w)
    y0 = clamp(ay - h - 160, BOUNDS[1], BOUNDS[3] - h)
    return (x0, y0, x0 + w, y0 + h)


def fly_offset(frm, e, x0, y0, w, h):
    if frm == 'left':
        return -(x0 + w + 80) * (1 - e), 0
    if frm == 'right':
        return (W - x0 + 80) * (1 - e), 0
    if frm == 'top':
        return 0, -(y0 + h + 80) * (1 - e)
    if frm == 'bottom':
        return 0, (H - y0 + 80) * (1 - e)
    return 0, 0


class Fly(El):
    """Any pre-rendered image (chip/stat/slab) flying in, holding, exiting."""

    def __init__(self, t0, t1, img, x, y, frm='left', z=50, enter=9, exit_=6, sfx='pop', pop=False, gain=1.0,
                 img_fn=None, hold_scale=None):
        super().__init__(t0, t1, z)
        self.img, self.x, self.y, self.frm = img, x, y, frm
        self.enter, self.exit, self.pop, self.img_fn, self.hold_scale = enter, exit_, pop, img_fn, hold_scale
        if sfx:
            cue(t0 + (2 if sfx == 'pop' else 0), sfx, gain, pan=clamp((x - 540) / 540, -0.8, 0.8))
            if not pop and frm in ('left', 'right'):
                cue(t0, 'swish', 0.5 * gain, pan=-0.6 if frm == 'left' else 0.6)

    def size(self):
        return self.img.width - 2 * M, self.img.height - 2 * M

    def draw(self, cv, f):
        img = self.img_fn(f) if self.img_fn else self.img
        w, h = img.width - 2 * M, img.height - 2 * M
        u = prog(f, self.t0, self.enter)
        o = prog(f, self.t1 - self.exit, self.exit)
        alpha = clamp(u * 3) * (1 - o)
        if alpha <= 0:
            return
        e = ease_back(u)
        if self.pop:
            s = 0.25 + 0.75 * e
            s *= 1 - 0.3 * o
            im = scaled(img, max(0.05, s))
            cx, cy = self.x + w / 2, self.y + h / 2
            paste(cv, im, cx - im.width / 2, cy - im.height / 2, alpha)
            return
        dx, dy = fly_offset(self.frm, e, self.x, self.y, w, h)
        # motion streak ghosts while entering
        if u < 1:
            for k, ga in ((1, 0.32), (2, 0.18), (3, 0.08)):
                ek = ease_back(clamp(u - 0.09 * k))
                gx, gy = fly_offset(self.frm, ek, self.x, self.y, w, h)
                paste(cv, img, self.x - M + gx, self.y - M + gy, alpha * ga)
        ox = -60 * ease_in(o) if self.frm == 'left' else (60 * ease_in(o) if self.frm == 'right' else 0)
        paste(cv, img, self.x - M + dx + ox, self.y - M + dy, alpha)


class Tag(Fly):
    """A chip with a leader line to a tracked point on the cat."""

    def __init__(self, t0, t1, text, cat, name, prefer='left', accent=GOLD, adx=0, ady=0, dist=190, z=60,
                 size=34, bg=WHITE, fg=INK, sfx='pop', at=None):
        img = chip(text, bg=bg, fg=fg, size=size, accent=accent)
        self.cat, self.name, self.adx, self.ady, self.accent = cat, name, adx, ady, accent
        w, h = img.width - 2 * M, img.height - 2 * M
        ax, ay = cat.pt(t0 + 4, name, adx, ady)
        if at:
            x0 = W - 50 - w if at[0] == 'R' else (540 - w / 2 if at[0] == 'C' else at[0])
            box = (x0, at[1], x0 + w, at[1] + h)
        else:
            box = place_near(t0, t1, w, h, ax, ay, prefer, dist)
        reserve(t0, t1, box)
        frm = 'left' if box[0] + w / 2 < ax else 'right'
        super().__init__(t0, t1, img, box[0], box[1], frm=frm, z=z, sfx=sfx)
        self.w, self.h = w, h

    def draw(self, cv, f):
        u = prog(f, self.t0 + 5, 7)
        o = prog(f, self.t1 - self.exit, self.exit)
        if u > 0 and o < 1:
            ax, ay = self.cat.pt(f, self.name, self.adx, self.ady)
            # attach to the chip edge facing the anchor
            cx, cy = self.x + self.w / 2, self.y + self.h / 2
            if abs(ax - cx) > self.w / 2:
                sx = self.x + (self.w if ax > cx else 0)
                sy = cy
            else:
                sx = cx
                sy = self.y + (self.h if ay > cy else 0)
            e = ease_out(u)
            ex, ey = sx + (ax - sx) * e, sy + (ay - sy) * e
            aa = AA((min(sx, ax) - 30, min(sy, ay) - 30, max(sx, ax) + 30, max(sy, ay) + 30))
            a = int(240 * (1 - o))
            aa.line([(sx, sy), (ex, ey)], (255, 255, 255, a), 3.2)
            if e > 0.95:
                r = 10 + 3 * math.sin((f - self.t0) * 0.5)
                aa.circle(ax, ay, r + 6, outline=rgba(self.accent, int(a * 0.6)), width=2.5)
                aa.circle(ax, ay, 6.5, fill=rgba(self.accent, a), outline=(255, 255, 255, a), width=2)
            aa.commit(cv)
        super().draw(cv, f)


class Slam(El):
    """Big kinetic word(s): scale punch in, optional exit."""

    def __init__(self, t0, t1, text, x, y, size=150, fill=WHITE, kind='display', tracking=4, stroke=0,
                 stroke_fill=INK, z=70, align='center', sfx='tick', gain=1.0, s0=1.8, exit_=4, shadow=True):
        super().__init__(t0, t1, z)
        img = text_img(text, kind, size, fill, tracking, stroke, stroke_fill)
        self.img = shadowed(img, (0, 10), 14, 0.55) if shadow else img
        self.x, self.y, self.align, self.s0, self.exit = x, y, align, s0, exit_
        if sfx:
            cue(t0, sfx, gain)

    def draw(self, cv, f):
        u = prog(f, self.t0, 6)
        o = prog(f, self.t1 - self.exit, self.exit) if self.exit else 0
        alpha = clamp(u * 2.5) * (1 - o)
        if alpha <= 0:
            return
        s = lerp(self.s0, 1.0, ease_out(u)) * (1 + 0.25 * ease_in(o))
        im = scaled(self.img, s)
        if self.align == 'center':
            x = self.x - im.width / 2
        elif self.align == 'right':
            x = self.x - im.width
        else:
            x = self.x - (im.width - self.img.width) / 2 - M
        paste(cv, im, x, self.y - im.height / 2, alpha)


class Chapter(El):
    def __init__(self, t0, t1, num, date, title, accent=GOLD, title_bg=VERM, z=80, compact=False):
        super().__init__(t0, t1, z)
        self.num = text_img(num, 'display', 200 if not compact else 150, (0, 0, 0, 0), 4, 4, accent)
        self.date = chip(date, bg=accent, fg=INK, size=32, kind='mono', tracking=2)
        self.title = slab(title, 104 if not compact else 92, WHITE, title_bg)
        self.accent, self.compact = accent, compact
        reserve(t0, t1, (36, 230, W - 36, 520 if not compact else 470))
        cue(t0, 'impact', 0.55)
        cue(t0 + 5, 'whoosh', 0.6)
        cue(t0 + 2, 'ding', 0.8, pan=-0.5)

    def draw(self, cv, f):
        o = prog(f, self.t1 - 5, 5)
        k = 1 - o
        u = ease_back(prog(f, self.t0, 9))
        nx = lerp(-self.num.width, 44, u) - 80 * ease_in(o)
        paste(cv, self.num, nx, 214, clamp(u * 2) * k)
        u2 = ease_back(prog(f, self.t0 + 3, 9))
        dx = self.num.width + 40
        paste(cv, self.date, dx - M, lerp(120, 262 if not self.compact else 242, u2) - M, clamp(u2 * 2) * k)
        u3 = prog(f, self.t0 + 5, 7)
        s = lerp(1.6, 1.0, ease_out(u3))
        im = scaled(self.title, s)
        ty = 372 if not self.compact else 336
        paste(cv, im, 30 - (im.width - self.title.width) / 2 - 120 * ease_in(o),
              ty - (im.height - self.title.height) / 2, clamp(u3 * 2.5) * k)


class Grad(El):
    """Dark gradient band behind text (top or bottom of frame)."""

    def __init__(self, t0, t1, y0, y1, alpha=0.65, z=40, color=(0, 0, 0)):
        super().__init__(t0, t1, z)
        a = np.zeros((int(y1 - y0), W), np.uint8)
        ramp = np.linspace(0, 1, a.shape[0])
        if y0 > H / 2:
            ramp = ramp
        else:
            ramp = ramp[::-1]
        a[:] = (np.clip(ramp * 1.6, 0, 1) ** 1.2 * 255 * alpha).astype(np.uint8)[:, None]
        img = Image.new('RGBA', (W, a.shape[0]), color + (255,))
        img.putalpha(Image.fromarray(a))
        self.img, self.y0 = img, y0

    def draw(self, cv, f):
        u = prog(f, self.t0, 6) * (1 - prog(f, self.t1 - 6, 6))
        paste(cv, self.img, 0, self.y0, u)


class Code(El):
    """Typewriter code card."""

    def __init__(self, t0, t1, lines, x, y, cps=3.2, size=31, z=75, title=None):
        super().__init__(t0, t1, z)
        self.lines, self.x, self.y, self.cps, self.size, self.title = lines, x, y, cps, size, title
        f = font('mono', size)
        self.lh = int(size * 1.42)
        self.w = int(max(f.getlength(t) for t, _ in lines)) + 64
        self.h = self.lh * len(lines) + 56 + (40 if title else 0)
        total = sum(len(t) for t, _ in lines)
        self.done = t0 + 6 + total / cps
        for k in range(int(total / cps / 2)):
            cue(t0 + 6 + k * 2, 'type', 1.0, i=k)
        reserve(t0, t1, (x, y, x + self.w, y + self.h))

    def draw(self, cv, f):
        u = ease_back(prog(f, self.t0, 8))
        o = prog(f, self.t1 - 5, 5)
        a = clamp(u * 2) * (1 - o)
        card = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        d = ImageDraw.Draw(card)
        d.rounded_rectangle([0, 0, self.w - 1, self.h - 1], 18, fill=(10, 14, 28, 236), outline=(70, 90, 140, 255), width=2)
        for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
            d.ellipse([22 + i * 26, 18, 38 + i * 26, 34], fill=c)
        oy = 50
        if self.title:
            d.text((110, 12), self.title, font=font('mono', 24), fill=(150, 160, 190))
        n = int(max(0, f - self.t0 - 6) * self.cps)
        fnt = font('mono', self.size)
        cur = None
        for i, (text, color) in enumerate(self.lines):
            shown = text[:max(0, n)]
            n -= len(text)
            yy = oy + i * self.lh
            d.text((32, yy), shown, font=fnt, fill=rgba(color))
            if 0 < len(shown) < len(text) or (len(shown) == len(text) and n < 0 and cur is None):
                cur = (32 + fnt.getlength(shown), yy)
        if cur and (f // 8) % 2 == 0:
            d.rectangle([cur[0] + 2, cur[1] + 4, cur[0] + 16, cur[1] + self.size], fill=(118, 236, 190, 255))
        im = shadowed(card, (0, 12), 16, 0.5)
        s = 0.85 + 0.15 * u
        im = scaled(im, s)
        paste(cv, im, self.x - M - (im.width - card.width - 2 * M) / 2, self.y - M, a)


class Skeleton(El):
    def __init__(self, t0, t1, cat, reveal=20, z=30):
        super().__init__(t0, t1, z)
        self.cat, self.reveal = cat, reveal
        m = meta(cat.shot)
        self.parents = m['boneParents']
        self.names = m['boneNames']

    def draw(self, cv, f):
        fm = frame_meta(self.cat.shot, self.cat.fi(f))
        cx, cy, s = self.cat.geom(f)
        pts = [(cx + (b[0] - 540) * s, cy + (b[1] - 540) * s) for b in fm['bones']]
        n = len(pts)
        shown = int(clamp((f - self.t0) / self.reveal) * n + 0.5)
        o = prog(f, self.t1 - 4, 4)
        a = 1 - o
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        box = (min(xs) - 40, min(ys) - 40, max(xs) + 40, max(ys) + 40)
        glow = AA(box, ss=1)
        core = AA(box)
        for i in range(1, shown):
            p = self.parents[i]
            if p < 0 or p == 0:
                continue
            glow.line([pts[p], pts[i]], (84, 230, 255, int(150 * a)), 16)
            core.line([pts[p], pts[i]], (210, 250, 255, int(255 * a)), 5)
        # the body root links hips and chest: draw the spine
        if shown > 2:
            glow.line([pts[1], pts[2]], (84, 230, 255, int(150 * a)), 18)
            core.line([pts[1], pts[2]], (210, 250, 255, int(255 * a)), 6)
        for i in range(1, shown):
            big = self.names[i] in ('hips', 'chest', 'head')
            r = 11 if big else 7
            core.circle(pts[i][0], pts[i][1], r, fill=(13, 17, 33, int(255 * a)), outline=(84, 230, 255, int(255 * a)), width=3)
            if big:
                core.circle(pts[i][0], pts[i][1], 4, fill=(255, 255, 255, int(255 * a)))
        glow.commit(cv, blur=7)
        core.commit(cv)


class Counter(El):
    def __init__(self, t0, t1, x, y, fn, caption, color=CYAN, z=70):
        super().__init__(t0, t1, z)
        self.x, self.y, self.fn, self.caption, self.color = x, y, fn, caption, color
        reserve(t0, t1, (x, y, x + 330, y + 170))

    def draw(self, cv, f):
        u = ease_back(prog(f, self.t0, 8))
        o = prog(f, self.t1 - 5, 5)
        img = stat_img(str(self.fn(f)), self.caption, self.color)
        paste(cv, img, self.x - M - (1 - u) * 400, self.y - M, clamp(u * 2) * (1 - o))


class Footfall(El):
    """Live gait chart: one row per paw, stance drawn as a bar."""
    ROWS = [(1, 'LF'), (0, 'RF'), (3, 'LH'), (2, 'RH')]
    COLS = {1: CYAN, 0: (120, 170, 255), 3: GOLD, 2: CORAL}

    def __init__(self, t0, t1, cats, x=70, y=1400, w=940, z=65):
        super().__init__(t0, t1, z)
        self.cats, self.x, self.y, self.w = cats, x, y, w
        self.cache = {}
        self.thr = {}
        for c in cats:
            ys = np.array([fr['paws'] for fr in meta(c.shot)['frames']])
            self.thr[c.shot] = ys.min(axis=0) + 0.012
        reserve(t0, t1, (x, y - 50, x + w, y + 4 * 34 + 20))

    def stance(self, g):
        if g in self.cache:
            return self.cache[g]
        res = None
        for c in self.cats:
            if c.active(g):
                fm = frame_meta(c.shot, c.fi(g))
                res = [fm['paws'][i] < self.thr[c.shot][i] for i in range(4)]
        self.cache[g] = res
        return res

    def draw(self, cv, f):
        u = prog(f, self.t0, 8)
        o = prog(f, self.t1 - 5, 5)
        a = clamp(u * 2) * (1 - o)
        if a <= 0:
            return
        panel = Image.new('RGBA', (self.w, 4 * 34 + 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(panel)
        d.rounded_rectangle([0, 0, self.w - 1, panel.height - 1], 16, fill=(8, 14, 30, 210))
        d.text((20, 10), 'FOOTFALL', font=font('semi', 26), fill=(170, 190, 220))
        px = 6
        x_end = self.w - 20
        x_start = 90
        for row, (leg, name) in enumerate(self.ROWS):
            yy = 46 + row * 34
            d.text((20, yy - 2), name, font=font('mono', 24), fill=rgba(self.COLS[leg]))
            d.line([(x_start, yy + 12), (x_end, yy + 12)], fill=(60, 72, 100), width=1)
        for g in range(max(self.t0, f - (x_end - x_start) // px), f + 1):
            st = self.stance(g)
            if not st:
                continue
            xx = x_end - (f - g) * px
            for row, (leg, name) in enumerate(self.ROWS):
                if st[leg]:
                    yy = 46 + row * 34
                    d.rectangle([xx - px, yy + 2, xx, yy + 22], fill=rgba(self.COLS[leg]))
        d.line([(x_end, 40), (x_end, panel.height - 10)], fill=(255, 255, 255, 200), width=2)
        paste(cv, panel, self.x, self.y - 50 + (1 - ease_out(u)) * 80, a)


class Photo(El):
    """Polaroid of a Blender study render, with animated red-pen notes."""

    def __init__(self, t0, t1, path, cx, cy, width, rot, notes, caption, z=10, frm='bottom'):
        super().__init__(t0, t1, z)
        src = Image.open(path).convert('RGBA')
        s = width / src.width
        src = src.resize((int(src.width * s), int(src.height * s)), Image.LANCZOS)
        self.scale = s
        pad, bottom = 26, 96
        card = Image.new('RGBA', (src.width + 2 * pad, src.height + pad + bottom), (250, 247, 240, 255))
        card.alpha_composite(src, (pad, pad))
        d = ImageDraw.Draw(card)
        d.text((pad + 8, src.height + pad + 18), caption, font=font('hand', 40), fill=(60, 54, 70))
        self.card, self.pad = card, pad
        self.cx, self.cy, self.rot, self.notes, self.frm = cx, cy, rot, notes, frm
        for n in notes:
            cue(n['t'], 'tick', 1.2)

    def draw(self, cv, f):
        u = ease_out(prog(f, self.t0, 10))
        o = prog(f, self.t1 - 5, 5)
        img = self.card.copy()
        aa = AA((0, 0, img.width, img.height))
        aa.x0 = aa.y0 = 0
        red = (226, 40, 36, 255)
        for n in self.notes:
            k = prog(f, n['t'], 7)
            if k <= 0:
                continue
            x, y = n['xy'][0] * self.scale + self.pad, n['xy'][1] * self.scale + self.pad
            if n['kind'] == 'ellipse':
                rx, ry = n['r'][0] * self.scale, n['r'][1] * self.scale
                aa.arc(x, y, rx, ry, -100, -100 + 370 * ease_out(k), red, 6)
            elif n['kind'] == 'arrow':
                x2, y2 = n['to'][0] * self.scale + self.pad, n['to'][1] * self.scale + self.pad
                e = ease_out(k)
                ex, ey = x + (x2 - x) * e, y + (y2 - y) * e
                aa.line([(x, y), (ex, ey)], red, 6)
                if e > 0.9:
                    ang = math.atan2(ey - y, ex - x)
                    for da in (2.6, -2.6):
                        aa.line([(ex, ey), (ex + 30 * math.cos(ang + da), ey + 30 * math.sin(ang + da))], red, 6)
        aa.commit(img)
        d = ImageDraw.Draw(img)
        for n in self.notes:
            k = prog(f, n['t'] + 3, 4)
            if k <= 0 or 'text' not in n:
                continue
            tx, ty = n['txt'][0] * self.scale + self.pad, n['txt'][1] * self.scale + self.pad
            d.text((tx, ty), n['text'], font=font('hand', n.get('size', 44)), fill=(226, 40, 36, int(255 * k)),
                   stroke_width=5, stroke_fill=(255, 255, 255, int(230 * k)))
        img = shadowed(img, (0, 16), 22, 0.55)
        kb = 1.0 + 0.05 * prog(f, self.t0, self.t1 - self.t0)
        img = rotated(scaled(img, kb), self.rot + 1.2 * (1 - u))
        dy = (1 - u) * (900 if self.frm == 'bottom' else -900)
        paste(cv, img, self.cx - img.width / 2, self.cy - img.height / 2 + dy, 1 - o)


class Zs(El):
    def __init__(self, t0, t1, cat, name='head'):
        super().__init__(t0, t1, 55)
        self.cat, self.name = cat, name

    def draw(self, cv, f):
        ax, ay = self.cat.pt(f, self.name)
        for k in range(3):
            ph = ((f - self.t0) / 30 + k / 3) % 1
            a = math.sin(math.pi * ph)
            im = text_img('z', 'black', int(44 + 30 * ph), (255, 255, 255))
            paste(cv, im, ax + 40 + 70 * ph + 12 * math.sin(ph * 9), ay - 90 - 190 * ph, a * 0.9)


class Lines(El):
    """Speed lines for the fast bits."""

    def __init__(self, t0, t1, z=-50, color=(255, 255, 255), n=26, vertical=False):
        super().__init__(t0, t1, z)
        self.color, self.n, self.vertical = color, n, vertical
        r = np.random.default_rng(t0)
        self.ys = r.uniform(250, 1700, n)
        self.sp = r.uniform(60, 140, n)
        self.ln = r.uniform(120, 420, n)
        self.ph = r.uniform(0, W, n)

    def draw(self, cv, f):
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for y, sp, ln, ph in zip(self.ys, self.sp, self.ln, self.ph):
            x = W - ((ph + (f - self.t0) * sp) % (W + ln))
            d.line([(x, y), (x + ln, y)], fill=rgba(self.color, 70), width=3)
        cv.alpha_composite(layer)


class Divider(El):
    """Before/after split: draws the seam and its handle."""

    def __init__(self, t0, t1, xfn, z=45):
        super().__init__(t0, t1, z)
        self.xfn = xfn

    def draw(self, cv, f):
        x = self.xfn(f)
        if x <= 2 or x >= W - 2:
            return
        aa = AA((x - 60, 250, x + 60, 1340))
        aa.line([(x, 420), (x, 1320)], (255, 255, 255, 235), 5)
        aa.circle(x, 1010, 38, fill=(255, 255, 255, 245))
        aa.polygon([(x - 26, 1010), (x - 10, 996), (x - 10, 1024)], (13, 17, 33, 255))
        aa.polygon([(x + 26, 1010), (x + 10, 996), (x + 10, 1024)], (13, 17, 33, 255))
        aa.commit(cv)


class Img(El):
    def __init__(self, t0, t1, img, x, y, z=50, fade=6):
        super().__init__(t0, t1, z)
        self.img, self.x, self.y, self.fade = img, x, y, fade

    def draw(self, cv, f):
        a = prog(f, self.t0, self.fade) * (1 - prog(f, self.t1 - self.fade, self.fade))
        paste(cv, self.img, self.x, self.y, a)


class Bar(El):
    """Progress bar with label (e.g. blend radius 10% -> 100%)."""

    def __init__(self, t0, t1, x, y, w, fn, label, color=CYAN, z=70):
        super().__init__(t0, t1, z)
        self.x, self.y, self.w, self.fn, self.label, self.color = x, y, w, fn, label, color
        reserve(t0, t1, (x, y - 50, x + w, y + 30))

    def draw(self, cv, f):
        u = ease_out(prog(f, self.t0, 6))
        o = prog(f, self.t1 - 4, 4)
        v = self.fn(f)
        layer = Image.new('RGBA', (self.w + 2, 90), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.text((0, 0), f'{self.label}  {int(round(v * 100))}%', font=font('semi', 32), fill=(255, 255, 255))
        d.rounded_rectangle([0, 52, self.w, 74], 11, fill=(255, 255, 255, 60))
        d.rounded_rectangle([0, 52, max(22, int(self.w * v)), 74], 11, fill=rgba(self.color))
        paste(cv, layer, self.x, self.y - 50 + (1 - u) * 40, u * (1 - o))


class HUD(El):
    def __init__(self, t0, t1):
        super().__init__(t0, t1, 90)
        a = text_img('道猫', 'jp', 40, WHITE)
        b = text_img('MICHI-NEKO', 'display', 40, WHITE, 6)
        c = chip('DEV LOG', bg=VERM, fg=WHITE, size=24, kind='mono', tracking=3, pad=(14, 6), radius=8, shadow=False)
        r = text_img('CAT ANATOMY', 'semi', 30, (255, 255, 255, 200), 6)
        self.parts = (a, b, c, r)

    def draw(self, cv, f):
        a = prog(f, self.t0, 8) * (1 - prog(f, self.t1 - 8, 8))
        jp, en, ch, rt = self.parts
        pill = AA((30, 90, W - 30, 170))
        pill.d.rounded_rectangle([pill.p(36, 96), pill.p(56 + jp.width + en.width + ch.width + 22, 164)], 34,
                                 fill=(8, 12, 26, int(130 * a)))
        pill.d.rounded_rectangle([pill.p(W - 76 - rt.width, 100), pill.p(W - 36, 160)], 30,
                                 fill=(8, 12, 26, int(110 * a)))
        pill.commit(cv)
        paste(cv, jp, 56, 104, a)
        paste(cv, en, 56 + jp.width - 2, 106, a)
        paste(cv, ch, 56 + jp.width + en.width + 8, 115, a)
        paste(cv, rt, W - 56 - rt.width, 112, a * 0.85)


class Scrubber(El):
    """The 60-day timeline along the bottom, marker easing between versions."""
    DATES = [(0, 'AUG 23'), (14, 'SEP 06'), (32, 'SEP 24'), (37, 'SEP 29'), (42, 'OCT 04'), (60, 'OCT 22')]

    def __init__(self, t0, t1, keys, y=1700):
        super().__init__(t0, t1, 90)
        self.keys, self.y = keys, y   # keys: [(frame, day)]
        self.x0, self.x1 = 90, W - 90

    def day(self, f):
        # hold each version's date; ease to the next one at its cut
        ks = self.keys
        prev, cur = ks[0], ks[0]
        for k in ks:
            if k[0] <= f:
                prev, cur = cur, k
        if cur is ks[0]:
            return ks[0][1]
        return lerp(prev[1], cur[1], ease_io(prog(f, cur[0], 10)))

    def draw(self, cv, f):
        a = prog(f, self.t0, 8) * (1 - prog(f, self.t1 - 8, 8))
        if a <= 0:
            return
        y = self.y
        layer = AA((0, y - 70, W, y + 60))
        X = lambda dd: self.x0 + (self.x1 - self.x0) * dd / 60
        layer.d.rounded_rectangle([layer.p(self.x0 - 50, y - 52), layer.p(self.x1 + 50, y + 52)], 40,
                                  fill=(8, 12, 26, int(150 * a)))
        layer.line([(self.x0, y), (self.x1, y)], (255, 255, 255, int(110 * a)), 3)
        dcur = self.day(f)
        layer.line([(self.x0, y), (X(dcur), y)], rgba(GOLD, int(255 * a)), 5)
        for dd, name in self.DATES:
            on = dcur >= dd - 0.5
            layer.circle(X(dd), y, 7, fill=rgba(GOLD if on else (120, 130, 150), int(255 * a)))
        layer.circle(X(dcur), y, 13, fill=(255, 255, 255, int(255 * a)), outline=rgba(GOLD, int(255 * a)), width=4)
        layer.commit(cv)
        for k, (dd, name) in enumerate(self.DATES):
            near = abs(dcur - dd) < 2.5
            im = text_img(name, 'mono', 22 if not near else 26, WHITE if near else (190, 196, 210))
            ly = y + 14 if k % 2 == 0 else y - 14 - im.height + 6
            paste(cv, im, X(dd) - im.width / 2, ly, a * (1.0 if near else 0.7))


# ================================================================= effects
class FX:
    def __init__(self, t0, t1, fn):
        self.t0, self.t1, self.fn = int(t0), int(t1), fn

    def active(self, f):
        return self.t0 <= f < self.t1


def Flash(t0, dur=5, peak=1.0, color=(255, 255, 255)):
    return FX(t0, t0 + dur, lambda a, f: flash(a, peak * (1 - prog(f, t0, dur)) ** 1.5, color))


def PunchIn(t0, dur=8, s0=1.22):
    def fn(a, f):
        u = ease_out(prog(f, t0, dur))
        s = lerp(s0, 1.0, u)
        return zoom_blur(zoom(a, s), (s - 1) * 0.6)
    return FX(t0, t0 + dur, fn)


def PushOut(t1, dur=5, s1=1.3):
    t0 = t1 - dur

    def fn(a, f):
        u = ease_in(prog(f, t0, dur))
        s = lerp(1.0, s1, u)
        return flash(zoom_blur(zoom(a, s), (s - 1) * 0.7), 0.6 * u)
    return FX(t0, t1, fn)


def WhipOut(t1, dur=4, direction=-1):
    t0 = t1 - dur

    def fn(a, f):
        u = ease_in(prog(f, t0 - 1, dur))
        return hblur(shift(a, direction * u * 700), 160 * u)
    return FX(t0, t1, fn)


def WhipIn(t0, dur=5, direction=-1):
    def fn(a, f):
        u = 1 - ease_out(prog(f, t0, dur))
        return hblur(shift(a, -direction * u * 700), 160 * u)
    return FX(t0, t0 + dur, fn)


def Glitch(t0, dur=6, amount=60):
    def fn(a, f):
        k = 1 - prog(f, t0, dur) * 0.6
        a = rgb_split(a, 14 * k)
        return slices(a, f * 31, amount * k)
    return FX(t0, t0 + dur, fn)


def Shake(t0, dur=8, amp=22):
    def fn(a, f):
        k = (1 - prog(f, t0, dur)) ** 2
        r = np.random.default_rng(f * 7 + 3)
        return shift(zoom(a, 1.04), r.normal(0, amp * k), r.normal(0, amp * k))
    return FX(t0, t0 + dur, fn)


def Pulse(t0, t1, every=12, amount=0.016):
    def fn(a, f):
        k = (f - t0) % every
        return zoom(a, 1 + amount * math.exp(-k / 2.4))
    return FX(t0, t1, fn)


def VHS(t0, t1):
    def fn(a, f):
        r = np.random.default_rng(f)
        a = rgb_split(a, 6 + 4 * math.sin(f))
        a = shift(a, 0, r.integers(-4, 5))
        a = scanlines(a, 0.22)
        y = int((f * 47) % H)
        band = slice(max(0, y - 30), min(H, y + 30))
        a = a.copy()
        a[band] = np.clip(a[band].astype(np.int16) + r.integers(-60, 60, a[band].shape), 0, 255).astype(np.uint8)
        a[band] = np.roll(a[band], int(r.integers(-40, 40)), axis=1)
        return flash(a, 0.06 * (f % 2), (200, 220, 255))
    return FX(t0, t1, fn)


def FadeBlack(t0, t1):
    return FX(t0, t1, lambda a, f: darken(a, ease_in(prog(f, t0, t1 - t0))))


def Iris(t0, dur=8, color=VERM):
    """A colour disc grows from the centre and reveals the next shot."""
    def fn(a, f):
        u = prog(f, t0, dur)
        img = Image.fromarray(a)
        mask = Image.new('L', (W, H), 0)
        d = ImageDraw.Draw(mask)
        r1 = 1200 * ease_out(clamp(u * 1.8))
        r2 = 1200 * ease_in(clamp(u * 1.3 - 0.25))
        d.ellipse([540 - r1, 960 - r1, 540 + r1, 960 + r1], fill=255)
        hole = Image.new('L', (W, H), 0)
        ImageDraw.Draw(hole).ellipse([540 - r2, 960 - r2, 540 + r2, 960 + r2], fill=255)
        m = np.asarray(mask, np.float32) / 255 * (1 - np.asarray(hole, np.float32) / 255)
        c = np.array(color, np.float32)
        return (a * (1 - m[..., None]) + c * m[..., None]).astype(np.uint8)
    return FX(t0, t0 + dur, fn)


# ================================================================= the edit
EL, FXS = [], []


def add(*els):
    EL.extend(els)
    return els[0]


def fx(*fs):
    FXS.extend(fs)


def section(name):
    return SEC[name]


def build():
    # ------------------------------------------------------------ HOOK
    a, b = section('hook')
    add(BG(a, b, 'sunset', '猫', (255, 255, 255, 30), 1000, (540, 1060), (0, -90)))
    hook = add(CatL(a, b, 'now_hook', speed=0.74, cx=540, cy=1040, s=0.93, z=0,
                    scale_fn=lambda f: 0.96 + 0.04 * ease_out(prog(f, 0, 96))))
    add(Slam(a, b - 6, '道猫', 540, 300, 200, WHITE, 'jp', 10, 0, sfx=None, s0=2.2))
    add(Slam(a + 4, b - 6, 'MICHI-NEKO', 540, 482, 104, WHITE, 'display', 16, sfx=None, s0=1.5))
    add(Fly(a + 24, b - 6, chip('BEHIND THE SCENES · CAT ANATOMY', bg=VERM, fg=WHITE, size=32, tracking=3),
            0, 592, pop=True))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    add(Grad(a + 44, b, 1300, H, 0.75))
    for k, (txt, col) in enumerate([('60 DAYS', GOLD), ('6 VERSIONS', WHITE), ('1 GLOW-UP', SAKURA)]):
        t = a + 48 + k * 12
        add(Slam(t, t + 12 if k < 2 else b - 4, txt, 540, 1520, 150, col, 'display', 6, sfx='tick', s0=1.7,
                 exit_=0 if k < 2 else 4))
    fx(Glitch(b - 8, 8, 80))
    cue(b - 8, 'glitch', 1.0)

    # ------------------------------------------------------------ REWIND
    a, b = section('rewind')
    add(BG(a, b, 'crt'))
    seq = [('now_side', 95, 'OCT 22'), ('oct04_sleep', 71, 'OCT 04'), ('sep29_hero', 47, 'SEP 29'),
           ('sep24_hero', 71, 'SEP 24'), ('sep06_hero', 95, 'SEP 06'), ('v09_hero', 30, 'AUG 23')]
    for k, (shot, start, date) in enumerate(seq):
        t = a + k * 8
        add(CatL(t, t + 8, shot, start=start, speed=-3.0, cx=540, cy=1040, s=0.94))
        add(Slam(t, t + 8, date, W - 70, 330, 110, WHITE, 'mono', 2, align='right', sfx='tick', gain=0.6, s0=1.2,
                 exit_=0, shadow=False))
    add(Img(a, b, text_img('◀◀ REWIND', 'mono', 46, WHITE, 3), 60, 300, z=80, fade=1))
    add(Grad(a, b, 1260, H, 0.8))
    add(Slam(a + 4, b, "IT DIDN'T START", 540, 1430, 116, WHITE, 'display', 5, sfx='tick'))
    add(Slam(a + 16, b, 'LIKE THIS.', 540, 1550, 132, GOLD, 'display', 5, sfx='tick'))
    fx(VHS(a, b))
    cue(a, 'swish', 1.0)

    # ------------------------------------------------------------ v0.9
    a, b = section('v09')
    add(BG(a, b, 'teal', '試', (255, 255, 255, 24), 960, (560, 1050)))
    hero = add(CatL(a, a + 96, 'v09_hero', cx=540, cy=1090, s=1.0))
    face = add(CatL(a + 96, b, 'v09_face', cx=540, cy=1040, s=1.0))
    add(Chapter(a, b, '01', 'AUG 23 · v0.9', 'THE PROTOTYPE', GOLD))
    add(Fly(a + 12, a + 94, stat_img('77', 'RIGID MESHES', GOLD), 50, 560, 'left'))
    add(Fly(a + 22, a + 94, stat_img('28K', 'TRIANGLES', CYAN), 400, 560, 'left'))
    reserve(a + 12, a + 94, (50, 560, 720, 740))
    add(Tag(a + 34, a + 94, 'STACKED-TUBE LEGS', hero, 'fRknee', 'left', GOLD))
    add(Tag(a + 46, a + 94, 'SPHERE SKULL', hero, 'head', 'upright', GOLD))
    add(Tag(a + 58, a + 94, '5-SEGMENT TAIL', hero, 'tailTip', 'right', GOLD))
    add(Fly(a + 70, a + 94, chip('SPHERES · CAPSULES · CONES', bg=INK, fg=WHITE, size=34, accent=GOLD), 0, 1535,
            'bottom'))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    add(Fly(a + 80, a + 94, chip('0 BONES — PARTS JUST ROTATE', bg=VERM, fg=WHITE, size=34), 0, 1440, 'right'))
    EL[-1].x = W - 50 - EL[-1].size()[0]
    reserve(a + 70, a + 94, (100, 1400, 1040, 1620))
    add(Tag(a + 100, b, 'EYES: 5 STACKED SPHERES', face, 'eyeL', 'right', GOLD, dist=230))
    add(Tag(a + 112, b, 'STRIPES = EXTRA MESHES', face, 'head', 'upleft', GOLD, ady=-150, dist=170))
    add(Tag(a + 124, b, 'WHISKERS = LINES', face, 'muzzle', 'down', GOLD, at=(60, 1480)))
    fx(Flash(a, 5), PunchIn(a, 9, 1.25), Shake(a, 8, 18))
    fx(Flash(a + 96, 3, 0.7), PunchIn(a + 96, 6, 1.12))
    cue(a + 96, 'whoosh', 0.8)
    fx(WhipOut(b, 4, -1))

    # ------------------------------------------------------------ SEP 06
    a, b = section('sep06')
    add(BG(a, b, 'indigo', '彩', (255, 255, 255, 24), 960, (540, 1050)))
    hero = add(CatL(a, a + 48, 'sep06_hero', start=20, cx=540, cy=1090, s=1.0))
    face = add(CatL(a + 48, b, 'sep06_face', cx=540, cy=1000, s=1.0))
    add(Chapter(a, b, '02', 'SEP 06', 'THE PAINTERLY PASS', SAKURA))
    add(Fly(a + 10, a + 46, chip('BROWN → GINGER TABBY', bg=SAKURA, fg=INK, size=36), 50, 560, 'left'))
    reserve(a + 10, a + 46, (50, 560, 560, 640))
    add(Tag(a + 20, a + 46, 'BODY-SPACE TABBY FUR SHADER', hero, 'hips', 'right', SAKURA, dist=230))
    add(Fly(a + 30, a + 46, chip('SOFT 3-BAND TOON RAMP', bg=INK, fg=WHITE, size=34, accent=SAKURA), 0, 1540, 'bottom'))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    reserve(a + 30, a + 46, (200, 1520, 880, 1620))
    add(Tag(a + 52, b, 'TEXTURED AMBER IRISES', face, 'eyeL', 'right', SAKURA, at=('R', 560)))
    add(Tag(a + 64, b, 'RIM LIGHT ON THE SILHOUETTE', face, 'hips', 'right', SAKURA, at=('R', 1500)))
    add(Fly(a + 74, b, stat_img('51K', 'TRIANGLES', SAKURA), 60, 1380, 'left'))
    reserve(a + 74, b, (60, 1380, 400, 1560))
    fx(WhipIn(a, 5, -1))
    cue(a, 'whoosh', 1.0)
    fx(Flash(a + 48, 3, 0.6), PunchIn(a + 48, 6, 1.12))
    cue(a + 48, 'whoosh', 0.7)
    fx(Iris(b - 6, 12, PAPER))

    # ------------------------------------------------------------ ANATOMY STUDY
    a, b = section('study')
    add(BG(a, b, 'paper', '骨', (120, 90, 60, 26), 980, (540, 1060)))
    add(Chapter(a, b, '03', 'SEP 24 · BLENDER', 'ANATOMY STUDY', VERM, INK))
    side = REPO + '/data/misc/cat_anatomy_study/cat_anatomy_side.png'
    tq = REPO + '/data/misc/cat_anatomy_study/cat_anatomy_three_quarter.png'
    add(Photo(a + 2, a + 50, side, 540, 1040, 880, -3, [
        dict(t=a + 12, kind='ellipse', xy=(430, 400), r=(300, 165), text='BALLOON TORSO', txt=(250, 150)),
        dict(t=a + 22, kind='ellipse', xy=(575, 660), r=(80, 150), text="NO ELBOW?", txt=(620, 520)),
        dict(t=a + 32, kind='arrow', xy=(110, 840), to=(250, 700), text='NO HOCK ZIG-ZAG', txt=(20, 830)),
    ], 'blender study · side', z=10))
    add(Photo(a + 48, a + 98, tq, 540, 1030, 860, 2.5, [
        dict(t=a + 58, kind='ellipse', xy=(335, 450), r=(120, 140), text='PELVIS vs RIBCAGE', txt=(40, 120), size=40),
    ], 'blender study · three-quarter', z=11, frm='top'))
    add(Code(a + 66, a + 98, [
        ("// A cat's pelvis is narrower", (120, 200, 140)),
        ("// than its ribcage.", (120, 200, 140)),
        ("hips   0.155 → 0.135", (255, 214, 120)),
        ("chest  0.162 → 0.150", (255, 214, 120)),
        ("head   ×1.06 → ×1.00", (255, 214, 120)),
        ("tail   0.85  → 0.68 rad", (255, 214, 120)),
    ], 160, 1180, cps=5.5, size=33, title='src/cat.js · sep 24'))
    # onion skin: Sep 06 ghost under the fixed Sep 24 proportions
    add(CatL(a + 98, a + 122, 'sep06_stand_side', cx=540, cy=1080, s=1.0, onion=(255, 80, 80), z=0))
    add(CatL(a + 98, a + 122, 'sep24_stand_side', cx=540, cy=1080, s=1.0, z=1,
             alpha=1.0))
    add(Fly(a + 100, a + 122, chip('ONION SKIN: SEP 06 (RED) vs SEP 24', bg=INK, fg=WHITE, size=32, accent=VERM),
            60, 1500, 'left'))
    reserve(a + 100, a + 122, (60, 1500, 760, 1580))
    hero = add(CatL(a + 122, b, 'sep24_hero', start=10, cx=540, cy=1080, s=1.0))
    add(Fly(a + 124, b, chip('SLIMMER PELVIS · SMALLER HEAD', bg=VERM, fg=WHITE, size=36), 0, 560, 'right'))
    EL[-1].x = W - 50 - EL[-1].size()[0]
    reserve(a + 124, b, (300, 560, 1040, 640))
    fx(Flash(a + 98, 3, 0.7), PunchIn(a + 98, 6, 1.1))
    cue(a + 98, 'shutter', 1.0)
    fx(Flash(a + 122, 3, 0.6))
    cue(a + 122, 'whoosh', 0.7)
    fx(WhipOut(b, 4, 1))

    # ------------------------------------------------------------ SEP 29
    a, b = section('sep29')
    add(BG(a, b, 'plum', '鈴', (255, 255, 255, 26), 960, (540, 1080)))
    col = add(CatL(a, b, 'sep29_collar', speed=1.45, cx=540, cy=1060, s=1.0))
    add(Chapter(a, b, '04', 'SEP 29', 'COLLAR + BELL', GOLD, VERM, compact=True))
    add(Tag(a + 6, b, 'COLLAR FOLLOWS THE NECK (~45°)', col, 'collar', 'right', GOLD, dist=260))
    add(Tag(a + 16, b, 'BELL HANGS FROM ITS LOWEST POINT', col, 'collar', 'downleft', GOLD, ady=60, dist=300))
    add(Tag(a + 26, b, 'WHITE CHIN + THROAT', col, 'muzzle', 'left', GOLD, ady=80, dist=200))
    fx(WhipIn(a, 5, 1))
    cue(a, 'whoosh', 1.0)
    cue(a + 16, 'ding', 1.4, pan=0.2)

    # ------------------------------------------------------------ OCT 04
    a, b = section('oct04')
    add(BG(a, b, 'night', '眠', (255, 255, 255, 22), 960, (540, 1080)))
    sl = add(CatL(a, b, 'oct04_sleep', speed=1.45, cx=540, cy=1080, s=1.05))
    add(Chapter(a, b, '05', 'OCT 04', 'FIRST SLEEP POSE', LILAC, (90, 70, 170), compact=True))
    add(Zs(a + 18, b, sl, 'head'))
    add(Fly(a + 10, b, chip('FOR THE SECRET SUMMIT GARDEN', bg=LILAC, fg=INK, size=34), 50, 1450, 'left'))
    add(Fly(a + 24, b, chip('…BUT RIGID TUBE LEGS CAN’T FOLD', bg=INK, fg=WHITE, size=34, accent=VERM), 50, 1540,
            'left'))
    reserve(a + 10, b, (50, 1440, 900, 1620))
    fx(Flash(a, 4, 0.5, (180, 170, 255)), PunchIn(a, 7, 1.12))
    cue(a, 'whoosh', 0.8)
    fx(Glitch(b - 6, 6, 60))
    cue(b - 6, 'glitch', 1.0)

    # ------------------------------------------------------------ TEARDOWN
    a, b = section('teardown')
    add(BG(a, b, 'dark', '壊', (255, 60, 60, 30), 1000, (540, 1040), (0, -40)))
    add(CatL(a, b, 'v09_explode', speed=1.0, cx=540, cy=1050, s=1.0))
    add(Slam(a, b, 'OCT 22', 540, 330, 70, GOLD, 'mono', 6, sfx='tick'))
    add(Slam(a + 6, b, 'WE TORE IT', 540, 470, 150, WHITE, 'display', 6, sfx='impact', gain=0.6))
    add(Slam(a + 14, b, 'ALL DOWN.', 540, 620, 150, VERM, 'display', 6, sfx='tick'))
    add(Grad(a + 20, b, 1300, H, 0.8))
    add(Fly(a + 24, b, chip('77 RIGID PARTS  →  1 SKINNED COAT', bg=WHITE, fg=INK, size=40, accent=VERM), 0, 1500,
            pop=True))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    fx(Shake(a + 6, 10, 16), Shake(a + 30, 18, 28))
    fx(Glitch(b - 5, 5, 120))
    cue(b - 5, 'glitch', 1.2)

    # ------------------------------------------------------------ REBUILD: skeleton
    a, b = section('skel')
    add(BG(a, b, 'blueprint', '骨', (84, 230, 255, 30), 980, (560, 1060)))
    sk = add(CatL(a, b, 'now_skel', cx=540, cy=1060, s=1.0, xray=True))
    add(Skeleton(a + 2, b, sk, reveal=20))
    add(Chapter(a, b, '06', 'OCT 22', 'THE REBUILD', CYAN, VERM))
    add(Fly(a + 10, b, stat_img('29', 'BONES', CYAN), 50, 560, 'left'))
    reserve(a + 10, b, (50, 560, 330, 740))
    add(Tag(a + 16, b, 'SCAPULAE SLIDE ON THE CHEST', sk, 'scapL', 'upright', CYAN, dist=240))
    add(Tag(a + 24, b, 'ELBOW FOLDS BACK', sk, 'forearmL', 'left', CYAN, dist=220))
    add(Tag(a + 32, b, 'STIFLE → HOCK ZIG-ZAG', sk, 'metaL', 'downright', CYAN, dist=200))
    add(Tag(a + 40, b, '6-BONE TAIL', sk, 'tail3', 'upright', CYAN, dist=170))
    fx(Flash(a, 6), PunchIn(a, 10, 1.3), Shake(a, 10, 26))

    # ------------------------------------------------------------ primitives
    a, b = section('prims')
    add(BG(a, b, 'blueprint', '形', (84, 230, 255, 30), 980, (560, 1060)))
    pr = add(CatL(a, b, 'now_prims', cx=540, cy=1050, s=1.0))

    def landed(f, a=a):
        t = clamp((f - a) / 71)
        return int(sum(1 for i in range(50) if t >= 0.55 * i / 50 + 0.45 - 0.08))
    add(Counter(a + 2, b, 50, 330, landed, 'SOFT PRIMITIVES', CYAN))
    add(Fly(a + 10, b, chip('ELLIPSOIDS + TAPERED CAPSULES', bg=CYAN, fg=INK, size=34), 0, 560, 'right'))
    EL[-1].x = W - 50 - EL[-1].size()[0]
    reserve(a + 10, b, (420, 560, 1040, 640))
    add(Fly(a + 22, b, chip('35 BODY  +  15 HEAD (2 CARVED EYE DISHES)', bg=INK, fg=WHITE, size=32, accent=CYAN), 0,
            1545, 'bottom'))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    reserve(a + 22, b, (60, 1530, 1020, 1620))
    add(Tag(a + 38, b, 'DEEP KEELED RIBCAGE', pr, 'chest', 'down', CYAN, dist=330))
    add(Tag(a + 46, b, 'SCAPULA BLADE', pr, 'fLscap', 'upright', CYAN, dist=180))
    add(Tag(a + 54, b, 'HAUNCH', pr, 'hLhip', 'right', CYAN, dist=160))
    add(Tag(a + 62, b, 'WHISKER PADS', pr, 'muzzle', 'upleft', CYAN, dist=150))
    fx(Flash(a, 3, 0.6), PunchIn(a, 6, 1.12))
    cue(a, 'whoosh', 0.8)

    # ------------------------------------------------------------ smooth union
    a, b = section('blend')
    add(BG(a, b, 'blueprint', '融', (84, 230, 255, 30), 980, (560, 1060)))
    add(CatL(a, b, 'now_blend', cx=540, cy=1050, s=1.0))
    # the assembled primitives dissolve into the first melt frame
    add(CatL(a, a + 8, 'now_prims', start=71, speed=0, cx=540, cy=1050, s=1.0, z=1,
             alpha=lambda f, a=a: 1 - ease_io(prog(f, a, 8))))
    add(Slam(a, b, 'SMOOTH-MIN UNION', 540, 400, 112, WHITE, 'display', 5, sfx='impact', gain=0.4))
    add(Code(a + 2, b, [("smin(a, b, k) =", (255, 255, 255)), ("  min(a, b) − h²·k / 4", (118, 236, 190))],
             120, 1380, cps=6, size=40))
    bl = meta('now_blend')['frames']
    add(Bar(a + 2, b, 120, 600, 840, lambda f, a=a: bl[int(clamp(f - a, 0, 23))].get('blendScale', 1.0),
            'BLEND FILLETS', CYAN))

    # ------------------------------------------------------------ surface nets
    a, b = section('nets')
    add(BG(a, b, 'blueprint', '網', (84, 230, 255, 30), 980, (560, 1060)))
    clay = add(CatL(a, b, 'now_raw_orbit', cx=540, cy=1040, s=1.0))

    class Scan(El):
        def __init__(self, t0, t1):
            super().__init__(t0, t1, 5)

        def draw(self, cv, f):
            y = lerp(380, 1640, ease_io(prog(f, self.t0, 30)))
            wire = cat_image('now_wire_orbit', f - self.t0)
            wy0 = 1040 - 540
            cut = int(clamp(y - wy0, 0, 1080))
            if cut > 0:
                top = wire.crop((0, 0, 1080, cut))
                paste(cv, top, 0, wy0)
            aa = AA((0, y - 30, W, y + 30), ss=1)
            aa.line([(0, y), (W, y)], (84, 230, 255, 120), 20)
            aa.commit(cv, blur=8)
            aa = AA((0, y - 4, W, y + 4))
            aa.line([(0, y), (W, y)], (220, 255, 255, 255), 3)
            aa.commit(cv)
    add(Scan(a, b))
    add(Slam(a, b, 'SURFACE NETS', 540, 400, 112, WHITE, 'display', 5, sfx='impact', gain=0.4))
    reserve(a, b, (60, 330, 1020, 470))
    add(Fly(a + 6, b, chip('8.5 mm VOXEL GRID → ONE MESH', bg=CYAN, fg=INK, size=34), 60, 520, 'left'))
    add(Fly(a + 14, b, chip('3 LAPLACIAN RELAX PASSES', bg=INK, fg=WHITE, size=34, accent=CYAN), 60, 610, 'left'))
    reserve(a + 6, b, (60, 520, 700, 690))
    add(Fly(a + 24, b, stat_img('26,309', 'VERTS · BODY 16,321 + HEAD 9,988', CYAN, 120), 60, 1380, 'left'))
    reserve(a + 24, b, (60, 1380, 700, 1560))
    add(Fly(a + 34, b, chip('SCULPTED LIVE AT LOAD · < 1 s', bg=GOLD, fg=INK, size=34), 0, 1580, 'right'))
    EL[-1].x = W - 50 - EL[-1].size()[0]
    fx(Flash(a, 3, 0.6), PunchIn(a, 6, 1.12))
    cue(a, 'whoosh', 0.8)
    cue(a + 2, 'swish', 0.8)

    # ------------------------------------------------------------ skin weights
    a, b = section('weights')
    add(BG(a, b, 'blueprint', '皮', (84, 230, 255, 30), 980, (560, 1060)))
    wt = add(CatL(a, b, 'now_weights', start=12, cx=540, cy=1050, s=1.0))
    add(Slam(a, b, 'SKIN WEIGHTS', 540, 400, 112, WHITE, 'display', 5, sfx='impact', gain=0.4))
    reserve(a, b, (60, 330, 1020, 470))
    add(Fly(a + 6, b, chip('BAKED FROM THE SAME PRIMITIVES', bg=SAKURA, fg=INK, size=34), 0, 520, 'right'))
    EL[-1].x = W - 50 - EL[-1].size()[0]
    reserve(a + 6, b, (300, 520, 1040, 600))
    add(Fly(a + 18, b, chip('ONE SEAMLESS COAT', bg=INK, fg=WHITE, size=40, accent=SAKURA), 0, 1440, 'left'))
    EL[-1].x = 60
    add(Fly(a + 28, b, chip('BENDS AT SHOULDERS · HIPS · SPINE · EVERY JOINT', bg=WHITE, fg=INK, size=30), 0, 1540,
            'bottom'))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    fx(Flash(a, 3, 0.6), PunchIn(a, 6, 1.12))
    cue(a, 'whoosh', 0.8)

    # ------------------------------------------------------------ coat + face
    a, b = section('face')
    add(BG(a, b, 'peach', '顔', (255, 255, 255, 40), 1000, (540, 1040)))
    fc = add(CatL(a, b, 'now_face', cx=540, cy=1000, s=1.0))
    add(Fly(a + 2, b, slab('PAINTED BY THE SHADER', 84, WHITE, VERM), 40, 300, 'left'))
    reserve(a + 2, b, (40, 290, 1040, 400))
    add(Tag(a + 10, a + 40, "TABBY 'M' ON THE BROW", fc, 'head', 'up', VERM, ady=-120, at=(60, 440)))
    add(Tag(a + 18, a + 52, 'ANIME EYES · PUPILS WIDEN WHEN EXCITED', fc, 'eyeL', 'up', VERM, size=30,
            at=('R', 530)))
    add(Tag(a + 28, a + 62, 'ω MOUTH', fc, 'nose', 'left', VERM, ady=40, at=(60, 1440)))
    add(Tag(a + 40, b, 'KUMIHIMO BRAIDED SILK COLLAR', fc, 'collar', 'down', VERM, size=30, at=(60, 1540)))
    add(Tag(a + 50, b, 'SUZU BELL · SAKURA CREST', fc, 'bell', 'down', VERM, size=30, at=('R', 1440)))
    add(Tag(a + 56, b, '4 WHISKERS A SIDE', fc, 'nose', 'up', VERM, size=30, at=('R', 440)))
    fx(Flash(a, 4, 0.7), PunchIn(a, 8, 1.18))
    cue(a, 'whoosh', 1.0)
    cue(a + 50, 'ding', 1.0, pan=0.3)

    # ------------------------------------------------------------ gait
    a, b = section('gait')
    add(BG(a, b, 'mint', '歩', (255, 255, 255, 24), 980, (560, 1000)))
    gaits = [('now_walk', 'WALK', 'LATERAL SEQUENCE · LH → LF → RH → RF', CYAN),
             ('now_trot', 'TROT', 'DIAGONAL PAIRS', GOLD),
             ('now_gallop', 'GALLOP', 'ROTARY · SPINE FLEXES', CORAL)]
    cats = []
    for k, (shot, word, sub, colr) in enumerate(gaits):
        t = a + k * 24
        c = add(CatL(t, t + 24, shot, start=6, cx=540, cy=960, s=1.0))
        cats.append(c)
        add(Slam(t, t + 24, word, 540, 380, 150, colr, 'display', 8, sfx='impact', gain=0.35, exit_=0))
        add(Fly(t + 2, t + 24, chip(sub, bg=INK, fg=WHITE, size=32, accent=colr), 0, 500, pop=True, exit_=2))
        EL[-1].x = 540 - EL[-1].size()[0] / 2
        if k:
            fx(Flash(t, 3, 0.5), PunchIn(t, 5, 1.1))
            cue(t, 'whoosh', 0.6)
    add(Lines(a + 48, b, z=-50))
    add(Footfall(a, b, cats, 70, 1420))
    add(Fly(a + 10, b, chip('IK: PLANTED PAWS STAY PLANTED', bg=WHITE, fg=INK, size=30, accent=CYAN), 0, 1620,
            'bottom'))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    fx(WhipIn(a, 5, -1))
    cue(a, 'whoosh', 1.0)

    # ------------------------------------------------------------ poses
    a, b = section('poses')
    poses = [('now_sit', 24, 'SIT', None, (255, 120, 90)), ('now_groom', 0, 'GROOM', None, (90, 170, 255)),
             ('now_stretch', 0, 'STRETCH', None, (250, 180, 60)),
             ('now_startled', 12, 'STARTLED!', 'BOTTLEBRUSH TAIL', (200, 80, 160)),
             ('now_yawn', 6, 'YAWN', None, (90, 200, 150)), ('now_jump', 2, 'JUMP', None, (110, 120, 240)),
             ('now_sleep', 0, 'SLEEP', 'ZZZ…', (70, 60, 140))]
    for k, (shot, st, word, sub, colr) in enumerate(poses):
        t = a + k * 12
        add(BG(t, t + 12, 'pop:%d,%d,%d' % colr, '姿', (255, 255, 255, 30), 980, (540, 1050)))
        dy = None
        if shot == 'now_jump':
            dy = (lambda t0: (lambda f: -260 * math.sin(math.pi * clamp((f - t0) / 12))))(t)
        add(CatL(t, t + 12, shot, start=st, cx=540, cy=1060, s=1.0, dy_fn=dy))
        add(Slam(t, t + 12, word, 540, 420, 190, WHITE, 'display', 8, sfx='impact', gain=0.3, s0=1.5, exit_=0))
        if sub:
            add(Fly(t + 2, t + 12, chip(sub, bg=WHITE, fg=INK, size=36), 0, 1500, pop=True, exit_=2))
            EL[-1].x = 540 - EL[-1].size()[0] / 2
        fx(Flash(t, 3, 0.55), PunchIn(t, 5, 1.1))
    add(Fly(a + 2, b, chip('IDLE VERBS · SAME 29 BONES', bg=INK, fg=WHITE, size=30, accent=GOLD), 0, 1600,
            'bottom'))
    EL[-1].x = 540 - EL[-1].size()[0] / 2

    # ------------------------------------------------------------ builds
    a, b = section('builds')
    add(BG(a, b, 'cream', '体', (160, 110, 60, 30), 980, (540, 1050)))
    add(Slam(a, b, '4 BODY TYPES', 540, 330, 120, INK, 'display', 6, sfx='impact', gain=0.4, shadow=False))
    add(Slam(a + 4, b, '1 SCULPT KIT', 540, 450, 120, VERM, 'display', 6, sfx='tick', shadow=False))
    grid = [('now_michi', 'MICHI', 'LEG 0.96', 280, 830), ('now_luna', 'LUNA', 'GIRTH 0.93 · TAIL 1.08', 800, 830),
            ('now_mochi', 'MOCHI', 'GIRTH 1.12 · CHEEKS 1.14', 280, 1330),
            ('now_kuro', 'KURO', 'LEG 1.02 · TAIL 1.10', 800, 1330)]
    for k, (shot, name, params, gx, gy) in enumerate(grid):
        t = a + 4 + k * 5
        add(CatL(t, b, shot, speed=0.6, cx=gx, cy=gy, s=0.56, z=k,
                 scale_fn=(lambda t0: (lambda f: 0.4 + 0.6 * ease_back(prog(f, t0, 8))))(t), ping=True))
        add(Fly(t + 3, b, chip(name, bg=INK, fg=WHITE, size=34, tracking=4), gx - 140, gy + 150, pop=True))
        add(Fly(t + 6, b, chip(params, bg=WHITE, fg=INK, size=24, kind='mono'), gx - 230, gy + 220, pop=True,
                sfx=None))
        EL[-1].x = gx - EL[-1].size()[0] / 2
        EL[-2].x = gx - EL[-2].size()[0] / 2
        cue(t, 'pop', 1.2, pan=-0.5 if gx < 540 else 0.5)
    fx(Flash(a, 3, 0.6), PunchIn(a, 6, 1.12))
    cue(a, 'whoosh', 0.8)
    fx(WhipOut(b, 4, -1))

    # ------------------------------------------------------------ before / after
    a, b = section('ba')
    add(BG(a, b, 'indigo', '変', (255, 255, 255, 24), 980, (540, 1050)))

    def split(f, a=a):
        if f < a + 6:
            return W
        if f < a + 22:
            return lerp(W, 540, ease_out(prog(f, a + 6, 16)))
        if f < a + 70:
            return 540 + 50 * math.sin((f - a - 22) / 48 * math.pi * 2)
        return lerp(540, 0, ease_io(prog(f, a + 70, 18)))
    add(CatL(a, b, 'v09_side', cx=540, cy=1010, s=1.0, clip=lambda f: (0, split(f))))
    add(CatL(a, b, 'now_side', cx=540, cy=1010, s=1.0, clip=lambda f: (split(f), W)))
    add(Divider(a, b, split))
    add(Fly(a + 2, a + 86, chip('AUG 23 · BEFORE', bg=GOLD, fg=INK, size=34, kind='mono', tracking=2), 50, 330,
            'left'))
    add(Fly(a + 8, b, chip('OCT 22 · AFTER', bg=CYAN, fg=INK, size=34, kind='mono', tracking=2), 0, 330, 'right'))
    EL[-1].x = W - 50 - EL[-1].size()[0]
    add(Grad(a + 20, b, 1250, H, 0.85))
    rows = ['77 RIGID MESHES  →  1 SKINNED COAT', '0 BONES  →  29 BONES', 'BALLS + TUBES  →  SDF SCULPT',
            'STRIPE MESHES  →  SHADER-PAINTED TABBY']
    for k, r in enumerate(rows):
        t = a + 24 + k * 12
        add(Fly(t, b, chip(r, bg=WHITE if k % 2 == 0 else INK, fg=INK if k % 2 == 0 else WHITE, size=34,
                           accent=VERM), 0, 1340 + k * 82, 'left' if k % 2 == 0 else 'right'))
        EL[-1].x = 540 - EL[-1].size()[0] / 2
    cue(a + 6, 'shutter', 1.0)
    cue(a + 70, 'shutter', 1.0)
    fx(WhipIn(a, 5, -1))
    cue(a, 'whoosh', 1.0)
    fx(PushOut(b, 6, 1.3))

    # ------------------------------------------------------------ FINALE
    a, b = section('final')
    add(BG(a, b, 'sunset', '道猫', (255, 255, 255, 26), 760, (540, 1000), (0, -60)))
    add(CatL(a, b, 'now_final', speed=0.78, cx=540, cy=1080, s=0.96,
             scale_fn=lambda f, a=a: 1.04 - 0.04 * ease_out(prog(f, a, 120))))
    add(Grad(a, b, 0, 640, 0.55))
    add(Slam(a, b, '道猫', 540, 320, 210, WHITE, 'jp', 10, 0, sfx=None, s0=2.0, exit_=0))
    add(Slam(a + 5, b, 'MICHI-NEKO', 540, 500, 110, WHITE, 'display', 18, sfx='tick', s0=1.5, exit_=0))
    add(Slam(a + 10, b, "THE CAT PHILOSOPHER'S PATH", 540, 600, 50, GOLD, 'semi', 6, sfx='tick', s0=1.3, exit_=0))
    add(Grad(a + 20, b, 1340, H, 0.8))
    add(Fly(a + 24, b, chip('100% PROCEDURAL · BUILT IN CODE', bg=WHITE, fg=INK, size=36, accent=VERM), 0, 1440,
            pop=True))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    add(Fly(a + 36, b, chip('PLAYS IN YOUR BROWSER', bg=VERM, fg=WHITE, size=36), 0, 1530, pop=True))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    t = B(29)
    add(Fly(t, b, chip('github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path', bg=INK, fg=WHITE, size=26,
                       kind='mono'), 0, 1640, pop=True))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    add(Fly(t + 6, b, chip('FOLLOW THE BUILD ✦', bg=GOLD, fg=INK, size=34, tracking=3), 0, 1735, pop=True))
    EL[-1].x = 540 - EL[-1].size()[0] / 2
    fx(Flash(a, 8, 1.0, (255, 236, 200)), PunchIn(a, 10, 1.2))
    fx(Flash(t, 6, 0.6, (255, 240, 210)), Shake(t, 8, 10))
    fx(FadeBlack(T.TOTAL - 24, T.TOTAL))

    # ------------------------------------------------------------ global
    add(HUD(B(2), B(27)))
    keys = [(B(3), 0), (B(6), 14), (B(8), 32), (B(11), 37), (B(12), 42), (B(13), 42), (B(14), 60)]
    add(Scrubber(B(3), B(27), keys))
    fx(Pulse(B(3), B(13), 12, 0.014), Pulse(B(14), B(27), 12, 0.016))


build()
EL.sort(key=lambda e: e.z)


def render_frame(f):
    cv = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    for el in EL:
        if el.active(f):
            el.draw(cv, f)
    arr = np.asarray(cv.convert('RGB'))
    for e in FXS:
        if e.active(f):
            arr = e.fn(arr, f)
    return finish(arr, f)


def main():
    mode = sys.argv[1]
    if mode == 'cues':
        import json
        CUES.sort(key=lambda c: c['f'])
        json.dump(CUES, open(sys.argv[2], 'w'), indent=0)
        print(len(CUES), 'cues')
    elif mode == 'still':
        out = sys.argv[2]
        for k, fs in enumerate(sys.argv[3:]):
            img = Image.fromarray(render_frame(int(fs)))
            img.save(out.replace('.png', f'_{int(fs):04d}.png') if len(sys.argv) > 4 else out)
    elif mode == 'render':
        out, wav = sys.argv[2], sys.argv[3]
        f0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
        f1 = int(sys.argv[5]) if len(sys.argv) > 5 else T.TOTAL
        ff = os.environ.get('FFMPEG', 'ffmpeg')
        cmd = [ff, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
               '-r', str(T.FPS), '-i', '-']
        if wav != '-':
            cmd += ['-ss', f'{f0 / T.FPS:.4f}', '-i', wav]
        cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-maxrate', '9M', '-bufsize', '18M',
                '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-g', '60',
                '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']
        if wav != '-':
            cmd += ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest']
        cmd += ['-movflags', '+faststart', out]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        t0 = time.time()
        for f in range(f0, f1):
            p.stdin.write(render_frame(f).tobytes())
            if f % 48 == 0:
                el = time.time() - t0
                print(f'frame {f}/{f1}  {el:.0f}s  ({el / max(1, f - f0 + 1):.2f}s/f)', flush=True)
        p.stdin.close()
        p.wait()
        print('done', out, f'{time.time() - t0:.0f}s')


if __name__ == '__main__':
    main()
