"""Create the foliage silhouette study used by Michi-Neko's tree generator.

Run with:
  blender --background --factory-startup --python tools/blender/tree_foliage_study.py
"""

from pathlib import Path
import math
import random

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "data" / "misc" / "tree_foliage_study"
OUTPUT.mkdir(parents=True, exist_ok=True)
random.seed(240924)


def material(name, color):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.roughness = 0.95
    return value


BARK = material("Warm ink bark", (0.19, 0.105, 0.055))
BARK_LIGHT = material("Sakura bark", (0.31, 0.22, 0.20))
SAKURA = [
    material("Sakura shadow", (0.47, 0.16, 0.29)),
    material("Sakura body", (0.80, 0.38, 0.55)),
    material("Sakura light", (1.0, 0.68, 0.76)),
]
MAPLE = [
    material("Maple shadow", (0.34, 0.08, 0.035)),
    material("Maple body", (0.69, 0.18, 0.07)),
    material("Maple light", (0.95, 0.43, 0.16)),
]
PINE = [
    material("Pine shadow", (0.035, 0.16, 0.10)),
    material("Pine body", (0.09, 0.32, 0.19)),
    material("Pine light", (0.29, 0.51, 0.29)),
]
CEDAR = [
    material("Cedar shadow", (0.025, 0.12, 0.085)),
    material("Cedar body", (0.07, 0.27, 0.18)),
    material("Cedar light", (0.22, 0.43, 0.25)),
]
GROUND = material("Warm ground", (0.23, 0.20, 0.14))


def smooth(value):
    for polygon in value.data.polygons:
        polygon.use_smooth = True
    return value


def branch(name, start, end, r0, r1, mat=BARK):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cone_add(
        vertices=7,
        radius1=r0,
        radius2=r1,
        depth=direction.length,
        location=(start + end) * 0.5,
    )
    value = bpy.context.object
    value.name = name
    value.rotation_mode = "QUATERNION"
    value.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    value.data.materials.append(mat)
    return smooth(value)


def cloud(name, location, scale, palette, light=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=location)
    value = bpy.context.object
    value.name = name
    value.scale = scale
    value.data.materials.append(palette[max(0, min(2, light))])
    bevel = value.modifiers.new("Painted scallops", "DISPLACE")
    texture = bpy.data.textures.new(f"{name} cloud texture", type="VORONOI")
    texture.noise_scale = 0.42
    bevel.texture = texture
    bevel.strength = min(scale) * 0.16
    bevel.texture_coords = "GLOBAL"
    return smooth(value)


def sakura_tree(x):
    branch("Sakura trunk", (x, 0, 0), (x + 0.10, 0, 2.15), 0.24, 0.11, BARK_LIGHT)
    tips = [
        (-1.15, 0.04, 2.85), (-0.65, -0.08, 3.35), (0.0, 0.0, 3.55),
        (0.72, 0.08, 3.28), (1.25, -0.03, 2.85), (-0.15, 0.05, 2.75),
    ]
    for index, (dx, dy, dz) in enumerate(tips):
        fork = (x + dx * 0.45, dy, 2.28 + abs(dx) * 0.05)
        end = (x + dx, dy, dz)
        branch(f"Sakura limb {index}", (x + 0.08, 0, 1.75), fork, 0.095, 0.06, BARK_LIGHT)
        branch(f"Sakura twig {index}", fork, end, 0.06, 0.025, BARK_LIGHT)
        cloud(
            f"Sakura crown {index}",
            (end[0], end[1], end[2] + 0.08),
            (0.72 + (index % 2) * 0.12, 0.55, 0.46),
            SAKURA,
            2 if dz > 3.2 else 1,
        )


def maple_tree(x):
    branch("Maple trunk", (x, 0, 0), (x - 0.18, 0, 1.85), 0.23, 0.10)
    tiers = [
        (-1.05, 0.05, 2.15, 0), (-0.38, -0.10, 2.52, 1),
        (0.45, 0.10, 2.45, 2), (1.08, -0.02, 2.10, 1),
        (-0.10, 0.04, 2.92, 2),
    ]
    for index, (dx, dy, dz, light) in enumerate(tiers):
        fork = (x + dx * 0.45, dy, 1.82 + abs(dx) * 0.08)
        end = (x + dx, dy, dz)
        branch(f"Maple limb {index}", (x - 0.12, 0, 1.45), fork, 0.085, 0.05)
        branch(f"Maple twig {index}", fork, end, 0.05, 0.02)
        cloud(f"Maple tier {index}", end, (0.72, 0.54, 0.25), MAPLE, light)


def pine_tree(x):
    branch("Pine trunk", (x, 0, 0), (x + 0.36, 0, 2.95), 0.24, 0.075)
    pads = [
        (-0.95, 0.03, 1.65, 0.78, 0), (0.90, -0.04, 1.95, 0.82, 1),
        (-0.62, 0.06, 2.42, 0.70, 1), (0.60, 0.0, 2.72, 0.65, 2),
        (0.17, -0.03, 3.18, 0.54, 2),
    ]
    for index, (dx, dy, dz, width, light) in enumerate(pads):
        base = (x + 0.1 + dx * 0.24, dy, dz - 0.28)
        end = (x + dx, dy, dz)
        branch(f"Pine branch {index}", (x + 0.04 + dz * 0.10, 0, dz - 0.72), base, 0.07, 0.045)
        branch(f"Pine twig {index}", base, end, 0.045, 0.018)
        cloud(f"Pine pad {index}", end, (width, 0.55, 0.20), PINE, light)


def cedar_tree(x):
    branch("Cedar trunk", (x, 0, 0), (x, 0, 4.2), 0.20, 0.045)
    for tier in range(7):
        z = 1.0 + tier * 0.46
        radius = 0.95 - tier * 0.10
        points = 4 if tier < 4 else 3
        for index in range(points):
            angle = index / points * math.tau + tier * 0.7
            dx = math.cos(angle) * radius
            dy = math.sin(angle) * radius * 0.52
            end = (x + dx, dy, z + 0.08)
            branch(f"Cedar tier {tier}-{index}", (x, 0, z), end, 0.055, 0.014)
            cloud(
                f"Cedar spray {tier}-{index}",
                end,
                (0.42 - tier * 0.018, 0.28, 0.16),
                CEDAR,
                min(2, tier // 3),
            )
    cloud("Cedar crown", (x, 0, 4.18), (0.30, 0.25, 0.52), CEDAR, 2)


def label(text, location):
    bpy.ops.object.text_add(location=location, rotation=(math.pi / 2, 0, 0))
    value = bpy.context.object
    value.name = f"Label {text}"
    value.data.body = text
    value.data.align_x = "CENTER"
    value.data.size = 0.32
    value.data.extrude = 0.008
    value.data.materials.append(BARK)


def build_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    positions = [-4.5, -1.5, 1.5, 4.5]
    sakura_tree(positions[0])
    maple_tree(positions[1])
    pine_tree(positions[2])
    cedar_tree(positions[3])
    for name, x in zip(("SAKURA", "MAPLE", "NIWAKI", "SUGI"), positions):
        label(name, (x, -0.9, 0.02))

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
    views = {
        "front": (0, -15.8, 3.1),
        "three_quarter": (8.8, -10.8, 5.2),
    }
    for name, location in views.items():
        camera.location = location
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(OUTPUT / f"tree_foliage_{name}.png")
        bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "tree_foliage_study.blend"))


if __name__ == "__main__":
    build_scene()
