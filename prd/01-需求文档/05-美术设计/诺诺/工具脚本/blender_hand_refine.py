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
    # 指甲 v11 路线（2026-10-09 院长验收两条后定版）：
    #   ① 长度减半（院长指令）② 隆起压到 0.10mm ③ **改贴图着色、不建独立材质**——
    #   原因（院长"为什么能穿模"的答案）：VRM 每个皮肤材质都带一份 "(Outline)" 孪生面（同几何、沿法线外扩的深色壳）；
    #   独立 Nail 材质不在描边体系内，甲面只抬 0.22mm < 描边壳外扩量 → 描边(深色)盖在甲面上 = 深灰锯齿块；
    #   改走皮肤贴图后甲与皮肤同材质同描边，壳不再打架。
    NAIL_TA0, NAIL_TA1 = 0.62, 0.97        # 甲区轴向范围（占远端骨长比；半长版）
    NAIL_ANG_WIN = math.radians(35)        # 甲区角向窗口（相对逐指自标定 θmin）
    NAIL_H = 0.10 / 1000.0                 # 甲面隆起量（压低避免与描边壳打架）
    NAIL_POW = 2.4
    NAIL_RGB = (0.905, 0.845, 0.845)       # 甲色（贴近肤色，微冷）
    NAIL_ALPHA = 0.85

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

    # ① 逐指自标定 θmin（该指远端段"最背面"法向与 d 的最小夹角）
    for fr in finger_frames:
        angles = []
        for vi in fr['verts']:
            n = (mw3 @ me.vertices[vi].normal).normalized()
            angles.append(math.acos(max(-1.0, min(1.0, n.dot(fr['d'])))))
        fr['theta_min'] = min(angles) if angles else 0.0

    # ② 甲面隆起（沿顶点法线，软收敛）
    disp_n = 0
    for fr in finger_frames:
        d, head, axis, L = fr['d'], fr['head'], fr['axis'], fr['L']
        normals = {vi: (mw3 @ me.vertices[vi].normal).normalized() for vi in fr['verts']}
        for vi in fr['verts']:
            rel = (body.matrix_world @ me.vertices[vi].co) - head
            ta = rel.dot(axis) / L
            ang = max(0.0, math.acos(max(-1.0, min(1.0, normals[vi].dot(d)))) - fr['theta_min'])
            srad = superell((ta - (NAIL_TA0 + NAIL_TA1) / 2) / ((NAIL_TA1 - NAIL_TA0) / 2), ang / NAIL_ANG_WIN)
            if srad >= 1.0:
                continue
            h = NAIL_H * (1.0 - srad) ** 1.5
            me.vertices[vi].co += inv3 @ (normals[vi] * h)
            disp_n += 1

    # ③ 甲面收集（按顶点组归属，防串指）
    face_n = 0
    per_finger = {}
    nail_face_ids = []
    frame_of_group = {fr['gname']: fr for fr in finger_frames}
    fg_after = dominant_groups(me, None)
    for poly in me.polygons:
        fr = frame_of_group.get(fg_after[poly.index] if poly.index < len(fg_after) else '')
        if fr is None:
            continue
        pw = body.matrix_world @ poly.center
        ta = (pw - fr['head']).dot(fr['axis']) / fr['L']
        if not (NAIL_TA0 <= ta <= NAIL_TA1):
            continue
        fn = (mw3 @ poly.normal).normalized()
        ang = math.acos(max(-1.0, min(1.0, fn.dot(fr['d'])))) - fr['theta_min']
        if ang <= NAIL_ANG_WIN:
            nail_face_ids.append(poly.index)
            face_n += 1
            per_finger[fr['gname']] = per_finger.get(fr['gname'], 0) + 1

    print('   theta_min(deg)=' + str({fr['gname']: round(math.degrees(fr['theta_min']), 1) for fr in finger_frames}))
    print('   每指甲面数: ' + str(dict(sorted(per_finger.items()))))
    for fr in finger_frames:
        hit = [me.polygons[i].center for i in nail_face_ids
               if frame_of_group.get(fg_after[i]) is fr]
        if not hit:
            print('   [甲区 ' + fr['gname'] + '] 空')
            continue
        tas = [(body.matrix_world @ c - fr['head']).dot(fr['axis']) for c in hit]
        print(f"   [甲区 {fr['gname']}] 甲长 {min(tas)*1000:.1f}~{max(tas)*1000:.1f}mm（相对 DIP）"
              f"＝远端骨 {min(tas)/fr['L']*100:.0f}%~{max(tas)/fr['L']*100:.0f}%（半长版）")

    # ④ 甲形画进皮肤贴图（与皮肤同材质 → 同描边，不再有深色壳盖甲）
    import numpy as np
    uvl = me.uv_layers.active
    img = None
    for mat in me.materials:
        if mat is None or not mat.use_nodes:
            continue
        for n in mat.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image is not None:
                img = n.image
        if img is not None:
            break
    if img is not None and uvl is not None and nail_face_ids:
        W, H = img.size
        px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)   # 行 0=底（与 uv.v 同向，免翻转）
        mask = np.zeros((H, W), dtype=np.float32)
        for fi in nail_face_ids:
            poly = me.polygons[fi]
            pts = [(uvl.data[li].uv.x * W, uvl.data[li].uv.y * H) for li in poly.loop_indices]
            (x1, y1), (x2, y2), (x3, y3) = pts[0], pts[1], pts[2]
            x0, xE = int(max(0, min(x1, x2, x3) - 1)), int(min(W - 1, max(x1, x2, x3) + 1))
            y0, yE = int(max(0, min(y1, y2, y3) - 1)), int(min(H - 1, max(y1, y2, y3) + 1))
            if xE < x0 or yE < y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, xE + 1) + 0.5, np.arange(y0, yE + 1) + 0.5)
            d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
            if abs(d) < 1e-9:
                continue
            aa = ((y2 - y3) * (gx - x3) + (x3 - x2) * (gy - y3)) / d
            bb = ((y3 - y1) * (gx - x3) + (x1 - x3) * (gy - y3)) / d
            cc = 1.0 - aa - bb
            inside = (aa >= -0.02) & (bb >= -0.02) & (cc >= -0.02)
            mask[y0:yE + 1, x0:xE + 1][inside] = 1.0
        if mask.sum() > 0:
            m = mask.copy()
            m[1:-1, 1:-1] = (mask[:-2, 1:-1] + mask[2:, 1:-1] + mask[1:-1, :-2] + mask[1:-1, 2:] + mask[1:-1, 1:-1]) / 5.0
            nail_rgb = np.array(NAIL_RGB, dtype=np.float32)
            alpha = (m * NAIL_ALPHA)[..., None]
            px[..., :3] = px[..., :3] * (1.0 - alpha) + nail_rgb * alpha
            img.pixels[:] = px.reshape(-1).tolist()
            img.pack()
            print(f"   甲面贴图着色：{len(nail_face_ids)} 面 → UV 掩膜 {int(mask.sum())} px（{W}x{H}，色 {NAIL_RGB}）")
        else:
            print('   甲面贴图着色：掩膜为空（跳过）')
    me.update()
    me.calc_loop_triangles()
    print(f'--- 指甲（位移 {NAIL_H*1000:.2f}mm + 贴图着色，半长）：位移顶点 {disp_n}，甲面 {face_n}')

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
