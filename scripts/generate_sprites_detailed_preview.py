"""
PREVIEW seulement — pas branché à l'app.

Explore un niveau de détail plus élevé pour les avatars, dans l'esprit du
handoff `design_handoff_routines_pixel_app/README.md` :
  - grille de sprite alignée sur 32 px, personnage en pied
  - contour foncé réservé aux personnages (jamais sur le décor)
  - deux déclinaisons de contraste : Colette (doux) / Léon (élevé, contour
    plus épais)
  - even paper-doll : le corps de base + des calques de vêtements
    superposables, comme dans le prototype existant, mais redessinés avec
    plus de tons de shading, un contour, et des détails de visage.

Usage :
    /usr/local/bin/python3 scripts/generate_sprites_detailed_preview.py

Sort dans ../sprites_preview/ (ne touche pas à ../sprites/).
"""

from PIL import Image, ImageDraw, ImageFilter, ImageChops
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SCRIPT_DIR, "..", "assets", "generated", "sprites-preview")
os.makedirs(OUT, exist_ok=True)

W, H = 36, 56
SCALE = 8

OUTLINE_SOFT = (74, 68, 55, 255)     # ink.soft — Colette
OUTLINE_HIGH = (14, 20, 36, 255)     # leon.outline — Léon, contour plus dur

EYE = (34, 30, 40, 255)
SPARKLE = (255, 255, 255, 220)
BLUSH = (232, 150, 150, 130)


def lighten(c, f=0.25):
    return tuple(min(255, int(c[i] + (255 - c[i]) * f)) for i in range(3)) + (255,)


def darken(c, f=0.78):
    return tuple(int(c[i] * f) for i in range(3)) + (255,)


def new_canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def add_outline(img, color, thickness=1):
    alpha = img.split()[3]
    dilated = alpha
    for _ in range(thickness):
        dilated = dilated.filter(ImageFilter.MaxFilter(3))
    ring = ImageChops.subtract(dilated, alpha)
    mask = ring.point(lambda p: 255 if p > 10 else 0)
    solid = Image.new("RGBA", img.size, color)
    outline_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    outline_layer.paste(solid, (0, 0), mask)
    return Image.alpha_composite(outline_layer, img)


def save(img, name):
    img.resize((W * SCALE, H * SCALE), Image.NEAREST).save(f"{OUT}/{name}.png")


# ---------------------------------------------------------------------------
# Corps de base (tête, visage, pyjama) — partagé, personnalisé par enfant
# ---------------------------------------------------------------------------
def draw_head(d, skin, hair, hair_line, messy):
    d.ellipse([10, 8, 27, 23], fill=skin)
    d.rectangle([9, 15, 11, 18], fill=skin)
    d.rectangle([26, 15, 28, 18], fill=skin)

    if messy:
        d.rectangle([9, 7, 28, 13], fill=hair)
        d.polygon([(11, 7), (13, 3), (15, 7)], fill=hair)
        d.polygon([(17, 6), (19, 2), (21, 6)], fill=hair)
        d.polygon([(23, 7), (25, 3), (27, 7)], fill=hair)
        d.rectangle([7, 11, 10, 15], fill=hair)
        d.rectangle([27, 11, 30, 15], fill=hair)
        d.rectangle([12, 8, 16, 9], fill=lighten(hair, 0.3))
    else:
        d.rectangle([9, 6, 28, 13], fill=hair)
        d.rectangle([9, 13, 12, 16], fill=hair)
        d.rectangle([25, 13, 28, 16], fill=hair)
        d.line([(17, 6), (17, 11)], fill=hair_line, width=1)
        d.rectangle([19, 7, 24, 8], fill=lighten(hair, 0.3))

    d.rectangle([14, 14, 16, 14], fill=hair_line)
    d.rectangle([21, 14, 23, 14], fill=hair_line)

    d.rectangle([14, 16, 16, 17], fill=EYE)
    d.rectangle([21, 16, 23, 17], fill=EYE)
    d.point((14, 16), fill=SPARKLE)
    d.point((21, 16), fill=SPARKLE)

    d.ellipse([11, 18, 13, 19], fill=BLUSH)
    d.ellipse([24, 18, 26, 19], fill=BLUSH)
    d.rectangle([18, 19, 19, 19], fill=darken(skin, 0.85))


def draw_pyjama_base(d, pyjama, pyjama_hi, pyjama_shadow, skin):
    d.rectangle([17, 22, 20, 24], fill=skin)  # cou

    d.rectangle([12, 24, 25, 38], fill=pyjama)
    d.rectangle([14, 24, 23, 26], fill=pyjama_hi)
    d.rectangle([12, 35, 25, 38], fill=pyjama_shadow)
    d.rectangle([17, 24, 20, 26], fill=pyjama_shadow)

    d.rectangle([7, 24, 12, 34], fill=pyjama)
    d.rectangle([25, 24, 30, 34], fill=pyjama)
    d.rectangle([7, 31, 12, 34], fill=pyjama_shadow)
    d.rectangle([25, 31, 30, 34], fill=pyjama_shadow)
    d.ellipse([6, 33, 12, 37], fill=skin)
    d.ellipse([25, 33, 31, 37], fill=skin)

    d.rectangle([14, 38, 18, 50], fill=pyjama)
    d.rectangle([19, 38, 23, 50], fill=pyjama)
    d.rectangle([14, 47, 18, 50], fill=pyjama_shadow)
    d.rectangle([19, 47, 23, 50], fill=pyjama_shadow)
    d.ellipse([12, 49, 18, 53], fill=skin)
    d.ellipse([19, 49, 25, 53], fill=skin)


def build_avatar(skin, hair, messy, pyjama, outline_color, outline_thickness):
    hair_line = darken(hair, 0.6)
    pyjama_hi = lighten(pyjama, 0.28)
    pyjama_shadow = darken(pyjama, 0.75)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    draw_head(d, skin, hair, hair_line, messy)
    draw_pyjama_base(d, pyjama, pyjama_hi, pyjama_shadow, skin)
    return add_outline(img, outline_color, outline_thickness)


# ---------------------------------------------------------------------------
# Calques vêtements (paper-doll), alignés sur les mêmes zones que le corps
# ---------------------------------------------------------------------------
def draw_calecon(couleur, outline_color, thickness):
    ombre = darken(couleur, 0.72)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([13, 31, 24, 40], radius=2, fill=couleur)
    d.rectangle([13, 37, 24, 40], fill=ombre)
    d.line([(18, 31), (18, 37)], fill=ombre, width=1)  # petite couture centrale
    return add_outline(img, outline_color, thickness)


def draw_shirt(shirt, outline_color, thickness):
    shirt_hi = lighten(shirt, 0.28)
    shirt_shadow = darken(shirt, 0.75)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([7, 24, 12, 33], radius=1, fill=shirt)
    d.rounded_rectangle([25, 24, 30, 33], radius=1, fill=shirt)
    d.rectangle([7, 30, 12, 33], fill=shirt_shadow)
    d.rectangle([25, 30, 30, 33], fill=shirt_shadow)
    d.rounded_rectangle([12, 23, 25, 38], radius=2, fill=shirt)
    d.rectangle([14, 23, 23, 25], fill=shirt_hi)
    d.rectangle([12, 34, 25, 38], fill=shirt_shadow)
    d.polygon([(15, 23), (22, 23), (20, 27), (17, 27)], fill=shirt_shadow)
    return add_outline(img, outline_color, thickness)


def draw_pull(pull, outline_color, thickness):
    # silhouette plus large que le t-shirt (porté par-dessus) + côtes
    # tricotées aux poignets/col/bas, pour se distinguer nettement au
    # premier coup d'œil plutôt que de juste recolorier le même patron.
    pull_hi = lighten(pull, 0.22)
    pull_shadow = darken(pull, 0.7)
    cote = darken(pull, 0.6)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([5, 24, 12, 35], radius=1, fill=pull)
    d.rounded_rectangle([25, 24, 32, 35], radius=1, fill=pull)
    for sx in (5, 25):
        d.rectangle([sx, 32, sx + 7, 35], fill=cote)
    d.rounded_rectangle([10, 22, 27, 39], radius=2, fill=pull)
    d.rectangle([12, 22, 25, 25], fill=pull_hi)
    d.rectangle([10, 35, 27, 39], fill=cote)
    # col rond, plus couvrant que l'encolure du t-shirt
    d.pieslice([14, 20, 23, 27], 180, 360, fill=pull_shadow)
    d.arc([14, 20, 23, 27], 180, 360, fill=cote)
    # côtes verticales sur le corps, discrètes
    for lx in (14, 17.5, 21, 24.5):
        d.line([(lx, 27), (lx, 34)], fill=pull_shadow, width=1)
    return add_outline(img, outline_color, thickness)


def draw_pants(pants, outline_color, thickness):
    pants_shadow = darken(pants, 0.68)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([14, 37, 18, 44], radius=1, fill=pants)
    d.rounded_rectangle([19, 37, 23, 44], radius=1, fill=pants)
    d.rectangle([14, 41, 18, 44], fill=pants_shadow)
    d.rectangle([19, 41, 23, 44], fill=pants_shadow)
    # ourlet net : liseré sombre qui referme la jambe avant la chaussette
    d.rectangle([14, 43, 18, 44], fill=darken(pants, 0.55))
    d.rectangle([19, 43, 23, 44], fill=darken(pants, 0.55))
    return add_outline(img, outline_color, thickness)


def draw_socks(sock, stripe, outline_color, thickness):
    sock_shadow = darken(sock, 0.85)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.rectangle([14, 44, 18, 49], fill=sock)
    d.rectangle([19, 44, 23, 49], fill=sock)
    d.rectangle([14, 46, 17, 46], fill=stripe)
    d.rectangle([20, 46, 23, 46], fill=stripe)
    d.rectangle([14, 47, 18, 49], fill=sock_shadow)
    d.rectangle([19, 47, 23, 49], fill=sock_shadow)
    return add_outline(img, outline_color, thickness)


def draw_shoes(shoe, sole, outline_color, thickness):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.ellipse([12, 48, 18, 53], fill=shoe)
    d.ellipse([19, 48, 25, 53], fill=shoe)
    d.rectangle([12, 51, 18, 53], fill=sole)
    d.rectangle([19, 51, 25, 53], fill=sole)
    # trait de lacet, pour que la chaussure se lise comme un objet distinct
    d.line([(14, 49), (16, 49)], fill=darken(shoe, 0.7), width=1)
    d.line([(21, 49), (23, 49)], fill=darken(shoe, 0.7), width=1)
    return add_outline(img, outline_color, thickness)


def draw_coat(coat, coat_trim, outline_color, thickness):
    coat_shadow = darken(coat, 0.72)
    coat_hi = lighten(coat, 0.22)
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([4, 24, 10, 33], radius=1, fill=coat)
    d.rounded_rectangle([27, 24, 33, 33], radius=1, fill=coat)
    d.rectangle([4, 30, 10, 33], fill=coat_shadow)
    d.rectangle([27, 30, 33, 33], fill=coat_shadow)
    # poignets contrastés — marquent la limite de la manche même si la
    # teinte du manteau est proche de celle du haut porté dessous
    d.rectangle([4, 30, 10, 32], fill=coat_trim)
    d.rectangle([27, 30, 33, 32], fill=coat_trim)
    d.rounded_rectangle([9, 23, 28, 41], radius=2, fill=coat)
    d.rectangle([11, 23, 26, 25], fill=coat_hi)
    d.polygon([(15, 23), (22, 23), (24, 28), (13, 28)], fill=coat_shadow)
    # col contrasté
    d.polygon([(14, 23), (16, 23), (18, 26), (16, 26)], fill=coat_trim)
    d.polygon([(23, 23), (21, 23), (19, 26), (21, 26)], fill=coat_trim)
    d.rectangle([9, 37, 28, 41], fill=coat_shadow)
    # fermeture centrale + boutons — signale "manteau ouvert par-dessus",
    # pas "un autre haut de la même couleur"
    d.line([(18, 27), (18, 40)], fill=coat_shadow, width=1)
    d.line([(19, 27), (19, 40)], fill=coat_shadow, width=1)
    for by in (29, 33, 37):
        d.point((18, by), fill=coat_trim)
        d.point((19, by), fill=coat_trim)
    return add_outline(img, outline_color, thickness)


def composite(*layers):
    base = layers[0].copy()
    for layer in layers[1:]:
        base.alpha_composite(layer)
    return base


# ---------------------------------------------------------------------------
# Deux déclinaisons enfant (palette + épaisseur de contour du handoff)
# ---------------------------------------------------------------------------
CHILDREN = {
    "colette": {
        "skin": (244, 201, 160, 255),
        "hair": (176, 88, 53, 255),
        "messy": False,
        "pyjama": (247, 210, 221, 255),
        "calecon": (200, 138, 160, 255),
        "shirt": (200, 138, 160, 255),
        "pull": (168, 100, 130, 255),
        "pants": (146, 168, 190, 255),
        "sock": (250, 240, 240, 255),
        "sock_stripe": (200, 138, 160, 255),
        "shoe": (255, 255, 255, 255),
        "sole": (168, 138, 144, 255),
        "coat": (247, 184, 203, 255),
        "coat_trim": (250, 240, 240, 255),
        "outline": OUTLINE_SOFT,
        "thickness": 1,
    },
    "leon": {
        "skin": (216, 163, 122, 255),
        "hair": (43, 35, 33, 255),
        "messy": True,
        "pyjama": (76, 96, 158, 255),
        "calecon": (91, 168, 105, 255),
        "shirt": (240, 149, 47, 255),
        "pull": (154, 68, 58, 255),
        "pants": (30, 39, 64, 255),
        "sock": (232, 237, 247, 255),
        "sock_stripe": (240, 149, 47, 255),
        "shoe": (232, 237, 247, 255),
        "sole": (14, 20, 36, 255),
        "coat": (201, 118, 34, 255),
        "coat_trim": (30, 39, 64, 255),
        "outline": OUTLINE_HIGH,
        "thickness": 2,
    },
}


def main():
    for name, c in CHILDREN.items():
        base = build_avatar(c["skin"], c["hair"], c["messy"], c["pyjama"], c["outline"], c["thickness"])
        save(base, f"{name}_pyjama")

        shirt = draw_shirt(c["shirt"], c["outline"], c["thickness"])
        pull = draw_pull(c["pull"], c["outline"], c["thickness"])
        pants = draw_pants(c["pants"], c["outline"], c["thickness"])
        socks = draw_socks(c["sock"], c["sock_stripe"], c["outline"], c["thickness"])
        shoes = draw_shoes(c["shoe"], c["sole"], c["outline"], c["thickness"])
        coat = draw_coat(c["coat"], c["coat_trim"], c["outline"], c["thickness"])

        # corps nu complet (tête, torse, bras, jambes) : point de départ réel
        # de la routine ("partir de l'enfant nu"), pas seulement un squelette
        # de compositing — donc pas de trou au torse/bras.
        skin_shadow = darken(c["skin"], 0.88)
        naked = new_canvas()
        d = ImageDraw.Draw(naked)
        hair_line = darken(c["hair"], 0.6)
        draw_head(d, c["skin"], c["hair"], hair_line, c["messy"])
        d.rectangle([17, 22, 20, 24], fill=c["skin"])
        d.rounded_rectangle([12, 23, 25, 38], radius=2, fill=c["skin"])
        d.rectangle([12, 34, 25, 38], fill=skin_shadow)
        d.rounded_rectangle([8, 24, 12, 33], radius=1, fill=c["skin"])
        d.rounded_rectangle([25, 24, 29, 33], radius=1, fill=c["skin"])
        d.ellipse([6, 33, 12, 37], fill=c["skin"])
        d.ellipse([25, 33, 31, 37], fill=c["skin"])
        d.rectangle([14, 37, 18, 49], fill=c["skin"])
        d.rectangle([19, 37, 23, 49], fill=c["skin"])
        d.ellipse([12, 49, 18, 53], fill=c["skin"])
        d.ellipse([19, 49, 25, 53], fill=c["skin"])
        naked = add_outline(naked, c["outline"], c["thickness"])

        calecon = draw_calecon(c["calecon"], c["outline"], c["thickness"])

        save(composite(naked, calecon, shirt, pull, pants, socks), f"{name}_habille")
        save(composite(naked, calecon, shirt, pull, pants, socks, shoes), f"{name}_pret")
        save(composite(naked, calecon, shirt, pull, pants, socks, shoes, coat), f"{name}_manteau")

        # calques individuels séparés, pour un empilage progressif côté app
        # (une couche par étape de la routine, plutôt que des combos figés)
        save(naked, f"{name}_calque_corps")
        save(calecon, f"{name}_calque_calecon")
        save(shirt, f"{name}_calque_haut")
        save(pull, f"{name}_calque_pull")
        save(pants, f"{name}_calque_pantalon")
        save(socks, f"{name}_calque_chaussettes")
        save(shoes, f"{name}_calque_chaussures")
        save(coat, f"{name}_calque_manteau")

    print(f"Sprites de preview dans : {os.path.abspath(OUT)}")


if __name__ == "__main__":
    main()
