"""Michi-Neko / Eastbound. Rebuild with Blender --background --python this_file.

All dimensions are metres. Helpers accept Three coordinates (x, up, forward).
The editable .blend and GLB kit are produced from the same scene. No downloads.
"""
import bpy, math, os, json, random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(73)

def xyz(p): return (p[0], -p[2], p[1])
def material(name, color, rough=.8, metal=0, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    s = m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value = (*color, 1)
    s.inputs['Roughness'].default_value = rough
    s.inputs['Metallic'].default_value = metal
    s.inputs['Emission Color'].default_value = (*color, 1)
    s.inputs['Emission Strength'].default_value = glow
    return m

IVORY=material('porcelain',(.87,.88,.80),.38,.12)
BLUE=material('indigo',(.035,.14,.28),.42,.12)
GLASS=material('window',(.13,.32,.39),.22,.2)
DARK=material('graphite',(.055,.075,.085),.72)
WOOD=material('timber',(.37,.20,.095))
GOLD=material('brass',(.75,.51,.20),.4,.55)
SEAT=material('sage_cloth',(.25,.40,.34))
CREAM=material('linen',(.83,.76,.58))
RED=material('vermilion',(.61,.15,.10))
LEAF=material('leaf',(.19,.37,.15))
LIGHT=material('leaf_light',(.36,.50,.20))
PINK=material('blossom',(.84,.56,.56))
STONE=material('stone',(.36,.39,.36))
FUJI=material('fuji',(.31,.39,.49))
SNOW=material('snow',(.91,.90,.80))
LAMP=material('warm_light',(.95,.67,.30),.65,0,.7)

def asset(name):
    g=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(g); return g
def finish(o,g,m):
    o.parent=g; o.data.materials.append(m); return o
def box(g,name,p,size,m,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p))
    o=bpy.context.object; o.name=name; o.dimensions=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('soft painted edges','BEVEL'); mod.width=bevel; mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for f in o.data.polygons: f.use_smooth=True
        o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return finish(o,g,m)
def mesh(g,name,v,f,m):
    d=bpy.data.meshes.new(name); d.from_pydata([xyz(p) for p in v],[],f); d.update()
    o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); return finish(o,g,m)
def ellipsoid(g,p,size,m,seed=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=xyz(p))
    o=bpy.context.object; o.scale=(size[0],size[2],size[1])
    for v in o.data.vertices: v.co*=1+random.uniform(-.07,.07)
    for f in o.data.polygons: f.use_smooth=True
    return finish(o,g,m)
def beam(g,a,b,r,m):
    av,bv=Vector(xyz(a)),Vector(xyz(b)); diff=bv-av
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=r,depth=diff.length,location=(av+bv)/2)
    o=bpy.context.object; o.rotation_euler=diff.to_track_quat('Z','Y').to_euler()
    return finish(o,g,m)

# Coach: true window openings, open ends and separate removable roof.
g=asset('coach_shell')
box(g,'underframe',(0,.70,0),(3.22,.55,24.7),DARK,.12)
box(g,'floor',(0,1.05,0),(3.45,.18,25),WOOD,.03)
for side in [-1,1]:
    box(g,'lower body',(side*1.73,1.58,0),(.14,1.02,24.9),IVORY,.07)
    box(g,'blue running band',(side*1.812,1.89,0),(.025,.22,24.5),BLUE)
    box(g,'window header',(side*1.70,3.59,0),(.18,.50,24.9),IVORY,.04)
    for z in [-12.1]+[i*1.85-10.2 for i in range(12)]+[12.1]:
        box(g,'window mullion',(side*1.73,2.76,z),(.14,1.3,.16),IVORY,.04)
    for z in [-11.1,11.1]:
        box(g,'door inset',(side*1.80,2.17,z),(.035,2.1,.8),BLUE,.06)
        box(g,'door light',(side*1.83,2.65,z),(.02,.65,.50),GLASS,.04)
for z in [-8.5,8.5]:
    for x in [-1.2,1.2]:
        beam(g,(x,.35,z-.7),(x,.35,z+.7),.38,DARK)
    box(g,'bogie',(0,.39,z),(2.65,.45,2.1),DARK,.08)

g=asset('coach_roof')
# Swept elliptical crown, underside at 3.8, centre paw height 4.35.
v=[]; f=[]; n=24
for z in [-12.5,12.5]:
    for i in range(n+1):
        a=math.pi*i/n; v.append((1.78*math.cos(a),3.8+.55*math.sin(a),z))
for i in range(n): f.append((i,i+1,n+2+i,n+1+i))
mesh(g,'porcelain crown',v,f,IVORY)
for x in [-1.60,1.60]: box(g,'gutter',(x,3.98,0),(.045,.04,24.5),BLUE)
for z in [-7,7]:
    box(g,'low roof vent',(0,4.37,z),(1.25,.08,1.9),IVORY,.04)
    for dz in [-.6,-.3,0,.3,.6]: box(g,'vent rib',(0,4.415,z+dz),(1.02,.012,.06),DARK)

g=asset('nose')
v=[]; f=[]; sections=[(0,1.78,3.8),(-2,1.73,3.8),(-4,1.5,3.4),(-6,1.05,2.5),(-8,.42,1.55),(-8.8,.05,1.1)]
for z,w,h in sections:
    for i in range(25):
        a=2*math.pi*i/24; v.append((w*math.cos(a),1+(h-1)*(.5+.5*math.sin(a)),z))
for k in range(len(sections)-1):
    for i in range(24): a=k*25+i; f.append((a,a+1,a+26,a+25))
o=mesh(g,'sculpted kingfisher nose',v,f,IVORY)
for p in o.data.polygons:p.use_smooth=True
for side in [-1,1]:
    glass=box(g,'cockpit glazing',(side*.64,3.19,-2.8),(1.2,.08,1.5),GLASS,.16); glass.rotation_euler[0]=-.26
    box(g,'headlight',(side*.74,1.72,-6.0),(.46,.17,.18),LAMP,.07)
    beam(g,(side*1.76,1.9,0),(side*.55,1.44,-7),.075,BLUE)

g=asset('seat_pair')
for x in [-.39,.39]:
    box(g,'cushion',(x,.45,0),(.69,.18,.65),SEAT,.08)
    box(g,'back',(x,.89,.27),(.71,.85,.14),SEAT,.07)
    box(g,'head cover',(x,1.16,.19),(.48,.22,.035),CREAM,.025)
    box(g,'leg',(x,.19,0),(.09,.38,.36),DARK)
    for sx in [-.36,.36]: box(g,'arm',(x+sx,.69,-.01),(.06,.08,.52),WOOD,.025)
box(g,'tray',(0,.94,.38),(1.38,.03,.22),WOOD,.02)

g=asset('cafe_counter')
box(g,'sage cabinet',(0,.54,0),(.70,1.08,5.8),SEAT,.06)
box(g,'polished timber top',(0,1.11,0),(.88,.11,6.0),WOOD,.04)
for z in [-2,-.65,.65,2]:
    box(g,'cabinet panel',(-.365,.55,z),(.035,.77,1.17),CREAM,.025)
    box(g,'cabinet pull',(-.40,.89,z),(.035,.035,.24),GOLD,.012)
box(g,'espresso machine',(0,1.40,-1.7),(.57,.49,.55),GOLD,.05)
box(g,'pastry case',(0,1.36,1),(.64,.39,1.4),GLASS,.04)
for z in [.6,1,1.4]:ellipsoid(g,(0,1.23,z),(.18,.08,.12),CREAM)

g=asset('tea_set')
ellipsoid(g,(0,.15,0),(.20,.17,.17),CREAM)
beam(g,(.15,.17,0),(.30,.23,0),.055,CREAM)
beam(g,(-.18,.13,0),(-.27,.22,0),.045,WOOD)
box(g,'tea tray',(0,.02,0),(.80,.04,.50),WOOD,.03)
for x in [-.29,.29]:beam(g,(x,.04,.15),(x,.13,.15),.065,CREAM)

g=asset('cottage')
box(g,'plaster',(0,2,0),(6,4,4.8),CREAM)
for x in [-2.9,0,2.9]: box(g,'timber frame',(x,2,2.43),(.13,4,.15),WOOD)
for x in [-1.5,1.5]:box(g,'shoji',(x,2.1,2.46),(1.8,1.6,.08),GLASS)
for side in [-1,1]:
    o=box(g,'kawara roof',(side*1.65,4.25,0),(3.8,.18,6),BLUE,.08);o.rotation_euler[1]=side*.33
box(g,'ridge',(0,4.9,0),(.22,.22,6.2),DARK,.06)

for name,leaf in [('tree',LEAF),('sakura',PINK)]:
    g=asset(name);beam(g,(0,0,0),(.15,4.0,0),.25,WOOD)
    for i in range(9):
        a=i*2.4;r=1.6 if i<6 else .7
        p=(math.cos(a)*r,3.8+(i%3)*.65,math.sin(a)*r)
        beam(g,(0,2.6,0),p,.075,WOOD)
        ellipsoid(g,p,(1.7,1.25,1.5),leaf if i%3 else (LIGHT if name=='tree' else CREAM))

g=asset('tunnel_ring')
v=[];f=[];n=28
# Horseshoe vault, a full segment with visible internal walls.
for z in [-6,6]:
    for r in [5.7,6.7]:
        for i in range(n+1):
            a=math.pi*i/n;v.append((r*math.cos(a),2.2+r*math.sin(a),z))
k=n+1
for i in range(n):
    f.extend([(i,i+1,2*k+i+1,2*k+i),(k+i,3*k+i,3*k+i+1,k+i+1),
              (i,k+i,k+i+1,i+1),(2*k+i,2*k+i+1,3*k+i+1,3*k+i)])
mesh(g,'vault',v,f,STONE)
for x in [-6.2,6.2]:box(g,'wall',(x,.1,0),(1.0,4.3,12),STONE)
for x in [-4.9,4.9]:box(g,'amber tunnel guide',(x,2.7,0),(.12,.14,1.4),LAMP,.03)

g=asset('viaduct')
box(g,'deck',(0,-.35,0),(8.5,.7,20),STONE,.1)
for x in [-4.1,4.1]: box(g,'parapet',(x,.21,0),(.2,.5,20),CREAM,.05)
for x in [-2.8,2.8]:box(g,'pier',(x,-9,0),(1.0,17,1.5),STONE,.12)
beam(g,(-3,-2,-8),(3,-2,8),.18,RED)
beam(g,(3,-2,-8),(-3,-2,8),.18,RED)
for x in [-8.5,8.5]:
    beam(g,(x,.15,-10),(x,7,-10),.15,RED)
    beam(g,(x,.15,10),(x,7,10),.15,RED)
    beam(g,(x,7,-10),(x,7,10),.17,RED)
    for z in [-10,-5,0,5]:
        beam(g,(x,.2,z),(x,7,z+5),.12,RED)
        beam(g,(x,7,z),(x,.2,z+5),.12,RED)
beam(g,(-8.5,7,-10),(8.5,7,-10),.15,RED)
beam(g,(-8.5,7,10),(8.5,7,10),.15,RED)

g=asset('fuji')
v=[];f=[];n=80;levels=18
for j in range(levels+1):
    t=j/levels;r=130*(1-t)**.82+3
    for i in range(n):
        a=i*2*math.pi/n;rr=r*(1+.035*math.sin(a*7+t*16)+.016*math.sin(a*19))
        v.append((rr*math.cos(a),t*108+(math.sin(a*9)*1.2 if j==levels else 0),rr*math.sin(a)))
for j in range(levels):
    for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
o=mesh(g,'folded volcano',v,f,FUJI);o.data.materials.append(SNOW)
for p in o.data.polygons:
    if p.center.z>75:p.material_index=1
    p.use_smooth=True
# Face centres are evaluated explicitly after mesh creation.
for p in o.data.polygons:
    h=sum(o.data.vertices[i].co.z for i in p.vertices)/len(p.vertices)
    if h>74+5*math.sin(p.index*.73):p.material_index=1

g=asset('tokyo_tower')
for i in range(9):
    h=i*6;w=7*(1-i/11)
    for side in [-1,1]:
        for z in [-1,1]:beam(g,(side*w,h,z*w),(side*(w-.63),h+6,z*(w-.63)),.27,RED if i%2 else CREAM)
    for z in [-w,w]:
        beam(g,(-w,h,z),(w-.6,h+6,z*.9),.13,RED)
        beam(g,(w,h,z),(-w+.6,h+6,z*.9),.13,RED)
box(g,'observatory',(0,36,0),(9,2.8,9),CREAM,.4)
beam(g,(0,54,0),(0,69,0),.30,RED)

# Join each asset by material: efficient templates, editable source retained.
for root in [o for o in bpy.context.scene.objects if o.type=='EMPTY']:
    children=list(root.children); groups={}
    for o in children:groups.setdefault(o.data.materials[0].name,[]).append(o)
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.join();o=bpy.context.object;o.name=root.name+'__'+name
        # Apply locations before export so shared instance transforms are identity.
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender','eastbound.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'assets','eastbound-kit.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
stats={'generator':'Blender '+bpy.app.version_string,'assets':[]}
for o in bpy.context.scene.objects:
    if o.type=='EMPTY':stats['assets'].append({'name':o.name,'meshes':len(o.children),'triangles':sum(sum(len(p.vertices)-2 for p in c.data.polygons) for c in o.children)})
with open(os.path.join(ROOT,'assets','manifest.json'),'w') as f:json.dump(stats,f,indent=2)
print('EASTBOUND_ASSETS_READY',json.dumps(stats))
