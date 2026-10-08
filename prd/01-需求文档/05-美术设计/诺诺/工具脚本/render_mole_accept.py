# -*- coding: utf-8 -*-
"""泪痣变体验收渲染 v2：正对镜头的眼下特写（确定性机位）

v1 教训：按 UV 找最近顶点取 3D 坐标会把相机摆到斜上方且过曝（满屏白）。
v2 改法：用虹膜材质顶点定位双眼 → 取角色左眼（X 较大侧）→ 目标点=眼下 13mm →
相机正对前方（Blender -Y 侧，rot_x=90°）正交 8.5cm 视野。
用法：blender --background --python render_mole_accept.py
输出：.ai/tmp/mole2_<tag>.png
"""
import math
import os

import bpy
import numpy as np

TMP = r'G:/UGit/nandexueyuan/.ai/tmp'
VARIANTS = [('C_old', 'vrm_mole_C.vrm'), ('C_new', 'vrm_final.vrm')]
DROP = 0.013          # 眼下 13mm（locate_tear_mole.py 口径）


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)


def iris_verts(obj):
    me = obj.data
    slots = [i for i, m in enumerate(me.materials) if m and 'EyeIris' in m.name]
    vs = set()
    for p in me.polygons:
        if p.material_index in slots:
            vs.update(p.vertices)
    return np.array([list(me.vertices[i].co) for i in vs]) if vs else None


def build_cam(target):
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 0.085                              # 8.5cm 视野
    cam.location = (target[0], target[1] - 0.40, target[2])   # 模型面朝 -Y
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)              # 沿 +Y 看
    bpy.context.scene.camera = cam


def build_lights(target):
    for name, loc, e, size in (('key', (0.25, -0.9, target[2] + 0.25), 60, 0.5),
                               ('fill', (-0.35, -0.9, target[2] - 0.10), 30, 0.6)):
        ld = bpy.data.lights.new(name, 'AREA')
        ld.energy = e
        ld.size = size
        lo = bpy.data.objects.new(name, ld)
        lo.location = loc
        d = np.array(target) - np.array(loc)
        d = d / np.linalg.norm(d)
        lo.rotation_euler = (math.pi / 2 - math.asin(d[2]), 0.0, math.atan2(d[0], -d[1]))
        bpy.context.scene.collection.objects.link(lo)


def render_variant(tag, path, out):
    clear()
    if not os.path.exists(path):
        print('SKIP', path)
        return
    bpy.ops.import_scene.vrm(filepath=path)
    face = bpy.data.objects['Face']
    co = iris_verts(face)
    if co is None:
        print('FAIL', tag, '找不到虹膜顶点')
        return
    left = co[co[:, 0] > 0].mean(axis=0)          # Blender X>0 = 角色左侧
    target = (float(left[0]), float(left[1]), float(left[2] - DROP))
    print('%-5s 角色左眼 (%.4f, %.4f, %.4f) → 目标点 z=%.4f' % (
        tag, left[0], left[1], left[2], left[2] - DROP))
    build_cam(target)
    build_lights(target)
    sc = bpy.context.scene
    engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
    sc.render.resolution_x = 720
    sc.render.resolution_y = 720
    sc.view_settings.view_transform = 'Standard'
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.10, 0.10, 0.12, 1)
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('rendered', out)


for tag, fn in VARIANTS:
    try:
        render_variant(tag, os.path.join(TMP, fn), TMP + '/mole3_%s.png' % tag)
    except Exception as e:
        print('FAIL', tag, e)
print('DONE')
