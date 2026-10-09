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
# ---------- 区域分布 / 每指分段 / 手部 UV 岛（2026-10-09 深勘测） ----------
REGION_RULES = [
    ('face', ('Face', 'Eye', 'Brow', 'Eyelash')),
    ('hair', ('Hair',)),
    ('head_neck', ('Head', 'Neck', 'Jaw')),
    ('torso', ('Chest', 'Spine', 'Hips', 'Shoulder', 'Breast')),
    ('hand', ('Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Little')),
    ('forearm', ('LowerArm',)), ('upperarm', ('UpperArm',)),
    ('thigh', ('UpperLeg',)), ('shin', ('LowerLeg',)),
    ('foot', ('Foot',)), ('toe', ('Toes',)),
]
FINGER_KEYS = ('Thumb', 'Index', 'Middle', 'Ring', 'Little')


def region_of(name):
    for reg, keys in REGION_RULES:
        for k in keys:
            if k in name:
                return reg
    return 'other:' + name


report['regions'] = {}
report['finger_segments'] = {}
report['hand_uv_islands'] = {}


def uv_islands_of(me, face_ids):
    """面集合内按 UV 连通性分岛（同顶点且 UV 近似=连通；接缝断开）"""
    uvl = me.uv_layers.active
    if not uvl or not face_ids:
        return []
    parent = {}

    def find(a):
        r = a
        while parent.get(r, r) != r:
            r = parent[r]
        while parent.get(a, a) != a:
            parent[a], a = r, parent[a]
        return r

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    loops_by_vert = {}
    tri_of_loop = {}
    for ti in face_ids:
        tri = me.loop_triangles[ti]
        ls = list(tri.loops)
        for li in ls:
            parent.setdefault(li, li)
            v = me.loops[li].vertex_index
            loops_by_vert.setdefault(v, []).append(li)
            tri_of_loop[li] = ti
        union(ls[0], ls[1])
        union(ls[1], ls[2])
    for v, ls in loops_by_vert.items():
        for i in range(1, len(ls)):
            a, b = ls[0], ls[i]
            ua, ub = uvl.data[a].uv, uvl.data[b].uv
            if abs(ua.x - ub.x) < 1e-4 and abs(ua.y - ub.y) < 1e-4:
                union(a, b)
    islands = {}
    for li in parent:
        root = find(li)
        islands.setdefault(root, {'tris': set(), 'u0': 9, 'v0': 9, 'u1': -9, 'v1': -9})
        cell = islands[root]
        cell['tris'].add(tri_of_loop[li])
        uv = uvl.data[li].uv
        cell['u0'] = min(cell['u0'], uv.x); cell['v0'] = min(cell['v0'], uv.y)
        cell['u1'] = max(cell['u1'], uv.x); cell['v1'] = max(cell['v1'], uv.y)
    out = [{'tris': len(c['tris']), 'uv_bbox': [round(c['u0'], 4), round(c['v0'], 4), round(c['u1'], 4), round(c['v1'], 4)]}
           for c in islands.values()]
    return sorted(out, key=lambda d: -d['tris'])


for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    me = o.data
    me.calc_loop_triangles()
    gi2name = {vg.index: vg.name for vg in o.vertex_groups}
    regions, fingers, hand_face_ids = {}, {}, []
    for ti, tri in enumerate(me.loop_triangles):
        votes = {}
        for vi in tri.vertices:
            for g in me.vertices[vi].groups:
                nm = gi2name.get(g.group)
                if nm:
                    votes[nm] = votes.get(nm, 0.0) + g.weight
        if not votes:
            continue
        top = max(votes, key=votes.get)
        reg = region_of(top)
        regions[reg] = regions.get(reg, 0) + 1
        if reg == 'hand':
            hand_face_ids.append(ti)
            if any(k in top for k in FINGER_KEYS):
                fingers[top] = fingers.get(top, 0) + 1
    report['regions'][o.name] = dict(sorted(regions.items(), key=lambda kv: -kv[1]))
    print(f"[{o.name}] 区域面数: {report['regions'][o.name]}")
    if fingers:
        report['finger_segments'][o.name] = dict(sorted(fingers.items()))
        print(f"[{o.name}] 每指分段面数: {report['finger_segments'][o.name]}")
    if hand_face_ids:
        isl = uv_islands_of(me, hand_face_ids)
        report['hand_uv_islands'][o.name] = isl
        print(f"[{o.name}] 手部 UV 岛 {len(isl)} 个；前 6 大: {isl[:6]}")

print('--- 注：hand_tris=左右手合计；side_split 按三角面心 x 符号分侧（VRM 惯例 +x=角色左）---')
if JSON_OUT:
    with open(JSON_OUT, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print('report saved:', JSON_OUT, os.path.getsize(JSON_OUT), 'bytes')
print('=== probe done ===')
