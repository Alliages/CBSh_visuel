# Génère assets/aide_cbsh_nomenclature.svg : nomenclature CBSh aux couleurs de l'application.
# Usage : python generer_image_aide.py <fichier_sortie.svg>
import sys

# ===== Réglages =====
FERN, CELADON, JET, GOLD, BRONZE = "#588157", "#9bceb1", "#2a3439", "#e6be60", "#d8a48f"
GRIS = "#5b6569"
LARGEUR, HAUTEUR = 1280, 780
X_DEPART, LARG_COL, ECART = 50, 220, 20
Y_ENTETE, Y_TUILE, H_TUILE = 135, 155, 130
Y_COEF, Y_LIBELLES, Y_LISTE = 340, 372, 405
POLICE = "Inter, 'Segoe UI', Arial, sans-serif"

def melange(hexa, t, base="#ffffff"):
    """Mélange la couleur hexa (proportion t) avec la base (blanc par défaut)."""
    a = [int(hexa[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(base[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x * t + y * (1 - t)):02x}" for x, y in zip(a, b))

# ===== Pictogrammes (centrés sur 0,0 dans une tuile de 220 x 130) =====
def trait(largeur=3):
    return f'stroke="{JET}" stroke-width="{largeur}" stroke-linejoin="round" stroke-linecap="round"'
TRAIT = trait()
TRAIT_FIN = trait(2)
TRAIT_MOYEN = trait(2.5)

def picto_toit():
    tuiles = "".join(f'<path d="M{x},-25 V12" {TRAIT_FIN} fill="none"/>' for x in (-18, 0, 18))
    return (f'<rect x="-48" y="20" width="96" height="16" fill="{melange(GOLD, .6)}" {TRAIT}/>'
            f'<rect x="12" y="-48" width="16" height="26" fill="{melange(BRONZE, .6, JET)}" {TRAIT}/>'
            f'<path d="M-55,20 L-36,-25 H36 L55,20 Z" fill="{BRONZE}" {TRAIT}/>{tuiles}')

def picto_toiture_vegetale():
    fenetres = "".join(f'<path d="M-30,{y} H30" {TRAIT_FIN}/>' for y in (12, 26, 40))
    return (f'<rect x="-40" y="0" width="80" height="48" fill="#fff" {TRAIT}/>{fenetres}'
            f'<rect x="-46" y="-12" width="92" height="12" fill="{FERN}" {TRAIT}/>'
            f'<path d="M-20,-12 V-26 M20,-12 V-30" {TRAIT}/>'
            f'<circle cx="-20" cy="-34" r="11" fill="{melange(FERN, .55)}" {TRAIT}/>'
            f'<circle cx="20" cy="-40" r="13" fill="{melange(FERN, .55)}" {TRAIT}/>')

def picto_voirie():
    return (f'<rect x="-48" y="-42" width="96" height="84" rx="10" fill="{melange(FERN, .55)}" {TRAIT}/>'
            f'<path d="M-48,-14 H12 Q38,-14 38,8 Q38,28 12,28 H-48" fill="none" stroke="#fff" stroke-width="18"/>'
            f'<path d="M-48,-14 H12 Q38,-14 38,8 Q38,28 12,28 H-48" fill="none" stroke="{GOLD}" stroke-width="3" stroke-dasharray="8 7"/>'
            f'<rect x="-48" y="-42" width="96" height="84" rx="10" fill="none" {TRAIT}/>')

def picto_espace_vert():
    def arbre(x):
        return (f'<path d="M{x},2 V26 M{x},16 l-8,8 M{x},16 l8,8" {TRAIT} fill="none"/>'
                f'<path d="M{x},-42 L{x - 15},4 H{x + 15} Z" fill="{FERN}" {TRAIT}/>')
    return (f'<rect x="-52" y="4" width="104" height="38" fill="{melange(BRONZE, .8, JET)}" {TRAIT}/>'
            f'<rect x="-52" y="4" width="104" height="9" fill="{melange(FERN, .7)}" {TRAIT}/>'
            f'<rect x="-52" y="42" width="104" height="8" fill="{CELADON}" {TRAIT}/>'
            + arbre(-24) + arbre(24))

def picto_eau():
    pierres = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{melange(JET, .25)}" {TRAIT_MOYEN}/>'
                      for x, y, r in ((-52, 2, 9), (-38, -22, 8), (36, -26, 9), (54, 4, 9), (30, 34, 8), (-30, 34, 8)))
    vagues = "".join(f'<path d="M{x},{y} q7,-7 14,0 t14,0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
                     for x, y in ((-28, -6), (2, 8), (-12, 20)))
    return (f'<circle cx="-46" cy="-24" r="12" fill="{melange(FERN, .6)}" {TRAIT_MOYEN}/>'
            f'<ellipse cx="0" cy="4" rx="52" ry="34" fill="{CELADON}" {TRAIT}/>{vagues}{pierres}')

# ===== Contenu des colonnes =====
COLONNES = [
    dict(titre="Toits", couleur=BRONZE, picto=picto_toit, coef="0", libelles=[],
         liste=[["Toiture classique", "gravier, métal, tuile,", "asphalte…"]]),
    dict(titre="Toitures végétalisées", couleur=BRONZE, picto=picto_toiture_vegetale, coef="0,1 → 0,7",
         libelles=["Extensive", "Intensive"],
         liste=[["Extensif −", "moins de 8 cm de substrat"], ["Extensif +", "de 9 à 12 cm de substrat"],
                ["Semi-intensif", "de 13 à 30 cm de substrat"], ["Intensif −", "de 31 à 60 cm de substrat"],
                ["Intensif +", "plus de 60 cm de substrat"]], titres_gras=True),
    dict(titre="Voiries", couleur=GOLD, picto=picto_voirie, coef="0 → 0,3", libelles=["Minéral", "Mixte"],
         liste=[["Surfaces minérales", "imperméables"], ["Surfaces minérales semi-", "perméables et perméables"],
                ["Surfaces mixtes"], ["Surfaces minérales", "imperméables avec arbres"],
                ["Surfaces minérales semi-", "perméables et perméables", "avec arbres"],
                ["Surfaces mixtes avec arbres"]]),
    dict(titre="Espaces verts", couleur=FERN, picto=picto_espace_vert, coef="0,3 → 1", libelles=["Sur dalle", "Naturel"],
         liste=[["Espaces verts au sol", "sur dalle"], ["Espaces verts", "en pleine terre"],
                ["Espaces agricoles"], ["Prairie permanente"], ["Espaces naturels"]]),
    dict(titre="Masse d’eau", couleur=CELADON, picto=picto_eau, coef="0,2 → 1", libelles=["Bassin", "Milieu humide"],
         liste=[["Bassins et réservoirs", "d’eau"], ["Milieux humides étanches"], ["Noues d’infiltration"],
                ["Fossés"], ["Milieux humides non étanches"]]),
]

def colonne(i, c):
    x0 = X_DEPART + i * (LARG_COL + ECART)
    cx = x0 + LARG_COL / 2
    s = [f'<text x="{cx}" y="{Y_ENTETE}" text-anchor="middle" font-size="17" font-weight="700" fill="{JET}">{c["titre"]}</text>',
         f'<rect x="{x0}" y="{Y_TUILE}" width="{LARG_COL}" height="{H_TUILE}" rx="24" fill="{melange(c["couleur"], .28)}"/>',
         f'<g transform="translate({cx},{Y_TUILE + H_TUILE / 2})">{c["picto"]()}</g>',
         f'<text x="{cx}" y="{Y_COEF}" text-anchor="middle" font-size="34" font-weight="800" fill="{JET}">{c["coef"]}</text>']
    if c["libelles"]:
        for dx, lib in zip((55, 165), c["libelles"]):
            s.append(f'<text x="{x0 + dx}" y="{Y_LIBELLES}" text-anchor="middle" font-size="15" font-style="italic" fill="{GRIS}">{lib}</text>')
    y = Y_LISTE
    for lignes in c["liste"]:
        h = 16 * len(lignes) + 18
        s.append(f'<rect x="{x0}" y="{y}" width="{LARG_COL}" height="{h}" rx="12" fill="#fff" stroke="{melange(c["couleur"], .6)}" stroke-width="1.5"/>')
        s.append(f'<rect x="{x0}" y="{y + 8}" width="6" height="{h - 16}" rx="3" fill="{c["couleur"]}"/>')
        for k, texte in enumerate(lignes):
            gras = c.get("titres_gras") and k == 0
            s.append(f'<text x="{x0 + 20}" y="{y + 22 + 16 * k}" font-size="13" font-weight="{700 if gras else 400}" fill="{JET if k == 0 else GRIS}">{texte}</text>')
        y += h + 8
    return "\n".join(s)

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {HAUTEUR}" font-family="{POLICE}" role="img" aria-label="Familles de surfaces du CBSh et fourchettes de coefficients">',
       f'<text x="{LARGEUR / 2}" y="62" text-anchor="middle" font-size="32" font-weight="800" fill="{JET}">Coefficient de Biotope Surfacique harmonisé (CBSh)</text>']
svg += [colonne(i, c) for i, c in enumerate(COLONNES)]
svg.append("</svg>")
open(sys.argv[1], "w", encoding="utf-8").write("\n".join(svg))
