# -*- coding: utf-8 -*-
"""手部精细化主脚本（R-058 黑机 2026-10-09）
施工依据：00-调研/01-技术/手部细节建模与驱动业界调研.md §五 施工规程
  ① 往返基线先测（blender_roundtrip_probe.py，v7 已全绿）
  ② 只动手部网格顶点/UV，不碰骨架结构与 SpringBone 分组
  ③ 形态基准=二次元绘画参考 + 本次院长新增参照（逆水寒/永劫无间：立体指甲/指节起伏/掌弓）
  ④ 写实微细节走 Krita 贴膜（本轮先落几何骨架）
  ⑤ 导出后按回归清单复查（roundtrip probe + PoC ?vrm= 上屏）

本脚本做三件事（均可关）：
  1) 手指加密：对手指三角面做**保形细分**（simple subdivide，形状零变化、密度 ×4）——为特写平滑与握拳形变留密度
  2) 立体指甲板：十指远端背侧按解析几何生成贴合指面的弧形甲板（含下沉边沿），新建 Nail 材质
  3) 指节微鼓：MCP/PIP 关节背侧沿法向 <1mm 的平滑隆起（knuckle 参数控制，0=关）

用法：
  blender.exe --background --factory-startup --python blender_hand_refine.py -- <in.vrm> <out.vrm> \
     [--blend <out.blend>] [--render <dir>] [--knuckle 0.4] [--no-nails] [--subdiv 1]
输出：新 VRM + 可选 .blend / 同机位改前改后对比渲染 + 控制台诊断。
"""
import bpy
import bmesh
import sys
import os
import math
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
IN_VRM = argv[0] if argv else None
OUT_VRM = argv[1] if len(argv) > 1 else None
OUT_BLEND = None
RENDER_DIR = None
KNUCKLE_MM = 0.4
DO_NAILS = True
SUBDIV_CUTS = 1
# 掌心法向符号（薄轴方向未定；2026-10-09 实测标定：薄轴=(+0.26,+0.08,-0.96) 左 / 右手镜像，
# 拇指 MCP 偏移在薄轴 +侧（实测 +0.0026m）=拇指在掌侧 → 掌在 +轴侧 → 背（指甲）侧=-轴=朝上，
# 与 VRoid T-pose「掌心朝下」一致 ⇒ 取 -1）
DORSAL_SIGN = -1
for i, a in enumerate(argv):
    if a == '--blend' and i + 1 < len(argv):
        OUT_BLEND = argv[i + 1]
    if a == '--render' and i + 1 < len(argv):
        RENDER_DIR = argv[i + 1]
    if a == '--knuckle' and i + 1 < len(argv):
        KNUCKLE_MM = float(argv[i + 1])
    if a == '--no-nails':
        DO_NAILS = False
    if a == '--subdiv' and i + 1 < len(argv):
        SUBDIV_CUTS = int(argv[i + 1])
    if a == '--dorsal-sign' and i + 1 < len(argv):
        DORSAL_SIGN = int(argv[i + 1])
if not IN_VRM or not OUT_VRM:
    print('!! usage: -- <in.vrm> <out.vrm> [--blend <f>] [--render <dir>] [--knuckle 0.4] [--no-nails] [--subdiv 1]')
    sys.exit(1)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.vrm')
bpy.ops.import_scene.vrm(filepath=IN_VRM)
print('=== blender_hand_refine ===')
print('IMPORT', os.path.basename(IN_VRM))

arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Body'))
me = body.data
FINGERS = ('Thumb', 'Index', 'Middle', 'Ring', 'Little')
SIDES = ('L', 'R')


def dominant_groups(me, names):
    gi2name = {vg.index: vg.name for vg in body.vertex_groups}
    out = []
    for poly in me.polygons:
        votes = {}
        for vi in poly.vertices:
            for g in me.vertices[vi].groups:
                nm = gi2name.get(g.group)
                if nm:
                    votes[nm] = votes.get(nm, 0.0) + g.weight
        out.append(max(votes, key=votes.get) if votes else '')
    return out


def finger_group_faces(me, want_seg=None):
    """返回 {group_name: [poly_index...]}（手指组）"""
    fg = dominant_groups(me, None)
    out = {}
    for i, g in enumerate(fg):
        if not any(k in g for k in FINGERS):
            continue
        if want_seg is not None and not g.endswith(str(want_seg)):
            continue
        out.setdefault(g, []).append(i)
    return out


def verts_of_groups(me, group_names):
    gi2name = {vg.index: vg.name for vg in body.vertex_groups}
    want = set(group_names)
    out = set()
    for v in me.vertices:
        for g in v.groups:
            if gi2name.get(g.group) in want and g.weight > 0.5:
                out.add(v.index)
                break
    return out


def bone_seg(name):
    b = arm.data.bones.get(name)
    if not b:
        return None, None
    return arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local


def hand_frame(side):
    """手掌薄轴（手掌组顶点协方差最小主轴）= 掌法向候选轴（方向未定）"""
    verts = verts_of_groups(me, [f'J_Bip_{side}_Hand'])
    pts = [body.matrix_world @ me.vertices[vi].co for vi in verts]
    n = len(pts) or 1
    c = Vector((sum(p.x for p in pts) / n, sum(p.y for p in pts) / n, sum(p.z for p in pts) / n))
    A = np.array([[p.x - c.x, p.y - c.y, p.z - c.z] for p in pts])
    w, v = np.linalg.eigh(A.T @ A / n)
    axis = Vector((float(v[0, 0]), float(v[1, 0]), float(v[2, 0]))).normalized()
    spread = [float(math.sqrt(max(w[i], 0))) for i in range(3)]
    return axis, c, spread


def dorsal_sign_of(side):
    """逐手标定掌法向符号（v6 教训：两手薄轴互为镜像，用同一全局符号 → 右手翻到掌侧，
    院长 PoC 验收"两只手指甲朝同一方向"即此 bug）。判据：拇指 MCP 在掌侧 → 该侧为掌。"""
    axis, _, _ = hand_frame(side)
    hb = arm.data.bones.get(f'J_Bip_{side}_Hand')
    tb = arm.data.bones.get(f'J_Bip_{side}_Thumb1')
    if hb is None or tb is None:
        return DORSAL_SIGN
    hmid = (arm.matrix_world @ hb.head_local + arm.matrix_world @ hb.tail_local) / 2
    thumb_mcp = arm.matrix_world @ tb.head_local
    return -1 if (thumb_mcp - hmid).dot(axis) > 0 else 1


def dorsal_dir(side):
    """背（指甲）侧方向 = 薄轴 × 逐手符号"""
    axis, _, _ = hand_frame(side)
    return (axis * dorsal_sign_of(side)).normalized()


def finger_dorsal(side, finger):
    """手指背侧 = 掌法向在指轴垂直面内的分量（拇指等角度指同法，nail 仍在同侧）"""
    d = dorsal_dir(side)
    head, tail = bone_seg(f'J_Bip_{side}_{finger}3')
    if head is None:
        return None
    ax = (tail - head).normalized()
    v = d - ax * d.dot(ax)
    return v.normalized() if v.length > 1e-6 else None


def render_views(tag):
    """确定性机位：左手背/斜上/掌心/侧面 4 张（同机位改前改后对比）"""
    if not RENDER_DIR:
        return
    os.makedirs(RENDER_DIR, exist_ok=True)
    sc = bpy.context.scene
    engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
    sc.render.resolution_x = 900
    sc.render.resolution_y = 900
    if sc.world is None:
        sc.world = bpy.data.worlds.new('World')
    sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.09, 0.09, 0.11, 1)
    if not any(o.type == 'LIGHT' for o in bpy.data.objects):
        ld = bpy.data.lights.new('key', 'SUN')
        ld.energy = 3.2
        lo = bpy.data.objects.new('key', ld)
        bpy.context.collection.objects.link(lo)
        lo.rotation_euler = (math.radians(55), 0, math.radians(35))
        ld2 = bpy.data.lights.new('fill', 'SUN')
        ld2.energy = 1.2
        lo2 = bpy.data.objects.new('fill', ld2)
        bpy.context.collection.objects.link(lo2)
        lo2.rotation_euler = (math.radians(-65), 0, math.radians(-140))
    tip = Vector((0, 0, 0))
    n = 0
    for f in FINGERS:
        h, t = bone_seg(f'J_Bip_L_{f}3')
        tip += (h + t) / 2
        n += 1
    tip /= n
    cam_data = bpy.data.cameras.new('cam_hand')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 0.155
    cam = bpy.data.objects.new('cam_hand', cam_data)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam
    d = dorsal_dir('L')
    axf = (bone_seg('J_Bip_L_Middle3')[1] - bone_seg('J_Bip_L_Middle3')[0]).normalized()
    views = {
        'dorsal': d,
        'palm': -d,
        'dorsal45': (d * 0.6 + axf * 0.7).normalized(),
        'tip': axf,
    }
    for name, d in views.items():
        d = d.normalized()
        cam.location = tip + d * 0.6
        look = (tip - cam.location).normalized()
        cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(RENDER_DIR, f'{tag}_{name}.png')
        bpy.ops.render.render(write_still=True)
        print('  render', sc.render.filepath)


print('--- 手部资产勘测（改前）---')
before = finger_group_faces(me)
me.calc_loop_triangles()
print(f'   手指组数 {len(before)}；手指面总数 {sum(len(v) for v in before.values())}（三角前）')
for side in SIDES:
    axis, c, spread = hand_frame(side)
    hb = arm.data.bones.get(f'J_Bip_{side}_Hand')
    hmid = (arm.matrix_world @ hb.head_local + arm.matrix_world @ hb.tail_local) / 2
    thumb_mcp = arm.matrix_world @ arm.data.bones[f'J_Bip_{side}_Thumb1'].head_local
    tm = (thumb_mcp - hmid)
    d_side = dorsal_dir(side)
    print(f'   [{side}] 薄轴=({axis.x:+.2f},{axis.y:+.2f},{axis.z:+.2f}) 展布(m)={[round(x,4) for x in spread]} '
          f'符号={dorsal_sign_of(side):+d} 背侧向=({d_side.x:+.2f},{d_side.y:+.2f},{d_side.z:+.2f}) '
          f'·世界+Z={d_side.dot(Vector((0,0,1))):+.3f}（T-pose 掌心朝下 → 两手都应≈+1）')
    for name in FINGERS:
        d = finger_dorsal(side, name)
        if d:
            head, tail = bone_seg(f'J_Bip_{side}_{name}3')
            print(f'   [{side}{name}] 远端长 {(tail-head).length*1000:.1f}mm 背侧向=({d.x:+.2f},{d.y:+.2f},{d.z:+.2f})')
render_views('before')

# ---------------- 1) 手指保形细分 ----------------
if SUBDIV_CUTS > 0:
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    fg = dominant_groups(me, None)
    edges = set()
    for i, f in enumerate(bm.faces):
        if any(k in fg[i] for k in FINGERS):
            for e in f.edges:
                edges.add(e)
    n_faces = len(bm.faces)
    bmesh.ops.subdivide_edges(bm, edges=list(edges), cuts=SUBDIV_CUTS, use_grid_fill=True)
    bm.to_mesh(me)
    bm.free()
    me.update()
    me.calc_loop_triangles()
    print(f'--- 手指细分 ×{SUBDIV_CUTS}（保形）：面 {n_faces} → {len(me.polygons)}，三角 {len(me.loop_triangles)}')
    # 权重检查：新顶点是否带权重
    n_nw = sum(1 for v in me.vertices if not v.groups)
    print(f'   无权重顶点数（应为 0）：{n_nw}')

# ---------------- 2) 指节微鼓 ----------------
if KNUCKLE_MM > 0:
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    fg = dominant_groups(me, None)
    dorsal_by_seg = {}
    for f in SIDES:
        for name in FINGERS:
            for seg in (1, 2):
                key = f'J_Bip_{f}_{name}{seg}'
                dorsal_by_seg[key] = finger_dorsal(f, name)
    moved = 0
    for i, f in enumerate(bm.faces):
        g = fg[i] if i < len(fg) else ''
        if g not in dorsal_by_seg or dorsal_by_seg[g] is None:
            continue
        d = dorsal_by_seg[g]
        if f.normal.dot(d) < 0.55:
            continue
        s = f'J_Bip_{g.split("_")[2]}_{g.split("_")[3]}'
        for v in f.verts:
            if v.normal.dot(d) < 0.55:
                continue
            v.co += d * (KNUCKLE_MM / 1000.0)
            moved += 1
    bm.to_mesh(me)
    bm.free()
    me.update()
    print(f'--- 指节微鼓 {KNUCKLE_MM}mm：位移顶点样本 {moved}')

# ---------------- 3) 立体指甲板 ----------------
if DO_NAILS:
    # 指甲：位移指尖背侧原网格（甲面微鼓 + 超椭圆平滑收敛），面指派 Nail 材质
    # 路线选择（2026-10-09 黑机）：先试"生成弧形甲板"两版（r=甲宽绕带 / 逐站半径小帽）均不理想
    #   —— 甲板与指面贴合靠圆柱近似，半径估计稍有偏差即漂浮或埋入；改为直接位移原网格：
    #   形状天然贴合指形、无漂浮/无环带，甲形由超椭圆区域控制（宽窄/长短/圆头），
    #   表面细节（甲根新月/自由缘线/高光）留给 Krita 贴图层。
    nail_mat = bpy.data.materials.new('Nail')
    nail_mat.use_nodes = True
    bsdf = next((n for n in nail_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        # 贴近肤色的甲色（只留一点冷调与光泽差；白亮会像贴胶布——v4 实测教训）
        bsdf.inputs['Base Color'].default_value = (0.90, 0.845, 0.845, 1.0)
        if 'Roughness' in bsdf.inputs:
            bsdf.inputs['Roughness'].default_value = 0.34
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = 0.45
    me.materials.append(nail_mat)
    nail_slot = len(me.materials) - 1

    NAIL_TA0, NAIL_TA1 = 0.25, 0.97        # 甲区轴向范围（占远端骨长比：甲根≈DIP 皱褶 → 自由缘抵指尖）
    NAIL_ANG_WIN = math.radians(35)        # 甲区角向窗口（相对该指自标定基准 θmin）
    NAIL_H = 0.22 / 1000.0                 # 甲面隆起量
    NAIL_POW = 2.4

    def superell(ta, ang):
        return (abs(ta) ** NAIL_POW + abs(ang) ** NAIL_POW) ** (1.0 / NAIL_POW)

    mw3 = body.matrix_world.to_3x3()
    inv3 = mw3.inverted()
    finger_frames = []
    for side in SIDES:
        for name in FINGERS:
            gname = f'J_Bip_{side}_{name}3'
            d = finger_dorsal(side, name)
            head, tail = bone_seg(gname)
            if d is None or head is None:
                continue
            axis = (tail - head).normalized()
            L = (tail - head).length
            finger_frames.append({'gname': gname, 'd': d, 'head': head, 'axis': axis, 'L': L,
                                  'verts': list(verts_of_groups(me, [gname]))})

    def nearest_frame(pw):
        best, bestd = None, 1e9
        for fr in finger_frames:
            rel = pw - fr['head']
            perp = (rel - fr['axis'] * rel.dot(fr['axis'])).length
            if perp < bestd:
                bestd, best = perp, fr
        return best

    # ① 逐指自标定 θmin：该指远端段中"最背面"法向与 d 的最小夹角
    #   （消除骨轴不居中 / 低模圆柱面法向量化带来的系统性偏移；v5 对称性失败教训）
    for fr in finger_frames:
        angles = []
        for vi in fr['verts']:
            pw = body.matrix_world @ me.vertices[vi].co
            n = (mw3 @ me.vertices[vi].normal).normalized()
            angles.append(math.acos(max(-1.0, min(1.0, n.dot(fr['d'])))))
        fr['theta_min'] = min(angles) if angles else 0.0

    # ② 甲面隆起（沿顶点法线，软收敛；掩盖超椭圆使边界不硬）
    disp_n = 0
    for fr in finger_frames:
        d, head, axis, L = fr['d'], fr['head'], fr['axis'], fr['L']
        normals = {vi: (mw3 @ me.vertices[vi].normal).normalized() for vi in fr['verts']}
        for vi in fr['verts']:
            pw = body.matrix_world @ me.vertices[vi].co
            rel = pw - head
            ta = rel.dot(axis) / L
            ang = max(0.0, math.acos(max(-1.0, min(1.0, normals[vi].dot(d)))) - fr['theta_min'])
            srad = superell((ta - (NAIL_TA0 + NAIL_TA1) / 2) / ((NAIL_TA1 - NAIL_TA0) / 2), ang / NAIL_ANG_WIN)
            if srad >= 1.0:
                continue
            h = NAIL_H * (1.0 - srad) ** 1.5
            me.vertices[vi].co += inv3 @ (normals[vi] * h)
            disp_n += 1

    # ③ 面指派：最近指 + 轴向范围 + （法向角 − θmin）≤ 窗口 → Nail 材质
    face_n = 0
    per_finger = {}
    frame_of_group = {fr['gname']: fr for fr in finger_frames}
    fg_after = dominant_groups(me, None)   # 细分后重算（面 → 主导顶点组）
    for poly in me.polygons:
        pw = body.matrix_world @ poly.center
        fr = frame_of_group.get(fg_after[poly.index] if poly.index < len(fg_after) else '')
        if fr is None:
            continue
        rel = pw - fr['head']
        ta = rel.dot(fr['axis']) / fr['L']
        if not (NAIL_TA0 <= ta <= NAIL_TA1):
            continue
        fn = (mw3 @ poly.normal).normalized()
        ang = math.acos(max(-1.0, min(1.0, fn.dot(fr['d'])))) - fr['theta_min']
        if ang <= NAIL_ANG_WIN:
            poly.material_index = nail_slot
            face_n += 1
            per_finger[fr['gname']] = per_finger.get(fr['gname'], 0) + 1
    print(f'   θmin(deg)=' + str({fr['gname']: round(math.degrees(fr['theta_min']), 1) for fr in finger_frames}))
    # 甲区轴向实测（诊断：相对 DIP 与指尖的毫米数，用于核对甲长是否压到近端关节）
    for fr in finger_frames:
        hit = [poly.center for poly in me.polygons
               if poly.material_index == nail_slot and nearest_frame(body.matrix_world @ poly.center) is fr]
        if not hit:
            print(f'   [甲区 {fr["gname"]}] 空'); continue
        tas = []
        for c in hit:
            rel = (body.matrix_world @ c) - fr['head']
            tas.append(rel.dot(fr['axis']))
        print(f'   [甲区 {fr["gname"]}] 甲长 {min(tas)*1000:.1f}~{max(tas)*1000:.1f}mm（相对 DIP）；'
              f'远端骨长 {fr["L"]*1000:.1f}mm；甲占远端骨 {min(tas)/fr["L"]*100:.0f}%~{max(tas)/fr["L"]*100:.0f}%')
    print(f'   每指甲面数: {dict(sorted(per_finger.items()))}')
    me.update()
    me.calc_loop_triangles()
    print(f'--- 指甲（位移法 + 自标定）：位移顶点 {disp_n}，指派甲面 {face_n}，材质槽 {nail_slot}（Nail）')

# ---------------- 导出前处理：权重限 4 + 归一（防 >4 影响被导出截断） ----------------
bpy.context.view_layer.objects.active = body
if body.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
try:
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    print('--- 权重清理：限 4 影响 + 全归一')
except Exception as e:
    print('--- 权重清理提示:', type(e).__name__, e)

# ---------------- 导出 ----------------
if OUT_BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
    print('BLEND_SAVED', OUT_BLEND)
for o in bpy.data.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.vrm(filepath=OUT_VRM)
print('VRM_EXPORT_OK', OUT_VRM, os.path.getsize(OUT_VRM), 'bytes')
render_views('after')
print('=== refine done ===')
