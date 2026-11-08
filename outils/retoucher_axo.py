"""Retouche de l'axonométrie (assets/axo.svg) pour la version 0.8.10.

Opérations (une seule fois, sur l'axo livré en 0.8.9) :
  1. retrait du contexte (immeubles et arbres voisins, 4 lignes grises) et des cotes « 40 m » / « 25 m » ;
  2. retrait des arbres et arbustes de la toiture de la barre (couverture herbacée : plus de strates arbustives ni arborées) ;
  3. sol de la bande est en herbe (pleine terre, ligne 8) au lieu de pavés enherbés ;
  4. oiseaux rapprochés de la toiture de la barre ;
  5. coupe de principe (assets/coupe_tranche.svg) : retrait des arbustes de la toiture n° 3 (herbacées seules) ;
  6. recentrage : seul le viewBox change (taille 920 × 840 conservée) ; il est répercuté dans index.html (calque de zones
     et traits de repère étiquettes → illustration) ; data/zones.json le reprend via outils/generer_zones.py.

Note 0.8.13 : le rectangle de fond (index 1) a ensuite été retiré à la main (fond géré par le CSS) ; le script n'est donc plus rejouable.
Le script refuse de s'exécuter si l'axo n'est pas celui attendu (contrôles sur les éléments) ou s'il est déjà retouché.
Usage (depuis la racine du dépôt) :  python outils/retoucher_axo.py
Dépendance : aucune (bibliothèque standard).
"""
import re
import sys
from pathlib import Path

# ================= Réglages =================
RACINE = Path(__file__).resolve().parent.parent
AXO = RACINE / "assets" / "axo.svg"
COUPE = RACINE / "assets" / "coupe_tranche.svg"
INDEX = RACINE / "index.html"
MARQUE = "<!-- retouché en 0.8.10 par outils/retoucher_axo.py -->"

# Indices des éléments de premier niveau de l'axo 0.8.9 (0 = <defs>, 1 = fond beige)
CONTEXTE = range(2, 126)                  # immeubles/arbres voisins (trait #cfd2cc) puis 4 lignes grises (#c4c8c3)
COTES = range(11186, 11190)               # 2 traits de cote (#9aa09c) et leurs textes « 40 m » / « 25 m »
VEGETATION_TOITURE = list(range(9887, 9917)) + list(range(9923, 9955))   # arbustes et 2 arbres de la barre (le local technique 9917-9922 reste)
SOL_BANDE_EST = 8537                      # polygone de la bande est (x 36-40 m, y 1-13 m)
OISEAUX = range(11182, 11186)             # 4 oiseaux (trait fin) : nouvelle position du point de départ « M x,y »
NOUVELLE_POSITION_OISEAUX = [(880, 192), (906, 174), (956, 228), (700, 104)]   # au-dessus de l'arête arrière-droite de la barre
VERTS = {"#588157", "#6f9a5c", "#88b06e", "#9bceb1", "#b4cf8e", "#d3e6b5", "#ffffff", "#d8a48f", "#e6be60", "#6b5a45"}

# Coupe de principe : arbustes de la toiture de la ligne 3 (3 groupes de 3 cercles, y ≈ 145-149)
ARBUSTES_COUPE = range(3637, 3646)

# Cadrage : le viewBox garde cette taille ; seule son origine est déplacée pour centrer le contenu
LARGEUR_VIEWBOX, HAUTEUR_VIEWBOX = 920, 840
LARGEUR_AXO_PLAN = 770                    # largeur de l'axo dans le plan (unités de conception de index.html)
OPACITE_MIN = 0.5                         # les ombres portées (opacité < 0,5) ne comptent pas dans le cadrage


# ================= Lecture de l'axo =================
MOTIF = re.compile(
    r"<defs>.*?</defs>"
    r"|<g\b[^>]*>.*?</g>"
    r"|<text\b[^>]*>.*?</text>"
    r"|<(?:rect|circle|ellipse|polygon|path|line)\b[^>]*/>",
    re.S)


def decouper(texte):
    """Éléments de premier niveau (index = rang dans le SVG, comme dans le DOM) : [(début, fin, source)]."""
    entete_fin = texte.index(">") + 1
    elements = [(m.start(), m.end(), m.group(0)) for m in MOTIF.finditer(texte, entete_fin)]
    # contrôle : rien d'autre que des blancs entre les éléments
    curseur = entete_fin
    for debut, fin, _ in elements:
        if texte[curseur:debut].strip():
            sys.exit(f"Contenu inattendu avant l'élément en position {debut} : {texte[curseur:debut][:60]!r}")
        curseur = fin
    if texte[curseur:].strip() != "</svg>":
        sys.exit("Fin de fichier inattendue")
    return entete_fin, elements


def attribut(source, nom):
    m = re.search(rf'\b{nom}="([^"]*)"', source)
    return m.group(1) if m else None


def etiquette(source):
    return re.match(r"<(\w+)", source).group(1)


def controler(elements):
    """Vérifie que les indices visés sont bien les éléments attendus (sinon : axo différent de celui de 0.8.9)."""
    def erreur(i, attendu):
        sys.exit(f"Élément {i} inattendu ({attendu}) : {elements[i][2][:90]}")
    if len(elements) != 11190:
        sys.exit(f"{len(elements)} éléments au lieu de 11190 : ce n'est pas l'axo de 0.8.9")
    for i in CONTEXTE:
        if attribut(elements[i][2], "stroke") not in ("#cfd2cc", "#c4c8c3"):
            erreur(i, "contexte")
    for i in COTES:
        if attribut(elements[i][2], "stroke") not in ("#9aa09c", None) or etiquette(elements[i][2]) not in ("line", "text"):
            erreur(i, "cote")
    if not (">40 m<" in elements[11187][2] and ">25 m<" in elements[11189][2]):
        erreur(11187, "texte de cote")
    for i in VEGETATION_TOITURE:
        src = elements[i][2]
        ok = (etiquette(src) == "circle" and attribut(src, "fill") in VERTS) or \
             (etiquette(src) == "path" and "#6b5a45" in src)
        if not ok:
            erreur(i, "végétation de toiture")
    if "url(#paves)" not in elements[SOL_BANDE_EST][2] or not elements[SOL_BANDE_EST][2].startswith('<polygon points="1106.7,612.5'):
        erreur(SOL_BANDE_EST, "sol de la bande est")
    for i in OISEAUX:
        if etiquette(elements[i][2]) != "path" or " q" not in elements[i][2]:
            erreur(i, "oiseau")
    if "url(#deck)" not in elements[9886][2]:
        erreur(9886, "chemin en bois de la toiture")


def retoucher_coupe():
    """Retire les arbustes de la toiture n° 3 dans la coupe de principe (indices de la coupe livrée en 0.8.9)."""
    texte = COUPE.read_text(encoding="utf-8")
    if MARQUE in texte:
        return
    entete_fin, elements = decouper(texte)
    if len(elements) != 3948:
        sys.exit(f"coupe_tranche.svg : {len(elements)} éléments au lieu de 3948")
    for i in ARBUSTES_COUPE:
        src = elements[i][2]
        if etiquette(src) != "circle" or attribut(src, "fill") not in VERTS or not 140 <= float(attribut(src, "cy")) <= 150:
            sys.exit(f"coupe_tranche.svg : élément {i} inattendu : {src[:90]}")
    morceaux, curseur = [texte[:entete_fin]], entete_fin
    for i, (debut, fin, src) in enumerate(elements):
        morceaux.append(texte[curseur:debut])
        if i not in ARBUSTES_COUPE:
            morceaux.append(src)
        curseur = fin
    morceaux.append(texte[curseur:])
    nouveau = re.sub(r"\n\s*\n+", "\n", "".join(morceaux))
    COUPE.write_text(nouveau.replace(texte[:entete_fin], texte[:entete_fin] + "\n" + MARQUE, 1), encoding="utf-8")
    print(f"Coupe : {len(ARBUSTES_COUPE)} éléments retirés.")


# ================= Cadrage =================
def boite(source):
    """Boîte englobante (x0, y0, x1, y1) des formes simples ; None pour le reste (chemins, textes)."""
    nombres = lambda nom: float(attribut(source, nom))
    balise = etiquette(source)
    if balise == "circle":
        x, y, r = nombres("cx"), nombres("cy"), nombres("r")
        return x - r, y - r, x + r, y + r
    if balise == "ellipse":
        x, y, rx, ry = nombres("cx"), nombres("cy"), nombres("rx"), nombres("ry")
        return x - rx, y - ry, x + rx, y + ry
    if balise == "polygon":
        pts = [tuple(map(float, p.split(","))) for p in attribut(source, "points").split()]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)
    if balise == "line":
        xs, ys = [nombres("x1"), nombres("x2")], [nombres("y1"), nombres("y2")]
        return min(xs), min(ys), max(xs), max(ys)
    return None


def cadrer(elements, supprimes):
    """Boîte englobante du contenu visible : hors fond, defs, groupe écrêté, ombres légères, éléments retirés."""
    x0 = y0 = float("inf")
    x1 = y1 = float("-inf")
    for i, (_, _, src) in enumerate(elements):
        if i <= 1 or i in supprimes or etiquette(src) == "g" or i in OISEAUX:
            continue
        if float(attribut(src, "opacity") or 1) < OPACITE_MIN:
            continue
        b = boite(src)
        if b:
            x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
    return x0, y0, x1, y1


# ================= Programme =================
def main():
    texte = AXO.read_text(encoding="utf-8")
    if MARQUE in texte:
        sys.exit("axo.svg est déjà retouché (rien à faire).")
    retoucher_coupe()
    entete_fin, elements = decouper(texte)
    controler(elements)

    ancien = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', texte[:entete_fin])
    vx0, vy0 = float(ancien[1]), float(ancien[2])
    if (float(ancien[3]), float(ancien[4])) != (LARGEUR_VIEWBOX, HAUTEUR_VIEWBOX):
        sys.exit("Taille de viewBox inattendue")

    supprimes = set(CONTEXTE) | set(COTES) | set(VEGETATION_TOITURE)
    x0, y0, x1, y1 = cadrer(elements, supprimes)
    if x1 - x0 > LARGEUR_VIEWBOX or y1 - y0 > HAUTEUR_VIEWBOX:
        sys.exit(f"Le contenu ({x1 - x0:.0f} × {y1 - y0:.0f}) dépasse le viewBox")
    vx = round((x0 + x1) / 2 - LARGEUR_VIEWBOX / 2)
    vy = round((y0 + y1) / 2 - HAUTEUR_VIEWBOX / 2)
    print(f"Contenu : x {x0:.1f}→{x1:.1f}, y {y0:.1f}→{y1:.1f} ; viewBox {vx0:g} {vy0:g} → {vx} {vy}")

    # --- Modifications d'éléments (avant reconstruction du texte) ---
    sources = {i: e[2] for i, e in enumerate(elements)}
    sources[SOL_BANDE_EST] = sources[SOL_BANDE_EST].replace("url(#paves)", "url(#herbe)")
    for i, (x, y) in zip(OISEAUX, NOUVELLE_POSITION_OISEAUX):
        sources[i] = re.sub(r"M[-\d.]+,[-\d.]+", f"M{x},{y}", sources[i], count=1)

    # --- Reconstruction : on garde le texte entre éléments, on retire les éléments supprimés (et leur saut de ligne) ---
    entete = texte[:entete_fin]
    morceaux, curseur = [entete], entete_fin
    for i, (debut, fin, _) in enumerate(elements):
        morceaux.append(texte[curseur:debut])
        if i not in supprimes:
            morceaux.append(sources[i])
        curseur = fin
    morceaux.append(texte[curseur:])
    nouveau = "".join(morceaux)
    nouveau = re.sub(r"\n\s*\n+", "\n", nouveau)                           # lignes vides laissées par les retraits
    nouveau = nouveau.replace(entete, entete.replace(ancien[0], f'viewBox="{vx} {vy} {LARGEUR_VIEWBOX} {HAUTEUR_VIEWBOX}"') + "\n" + MARQUE, 1)
    AXO.write_text(nouveau, encoding="utf-8")

    # --- Répercussion du nouveau viewBox ---
    page = INDEX.read_text(encoding="utf-8")
    ancien_zones = f'viewBox="{vx0:g} {vy0:g} {LARGEUR_VIEWBOX} {HAUTEUR_VIEWBOX}" role="group"'
    if ancien_zones not in page:
        sys.exit("index.html : calque de zones introuvable (viewBox)")
    page = page.replace(ancien_zones, f'viewBox="{vx} {vy} {LARGEUR_VIEWBOX} {HAUTEUR_VIEWBOX}" role="group"')
    k = LARGEUR_AXO_PLAN / LARGEUR_VIEWBOX                                  # unités du plan par unité du SVG
    dx, dy = -(vx - vx0) * k, -(vy - vy0) * k

    def decaler(m):
        x, y = float(m["x"]) + dx, float(m["y"]) + dy
        return f'{m["debut"]}{x:.1f},{y:.1f}" /><circle cx="{x:.1f}" cy="{y:.1f}"'
    page, n = re.subn(r'(?P<debut><polyline points="\d+,\d+ \d+,\d+ )(?P<x>[\d.]+),(?P<y>[\d.]+)" /><circle cx="[\d.]+" cy="[\d.]+"',
                      decaler, page)
    if n != 3:
        sys.exit(f"index.html : {n} traits de repère trouvés au lieu de 3")
    INDEX.write_text(page, encoding="utf-8")
    print(f"Traits de repère décalés de ({dx:+.1f} ; {dy:+.1f}) ; {len(supprimes)} éléments retirés.")
    print("Relancer ensuite : python outils/generer_zones.py  (reprend le viewBox de l'axo dans data/zones.json)")


if __name__ == "__main__":
    main()
