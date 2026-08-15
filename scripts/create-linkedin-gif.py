from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "Production-Line-Simulator-LinkedIn.gif"
PREVIEW = ROOT / "assets" / "Production-Line-Simulator-LinkedIn-preview.png"
W, H = 1280, 720
FPS, FRAMES = 12, 84
BG = (7, 17, 30)
PANEL = (13, 32, 48)
GRID = (24, 55, 74)
TEXT = (235, 244, 248)
MUTED = (145, 170, 184)
GREEN = (66, 215, 125)
ORANGE = (255, 166, 67)

def font(size, bold=False):
    name = "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    return ImageFont.truetype(name, size)

TITLE = font(38, True)
SUB = font(19)
LABEL = font(16, True)
SMALL = font(13)
BIG = font(26, True)

stations = [
    ("Assembly", "Operators ×3", "60 sec", GREEN),
    ("Calibration", "Operators ×1", "35 sec", GREEN),
    ("Software Download", "Machine ×1", "40 sec", ORANGE),
    ("Functional Test", "Operators ×2", "30 sec", GREEN),
    ("Packaging", "Operators ×2", "25 sec", GREEN),
]
xs = [110, 350, 590, 830, 1070]

def rounded(draw, box, fill, outline=None, radius=12, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def frame(i):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    for y in range(0, H, 40):
        d.line((0, y, W, y), fill=(10, 27, 42), width=1)
    d.text((54, 38), "PRODUCTION LINE SIMULATOR V1", font=TITLE, fill=TEXT)
    d.text((56, 88), "Model processes, resources, queues, and bottlenecks", font=SUB, fill=MUTED)
    d.text((934, 48), "LIVE MODEL", font=LABEL, fill=GREEN)
    d.ellipse((1068, 52, 1080, 64), fill=GREEN)

    # Dashboard cards
    cards = [("LINE CAPACITY", "90 /h", GREEN), ("BOTTLENECK", "Software Download", ORANGE), ("PRODUCTS", f"{min(10, 1 + i // 7)} / 10", GREEN)]
    for n, (label, value, color) in enumerate(cards):
        x = 54 + n * 390
        rounded(d, (x, 130, x + 350, 204), PANEL, GRID, 10, 1)
        d.text((x + 18, 146), label, font=SMALL, fill=MUTED)
        d.text((x + 18, 169), value, font=BIG, fill=color)

    # Flow rail
    rail_y = 432
    d.line((82, rail_y, 1198, rail_y), fill=(57, 102, 126), width=5)
    d.line((82, rail_y + 20, 1198, rail_y + 20), fill=(25, 53, 70), width=2)
    for idx, (name, resource, cycle, color) in enumerate(stations):
        x = xs[idx]
        rounded(d, (x - 100, 260, x + 100, 370), PANEL, color if idx == 2 else GRID, 10, 2)
        d.text((x - 86, 278), name, font=LABEL, fill=TEXT)
        d.text((x - 86, 307), cycle, font=SMALL, fill=color)
        d.text((x - 86, 333), resource, font=SMALL, fill=MUTED)
        d.line((x, 370, x, rail_y), fill=GRID, width=2)
        d.ellipse((x - 9, rail_y - 9, x + 9, rail_y + 9), outline=color, width=2)
        if idx == 2:
            d.text((x - 74, 390), "BOTTLENECK", font=SMALL, fill=ORANGE)

    # Moving products, with a small queue before the bottleneck.
    for p in range(10):
        progress = (i / FPS * 0.42 + p * 0.105) % 1.0
        if progress > 0.60 and progress < 0.76:
            px = xs[2] - 70 + (p % 3) * 32
            py = rail_y - 54 - (p % 2) * 25
        else:
            px = 82 + progress * 1116
            py = rail_y - 16
        rounded(d, (px - 14, py - 12, px + 14, py + 12), (11, 43, 38), GREEN, 5, 2)
        d.line((px - 7, py, px + 7, py), fill=GREEN, width=2)
        d.ellipse((px + 6, py - 5, px + 10, py - 1), fill=GREEN)

    # Footer
    d.text((54, 626), "OPERATORS  9", font=LABEL, fill=TEXT)
    d.text((250, 626), "EQUIPMENT  2", font=LABEL, fill=TEXT)
    d.text((470, 626), "TARGET  10 FINISHED PRODUCTS", font=LABEL, fill=TEXT)
    d.text((54, 668), "Developed by Yousuf Yamani · 15 August 2026", font=SMALL, fill=MUTED)
    return im

images = [frame(i) for i in range(FRAMES)]
images[0].save(OUT, save_all=True, append_images=images[1:], duration=1000 // FPS, loop=0, optimize=True)
images[0].save(PREVIEW)
print(OUT)
print(PREVIEW)
