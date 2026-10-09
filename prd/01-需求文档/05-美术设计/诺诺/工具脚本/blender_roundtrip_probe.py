# -*- coding: utf-8 -*-
"""VRM 往返基线测试探针（R-058 黑机 2026-10-09）
用途：手部精细化施工规程第一条——「导入 → 不改 → 导出 → 重导入 → 逐项对比」。
      验证 VRM-Addon-for-Blender 往返是否丢数据（官方 issue #1191 风险：SpringBone 导出未完全自动化 /
      BlendShape 可能丢失）。基线通过后才允许在黑机开始手部网格编辑。
用法：blender.exe --background --factory-startup --python blender_roundtrip_probe.py -- <in.vrm> <out.vrm> [--json <report.json>]
输出：控制台逐项对比 + 可选 JSON 报告。
"""
import bpy
import sys
import os
import json

argv = sys.argv
argv = argv[argv.index('--') + 1:] if '--' in argv else []
in_vrm = argv[0] if argv else None
out_vrm = argv[1] if len(argv) > 1 else None
json_out = argv[argv.index('--json') + 1] if '--json' in argv else None

print('=== blender_roundtrip_probe ===')
print('BLENDER', bpy.app.version_string, 'PYTHON', sys.version.split()[0])
if not in_vrm or not out_vrm:
    print('!! usage: -- <in.vrm> <out.vrm> [--json <report.json>]')
    sys.exit(1)

# 环境准备：factory-startup 不加载用户偏好 → 用 addon_enable 正式启用扩展
# （坑：手动 register 的模块没有 addon preferences，导入 MToon 材质时会 AssertionError；
#  正确姿势=read_factory_settings 后 addon_enable，与 blender_walk_gait.py 一致）
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.vrm')
print('addon enabled: bl_ext.user_default.vrm')
try:
    import bl_ext.user_default.vrm as vrm_addon
    manifest_path = os.path.join(os.path.dirname(vrm_addon.__file__), 'blender_manifest.toml')
    with open(manifest_path, encoding='utf-8') as f:
        for line in f:
            if line.strip().startswith('version'):
                print('addon manifest', line.strip())
                break
except Exception as e:
    print('addon manifest read note:', type(e).__name__, e)

print('ops: import_scene.vrm=', hasattr(bpy.ops.import_scene, 'vrm'),
      'export_scene.vrm=', hasattr(bpy.ops.export_scene, 'vrm'),
      'export_scene.vrma=', hasattr(bpy.ops.export_scene, 'vrma'))
try:
    props = [p for p in bpy.ops.export_scene.vrm.get_rna_type().properties.keys() if p != 'rna_type']
    print('export_scene.vrm props:', props)
    rna = bpy.ops.export_scene.vrm.get_rna_type().properties
    print('export_scene.vrm defaults:', {p: rna[p].default for p in props
                                        if p not in ('filepath', 'filter_glob', 'errors', 'rna_type')})
except Exception as e:
    print('export_scene.vrm props: n/a', type(e).__name__, e)


MTOON_KEYS = ['base_color_factor', 'shade_color_factor', 'shading_toony_factor', 'gi_equalization_factor',
              'matcap_factor', 'rim_lighting_mix_factor', 'parametric_rim_color_factor',
              'outline_width_factor', 'outline_color_factor', 'outline_lighting_mix_factor',
              'outline_mode', 'parametric_rim_fresnel_power_factor']


def _mtoon_digest(mat):
    """MToon1 材质参数摘要（材质扩展：mat.vrm_addon_extension.mtoon1）"""
    out = {}
    try:
        ext = getattr(mat, 'vrm_addon_extension', None)
        m1 = getattr(ext, 'mtoon1', None) if ext else None
        out['has_mtoon1'] = m1 is not None
        if m1 is None:
            return out
        out['enabled'] = bool(getattr(m1, 'enabled', False))
        out['alpha_mode'] = str(getattr(m1, 'alpha_mode', None))
        out['double_sided'] = bool(getattr(m1, 'double_sided', False))
        out['alpha_cutoff'] = round(getattr(m1, 'alpha_cutoff', 0.0), 5)
        out['is_outline_material'] = bool(getattr(m1, 'is_outline_material', False))
        mtoon = getattr(getattr(m1, 'extensions', None), 'mtoon', None)
        out['has_mtoon_group'] = mtoon is not None
        if mtoon is not None:
            vals = {}
            for k in MTOON_KEYS:
                v = getattr(mtoon, k, None)
                if v is None:
                    continue
                try:
                    vals[k] = [round(x, 5) for x in v]
                except TypeError:
                    vals[k] = round(v, 5) if isinstance(v, float) else str(v)
            out['mtoon'] = vals
    except Exception as e:
        out['error'] = f'{type(e).__name__}: {e}'
    return out


def _n5(v):
    """5 位小数归一化（消除 -0.0 与 0.0 的字符串假差异）"""
    v = round(float(v), 5)
    return 0.0 if v == 0 else v


def _prop_keys(holder):
    try:
        return [k for k in holder.bl_rna.properties.keys() if k not in ('rna_type',)]
    except Exception:
        return []


def _expr_info(expr):
    """表情绑定信息（addon 4.7.2：Vrm1ExpressionPropertyGroup.morph_target_binds / material_color_binds）"""
    out = {}
    try:
        binds = []
        for b in getattr(expr, 'morph_target_binds', []):
            node = getattr(b, 'node', None)
            binds.append({'node': getattr(node, 'name', None),
                          'index': getattr(b, 'index', None),
                          'weight': round(getattr(b, 'weight', 0.0), 4)})
        out['morph_target_binds'] = binds
        out['material_color_binds'] = len(getattr(expr, 'material_color_binds', []))
        out['texture_transform_binds'] = len(getattr(expr, 'texture_transform_binds', []))
    except Exception as e:
        out['error'] = f'{type(e).__name__}: {e}'
    return out


def snapshot(tag):
    s = {'tag': tag}
    s['objects'] = [{'name': o.name, 'type': o.type, 'parent': o.parent.name if o.parent else None}
                    for o in bpy.data.objects]

    # 网格统计（顶点/面/形态键/顶点组/材质）
    meshes = []
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        me = o.data
        sk = me.shape_keys
        meshes.append({
            'name': o.name,
            'verts': len(me.vertices),
            'polys': len(me.polygons),
            'materials': [m.name if m else None for m in me.materials],
            'vgroups': len(o.vertex_groups),
            'modifiers': [m.type for m in o.modifiers],
            'shape_keys': {
                'count': len(sk.key_blocks) if sk else 0,
                'names': [kb.name for kb in sk.key_blocks] if sk else [],
            },
        })
    s['meshes'] = meshes

    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    s['armature_count'] = len(arms)
    if arms:
        arm = arms[0]
        s['armature_name'] = arm.name
        s['bone_count'] = len(arm.data.bones)
        s['bone_names'] = sorted(b.name for b in arm.data.bones)
        ext = getattr(arm.data, 'vrm_addon_extension', None) or getattr(arm, 'vrm_addon_extension', None)  # VRM 数据挂在骨架数据块（arm.data），对象上没有
        s['has_extension'] = ext is not None
        if ext is not None:
            s['spec_version'] = str(getattr(ext, 'spec_version', None))
            vrm1 = getattr(ext, 'vrm1', None)
            if vrm1 is not None:
                # meta
                try:
                    meta = vrm1.meta
                    s['meta'] = {
                        'vrm_name': getattr(meta, 'vrm_name', None),
                        'version': getattr(meta, 'version', None),
                        'authors': [a.value for a in meta.authors] if hasattr(meta, 'authors') else None,
                        'license': str(getattr(meta, 'license_cc0', None)),
                    }
                except Exception as e:
                    s['meta'] = {'error': f'{type(e).__name__}: {e}'}
                # humanoid
                try:
                    hb = vrm1.humanoid.human_bones
                    keys = _prop_keys(hb)
                    assigned = {}
                    for k in keys:
                        try:
                            node = getattr(hb, k).node
                            bn = node.bone_name if node else ''
                            if bn:
                                assigned[k] = bn
                        except Exception:
                            pass
                    s['humanoid'] = {
                        'slot_total': len(keys),
                        'assigned': len(assigned),
                        'missing': sorted(k for k in keys if k not in assigned),
                        'map': assigned,
                    }
                except Exception as e:
                    s['humanoid'] = {'error': f'{type(e).__name__}: {e}'}
                # expressions（preset 18 + custom；绑定走 morph_target_binds）
                try:
                    ex = vrm1.expressions
                    preset = {}
                    for k in _prop_keys(ex.preset):
                        try:
                            preset[k] = _expr_info(getattr(ex.preset, k))
                        except Exception as e:
                            preset[k] = {'error': f'{type(e).__name__}: {e}'}
                    custom = []
                    try:
                        for c in ex.custom:
                            info = _expr_info(c)
                            info['custom_name'] = getattr(c, 'custom_name', None)
                            custom.append(info)
                    except Exception as e:
                        custom = [{'error': f'{type(e).__name__}: {e}'}]
                    s['expressions'] = {
                        'preset_keys': sorted(preset.keys()),
                        'preset_nonempty': {k: v for k, v in preset.items() if v.get('morph_target_binds') or v.get('material_color_binds') or v.get('texture_transform_binds')},
                        'preset_all': preset,
                        'custom': custom,
                    }
                except Exception as e:
                    s['expressions'] = {'error': f'{type(e).__name__}: {e}'}
                # spring bones（addon 4.7.2：挂在扩展根 ext.spring_bone1，不在 vrm1 下）
                try:
                    s['vrm1_prop_keys'] = _prop_keys(vrm1)
                    sb = getattr(ext, 'spring_bone1', None) or getattr(vrm1, 'spring_bone1', None)
                    if sb is not None:
                        s['spring_attr'] = 'ext.spring_bone1'
                        colliders = []
                        for c in getattr(sb, 'colliders', []):
                            node = getattr(c, 'node', None)
                            item = {'node': getattr(node, 'bone_name', None),
                                    'uuid': getattr(c, 'uuid', None),
                                    'shape_type': str(getattr(c, 'shape_type', None))}
                            try:
                                sh = getattr(c, 'shape', None)
                                sph = getattr(sh, 'sphere', None)
                                if sph is not None:
                                    item['sphere'] = {'offset': tuple(_n5(v) for v in getattr(sph, 'offset', (0, 0, 0))),
                                                      'radius': _n5(getattr(sph, 'radius', 0.0))}
                                cap = getattr(sh, 'capsule', None)
                                if cap is not None:
                                    item['capsule'] = {'offset': tuple(_n5(v) for v in getattr(cap, 'offset', (0, 0, 0))),
                                                       'radius': _n5(getattr(cap, 'radius', 0.0))}
                            except Exception as e:
                                item['shape_note'] = f'{type(e).__name__}: {e}'
                            colliders.append(item)
                        groups = []
                        for g in getattr(sb, 'collider_groups', []):
                            groups.append({'name': getattr(g, 'vrm_name', None),
                                           'uuid': getattr(g, 'uuid', None),
                                           'colliders': len(getattr(g, 'colliders', []))})
                        uuid2name = {g['uuid']: g['name'] for g in groups if g.get('uuid')}
                        springs = []
                        for sp in getattr(sb, 'springs', []):
                            joints = []
                            for j in getattr(sp, 'joints', []):
                                node = getattr(j, 'node', None)
                                joints.append({
                                    'node': getattr(node, 'bone_name', None),
                                    'stiffness': _n5(getattr(j, 'stiffness', 0.0)),
                                    'drag': _n5(getattr(j, 'drag_force', 0.0)),
                                    'gravity_power': _n5(getattr(j, 'gravity_power', 0.0)),
                                    'hit_radius': _n5(getattr(j, 'hit_radius', 0.0)),
                                })
                            cg = []
                            for g in getattr(sp, 'collider_groups', []):
                                u = getattr(g, 'collider_group_uuid', None)
                                cg.append(uuid2name.get(u, u))
                            center = getattr(getattr(sp, 'center', None), 'bone_name', None)
                            springs.append({
                                'name': getattr(sp, 'vrm_name', None),
                                'center': center,
                                'joints': joints,
                                'collider_groups': cg,
                            })
                        s['spring_bone1'] = {'colliders': colliders, 'collider_groups': groups, 'springs': springs,
                                             'spring_count': len(springs),
                                             'joint_total': sum(len(sp['joints']) for sp in springs)}
                    else:
                        s['spring_bone1'] = None
                except Exception as e:
                    s['spring_bone1'] = {'error': f'{type(e).__name__}: {e}'}
                # lookAt / first person / humanoid 其他
                try:
                    la = vrm1.look_at
                    s['look_at'] = {'type': str(getattr(la, 'type', None)),
                                    'offset_from_head_bone': tuple(round(v, 5) for v in getattr(la, 'offset_from_head_bone', (0, 0, 0)))}
                except Exception as e:
                    s['look_at'] = {'error': f'{type(e).__name__}: {e}'}
                try:
                    s['expressions_other'] = {
                        'look_at_type': str(getattr(vrm1.expressions, 'look_at_type', None)),
                        'override_blink': str(getattr(vrm1.expressions, 'override_blink', None)),
                        'override_look_at': str(getattr(vrm1.expressions, 'override_look_at', None)),
                    }
                except Exception as e:
                    s['expressions_other'] = {'error': f'{type(e).__name__}: {e}'}
            else:
                s['vrm0'] = {'note': 'no vrm1 extension on this armature'}

    s['materials'] = [m.name for m in bpy.data.materials]
    s['material_mtoon'] = {m.name: _mtoon_digest(m) for m in bpy.data.materials}
    s['images'] = [{'name': i.name, 'size': tuple(i.size), 'packed': i.packed_file is not None,
                    'filepath': os.path.basename(i.filepath) if i.filepath else None}
                   for i in bpy.data.images]
    return s


# ---------- 1) 导入原模型（环境已在上方 addon_enable 就绪） ----------
t0 = os.path.getsize(in_vrm)
print('IMPORT', in_vrm, t0, 'bytes')
try:
    bpy.ops.import_scene.vrm(filepath=in_vrm)
    print('VRM_IMPORT_OK')
except Exception as e:
    print('VRM_IMPORT_FAIL', type(e).__name__, e)
    sys.exit(2)
src = snapshot('source')

# ---------- 2) 原样导出（不改任何数据） ----------
for o in bpy.data.objects:
    o.select_set(True)
arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
if arms:
    bpy.context.view_layer.objects.active = arms[0]
export_note = ''
try:
    bpy.ops.export_scene.vrm(filepath=out_vrm)
    print('VRM_EXPORT_OK', out_vrm, os.path.getsize(out_vrm), 'bytes')
except TypeError as e:
    # 参数不匹配时回退最小调用
    export_note = f'fallback: {type(e).__name__}: {e}'
    bpy.ops.export_scene.vrm(filepath=out_vrm)
    print('VRM_EXPORT_OK(minimal)', os.path.getsize(out_vrm), 'bytes')
except Exception as e:
    print('VRM_EXPORT_FAIL', type(e).__name__, e)
    src['export_error'] = f'{type(e).__name__}: {e}'
    if json_out:
        json.dump({'source': src, 'roundtrip': None}, open(json_out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(3)
if export_note:
    src['export_note'] = export_note

# ---------- 3) 重导入往返产物 ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.vrm')
try:
    bpy.ops.import_scene.vrm(filepath=out_vrm)
    print('ROUNDTRIP_IMPORT_OK')
except Exception as e:
    print('ROUNDTRIP_IMPORT_FAIL', type(e).__name__, e)
    src['roundtrip_error'] = f'{type(e).__name__}: {e}'
    if json_out:
        json.dump({'source': src, 'roundtrip': None}, open(json_out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(4)
rt = snapshot('roundtrip')
rt['file_size'] = os.path.getsize(out_vrm)

# ---------- 4) 逐项对比 ----------
print('\n=== 往返对比（source → roundtrip）===')
print(f"spec_version: {src.get('spec_version')} → {rt.get('spec_version')}   vrm1 keys 数={len(src.get('vrm1_prop_keys', []))}→{len(rt.get('vrm1_prop_keys', []))}")
print(f"meta.name: {src.get('meta', {}).get('vrm_name')} → {rt.get('meta', {}).get('vrm_name')}")
print(f"file size: {t0} → {rt['file_size']} ({rt['file_size'] - t0:+d})")
print(f"bone_count: {src.get('bone_count')} → {rt.get('bone_count')}")
b_src, b_rt = set(src.get('bone_names', [])), set(rt.get('bone_names', []))
print(f"bone names: 缺失={sorted(b_src - b_rt)} 新增={sorted(b_rt - b_src)}")
h_src, h_rt = src.get('humanoid', {}), rt.get('humanoid', {})
print(f"humanoid assigned: {h_src.get('assigned')} → {h_rt.get('assigned')}  missing={h_rt.get('missing')}")
e_src, e_rt = src.get('expressions', {}), rt.get('expressions', {})
print(f"expressions preset keys: {len(e_src.get('preset_keys', []))} → {len(e_rt.get('preset_keys', []))}")
pe_src, pe_rt = e_src.get('preset_nonempty', {}), e_rt.get('preset_nonempty', {})
print(f"expressions 非空 preset: {len(pe_src)} → {len(pe_rt)}")


def _binds(info):
    return sorted((b['node'], b['index'], b['weight'])
                  for b in (info.get('morph_target_binds', []) if isinstance(info, dict) else []) if 'node' in b)


total_src = sum(len(_binds(v)) for v in pe_src.values())
total_rt = sum(len(_binds(v)) for v in pe_rt.values())
diff_n = 0
for k in sorted(set(pe_src) | set(pe_rt)):
    a, b = pe_src.get(k, {}), pe_rt.get(k, {})
    if len(_binds(a)) != len(_binds(b)):
        print(f"   ! {k} morph bind 数: {len(_binds(a))} → {len(_binds(b))}")
        diff_n += 1
    elif _binds(a) != _binds(b):
        print(f"   ! {k} 绑定内容不同（节点/索引/权重）")
        diff_n += 1
print(f"   preset morph bind 总数: {total_src} → {total_rt}；绑定差异项: {diff_n}")
print(f"expressions custom: {len(e_src.get('custom', []))} → {len(e_rt.get('custom', []))}")
sb_src, sb_rt = src.get('spring_bone1'), rt.get('spring_bone1')
if isinstance(sb_src, dict) and isinstance(sb_rt, dict):
    print(f"springs: {sb_src.get('spring_count')} → {sb_rt.get('spring_count')}  joints: {sb_src.get('joint_total')} → {sb_rt.get('joint_total')}")
    print(f"colliders: {len(sb_src.get('colliders', []))} → {len(sb_rt.get('colliders', []))}  groups: {len(sb_src.get('collider_groups', []))} → {len(sb_rt.get('collider_groups', []))}")

    def _spring_digest(sb):
        return sorted((sp['name'], sp.get('center'), tuple(j['node'] for j in sp['joints']),
                       tuple((j['stiffness'], j['drag'], j['gravity_power'], j['hit_radius']) for j in sp['joints']),
                       tuple(map(str, sp.get('collider_groups', []))))
                      for sp in sb.get('springs', []))

    d_src, d_rt = _spring_digest(sb_src), _spring_digest(sb_rt)
    if d_src == d_rt:
        print('   spring 结构+参数（名称/中心骨/关节链骨名/stiffness/drag/gravity/hit_radius/碰撞组关联）逐条一致 ✓')
    else:
        names_src = [s[0] for s in d_src]
        names_rt = [s[0] for s in d_rt]
        print(f"   ! spring 名称差异: 缺失={sorted(set(names_src) - set(names_rt))} 新增={sorted(set(names_rt) - set(names_src))}")
        for a, b in zip(d_src, d_rt):
            if a != b:
                print(f"   ! spring {a[0]} 差异: 关节链 {len(a[2])}→{len(b[2])} 节；中心骨 {a[1]}→{b[1]}；碰撞组 {a[4]}→{b[4]}")
    col_src = sorted((c.get('node'), c.get('shape_type'), str(c.get('sphere')), str(c.get('capsule'))) for c in sb_src.get('colliders', []))
    col_rt = sorted((c.get('node'), c.get('shape_type'), str(c.get('sphere')), str(c.get('capsule'))) for c in sb_rt.get('colliders', []))
    if col_src != col_rt:
        print(f"   ! collider 差异: 源 {len(col_src)} 往返 {len(col_rt)}；首差异 {[x for x in col_src if x not in col_rt][:2]} vs {[x for x in col_rt if x not in col_src][:2]}")
    else:
        print('   collider（骨/形状/球偏移半径/胶囊）一致 ✓')
else:
    print('spring_bone1: source=', type(sb_src).__name__, 'roundtrip=', type(sb_rt).__name__)
ms_src = {m['name']: m for m in src.get('meshes', [])}
ms_rt = {m['name']: m for m in rt.get('meshes', [])}
print(f"meshes: {len(ms_src)} → {len(ms_rt)}")
for name in sorted(set(ms_src) | set(ms_rt)):
    a, b = ms_src.get(name), ms_rt.get(name)
    if not a or not b:
        print(f"   ! mesh 存在性差异 {name}: {'源' if a else '往返缺失'} / {'往返' if b else '源缺失'}")
        continue
    ska, skb = a['shape_keys'], b['shape_keys']
    flag = '' if (a['verts'] == b['verts'] and ska['names'] == skb['names']) else '  <<< 差异'
    print(f"   {name}: verts {a['verts']}→{b['verts']} polys {a['polys']}→{b['polys']} shapekeys {ska['count']}→{skb['count']}{flag}")
    if ska['names'] != skb['names']:
        print(f"      形态键 缺失={sorted(set(ska['names']) - set(skb['names']))} 新增={sorted(set(skb['names']) - set(ska['names']))}")
im_src = {i['name']: i for i in src.get('images', [])}
im_rt = {i['name']: i for i in rt.get('images', [])}
print(f"images: {len(im_src)} → {len(im_rt)}")
for name in sorted(set(im_src) | set(im_rt)):
    a, b = im_src.get(name), im_rt.get(name)
    if not a or not b:
        print(f"   ! image 存在性差异 {name}: {'源有' if a else '往返缺失'}")
        continue
    if a['size'] != b['size'] or a['packed'] != b['packed']:
        print(f"   ! {name}: size {a['size']}→{b['size']} packed {a['packed']}→{b['packed']}")
print(f"materials: {len(src.get('materials', []))} → {len(rt.get('materials', []))}")
mm_src, mm_rt = src.get('material_mtoon', {}), rt.get('material_mtoon', {})
diff_mats = [n for n in sorted(set(mm_src) | set(mm_rt))
             if json.dumps(mm_src.get(n), sort_keys=True, ensure_ascii=False) != json.dumps(mm_rt.get(n), sort_keys=True, ensure_ascii=False)]
if diff_mats:
    print(f"   ! MToon 参数有差异的材质 {len(diff_mats)}/{len(set(mm_src) | set(mm_rt))}: {diff_mats[:6]}")
    for n in diff_mats[:3]:
        a, b = mm_src.get(n, {}), mm_rt.get(n, {})
        for k in sorted(set(a.get('mtoon', {})) | set(b.get('mtoon', {}))):
            if a.get('mtoon', {}).get(k) != b.get('mtoon', {}).get(k):
                print(f"      {n}.{k}: {a.get('mtoon', {}).get(k)} → {b.get('mtoon', {}).get(k)}")
else:
    print('   MToon 参数一致 ✓')

print('\n=== JSON 关键字段 ===')
report = {'source': src, 'roundtrip': rt}
if json_out:
    with open(json_out, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print('report saved:', json_out, os.path.getsize(json_out), 'bytes')
print('=== probe done ===')
