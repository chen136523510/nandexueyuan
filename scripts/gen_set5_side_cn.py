"""用 SD1.5 ControlNet canny 生成 set5 side（从 set4_side 提取侧面姿态）

Canny 是纯边缘检测算法，不需要从 HuggingFace 下载模型。
"""
import json
import urllib.request
import urllib.parse
import time
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"
RAW_DIR = Path("public/game/sprites/players/raw")

MODEL_15 = r"sd1.5\anything-v5.safetensors"
CN_CANNY_15 = "control_v11p_sd15_canny_fp16.safetensors"

NEGATIVE = (
    "lowres, bad anatomy, multiple characters, design sheet, reference sheet, "
    "border, frame, text, watermark, gradient background, dark background"
)

POSITIVE = (
    "1girl, blue twin tails, blue eyes, pink and black bodysuit, "
    "futuristic outfit, pink boots, standing, full body, "
    "side profile, facing left, single character, solo, centered, white background"
)


def submit_and_wait(prompt_data, client_id, timeout=180):
    payload = json.dumps({"prompt": prompt_data, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"提交失败 HTTP {e.code}: {body[:500]}")
        return None

    result = json.loads(resp.read())
    if result.get("node_errors"):
        print(f"节点错误: {json.dumps(result['node_errors'], indent=2)[:500]}")
        return None

    prompt_id = result["prompt_id"]
    start = time.time()
    while time.time() - start < timeout:
        resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}")
        data = json.loads(resp.read())
        if prompt_id in data:
            d = data[prompt_id]
            # 检查是否出错
            status = d.get("status", {}).get("status_str", "")
            if status == "error":
                print(f"执行错误:")
                for msg in d.get("status", {}).get("messages", []):
                    if msg[0] == "execution_error":
                        print(f"  {msg[1].get('exception_type')}: {msg[1].get('exception_message', '')[:200]}")
                return None
            return d
        time.sleep(2)
    print("超时")
    return None


def download_image(filename, subfolder, output_path):
    params = urllib.parse.urlencode(
        {"filename": filename, "subfolder": subfolder, "type": "output"}
    )
    resp = urllib.request.urlopen(f"{COMFYUI_URL}/view?{params}")
    output_path.write_bytes(resp.read())


def main():
    prompt = {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": MODEL_15}},
        "10": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": CN_CANNY_15}},
        "11": {"class_type": "LoadImage", "inputs": {"image": "nd_set4_side_cn_src.png"}},
        # Canny 边缘检测（纯算法，不需要下载模型）
        "12": {"class_type": "CannyEdgePreprocessor", "inputs": {
            "image": ["11", 0],
            "low_threshold": 100,
            "high_threshold": 200,
        }},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "masterpiece, best quality, chibi, " + POSITIVE, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["4", 1]}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 512, "batch_size": 1}},
        "13": {"class_type": "ControlNetApplyAdvanced", "inputs": {
            "positive": ["6", 0],
            "negative": ["7", 0],
            "control_net": ["10", 0],
            "image": ["12", 0],
            "strength": 0.9,
            "start_percent": 0.0,
            "end_percent": 1.0,
        }},
        "3": {"class_type": "KSampler", "inputs": {
            "seed": 887001,
            "steps": 20,
            "cfg": 7.0,
            "sampler_name": "dpmpp_2m",
            "scheduler": "karras",
            "denoise": 1.0,
            "model": ["4", 0],
            "positive": ["13", 0],
            "negative": ["13", 1],
            "latent_image": ["5", 0],
        }},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "ND_set5_side_canny"}},
    }

    print(f"模型: {MODEL_15}")
    print(f"ControlNet: {CN_CANNY_15}")
    print("提交 SD1.5 ControlNet Canny...")

    history = submit_and_wait(prompt, "sd15-cn-canny-1")
    if not history:
        print("失败")
        return

    found = False
    for nid, out in history.get("outputs", {}).items():
        if "images" in out:
            for img in out["images"]:
                target = RAW_DIR / "player_set5_side.png"
                download_image(img["filename"], img.get("subfolder", ""), target)
                print(f"OK {target.name} ({target.stat().st_size} bytes)")
                found = True

    if not found:
        print("警告：没有图片输出")
    else:
        print("完成")


if __name__ == "__main__":
    main()
