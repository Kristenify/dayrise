"""
PREVIEW — chambre de Léon, version "vrais sprites" (pack Bitglow gratuit,
licence perso/commercial ok, cf. external_assets/*/license.txt).

Hybride assumé :
  - mobilier, tapis, cadre, trophées, fenêtre : sprites réels détourés
    automatiquement (extract_sprites.py) depuis les packs Bitglow.
  - mur : couleur unie prise dans la palette leon.* du handoff (les packs
    n'ont pas de ton navy, inutile de forcer un recolorage moche).
  - voiture jouet, chat Biscuit, tracé du circuit : gardés en procédural
    (aucun pack gratuit trouvé n'a de véhicule ni d'animal).

Usage :
    /usr/local/bin/python3 scripts/compose_room_leon_final.py
"""

from PIL import Image, ImageDraw, ImageFilter
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(ROOT, "..", "assets", "external")
OUT_DIR = os.path.join(ROOT, "..", "assets", "generated", "scenes-preview")
os.makedirs(OUT_DIR, exist_ok=True)

BR = os.path.join(EXT, "pixelinterior_BR_v1.1")
LRK = os.path.join(EXT, "pixelinterior_LRK_v1.1")

CW, CH = 320, 220
SCALE = 4
WALL_H = 58

BG_ALT = (33, 43, 71, 255)      # leon.bg.alt
DEEP = (20, 28, 51, 255)        # leon.deep
TRACK = (58, 58, 68, 255)       # leon.track
TEXT = (232, 237, 247, 255)     # leon.text
ACCENT = (240, 149, 47, 255)    # leon.accent

room = Image.new("RGBA", (CW, CH), (0, 0, 0, 255))
d = ImageDraw.Draw(room)


def load(rel):
    return Image.open(os.path.join(EXT, rel)).convert("RGBA")


def place(img, x, y, scale=1.0):
    if scale != 1.0:
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.NEAREST)
    room.alpha_composite(img, (x, y))


def soft_shadow(cx, cy, rw, rh, alpha=70, blur=5, dx=3):
    layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse([cx - rw + dx, cy - rh, cx + rw + dx, cy + rh], fill=(10, 14, 26, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    room.alpha_composite(layer)


# --- mur (palette leon.*, pas de sprite dispo dans ce ton) -----------------
d.rectangle([0, 0, CW, WALL_H], fill=BG_ALT)
d.rectangle([0, WALL_H - 3, CW, WALL_H], fill=DEEP)

# --- sol : plancher réel, tuile 61x16 confirmée sans couture ----------------
sheet = load("pixelinterior_LRK_v1.1/floorswalls_LRK.png")
floor_tile = sheet.crop((145, 96, 206, 112))
tw, th = floor_tile.size
for y in range(WALL_H, CH, th):
    for x in range(0, CW, tw):
        room.paste(floor_tile, (x, y))

# --- fenêtre (mur) -----------------------------------------------------
window_full = Image.open(os.path.join(LRK, "doorswindowsstairs_LRK_sprites", "sprite_010_205x14_54x68.png")).convert("RGBA")
window = window_full.crop((0, 0, window_full.width, window_full.height // 2))
place(window, 15, 4)
# lueur chaude autour de la fenêtre
glow = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([10, -10, 100, 60], fill=(255, 210, 150, 45))
glow = glow.filter(ImageFilter.GaussianBlur(8))
room.alpha_composite(glow)

# --- lit : variante rouge/orange (thème course) -----------------------
bed = Image.open(os.path.join(BR, "beds_BR_sprites", "sprite_000_13x21_38x62.png")).convert("RGBA")
soft_shadow(35, WALL_H + 66, 26, 6, alpha=60, blur=4, dx=3)
place(bed, 16, WALL_H - 18)

# --- table de chevet (paire) à côté du lit -----------------------------
nightstands = Image.open(os.path.join(BR, "wardrobes_BR_sprites", "sprite_005_157x49_38x26.png")).convert("RGBA")
place(nightstands, 60, WALL_H + 34)

# --- armoire ouverte (grise) -------------------------------------------
wardrobe = Image.open(os.path.join(BR, "wardrobes_BR_sprites", "sprite_018_13x189_54x70.png")).convert("RGBA")
soft_shadow(260, WALL_H + 66, 30, 6, alpha=60, blur=4, dx=3)
place(wardrobe, 235, WALL_H - 4)

# --- commode (bois) + lampes + trophées : coin "podium" -----------------
dresser = Image.open(os.path.join(BR, "wardrobes_BR_sprites", "sprite_016_269x165_54x46.png")).convert("RGBA")
soft_shadow(160, WALL_H + 58, 28, 5, alpha=55, blur=4, dx=3)
place(dresser, 133, WALL_H + 12)

lamps = Image.open(os.path.join(BR, "decorations_BR_sprites", "sprite_003_95x50_34x25.png")).convert("RGBA")
place(lamps, 140, WALL_H - 6)

trophies = Image.open(os.path.join(BR, "decorations_BR_sprites", "sprite_004_128x52_34x23.png")).convert("RGBA")
place(trophies, 177, WALL_H - 2)

picture = Image.open(os.path.join(BR, "decorations_BR_sprites", "sprite_001_129x16_46x32.png")).convert("RGBA")
place(picture, 138, 6)

# --- tapis (rayures marine) + tracé de circuit dessiné par-dessus -------
rug = Image.open(os.path.join(BR, "decorations_BR_sprites", "sprite_007_91x125_74x54.png")).convert("RGBA")
RX, RY = 95, 150
place(rug, RX, RY)
d.ellipse([RX + 6, RY + 6, RX + rug.width - 6, RY + rug.height - 6], outline=TRACK, width=3)
for i, x in enumerate(range(RX + 10, RX + rug.width - 10, 10)):
    if i % 2 == 0:
        d.line([(x, RY + 4), (x + 5, RY + 4)], fill=TEXT, width=1)
        d.line([(x, RY + rug.height - 5), (x + 5, RY + rug.height - 5)], fill=TEXT, width=1)

# --- voiture jouet (procédural, aucun pack gratuit n'en a) --------------
VX, VY = RX + 28, RY + 18
d.polygon([(VX, VY + 8), (VX + 4, VY + 2), (VX + 20, VY + 2), (VX + 24, VY + 8)], fill=ACCENT)
d.rectangle([VX, VY + 8, VX + 24, VY + 13], fill=ACCENT)
d.rectangle([VX + 6, VY + 3, VX + 16, VY + 8], fill=DEEP)
d.ellipse([VX + 2, VY + 11, VX + 8, VY + 15], fill=(14, 20, 36, 255))
d.ellipse([VX + 16, VY + 11, VX + 22, VY + 15], fill=(14, 20, 36, 255))

# --- Biscuit le chat (procédural) ---------------------------------------
CATX, CATY = 250, 190
FUR = (224, 210, 174, 255)
FUR_SHADOW = tuple(int(c * 0.85) for c in FUR[:3]) + (255,)
d.polygon([(CATX + 2, CATY + 2), (CATX + 6, CATY - 4), (CATX + 8, CATY + 2)], fill=FUR)
d.polygon([(CATX + 16, CATY + 2), (CATX + 18, CATY - 4), (CATX + 22, CATY + 2)], fill=FUR)
d.ellipse([CATX, CATY, CATX + 22, CATY + 18], fill=FUR)
d.ellipse([CATX + 4, CATY + 10, CATX + 18, CATY + 22], fill=FUR)
d.ellipse([CATX + 4, CATY + 16, CATX + 18, CATY + 24], fill=FUR_SHADOW)
d.line([(CATX + 20, CATY + 18), (CATX + 28, CATY + 10), (CATX + 30, CATY + 4)], fill=FUR, width=3)
d.point((CATX + 6, CATY + 8), fill=DEEP)
d.point((CATX + 14, CATY + 8), fill=DEEP)

final = room.resize((CW * SCALE, CH * SCALE), Image.NEAREST)
out_path = os.path.join(OUT_DIR, "leon_chambre_v2.png")
final.convert("RGB").save(out_path)
print(out_path)
