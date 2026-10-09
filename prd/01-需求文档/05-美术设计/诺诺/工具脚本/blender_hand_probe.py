# -*- coding: utf-8 -*-
"""手部网格勘测探针（R-058 黑机 2026-10-09）
用途：手部精细化施工前的现状量测——手部区域面数/顶点数、每指分布、世界尺寸、所属材质与贴图、
      UV 范围（Krita 贴图层定位用）。改完网格后重跑同脚本即得对比数据。
用法：blender.exe --background --factory-startup --python blender_hand_probe.py -- <vrm> [--json <report.json>]
输出：控制台 + 可选 JSON。
"""
import bpy
import sys
import os
import json

argv = sys.argv
argv = argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VRM = argv[0] if argv else None
JSON_OUT = argv[argv.index('--json') + 1] if '--json' in argv else None
if not VRM:
    print('!! usage: -- <vrm> [--json <report.json>]')
    sys.exit(1)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.vrm')
bpy.ops.import_scene.vrm(filepath=VRM)
print('=== blender_hand_probe ===')
print('BLENDER', bpy.app.version_string)
print('IMPORT', os.path.basename(VRM), os.path.getsize(VRM), 'bytes')

arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
HAND_KEYS = ('Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Little')


def is_hand_group(name):
    return any(k in name for k in HAND_KEYS)


report = {'file': os.path.basename(VRM), 'meshes': [], 'hands': {}}
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    me = o.data
    # 顶点组索引 → 是否手部组
    hand_gi = {vg.index for vg in o.vertex_groups if is_hand_group(vg.name)}
    gi2name = {vg.index: vg.name for vg in o.vertex_groups}
    # 顶点归属：任一顶点权重来自手部组（阈值 0.3，排除微弱影响）
    v_hand = set()
    for v in me.vertices:
        for g in v.groups:
            if g.group in hand_gi and g.weight > 0.3:
                v_hand.add(v.index)
                break
    # 面统计（三角化后=len(me.loop_triangles)）
    me.calc_loop_triangles()
    hand_tris = 0
    per_finger = {}
    side_tris = {'x>0': 0, 'x<0': 0}
    uv_min = [9, 9]
    uv_max = [-9, -9]
    mats = {}
    uvl = me.uv_layers.active
    for tri in me.loop_triangles:
        vs = set(tri.vertices)
        if vs & v_hand:
            hand_tris += 1
            cx = sum(me.vertices[vi].co[0] for vi in tri.vertices) / 3
            side_tris['x>0' if cx >= 0 else 'x<0'] += 1
            # 归属手指（按该面顶点的手部组最高权重投票）
            votes = {}
            for vi in tri.vertices:
                for g in me.vertices[vi].groups:
                    if g.group in hand_gi:
                        nm = gi2name[g.group]
                        votes[nm] = votes.get(nm, 0) + g.weight
            if votes:
                top = max(votes, key=votes.get)
                per_finger[top] = per_finger.get(top, 0) + 1
            mname = me.materials[tri.material_index].name if tri.material_index < len(me.materials) and me.materials[tri.material_index] else '(none)'
            mats[mname] = mats.get(mname, 0) + 1
            if uvl:
                for li in tri.loops:
                    uv = uvl.data[li].uv
                    uv_min = [min(uv_min[0], uv.x), min(uv_min[1], uv.y)]
                    uv_max = [max(uv_max[0], uv.x), max(uv_max[1], uv.y)]
    # 手部区域世界包围盒（顶点）
    if v_hand:
        xs = [me.vertices[i].co for i in v_hand]
        mn = [min(v[a] for v in xs) for a in range(3)]
        mx = [max(v[a] for v in xs) for a in range(3)]
        bbox = {'min': [round(x, 4) for x in mn], 'max': [round(x, 4) for x in mx],
                'size': [round(mx[a] - mn[a], 4) for a in range(3)]}
    else:
        bbox = None
    entry = {
        'mesh': o.name, 'total_verts': len(me.vertices), 'total_tris': len(me.loop_triangles),
        'hand_verts': len(v_hand), 'hand_tris': hand_tris,
        'hand_tris_pairs': hand_tris,  # 左右手合计（本模型单手 mesh 含双手）
        'hand_tris_side_split': side_tris,
        'per_finger_group_tris': dict(sorted(per_finger.items(), key=lambda kv: -kv[1])),
        'hand_materials_tris': dict(sorted(mats.items(), key=lambda kv: -kv[1])),
        'hand_uv_range': [round(uv_min[0], 4), round(uv_min[1], 4), round(uv_max[0], 4), round(uv_max[1], 4)] if v_hand else None,
        'hand_bbox': bbox,
    }
    report['meshes'].append(entry)
    if hand_tris:
        print(f"[{o.name}] 总 {len(me.vertices)} v / {len(me.loop_triangles)} tri；手部 {len(v_hand)} v / {hand_tris} tri")
        print(f"   左右分侧（x 符号）: {side_tris}")
        print(f"   手部材质面分布: {entry['hand_materials_tris']}")
        print(f"   手部 UV 范围: {entry['hand_uv_range']}")
        print(f"   手部 bbox 尺寸(m): {bbox['size'] if bbox else None}")
        print(f"   按组前 8: {list(entry['per_finger_group_tris'].items())[:8]}")
        report['hands'][o.name] = {'hand_tris': hand_tris, 'hand_verts': len(v_hand)}

# 每侧手部三角形数（用 x 坐标分左右：模型坐标 x>0 侧）
print('--- 注：hand_tris=左右手合计；side_split 按三角面心 x 符号分侧（VRM 惯例 +x=角色左）---')
if JSON_OUT:
    with open(JSON_OUT, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print('report saved:', JSON_OUT, os.path.getsize(JSON_OUT), 'bytes')
print('=== probe done ===')
