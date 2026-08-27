"""
PREVIEW seulement — pas branché à l'app.

Chambre de Léon en pixel art, plus détaillée que le croquis de cadrage du
handoff (`design_handoff_routines_pixel_app/README.md`, section "00 — La
chambre de Léon"). Même géométrie de base (canvas 1280x880, grille 16px,
lumière unique venant de la fenêtre à gauche, ombres longues et douces,
aucun contour sur le mobilier) mais avec de la texture, du volume et des
objets dessinés plutôt que des blocs plats.

Palette : uniquement les tokens `leon.*` déjà définis dans le handoff (pas
de couleur inventée).

Usage :
    /usr/local/bin/python3 scripts/generate_room_leon_preview.py

Sort dans ../scenes_preview/leon_chambre.png
"""

from PIL import Image, ImageDraw, ImageFilter
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "assets", "generated", "scenes-preview")
os.makedirs(OUT_DIR, exist_ok=True)

PIXEL = 4                       # 1 unité interne = 4 px finaux
WI, HI = 320, 220               # 1280x880 / 4
W, H = WI * PIXEL, HI * PIXEL

# ---------------------------------------------------------------------------
# Tokens leon.* (handoff) — aucune couleur hors de cette liste
# ---------------------------------------------------------------------------
BG = (30, 39, 64, 255)
BG_ALT = (33, 43, 71, 255)
DEEP = (20, 28, 51, 255)
OUTLINE = (14, 20, 36, 255)
SURFACE = (38, 48, 80, 255)
SURFACE_RAISED = (42, 53, 86, 255)
SURFACE_ACTIVE = (51, 64, 106, 255)
SURFACE_HIGH = (74, 88, 128, 255)
ACCENT = (240, 149, 47, 255)
ACCENT_VOICE = (224, 138, 60, 255)
ACCENT_SHADOW = (138, 78, 28, 255)
ACCENT_DARK = (201, 118, 34, 255)
ACCENT_EDGE = (255, 246, 232, 255)
TEXT = (232, 237, 247, 255)
TEXT_SOFT = (195, 206, 230, 255)
TEXT_MUTE = (169, 182, 212, 255)
TEXT_FAINT = (140, 155, 188, 255)
WOOD = (107, 74, 46, 255)
WOOD_DARK = (94, 64, 40, 255)
WOOD_LIGHT = (138, 96, 57, 255)
LIGHT = (243, 201, 139, 255)
TRACK = (58, 58, 68, 255)


def lighten(c, f=0.2):
    return tuple(min(255, int(c[i] + (255 - c[i]) * f)) for i in range(3)) + (255,)


def darken(c, f=0.8):
    return tuple(int(c[i] * f) for i in range(3)) + (255,)


canvas = Image.new("RGBA", (WI, HI), BG)
d = ImageDraw.Draw(canvas)


def rect(x, y, w, h, color):
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=color)


def soft_shadow(cx, cy, rw, rh, alpha=70, blur=6, dx=3):
    """Ombre longue et douce, décalée vers la droite (loin de la fenêtre)."""
    layer = Image.new("RGBA", (WI, HI), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse([cx - rw + dx, cy - rh, cx + rw + dx, cy + rh], fill=(10, 14, 26, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(layer)


# ---------------------------------------------------------------------------
# 1. Mur — bandes verticales + veinage léger
# ---------------------------------------------------------------------------
BAND = 24
for i, x in enumerate(range(0, WI, BAND)):
    rect(x, 0, BAND, 160, BG if i % 2 == 0 else BG_ALT)
for x in range(0, WI, BAND):
    d.line([(x + 4, 4), (x + 4, 156)], fill=darken(BG_ALT, 0.9), width=1)

# plinthe
rect(0, 152, WI, 8, DEEP)

# ---------------------------------------------------------------------------
# 2. Sol — lames de bois + grain
# ---------------------------------------------------------------------------
PLANK = 10
for i, y in enumerate(range(160, HI, PLANK)):
    rect(0, y, WI, PLANK, WOOD if i % 2 == 0 else WOOD_DARK)
    for gx in range(6, WI, 26):
        d.line([(gx, y + 2), (gx + 14, y + 2)], fill=darken(WOOD_DARK, 0.85), width=1)
d.line([(0, 160), (WI, 160)], fill=darken(WOOD_DARK, 0.7), width=1)

# ---------------------------------------------------------------------------
# 3. Fenêtre + faisceau de lumière
# ---------------------------------------------------------------------------
FX, FY, FW, FH = 24, 24, 72, 60
rect(FX, FY, FW, FH, DEEP)
rect(FX + 4, FY + 4, FW - 8, FH - 8, TEXT_FAINT)  # cadre clair
# vitre avec léger dégradé (ciel du matin)
for i in range(FH - 16):
    t = i / (FH - 16)
    c = tuple(int(LIGHT[k] + (ACCENT_EDGE[k] - LIGHT[k]) * (1 - t)) for k in range(3)) + (255,)
    d.line([(FX + 8, FY + 8 + i), (FX + FW - 8, FY + 8 + i)], fill=c)
# meneaux
rect(FX + FW // 2 - 2, FY + 8, 4, FH - 16, TEXT_FAINT)
rect(FX + 8, FY + FH // 2 - 2, FW - 16, 4, TEXT_FAINT)
# rebord
rect(FX, FY + FH, FW, 4, TEXT_SOFT)
rect(FX, FY + FH + 4, FW, 2, darken(TEXT_SOFT, 0.8))

# faisceau (trapèze) — dessiné après le sol/mur, avant le mobilier
beam = Image.new("RGBA", (WI, HI), (0, 0, 0, 0))
bd = ImageDraw.Draw(beam)
bd.polygon([(FX, FY + FH + 4), (FX + FW, FY + FH + 4), (WI, HI), (FX - 20, HI)], fill=(255, 196, 120, 40))
beam = beam.filter(ImageFilter.GaussianBlur(3))
canvas.alpha_composite(beam)
# lueur chaude autour du cadre, sur le mur
glow = Image.new("RGBA", (WI, HI), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([FX - 14, FY - 14, FX + FW + 14, FY + FH + 14], fill=(255, 210, 150, 55))
glow = glow.filter(ImageFilter.GaussianBlur(8))
canvas.alpha_composite(glow)

# ---------------------------------------------------------------------------
# 4. Posters (voiture de course + numéro)
# ---------------------------------------------------------------------------
PX, PY, PW, PH = 120, 28, 44, 56
rect(PX - 2, PY - 2, PW + 4, PH + 4, ACCENT_DARK)
rect(PX, PY, PW, PH, ACCENT)
rect(PX + 4, PY + 6, PW - 8, 6, ACCENT_EDGE)  # bandeau titre
# silhouette de voiture de course, vue de côté — carrosserie basse, aileron, habitacle
cy = PY + PH - 20
d.polygon([
    (PX + 5, cy + 6), (PX + 8, cy + 2), (PX + 15, cy - 5), (PX + 22, cy - 5),
    (PX + 26, cy), (PX + PW - 6, cy), (PX + PW - 6, cy + 6),
], fill=SURFACE_ACTIVE)
rect(PX + 15, cy - 5, 9, 5, SURFACE_HIGH)  # habitacle / pare-brise
rect(PX + PW - 10, cy - 3, 4, 5, SURFACE_HIGH)  # aileron arrière
rect(PX + 6, cy + 6, PW - 14, 3, SURFACE_ACTIVE)
d.ellipse([PX + 9, cy + 6, PX + 17, cy + 14], fill=OUTLINE)
d.ellipse([PX + PW - 20, cy + 6, PX + PW - 12, cy + 14], fill=OUTLINE)
d.ellipse([PX + 11, cy + 8, PX + 15, cy + 12], fill=TEXT_FAINT)
d.ellipse([PX + PW - 18, cy + 8, PX + PW - 14, cy + 12], fill=TEXT_FAINT)
d.point((PX + 6, cy + 1), fill=ACCENT_EDGE)  # phare

NX, NY, NW, NH = 176, 32, 36, 44
rect(NX - 2, NY - 2, NW + 4, NH + 4, SURFACE_HIGH)
rect(NX, NY, NW, NH, SURFACE_ACTIVE)
# gros "8" en deux anneaux empilés (lisible à basse résolution)
n = NX + NW // 2
top_cy, bot_cy = NY + 15, NY + 31
rw, rh = 9, 9
d.ellipse([n - rw, top_cy - rh, n + rw, top_cy + rh], fill=ACCENT_EDGE)
d.ellipse([n - rw + 4, top_cy - rh + 4, n + rw - 4, top_cy + rh - 4], fill=SURFACE_ACTIVE)
d.ellipse([n - rw - 1, bot_cy - rh - 1, n + rw + 1, bot_cy + rh + 1], fill=ACCENT_EDGE)
d.ellipse([n - rw + 3, bot_cy - rh + 3, n + rw - 3, bot_cy + rh - 3], fill=SURFACE_ACTIVE)
rect(n - 3, top_cy + 3, 6, bot_cy - top_cy - 6, ACCENT_EDGE)

# ---------------------------------------------------------------------------
# 5. Étagère + objets
# ---------------------------------------------------------------------------
SHX, SHY, SHW, SHH = 228, 88, 80, 6
soft_shadow(SHX + SHW // 2, SHY + SHH + 10, SHW // 2, 4, alpha=50, blur=4, dx=2)
rect(SHX, SHY, SHW, SHH, WOOD)
rect(SHX, SHY + SHH - 2, SHW, 2, WOOD_DARK)
d.line([(SHX + 6, SHY + 1), (SHX + SHW - 6, SHY + 1)], fill=WOOD_LIGHT, width=1)

# casque
HX, HY, HW, HH = 236, 68, 32, 20
d.ellipse([HX, HY, HX + HW, HY + HH], fill=ACCENT)
d.ellipse([HX, HY, HX + HW, HY + HH], outline=ACCENT_SHADOW, width=1)
rect(HX + 4, HY + HH - 10, HW - 8, 8, DEEP)  # visière
d.point((HX + 6, HY + 4), fill=ACCENT_EDGE)

# médaille
MX, MY = 284, 72
rect(MX + 1, MY - 8, 2, 8, ACCENT)  # ruban
d.ellipse([MX - 4, MY, MX + 8, MY + 10], fill=(127, 166, 161, 255))
d.ellipse([MX - 1, MY + 3, MX + 5, MY + 7], fill=(232, 181, 76, 255))

# trophée additionnel, petites voitures miniatures
TX, TY = 250, 72
rect(TX, TY + 6, 6, 6, ACCENT_DARK)
rect(TX + 1, TY, 4, 7, (232, 181, 76, 255))
for i, mx in enumerate([300, 306, 312]):
    rect(mx, 80, 5, 3, [ACCENT, SURFACE_ACTIVE, ACCENT_DARK][i])

# ---------------------------------------------------------------------------
# 6. Bureau
# ---------------------------------------------------------------------------
DX, DY, DW, DH = 228, 112, 80, 6
soft_shadow(DX + DW // 2, DY + 46, DW // 2 + 6, 6, alpha=60, blur=5, dx=4)
LEG_H = 42
rect(DX + 4, DY + DH, 6, LEG_H, WOOD_DARK)
rect(DX + DW - 10, DY + DH, 6, LEG_H, WOOD_DARK)
rect(DX, DY, DW, DH, WOOD)
d.line([(DX + 6, DY + 1), (DX + DW - 6, DY + 1)], fill=WOOD_LIGHT, width=1)
# carnet + petite lampe sur le bureau
rect(DX + 10, DY - 5, 14, 5, SURFACE_ACTIVE)
rect(DX + 54, DY - 12, 3, 12, TEXT_FAINT)
d.ellipse([DX + 50, DY - 16, DX + 61, DY - 10], fill=ACCENT_EDGE)

# ---------------------------------------------------------------------------
# 7. Lit
# ---------------------------------------------------------------------------
BX, BY, BW, BH = 24, 96, 8, 64
soft_shadow(BX + 60, BY + BH + 8, 60, 6, alpha=65, blur=6, dx=5)
rect(BX, BY, BW, BH, WOOD)
for gy in range(BY + 4, BY + BH - 4, 10):
    d.line([(BX + 2, gy), (BX + 6, gy)], fill=WOOD_LIGHT, width=1)

MX2, MY2, MW2, MH2 = 32, 106, 104, 8
rect(MX2, MY2, MW2, MH2, TEXT_SOFT)
rect(MX2, MY2 + MH2 - 2, MW2, 2, darken(TEXT_SOFT, 0.85))

QX, QY, QW, QH = 32, 114, 72, 22
rect(QX, QY, QW, QH, ACCENT)
rect(QX, QY, QW, 4, ACCENT_DARK)  # liseré haut
for fx in range(QX + 6, QX + QW - 6, 12):
    d.line([(fx, QY + 6), (fx, QY + QH - 3)], fill=ACCENT_SHADOW, width=1)
rect(QX, QY + QH - 3, QW, 3, ACCENT_SHADOW)

PX2, PY2, PW2, PH2 = 108, 110, 26, 18
rect(PX2, PY2, PW2, PH2, TEXT)
d.line([(PX2 + 6, PY2 + 5), (PX2 + PW2 - 6, PY2 + 5)], fill=TEXT_SOFT, width=1)
d.line([(PX2 + 6, PY2 + 10), (PX2 + PW2 - 6, PY2 + 10)], fill=TEXT_SOFT, width=1)
# petite peluche appuyée contre l'oreiller
rect(PX2 + PW2 + 2, PY2 + 2, 8, 10, ACCENT_VOICE)
d.ellipse([PX2 + PW2, PY2, PX2 + PW2 + 4, PY2 + 4], fill=ACCENT_VOICE)
d.ellipse([PX2 + PW2 + 6, PY2, PX2 + PW2 + 10, PY2 + 4], fill=ACCENT_VOICE)

# ---------------------------------------------------------------------------
# 8. Circuit (anneau) + tapis + voiture jouet
# ---------------------------------------------------------------------------
CX, CY, CW, CH = 72, 164, 176, 48
BORDER = 8
rect(CX, CY, CW, CH, TRACK)
rect(CX + BORDER, CY + BORDER, CW - BORDER * 2, CH - BORDER * 2, BG)
# marques de voie en tirets sur l'anneau
for i, x in enumerate(range(CX + 4, CX + CW - 4, 10)):
    if i % 2 == 0:
        d.line([(x, CY + 1), (x + 5, CY + 1)], fill=lighten(TRACK, 0.25), width=2)
        d.line([(x, CY + CH - 2), (x + 5, CY + CH - 2)], fill=lighten(TRACK, 0.25), width=2)
# damier départ/arrivée
for i in range(4):
    c = TEXT if i % 2 == 0 else OUTLINE
    rect(CX + CW // 2 - 8 + i * 4, CY, 4, BORDER, c)

RX, RY, RW, RH = 100, 176, 116, 24
rect(RX, RY, RW, RH, SURFACE_ACTIVE)
rect(RX, RY, RW, 2, SURFACE_HIGH)
rect(RX, RY + RH - 2, RW, 2, darken(SURFACE_ACTIVE, 0.7))
for cx2 in range(RX + 10, RX + RW - 10, 20):
    d.polygon([(cx2, RY + 6), (cx2 + 6, RY + 12), (cx2, RY + 18)], fill=SURFACE_HIGH)

VX, VY = 164, 158
d.polygon([(VX, VY + 8), (VX + 4, VY + 2), (VX + 20, VY + 2), (VX + 24, VY + 8)], fill=ACCENT)
rect(VX, VY + 8, 24, 5, ACCENT)
rect(VX + 6, VY + 3, 10, 5, DEEP)  # pare-brise
d.ellipse([VX + 2, VY + 11, VX + 8, VY + 15], fill=OUTLINE)
d.ellipse([VX + 16, VY + 11, VX + 22, VY + 15], fill=OUTLINE)

# ---------------------------------------------------------------------------
# 9. Biscuit le chat, assis
# ---------------------------------------------------------------------------
CATX, CATY = 40, 186
FUR = (224, 210, 174, 255)
FUR_SHADOW = darken(FUR, 0.85)
d.polygon([(CATX + 2, CATY + 2), (CATX + 6, CATY - 4), (CATX + 8, CATY + 2)], fill=FUR)
d.polygon([(CATX + 16, CATY + 2), (CATX + 18, CATY - 4), (CATX + 22, CATY + 2)], fill=FUR)
d.ellipse([CATX, CATY, CATX + 22, CATY + 18], fill=FUR)
d.ellipse([CATX + 4, CATY + 10, CATX + 18, CATY + 22], fill=FUR)
d.ellipse([CATX + 4, CATY + 16, CATX + 18, CATY + 24], fill=FUR_SHADOW)
d.line([(CATX + 20, CATY + 18), (CATX + 28, CATY + 10), (CATX + 30, CATY + 4)], fill=FUR, width=3)
d.point((CATX + 6, CATY + 8), fill=OUTLINE)
d.point((CATX + 14, CATY + 8), fill=OUTLINE)
d.line([(CATX + 2, CATY + 12), (CATX + 6, CATY + 12)], fill=FUR_SHADOW, width=1)
d.line([(CATX + 14, CATY + 12), (CATX + 18, CATY + 12)], fill=FUR_SHADOW, width=1)

# ---------------------------------------------------------------------------
# Vignette légère dans les coins pour donner du volume
# ---------------------------------------------------------------------------
vignette = Image.new("RGBA", (WI, HI), (0, 0, 0, 0))
vd = ImageDraw.Draw(vignette)
vd.rectangle([0, 0, WI, HI], fill=(0, 0, 0, 0))
vd.ellipse([-40, -40, WI + 40, HI + 40], outline=None, fill=(0, 0, 0, 0))
canvas.alpha_composite(vignette)

final = canvas.resize((W, H), Image.NEAREST)
out_path = os.path.join(OUT_DIR, "leon_chambre.png")
final.convert("RGB").save(out_path)
print(out_path)
