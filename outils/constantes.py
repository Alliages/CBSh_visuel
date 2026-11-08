"""Constantes partagées par les outils Python (hors site) : chemins, palette, projection de l'axonométrie.

Les réglages du site (seuils, textes, dimensions du plan) sont dans js/config.js ; la palette du site fait foi dans css/style.css
(variables de :root) : elle est recopiée ici pour la figure d'aide.
"""
import math
from pathlib import Path

# ================= Chemins (depuis la racine du dépôt) =================
RACINE = Path(__file__).resolve().parent.parent
CHEMIN_AXO = RACINE / "assets" / "axo.svg"
CHEMIN_ZONES = RACINE / "data" / "zones.json"
CHEMIN_NOMENCLATURE = RACINE / "data" / "nomenclature.json"
CHEMIN_AIDE_SVG = RACINE / "assets" / "aide_cbsh_nomenclature.svg"

# ================= Palette du projet (source : css/style.css) =================
FERN, CELADON, JET, GOLD, BRONZE = "#588157", "#9bceb1", "#2a3439", "#e6be60", "#d8a48f"

# ================= Projection isométrique de l'axonométrie (repère du SVG) =================
# P(x, y, z) = (ORIGINE_X + (x − y)·cos 30°·ECHELLE ; ORIGINE_Y + (x + y)·PAS_Y − z·ECHELLE), x, y, z en mètres
ORIGINE_X, ORIGINE_Y = 652, 335          # image du point (0, 0, 0) dans le SVG
ECHELLE = 15                              # px par mètre
PAS_Y = 7.5                               # px par mètre sur les axes x et y (demi-hauteur du losange)
COS30 = math.cos(math.radians(30))
