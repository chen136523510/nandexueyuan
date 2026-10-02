# v7 贴片眼优化 v2：虹膜重染像素写入全新图像数据块并换绑节点（绕开"已打包图改像素不生效"问题）
import bpy
import numpy as np
import os

VRM_IN = r"G:\UGit\nandexueyuan\prd\01-需求文档\05-美术设计\诺诺\nonono_v5.vrm"
VRM_OUT = r"G:\UGit\nandexueyuan\prd\01-需求文档\05-美术设计\诺诺\nonono_v7_vroid_eye.vrm"

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
r = bpy.ops.import_scene.vrm(filepath=VRM_IN)
print("import:", r)

face_obj = bpy.data.objects["Face"]
me = face_obj.data

# 收集所有 EyeIris 材质里引用 _02 虹膜贴图的节点
iris_nodes = []
src_img = None
for m in me.materials:
    if m and m.name.startswith("N00_000_00_EyeIris"):
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and n.image.name.startswith("_02"):
                iris_nodes.append(n)
                src_img = n.image
print("iris nodes:", len(iris_nodes), "| src image:", src_img.name if src_img else "NONE")
assert iris_nodes and src_img, "iris texture not found"

w, h = src_img.size
arr = np.zeros(w * h * 4, dtype=np.float32)
src_img.pixels.foreach_get(arr)
px = arr.reshape(-1, 4)
rgb = px[:, :3]
lum = rgb[:, 0] * 0.299 + rgb[:, 1] * 0.587 + rgb[:, 2] * 0.114
target = np.stack([lum * 0.10, lum * 0.16, lum * 0.30], axis=1)  # 亮度标定深蓝黑
# 高亮保护按饱和度判（v2 教训：按亮度判会把亮琥珀虹膜整个保成原色——真高光是低饱和白）
mx = rgb.max(axis=1)
mn = rgb.min(axis=1)
sat = np.where(mx > 1e-5, (mx - mn) / np.maximum(mx, 1e-5), 0.0)
keep = np.clip((0.25 - sat) / 0.15, 0.0, 1.0)[:, None]  # sat<0.10 全保留，sat>0.25 全重染
px[:, :3] = target * (1 - keep) + rgb * keep

new_img = bpy.data.images.new("iris_recolor_v7", width=w, height=h, alpha=True)
new_img.pixels.foreach_set(px.reshape(-1))
new_img.update()
new_img.pack()

swapped = 0
for n in iris_nodes:
    n.image = new_img
    swapped += 1
print("swapped:", swapped, "| new image mean RGB (non-white):",
      [round(float(v), 3) for v in px[:, :3][(sat > 0.3)].mean(axis=0)])

r = bpy.ops.export_scene.vrm(filepath=VRM_OUT)
print("export:", r)
print("exists:", os.path.exists(VRM_OUT), os.path.getsize(VRM_OUT) // 1024, "KB" if os.path.exists(VRM_OUT) else "")
