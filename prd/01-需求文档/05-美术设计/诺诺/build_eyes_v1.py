# 诺诺眼球总成 v1 构建脚本（在导入的 v5 VRM 场景上操作）
import bpy
import bmesh
import os
import sys
import io
import math
from mathutils import Vector, Quaternion

VRM_PATH = r"G:\UGit\nandexueyuan\prd\01-需求文档\05-美术设计\诺诺\nonono_v5.vrm"
BLEND_OUT = r"G:\UGit\nandexueyuan\prd\01-需求文档\05-美术设计\诺诺\nonono_blender_v1.blend"
RENDER_DIR = os.path.join(os.environ.get("TEMP", "."), "nono_renders")
REPORT = os.path.join(os.environ.get("TEMP", "."), "nono_build_report.txt")

buf = io.StringIO()
def P(*a):
    print(*a)
    print(*a, file=buf)

os.makedirs(RENDER_DIR, exist_ok=True)

# ---------- 1. import ----------
P("=== 1. import vrm ===")
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
r = bpy.ops.import_scene.vrm(filepath=VRM_PATH)
P("import:", r)
if r != {"FINISHED"}:
    open(REPORT, "w", encoding="utf-8").write(buf.getvalue())
    sys.exit(1)

face_obj = bpy.data.objects["Face"]
me = face_obj.data
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
MW = face_obj.matrix_world

# 左右判定：用左腿骨骼的 x 符号（Blender 中角色面向 -Y，角色左=+X）
left_leg = arm.data.bones.get("J_Bip_L_UpperLeg")
left_sign = 1 if left_leg and left_leg.head_local.x > 0 else -1
P("left_sign(+x=char left):", left_sign)

# ---------- 2. 眼区测量（删除前） ----------
P("=== 2. measure eye regions ===")
EYE_MATS = ("N00_000_00_EyeIris", "N00_000_00_EyeHighlight", "N00_000_00_EyeWhite")

def mat_slot_index(prefix):
    for i, m in enumerate(me.materials):
        if m and m.name.startswith(prefix):
            return i
    return None

iris_slots = [i for i, m in enumerate(me.materials) if m and m.name.startswith("N00_000_00_EyeIris")]
eye_slots = [i for i, m in enumerate(me.materials) if m and any(m.name.startswith(p) for p in EYE_MATS)]
P("iris slots:", iris_slots, "eye slots:", eye_slots)

iris_polys = [p for p in me.polygons if p.material_index in iris_slots]
iris_world = [(MW @ p.center, (MW.to_3x3() @ p.normal).normalized()) for p in iris_polys]
L = [t for t in iris_world if t[0].x * left_sign > 0]
R = [t for t in iris_world if t[0].x * left_sign <= 0]
P("iris faces: L=%d R=%d" % (len(L), len(R)))

def side_data(polys):
    cs = [c for c, n in polys]
    center = sum(cs, Vector()) / len(cs)
    normal = sum((n for c, n in polys), Vector()).normalized()
    # 切线坐标系：T=水平(垂直于N和世界Z)，B=竖直
    z = Vector((0, 0, 1))
    T = normal.cross(z).normalized()
    B = T.cross(normal).normalized()
    lo_x = min((c - center).dot(T) for c in cs)
    hi_x = max((c - center).dot(T) for c in cs)
    lo_y = min((c - center).dot(B) for c in cs)
    hi_y = max((c - center).dot(B) for c in cs)
    return dict(center=center, normal=normal, T=T, B=B,
                w=hi_x - lo_x, h=hi_y - lo_y)

data_L = side_data(L)
data_R = side_data(R)
for s, d in (("L", data_L), ("R", data_R)):
    P(f"{s}: center={tuple(round(v,4) for v in d['center'])} w={d['w']:.4f} h={d['h']:.4f} normal={tuple(round(v,3) for v in d['normal'])}")

# 眼孔（全部眼区面）中心与范围
eye_polys = [p for p in me.polygons if p.material_index in eye_slots]
eye_centers = [MW @ p.center for p in eye_polys]
eye_mid = sum(eye_centers, Vector()) / len(eye_centers)
P("eye_mid(两眼中心):", tuple(round(v, 4) for v in eye_mid))

# ---------- 3. 删除贴片眼区（编辑模式操作，保形状键） ----------
P("=== 3. delete flat-eye faces ===")
bpy.context.view_layer.objects.active = face_obj
bpy.ops.object.mode_set(mode="EDIT")
bpy.context.tool_settings.mesh_select_mode = (False, False, True)
bpy.ops.mesh.select_all(action="DESELECT")
for si in eye_slots:
    face_obj.active_material_index = si
    bpy.ops.object.material_slot_select()
bpy.ops.mesh.delete(type="FACE")
bpy.ops.object.mode_set(mode="OBJECT")
P("face verts after delete:", len(me.vertices), "faces:", len(me.polygons))

# ---------- 4. 材质 ----------
def new_mat(name, color, rough=0.35, emis=None, emis_str=0.0, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:  # 5.x 兜底：手动建
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    ecol = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    if ecol is not None and emis:
        ecol.default_value = (*emis, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emis_str
    return m

mat_sclera = new_mat("Eye_Sclera", (0.93, 0.94, 0.96), rough=0.45)
mat_iris = new_mat("Eye_Iris", (0.030, 0.055, 0.115), rough=0.38)   # 深蓝黑（发色同系）
mat_pupil = new_mat("Eye_Pupil", (0.006, 0.008, 0.013), rough=0.32)
mat_hl = new_mat("Eye_Highlight", (1, 1, 1), rough=0.05, emis=(1, 1, 1), emis_str=3.0)
mat_back = new_mat("Eye_SocketBack", (0.02, 0.025, 0.04), rough=0.9)

# ---------- 5. 建眼球总成 ----------
P("=== 5. build eyeball assemblies ===")
def align_quat(direction):
    """返回把 +Z 转到 direction 的四元数"""
    return direction.to_track_quat("Z", "Y")

def add_disc(name, radius, mat, cx, normal, offset, sx=1.0, sy=1.0):
    """在 cx 处沿 normal 方向法向放置的圆盘，offset=沿法线前移"""
    bpy.ops.mesh.primitive_circle_add(vertices=48, fill_type="NGON", radius=radius)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    q = align_quat(normal)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = q
    o.scale = (sx, sy, 1.0)
    o.location = cx + normal * offset
    return o

def add_sphere(name, radius, mat, loc, segments=48, ring_count=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=ring_count, radius=radius, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o

def parent_to_head(obj):
    # 用官方算子做"骨骼相对关联"（BONE_RELATIVE），自动保世界坐标
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    arm.data.bones.active = arm.data.bones["J_Bip_C_Head"]
    bpy.ops.object.parent_set(type="BONE_RELATIVE")
    bpy.ops.object.mode_set(mode="OBJECT")

for side, d in (("L", data_L), ("R", data_R)):
    c, N = d["center"], d["normal"]
    T, B = d["T"], d["B"]
    r_iris = (d["w"] + d["h"]) / 4.0
    # 扁椭球巩膜：横向 19.8mm、纵深 10mm，球心后移 7mm → 前极凸出 3mm、平面处可见弦半径 ~14mm
    ball_c = c - N * 0.0008         # v1.3 旋转锚点≈眼孔平面中心

    # 暗部衬底（封住孔边缘的缝隙，读作眼窝阴影）
    hole_r = max(d["w"], d["h"]) * 0.52
    back = add_disc(f"EyeSocketBack_{side}", hole_r, mat_back, c, N, -0.003, sx=1.38, sy=1.02)
    parent_to_head(back)

    # 巩膜基盘 v1.3：平面白盘填充眼孔（球体方案两面不讨好：大则穿脸、小则黑窝）
    r_sclera = max(d["w"], d["h"]) * 0.5 * 0.95
    ball = add_disc(f"Eyeball_{side}", r_sclera, mat_sclera, c, N, -0.0008, sx=1.15, sy=0.95)
    parent_to_head(ball)

    # 虹膜/瞳孔/高光：浮在椭球前极上方（未来由 pivot 旋转实现 lookAt）
    r_iris_v = r_iris * 0.82
    iris_off = 0.0008
    iris = add_disc(f"Iris_{side}", r_iris_v, mat_iris, c, N, iris_off)
    r_pup = r_iris_v * 0.40
    pup = add_disc(f"Pupil_{side}", r_pup, mat_pupil, c, N, iris_off + 0.0008)
    hl_c = c + Vector((left_sign, 0, 0)) * r_iris_v * 0.45 + B * r_iris_v * 0.42
    hl = add_disc(f"Highlight_{side}", r_iris_v * 0.22, mat_hl, hl_c, N, iris_off + 0.0015)

    # 扁平结构（VRM 导出器会把嵌套在骨骼父级空物体下的子物体双重烘焙，故全部直挂 head 骨，
    # 枢轴数学由 three.js 运行时绕 ball_c 计算）：
    for part in (ball, iris, pup, hl):
        parent_to_head(part)

    P(f"{side}: r_iris={r_iris:.4f} r_sclera={r_sclera:.4f} ball_c={tuple(round(v,4) for v in ball_c)} iris_off={iris_off:.4f}")

# ---------- 6. 保存 .blend（打包贴图） ----------
for img in bpy.data.images:
    try:
        if not img.packed_file:
            img.pack()
    except Exception as e:
        P("pack warn:", img.name, str(e)[:80])
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
P("saved blend:", BLEND_OUT, os.path.getsize(BLEND_OUT) // 1024, "KB")

# ---------- 7. 渲染验证（Cycles GPU） ----------
P("=== 7. render checks ===")
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"
prefs.get_devices()
for dev in prefs.devices:
    dev.use = True
    P("device:", dev.type, dev.name)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "GPU"
sc.cycles.samples = 48
sc.cycles.use_denoising = True
sc.render.resolution_x = 1400
sc.render.resolution_y = 1050
try:
    sc.view_settings.view_transform = "Standard"
except Exception:
    pass

# 相机与灯
eye_mid = (data_L["center"] + data_R["center"]) / 2
N_avg = (data_L["normal"] + data_R["normal"]).normalized()

def add_cam(name, loc, target):
    cd = bpy.data.cameras.new(name)
    cd.lens = 85
    cam = bpy.data.objects.new(name, cd)
    sc.collection.objects.link(cam)
    cam.location = loc
    direction = (Vector(target) - Vector(loc)).normalized()
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = direction.to_track_quat("-Z", "Y")
    sc.camera = cam
    return cam

def add_light(name, type_, loc, energy, size=0.5):
    ld = bpy.data.lights.new(name, type_)
    ld.energy = energy
    if type_ == "AREA":
        ld.size = size
    lo = bpy.data.objects.new(name, ld)
    sc.collection.objects.link(lo)
    lo.location = loc
    return lo

cam = add_cam("CheckCam", tuple(eye_mid + N_avg * 0.45 + Vector((0, 0, 0.01))), eye_mid)
key = add_light("Key", "AREA", tuple(eye_mid + N_avg * 0.5 + Vector((-0.4, -0.2, 0.45))), 35, 0.7)
key.rotation_euler = (Vector((0, 0, 0)) - Vector(key.location)).to_track_quat("-Z", "Y").to_euler()
fill = add_light("Fill", "AREA", tuple(eye_mid + N_avg * 0.5 + Vector((0.5, -0.1, 0.1))), 12, 0.9)
fill.rotation_euler = (Vector((0, 0, 0)) - Vector(fill.location)).to_track_quat("-Z", "Y").to_euler()
rim = add_light("Rim", "AREA", tuple(eye_mid - N_avg * 0.6 + Vector((0.2, 0.3, 0.5))), 60, 1.2)
rim.rotation_euler = (eye_mid - Vector(rim.location)).to_track_quat("-Z", "Y").to_euler()
sc.world = bpy.data.worlds.new("W")
sc.world.use_nodes = True
next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND").inputs[0].default_value = (0.05, 0.05, 0.06, 1)
next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND").inputs[1].default_value = 1.0

def render(name):
    sc.render.filepath = os.path.join(RENDER_DIR, name)
    bpy.ops.render.render(write_still=True)
    P("rendered:", name)

sk = me.shape_keys.key_blocks
bpy.data.objects["Hair"].hide_render = True  # 眼部检查渲染时隐藏刘海遮挡
render("01_neutral.png")

sk["Fcl_EYE_Close"].value = 1.0
render("02_blink.png")
sk["Fcl_EYE_Close"].value = 0.0

# 3/4 视角
cam.location = tuple(eye_mid + (N_avg * 0.4 + Vector((-0.25 * left_sign, -0.25, 0.1))))
cam.rotation_quaternion = (eye_mid - Vector(cam.location)).normalized().to_track_quat("-Z", "Y")
render("03_quarter.png")

# ---------- 8. 顺带扫描导出算子（下一步用） ----------
P("=== 8. export ops scan ===")
found = []
for modname in dir(bpy.ops):
    if modname.startswith("_"):
        continue
    try:
        mod = getattr(bpy.ops, modname)
        ops = [x for x in dir(mod) if "vrm" in x.lower()]
    except Exception:
        continue
    found += [modname + "." + x for x in ops]
P("export-ish:", [f for f in found if "export" in f.lower()])

open(REPORT, "w", encoding="utf-8").write(buf.getvalue())
P("=== build done ===")
