# 泪痣 UV 定位预标 · R-058 Krita 手绘轮备料
# 目标：算出"角色左眼下方"在面部皮肤贴图(_04)上的 UV/像素坐标，并在贴图副本上画标注图——
# 院长画泪痣时直接在标注点落笔，不用肉眼在贴图里找位置。
# 方法：①VRoid 骨骼 J_Bip_L_UpperArm 世界 x 符号=角色左侧 ②EyeIris 顶点按 x 分簇取左眼
# 中心 ③Blender Z-up 下移 13mm 找最近 Face_00_SKIN 顶点取其 loop UV ④标注导出。
# （v1 教训：Blender 局部系 Z-up，"下"=-z；射线法对曲面易脱靶，最近顶点法更稳）
import bpy
import numpy as np
import os

_NONO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VRM_IN = os.path.join(_NONO_ROOT, "模型", "nonono_v5.vrm")
SRC_TEX = os.path.join(_NONO_ROOT, "手绘轮工作区", "src_v5", "05__04.png")
OUT_TEX = os.path.join(_NONO_ROOT, "手绘轮工作区", "泪痣定位标注.png")

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.vrm(filepath=VRM_IN)

face_obj = bpy.data.objects["Face"]
me = face_obj.data

# ① 角色左侧的世界 x 符号：VRoid 骨骼 J_Bip_L_*=角色左
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
l_arm = arm.pose.bones.get('J_Bip_L_UpperArm')
r_arm = arm.pose.bones.get('J_Bip_R_UpperArm')
lx = (arm.matrix_world @ l_arm.head).x
rx = (arm.matrix_world @ r_arm.head).x
left_sign = 1.0 if lx > rx else -1.0
print(f"L arm x={lx:.3f} R arm x={rx:.3f} -> 角色左侧 x 符号 = {left_sign:+.0f}")

# ② EyeIris 顶点分簇取左眼中心
iris_slots = [i for i, m in enumerate(me.materials) if m and m.name.startswith("N00_000_00_EyeIris")]
iris_vs = sorted({vi for p in me.polygons if p.material_index in iris_slots for vi in p.vertices})
coords = np.array([list(me.vertices[vi].co) for vi in iris_vs])
left_pts = coords[coords[:, 0] * left_sign > 0.005]
iris_c = left_pts.mean(axis=0)
print(f"左眼虹膜 {left_pts.shape[0]} 顶点, 中心 local {[round(float(v), 4) for v in iris_c]}")

# ③ 泪痣目标=虹膜中心正下 13mm（Blender Z-up：下=-z），最近 Face_00_SKIN 顶点取 UV
mole_local = iris_c + np.array([0, 0, -0.013])
skin_slots = [i for i, m in enumerate(me.materials) if m and m.name.startswith("N00_000_00_Face_00")]
skin_vi = {vi for p in me.polygons if p.material_index in skin_slots for vi in p.vertices}
skin_coords = np.array([list(me.vertices[vi].co) for vi in sorted(skin_vi)])
nearest = sorted(skin_vi)[int(np.argmin(((skin_coords - mole_local) ** 2).sum(axis=1)))]
nv = me.vertices[nearest]
print(f"最近 SKIN 顶点 #{nearest} local {[round(float(v), 4) for v in nv.co]} 距离 {np.linalg.norm(np.array(nv.co) - mole_local)*1000:.1f}mm")

uvl = me.uv_layers.active.data
cand = [(uvl[li].uv[0], uvl[li].uv[1]) for p in me.polygons
        if p.material_index in skin_slots and nearest in p.vertices
        for li in p.loop_indices if me.loops[li].vertex_index == nearest]
u, v = float(cand[0][0]), float(cand[0][1])
print(f"泪痣 UV = ({u:.4f}, {v:.4f}) 候选数 {len(cand)}")

# ④ 贴图标注：Blender 像素 row0=底、UV v=0=底一致；px=(u*w, v*h 自底)，画同心圆+十字
img = bpy.data.images.load(SRC_TEX)
w, h = img.size
px_cx, px_cy = int(u * w), int(v * h)  # 自底部起算
print(f"泪痣像素坐标（自底） = ({px_cx}, {px_cy}) / {w}x{h}（自顶 y={h-1-px_cy}）")
arr = np.zeros(w * h * 4, dtype=np.float32)
img.pixels.foreach_get(arr)
px = arr.reshape(h, w, 4)
yy, xx = np.mgrid[0:h, 0:w]
r2 = (xx - px_cx) ** 2 + (yy - px_cy) ** 2
ring = (r2 <= 31 ** 2) & (r2 >= 26 ** 2)
cross = ((np.abs(xx - px_cx) <= 1) & (np.abs(yy - px_cy) <= 40)) | \
        ((np.abs(yy - px_cy) <= 1) & (np.abs(xx - px_cx) <= 40))
px[ring, 0], px[ring, 1], px[ring, 2], px[ring, 3] = 1.0, 0.0, 0.0, 1.0
px[cross, 0], px[cross, 1], px[cross, 2], px[cross, 3] = 1.0, 0.0, 0.0, 1.0
out = bpy.data.images.new("mole_mark", width=w, height=h, alpha=True)
out.pixels.foreach_set(px.reshape(-1))
out.update()
out.filepath_raw = OUT_TEX
out.file_format = 'PNG'
out.save()
print("标注图已存:", OUT_TEX)
