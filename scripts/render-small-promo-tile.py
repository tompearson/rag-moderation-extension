#!/usr/bin/env python3
"""Render Chrome Web Store small promo tile (440x280, 4-bit PNG, no alpha)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets" / "promo" / "small-promo-tile-440x280.png"

W, H = 440, 280
BG = (248, 250, 252)  # --bg
BLUE = (37, 99, 235)  # pick-btn
TEXT = "Click here to select text you want to moderate."


def main() -> None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as exc:
        raise SystemExit("Install Pillow: pip install Pillow") from exc

    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    btn_w, btn_h, radius = 392, 88, 8
    x0, y0 = (W - btn_w) // 2, (H - btn_h) // 2
    x1, y1 = x0 + btn_w, y0 + btn_h
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=BLUE, outline=BLUE, width=2)

    font = None
    for path in (
        Path(r"C:\Windows\Fonts\segoeuib.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ):
        if path.is_file():
            font = ImageFont.truetype(str(path), 19)
            break
    if font is None:
        font = ImageFont.load_default()

    words = TEXT.split()
    lines: list[str] = []
    line = ""
    max_w = btn_w - 28
    for word in words:
        trial = f"{line} {word}".strip()
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_w:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)

    line_heights = []
    for ln in lines:
        bbox = draw.textbbox((0, 0), ln, font=font)
        line_heights.append(bbox[3] - bbox[1])
    total_h = sum(line_heights) + 4 * (len(lines) - 1 if lines else 0)
    cy = y0 + (btn_h - total_h) // 2
    for ln, lh in zip(lines, line_heights):
        bbox = draw.textbbox((0, 0), ln, font=font)
        tw = bbox[2] - bbox[0]
        tx = x0 + (btn_w - tw) // 2
        draw.text((tx, cy), ln, fill=(255, 255, 255), font=font)
        cy += lh + 4

    quant = img.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
    quant.info.pop("transparency", None)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    quant.save(OUT, format="PNG", bits=4)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()