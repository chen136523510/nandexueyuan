# -*- coding: utf-8 -*-
"""VRM 表情权重后处理：把"开心"从 VRoid 的 Fcl_ALL_Joy 整体 1.0 改为分件组合的收敛微笑。

院长 2026-10-08 反馈："开心的表情不喜欢，笑得太过头了，不符合形象"。
原绑定 preset.happy -> Face morph[3]=Fcl_ALL_Joy weight 1.0（VRoid 的"整体开心"：挑眉+眯笑眼+嘴角上扬一起上）。
改法：拆成三个分件按不同权重叠加 —— 眼睛保留柔和度，嘴角大幅收敛（清冷人设"默认脸绝不带笑"）。
可用 morph 索引见 Face 网格 extras.targetNames：
  8=Fcl_BRW_Joy  17=Fcl_EYE_Joy  33=Fcl_MTH_Joy
用法：python patch_vrm_expressions.py [<vrm路径>]
"""
import json
import os
import struct
import sys

DEF = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   '模型', 'nonono_v7_vroid_eye.vrm')

# 收敛微笑配方（可调：想更淡就把 MTH 权重再降）
# v2（2026-10-08）：Fcl_MTH_Joy 是"张口大笑"（渲染实测张嘴明显），清冷人设不要；
# 换成 Fcl_MTH_Up（闭口、嘴角上扬）——这才是"微微笑"。
RECIPE = [
    (17, 0.65),   # Fcl_EYE_Joy  眼睛柔和（保留笑意但不过头）
    (8, 0.35),    # Fcl_BRW_Joy  眉略舒展
    (26, 0.55),   # Fcl_MTH_Up   闭口微笑（嘴角上扬）——主要收这里
]
# 院长 2026-10-08 二次裁决："开心和放松替换" —— 两个预设整体对调：
#   开心(happy)  = VRoid 原生 Fcl_ALL_Fun（较明显的笑）
#   放松(relaxed)= 上述收敛微笑配方（更淡）
ASSIGN = {'relaxed': RECIPE, 'happy': [(2, 1.0)]}


def read_glb(path):
    raw = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<III', raw[:12])
    assert raw[:4] == b'glTF', 'not a glb'
    off, js, bn = 12, None, None
    while off < length:
        clen, ctype = struct.unpack('<II', raw[off:off + 8])
        data = raw[off + 8:off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(data.decode('utf-8'))
        elif ctype == 0x004E4942:
            bn = data
        off += 8 + clen
    return js, bn


def write_glb(path, js, bn):
    jb = json.dumps(js, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bn + b'\x00' * ((4 - len(bn) % 4) % 4)
    total = 12 + 8 + len(jb) + 8 + len(bb)
    out = struct.pack('<III', 0x46546C67, 2, total)
    out += struct.pack('<II', len(jb), 0x4E4F534A) + jb
    out += struct.pack('<II', len(bb), 0x004E4942) + bb
    with open(path, 'wb') as f:
        f.write(out)
    return total


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEF
    js, bn = read_glb(path)
    expr = js['extensions']['VRMC_vrm']['expressions']['preset']
    face_node = None
    for b in expr['happy']['morphTargetBinds']:
        face_node = b['node']
        break
    before = [(b['node'], b['index'], b.get('weight', 1.0)) for b in expr['happy']['morphTargetBinds']]
    names = None
    for m in js['meshes']:
        tn = (m.get('extras') or {}).get('targetNames')
        if tn:
            names = tn
            break
    print('happy 原绑定:', [(i, names[i] if names and i < len(names) else '?', w) for _, i, w in before])
    for preset, recipe in ASSIGN.items():
        expr[preset]['morphTargetBinds'] = [
            {'node': face_node, 'index': i, 'weight': w} for i, w in recipe
        ]
        print('%s 新绑定:' % preset,
              [(i, names[i] if names and i < len(names) else '?', w) for i, w in recipe])
    total = write_glb(path, js, bn)
    print('written', path, total // 1024, 'KB')


if __name__ == '__main__':
    main()
