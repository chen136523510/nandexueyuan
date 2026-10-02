# 白块根因诊断：眉毛前浮的顶点收集范围到底覆盖了什么
# ①FaceBrow 材质三角形顶点的空间分布 ②眉毛贴图 alpha 分布与顶点 UV 采样
import bpy
import numpy as np

VRM_IN = r"G:\UGit\nandexueyuan\prd\01-需求文档\05-美术设计\诺诺\nonono_v5.vrm"

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
r = bpy.ops.import_scene.vrm(filepath=VRM_IN)
print("import:", r)

face_obj = bpy.data.objects["Face"]
me = face_obj.data
uv_layer = me.uv_layers.active.data

brow_slots = [i for i, m in enumerate(me.materials) if m and m.name.startswith("N00_000_00_FaceBrow")]
skin_slots = [i for i, m in enumerate(me.materials) if m and m.name.startswith("N00_000_00_Face_00_SKIN")]
print("brow slots:", brow_slots, "| skin slots:", skin_slots)
for i, m in enumerate(me.materials):
    if m:
        print(f"  slot {i}: {m.name}")

# 眉毛贴图（FaceBrow 材质引用的图像）
brow_img = None
for mi in brow_slots:
    for n in me.materials[mi].node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image:
            print(f"  brow slot {mi} image: {n.image.name} {n.image.size[:]}")
            brow_img = brow_img or n.image

# ① 收集 brow 材质三角形的顶点（与 build_v7_texture.py 相同判据），看空间范围
brow_verts = {vi for p in me.polygons if p.material_index in brow_slots for vi in p.vertices}
skin_verts = {vi for p in me.polygons if p.material_index in skin_slots for vi in p.vertices}
shared = brow_verts & skin_verts
print(f"brow verts: {len(brow_verts)} | skin verts: {len(skin_verts)} | SHARED: {len(shared)}")

bv = np.array([[me.vertices[i].co.x, me.vertices[i].co.y, me.vertices[i].co.z] for i in brow_verts])
print("brow verts XYZ range:")
print("  x: [%.4f, %.4f]  y: [%.4f, %.4f]  z: [%.4f, %.4f]" % (
    bv[:, 0].min(), bv[:, 0].max(), bv[:, 1].min(), bv[:, 1].max(), bv[:, 2].min(), bv[:, 2].max()))

# 顶点是否被 skin 材质三角形引用（共享=推了会拉扯皮肤）
if shared:
    sv = np.array([[me.vertices[i].co.x, me.vertices[i].co.y, me.vertices[i].co.z] for i in shared])
    print("SHARED verts XYZ range:")
    print("  x: [%.4f, %.4f]  y: [%.4f, %.4f]  z: [%.4f, %.4f]" % (
        sv[:, 0].min(), sv[:, 0].max(), sv[:, 1].min(), sv[:, 1].max(), sv[:, 2].min(), sv[:, 2].max()))

# ② 眉毛贴图 alpha 分布（眉毛笔画在哪）+ brow 顶点 UV 处的 alpha
w, h = brow_img.size
arr = np.zeros(w * h * 4, dtype=np.float32)
brow_img.pixels.foreach_get(arr)
alpha = arr.reshape(-1, 4)[:, 3].reshape(h, w)

buv = np.array([list(uv_layer[loop_index].uv) for p in me.polygons if p.material_index in brow_slots for loop_index in p.loop_indices])
print("brow UV range: u [%.3f, %.3f]  v [%.3f, %.3f]" % (buv[:, 0].min(), buv[:, 0].max(), buv[:, 1].min(), buv[:, 1].max()))

ys, xs = np.where(alpha > 0.1)
if len(xs):
    print("alpha>0.1 pixels: %d | UV u [%.3f, %.3f] v [%.3f, %.3f]" % (
        len(xs), xs.min() / w, xs.max() / w, 1 - ys.max() / h, 1 - ys.min() / h))

# 每个 brow 顶点 UV 处的 alpha（采样双线性太重，取最近像素）
def sample_alpha(u, v):
    px = min(w - 1, max(0, int(u * w)))
    py = min(h - 1, max(0, int((1 - v) * h)))
    return alpha[py, px]

alphas = np.array([sample_alpha(u, v) for u, v in buv])
print("brow-triangle loop UV alpha: mean=%.3f  >0.5: %d/%d" % (alphas.mean(), (alphas > 0.5).sum(), len(alphas)))
