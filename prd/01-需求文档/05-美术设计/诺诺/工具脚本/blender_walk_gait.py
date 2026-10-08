# -*- coding: utf-8 -*-
"""诺诺步态 clip 授权脚本（R-058 黑机 2026-10-08·Blender 手调步态轮）
路线：Blender 授权行走循环 → .vrma（VRMC_vrm_animation 1.0）→ nono-poc mixer 播放（替换 walk_loop 配方）

方法（自研，不依赖 Mixamo/GVHMR）：
  1. 下肢用**解析 IK**：给定髋（随骨盆摆动）与踝目标（足部轨迹推导），解大腿/小腿两骨旋转
     —— 踝目标轨迹直接写"接触点不滑动"约束：站立相接触点以 WALK_SPEED 匀速后移（= 世界系静止）
  2. 足部**滚动模型**（跟触地摇 → 平放 → 蹬离摇）：接触点分别是脚跟/整掌/趾球，
     踝高由"接触点贴地"约束反解 —— 从根上消灭穿地与滑步
  3. 上体曲线（骨盆摇/摆/滚、胸腔反扭、头部稳定、摆臂+肘泵）＝ 动作生物力学调研数值
  4. 全过程**世界轴增量**授权（R_w 绕骨头部施加），FK 自检逐帧核验踝目标误差/足底贴地/接触点速度

关键几何（本机实测，见 blender_walk_probe_log.txt）：
  髋 0.9642 / 膝 0.5557 / 踝 0.0980 / 趾球 0.0366（角色朝 -Y，Z-up，左=x+）
  ⚠ 静息腿是完全伸直的（髋−踝 0.8662 = 大腿 0.4085 + 小腿 0.4577），
    故步幅受可达域硬约束（触地瞬间需骨盆下沉），参数化时以此为准

用法：
  blender.exe --background --factory-startup --python blender_walk_gait.py -- <vrm> <out.vrma> [--blend <out.blend>] [--render <dir>]
"""
import bpy
import sys
import os
import math
import json
from mathutils import Matrix, Quaternion, Vector

# ============================== 参数区（调参只动这里） ==============================
P = dict(
    fps=30,
    frames=30,            # 一个步态周期 = 30 帧 = 1.0s（首尾同姿态：第 31 帧 = 第 1 帧，导出时补）
    walk_speed=0.88,      # m/s ——必须与 poc/nono-poc/src/room.js 的 WALK_SPEED 一致（否则滑步）
    step=0.44,            # 步长 m（= walk_speed * T / 2，此处显式写出便于对照）
    duty=0.62,            # 站立相占比（walk ≈ 0.6~0.65）
    t_heel=0.10,          # 脚跟触地摇结束（周期占比）
    t_toeoff=0.44,        # 蹬离摇开始（周期占比）；t_toeoff~duty 为蹬离段
    theta_hs=12.0,        # 触地时脚尖上抬角（度）
    theta_to=28.0,        # 蹬离时脚尖下压角（度）
    swing_lift=0.035,     # 摆动相踝部额外抬升峰值 m
    hip_low=0.932,        # 骨盆最低（双支撑/触地）m ——受可达域约束（步长 0.44 需 ≤0.936）
    hip_high=0.958,       # 骨盆最高（支撑中期）m ——比静息 0.9642 低=行走时膝微屈（真实步态特征）
    sway=0.018,           # 骨盆左右摆幅 m（朝支撑腿）
    pelvic_yaw=3.5,       # 骨盆回转（前腿侧向前）度
    pelvic_roll=2.5,      # 骨盆侧倾（摆动腿侧下沉）度
    spine_yaw_k=0.40,     # 脊柱/胸腔反扭系数（相对骨盆回转）
    chest_yaw_k=0.85,
    upperchest_yaw_k=0.30,
    spine_lean=-1.5,      # 躯干前倾（度，负=前倾）
    chest_lean=-1.0,
    head_yaw_k=0.85,      # 头部反向稳定系数（抵消躯干回转，视线稳）
    arm_down=80.0,        # 手臂下垂基座（度）——App 静息 1.40rad≈80.2°（BUG-096），保持一致防走路结束跳变
    arm_fwd=22.0,         # 摆臂前摆（度，Collins 2009/Bailey 2023/Kang 2023 调研值）
    arm_back=12.0,        # 摆臂后摆（度）
    elbow_base=20.0,      # 肘恒屈（度）
    elbow_pump=6.0,       # 肘随臂前摆加屈（度）→ 14~26°
    shoulder_swing_k=0.12,# 肩带随臂摆（系数）
    toe_out=6.0,          # 站立脚尖外八（度）
    ankle_x=0.075,        # 踝部横向位置（腿轴，m）
    knee_pole_out=0.18,   # 膝极向（外偏分量，防膝内扣）
)

# ============================== 基础工具 ==============================
D2R = math.pi / 180.0
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VRM_PATH = argv[0]
OUT_VRMA = argv[1]
OUT_BLEND = None
RENDER_DIR = None
for i, a in enumerate(argv):
    if a == '--blend' and i + 1 < len(argv):
        OUT_BLEND = argv[i + 1]
    if a == '--render' and i + 1 < len(argv):
        RENDER_DIR = argv[i + 1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.vrm')
bpy.ops.import_scene.vrm(filepath=VRM_PATH)
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
scene = bpy.context.scene
for pb in arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'
    pb.location = (0, 0, 0)
    pb.rotation_quaternion = (1, 0, 0, 0)

BONES = arm.data.bones
REST = {b.name: b.matrix_local.copy() for b in BONES}


def head(name):
    return REST[name].to_translation()


def dirn(name_a, name_b):
    """a→b 的静息方向（b 为 a 的子关节位置）"""
    v = head(name_b) - head(name_a)
    v.normalize()
    return v


# 关节静息位置（子骨头部=父骨末端关节）
HIP_L, HIP_R = head('J_Bip_L_UpperLeg'), head('J_Bip_R_UpperLeg')
KNEE_L, KNEE_R = head('J_Bip_L_LowerLeg'), head('J_Bip_R_LowerLeg')
ANKLE_L, ANKLE_R = head('J_Bip_L_Foot'), head('J_Bip_R_Foot')
TOE_L, TOE_R = head('J_Bip_L_ToeBase'), head('J_Bip_R_ToeBase')
L1 = (KNEE_L - HIP_L).length          # 大腿长 0.4085
L2 = (ANKLE_L - KNEE_L).length        # 小腿长 0.4577
DIR_THIGH_L, DIR_THIGH_R = dirn('J_Bip_L_UpperLeg', 'J_Bip_L_LowerLeg'), dirn('J_Bip_R_UpperLeg', 'J_Bip_R_LowerLeg')
DIR_SHIN_L, DIR_SHIN_R = dirn('J_Bip_L_LowerLeg', 'J_Bip_L_Foot'), dirn('J_Bip_R_LowerLeg', 'J_Bip_R_Foot')
print(f'[geo] L1={L1:.4f} L2={L2:.4f} 静息髋={HIP_L.z:.4f} 踝={ANKLE_L.z:.4f} 趾球={TOE_L.z:.4f}')

# 足底接触点测量（Body 网格静息顶点：z<2cm 的脚部顶点 → 脚跟/趾球/趾尖的 f(前后) 范围）
body = bpy.data.objects.get('Body')
SOLE = {}
SOLE_PT = {}
if body:
    me = body.data
    for side, sgn in (('L', 1), ('R', -1)):
        vs = [v.co for v in me.vertices if v.co.z < 0.02 and sgn * v.co.x > 0.02 and abs(v.co.x) < 0.12]
        if not vs:
            continue
        ys = sorted(v.y for v in vs)
        SOLE[side] = dict(heel=max(ys), toe=min(ys), n=len(vs))
        ank = ANKLE_L if side == 'L' else ANKLE_R
        hv = min([v for v in vs if v.y > ank.y], key=lambda v: v.z)   # 脚跟侧最低点
        tv = min([v for v in vs if v.y <= ank.y], key=lambda v: v.z)   # 趾侧最低点
        SOLE_PT[side] = ((hv.y, hv.z), (tv.y, tv.z))
    print('[sole]', json.dumps({k: {kk: round(vv, 4) for kk, vv in v.items() if kk != 'n'} for k, v in SOLE.items()}, ensure_ascii=False))
    print('[sole-pt]', json.dumps({k: [[round(a, 4), round(b, 4)] for a, b in v] for k, v in SOLE_PT.items()}, ensure_ascii=False))
# 脚跟/趾球相对踝的偏移（f=前=-y, u=上=z）；趾球=ToeBase 头；脚跟/趾尖=网格实测
# 网格实测（静息）：脚部 z<2cm 顶点 y∈[toe, heel]，L 侧 heel y=+0.0802 / toe y=-0.1115，踝 y=+0.0361
#   脚跟 y 更大=更靠后；f=-y → 脚跟相对踝 f = (heel_y - ankle_y) 的负值…统一在此换算成 f 系：
HEEL_F_REL = ((SOLE_PT['L'][0][0] - ANKLE_L.y) if 'L' in SOLE_PT else 0.0383)  # 踝 − 脚跟实测最低点（f，正=踝在其前）
TOE_TIP_F_REL = (ANKLE_L.y - SOLE['L']['toe']) if 'L' in SOLE else 0.147       # 趾尖 − 踝（f）
BALL_F_AHEAD = ANKLE_L.y - TOE_L.y                                            # 趾球关节 − 踝（f）
BALL_JOINT_U = ANKLE_L.z - TOE_L.z                                            # 踝 − 趾球关节（u）=趾球关节静息高
HEEL_OFF = (HEEL_F_REL, ANKLE_L.z)            # 踝 − 脚跟接触点（f,u）
BALL_OFF = (-BALL_F_AHEAD, BALL_JOINT_U)      # 踝 − 趾球关节（f,u）——蹬离绕关节滚动（圆垫模型：
#   若绕"趾球底点"旋转会把关节压低 3.3cm 级误差→趾尖穿地 2.9mm（2026-10-08 实测 diag 定位））
# FK 核验用静息点（armature 空间）：脚跟（foot 骨权重）/ 趾尖（toes 骨权重）
HEEL_REST = (Vector((ANKLE_L.x, SOLE_PT['L'][0][0], SOLE_PT['L'][0][1])) if 'L' in SOLE_PT
             else ANKLE_L + Vector((0, HEEL_F_REL, -ANKLE_L.z)))
TIP_REST = (Vector((ANKLE_L.x, SOLE_PT['L'][1][0], SOLE_PT['L'][1][1])) if 'L' in SOLE_PT
            else ANKLE_L + Vector((0, -TOE_TIP_F_REL, -ANKLE_L.z)))
print(f'[sole] 踝−脚跟 f={HEEL_F_REL:+.4f}  趾球−踝 f={BALL_F_AHEAD:+.4f}  趾尖−踝 f={TOE_TIP_F_REL:+.4f}')


# ============================== 姿态授权（世界轴增量） ==============================
def rot_x(deg):
    """绕世界 X 轴（左右轴）；+deg = 该骨向角色后方摆（前=-Y）"""
    return Quaternion((1, 0, 0), deg * D2R)


def rot_y(deg):
    """绕世界 Y 轴（前后轴）；+deg = +X 侧（左）下沉方向"""
    return Quaternion((0, 1, 0), deg * D2R)


def rot_z(deg):
    """绕世界 Z 轴（竖直轴）；+deg = +X（左）转向 +Y（后）"""
    return Quaternion((0, 0, 1), deg * D2R)


def q_from_to(a, b, fallback=Quaternion((1, 0, 0, 0))):
    """最短弧 a→b"""
    a = a.normalized()
    b = b.normalized()
    d = a.dot(b)
    if d > 0.999999:
        return Quaternion((1, 0, 0, 0))
    if d < -0.999999:
        ax = a.cross(Vector((0, 0, 1)))
        if ax.length < 1e-6:
            ax = a.cross(Vector((0, 1, 0)))
        return Quaternion(ax.normalized(), math.pi)
    ax = a.cross(b).normalized()
    return Quaternion(ax, math.acos(max(-1.0, min(1.0, d))))


class PoseFrame:
    """一帧姿态：自顶向下授权，维护每骨 accum（世界系累计旋转增量）与 M_pose。"""

    def __init__(self):
        self.accum = {}
        self.mpose = {}

    def base(self, name):
        b = BONES[name]
        mp = self.mpose[b.parent.name] if b.parent else Matrix.Identity(4)
        lr = (b.parent.matrix_local.inverted() @ REST[name]) if b.parent else REST[name].copy()
        return mp @ lr

    def set(self, name, r_w=None, t_w=None):
        """r_w: 世界轴增量（绕本骨姿态后头部）；t_w: 世界平移增量（仅 hips 用）"""
        base = self.base(name)
        h = base.to_translation()
        q = r_w if r_w is not None else Quaternion((1, 0, 0, 0))
        m = Matrix.Translation(t_w or Vector((0, 0, 0))) @ Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ base
        pb = arm.pose.bones[name]
        pb.matrix_basis = base.inverted() @ m
        self.mpose[name] = m
        b = BONES[name]
        parent_accum = self.accum[b.parent.name] if b.parent else Quaternion((1, 0, 0, 0))
        self.accum[name] = q @ parent_accum
        return m

    def accum_of(self, name):
        return self.accum.get(name, Quaternion((1, 0, 0, 0)))

    def joint_world(self, name):
        """该骨姿态后头部（armature 空间）"""
        return self.mpose[name].to_translation()

    def point_world(self, name, rest_point):
        """把静息点（armature 空间）按该骨的形变矩阵搬运到姿态后位置"""
        delta = self.mpose[name] @ REST[name].inverted()
        return delta @ rest_point


# ============================== 步态曲线 ==============================
T = P['frames'] / P['fps']
V = P['walk_speed']
STEP = P['step']
DUTY, T_HEEL, T_TOEOFF = P['duty'], P['t_heel'], P['t_toeoff']


def smoothstep(s):
    s = max(0.0, min(1.0, s))
    return s * s * (3 - 2 * s)


def rot2(fu, deg):
    """(f,u) 平面内旋转，+deg = 脚尖上抬（前方向 +u 转）"""
    c, s = math.cos(deg * D2R), math.sin(deg * D2R)
    return (fu[0] * c - fu[1] * s, fu[0] * s + fu[1] * c)


def foot_track(u):
    """单脚轨迹（根相对系；f=前, u=上）：返回 (踝(f,u), 脚俯仰deg, 趾相对脚弯曲deg, 接触点(f,u) or None, 相位名)
    俯仰 >0 = 脚尖上抬。接触点=该时刻贴地的足底点（用于无滑步核验）。"""
    u = u % 1.0
    vT = V * T
    f_heel_end = STEP / 2 - vT * T_HEEL                        # 跟触地摇结束时脚跟接触点
    f_ankle_flat0 = f_heel_end + HEEL_F_REL                    # 平放开始踝位（踝在脚跟接触点前）
    f_ankle_toeoff = f_ankle_flat0 - vT * (T_TOEOFF - T_HEEL)  # 蹬离摇开始踝位
    f_ball_0 = f_ankle_toeoff + BALL_F_AHEAD                   # 蹬离摇开始趾球位
    if u < T_HEEL:
        # ① 脚跟触地摇：接触点=脚跟，俯仰 theta_hs→0
        th = P['theta_hs'] * (1 - u / T_HEEL)
        fc = STEP / 2 - vT * u
        off = rot2(HEEL_OFF, th)
        return (fc + off[0], off[1]), th, 0.0, (fc, 0.0), 'heel'
    if u < T_TOEOFF:
        # ② 全掌平放：俯仰 0；踝匀速后移
        ankle_f = f_ankle_flat0 - vT * (u - T_HEEL)
        return (ankle_f, ANKLE_L.z), 0.0, 0.0, (ankle_f + BALL_F_AHEAD, 0.0), 'flat'
    if u < DUTY:
        # ③ 蹬离摇：绕趾球关节滚动（关节保持静息高度），俯仰 0→-theta_to，趾相对脚反弯保持贴地
        p = (u - T_TOEOFF) / (DUTY - T_TOEOFF)
        th = -P['theta_to'] * p
        fb = f_ball_0 - vT * (u - T_TOEOFF)
        off = rot2(BALL_OFF, th)
        return (fb + off[0], TOE_L.z + off[1]), th, -th, (fb, 0.0), 'toeoff'
    # ④ 摆动相：踝从蹬离末端移到触地起点（前摆收紧），抬升正弦峰，俯仰 -theta_to→0→+theta_hs
    s = (u - DUTY) / (1 - DUTY)
    f_ball_end = f_ball_0 - vT * (DUTY - T_TOEOFF)
    off_end = rot2(BALL_OFF, -P['theta_to'])
    a0 = (f_ball_end + off_end[0], TOE_L.z + off_end[1])
    off_hs = rot2(HEEL_OFF, P['theta_hs'])
    a1 = (STEP / 2 + off_hs[0], off_hs[1])
    e = smoothstep(s)
    f = a0[0] + (a1[0] - a0[0]) * e
    h = a0[1] + (a1[1] - a0[1]) * e + P['swing_lift'] * math.sin(math.pi * s)
    if s < 0.35:
        th = -P['theta_to'] * (1 - s / 0.35)
        toe_rel = -th                       # 趾相对脚保持抬起（与蹬离末态连续），逐渐放松
    elif s < 0.65:
        th = 0.0
        toe_rel = 0.0
    else:
        th = P['theta_hs'] * smoothstep((s - 0.65) / 0.35)
        toe_rel = 0.0
    return (f, h), th, toe_rel, None, 'swing'


def ik_leg(hip, ankle, pole):
    """两骨 IK：返回膝位置。ankle 超出可达域时按方向夹紧（应尽量避免——参数阶段就受可达域约束）"""
    d = ankle - hip
    dist = d.length
    max_reach = (L1 + L2) * 0.9995
    if dist > max_reach:
        d = d * (max_reach / dist)
        dist = max_reach
    dn = d / dist
    cos_a = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist)
    a = math.acos(max(-1.0, min(1.0, cos_a)))
    w = pole - dn * pole.dot(dn)
    if w.length < 1e-6:
        w = Vector((0, -1, 0)) - dn * dn.y * -1
        w = Vector((0, -1, 0)) - dn * (dn.dot(Vector((0, -1, 0))))
    w.normalize()
    knee_dir = dn * math.cos(a) + w * math.sin(a)
    return hip + knee_dir * L1


def build_frame(phi):
    """授权一帧（phi ∈ [0,1)），返回 PoseFrame + 该帧待核验数据"""
    pf = PoseFrame()
    pf.set('Root')  # 根骨静息（Hips 的父级，必须先入 mpose）
    bob = (P['hip_low'] + P['hip_high']) / 2 + (P['hip_high'] - P['hip_low']) / 2 * math.cos(4 * math.pi * (phi - 0.25))
    sway = P['sway'] * math.sin(2 * math.pi * phi)
    yaw = -P['pelvic_yaw'] * math.cos(2 * math.pi * phi)
    roll = -P['pelvic_roll'] * math.sin(2 * math.pi * phi)
    t_hips = Vector((sway, 0.0, bob - HIP_L.z))
    r_hips = rot_x(0.0) @ rot_y(roll) @ rot_z(yaw)
    pf.set('J_Bip_C_Hips', r_hips, t_hips)

    cy = math.cos(2 * math.pi * phi)
    pf.set('J_Bip_C_Spine', rot_y(-0.5 * roll) @ rot_z(P['spine_yaw_k'] * P['pelvic_yaw'] * cy) @ rot_x(P['spine_lean']))
    pf.set('J_Bip_C_Chest', rot_z(P['chest_yaw_k'] * P['pelvic_yaw'] * cy) @ rot_x(P['chest_lean']))
    pf.set('J_Bip_C_UpperChest', rot_z(P['upperchest_yaw_k'] * P['pelvic_yaw'] * cy))
    torso_yaw = (P['spine_yaw_k'] + P['chest_yaw_k'] + P['upperchest_yaw_k']) * P['pelvic_yaw'] * cy - P['pelvic_yaw'] * cy
    pf.set('J_Bip_C_Neck', rot_z(-P['head_yaw_k'] * torso_yaw) @ rot_x(-0.5 * math.cos(4 * math.pi * phi)))
    pf.set('J_Bip_C_Head', rot_z(-P['head_yaw_k'] * torso_yaw * 0.3))

    # 上臂：左臂与右腿同相（φ=0.5 右腿触地=左臂前摆峰值）
    for side, sgn in (('L', 1.0), ('R', -1.0)):
        ph = phi - 0.5 if side == 'L' else phi
        c = math.cos(2 * math.pi * ph)
        arm = (P['arm_fwd'] - P['arm_back']) / 2 + (P['arm_fwd'] + P['arm_back']) / 2 * c  # 前摆为正
        elbow = P['elbow_base'] + P['elbow_pump'] * c
        pf.set(f'J_Bip_{side}_Shoulder', rot_x(-P['shoulder_swing_k'] * arm))
        pf.set(f'J_Bip_{side}_UpperArm', rot_x(-arm) @ rot_y(sgn * P['arm_down']))
        pf.set(f'J_Bip_{side}_LowerArm', rot_x(-elbow))

    # 下肢：IK
    info = {}
    for side, sgn in (('L', 1.0), ('R', -1.0)):
        u = phi if side == 'L' else phi + 0.5
        (f_a, h_a), pitch, toe_rel, contact, phase = foot_track(u)
        ankle_t = Vector((sgn * P['ankle_x'], -f_a, h_a))          # f→-y
        hip = pf.base(f'J_Bip_{side}_UpperLeg').to_translation()
        pole = Vector((sgn * P['knee_pole_out'], -1.0, 0.0)).normalized()  # 前 + 外
        knee = ik_leg(hip, ankle_t, pole)
        thigh_dir = (knee - hip).normalized()
        shin_dir = (ankle_t - knee).normalized()
        acc_hip = pf.accum_of('J_Bip_C_Hips')
        r_thigh = q_from_to(acc_hip @ DIR_THIGH_L, thigh_dir)
        pf.set(f'J_Bip_{side}_UpperLeg', r_thigh)
        acc_thigh = pf.accum_of(f'J_Bip_{side}_UpperLeg')
        r_shin = q_from_to(acc_thigh @ DIR_SHIN_L, shin_dir)
        pf.set(f'J_Bip_{side}_LowerLeg', r_shin)
        # 足：绝对朝向 = 世界俯仰 + 外八 + 骨盆回转继承
        yaw_f = -sgn * P['toe_out'] - yaw
        r_foot_abs = rot_x(-pitch) @ rot_z(yaw_f)
        acc_shin = pf.accum_of(f'J_Bip_{side}_LowerLeg')
        pf.set(f'J_Bip_{side}_Foot', r_foot_abs @ acc_shin.inverted())
        acc_foot = pf.accum_of(f'J_Bip_{side}_Foot')
        r_toe_abs = rot_x(-(pitch + toe_rel)) @ rot_z(yaw_f)
        pf.set(f'J_Bip_{side}_ToeBase', r_toe_abs @ acc_foot.inverted())
        info[side] = dict(target=ankle_t, hip=hip, knee=knee, pitch=pitch, toe_rel=toe_rel, phase=phase,
                          contact=Vector((sgn * P['ankle_x'], -contact[0], contact[1])) if contact else None)
    return pf, info, dict(bob=bob, sway=sway, yaw=yaw, roll=roll)


# ============================== 逐帧授权 + FK 自检 ==============================
NF = P['frames']
stats = dict(ankle_err=0.0, sole_neg=0.0, sole_max=0.0, slide=0.0, slide_at=None, knee_back=0.0, reach_clip=0, swing_clear=9.9)
prev_contact = {}   # (side, phase) -> (f_contact, frame)
rows = []
for fi in range(NF + 1):  # 第 NF+1 帧 = 第 1 帧（循环闭合）
    phi = (fi % NF) / NF
    scene.frame_set(fi + 1)
    pf, info, extra = build_frame(phi)
    bpy.context.view_layer.update()
    for side in ('L', 'R'):
        d = info[side]
        ankle_act = pf.joint_world(f'J_Bip_{side}_Foot')   # 姿态后 Foot 骨头部=踝
        err = (ankle_act - d['target']).length
        stats['ankle_err'] = max(stats['ankle_err'], err)
        # 足底核验：脚跟（foot 骨）+ 趾尖（toes 骨）的静息点搬运后 z
        heel_z = pf.point_world(f'J_Bip_{side}_Foot', HEEL_REST).z
        tip_rest = TIP_REST if side == 'L' else Vector((-TIP_REST.x, TIP_REST.y, TIP_REST.z))
        tip_z = pf.point_world(f'J_Bip_{side}_ToeBase', tip_rest).z
        zmin = min(heel_z, tip_z)
        if zmin < -0.001 and d['contact'] is not None:
            print('[diag] f%d %s %s heel_z=%.4f tip_z=%.4f ankle_u=%.4f pitch=%.1f' %
                  (fi + 1, side, d['phase'], heel_z, tip_z, d['target'].z, d['pitch']))
        if d['contact'] is not None:
            stats['sole_neg'] = min(stats['sole_neg'], zmin)
            stats['sole_max'] = max(stats['sole_max'], zmin)
        elif d['phase'] == 'swing':
            us = (max(0.0, phi if side == 'L' else phi + 0.5) % 1.0)
            ss = (us - DUTY) / (1 - DUTY)
            if 0.1 < ss < 0.85:
                stats['swing_clear'] = min(stats['swing_clear'], zmin)
        # 接触点无滑步核验（同相位内跨帧比较；接触点世界系静止 ⇔ 根相对系匀速后移 V）
        if d['contact'] is not None:
            key = (side, d['phase'])
            if key in prev_contact and prev_contact[key][1] == fi - 1:
                df = d['contact'].y - prev_contact[key][0].y   # +y=后移
                err = abs(df - V * T / NF)
                if err > stats['slide']:
                    stats['slide'] = err
                    stats['slide_at'] = (fi + 1, side, d['phase'], round(df, 4))
            prev_contact[key] = (d['contact'].copy(), fi)
        # 膝方向核验：膝应在髋-踝连线前方（+y=后方 → 反张）
        ha = d['target'] - d['hip']
        kk = d['knee'] - d['hip']
        perp = kk - ha * (kk.dot(ha) / ha.length_squared)
        if perp.y > 0:
            stats['knee_back'] = max(stats['knee_back'], perp.y)
        # IK 夹紧检测（目标超可达域）
        if (d['target'] - d['hip']).length > (L1 + L2) * 0.9995:
            stats['reach_clip'] += 1
    rows.append((fi + 1, round(extra['bob'], 4), round(info['L']['target'][1], 4), round(info['L']['target'][2], 4),
                 round(stats['ankle_err'], 5), info['L']['phase'], info['R']['phase']))
    # 关键帧
    for name in ['J_Bip_C_Hips', 'J_Bip_C_Spine', 'J_Bip_C_Chest', 'J_Bip_C_UpperChest', 'J_Bip_C_Neck', 'J_Bip_C_Head',
                 'J_Bip_L_Shoulder', 'J_Bip_L_UpperArm', 'J_Bip_L_LowerArm', 'J_Bip_R_Shoulder', 'J_Bip_R_UpperArm', 'J_Bip_R_LowerArm',
                 'J_Bip_L_UpperLeg', 'J_Bip_L_LowerLeg', 'J_Bip_L_Foot', 'J_Bip_L_ToeBase',
                 'J_Bip_R_UpperLeg', 'J_Bip_R_LowerLeg', 'J_Bip_R_Foot', 'J_Bip_R_ToeBase']:
        pb = arm.pose.bones[name]
        pb.keyframe_insert('rotation_quaternion', frame=fi + 1)
        if name == 'J_Bip_C_Hips':
            pb.keyframe_insert('location', frame=fi + 1)

print('[FK] 踝目标最大误差 %.6f m（应 <1e-4）' % stats['ankle_err'])
print('[FK] 站立相足底最低 z=%.4f 最高 z=%.4f（应 ≥-0.003 / ≤0.012）' % (stats['sole_neg'], stats['sole_max']))
print('[FK] 接触点速度偏差最大 %.4f m/帧（无滑步，应 <0.003）%s' % (stats['slide'], stats['slide_at']))
print('[FK] 膝反张最大 %.5f m（应 ≤0）  IK 触顶帧数 %d（应 0）' % (stats['knee_back'], stats['reach_clip']))
print('[FK] 摆动相足底最低 z=%.4f（离地间隙，应 >0.003）' % stats['swing_clear'])
print('[FK] 首末帧对照（帧, bob, 踝f, 踝u, 累计误差, 左相, 右相）:')
for r in (rows[:3] + rows[NF - 2:]):
    print('   ', r)

scene.frame_start = 1
scene.frame_end = NF + 1
scene.render.fps = P['fps']

# ============================== 导出 ==============================
r = bpy.ops.export_scene.vrma(filepath=OUT_VRMA, armature_object_name=arm.name)
print('[export] vrma ->', r, os.path.getsize(OUT_VRMA) if os.path.exists(OUT_VRMA) else 'MISSING')
if OUT_BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
    print('[export] blend ->', os.path.getsize(OUT_BLEND) if os.path.exists(OUT_BLEND) else 'MISSING')

# ============================== 预览渲染（可选） ==============================
if RENDER_DIR:
    os.makedirs(RENDER_DIR, exist_ok=True)
    cam_data = bpy.data.cameras.new('gaitcam')
    cam = bpy.data.objects.new('gaitcam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x = 480
    scene.render.resolution_y = 640
    scene.render.film_transparent = False
    try:
        scene.render.engine = 'BLENDER_EEVEE_NEXT'
    except Exception:
        scene.render.engine = 'BLENDER_EEVEE'
    # 灯光 + 世界底色（场景原本无灯，EEVEE 下全黑）
    sun = bpy.data.objects.new('gait_sun', bpy.data.lights.new('gait_sun', 'SUN'))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(55), 0, math.radians(35))
    scene.collection.objects.link(sun)
    fill = bpy.data.objects.new('gait_fill', bpy.data.lights.new('gait_fill', 'SUN'))
    fill.data.energy = 1.2
    fill.rotation_euler = (math.radians(70), 0, math.radians(-120))
    scene.collection.objects.link(fill)
    world = bpy.data.worlds.new('gait_world') if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs[0].default_value = (0.35, 0.38, 0.42, 1.0)
        bg.inputs[1].default_value = 1.0
    cam_data.lens = 50
    for tag, pos, look in (('side', (2.2, 0.0, 1.0), (0.0, 0.0, 1.0)), ('front34', (1.6, -1.9, 1.15), (0.0, 0.0, 1.0))):
        cam.location = Vector(pos)
        d = Vector(look) - Vector(pos)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        for k in range(8):
            f = 1 + round(k * NF / 8)
            scene.frame_set(f)
            scene.render.filepath = os.path.join(RENDER_DIR, f'{tag}_{k:02d}_f{f:02d}.png')
            bpy.ops.render.render(write_still=True)
    print('[render] done ->', RENDER_DIR)
print('=== walk gait build done ===')
