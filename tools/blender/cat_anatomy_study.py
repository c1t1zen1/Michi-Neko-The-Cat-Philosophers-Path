"""Build and render the anatomy reference used by the procedural Three.js cat.

Run with:
  blender --background --python tools/blender/cat_anatomy_study.py
"""

from pathlib import Path
import math

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "data" / "misc" / "cat_anatomy_study"
OUTPUT.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=0.8):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.roughness = roughness
    return value


FUR = material("Warm tabby", (0.55, 0.31, 0.14))
CREAM = material("Cream points", (0.90, 0.80, 0.62))
PINK = material("Nose and pads", (0.68, 0.30, 0.32))
DARK = material("Eyes", (0.055, 0.032, 0.018), 0.3)
GROUND = material("Ground", (0.09, 0.105, 0.09))


def smooth(object_value):
    for polygon in object_value.data.polygons:
        polygon.use_smooth = True
    bevel = object_value.modifiers.new("Soft silhouette", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 2
    return object_value


def ellipsoid(name, location, scale, mat=FUR):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=location)
    value = bpy.context.object
    value.name = name
    value.scale = scale
    value.data.materials.append(mat)
    return smooth(value)


def capsule_between(name, start, end, radius, mat=FUR):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    midpoint = (start + end) * 0.5
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=midpoint)
    value = bpy.context.object
    value.name = name
    value.scale = (radius, radius, direction.length * 0.5 + radius)
    value.rotation_mode = "QUATERNION"
    value.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    value.data.materials.append(mat)
    return smooth(value)


def cone_between(name, base, tip, radius, mat=FUR):
    base = Vector(base)
    tip = Vector(tip)
    direction = tip - base
    bpy.ops.mesh.primitive_cone_add(
        vertices=24,
        radius1=radius,
        radius2=radius * 0.12,
        depth=direction.length,
        location=(base + tip) * 0.5,
    )
    value = bpy.context.object
    value.name = name
    value.rotation_mode = "QUATERNION"
    value.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    value.data.materials.append(mat)
    return smooth(value)


def build_cat():
    # Blender uses X for width, Y for forward, Z for height. Dimensions mirror
    # src/cat.js with its Y/Z axes exchanged.
    ellipsoid("Ribcage", (0, 0.12, 0.445), (0.14, 0.205, 0.155))
    ellipsoid("Abdomen", (0, -0.015, 0.43), (0.12, 0.205, 0.12))
    ellipsoid("Pelvis", (0, -0.15, 0.425), (0.125, 0.165, 0.125))

    # Scapulae and thighs provide the characteristic feline side silhouette
    # without widening the body into a sphere from the rear.
    for side in (-1, 1):
        ellipsoid(f"Scapula {side}", (side * 0.09, 0.15, 0.47), (0.055, 0.09, 0.10))
        ellipsoid(f"Thigh {side}", (side * 0.085, -0.13, 0.32), (0.07, 0.105, 0.125))

    capsule_between("Neck", (0, 0.21, 0.50), (0, 0.29, 0.59), 0.07)
    ellipsoid("Skull", (0, 0.335, 0.65), (0.105, 0.105, 0.095))
    ellipsoid("Muzzle", (0, 0.425, 0.622), (0.074, 0.065, 0.046), CREAM)
    ellipsoid("Nose", (0, 0.484, 0.63), (0.016, 0.010, 0.010), PINK)

    for side in (-1, 1):
        cone_between(f"Ear {side}", (side * 0.055, 0.33, 0.715), (side * 0.075, 0.325, 0.815), 0.043)
        ellipsoid(f"Eye {side}", (side * 0.043, 0.426, 0.672), (0.022, 0.012, 0.025), DARK)

    # Front limb: shoulder -> elbow -> wrist -> paw. The upper arm angles
    # slightly back while the weight-bearing forearm is nearly vertical.
    for side in (-1, 1):
        shoulder = (side * 0.078, 0.17, 0.405)
        elbow = (side * 0.078, 0.135, 0.265)
        wrist = (side * 0.078, 0.155, 0.095)
        capsule_between(f"Front upper {side}", shoulder, elbow, 0.032)
        capsule_between(f"Front forearm {side}", elbow, wrist, 0.024)
        ellipsoid(f"Front paw {side}", (side * 0.078, 0.18, 0.045), (0.032, 0.052, 0.025), CREAM)

    # Hind limb: hip -> stifle -> hock -> paw. This visible zig-zag is the
    # biggest anatomical correction over the original straight columns.
    for side in (-1, 1):
        hip = (side * 0.083, -0.145, 0.385)
        stifle = (side * 0.083, -0.035, 0.255)
        hock = (side * 0.083, -0.18, 0.13)
        ankle = (side * 0.083, -0.15, 0.065)
        capsule_between(f"Hind thigh {side}", hip, stifle, 0.045)
        capsule_between(f"Hind shin {side}", stifle, hock, 0.031)
        capsule_between(f"Hind hock {side}", hock, ankle, 0.023)
        ellipsoid(f"Hind paw {side}", (side * 0.083, -0.105, 0.04), (0.034, 0.058, 0.025), CREAM)

    # Tail leaves the sacrum horizontally before lifting; taper is continuous.
    tail_points = [
        (0, -0.285, 0.46),
        (0, -0.37, 0.46),
        (0, -0.44, 0.52),
        (0.015, -0.47, 0.61),
        (0.03, -0.45, 0.70),
        (0.035, -0.39, 0.76),
    ]
    for index, (start, end) in enumerate(zip(tail_points, tail_points[1:])):
        capsule_between(f"Tail {index}", start, end, 0.030 - index * 0.0035)


def add_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    build_cat()

    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    ground = bpy.context.object
    ground.name = "Ground"
    ground.data.materials.append(GROUND)

    bpy.ops.object.light_add(type="AREA", location=(-2.5, 2.5, 4.0))
    bpy.context.object.data.energy = 900
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 4.0

    bpy.ops.object.light_add(type="AREA", location=(2.0, -1.5, 2.0))
    bpy.context.object.data.energy = 500
    bpy.context.object.data.color = (0.55, 0.68, 1.0)
    bpy.context.object.data.size = 3.0

    world = bpy.context.scene.world
    world.color = (0.018, 0.022, 0.025)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.lens = 58
    scene.camera = camera

    target = Vector((0, 0.02, 0.39))
    views = {
        "side": (1.55, -0.02, 0.58),
        "front": (0, 1.65, 0.56),
        "rear": (0, -1.65, 0.56),
        "three_quarter": (1.2, 1.25, 0.75),
    }
    for name, location in views.items():
        camera.location = location
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(OUTPUT / f"cat_anatomy_{name}.png")
        bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "cat_anatomy_study.blend"))


if __name__ == "__main__":
    add_scene()
