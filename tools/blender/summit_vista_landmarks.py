r"""Build the lightweight Kyoto landmark layer used by the summit vista.

Run from the repository root:

    D:\Blender\blender.exe --background --python tools/blender/summit_vista_landmarks.py

The script keeps the editable .blend study and exports a compact GLB for the
browser.  Everything is intentionally low-poly: at the summit's viewing
distance the roof rhythms and pagoda silhouette matter more than bevels.
"""

from pathlib import Path
import math
import random

import bpy


ROOT = Path(__file__).resolve().parents[2]
STUDY_DIR = ROOT / "data" / "misc" / "summit_vista_landmarks"
ASSET_DIR = ROOT / "assets" / "models"
BLEND_PATH = STUDY_DIR / "summit_vista_landmarks.blend"
PREVIEW_PATH = STUDY_DIR / "summit_vista_landmarks.png"
GLB_PATH = ASSET_DIR / "summit_kyoto_landmarks.glb"

STUDY_DIR.mkdir(parents=True, exist_ok=True)
ASSET_DIR.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(1604)


def material(name, color, roughness=0.9, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


MAT_PLASTER = material("sun-warmed plaster", (0.65, 0.56, 0.43))
MAT_WOOD = material("dark timber", (0.16, 0.105, 0.07))
MAT_TILE = material("blue grey kawara", (0.13, 0.18, 0.21), 0.7)
MAT_TILE_LIGHT = material("haze lit kawara", (0.24, 0.31, 0.34), 0.75)
MAT_VERMILION = material("vermilion", (0.58, 0.08, 0.035), 0.62)
MAT_GOLD = material("pagoda finial", (0.55, 0.35, 0.09), 0.4, 0.38)


def cube(name, location, scale, mat, rotation_z=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=(0, 0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def hip_roof(name, x, y, z, width, depth, height, mat, rotation=0.0):
    """A shallow hipped kawara roof with a slightly pinched ridge."""
    verts = [
        (-width * 0.56, -depth * 0.58, 0),
        ( width * 0.56, -depth * 0.58, 0),
        ( width * 0.56,  depth * 0.58, 0),
        (-width * 0.56,  depth * 0.58, 0),
        (-width * 0.22, -depth * 0.12, height),
        ( width * 0.22, -depth * 0.12, height),
        ( width * 0.22,  depth * 0.12, height),
        (-width * 0.22,  depth * 0.12, height),
    ]
    faces = [
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
        (4, 5, 6, 7), (0, 3, 2, 1),
    ]
    mesh = bpy.data.meshes.new(name + " Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, y, z)
    obj.rotation_euler[2] = rotation
    return obj


def machiya(name, x, y, z, width, depth, height, rotation=0.0, light_roof=False):
    body = cube(name + " plaster", (x, y, z + height * 0.5),
                (width * 0.5, depth * 0.5, height * 0.5), MAT_PLASTER, rotation)
    # A dark timber band remains legible after aerial-perspective tinting.
    band = cube(name + " timber band", (x, y - depth * 0.48, z + height * 0.58),
                (width * 0.48, 0.035, 0.055), MAT_WOOD, rotation)
    roof = hip_roof(name + " kawara", x, y, z + height,
                    width * 1.18, depth * 1.22, min(0.52, height * 0.32),
                    MAT_TILE_LIGHT if light_roof else MAT_TILE, rotation)
    return [body, band, roof]


def pagoda(x, y, z, scale=1.0):
    made = []
    made.append(cube("Pagoda stone base", (x, y, z + 0.24 * scale),
                     (1.45 * scale, 1.25 * scale, 0.24 * scale), MAT_PLASTER))
    level_z = z + 0.48 * scale
    for floor in range(5):
        width = (2.55 - floor * 0.28) * scale
        depth = (2.15 - floor * 0.23) * scale
        wall_h = (1.16 - floor * 0.045) * scale
        made.append(cube(f"Pagoda floor {floor + 1}",
                         (x, y, level_z + wall_h * 0.5),
                         (width * 0.27, depth * 0.27, wall_h * 0.5), MAT_WOOD))
        made.append(cube(f"Pagoda gallery {floor + 1}",
                         (x, y, level_z + wall_h * 0.56),
                         (width * 0.35, depth * 0.35, 0.055 * scale), MAT_VERMILION))
        made.append(hip_roof(f"Pagoda roof {floor + 1}", x, y,
                             level_z + wall_h * 0.82, width, depth,
                             0.48 * scale, MAT_TILE))
        level_z += wall_h * 0.9
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.065 * scale,
                                        depth=2.1 * scale,
                                        location=(x, y, level_z + 0.75 * scale))
    finial = bpy.context.object
    finial.name = "Pagoda golden sorin"
    finial.data.materials.append(MAT_GOLD)
    made.append(finial)
    for ring in range(5):
        bpy.ops.mesh.primitive_torus_add(major_radius=(0.18 - ring * 0.018) * scale,
                                        minor_radius=0.025 * scale,
                                        major_segments=10, minor_segments=4,
                                        location=(x, y, level_z + (0.08 + ring * 0.25) * scale))
        obj = bpy.context.object
        obj.name = f"Pagoda sorin ring {ring + 1}"
        obj.data.materials.append(MAT_GOLD)
        made.append(obj)
    return made


def torii(name, x, y, z, scale=1.0):
    made = []
    for side in (-1, 1):
        made.append(cube(name + " pillar", (x + side * 1.45 * scale, y, z + 1.85 * scale),
                         (0.16 * scale, 0.18 * scale, 1.85 * scale), MAT_VERMILION))
    made.append(cube(name + " kasagi", (x, y, z + 3.78 * scale),
                     (2.15 * scale, 0.22 * scale, 0.16 * scale), MAT_VERMILION))
    made.append(cube(name + " nuki", (x, y, z + 3.35 * scale),
                     (1.78 * scale, 0.14 * scale, 0.12 * scale), MAT_VERMILION))
    return made


objects = []

# Five temple-neighbourhood terraces, spread wide enough to fill the
# foreground of the painted panorama but shallow enough to read as one layer.
for row in range(5):
    count = 13 + row * 3
    span = 48 + row * 8
    for i in range(count):
        x = -span * 0.5 + (i + 0.5) * span / count + random.uniform(-0.42, 0.42)
        y = 4.5 + row * 4.7 + random.uniform(-0.45, 0.45)
        # The hillside descends toward the bay (+Y in this authored asset).
        z = -row * 1.85 + random.uniform(-0.18, 0.18)
        width = random.uniform(1.6, 2.7)
        depth = random.uniform(1.5, 2.35)
        height = random.uniform(1.25, 2.15)
        objects.extend(machiya(f"Machiya {row + 1}-{i + 1}", x, y, z,
                               width, depth, height,
                               random.uniform(-0.08, 0.08), row > 2))

objects.extend(pagoda(15.5, 14.0, -4.8, 1.22))
objects.extend(torii("Distant hillside torii", -14.0, 5.5, -1.6, 0.9))

# Merge by material into a single multi-primitive mesh: the browser gets the
# full silhouette for six draw calls rather than hundreds of tiny objects.
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
landmarks = bpy.context.object
landmarks.name = "Summit Kyoto Landmarks"

# Face the web scene's camera: Blender authored +Y depth becomes Three.js +Z.
landmarks.rotation_euler[2] = 0.0
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# A neutral studio preview makes the generated geometry easy to audit.
bpy.ops.object.camera_add(location=(58, -78, 43))
camera = bpy.context.object
camera.name = "Preview Camera"
bpy.context.scene.camera = camera

def point_at(obj, target):
    direction = mathutils.Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


import mathutils
point_at(camera, (0, 16, -2))
camera.data.lens = 52

bpy.ops.object.light_add(type="SUN", location=(-20, -30, 50))
sun = bpy.context.object
sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-32))
sun.data.energy = 3.0

bpy.ops.object.light_add(type="AREA", location=(-18, -18, 25))
fill = bpy.context.object
fill.data.energy = 900
fill.data.shape = "DISK"
fill.data.size = 18
point_at(fill, (0, 14, 0))

world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("Summit Preview World")
    bpy.context.scene.world = world
world.color = (0.12, 0.18, 0.24)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1100
scene.render.resolution_y = 620
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(PREVIEW_PATH)
scene.view_settings.look = "AgX - Medium High Contrast"

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)

# Only the mesh is exported; camera/lights stay in the study file.
bpy.ops.object.select_all(action="DESELECT")
landmarks.select_set(True)
bpy.context.view_layer.objects.active = landmarks
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_apply=True,
    export_materials="EXPORT",
)

print(f"Saved {BLEND_PATH}")
print(f"Rendered {PREVIEW_PATH}")
print(f"Exported {GLB_PATH}")
