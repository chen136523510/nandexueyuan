# -*- coding: utf-8 -*-
"""步态约定探针（R-058 黑机 2026-10-08）：导出一个"已知姿态"的最小 .vrma，
用于验证 Blender→.vrma→three-vrm 归一化骨的坐标/符号约定端到端是否一致。

已知姿态（frame 1 = 全静息，frame 10 = 探针姿态）：
  · 左大腿：绕 armature X 轴 -25°（= 向角色前方 -Y 摆动；左膝应前移 ~0.17m）
  · 左小腿：再屈膝 45°（小腿相对大腿向后收；踝应在大腿后方）
  · 髋：整体抬高 0.03m
浏览器侧期望（three.js 场景，模型朝 +Z）：
  · leftLowerLeg 世界坐标 z ≈ +0.17、y 上升；leftFoot 位于膝后（z 更小）
  · hips 世界 y +0.03
用法：blender.exe --background --factory-startup --python blender_gait_conv_probe.py -- <vrm> <out.vrma>
"""
import bpy
import sys
import os
import math
from mathutils import Matrix, Quaternion, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
vrm_path, out_vrma = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.vrm')
bpy.ops.import_scene.vrm(filepath=vrm_path)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
arm.rotation_mode = 'QUATERNION'

for pb in arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'
    pb.location = (0, 0, 0)
    pb.rotation_quaternion = (1, 0, 0, 0)

# 姿态账本：{骨名: (R_world 旋转, 世界平移增量)}——R_world 绕该骨（姿态后）头部施加
POSES = {}


def rot_x(deg):
    return Matrix.Rotation(math.radians(deg), 4, 'X')


def apply_pose(parent_poses, name, r_world: Matrix, t_world: Vector = None):
    """自顶向下求解 basis 并写入 pose bone；返回该骨姿态矩阵 M_pose（armature 空间）。"""
    b = arm.data.bones[name]
    pb = arm.pose.bones[name]
    m_rest = b.matrix_local.copy()
    if b.parent:
        m_pose_parent = parent_poses[b.parent.name]
        local_rest = b.parent.matrix_local.inverted() @ m_rest
        # M_pose = M_pose_parent @ local_rest @ basis ；给定绕头部/局部的世界增量：
        base = m_pose_parent @ local_rest
    else:
        local_rest = m_rest.copy()
        m_pose_parent = Matrix.Identity(4)
        base = m_rest.copy()
    # 世界增量：绕骨（姿态后）头部旋转 + 世界平移增量：
    #   M_pose = T(t_w) @ T(h) @ R_w @ T(-h) @ base   （h = base 的平移 = 姿态后骨头部）
    h = base.to_translation()
    rw = r_world if r_world is not None else Matrix.Identity(4)
    tw = Matrix.Translation(t_world) if t_world is not None else Matrix.Identity(4)
    m_pose = tw @ Matrix.Translation(h) @ rw @ Matrix.Translation(-h) @ base
    basis = base.inverted() @ m_pose
    pb.matrix_basis = basis
    return m_pose


hierarchy_order = [
    'Root', 'J_Bip_C_Hips', 'J_Bip_C_Spine', 'J_Bip_C_Chest', 'J_Bip_C_UpperChest',
    'J_Bip_C_Neck', 'J_Bip_C_Head',
    'J_Bip_L_Shoulder', 'J_Bip_L_UpperArm', 'J_Bip_L_LowerArm', 'J_Bip_L_Hand',
    'J_Bip_R_Shoulder', 'J_Bip_R_UpperArm', 'J_Bip_R_LowerArm', 'J_Bip_R_Hand',
    'J_Bip_L_UpperLeg', 'J_Bip_L_LowerLeg', 'J_Bip_L_Foot', 'J_Bip_L_ToeBase',
    'J_Bip_R_UpperLeg', 'J_Bip_R_LowerLeg', 'J_Bip_R_Foot', 'J_Bip_R_ToeBase',
]


def build_frame(probe: bool):
    """probe=False 全静息；probe=True 探针姿态。返回骨骼清单用于 FK 校验。"""
    poses = {}
    for name in hierarchy_order:
        if name not in arm.data.bones:
            continue
        r = Matrix.Identity(4)
        t = None
        if probe:
            if name == 'J_Bip_C_Hips':
                t = Vector((0, 0, 0.03))
            elif name == 'J_Bip_L_UpperLeg':
                r = rot_x(-25)
            elif name == 'J_Bip_L_LowerLeg':
                r = rot_x(45)
        poses[name] = apply_pose(poses, name, r, t)
    return poses


import json

# FK 校验值收集（探针帧）
checks = {}
poses_rest = build_frame(False)
poses_probe = build_frame(True)
bpy.context.view_layer.update()
for name in ['J_Bip_C_Hips', 'J_Bip_L_UpperLeg', 'J_Bip_L_LowerLeg', 'J_Bip_L_Foot', 'J_Bip_L_ToeBase']:
    if name in arm.pose.bones:
        head = arm.matrix_world @ arm.pose.bones[name].head
        checks[name] = [round(v, 4) for v in head]
print('PROBE_HEADS(armature space, probe pose):', json.dumps(checks, ensure_ascii=False))

# 关键帧：frame 1 = 静息，frame 10 = 探针
scene = bpy.context.scene
arm.animation_data_create()
act = bpy.data.actions.new('conv_probe')
arm.animation_data.action = act

FKEYS = {1: False, 10: True}
import copy
for f, is_probe in FKEYS.items():
    scene.frame_set(f)
    build_frame(is_probe)
    for name in hierarchy_order:
        if name not in arm.pose.bones:
            continue
        pb = arm.pose.bones[name]
        pb.keyframe_insert('rotation_quaternion', frame=f)
        if name == 'J_Bip_C_Hips':
            pb.keyframe_insert('location', frame=f)
print('action slots:', [s.name_display for s in act.slots] if hasattr(act, 'slots') else 'n/a')

scene.frame_start = 1
scene.frame_end = 10
scene.render.fps = 30
r = bpy.ops.export_scene.vrma(filepath=out_vrma, armature_object_name=arm.name)
print('export ->', r, os.path.getsize(out_vrma) if os.path.exists(out_vrma) else 'MISSING')
print('=== conv probe done ===')
