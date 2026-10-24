#!/usr/bin/env python3
"""
2D/3D vertical frame compositor engine for the Michi-Neko Tree & Cat Devlog (1080x1920).
Loads RGBA WebGL frame sequences + per-frame projected 3D anchor coordinates from
Temp/tree-cat-cap/out/<shot>/ and composites:
  - Studio backdrop gradients, subtle architectural grid & floating bokeh particles
  - Top header with Act badge, Stage pill, Commit tag, kinetic Title & Subtitle
  - Central 3D viewport(s) with tracked 2D leader-line callouts & target reticles
  - 4-column engineering telemetry metric cards
  - Syntax-highlighted JS / GLSL code inspector card
  - Bottom 5-stage evolutionary progress stepper
"""

import os
import json
import math
import tempfile
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

from timeline import WIDTH, HEIGHT, FPS

PLATE_ROOT = os.path.join(tempfile.gettempdir(), "tree-cat-cap", "out")


def _find_font(candidates, size):
    windir = os.environ.get("WINDIR", r"C:\Windows")
    font_dir = os.path.join(windir, "Fonts")
    for name in candidates:
        p = os.path.join(font_dir, name)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


@lru_cache(maxsize=64)
def font_bold(size):
    return _find_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"], size)


@lru_cache(maxsize=64)
def font_regular(size):
    return _find_font(["segoeui.ttf", "arial.ttf", "calibri.ttf"], size)


@lru_cache(maxsize=64)
def font_mono(size):
    return _find_font(["consolab.ttf", "consola.ttf", "courbd.ttf", "lucon.ttf"], size)


@lru_cache(maxsize=32)
def load_shot_meta(shot_name):
    meta_path = os.path.join(PLATE_ROOT, shot_name, "meta.json")
    if not os.path.exists(meta_path):
        return {"w": 800, "h": 800, "fps": 30, "frames": []}
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=2048)
def load_plate_image(shot_name, frame_idx, target_size=None):
    shot_dir = os.path.join(PLATE_ROOT, shot_name)
    meta = load_shot_meta(shot_name)
    n_frames = max(1, len(meta.get("frames", [])))
    if not os.path.exists(shot_dir):
        img = Image.new("RGBA", target_size or (800, 800), (0, 0, 0, 0))
        return img
    idx = frame_idx % n_frames
    p = os.path.join(shot_dir, f"frame_{idx:04d}.png")
    if not os.path.exists(p):
        # Fallback to any available frame
        files = sorted([x for x in os.listdir(shot_dir) if x.endswith(".png")])
        if not files:
            return Image.new("RGBA", target_size or (800, 800), (0, 0, 0, 0))
        p = os.path.join(shot_dir, files[idx % len(files)])
    img = Image.open(p).convert("RGBA")
    if target_size and img.size != target_size:
        img = img.resize(target_size, Image.Resampling.LANCZOS)
    return img


def get_shot_anchors(shot_name, frame_idx):
    meta = load_shot_meta(shot_name)
    frames = meta.get("frames", [])
    if not frames:
        return {}, meta.get("w", 800), meta.get("h", 800)
    raw_idx = frame_idx % len(frames)
    # In capture.js, stepFn() ran before renderer.render(), so frame i+1 holds frame i's camera matrix
    idx = min(len(frames) - 1, raw_idx + 1) if len(frames) > 1 else 0
    info = frames[idx] or {}
    return info.get("anchors", {}), meta.get("w", 800), meta.get("h", 800)


def ease_out_cubic(x):
    x = max(0.0, min(1.0, x))
    return 1.0 - (1.0 - x) ** 3


def ease_in_out(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3.0 - 2.0 * x)


@lru_cache(maxsize=4)
def make_base_backdrop(theme="tree"):
    """Precomputes the 1080x1920 vertical dark-mode editorial canvas with subtle grid."""
    arr = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
    y_norm = np.linspace(0.0, 1.0, HEIGHT)[:, None]
    x_norm = np.linspace(0.0, 1.0, WIDTH)[None, :]

    if theme == "tree":
        top_c = np.array([15, 23, 22], dtype=np.float32)
        mid_c = np.array([20, 31, 28], dtype=np.float32)
        bot_c = np.array([11, 16, 18], dtype=np.float32)
        glow_c = np.array([235, 145, 168], dtype=np.float32)
    elif theme == "cat":
        top_c = np.array([16, 20, 30], dtype=np.float32)
        mid_c = np.array([22, 27, 40], dtype=np.float32)
        bot_c = np.array([11, 14, 22], dtype=np.float32)
        glow_c = np.array([242, 166, 90], dtype=np.float32)
    else:
        top_c = np.array([18, 22, 28], dtype=np.float32)
        mid_c = np.array([26, 30, 38], dtype=np.float32)
        bot_c = np.array([12, 15, 20], dtype=np.float32)
        glow_c = np.array([245, 185, 120], dtype=np.float32)

    for c in range(3):
        upper = top_c[c] * (1.0 - y_norm) + mid_c[c] * y_norm
        lower = mid_c[c] * (1.0 - y_norm) + bot_c[c] * y_norm
        arr[:, :, c] = np.where(y_norm < 0.55, upper, lower)

    # Radial studio glow behind the 3D stage center (x=540, y=750)
    dx = (x_norm - 0.5) * 1.85
    dy = (y_norm - 0.39) * 2.6
    r2 = dx * dx + dy * dy
    radial = np.exp(-r2 * 2.4) * 0.16
    for c in range(3):
        arr[:, :, c] += glow_c[c] * radial

    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB").convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # Subtle technical grid lines
    for gx in range(60, WIDTH, 60):
        draw.line([(gx, 0), (gx, HEIGHT)], fill=(255, 255, 255, 7), width=1)
    for gy in range(60, HEIGHT, 60):
        draw.line([(0, gy), (WIDTH, gy)], fill=(255, 255, 255, 7), width=1)

    return img


def draw_rounded_panel(draw, box, fill, outline=None, width=2, radius=22):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_pill(draw, x, y, text, bg_color, text_color=(255, 255, 255, 255), border_color=None, fnt=None, pad_x=16, pad_y=7):
    if fnt is None:
        fnt = font_bold(19)
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + pad_x * 2
    h = th + pad_y * 2
    draw.rounded_rectangle(
        [x, y, x + w, y + h],
        radius=h // 2,
        fill=bg_color,
        outline=border_color,
        width=2 if border_color else 0,
    )
    draw.text((x + pad_x, y + pad_y - bbox[1]), text, font=fnt, fill=text_color)
    return w, h


def draw_tracked_callout(draw, anchor_xy, label_xy, title, subtitle=None, accent=(255, 182, 198)):
    """Draws a glowing target reticle on the 3D model, an angled leader line, and a label card."""
    ax, ay = anchor_xy
    lx, ly = label_xy

    f_title = font_bold(19)
    f_sub = font_mono(15)
    tb = draw.textbbox((0, 0), title, font=f_title)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    sw, sh = 0, 0
    if subtitle:
        sb = draw.textbbox((0, 0), subtitle, font=f_sub)
        sw = sb[2] - sb[0]
        sh = sb[3] - sb[1] + 5

    card_w = max(tw, sw) + 26
    card_h = th + sh + 16
    cx0 = int(lx - card_w // 2)
    cy0 = int(ly - card_h // 2)
    cx0 = max(56, min(WIDTH - 56 - card_w, cx0))
    cy0 = max(280, min(1215 - card_h, cy0))
    cx1 = cx0 + card_w
    cy1 = cy0 + card_h

    # Connection point on card nearest to anchor
    conn_x = cx1 if ax > (cx0 + cx1) * 0.5 else cx0
    conn_y = (cy0 + cy1) // 2
    elbow_x = int(conn_x + (18 if ax > conn_x else -18))
    elbow_y = conn_y

    # Leader line with dark halo
    pts = [(int(ax), int(ay)), (elbow_x, elbow_y), (conn_x, conn_y)]
    draw.line(pts, fill=(10, 14, 20, 210), width=5)
    draw.line(pts, fill=(accent[0], accent[1], accent[2], 245), width=2)

    # Target reticle at 3D anchor
    r = 6
    draw.ellipse([ax - r - 3, ay - r - 3, ax + r + 3, ay + r + 3], fill=(10, 14, 20, 180))
    draw.ellipse([ax - r, ay - r, ax + r, ay + r], fill=(accent[0], accent[1], accent[2], 255))
    draw.ellipse([ax - 2, ay - 2, ax + 2, ay + 2], fill=(255, 255, 255, 255))

    # Label pill box
    draw.rounded_rectangle(
        [cx0, cy0, cx1, cy1],
        radius=11,
        fill=(14, 20, 28, 232),
        outline=(accent[0], accent[1], accent[2], 220),
        width=2,
    )
    draw.text((cx0 + 13, cy0 + 7 - tb[1]), title, font=f_title, fill=(255, 255, 255, 250))
    if subtitle:
        draw.text(
            (cx0 + 13, cy0 + 9 + th - sb[1] + 2),
            subtitle,
            font=f_sub,
            fill=(accent[0], accent[1], accent[2], 235),
        )


def paste_plate_in_box(canvas, shot_name, frame_idx, box, zoom=1.0, y_offset=0):
    """Pastes a 3D plate into `box = (x0, y0, x1, y1)` and returns a helper to map 2D anchors."""
    x0, y0, x1, y1 = box
    bw = x1 - x0
    bh = y1 - y0
    side = int(min(bw, bh) * zoom)
    plate = load_plate_image(shot_name, frame_idx, target_size=(side, side))
    px = x0 + (bw - side) // 2
    py = y0 + (bh - side) // 2 + y_offset
    canvas.alpha_composite(plate, dest=(px, py))

    anchors, orig_w, orig_h = get_shot_anchors(shot_name, frame_idx)
    sx = side / float(max(1, orig_w))
    sy = side / float(max(1, orig_h))

    def map_anchor(key, fallback_uv=(0.5, 0.5)):
        if key in anchors:
            ax, ay, _az = anchors[key]
            rx = px + ax * sx
            ry = py + ay * sy
        else:
            rx = px + fallback_uv[0] * side
            ry = py + fallback_uv[1] * side
        rx = max(x0 + 36, min(x1 - 36, rx))
        ry = max(y0 + 68, min(y1 - 32, ry))
        return (rx, ry)

    return map_anchor


def draw_header(draw, scene, scene_idx, total_scenes, global_t, total_dur, local_t, theme="tree"):
    accent = (246, 168, 190) if theme == "tree" else ((248, 184, 108) if theme == "cat" else (158, 214, 255))

    # Top progress bar
    prog_w = int((global_t / max(0.001, total_dur)) * (WIDTH - 88))
    draw.rounded_rectangle([44, 24, WIDTH - 44, 32], radius=4, fill=(32, 42, 56, 255))
    if prog_w > 4:
        draw.rounded_rectangle([44, 24, 44 + prog_w, 32], radius=4, fill=(accent[0], accent[1], accent[2], 255))

    # Act & timestamp row
    f_act = font_bold(18)
    draw.text((44, 44), scene["act"], font=f_act, fill=(accent[0], accent[1], accent[2], 245))
    time_str = f"{int(global_t // 60):02d}:{global_t % 60:04.1f} / {int(total_dur // 60):02d}:{total_dur % 60:04.1f}  ·  SCENE {scene_idx + 1:02d}/{total_scenes:02d}"
    tb = draw.textbbox((0, 0), time_str, font=font_mono(17))
    draw.text((WIDTH - 44 - (tb[2] - tb[0]), 44), time_str, font=font_mono(17), fill=(195, 208, 222, 225))

    # Step badge + Commit pill row
    w_badge, _ = draw_pill(
        draw,
        44,
        74,
        scene["step_badge"],
        bg_color=(18, 26, 38, 248),
        text_color=(accent[0], accent[1], accent[2], 255),
        border_color=(accent[0], accent[1], accent[2], 210),
        fnt=font_bold(18),
        pad_x=14,
        pad_y=5,
    )
    draw_pill(
        draw,
        44 + w_badge + 12,
        74,
        scene["commit"],
        bg_color=(18, 26, 38, 245),
        text_color=(220, 232, 245, 250),
        border_color=(110, 130, 155, 180),
        fnt=font_mono(17),
        pad_x=14,
        pad_y=5,
    )

    # Kinetic title entrance
    enter = ease_out_cubic(local_t / 0.35)
    y_slide = int((1.0 - enter) * 14)
    f_title = font_bold(42)
    lines = scene["title"].split("\n")
    ty = 118 + y_slide
    for ln in lines:
        draw.text((44, ty), ln, font=f_title, fill=(255, 255, 255, int(255 * enter)))
        ty += 48

    # Subtitle
    f_sub = font_regular(21)
    draw.text((44, ty + 6), scene["subtitle"], font=f_sub, fill=(195, 210, 225, int(235 * enter)))


def draw_metrics_and_code(draw, scene, local_t, theme="tree"):
    accent = (246, 168, 190) if theme == "tree" else ((248, 184, 108) if theme == "cat" else (158, 214, 255))

    # 1. 4-Column Telemetry Metric Cards (y = 1254 .. 1372)
    metrics = scene.get("metrics", [])
    if metrics:
        gap = 14
        total_w = WIDTH - 88
        card_w = (total_w - gap * (len(metrics) - 1)) // len(metrics)
        for i, (k, v) in enumerate(metrics):
            cx0 = 44 + i * (card_w + gap)
            cy0 = 1254
            cx1 = cx0 + card_w
            cy1 = 1368
            draw_rounded_panel(
                draw,
                [cx0, cy0, cx1, cy1],
                fill=(16, 23, 32, 240),
                outline=(80, 98, 120, 140),
                width=2,
                radius=16,
            )
            draw.line([(cx0 + 16, cy0 + 2), (cx0 + 72, cy0 + 2)], fill=(accent[0], accent[1], accent[2], 235), width=3)
            draw.text((cx0 + 14, cy0 + 18), k, font=font_bold(15), fill=(165, 182, 202, 235))

            # Auto-fit value font size so text never clips card border
            f_val = font_bold(22)
            for sz in (22, 20, 18, 16, 15):
                f_try = font_bold(sz)
                vb = draw.textbbox((0, 0), v, font=f_try)
                if (vb[2] - vb[0]) <= (card_w - 26):
                    f_val = f_try
                    break
            draw.text((cx0 + 14, cy0 + 54), v, font=f_val, fill=(255, 255, 255, 252))

    # 2. Code / Shader Inspector Card (y = 1388 .. 1768)
    code_lines = scene.get("code")
    if code_lines:
        bx0, by0, bx1, by1 = 44, 1388, WIDTH - 44, 1766
        draw_rounded_panel(
            draw,
            [bx0, by0, bx1, by1],
            fill=(11, 16, 24, 246),
            outline=(accent[0], accent[1], accent[2], 140),
            width=2,
            radius=20,
        )
        # Window header bar
        draw.rounded_rectangle(
            [bx0 + 2, by0 + 2, bx1 - 2, by0 + 48],
            radius=18,
            fill=(22, 30, 44, 255),
        )
        # Traffic dots
        for di, dc in enumerate([(255, 98, 92), (255, 189, 68), (40, 205, 65)]):
            dx = bx0 + 24 + di * 22
            dy = by0 + 25
            draw.ellipse([dx - 6, dy - 6, dx + 6, dy + 6], fill=dc)

        hdr_label = f"SOURCE INSPECTOR  ·  {scene['commit']}"
        draw.text((bx0 + 98, by0 + 14), hdr_label, font=font_mono(17), fill=(195, 212, 232, 245))

        f_code = font_mono(19)
        f_num = font_mono(17)
        cy = by0 + 68
        for idx, line in enumerate(code_lines):
            reveal = ease_out_cubic((local_t - idx * 0.12) / 0.35)
            alpha = int(255 * reveal)
            draw.text((bx0 + 20, cy + 2), f"{idx + 1:02d}", font=f_num, fill=(102, 122, 148, alpha))

            # Simple syntax tinting
            if line.strip().startswith("//"):
                col = (132, 198, 152, alpha)
            elif any(k in line for k in ["const ", "function ", "return ", "vec3 ", "float "]):
                col = (245, 218, 152, alpha)
            else:
                col = (228, 238, 250, alpha)
            draw.text((bx0 + 62, cy), line, font=f_code, fill=col)
            cy += 68


def draw_stage_stepper(draw, active_stage_idx, labels, theme="tree"):
    """Draws the 5-stage evolutionary progress bar at y = 1790 .. 1882."""
    accent = (246, 168, 190) if theme == "tree" else (248, 184, 108)
    bx0, by0, bx1, by1 = 44, 1790, WIDTH - 44, 1884
    draw_rounded_panel(
        draw,
        [bx0, by0, bx1, by1],
        fill=(14, 20, 29, 230),
        outline=(255, 255, 255, 32),
        width=1,
        radius=18,
    )

    n = len(labels)
    step_w = (bx1 - bx0 - 40) // n
    for i, lbl in enumerate(labels):
        cx = bx0 + 20 + i * step_w + step_w // 2
        cy = by0 + 32
        is_active = i == active_stage_idx
        is_done = i < active_stage_idx

        if i < n - 1:
            nx = bx0 + 20 + (i + 1) * step_w + step_w // 2
            line_col = (accent[0], accent[1], accent[2], 210) if is_done else (255, 255, 255, 40)
            draw.line([(cx + 16, cy), (nx - 16, cy)], fill=line_col, width=3)

        r = 14 if is_active else 11
        if is_active:
            draw.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=(accent[0], accent[1], accent[2], 65))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(accent[0], accent[1], accent[2], 255))
            num_col = (14, 20, 28, 255)
            txt_col = (255, 255, 255, 255)
        elif is_done:
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(accent[0], accent[1], accent[2], 175))
            num_col = (14, 20, 28, 255)
            txt_col = (200, 215, 230, 230)
        else:
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(32, 42, 56, 255), outline=(255, 255, 255, 65), width=2)
            num_col = (165, 180, 200, 220)
            txt_col = (140, 155, 175, 195)

        s_num = str(i + 1)
        nb = draw.textbbox((0, 0), s_num, font=font_bold(16))
        draw.text((cx - (nb[2] - nb[0]) // 2, cy - (nb[3] - nb[1]) // 2 - nb[1]), s_num, font=font_bold(16), fill=num_col)

        lb = draw.textbbox((0, 0), lbl, font=font_bold(16))
        draw.text((cx - (lb[2] - lb[0]) // 2, by0 + 56), lbl, font=font_bold(16), fill=txt_col)
