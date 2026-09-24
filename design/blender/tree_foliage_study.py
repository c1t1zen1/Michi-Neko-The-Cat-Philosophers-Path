"""Blender silhouette study for Michi-Neko's procedural tree families.

Run with:
  blender --background --factory-startup --python design/blender/tree_foliage_study.py
"""

from pathlib import Path
import math
import random

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "design" / "blender" / "renders"
OUTPUT.mkdir(parents=True, exist_ok=True)
random.seed(240924)


def material(name, color):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.roughness = 0.95
    return value


BARK = material("Ink-warm bark", (0.20, 0.11, 0.06))
SAKURA = [material("Sakura shadow", (0.48, 0.17, 0.30)), material("Sakura mid", (0.82, 0.40, 0.57)), material("Sakura light", (1.0, 0.70, 0.78))]
MAPLE = [material("Maple shadow", (0.34, 0.08, 0.03)), material("Maple mid", (0.70, 0.19, 0.07)), material("Maple light", (0.96, 0.45, 0.17))]
PINE = [material("Pine shadow", (0.03, 0.16, 0.10)), material("Pine mid", (0.09, 0.33, 0.20)), material("Pine light", (0.30, 0.52, 0.30))]
CEDAR = [material("Cedar shadow", (0.02, 0.12, 0.08)), material("Cedar mid", (0.07, 0.27, 0.18)), material("Cedar light", (0.22, 0.44, 0.25))]
GROUND = material("Warm ground", (0.24, 0.21, 0.15))


def smooth(value):
    for polygon in value.data.polygons:
        polygon.use_smooth = True
    return value


def limb(name, start, end, r0, r1):
    start, end = Vector(start), Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=r0, radius2=r1, depth=direction.length, location=(start + end) * 0.5)
    value = bpy.context.object
    value.name = name
    value.rotation_mode = "QUATERNION"
    value.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    value.data.materials.append(BARK)
    return smooth(value)


def cloud(name, location, scale, palette, light):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=location)
    value = bpy.context.object
    value.name = name
    value.scale = scale
    value.data.materials.append(palette[light])
    modifier = value.modifiers.new("Scalloped painted mass", "DISPLACE")
    texture = bpy.data.textures.new(f"{name} scallops", type="VORONOI")
    texture.noise_scale = 0.42
    modifier.texture = texture
    modifier.strength = min(scale) * 0.16
    modifier.texture_coords = "GLOBAL"
    return smooth(value)


def branching_tree(name, x, palette, profile):
    lean = profile["lean"]
    limb(f"{name} trunk", (x, 0, 0), (x + lean, 0, profile["height"]), 0.23, 0.085)
    for index, (dx, depth, height, width, flat, light) in enumerate(profile["masses"]):
        fork = (x + lean * 0.55 + dx * 0.42, depth * 0.35, profile["height"] * 0.68)
        tip = (x + dx, depth, height)
        limb(f"{name} primary {index}", (x + lean * 0.28, 0, profile["height"] * 0.48), fork, 0.075, 0.045)
        limb(f"{name} secondary {index}", fork, tip, 0.045, 0.015)
        cloud(f"{name} mass {index}", tip, (width, width * 0.72, flat), palette, light)


def cedar_tree(x):
    limb("Sugi trunk", (x, 0, 0), (x, 0, 4.15), 0.20, 0.04)
    for tier in range(7):
        height = 1.0 + tier * 0.45
        radius = 0.95 - tier * 0.105
        count = 4 if tier < 4 else 3
        for index in range(count):
            angle = index / count * math.tau + tier * 0.72
            tip = (x + math.cos(angle) * radius, math.sin(angle) * radius * 0.5, height + 0.08)
            limb(f"Sugi limb {tier}-{index}", (x, 0, height), tip, 0.05, 0.012)
            cloud(f"Sugi spray {tier}-{index}", tip, (0.40 - tier * 0.015, 0.28, 0.15), CEDAR, min(2, tier // 3))
    cloud("Sugi crown", (x, 0, 4.12), (0.28, 0.24, 0.48), CEDAR, 2)


def build_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    branching_tree("Sakura", -4.5, SAKURA, {
        "height": 2.2, "lean": 0.08,
        "masses": [(-1.2, 0.05, 2.85, 0.76, 0.46, 1), (-0.65, -0.08, 3.3, 0.72, 0.48, 2), (0.0, 0.02, 3.55, 0.78, 0.5, 2), (0.72, 0.08, 3.28, 0.76, 0.47, 2), (1.25, -0.03, 2.82, 0.75, 0.45, 1), (-0.1, 0.08, 2.72, 0.72, 0.44, 0)]
    })
    branching_tree("Maple", -1.5, MAPLE, {
        "height": 1.9, "lean": -0.16,
        "masses": [(-1.05, 0.04, 2.12, 0.75, 0.25, 0), (-0.4, -0.08, 2.5, 0.72, 0.24, 1), (0.42, 0.09, 2.44, 0.72, 0.24, 2), (1.08, -0.02, 2.08, 0.74, 0.24, 1), (-0.08, 0.04, 2.9, 0.68, 0.23, 2)]
    })
    branching_tree("Niwaki", 1.5, PINE, {
        "height": 2.9, "lean": 0.34,
        "masses": [(-0.96, 0.04, 1.64, 0.8, 0.19, 0), (0.9, -0.04, 1.94, 0.84, 0.20, 1), (-0.64, 0.06, 2.4, 0.72, 0.18, 1), (0.62, 0, 2.7, 0.66, 0.17, 2), (0.18, -0.03, 3.16, 0.55, 0.16, 2)]
    })
    cedar_tree(4.5)

    bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 0, -0.03))
    bpy.context.object.name = "Ground"
    bpy.context.object.data.materials.append(GROUND)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.lens = 58
    scene.camera = camera
    target = Vector((0, 0, 2.0))
    for name, location in {"front": (0, -15.8, 3.1), "three_quarter": (8.8, -10.8, 5.2)}.items():
        camera.location = location
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(OUTPUT / f"tree_foliage_{name}.png")
        bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "design" / "blender" / "tree_foliage_study.blend"))


if __name__ == "__main__":
    build_scene()
