# -*- coding: utf-8 -*-
"""Krita 手绘轮 round2 —— API 探针 v2（首次使用 Krita，先摸清真实 API，禁止凭记忆写脚本）
在 Krita Scripter 内：文件→打开本脚本 → 执行（或 Ctrl+R）
v1 教训：Scripter 把 sys.stdout 换成 DocWrapper（只有 write、无 flush），print(..., flush=True) 直接
抛 AttributeError 把头一轮打死且不留日志 → 本版改为「每次 log 立即落盘」，且不用 flush。
输出：工具脚本/krita_r2_probe_log.txt（增量写入，崩溃也留证据）
"""
import os
import sys
import traceback

LOG = r'G:/UGit/nandexueyuan/prd/01-需求文档/05-美术设计/诺诺/工具脚本/krita_r2_probe_log.txt'
L = []


def log(*a):
    s = ' '.join(str(x) for x in a)
    L.append(s)
    try:
        with open(LOG, 'w', encoding='utf-8') as f:
            f.write('\n'.join(L))
    except Exception:
        pass


def sec(name, fn):
    log('')
    log('===== ' + name + ' =====')
    try:
        fn()
    except Exception:
        log('SECTION EXCEPTION:')
        log(traceback.format_exc())


def probe_all():
    log('=== krita_r2_probe v2 START ===')
    log('python:', sys.version.replace('\n', ' '))
    log('cwd:', os.getcwd())

    from krita import Krita
    app = Krita.instance()
    log('Krita version:', app.version())

    for mod in ('PyQt6', 'PyQt5'):
        try:
            m = __import__(mod, fromlist=['QtCore'])
            from importlib import import_module
            qc = import_module(mod + '.QtCore')
            log('%s OK, Qt %s' % (mod, qc.qVersion()))
        except Exception as e:
            log('%s FAIL: %s' % (mod, e))

    sec('Krita.instance() 方法', lambda: log(sorted(
        m for m in dir(app) if not m.startswith('_'))))

    sec('已打开文档', lambda: log([(d.fileName(), d.width(), d.height())
                                 for d in app.documents()]))

    sec('filters()', lambda: log(sorted(app.filters())))

    def probe_paintop():
        log('has paintop attr:', hasattr(app, 'paintop'))
        if hasattr(app, 'paintop'):
            for name in ('paintoppresets', 'brush', 'preset'):
                try:
                    r = app.paintop(name, '')
                    log('paintop(%r, "") -> %s %s' % (name, type(r), str(r)[:200]))
                except Exception as e:
                    log('paintop(%r) FAIL: %s' % (name, e))
    sec('paintop 探针（笔刷预设）', probe_paintop)

    def probe_node_methods():
        from krita import Node
        log('Node 类方法:', sorted(m for m in dir(Node) if not m.startswith('_')))
        docs = app.documents()
        if not docs:
            log('（无打开文档，Document 方法待开文档后再探）')
            return
        d = docs[0]
        log('Document 方法:', sorted(m for m in dir(d) if not m.startswith('_')))
        n = d.rootNode()
        log('rootNode 实例方法:', sorted(m for m in dir(n) if not m.startswith('_')))
    sec('Node/Document 方法', probe_node_methods)

    def probe_filters_to_use():
        want = ['gaussianblur', 'hsvadjustment', 'levels', 'colortransfer',
                'unsharp', 'noise', 'wavelet', 'indexcolors', 'fastcolortransfer',
                'normalize', 'curve', 'gradientmap', 'photocopy',
                'reducecolors', 'threshold', 'blur', 'colorbalance']
        avail = set(app.filters())
        for w in want:
            log('%-20s %s' % (w, 'YES' if w in avail else '-'))
    sec('目标滤镜可用性', probe_filters_to_use)

    def probe_layer_creation():
        docs = app.documents()
        if not docs:
            log('skip: 无文档')
            return
        d = docs[0]
        for meth in ('createFilterLayer', 'createGroupLayer', 'createVectorLayer',
                     'createCloneLayer', 'createFileLayer', 'createNode',
                     'createFilterMask', 'createSelection', 'selection',
                     'setColorSpace', 'colorSpace', 'refreshProjection'):
            log('doc.%-20s %s' % (meth, hasattr(d, meth)))
    sec('层创建/滤镜层能力', probe_layer_creation)

    log('')
    log('=== PROBE v2 DONE ===')


probe_all()
