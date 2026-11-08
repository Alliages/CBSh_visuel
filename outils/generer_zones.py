"""Génère data/zones.json : zones cliquables de l'axonométrie (assets/axo.svg).

Chaque zone est un ou plusieurs rectangles (en mètres, dans le plan du projet) projetés en isométrie.
Projection de l'illustration (repère du SVG) : voir outils/constantes.py.
x vers la droite-bas, y vers la gauche-bas, z vers le haut. Source des contours : PASSATION_CBSh.md § 3 (documents du projet Claude).

Usage (depuis la racine du dépôt) :  python outils/generer_zones.py
"""
import json
import re

# AXO : le viewBox des zones est celui de l'illustration
from constantes import CHEMIN_AXO as AXO, CHEMIN_ZONES as SORTIE, COS30, ECHELLE, ORIGINE_X, ORIGINE_Y, PAS_Y

# ================= Réglages =================

# Types de zone :
#   saisie  : popup de saisie des lignes de la catégorie (champ « lignes » = lignes du tableau rattachées au départ)
#   info    : popup d'information seule (aucune ligne, aucune saisie)
#   inerte  : zone dessinée mais ni cliquable, ni survolable, ni comptée (aucun événement souris, pas d'infobulle)
# Ordre = ordre de superposition : le sol d'abord, les toitures ensuite (la dernière zone est au-dessus).
TEXTE_TERRASSE = ("Terrasse bois accessible : assimilée à une toiture classique (coefficient 0). "
                  "Sa surface est comptée dans la ligne « Toiture classique ».")
TEXTE_PV = ("Une toiture peut porter à la fois des panneaux solaires et une végétation (toiture « biosolaire »). "
            "La fraîcheur apportée par la végétation peut améliorer le rendement des panneaux en été. "
            "La toiture gagne en même temps en biodiversité, en rétention d'eau de pluie et en confort d'été. "
            "Les panneaux n'ont pas de ligne propre : leur emprise est comptée dans la ligne de toiture végétalisée "
            "concernée (ici n° 2, sédum).")
ZONES = [
    # (id, libellé, type, catégorie, lignes, z en m, rectangles (x0, x1, y0, y1) en m, champs en plus)
    # Repères des lignes 9 et 10 : pointe basse (côté gauche de l'illustration) de la bande, là où rien ne les masque ;
    # 2 m d'écart le long de la bande pour que les deux pastilles ne se superposent pas (0.8.14).
    ("pleine-terre",       "Pleine terre (bande ouest)",              "saisie", "ev",  [9, 10], 0,  [(0, 6, 0, 25)],
        {"ancres_m": {9: (1, 24), 10: (1, 22)}}),
    ("venelle-dalles",     "Venelle dallée (non comptée dans le CBSh)", "inerte", None, [],   0,     [(6, 40, 0, 1)], {}),
    ("bande-est",          "Bande plantée (est)",                      "saisie", "ev",  [8],  0,     [(36, 40, 1, 13)], {}),
    ("stabilise",          "Place stabilisée",                         "saisie", "voi", [6],  0,     [(35.2, 40, 13, 15.5)], {}),
    ("enrobe",             "Parking enrobé",                           "saisie", "voi", [5],  0,     [(33, 40, 15.5, 25), (33, 35.2, 13, 15.5)], {}),
    ("paves",              "Cour pavée (joints enherbés)",             "saisie", "voi", [7],  0,     [(18, 33, 13, 16), (18, 24, 16, 25)], {}),
    ("jardin-dalle",       "Jardin sur dalle",                         "saisie", "ev",  [11], 0,     [(24, 33, 16, 23.5)], {}),
    ("noue",               "Masses d'eau (noue d'infiltration)",       "saisie", "eau", [12], 0,     [(24, 33, 23.5, 25)], {}),
    ("toit-terrasse-plot", "Terrasse bois du plot",                    "info",   None,  [],   12.75, [(6.35, 17.65, 13.35, 16)],
        {"info": {"titre": "Terrasse bois du plot", "texte": TEXTE_TERRASSE}}),
    ("toit-butte-plot",    "Toiture intensive haute du plot (butte)",  "saisie", "bat", [4],  12.75, [(6.35, 17.65, 16, 24.65)], {}),
    ("toit-bitume",        "Toiture bitume de la barre",               "saisie", "bat", [1],  16.75, [(28, 35.65, 1.35, 12.65)],
        {"note": "Cette ligne regroupe aussi la terrasse bois du plot, assimilée à une toiture classique."}),
    # Barre : lignes 2 (sédum, sous les panneaux) et 3 (extensif herbacées). Les panneaux (zone d'information, au-dessus, sur
    # toute la largeur de la barre) ne font plus partie de la zone : cliquer sur eux n'ouvre pas la saisie de la toiture (0.8.14).
    # Repère de la ligne 2 : sur les panneaux, à leur altitude (3e valeur de `ancres_m` = z en m).
    ("toit-extensive-barre", "Toiture extensive de la barre",          "saisie", "bat", [2, 3], 16.75, [(11.3, 27.75, 1.35, 12.65)],
        {"ancres_m": {2: (8.7, 10.5, 17.2)}}),
    ("pv-toiture",         "Panneaux photovoltaïques",                 "info",   None,  [],   17.2,  [(6.35, 11, 1.35, 12.65)],
        {"info": {"titre": "Végétalisation et photovoltaïque se cumulent", "texte": TEXTE_PV}}),
]


def viewbox_axo():
    """viewBox de l'illustration (premier attribut viewBox du fichier SVG)."""
    return re.search(r'viewBox="([^"]+)"', AXO.read_text(encoding="utf-8")[:400]).group(1)


def projeter(x, y, z):
    """Point (m) → coordonnées du SVG, arrondies à 0,1."""
    return (round(ORIGINE_X + (x - y) * COS30 * ECHELLE, 1), round(ORIGINE_Y + (x + y) * PAS_Y - z * ECHELLE, 1))


def chemin(points):
    return "M" + " L".join(f"{x:g},{y:g}" for x, y in points) + " Z"


def main():
    zones = []
    for id_, libelle, type_, categorie, lignes, z, rects, extra in ZONES:
        sous_chemins = [chemin([projeter(x0, y0, z), projeter(x1, y0, z), projeter(x1, y1, z), projeter(x0, y1, z)])
                        for x0, x1, y0, y1 in rects]
        zone = {"id": id_, "libelle": libelle, "type": type_}
        if type_ == "saisie":
            zone.update({"categorie": categorie, "lignes": lignes})
            # Ancre des traits de repère des étiquettes : centre du plus grand rectangle ; `ancres_m` : ancre propre à une ligne (x, y en m, et z en m si différent de la zone)
            x0, x1, y0, y1 = max(rects, key=lambda r: (r[1] - r[0]) * (r[3] - r[2]))
            zone["ancre"] = list(projeter((x0 + x1) / 2, (y0 + y1) / 2, z))
            ancres_m = extra.pop("ancres_m", {})
            if ancres_m:
                zone["ancres"] = {str(n): list(projeter(p[0], p[1], p[2] if len(p) > 2 else z)) for n, p in ancres_m.items()}
        zone.update(extra)
        zone["chemin"] = " ".join(sous_chemins)
        zones.append(zone)
    # Façade végétalisée : plan vertical x = 36, y 1 → 4, z 4 → 17,2 (hors CBSh, au-dessus de tout)
    facade = [projeter(36, 1, 4), projeter(36, 4, 4), projeter(36, 4, 17.2), projeter(36, 1, 17.2)]
    zones.append({"id": "facade-veg", "libelle": "Façade végétalisée (hors CBSh)", "type": "facade", "chemin": chemin(facade)})
    SORTIE.write_text(json.dumps({"viewBox": viewbox_axo(), "zones": zones}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(zones)} zones écrites dans {SORTIE}")


if __name__ == "__main__":
    main()
