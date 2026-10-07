# v7 贴片眼优化 v6：v5（虹膜重染+眉毛前浮+alpha 逐列裁剪+表情眉上移补偿）+ 眉毛纯黑染色
# （2026-10-03 院长裁决"眉毛换纯黑"：眉毛贴图 RGB 全置 0，笔画形状/柔边由 alpha 承载）
# v5 内容：表情眉毛上移补偿（Fcl_ALL_Angry/Sorrow 眉毛顶点 deltaZ +16mm——sad/angry 下眉毛
# 被下压 13.4/13.6mm 沉入眼睑被覆盖=中段"截断"，院长裁决上移）
# 手绘贴图接入（Krita 轮）：krita_round/handpaint_{iris,brow,face_skin}.png 存在则优先换入
# 并跳过对应程序化步骤（手绘稿即最终态）。画稿命名约定见《诺诺Krita手绘轮指导单》。
# 白块根因（2026-10-02 黑机实验定位）：眉毛贴图 alpha 从笔画向外长尾渐变（alpha 0.01~0.5 的
# 像素是不透明像素的近 3 倍），three-vrm 下眉毛材质为 BLEND 模式（transparent/alphaTest=0/
# depthWrite=false），低 alpha 棕色像素全部参与渲染；眉毛贴片前浮 1.5mm 后这些像素叠进刘海
# 区域，仰视+视线向上时半透明棕叠深发=浅色碎片"白块"。与表情无关（v5 无前浮故永不复现）。
# 修法演进：v3 全局 smoothstep(0.25,0.5) 把眉毛柔边体量一并裁掉→眉毛"断截"（院长复验否决）；
# v4 改逐列裁剪——只裁每列笔画核心（alpha>0.5）上缘以上的雾状带，笔画本体/柔边/尾梢原样保留。
import bpy
import numpy as np
import os

# 路径以脚本自身定位（2026-10-04 目录收纳后不再依赖仓库绝对路径）
_NONO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VRM_IN = os.path.join(_NONO_ROOT, "模型", "nonono_v5.vrm")
VRM_OUT = os.path.join(_NONO_ROOT, "模型", "nonono_v7_vroid_eye.vrm")

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
r = bpy.ops.import_scene.vrm(filepath=VRM_IN)
print("import:", r)

face_obj = bpy.data.objects["Face"]
me = face_obj.data

# 手绘稿加载：krita_round/handpaint_*.png 存在则返回打包图（Krita 导出稿即最终态）
HANDPAINT_DIR = os.path.join(_NONO_ROOT, "手绘轮工作区")

def load_handpaint(fname):
    p = os.path.join(HANDPAINT_DIR, fname)
    if not os.path.exists(p):
        return None
    img = bpy.data.images.load(p)
    img.pack()
    return img

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

hp_iris = load_handpaint("handpaint_iris.png")
if hp_iris:
    for n in iris_nodes:
        n.image = hp_iris
    print("iris: 手绘稿换入，跳过程序化重染")
else:
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

# 眉毛前浮 1.5mm：修复 sad/angry 表情眉毛沉入脸内（v5 原生缺陷：眉毛条贴脸过近+捏模眉高-0.1 加剧）
brow_slots = [i for i, m in enumerate(me.materials) if m and m.name.startswith("N00_000_00_FaceBrow")]
brow_verts = {vi for p in me.polygons if p.material_index in brow_slots for vi in p.vertices}
for idx in brow_verts:
    v = me.vertices[idx]
    v.co += v.normal * 0.0015
print("brow verts floated:", len(brow_verts))

# 眉毛贴图 alpha 处理 v4：逐列上方雾状裁剪（v3 全局 smoothstep 废弃——把眉毛柔边体量一并
# 裁掉导致眉毛"断截"，2026-10-02 院长复验发现）。白块肇事区=眉毛笔画上方的雾状带（前浮后
# 叠进刘海）；笔画本体及柔边是眉毛观感必需（BLEND 下低 alpha 体量缺失=断截），原样保留。
# 逐列：以 alpha>0.5 核心像素上缘为界，上缘+4px 以上置 0；无核心列不裁（保尾梢淡出段）。
brow_imgs = {}
for mi in brow_slots:
    for n in me.materials[mi].node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image and n.image.size[0] > 64:  # 跳过 8x8 工具图
            brow_imgs[n.image.name] = n.image

hp_brow = load_handpaint("handpaint_brow.png")
if hp_brow:
    swapped_nodes = 0
    for mi in brow_slots:
        for n in me.materials[mi].node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and n.image.size[0] > 64:
                n.image = hp_brow
                swapped_nodes += 1
    print(f"brow: 手绘稿换入 x{swapped_nodes}，跳过 alpha 逐列裁剪+纯黑染色（手绘稿自含最终态）")
else:
    for img in brow_imgs.values():
        w, h = img.size
        arr = np.zeros(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(arr)
        px = arr.reshape(-1, 4)
        a = px[:, 3].reshape(h, w)  # 行 0=图像底部（Blender 像素自下而上），行大=图像上方
        out = a.copy()
        margin = 4
        cols_cut = 0
        for x in range(w):
            col = a[:, x]
            core = np.where(col > 0.5)[0]
            if len(core) == 0:
                continue  # 无核心笔画的列不裁（眉毛尾梢淡出段/空白雾状列原样保留）
            top = core.max()
            if top + margin < h - 1:
                out[int(top) + margin:, x] = 0.0  # 笔画上缘以上（额头/刘海方向）雾状全裁
                cols_cut += 1
        px[:, 3] = out.reshape(-1)
        # 纯黑眉色（2026-10-03 院长裁决）：眉毛贴图 RGB 清零，只保留 alpha 形状——
        # 后续换色只需改这一行目标 RGB（如深蓝黑 (0.10,0.16,0.30)），与虹膜重染同套路
        px[:, :3] = 0.0
        cut_px = int((px[:, 3] < a.reshape(-1)).sum())
        new_img = bpy.data.images.new("brow_alpha_v7_" + img.name, width=w, height=h, alpha=True)
        new_img.pixels.foreach_set(px.reshape(-1))
        new_img.update()
        new_img.pack()
        swapped_nodes = 0
        for mi in brow_slots:
            for n in me.materials[mi].node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image == img:
                    n.image = new_img
                    swapped_nodes += 1
        print(f"brow alpha col-cut: {img.name} {w}x{h} cols_cut={cols_cut}/{w} cut_px={cut_px} nodes:{swapped_nodes}")

# 面部皮肤手绘稿（泪痣等）：Face_00_SKIN 材质贴图换入（程序化步骤无对应项，仅换稿）
hp_face = load_handpaint("handpaint_face_skin.png")
if hp_face:
    swapped_nodes = 0
    for m in me.materials:
        if m and m.name.startswith("N00_000_00_Face_00"):
            for n in m.node_tree.nodes:
                if (n.type == "TEX_IMAGE" and n.image and n.image.size[0] > 64
                        and n.image.name.startswith("_04")):
                    # 只换基色 _04：同材质树还挂着 _05 着色图与 Face_00_out 描边遮罩，
                    # 整树换入会让着色/描边全部错乱（2026-10-07 手绘轮接入前排查修正）
                    n.image = hp_face
                    swapped_nodes += 1
    print(f"face skin: 手绘稿换入 x{swapped_nodes}（泪痣等）")

# 表情眉毛上移补偿 v5（院长裁决"低落/生气时眉毛往上移一点距离"）：Fcl_ALL_Angry/Sorrow
# 下眉毛顶点被下压 13.4/13.6mm（最深 -18.9mm），沉入上眼睑被覆盖=眉毛中段"截断"观感
# （眼皮穿模覆盖，前浮 1.5mm 与 alpha 裁剪均治不了——几何穿插）。补偿：两键的眉毛顶点
# deltaZ 统一 +16mm——中段净上移 ~2.6mm 浮出眼睑，眉毛倾斜形变（倒八字/八字=情绪感）保留。
# 注意：VRM 表情 bind 只指 Fcl_ALL_*（Fcl_BRW_* 未被引用），必须改 ALL 键；BRW 键同步改
# 防未来引用时行为不一致。glTF morphIndex = key_blocks index - 1（Basis 占 0）。
BROW_LIFT = 0.016
sk = me.shape_keys.key_blocks
for kb_name in ('Fcl_ALL_Angry', 'Fcl_ALL_Sorrow', 'Fcl_BRW_Angry', 'Fcl_BRW_Sorrow'):
    key = sk[kb_name]
    for vi in brow_verts:
        key.data[vi].co.z += BROW_LIFT
print(f"brow lift applied: +{BROW_LIFT*1000:.0f}mm x {len(brow_verts)}verts x 4keys")

r = bpy.ops.export_scene.vrm(filepath=VRM_OUT)
print("export:", r)
print("exists:", os.path.exists(VRM_OUT), os.path.getsize(VRM_OUT) // 1024, "KB" if os.path.exists(VRM_OUT) else "")
