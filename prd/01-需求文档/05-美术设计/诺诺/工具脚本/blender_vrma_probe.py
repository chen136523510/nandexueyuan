# -*- coding: utf-8 -*-
"""VRMA 导出链路探针（R-058 黑机 2026-10-08）：验证 VRM 扩展在 Blender 5.2 可用 + 人形骨映射存在 + 试导出最小 .vrma。
用法：blender.exe --background --factory-startup --python blender_vrma_probe.py -- <vrm路径> <试导出vrma路径>
"""
import bpy
import sys
import os

argv = sys.argv
argv = argv[argv.index('--') + 1:] if '--' in argv else []
vrm_path = argv[0]
out_vrma = argv[1] if len(argv) > 1 else None

import addon_utils

print('=== blender_vrma_probe ===')
print('BLENDER', bpy.app.version_string)
# --factory-startup 不加载用户偏好 → 扩展需手动 register（addon_utils.enable 在 factory-startup 下注册不生效）
import bl_ext.user_default.vrm as vrm_addon

try:
    vrm_addon.register()
    print('manual register OK')
except Exception as e:
    print('manual register note:', type(e).__name__, e)
print('ops: import_scene.vrm=', hasattr(bpy.ops.import_scene, 'vrm'),
      'export_scene.vrma=', hasattr(bpy.ops.export_scene, 'vrma'),
      'import_scene.vrma=', hasattr(bpy.ops.import_scene, 'vrma'))

bpy.ops.wm.read_factory_settings(use_empty=True)
try:
    bpy.ops.import_scene.vrm(filepath=vrm_path)
    print('VRM_IMPORT_OK')
except Exception as e:
    print('VRM_IMPORT_FAIL', type(e).__name__, e)
    sys.exit(1)

arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
print('armatures:', [a.name for a in arms])
arm = arms[0]
ext = getattr(arm, 'vrm_addon_extension', None)
print('has vrm_addon_extension:', ext is not None)
if ext is not None:
    print('spec_version:', getattr(ext, 'spec_version', None))
    vrm1 = getattr(ext, 'vrm1', None)
    hb = getattr(getattr(vrm1, 'humanoid', None), 'human_bones', None)
    if hb is not None:
        names = [k for k in hb.bl_rna.properties.keys() if k not in ('rna_type',)]
        print('human_bones keys:', names)
        assigned = {}
        for k in names:
            try:
                node = getattr(hb, k).node
                bn = node.bone_name if node else ''
                if bn:
                    assigned[k] = bn
            except Exception as e:
                pass
        print('assigned count:', len(assigned))
        for k, v in assigned.items():
            print(f'   {k:22s} -> {v}')
    else:
        print('humanoid.human_bones missing')

# 骨骼朝向与静息矩阵（腿/臂关键骨，验证 local 轴约定）
import mathutils
print('--- bone rest matrices (armature space) ---')
for bn in ['J_Bip_C_Hips', 'J_Bip_L_UpperLeg', 'J_Bip_L_LowerLeg', 'J_Bip_L_Foot', 'J_Bip_L_ToeBase',
           'J_Bip_L_UpperArm', 'J_Bip_L_LowerArm', 'J_Bip_C_Spine', 'J_Bip_C_Chest']:
    b = arm.data.bones.get(bn)
    if not b:
        print('  missing', bn)
        continue
    m = b.matrix_local
    print(f'  {bn:22s} head=({b.head_local.x:7.4f},{b.head_local.y:7.4f},{b.head_local.z:7.4f})')
    for row in m.to_3x3():
        print('      ', tuple(round(v, 4) for v in row))

if out_vrma:
    # 最小动画：给左大腿 1 帧旋转，试导出 vrma
    arm.animation_data_create()
    act = bpy.data.actions.new('probe_walk')
    arm.animation_data.action = act
    if hasattr(act, 'slots'):  # Blender 4.4+ slotted actions
        try:
            slot = act.slots.new(id_type='OBJECT', name='Armature')
            arm.animation_data.action_slot = slot
        except Exception as e:
            print('slot create note:', e)
    pb = arm.pose.bones['J_Bip_L_UpperLeg']
    pb.rotation_mode = 'QUATERNION'
    for f, ang in ((1, 0.0), (13, 0.35), (25, 0.0)):
        pb.rotation_quaternion = mathutils.Quaternion((1, 0, 0), ang)
        pb.keyframe_insert('rotation_quaternion', frame=f)
    print('action created, fcurves:', len(act.fcurves) if hasattr(act, 'fcurves') else 'n/a')
    try:
        bpy.ops.export_scene.vrma(filepath=out_vrma, armature_object_name=arm.name)
        print('VRMA_EXPORT_OK', out_vrma, os.path.getsize(out_vrma) if os.path.exists(out_vrma) else 'missing')
    except Exception as e:
        print('VRMA_EXPORT_FAIL', type(e).__name__, e)
        try:
            bpy.ops.export_scene.vrma(filepath=out_vrma)
            print('VRMA_EXPORT_OK(no-name)', os.path.getsize(out_vrma))
        except Exception as e2:
            print('VRMA_EXPORT_FAIL2', type(e2).__name__, e2)
print('=== probe done ===')
