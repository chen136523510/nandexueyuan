# -*- coding: utf-8 -*-
"""BUG-111 法线平滑后处理（R-058 白机 2026-10-10 草拟，黑机执行）
背景：BUG-111=手指 ×9 保形细分后手部观感粗糙（记录不实现，黑机留窗口解）。
  白机已完成：①PoC 侧法线诊断工具 poc_normal_diag.js + v7 基线（手区冲突率 42.7%/flat 8.5%，
  均为 VRoid 有意造型硬边，非缺陷）②本脚本=网格侧修法①②的执行体。
判据（跑前先对比，勿盲修）：
  黑机对 v11 候选（.blend 或 VRM）先 --mode probe，与 v7 基线对照：
  - 冲突率/flat 率显著上涨 ⇒ 细分丢法线 ⇒ --mode smooth（修法①）
  - 与基线同量级 ⇒ 棱面感放大 ⇒ --mode catmull（修法②，注意体积收缩告警）
  - 详见 poc_normal_diag_baseline_v7_20261010.txt

本脚本提供：
  probe(obj)                —— has_custom_normals / smooth 面占比 / sharp 边数（前后对照即 BUG-111 假设②的决定性验证）
  rebuild_smooth_normals()  —— 修法①：清 custom split normals + 全 smooth + 按角度标 sharp
  catmull_clark()           —— 修法②：Catmull-Clark 细分 ×N（打印体积/包围盒收缩率，超 2% 告警）
  CLI：对 refine.py 的 --blend 产物做后处理并导出 VRM
用法（黑机，两条等价路径）：
  A) 独立后处理（推荐，不重跑 refine）：
     blender.exe --background --factory-startup --python blender_normal_smooth.py -- \
       --blend v11.blend --out v12.vrm [--mode probe|smooth|catmull] [--angle 40]
  B) 会话内 import（refine 流水线内嵌）：
     from blender_normal_smooth import probe, rebuild_smooth_normals, catmull_clark
     probe(obj); rebuild_smooth_normals(obj, angle_deg=40)  # 或 catmull_clark(obj, levels=1)
⚠️ 诚实标注：白机无 Blender，本脚本**未经实跑验证**（API 按 3.x/4.1 官方文档写，已做双版本兼容
  分支）；黑机首跑先 --mode probe 干跑确认兼容性，再上 smooth/catmull。有报错把 traceback 回传白机修。
"""
import bpy
import bmesh
import sys
import math

# ---------------- 参数区 ----------------
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
IN_BLEND = None
OUT_VRM = None
MODE = 'probe'      # probe | smooth | catmull
ANGLE_DEG = 40.0    # 按角度平滑的硬边阈值：两侧面夹角超过则保留 sharp（VRoid 指部棱柱硬边实测 >30°，40 保守）
CC_LEVELS = 1       # Catmull-Clark 次数（×1 面数 ×4，v11 手部 3596 面/手 → ~14k，全模 ~26 万 tri）
VOL_WARN = 0.02     # 体积收缩告警阈值 2%

for i, a in enumerate(argv):
    if a == '--blend' and i + 1 < len(argv):
        IN_BLEND = argv[i + 1]
    if a == '--out' and i + 1 < len(argv):
        OUT_VRM = argv[i + 1]
    if a == '--mode' and i + 1 < len(argv):
        MODE = argv[i + 1]
    if a == '--angle' and i + 1 < len(argv):
        ANGLE_DEG = float(argv[i + 1])
    if a == '--levels' and i + 1 < len(argv):
        CC_LEVELS = int(argv[i + 1])

TARGET_HINT = 'Body_(merged)'   # 皮肤网格名（roundtrip/refine 实测名；手部在其上）


def find_target():
    """按名字找皮肤网格；找不到则取顶点最多的网格兜底并告警。"""
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in meshes:
        if TARGET_HINT in o.name:
            return o
    if meshes:
        best = max(meshes, key=lambda o: len(o.data.vertices))
        print(f'!! 未找到 "{TARGET_HINT}"，兜底取最大网格 {best.name}')
        return best
    return None


def probe(obj, tag=''):
    """法线状态探测（BUG-111 假设②验证点：细分前后 has_custom_normals 对照）。"""
    me = obj.data
    n_smooth = sum(1 for p in me.polygons if p.use_smooth)
    n_sharp = sum(1 for e in me.edges if e.use_edge_sharp)
    r = {
        'tag': tag, 'obj': obj.name,
        'verts': len(me.vertices), 'tris': len(me.polygons),
        'has_custom_normals': getattr(me, 'has_custom_normals', '(API 无此属性)'),
        'smooth_face_ratio': round(n_smooth / max(1, len(me.polygons)), 4),
        'sharp_edges': n_sharp,
    }
    print('[normal_probe]', r)
    return r


def rebuild_smooth_normals(obj, angle_deg=ANGLE_DEG):
    """修法①：清 custom split normals → 全面 smooth → 按角度标 sharp。
    兼容分支：3.x/4.0 用 use_auto_smooth；4.1+ 用官方 shade_auto_smooth（内部=Smooth by Angle 节点）。
    """
    me = obj.data
    # ① 清自定义拆分法线（细分中可能残留/退化的 source）
    if getattr(me, 'has_custom_normals', False):
        bpy.ops.object.customdata_custom_splitnormals_clear()
        print(f'[smooth] 已清除 custom split normals（{obj.name}）')
    # ② 全面 smooth（不依赖 ops，直接写属性）
    for p in me.polygons:
        p.use_smooth = True
    # ③ 按角度标 sharp（bmesh 遍历边，比两侧面法线夹角）
    bm = bmesh.new()
    bm.from_mesh(me)
    thr = math.cos(math.radians(angle_deg))
    marked = 0
    for e in bm.edges:
        if len(e.link_faces) == 2:
            n1, n2 = e.link_faces[0].normal, e.link_faces[1].normal
            if n1.dot(n2) < thr:
                e.smooth = False   # bmesh 里 edge.smooth=False ⇔ use_edge_sharp=True
                marked += 1
    bm.to_mesh(me)
    bm.free()
    print(f'[smooth] 全面 smooth + 按 {angle_deg}° 标 sharp 边 {marked} 条')
    # ④ 启用按角自动平滑（sharp 边生效的开关；4.1 起走官方 op）
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    if hasattr(me, 'use_auto_smooth'):          # Blender ≤4.0
        me.use_auto_smooth = True
        me.auto_smooth_angle = math.radians(angle_deg)
        print('[smooth] use_auto_smooth=True（3.x/4.0 路径）')
    else:                                        # Blender 4.1+
        bpy.ops.object.shade_auto_smooth(use_auto_smooth=True, angle=math.radians(angle_deg))
        print('[smooth] shade_auto_smooth（4.1+ 路径，Smooth by Angle 节点）')


def catmull_clark(obj, levels=CC_LEVELS):
    """修法②：Catmull-Clark 真细分（曲面变圆）。打印收缩率；⚠️ 体积收缩会缩指甲/指节微鼓的隆起量，
    若走此路线黑机需复验甲面高度（refine 的 0.10mm 隆起可能需回补）。"""
    me = obj.data
    v0, t0 = len(me.vertices), len(me.polygons)
    import mathutils
    bb0 = [mathutils.Vector(c) for c in obj.bound_box]
    diag0 = (max(bb0) - min(bb0)).length
    vol0 = me.calc_volume(signed=False)
    mod = obj.modifiers.new('cc_smooth', 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    mod.subdivision_type = 'CATMULL_CLARK'
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bb1 = [mathutils.Vector(c) for c in obj.bound_box]
    diag1 = (max(bb1) - min(bb1)).length
    vol1 = me.calc_volume(signed=False)
    print(f'[catmull] {v0}→{len(me.vertices)} verts, {t0}→{len(me.polygons)} tris; '
          f'体积 {vol0:.6f}→{vol1:.6f}（{(1 - vol1 / max(vol0, 1e-9)) * 100:.2f}% 收缩）, '
          f'包围盒对角 {diag0:.4f}→{diag1:.4f}')
    if vol0 > 0 and (vol0 - vol1) / vol0 > VOL_WARN:
        print(f'!! 体积收缩超 {VOL_WARN * 100:.0f}%——微细节（指节 0.4mm/甲面 0.10mm）可能被削平，需复验或回补')


# ---------------- CLI 主流程（模式 A：对 refine 的 .blend 后处理 → 导出 VRM） ----------------
if __name__ == '__main__' and IN_BLEND:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.preferences.addon_enable(module='bl_ext.user_default.vrm')
    except Exception as e:
        print('!! VRM 插件启用失败（仅 probe 可继续）:', e)
    bpy.ops.wm.open_mainfile(filepath=IN_BLEND)
    print(f'=== blender_normal_smooth mode={MODE} angle={ANGLE_DEG} ===')
    obj = find_target()
    if not obj:
        sys.exit('!! 场景内没有网格')
    probe(obj, tag='before')
    if MODE == 'smooth':
        rebuild_smooth_normals(obj, ANGLE_DEG)
    elif MODE == 'catmull':
        catmull_clark(obj, CC_LEVELS)
    elif MODE != 'probe':
        sys.exit(f'!! 未知 mode: {MODE}')
    probe(obj, tag='after')
    if OUT_VRM and MODE in ('smooth', 'catmull'):
        bpy.ops.export_scene.vrm(filepath=OUT_VRM)
        print(f'[done] 已导出 {OUT_VRM}')
elif __name__ == '__main__':
    print(__doc__)
