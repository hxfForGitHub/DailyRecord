#!/usr/bin/env python3
"""
生成 DailyRecord 应用图标。
生成 .icns 和 .png 格式的图标文件。

依赖：pip install pillow
运行：python3 scripts/generate_icon.py
输出：frontend/build/icon.png  +  frontend/build/icon.icns
"""

import os
import struct
import subprocess
import sys
from math import pi

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("请先安装 Pillow: pip install pillow")
    sys.exit(1)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "frontend", "build")
ICON_SIZE = 1024  # 基础大小

os.makedirs(OUTPUT_DIR, exist_ok=True)


def create_icon_image(size: int) -> Image.Image:
    """创建单个尺寸的图标"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 计算各元素尺寸（相对比例）
    padding = size * 0.08
    radius = size * 0.42

    cx = size // 2
    cy = size // 2
    r = int(radius)

    # 1. 背景圆角矩形
    draw.rounded_rectangle(
        [padding, padding, size - padding - 1, size - padding - 1],
        radius=int(size * 0.22),
        fill=(22, 119, 255, 255),  # #1677FF
    )

    # 2. 外圈（表盘）
    outer_r = int(r * 0.75)
    draw.ellipse(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
        fill=None,
        outline=(255, 255, 255, 230),
        width=max(2, int(size * 0.035)),
    )

    # 3. 时针
    hour_len = int(outer_r * 0.5)
    hour_width = max(2, int(size * 0.04))
    # 指向 2 点钟方向
    hour_angle = -60  # 2点钟 = 60度偏移
    hour_x = cx + int(hour_len * _cos(hour_angle))
    hour_y = cy + int(hour_len * _sin(hour_angle))
    draw.line([(cx, cy), (hour_x, hour_y)], fill=(255, 255, 255, 255), width=hour_width)

    # 4. 分针
    min_len = int(outer_r * 0.7)
    min_width = max(2, int(size * 0.025))
    min_angle = -60 * 12  # 指向整点
    # 指向 10 点钟方向
    min_angle = 60  # 10点钟 = -60度
    min_x = cx + int(min_len * _cos(min_angle))
    min_y = cy + int(min_len * _sin(min_angle))
    draw.line([(cx, cy), (min_x, min_y)], fill=(255, 255, 255, 255), width=min_width)

    # 5. 中心圆点
    center_r = max(2, int(size * 0.04))
    draw.ellipse(
        [cx - center_r, cy - center_r, cx + center_r, cy + center_r],
        fill=(255, 255, 255, 255),
    )

    return img


def _cos(deg: float) -> float:
    from math import cos, radians
    return cos(radians(deg))


def _sin(deg: float) -> float:
    from math import sin, radians
    return sin(radians(deg))


def generate_png():
    """生成高清 PNG 图标"""
    img = create_icon_image(ICON_SIZE)
    png_path = os.path.join(OUTPUT_DIR, "icon.png")
    img.save(png_path, "PNG")
    print(f"[OK] PNG: {png_path} ({ICON_SIZE}x{ICON_SIZE})")
    return img


def generate_icns(img: Image.Image):
    """从高清 PNG 生成 macOS .icns 文件

    .icns 包含多种尺寸的图标数据:
    - ic07: 128x128
    - ic08: 256x256
    - ic09: 512x512
    - ic10: 1024x1024
    """
    sizes = {
        "ic07": 128,
        "ic08": 256,
        "ic09": 512,
        "ic10": 1024,
    }

    icon_data = b""
    for icon_type, size in sizes.items():
        resized = img.resize((size, size), Image.LANCZOS)
        # 保存为 PNG 数据
        from io import BytesIO
        buf = BytesIO()
        resized.save(buf, "PNG")
        png_data = buf.getvalue()

        # ICNS 条目: type(4字节) + size(4字节大端) + data
        entry = icon_type.encode("ascii")
        entry += struct.pack(">I", len(png_data) + 8)
        entry += png_data
        icon_data += entry

    # ICNS 头部: 'icns' + 文件大小(4字节大端)
    header = b"icns"
    header += struct.pack(">I", len(icon_data) + 8)

    icns_path = os.path.join(OUTPUT_DIR, "icon.icns")
    with open(icns_path, "wb") as f:
        f.write(header + icon_data)

    print(f"[OK] ICNS: {icns_path}")
    return icns_path


if __name__ == "__main__":
    print("生成 DailyRecord 图标...")
    img = generate_png()
    generate_icns(img)
    print("完成！")
