# -*- coding: utf-8 -*-
"""Blender 步态 clip 探针（R-058 黑机 2026-10-08）：导入 nonono_v7 VRM，摸清骨架命名/静息姿态/坐标系。
用法：blender.exe --background --factory-startup --python blender_walk_probe.py -- <vrm路径> [--copy-glb <临时glb>]
输出：骨架对象名 / 骨骼清单（人形关键骨：head/tail 静息坐标）/ 场景单位与朝向。
"""
import bpy
import sys
import os
import shutil
import json

argv = sys.argv
argv = argv[argv.index('--') + 1:] if '--' in argv else []
vrm_path = argv[0] if argv else None
glb_tmp = argv[2] if len(argv) > 2 and argv[1] == '--copy-glb' else None

print('=== blender_walk_probe ===')
print('BLENDER', bpy.app.version_string)
print('PYTHON', sys.version.split()[0])

for op_name in ('import_scene.gltf', 'export_scene.gltf', 'export_scene.fbx', 'import_scene.fbx'):
    owner, fn = op_name.split('.')
    print('op', op_name, hasattr(getattr(bpy.ops, owner), fn))

if not vrm_path:
    print('!! no vrm path given')
    sys.exit(1)

import_path = vrm_path
if glb_tmp:
    shutil.copyfile(vrm_path, glb_tmp)
    import_path = glb_tmp
print('IMPORT', import_path, os.path.getsize(import_path), 'bytes')

bpy.ops.wm.read_factory_settings(use_empty=True)
try:
    bpy.ops.import_scene.gltf(filepath=import_path)
    print('IMPORT_OK')
except Exception as e:
    print('IMPORT_FAIL', type(e).__name__, e)
    sys.exit(2)

print('--- objects ---')
for o in bpy.data.objects:
    print(f'  {o.type:9s} {o.name!r} parent={o.parent.name if o.parent else None} loc={tuple(round(v,4) for v in o.location)} scale={tuple(round(v,4) for v in o.scale)}')

arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
print('armatures:', [a.name for a in arms])
if not arms:
    sys.exit(3)
arm = arms[0]
print('scene unit scale', bpy.context.scene.unit_settings.scale_length, 'system', bpy.context.scene.unit_settings.system)
print('armature matrix_world:')
for row in arm.matrix_world:
    print('   ', tuple(round(v, 5) for v in row))

bones = arm.data.bones
print(f'--- bones ({len(bones)}) ---')
for b in bones:
    h = b.head_local
    t = b.tail_local
    pn = b.parent.name if b.parent else '-'
    print(f'  {b.name:28s} parent={pn:28s} head=({h.x:7.4f},{h.y:7.4f},{h.z:7.4f}) tail=({t.x:7.4f},{t.y:7.4f},{t.z:7.4f})')

# 人形关键骨集中打印（对照 VRM humanoid）
KEY = ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head',
       'Shoulder', 'UpperArm', 'LowerArm', 'Hand',
       'UpperLeg', 'LowerLeg', 'Foot', 'Toes']
print('--- humanoid key bones (rest, armature space) ---')
for b in bones:
    if any(k in b.name for k in KEY):
        h, t = b.head_local, b.tail_local
        print(f'  {b.name:30s} len={b.length:.4f} head=({h.x:7.4f},{h.y:7.4f},{h.z:7.4f}) tail=({t.x:7.4f},{t.y:7.4f},{t.z:7.4f})')

# 动作与形状键概览
print('actions:', [a.name for a in bpy.data.actions])
print('=== probe done ===')
