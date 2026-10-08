# -*- coding: utf-8 -*-
"""诺诺手绘轮 round2 —— Krita 实操（首次实战）
在 Krita Scripter 中：文件→打开本脚本 → 执行（Ctrl+R）

⚠️ 首次实战发现：**Krita 内置 Python 无 numpy**（round1 那份 Scripter 脚本因此从未真正跑过，
   只有无头 PIL 路径可用）。故本脚本保持零第三方依赖：
   - 所有数组计算在系统 Python 完成（iris_r2_krita_raw.py），落成 .raw 缓冲
   - Krita 侧只做：开原稿 → 校准写入约定 → 逐层建层 → 导出 + 存 .kra
校准法：写探针块后**读回比对字节**（约定一致则写入=读回，字节全等），四种候选取零差异者。
日志：工具脚本/krita_round2_log.txt（每次 log 立即落盘；Scripter stdout 无 flush，禁用 flush）
"""
import os
import traceback

HERE = r'G:/UGit/nandexueyuan/prd/01-需求文档/05-美术设计/诺诺/工具脚本'
ROOT = os.path.dirname(HERE)
WS = os.path.join(ROOT, '手绘轮工作区')
RAW = r'G:/UGit/nandexueyuan/.ai/tmp/klayer'
LOG = os.path.join(HERE, 'krita_round2_log.txt')

_L = []


def log(*a):
    s = ' '.join(str(x) for x in a)
    _L.append(s)
    try:
        with open(LOG, 'w', encoding='utf-8') as f:
            f.write('\n'.join(_L))
    except Exception:
        pass


def rd(p):
    with open(p, 'rb') as f:
        return f.read()


# 先落盘一行，保证任何后续异常都留痕（round2 首次实测：模块级 import 抛错会把日志一起带走）
log('=== krita_handpaint_round2 BOOT ===')

from krita import Krita          # noqa: E402
try:
    from krita import Info       # 5.3.4 实测无此类（round1 脚本从未跑到这句）
    INFO = Info()
except Exception:
    try:
        from krita import InfoObject
        INFO = InfoObject()
    except Exception:
        INFO = None
log('Info 可用:', INFO is not None)

app = Krita.instance()
CANDIDATES = ['bgra__0', 'bgra__1', 'rgba__0', 'rgba__1']
# 2026-10-08 实测（导出图 vs numpy 参考比对，判据不在读回——setPixelData/pixelData 字节透明，四种全等）：
#   bgra__0 全图均差 0.00143（不透明区 RGB 0.067/0.090/0.126 ≈ 参考 0.067/0.089/0.123）← 正确
#   bgra__1 预乘 0.00634 且整体偏暗（0.038/0.055/0.084）；rgba 序 R/B 互换
WIN = 'bgra__0'


def calibrate(doc, root):
    best = None
    for tag in CANDIDATES:
        data = rd(os.path.join(RAW, 'probe__%s.raw' % tag))
        n = doc.createNode('cal_' + tag, 'paintLayer')
        root.addChildNode(n, None)
        n.setPixelData(data, 0, 0, 8, 8)
        doc.refreshProjection()
        doc.waitForDone()
        back = bytes(n.pixelData(0, 0, 8, 8))
        diff = sum(1 for a, b in zip(data, back) if a != b)
        log('  probe %s: 不同字节 %d / %d' % (tag, diff, len(data)))
        if best is None or diff < best[0]:
            best = (diff, tag)
        root.removeChildNode(n)
    log('校准胜出: %s (差异 %d)' % (best[1], best[0]))
    return best[1]


def run_all():
    log('=== krita_handpaint_round2 START ===')
    log('Krita', app.version())
    tag = open(os.path.join(RAW, 'manifest.txt'), encoding='utf-8').read().strip().split('\n')
    layers = [l.split('\t') for l in tag]
    log('待建层:', [n for _, n in layers])

    doc = app.openDocument(os.path.join(WS, 'src_v5', '03__02.png').replace('/', os.sep))
    if doc is None:
        log('FATAL: 打不开 v5 原稿')
        return
    doc.waitForDone()
    W, H = doc.width(), doc.height()
    log('doc', W, 'x', H, os.path.basename(doc.fileName()))
    root = doc.rootNode()
    base = root.childNodes()[0]
    base.setName('底层_原稿v5(锁)')
    try:
        base.setLocked(True)
    except Exception as e:
        log('lock fail', e)

    win = calibrate(doc, root)

    def write_all(tag):
        for n in root.childNodes():
            if n.name() not in (base.name(),):
                root.removeChildNode(n)
        made = []
        for idx, name in layers:
            data = rd(os.path.join(RAW, 'layer_%s__%s__%s.raw' % (idx, name, tag)))
            node = doc.createNode(name, 'paintLayer')
            root.addChildNode(node, None)
            node.setPixelData(data, 0, 0, W, H)
            made.append(node)
        doc.refreshProjection()
        doc.waitForDone()
        return made

    def export_to(path):
        try:
            doc.exportImage(path)
        except Exception as e:
            log('  exportImage(no-info) 失败:', e)
            doc.exportImage(path, INFO)
        log('  exported:', os.path.basename(path), os.path.getsize(path) // 1024, 'KB')

    # 正式稿：按实测胜出的写入约定（见 WIN 注释）
    log('写入约定: %s（校准读回不可判，判据=导出比对）' % WIN)
    write_all(WIN)

    out_png = os.path.join(WS, 'handpaint_iris.png').replace('/', os.sep)
    export_to(out_png)

    kra = os.path.join(WS, 'handpaint_iris_r2.kra').replace('/', os.sep)
    save_meths = [m for m in dir(doc) if 'save' in m.lower()]
    log('Document 保存相关方法:', save_meths)
    saved = False
    for m in ('saveAs', 'save', 'saveDocument'):
        if hasattr(doc, m):
            try:
                getattr(doc, m)(kra)
                log('.kra 已保存 via doc.%s -> handpaint_iris_r2.kra' % m)
                saved = True
                break
            except Exception as e:
                log('  doc.%s 失败: %s' % (m, e))
    if not saved:
        log('.kra 未保存（可用 文件→另存为 人工存；层栈已在文档里）')

    log('=== ROUND2 DONE ===')


try:
    run_all()
except Exception:
    log('FATAL:\n' + traceback.format_exc())
