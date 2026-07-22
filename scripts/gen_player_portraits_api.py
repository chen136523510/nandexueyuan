"""
通过 ComfyUI API 批量生成 5 套玩家立绘

用途：
    读取 .ai/comfyui-workflows/players/portrait_player_set{1-5}.json
    转换为 ComfyUI API 格式（/prompt 端点）
    提交到本地 ComfyUI（http://127.0.0.1:8188）
    等待生成完成，下载结果到 public/game/portraits/

前提：
    ComfyUI 已启动（端口 8188）
    SDXL 模型 Qpipi.com_waiIllustriousSDXL_v160.safetensors 已加载

用法：
    python scripts/gen_player_portraits_api.py

输出：
    public/game/portraits/player_set{1-5}.png（透明背景立绘）
"""

import json
import urllib.request
import urllib.parse
import time
import os
import sys
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"
WORKFLOW_DIR = Path(".ai/comfyui-workflows/players")
OUTPUT_DIR = Path("public/game/portraits")
COMFYUI_OUTPUT = Path("E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/output")


def workflow_to_api_prompt(workflow_json):
    """将 ComfyUI 工作流 JSON（UI 格式）转换为 API /prompt 格式。

    UI 格式：{"nodes": [...], "links": [...]}
    API 格式：{"node_id": {class_type, inputs}}
    """
    nodes = {}
    # 构建 id -> node 映射
    node_map = {n["id"]: n for n in workflow_json["nodes"]}

    # 构建 link -> [from_node, from_slot, to_node, to_slot] 映射
    link_map = {}
    for link in workflow_json.get("links", []):
        # link 格式: [link_id, from_node_id, from_slot, to_node_id, to_slot, type]
        link_map[link[0]] = {
            "from_node": link[1],
            "from_slot": link[2],
            "to_node": link[3],
            "to_slot": link[4],
        }

    for node_id, node in node_map.items():
        class_type = node["type"]
        inputs = {}

        # 处理 inputs（来自链接的输入）
        for inp in node.get("inputs", []):
            link_id = inp.get("link")
            if link_id is not None and link_id in link_map:
                source = link_map[link_id]
                source_node = node_map[source["from_node"]]
                # API 格式需要 [node_id_str, output_slot_index_int]
                inputs[inp["name"]] = [str(source["from_node"]), source["from_slot"]]

        # 处理 widgets_values（直接输入的值）
        widget_values = node.get("widgets_values", [])
        if widget_values:
            # 获取该节点的 widget 名称顺序
            # 对于已知节点类型，手动映射 widget 名称
            if class_type == "CheckpointLoaderSimple":
                if len(widget_values) > 0:
                    inputs["ckpt_name"] = widget_values[0]
            elif class_type == "CLIPTextEncode":
                if len(widget_values) > 0:
                    inputs["text"] = widget_values[0]
            elif class_type == "EmptyLatentImage":
                if len(widget_values) > 0:
                    inputs["width"] = widget_values[0]
                if len(widget_values) > 1:
                    inputs["height"] = widget_values[1]
                if len(widget_values) > 2:
                    inputs["batch_size"] = widget_values[2]
            elif class_type == "KSampler":
                # widget_values 顺序: [seed, control_after_generate, steps, cfg, sampler_name, scheduler, denoise]
                # control_after_generate 是 UI 控件（fixed/random/increment/decrement），API 不需要
                keys = ["seed", "_control", "steps", "cfg", "sampler_name", "scheduler", "denoise"]
                for i, key in enumerate(keys):
                    if i < len(widget_values) and key != "_control":
                        inputs[key] = widget_values[i]
            elif class_type == "SaveImage":
                if len(widget_values) > 0:
                    inputs["filename_prefix"] = widget_values[0]
            elif class_type == "BiRefNetRMBG":
                # ComfyUI-RMBG v3.0.0 参数：
                # required: image（来自链接）, model（下拉选择）
                # optional: mask_blur, mask_offset, invert_output, refine_foreground, background, background_color
                # UI 工作流的旧参数（v2.x）：model_name, device, image_pad, return_mask, return_mask_image, save_format, bg_color
                # 映射到新参数
                if len(widget_values) > 0:
                    inputs["model"] = widget_values[0]
                # optional 参数必须显式传入（节点的 params 字典会 KeyError）
                inputs["mask_blur"] = 0
                inputs["mask_offset"] = 0
                inputs["invert_output"] = False
                inputs["refine_foreground"] = False
                if len(widget_values) > 5:
                    inputs["background"] = widget_values[5]
                else:
                    inputs["background"] = "Alpha"
                if len(widget_values) > 6:
                    inputs["background_color"] = widget_values[6]
                else:
                    inputs["background_color"] = "#222222"

        nodes[str(node_id)] = {
            "class_type": class_type,
            "inputs": inputs,
        }

    return nodes


def submit_prompt(prompt_data, client_id="portrait-gen"):
    """提交工作流到 ComfyUI /prompt 端点"""
    payload = json.dumps({"prompt": prompt_data, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        return result["prompt_id"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"\n  ✗ HTTP {e.code} 错误响应:")
        print(f"    {error_body[:1000]}")
        raise


def get_history(prompt_id, timeout=300):
    """轮询 /history/{prompt_id} 直到任务完成"""
    start = time.time()
    while time.time() - start < timeout:
        try:
            url = f"{COMFYUI_URL}/history/{prompt_id}"
            resp = urllib.request.urlopen(url)
            data = json.loads(resp.read())
            if prompt_id in data:
                return data[prompt_id]
        except Exception:
            pass
        time.sleep(3)
        elapsed = int(time.time() - start)
        print(f"  等待中... {elapsed}s", end="\r")
    raise TimeoutError(f"任务超时 ({timeout}s): {prompt_id}")


def download_image(filename, subfolder, output_path):
    """从 ComfyUI /view 端点下载生成的图片"""
    params = urllib.parse.urlencode({
        "filename": filename,
        "subfolder": subfolder,
        "type": "output",
    })
    url = f"{COMFYUI_URL}/view?{params}"
    resp = urllib.request.urlopen(url)
    data = resp.read()
    with open(output_path, "wb") as f:
        f.write(data)
    return len(data)


def generate_portrait(set_num):
    """生成单张立绘"""
    workflow_file = WORKFLOW_DIR / f"portrait_player_set{set_num}.json"
    print(f"\n{'='*50}")
    print(f"生成 player_set{set_num} 立绘")
    print(f"{'='*50}")

    # 加载工作流
    with open(workflow_file, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # 转换为 API 格式
    prompt_data = workflow_to_api_prompt(workflow)

    # 打印关键参数确认
    for node_id, node in prompt_data.items():
        if node["class_type"] == "CheckpointLoaderSimple":
            print(f"  模型: {node['inputs'].get('ckpt_name', 'N/A')}")
        elif node["class_type"] == "CLIPTextEncode":
            text = node["inputs"].get("text", "")
            if "lowres" not in text:
                print(f"  正面提示词: {text[:80]}...")
        elif node["class_type"] == "SaveImage":
            print(f"  输出前缀: {node['inputs'].get('filename_prefix', 'N/A')}")

    # 提交
    print(f"  提交到 ComfyUI...")
    prompt_id = submit_prompt(prompt_data, client_id=f"portrait-set{set_num}")
    print(f"  任务 ID: {prompt_id}")

    # 等待完成
    print(f"  等待生成...")
    history = get_history(prompt_id, timeout=600)

    # 检查状态
    status = history.get("status", {})
    if status.get("status_str") == "error":
        print(f"  ✗ 生成失败!")
        print(f"    messages: {status.get('messages', [])}")
        return False

    # 下载结果
    outputs = history.get("outputs", {})
    saved_count = 0
    for node_id, output in outputs.items():
        if "images" in output:
            for img in output["images"]:
                filename = img["filename"]
                subfolder = img.get("subfolder", "")
                # 我们需要 cutout 版本（透明背景）
                if "cutout" in filename:
                    out_path = OUTPUT_DIR / f"player_set{set_num}.png"
                    size = download_image(filename, subfolder, out_path)
                    print(f"  ✓ 透明立绘: {out_path} ({size} bytes)")
                    saved_count += 1
                elif "raw" in filename:
                    # 也保存 raw 版本（有背景）作为备份
                    raw_dir = OUTPUT_DIR / "raw"
                    raw_dir.mkdir(exist_ok=True)
                    out_path = raw_dir / f"player_set{set_num}_raw.png"
                    size = download_image(filename, subfolder, out_path)
                    print(f"  ✓ 原始立绘: {out_path} ({size} bytes)")

    if saved_count == 0:
        print(f"  ✗ 未找到 cutout 输出！")
        print(f"    所有输出: {json.dumps(outputs, indent=2)[:500]}")
        return False

    return True


def main():
    # 检查 ComfyUI 是否在线
    try:
        resp = urllib.request.urlopen(f"{COMFYUI_URL}/system_stats")
        stats = json.loads(resp.read())
        print(f"ComfyUI 在线: v{stats['system']['comfyui_version']}")
        print(f"GPU: {stats['devices'][0]['name']}")
    except Exception as e:
        print(f"✗ ComfyUI 未启动或无法连接: {e}")
        print(f"  请先启动 ComfyUI (端口 8188)")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 生成所有 5 套
    success = 0
    for i in range(1, 6):
        # 检查是否已存在
        target = OUTPUT_DIR / f"player_set{i}.png"
        if target.exists():
            print(f"\n✓ player_set{i}.png 已存在，跳过")
            success += 1
            continue

        try:
            if generate_portrait(i):
                success += 1
            else:
                print(f"\n⚠️  set{i} 生成失败，继续下一个")
        except Exception as e:
            print(f"\n✗ set{i} 异常: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*50}")
    print(f"完成: {success}/5 套立绘")
    print(f"{'='*50}")

    if success == 5:
        print("\n下一步: 运行 portrait_to_avatar.py 生成头像")
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
