#!/usr/bin/env python3
"""
Master video assembler (`edit.py`) for the Michi-Neko Tree & Cat Devlog.
Renders 2,826 frames (94.2s @ 30fps, 1080x1920 vertical) across 21 scenes,
combining real Three.js r160 WebGL plates, tracked 3D-to-2D leader-line callouts,
kinetic typography, code/shader cards, and our procedural stereo soundtrack into:
  docs/social/tree-and-cat-devlog/tree-and-cat-devlog-vertical.mp4
"""

import os
import sys
import math
import time
import tempfile
import subprocess
from PIL import Image, ImageDraw
import imageio_ffmpeg

from timeline import WIDTH, HEIGHT, FPS, SCENES, get_total_duration, get_scene_ranges
from music import build_soundtrack
from engine import (
    font_bold,
    font_regular,
    font_mono,
    make_base_backdrop,
    draw_rounded_panel,
    draw_pill,
    draw_tracked_callout,
    paste_plate_in_box,
    draw_header,
    draw_metrics_and_code,
    draw_stage_stepper,
    load_plate_image,
    ease_out_cubic,
    ease_in_out,
)

TREE_STEP_LABELS = [
    "Aug 23 · Icosahedra",
    "Sep 06 · Merged Bark",
    "Sep 09 · Bough+Cards",
    "Sep 24 · Clump Limit",
    "Oct 22 · Leaves+Mass",
]

CAT_STEP_LABELS = [
    "Aug–Sep · Primitives",
    "29-Bone Feline Rig",
    "50 SDF Shapes",
    "smin + Surface Nets",
    "Shader + 3 Gaits",
]


def draw_viewport_frame(draw, box, title_left, title_right=None, accent=(246, 168, 190)):
    x0, y0, x1, y1 = box
    draw_rounded_panel(
        draw,
        [x0, y0, x1, y1],
        fill=(13, 19, 27, 235),
        outline=(accent[0], accent[1], accent[2], 130),
        width=2,
        radius=24,
    )


def draw_viewport_overlay(draw, box, title_left, title_right=None, accent=(246, 168, 190)):
    x0, y0, x1, y1 = box
    L = 26
    c_br = (accent[0], accent[1], accent[2], 235)
    draw.line([(x0 + 14, y0 + 14 + L), (x0 + 14, y0 + 14), (x0 + 14 + L, y0 + 14)], fill=c_br, width=3)
    draw.line([(x1 - 14 - L, y0 + 14), (x1 - 14, y0 + 14), (x1 - 14, y0 + 14 + L)], fill=c_br, width=3)
    draw.line([(x0 + 14, y1 - 14 - L), (x0 + 14, y1 - 14), (x0 + 14 + L, y1 - 14)], fill=c_br, width=3)
    draw.line([(x1 - 14 - L, y1 - 14), (x1 - 14, y1 - 14), (x1 - 14, y1 - 14 - L)], fill=c_br, width=3)

    if title_left:
        draw_pill(
            draw,
            x0 + 24,
            y0 + 20,
            title_left,
            bg_color=(14, 21, 31, 245),
            text_color=(255, 255, 255, 252),
            border_color=(accent[0], accent[1], accent[2], 210),
            fnt=font_bold(18),
            pad_x=14,
            pad_y=6,
        )
    if title_right:
        fnt = font_mono(17)
        tb = draw.textbbox((0, 0), title_right, font=fnt)
        tw = tb[2] - tb[0] + 28
        draw_pill(
            draw,
            x1 - 24 - tw,
            y0 + 20,
            title_right,
            bg_color=(14, 21, 31, 245),
            text_color=(accent[0], accent[1], accent[2], 252),
            border_color=(110, 130, 155, 190),
            fnt=fnt,
            pad_x=14,
            pad_y=6,
        )


def draw_roadmap_cards(draw, local_t):
    """Draws the 2-column pipeline comparison in the lower deck (y = 1388..1766)."""
    col_w = (WIDTH - 88 - 20) // 2
    lx0, ly0 = 44, 1388
    lx1, ly1 = lx0 + col_w, 1766
    draw_rounded_panel(draw, [lx0, ly0, lx1, ly1], fill=(14, 22, 24, 244), outline=(246, 168, 190, 145), width=2, radius=20)
    draw.text((lx0 + 22, ly0 + 18), "ACT I · FOLIAGE REBUILD", font=font_bold(22), fill=(246, 168, 190, 255))
    tree_rows = [
        ("Stage 1", "cc1f7e2 · 26 Icosahedron blobs"),
        ("Stage 2", "a2c4fc6 · Root flare + merged tuft"),
        ("Stage 3", "ce00d8f · Recursive boughs + X-cards"),
        ("Stage 4", "e4fb486 · Scalloped pillow diagnosis"),
        ("Stage 5", "112c135 · Leaves-on-twigs + masses"),
    ]
    for i, (st, desc) in enumerate(tree_rows):
        ry = ly0 + 64 + i * 60
        draw_pill(draw, lx0 + 20, ry, st, bg_color=(20, 30, 36, 248), text_color=(246, 168, 190, 255), border_color=(246, 168, 190, 185), fnt=font_bold(16), pad_x=10, pad_y=4)
        draw.text((lx0 + 118, ry + 4), desc, font=font_regular(18), fill=(225, 235, 245, 248))

    rx0, ry0 = lx1 + 20, 1388
    rx1, ry1 = WIDTH - 44, 1766
    draw_rounded_panel(draw, [rx0, ry0, rx1, ry1], fill=(16, 21, 32, 244), outline=(248, 184, 108, 145), width=2, radius=20)
    draw.text((rx0 + 22, ry0 + 18), "ACT II · CAT SDF REBUILD", font=font_bold(22), fill=(248, 184, 108, 255))
    cat_rows = [
        ("Stage 1", "cc1f7e2 · 18 rigid spheres/cylinders"),
        ("Stage 2", "a2c4fc6 · Lathe torso + 4-link tail"),
        ("Stage 3", "9b76887 · 2-segment legs & paws"),
        ("Stage 4", "29-bone rig + 50 smin SDF shapes"),
        ("Stage 5", "Surface Nets + shader face + 3 gaits"),
    ]
    for i, (st, desc) in enumerate(cat_rows):
        ry = ry0 + 64 + i * 60
        draw_pill(draw, rx0 + 20, ry, st, bg_color=(22, 28, 42, 248), text_color=(248, 184, 108, 255), border_color=(248, 184, 108, 185), fnt=font_bold(16), pad_x=10, pad_y=4)
        draw.text((rx0 + 118, ry + 4), desc, font=font_regular(18), fill=(225, 235, 245, 248))


def render_frame(global_f, total_frames, total_dur, scene_ranges):
    global_t = global_f / float(FPS)
    # Find active scene
    active_idx = len(scene_ranges) - 1
    local_t = 0.0
    scene = scene_ranges[-1][3]
    for idx, s_start, s_end, sc in scene_ranges:
        if s_start <= global_t < s_end or idx == len(scene_ranges) - 1:
            active_idx = idx
            scene = sc
            local_t = max(0.0, global_t - s_start)
            break

    sid = scene["id"]
    local_f = int(round(local_t * FPS))
    u = min(1.0, local_t / max(0.001, scene["duration"]))

    if sid.startswith("tree_"):
        theme = "tree"
    elif sid.startswith("cat_"):
        theme = "cat"
    else:
        theme = "both"

    canvas = make_base_backdrop(theme).copy()
    draw = ImageDraw.Draw(canvas, "RGBA")

    draw_header(draw, scene, active_idx, len(scene_ranges), global_t, total_dur, local_t, theme=theme)

    # Central stage bounding box
    stage_box = (44, 276, WIDTH - 44, 1236)

    # =========================================================================
    # SCENE-SPECIFIC 3D VIEWPORT & TRACKED CALLOUT COMPOSITING
    # =========================================================================

    if sid == "hook_split":
        b_tl = (44, 276, 530, 746)
        b_tr = (550, 276, 1036, 746)
        b_bl = (44, 766, 530, 1236)
        b_br = (550, 766, 1036, 1236)

        draw_viewport_frame(draw, b_tl, "AUG 23 · TREE v1", "cc1f7e2", accent=(180, 195, 215))
        paste_plate_in_box(canvas, "tree_v1", local_f, b_tl, zoom=0.90, y_offset=22)

        draw_viewport_frame(draw, b_tr, "OCT 22 · HERO SAKURA v5", "112c135", accent=(246, 168, 190))
        paste_plate_in_box(canvas, "tree_v5_hero", local_f, b_tr, zoom=0.92, y_offset=22)

        draw_viewport_frame(draw, b_bl, "AUG 23 · RIGID CAT v1", "cc1f7e2", accent=(180, 195, 215))
        paste_plate_in_box(canvas, "cat_v1", local_f, b_bl, zoom=0.90, y_offset=20)

        draw_viewport_frame(draw, b_br, "OCT 22 · SDF VOXEL CAT v5", "Surface Nets", accent=(248, 184, 108))
        paste_plate_in_box(canvas, "cat_gaits", local_f + 28, b_br, zoom=0.92, y_offset=20)

        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, b_tl, "AUG 23 · TREE v1", "cc1f7e2", accent=(180, 195, 215))
        draw_viewport_overlay(draw, b_tr, "OCT 22 · HERO SAKURA v5", "112c135", accent=(246, 168, 190))
        draw_viewport_overlay(draw, b_bl, "AUG 23 · RIGID CAT v1", "cc1f7e2", accent=(180, 195, 215))
        draw_viewport_overlay(draw, b_br, "OCT 22 · SDF VOXEL CAT v5", "Surface Nets", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme=theme)
        draw_roadmap_cards(draw, local_t)
        draw_stage_stepper(draw, 4, TREE_STEP_LABELS, theme="tree")

    elif sid == "roadmap_overview":
        b_left = (44, 276, 530, 1236)
        b_right = (550, 276, 1036, 1236)
        draw_viewport_frame(draw, b_left, "ACT I · HERO CANOPY", "src/foliage.js", accent=(246, 168, 190))
        map_t = paste_plate_in_box(canvas, "tree_v5_hero", local_f, b_left, zoom=0.98, y_offset=24)

        draw_viewport_frame(draw, b_right, "ACT II · 29-BONE SDF CAT", "src/cat_sdf.js", accent=(248, 184, 108))
        map_c = paste_plate_in_box(canvas, "cat_blend", local_f + 35, b_right, zoom=0.98, y_offset=24)

        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, b_left, "ACT I · HERO CANOPY", "src/foliage.js", accent=(246, 168, 190))
        draw_viewport_overlay(draw, b_right, "ACT II · 29-BONE SDF CAT", "src/cat_sdf.js", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_t("blossom_spray"), (285, 420), "Leaf Sprays on Twigs", "leafSprayTexture('sakura')", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_t("scaffold_fork"), (285, 980), "4-Level Branch Wood", "Shared flex wind", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_c("head"), (790, 420), "4mm Head SDF Sculpt", "Slit-pupil shader eyes", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_c("shoulderL"), (790, 980), "9mm Body Surface Nets", "4-bone geodesic skin", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme=theme)
        draw_roadmap_cards(draw, local_t)
        draw_stage_stepper(draw, 0, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s1_proto":
        draw_viewport_frame(draw, stage_box, "STAGE 1 · v0.9 PROTOTYPE SAKURA", "commit cc1f7e2 (Aug 23)", accent=(246, 168, 190))
        map_fn = paste_plate_in_box(canvas, "tree_v1", local_f, stage_box, zoom=0.93, y_offset=24)
        if u > 0.35:
            wire_plate = load_plate_image("tree_v1_wire", local_f, target_size=(892, 892))
            split_x = int(892 * min(1.0, (u - 0.35) / 0.45))
            crop_wire = wire_plate.crop((0, 0, split_x, 892))
            px = 44 + (992 - 892) // 2
            py = 276 + (960 - 892) // 2 + 24
            canvas.alpha_composite(crop_wire, dest=(px, py))

        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 1 · v0.9 PROTOTYPE SAKURA", "commit cc1f7e2 (Aug 23)", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("crown_top"), (250, 395), "IcosahedronGeometry(1, 0)", "Flat-shaded low-poly blob", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("tip_cluster"), (820, 470), "26 Unmerged Meshes", "1 draw call per tuft!", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("branch_stub"), (825, 815), "5-Sided Branch Peg", "Straight cylinder stub", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("trunk_peg"), (255, 960), "7-Sided Trunk Cylinder", "No root flare or bark map", accent=(246, 168, 190))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 0, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s2_painterly":
        draw_viewport_frame(draw, stage_box, "STAGE 2 · PAINTERLY BARK & MERGED TUFTS", "commit a2c4fc6 (Sep 06)", accent=(246, 168, 190))
        map_fn = paste_plate_in_box(canvas, "tree_v2", local_f, stage_box, zoom=0.93, y_offset=24)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 2 · PAINTERLY BARK & MERGED TUFTS", "commit a2c4fc6 (Sep 06)", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("sunlit_crown"), (265, 390), "Single Merged Buffer", "mergeGeometries() -> 1 mesh", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("merged_tuft"), (810, 480), "lumpyTuftGeometry()", "3D value-noise displaced sphere", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("bark_fissure"), (815, 835), "256px Bark Normal Map", "Procedural FBM + lichen", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("root_flare"), (260, 1020), "Parabolic Root Flare", "1 + (1 - 4t)² × 0.55", accent=(246, 168, 190))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 1, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s3_clumps":
        draw_viewport_frame(draw, stage_box, "STAGE 3 · RECURSIVE BOUGHS & LEAF CARDS", "commit ce00d8f (Sep 09)", accent=(246, 168, 190))
        map_fn = paste_plate_in_box(canvas, "tree_v3", local_f, stage_box, zoom=0.93, y_offset=24)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 3 · RECURSIVE BOUGHS & LEAF CARDS", "commit ce00d8f (Sep 09)", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("crown_peak"), (260, 390), "Crown Fill Clumps", "SSS + top-lit gradient", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("crossed_card"), (815, 460), "Crossed Leaf Cards", "Alpha-cut leafCardTexture", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("tuft_pillow"), (255, 680), "Lumpy Clump Core", "3 tufts per branch node", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("primary_fork"), (810, 910), "Recursive buildBranch()", "6 primaries × 2 secondaries", accent=(246, 168, 190))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 2, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s4_problem":
        draw_viewport_frame(draw, stage_box, "STAGE 4 · DIAGNOSING THE 'BROCCOLI PILLOW' LIMITATION", "commit e4fb486 (Sep 24)", accent=(255, 145, 135))
        map_fn = paste_plate_in_box(canvas, "tree_v4", local_f, stage_box, zoom=0.94, y_offset=24)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 4 · DIAGNOSING THE 'BROCCOLI PILLOW' LIMITATION", "commit e4fb486 (Sep 24)", accent=(255, 145, 135))
        draw_tracked_callout(draw, map_fn("tuft_pillow"), (265, 420), "Opaque Pillow Core", "Blocks sky light through crown", accent=(255, 145, 135))
        draw_tracked_callout(draw, map_fn("crossed_card"), (810, 465), "Intersecting X-Planes", "Flat card seams visible close-up", accent=(255, 145, 135))
        draw_tracked_callout(draw, map_fn("crevice_pocket"), (265, 845), "Cauliflower Silhouette", "Reads as solid balls, not twigs", accent=(255, 145, 135))
        draw_tracked_callout(draw, map_fn("secondary_bough"), (815, 920), "Hidden Inner Wood", "Swallowed by opaque tuft blobs", accent=(255, 145, 135))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 3, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s5_arch":
        draw_viewport_frame(draw, stage_box, "STAGE 5A · 256px PROCEDURAL SPRAY & MASS TEXTURES", "commit 112c135 (Oct 22)", accent=(246, 168, 190))
        map_fn = paste_plate_in_box(canvas, "tree_textures", local_f, stage_box, zoom=0.94, y_offset=-10)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 5A · 256px PROCEDURAL SPRAY & MASS TEXTURES", "commit 112c135 (Oct 22)", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("spray_sakura"), (225, 365), "Sakura Twig Spray", "5-petal blossoms + fork", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("spray_maple"), (540, 355), "Palmate Maple Spray", "7-lobe serrated leaves", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("spray_needle"), (845, 365), "Akamatsu Needle Fan", "Paired pine needle clusters", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("mass_sakura"), (380, 1145), "Blossom Mass Map", "RGBA height + normal tilt", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("mass_shrub"), (810, 1145), "Shrub Leaf Mass Map", "Triplanar ragged cutout", accent=(246, 168, 190))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 4, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s5_hero":
        draw_viewport_frame(draw, stage_box, "STAGE 5B · HERO SAKURA: INDIVIDUAL LEAVES ON TWIGS", "style: 'leaves' (r < 39m)", accent=(246, 168, 190))
        map_fn = paste_plate_in_box(canvas, "tree_v5_hero", local_f, stage_box, zoom=0.94, y_offset=24)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 5B · HERO SAKURA: INDIVIDUAL LEAVES ON TWIGS", "style: 'leaves' (r < 39m)", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("crown_peak"), (265, 385), "Sunlit Crown Shell", "Radial AO = 0.52 -> 1.08", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("blossom_spray"), (815, 430), "Curved 2×2 Leaf Spray", "Oriented along twig tangent", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("twig_tip"), (820, 740), "4th-Order Shoot Twig", "Every spray attaches to wood", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("secondary_bough"), (260, 760), "Visible Inner Boughs", "Real sky windows between limbs", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("root_collar"), (265, 1080), "Gnarled Root Buttress", "Flared base + fissure bark", accent=(246, 168, 190))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 4, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s5_wind":
        draw_viewport_frame(draw, stage_box, "STAGE 5C · MACRO TWIG INSPECTION & SHARED VERTEX WIND", "createBranchMaterial() + flex", accent=(246, 168, 190))
        map_fn = paste_plate_in_box(canvas, "tree_v5_closeup", local_f, stage_box, zoom=0.94, y_offset=18)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 5C · MACRO TWIG INSPECTION & SHARED VERTEX WIND", "createBranchMaterial() + flex", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("sunlit_blossom"), (270, 395), "Tip Flutter Harmonic", "High-freq leaf edge wave", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("curved_spray"), (810, 455), "Zero Twig Detachment", "Wood & spray share aSway", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("inner_sky_gap"), (260, 770), "Natural Sky Aperture", "No opaque core geometry", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("tapering_twig"), (815, 890), "Tapering Twig Cylinder", "flex = 0 at trunk -> 1 at tip", accent=(246, 168, 190))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 4, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s5_species":
        b_left = (44, 276, 530, 1236)
        b_right = (550, 276, 1036, 1236)
        draw_viewport_frame(draw, b_left, "IROHA-MOMIJI · JAPANESE MAPLE", "mapleTree()", accent=(244, 132, 102))
        map_m = paste_plate_in_box(canvas, "tree_v5_maple", local_f, b_left, zoom=0.96, y_offset=24)

        draw_viewport_frame(draw, b_right, "AKAMATSU · JAPANESE RED PINE", "pineTree()", accent=(130, 208, 148))
        map_p = paste_plate_in_box(canvas, "tree_v5_pine", local_f, b_right, zoom=0.96, y_offset=24)

        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, b_left, "IROHA-MOMIJI · JAPANESE MAPLE", "mapleTree()", accent=(244, 132, 102))
        draw_viewport_overlay(draw, b_right, "AKAMATSU · JAPANESE RED PINE", "pineTree()", accent=(130, 208, 148))
        draw_tracked_callout(draw, map_m("palmate_spray"), (285, 420), "Horizontal Palmate Tiers", "Crimson-to-amber leaf sprays", accent=(244, 132, 102))
        draw_tracked_callout(draw, map_m("tiered_limb"), (285, 960), "Wide Sympodial Forking", "Sinusoidal branch bend", accent=(244, 132, 102))
        draw_tracked_callout(draw, map_p("needle_pad"), (790, 420), "Flat Cloud Needle Pads", "Layered horizontal foliage", accent=(130, 208, 148))
        draw_tracked_callout(draw, map_p("red_bark"), (790, 960), "Crooked Terracotta Trunk", "Warm red-pine upper bark", accent=(130, 208, 148))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 4, TREE_STEP_LABELS, theme="tree")

    elif sid == "tree_s5_rim":
        draw_viewport_frame(draw, stage_box, "STAGE 5E · RIM FOREST & STREET SHRUBS (PAINTED LEAF MASSES)", "style: 'masses' + bushGeometry()", accent=(142, 218, 152))
        map_fn = paste_plate_in_box(canvas, "tree_v5_rim", local_f, stage_box, zoom=0.94, y_offset=22)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 5E · RIM FOREST & STREET SHRUBS (PAINTED LEAF MASSES)", "style: 'masses' + bushGeometry()", accent=(142, 218, 152))
        draw_tracked_callout(draw, map_fn("rim_sakura_mass"), (265, 395), "Rim Sakura (r ≥ 39m)", "leafMassTexture('blossom')", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("rim_maple_mass"), (810, 415), "Rim Maple Crown", "Triplanar normal-tilted lobes", accent=(244, 132, 102))
        draw_tracked_callout(draw, map_fn("ragged_silhouette"), (255, 690), "Ragged Alpha Outline", "Breaks blob rim into leaves", accent=(142, 218, 152))
        draw_tracked_callout(draw, map_fn("azalea_cushion"), (270, 1075), "Flowering Street Shrub", "bushGeometry(lobes: 8)", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("green_shrub"), (810, 1075), "Interactive Cat Rustle", "Parted by uPlayerPos", accent=(142, 218, 152))

        draw_metrics_and_code(draw, scene, local_t, theme="tree")
        draw_stage_stepper(draw, 4, TREE_STEP_LABELS, theme="tree")

    elif sid == "cat_act_intro":
        b_left = (44, 276, 530, 1236)
        b_right = (550, 276, 1036, 1236)
        draw_viewport_frame(draw, b_left, "BEFORE · 18 RIGID PRIMITIVES", "commit cc1f7e2", accent=(180, 195, 215))
        map_old = paste_plate_in_box(canvas, "cat_v1", local_f, b_left, zoom=0.95, y_offset=20)

        draw_viewport_frame(draw, b_right, "AFTER · 29-BONE SDF VOXEL CAT", "Surface Nets + Shader", accent=(248, 184, 108))
        map_new = paste_plate_in_box(canvas, "cat_gaits", local_f, b_right, zoom=0.96, y_offset=20)

        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, b_left, "BEFORE · 18 RIGID PRIMITIVES", "commit cc1f7e2", accent=(180, 195, 215))
        draw_viewport_overlay(draw, b_right, "AFTER · 29-BONE SDF VOXEL CAT", "Surface Nets + Shader", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_old("body", (0.48, 0.48)), (285, 430), "Scaled Sphere Torso", "Hard seams at neck & hips", accent=(180, 195, 215))
        draw_tracked_callout(draw, map_old("front_leg", (0.36, 0.72)), (285, 980), "Rigid Cylinder Pegs", "No elbow, wrist, or hock", accent=(180, 195, 215))
        draw_tracked_callout(draw, map_new("head"), (790, 430), "Seamless Surface Nets", "50 smin primitives @ 9mm/4mm", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_new("forePawL"), (790, 980), "Digitigrade 4-Bone Limbs", "Geodesic skin weights", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_roadmap_cards(draw, local_t)
        draw_stage_stepper(draw, 0, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s1_s3_legacy":
        b1 = (44, 276, 364, 1236)
        b2 = (378, 276, 698, 1236)
        b3 = (712, 276, 1036, 1236)
        draw_viewport_frame(draw, b1, "v1 · AUG 23", "cc1f7e2", accent=(180, 195, 215))
        m1 = paste_plate_in_box(canvas, "cat_v1", local_f, b1, zoom=0.98, y_offset=20)

        draw_viewport_frame(draw, b2, "v2 · SEP 06", "a2c4fc6", accent=(210, 190, 150))
        m2 = paste_plate_in_box(canvas, "cat_v2", local_f, b2, zoom=0.98, y_offset=20)

        draw_viewport_frame(draw, b3, "v3 · SEP 20", "9b76887", accent=(248, 184, 108))
        m3 = paste_plate_in_box(canvas, "cat_v3", local_f, b3, zoom=0.98, y_offset=20)

        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, b1, "v1 · AUG 23", "cc1f7e2", accent=(180, 195, 215))
        draw_viewport_overlay(draw, b2, "v2 · SEP 06", "a2c4fc6", accent=(210, 190, 150))
        draw_viewport_overlay(draw, b3, "v3 · SEP 20", "9b76887", accent=(248, 184, 108))
        draw_tracked_callout(draw, m1("front_leg", (0.38, 0.68)), (204, 980), "1-Piece Peg Leg", "Swings from hip/chest", accent=(180, 195, 215))
        draw_tracked_callout(draw, m2("body", (0.52, 0.48)), (538, 430), "LatheGeometry Spine", "+ 4-segment tail chain", accent=(210, 190, 150))
        draw_tracked_callout(draw, m3("front_leg", (0.38, 0.68)), (874, 980), "2-Segment Limb", "Still cracks at joint seam!", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 0, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s4_skeleton":
        draw_viewport_frame(draw, stage_box, "STAGE 4A · 29-BONE DIGITIGRADE FELINE SKELETON", "src/cat_anatomy.js · buildBones()", accent=(248, 184, 108))
        map_fn = paste_plate_in_box(canvas, "cat_skeleton", local_f, stage_box, zoom=0.94, y_offset=20)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 4A · 29-BONE DIGITIGRADE FELINE SKELETON", "src/cat_anatomy.js · buildBones()", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("head"), (255, 395), "Head + Ear Bones", "head, earL, earR", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("chest"), (260, 640), "Spine Chain (4 Bones)", "hips -> waist -> chest -> neck", accent=(92, 224, 168))
        draw_tracked_callout(draw, map_fn("elbowL"), (820, 745), "Forelimb (5 Bones x 2)", "scap -> hum -> forearm -> wrist -> paw", accent=(102, 184, 255))
        draw_tracked_callout(draw, map_fn("hockL"), (260, 960), "Digitigrade Hock", "femur -> tibia -> meta -> hpaw", accent=(199, 146, 234))
        draw_tracked_callout(draw, map_fn("tail3"), (820, 405), "6-Bone Tail Chain", "tail0 .. tail5 wave", accent=(247, 140, 108))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 1, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s4_primitives":
        draw_viewport_frame(draw, stage_box, "STAGE 4B · 50 ANATOMICAL SDF PRIMITIVES", "Ellipsoids + Tapered Capsules", accent=(248, 184, 108))
        map_fn = paste_plate_in_box(canvas, "cat_primitives", local_f, stage_box, zoom=0.94, y_offset=20)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 4B · 50 ANATOMICAL SDF PRIMITIVES", "Ellipsoids + Tapered Capsules", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("head"), (815, 395), "13 Cranial Volumes", "Skull, muzzle, chin, cheek jowls", accent=(255, 133, 102))
        draw_tracked_callout(draw, map_fn("spine1"), (265, 410), "7 Trunk Ellipsoids", "Ribcage, waist, pelvis, neck", accent=(92, 224, 168))
        draw_tracked_callout(draw, map_fn("shoulderL"), (820, 760), "Scapula & Forelimb", "Tapered muscle cones", accent=(102, 184, 255))
        draw_tracked_callout(draw, map_fn("hipL"), (260, 920), "Haunch & Hock Cones", "Anatomical thigh & Achilles", accent=(199, 146, 234))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 2, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s4_smin_sculpt":
        draw_viewport_frame(draw, stage_box, "STAGE 4C · SMOOTH-MIN (smin) VOXEL FIELD & SURFACE NETS", "src/cat_sdf.js · 9mm/4mm Grid", accent=(248, 184, 108))
        map_fn = paste_plate_in_box(canvas, "cat_blend", local_f, stage_box, zoom=0.94, y_offset=20)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 4C · SMOOTH-MIN (smin) VOXEL FIELD & SURFACE NETS", "src/cat_sdf.js · 9mm/4mm Grid", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("head"), (815, 395), "4mm Head Pass", "Crisp ear rims & muzzle bridge", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("spine1"), (265, 420), "Polynomial smin(a,b,k)", "Fuses 50 shapes with zero seams", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("shoulderL"), (820, 880), "Dual Surface Nets", "6-pass Taubin fairing", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("hockL"), (260, 940), "Central-Diff Normals", "Evaluated from grad(SDF)", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 3, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s4_weights":
        draw_viewport_frame(draw, stage_box, "STAGE 4D · 4-BONE GEODESIC SKIN WEIGHTS IN MOTION", "computeSkinWeights() Heatmap", accent=(248, 184, 108))
        map_fn = paste_plate_in_box(canvas, "cat_weights", local_f, stage_box, zoom=0.94, y_offset=20)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 4D · 4-BONE GEODESIC SKIN WEIGHTS IN MOTION", "computeSkinWeights() Heatmap", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("shoulderL"), (815, 415), "Shoulder Blend Zone", "chest + scapL + humerusL", accent=(102, 184, 255))
        draw_tracked_callout(draw, map_fn("chest"), (260, 415), "Spine Flex Gradient", "Smooth ribcage-to-pelvis arc", accent=(92, 224, 168))
        draw_tracked_callout(draw, map_fn("hipL"), (265, 930), "Haunch & Stifle Weight", "Zero pinching during gallop", accent=(199, 146, 234))
        draw_tracked_callout(draw, map_fn("forePawL"), (815, 950), "Sign-Isolated Limbs", "Left/right legs never cross-bleed", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 3, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s5_face":
        draw_viewport_frame(draw, stage_box, "STAGE 5A · SHADER-PAINTED FACE, SLIT PUPILS & WHISKERS", "src/cat_shading.js", accent=(248, 184, 108))
        map_fn = paste_plate_in_box(canvas, "cat_face", local_f, stage_box, zoom=0.94, y_offset=18)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 5A · SHADER-PAINTED FACE, SLIT PUPILS & WHISKERS", "src/cat_shading.js", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("earR"), (255, 390), "Inner Pinna & Fur Tuft", "Warm pink concha + hair cards", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("earL"), (815, 390), "3D Tabby 'M' Markings", "World-pos procedural coat shader", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("eyeR"), (250, 680), "Slit Pupil + Cornea Glint", "Radial iris fibers + live blink", accent=(130, 220, 175))
        draw_tracked_callout(draw, map_fn("noseTip"), (825, 760), "Leather Rhinarium Pad", "3D philtrum groove + highlight", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("whiskerL"), (265, 1020), "Tapered Whisker Arcs", "12 curved vibrissae meshes", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 4, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s5_gaits":
        gait_name = "4-BEAT LATERAL WALK (1.3 m/s)" if u < 0.34 else ("2-BEAT DIAGONAL TROT (4.6 m/s)" if u < 0.68 else "ASYMMETRIC ROTARY GALLOP (7.6 m/s)")
        draw_viewport_frame(draw, stage_box, f"STAGE 5B · {gait_name}", "src/cat.js · Phase-Locked Gaits", accent=(248, 184, 108))
        map_fn = paste_plate_in_box(canvas, "cat_gaits", local_f, stage_box, zoom=0.94, y_offset=20)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, f"STAGE 5B · {gait_name}", "src/cat.js · Phase-Locked Gaits", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("chest"), (815, 405), "Dynamic Spine Flexion", "Sagittal wave scales with speed", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("tail3"), (260, 415), "Counter-Balanced Tail", "Phase-lagged travelling S-wave", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("forePawL"), (820, 960), "Swing Phase Paw Lift", "Wrist curls during protraction", accent=(102, 184, 255))
        draw_tracked_callout(draw, map_fn("hindPawL"), (260, 960), "Ground-Pinned Stance", "-sin(u·π) locks paw to y = 0", accent=(92, 224, 168))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 4, CAT_STEP_LABELS, theme="cat")

    elif sid == "cat_s5_builds":
        draw_viewport_frame(draw, stage_box, "STAGE 5C · EXPRESSIVE POSES & 4 VILLAGER PROPORTIONS", "michi · mochi · luna · kuro", accent=(248, 184, 108))
        map_fn = paste_plate_in_box(canvas, "cat_poses_builds", local_f, stage_box, zoom=0.94, y_offset=20)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "STAGE 5C · EXPRESSIVE POSES & 4 VILLAGER PROPORTIONS", "michi · mochi · luna · kuro", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("michi_tag"), (265, 410), "Michi · Alert Sit", "Balanced build (girth 1.00)", accent=(248, 184, 108))
        draw_tracked_callout(draw, map_fn("luna_tag"), (815, 410), "Luna · Play-Bow Stretch", "Slender build (legLen 1.07)", accent=(158, 214, 255))
        draw_tracked_callout(draw, map_fn("mochi_tag"), (265, 1010), "Mochi · Curled Sleep", "Plump build (girth 1.20)", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("kuro_tag"), (815, 1010), "Kuro · Paw Grooming", "Broad shoulders + amber eyes", accent=(199, 146, 234))

        draw_metrics_and_code(draw, scene, local_t, theme="cat")
        draw_stage_stepper(draw, 4, CAT_STEP_LABELS, theme="cat")

    elif sid == "finale_showcase":
        draw_viewport_frame(draw, stage_box, "FINALE · LIVING KYOTO: TREES & CAT UNITED", "Pure Three.js r160 · 60 FPS", accent=(246, 168, 190))
        map_fn = paste_plate_in_box(canvas, "finale_scene", local_f, stage_box, zoom=0.94, y_offset=20)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw_viewport_overlay(draw, stage_box, "FINALE · LIVING KYOTO: TREES & CAT UNITED", "Pure Three.js r160 · 60 FPS", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("sakura_crown"), (265, 415), "Hero Sakura ('leaves')", "Individual sprays + shared wind", accent=(246, 168, 190))
        draw_tracked_callout(draw, map_fn("maple_crown"), (815, 415), "Hero Maple ('leaves')", "Tiered palmate autumn crown", accent=(244, 132, 102))
        draw_tracked_callout(draw, map_fn("azalea_bush"), (260, 940), "Street Shrub ('masses')", "bushGeometry + leafMassTexture", accent=(142, 218, 152))
        draw_tracked_callout(draw, map_fn("head"), (815, 940), "Michi (29-Bone SDF)", "Voxel-sculpted & shader-painted", accent=(248, 184, 108))

        draw_metrics_and_code(draw, scene, local_t, theme="both")
        draw_roadmap_cards(draw, local_t)
        draw_stage_stepper(draw, 4, CAT_STEP_LABELS, theme="cat")

    if local_f < 4:
        flash_alpha = int((4 - local_f) * 14)
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, flash_alpha))
        canvas.alpha_composite(overlay)

    return canvas.convert("RGB")


def build_video():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
    out_mp4 = os.path.join(
        repo_root,
        "docs",
        "social",
        "tree-and-cat-devlog",
        "tree-and-cat-devlog-vertical.mp4",
    )
    os.makedirs(os.path.dirname(out_mp4), exist_ok=True)

    wav_path = os.path.join(tempfile.gettempdir(), "tree-cat-cap", "soundtrack.wav")
    if not os.path.exists(wav_path):
        build_soundtrack(wav_path)

    total_dur = get_total_duration()
    total_frames = int(round(total_dur * FPS))
    scene_ranges = get_scene_ranges()

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        "-y",
        "-f",
        "rawvideo",
        "-vcodec",
        "rawvideo",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-pix_fmt",
        "rgb24",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-i",
        wav_path,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        out_mp4,
    ]

    print(f"[edit] Rendering {total_frames} frames ({total_dur:.1f}s @ {FPS}fps, {WIDTH}x{HEIGHT}) -> {out_mp4}")
    t0 = time.time()
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    for f in range(total_frames):
        rgb_img = render_frame(f, total_frames, total_dur, scene_ranges)
        proc.stdin.write(rgb_img.tobytes())
        if (f + 1) % 150 == 0 or f == total_frames - 1:
            elapsed = time.time() - t0
            fps_rate = (f + 1) / max(0.001, elapsed)
            print(f"[edit] Frame {f + 1:4d}/{total_frames} ({100.0 * (f + 1) / total_frames:5.1f}%) — {fps_rate:.1f} fps")

    proc.stdin.close()
    stderr_out = proc.stderr.read().decode("utf-8", errors="replace")
    ret = proc.wait()
    if ret != 0:
        print(stderr_out)
        raise RuntimeError(f"ffmpeg exited with code {ret}")

    size_mb = os.path.getsize(out_mp4) / (1024 * 1024)
    print(f"[edit] Completed {out_mp4} ({size_mb:.2f} MB) in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    build_video()
