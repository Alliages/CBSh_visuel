"""Convertit la grille CBSh (xlsx, septembre 2024) en data/nomenclature.json.

Usage (PowerShell, depuis la racine du dépôt) :
    pip install openpyxl            # uniquement pour cet outil, pas pour le site
    python outils/nomenclature_xlsx_vers_json.py chemin\\vers\\20240902_Nomenclature_CBSh_Diffusion_.xlsx

Principe : les coefficients, le repérage des valeurs par défaut (astérisque) et les descriptions
sont lus dans la grille ; les libellés courts et les règles de strates sont rédigés ci-dessous.
Chaque ligne rédigée porte le coefficient attendu : le script s'arrête si la grille ne correspond plus.
Les identifiants (ID) de la grille d'origine sont cassés (#REF!) : ils sont attribués ici dans l'ordre de la grille.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

# ================= Réglages =================
CHEMIN_JSON = Path("data/nomenclature.json")
VERSION_GRILLE = "septembre 2024"
TITRE_GRILLE = "Nomenclature du Coefficient de Biotope Surfacique harmonisé (CBSh)"
MENTION = ("Le CBSh est un indicateur élaboré au sein du GT 7 – Biodiversité, piloté par le CSTB, "
           "dans le cadre du projet Cap 2030.")
PREMIERE_LIGNE_DONNEES = 13          # première ligne de la grille portant un coefficient
COL_COEF, COL_DESCRIPTION, COL_REGLE = 6, 7, 8   # colonnes F, G, H

# Catégories : clé (aussi utilisée en CSS), libellé complet, libellé court
CATEGORIES = [
    ("bat", "Bâtiments — toitures", "Toitures"),
    ("voi", "Voiries", "Voiries"),
    ("ev", "Espaces verts au sol", "Espaces verts au sol"),
    ("eau", "Masses d'eau", "Masses d'eau"),
]
# Types de strates végétales (ordre d'affichage des pictogrammes)
STRATES = [("sedum", "Sédum"), ("herbacees", "Herbacées"), ("arbustes", "Arbustes"), ("arbres", "Arbres")]

S, H, A, T = "sedum", "herbacees", "arbustes", "arbres"
# (catégorie, libellé, condition, strates (nombre, parmi) ou None, coefficient attendu) — dans l'ordre de la grille
TYPOLOGIES = [
    ("bat", "Toiture classique", "Gravier, métal, tuile, asphalte…", None, 0),
    ("bat", "Toiture extensive −", "Substrat < 8 cm · sédum", (1, [S]), 0.1),
    ("bat", "Toiture extensive +", "Substrat 9 à 12 cm · herbacées", (1, [H]), 0.2),
    ("bat", "Toiture extensive +", "Substrat 9 à 12 cm · herbacées + arbustes", (2, [H, A]), 0.3),
    ("bat", "Toiture semi-intensive", "Substrat 13 à 30 cm · 1 strate", (1, [H, A]), 0.3),
    ("bat", "Toiture semi-intensive", "Substrat 13 à 30 cm · 2 strates", (2, [H, A]), 0.4),
    ("bat", "Toiture intensive −", "Substrat 31 à 60 cm · 1 strate", (1, [H, A, T]), 0.4),
    ("bat", "Toiture intensive −", "Substrat 31 à 60 cm · 2 strates", (2, [H, A, T]), 0.5),
    ("bat", "Toiture intensive −", "Substrat 31 à 60 cm · 3 strates", (3, [H, A, T]), 0.6),
    ("bat", "Toiture intensive +", "Substrat > 60 cm · 1 strate", (1, [H, A, T]), 0.5),
    ("bat", "Toiture intensive +", "Substrat > 60 cm · 2 strates", (2, [H, A, T]), 0.6),
    ("bat", "Toiture intensive +", "Substrat > 60 cm · 3 strates", (3, [H, A, T]), 0.7),
    ("voi", "Minérale imperméable", "Béton, asphalte, enrobé, dalles jointoyées…", None, 0),
    ("voi", "Semi-perméable", "Pavés, graviers, stabilisé…", None, 0.1),
    ("voi", "Mixte", "Pavés à gazon, joints enherbés…", None, 0.2),
    ("voi", "Minérale imperméable avec arbres", "> 2 arbres / 100 m²", (1, [T]), 0.1),
    ("voi", "Semi-perméable avec arbres", "> 2 arbres / 100 m²", (1, [T]), 0.2),
    ("voi", "Mixte avec arbres", "> 2 arbres / 100 m²", (1, [T]), 0.3),
    ("ev", "Espace vert sur dalle", "Substrat < 30 cm · 1 strate", (1, [H, A]), 0.3),
    ("ev", "Espace vert sur dalle", "Substrat < 30 cm · 2 strates", (2, [H, A]), 0.4),
    ("ev", "Espace vert sur dalle", "Substrat 31 à 80 cm · 1 strate", (1, [H, A, T]), 0.4),
    ("ev", "Espace vert sur dalle", "Substrat 31 à 80 cm · 2 strates", (2, [H, A, T]), 0.5),
    ("ev", "Espace vert sur dalle", "Substrat 31 à 80 cm · 3 strates", (3, [H, A, T]), 0.7),
    ("ev", "Espace vert sur dalle", "Substrat > 81 cm · 1 strate", (1, [H, A, T]), 0.5),
    ("ev", "Espace vert sur dalle", "Substrat > 81 cm · 2 strates", (2, [H, A, T]), 0.6),
    ("ev", "Espace vert sur dalle", "Substrat > 81 cm · 3 strates", (3, [H, A, T]), 0.8),
    ("ev", "Pleine terre", "1 strate", (1, [H, A, T]), 0.7),
    ("ev", "Pleine terre", "2 strates", (2, [H, A, T]), 0.8),
    ("ev", "Pleine terre", "3 strates", (3, [H, A, T]), 0.9),
    ("ev", "Espace agricole", "Grande culture", None, 0.6),
    ("ev", "Espace agricole", "Pré et pâture", None, 0.7),
    ("ev", "Espace agricole", "Prairie temporaire", None, 0.8),
    ("ev", "Espace agricole", "Friche agricole < 5 ans", None, 0.7),
    ("ev", "Espace agricole", "Friche agricole > 5 ans", None, 0.8),
    ("ev", "Prairie permanente", "Zone herbacée de longue durée", None, 0.9),
    ("ev", "Espace naturel", "Forêts, prairies, dunes, zones humides…", None, 1),
    ("eau", "Masse d'eau", "Bassin, réservoir", None, 0.2),
    ("eau", "Masse d'eau", "Milieu humide étanche", None, 0.7),
    ("eau", "Masse d'eau", "Milieu humide non étanche", None, 1),
    ("eau", "Masse d'eau", "Noue d'infiltration", None, 0.7),
    ("eau", "Masse d'eau", "Fossé", None, 0.8),
]


def propre(texte):
    """Texte de cellule nettoyé (retours à la ligne normalisés, espaces superflus retirés)."""
    if texte is None:
        return None
    texte = str(texte).replace("\r", "")
    texte = "\n".join(re.sub(r"[ \t]+", " ", ligne).strip() for ligne in texte.split("\n")).strip()
    return texte or None


def lire_grille(chemin):
    """Lignes de la grille portant un coefficient : (coef, défaut ?, description, règle)."""
    feuille = openpyxl.load_workbook(chemin).active
    lignes = []
    for r in range(PREMIERE_LIGNE_DONNEES, feuille.max_row + 1):
        brut = feuille.cell(r, COL_COEF).value
        if brut is None or str(brut).startswith("Coeff"):
            continue
        coef = float(str(brut).replace(",", ".").rstrip("*").strip())
        lignes.append({"ligne_xlsx": r, "coef": coef, "defaut": "*" in str(brut),
                       "description": propre(feuille.cell(r, COL_DESCRIPTION).value),
                       "regle": propre(feuille.cell(r, COL_REGLE).value)})
    return lignes


def construire(chemin_xlsx):
    grille = lire_grille(chemin_xlsx)
    if len(grille) != len(TYPOLOGIES):
        sys.exit(f"Grille : {len(grille)} lignes à coefficient, {len(TYPOLOGIES)} attendues.")
    cles = {c[0] for c in CATEGORIES}
    typologies = []
    for i, (g, (cat, libelle, condition, strates, attendu)) in enumerate(zip(grille, TYPOLOGIES), start=1):
        if cat not in cles:
            sys.exit(f"Catégorie inconnue : {cat}")
        if abs(g["coef"] - attendu) > 1e-9:
            sys.exit(f"Ligne xlsx {g['ligne_xlsx']} ({libelle} · {condition}) : coefficient {g['coef']} ≠ {attendu} attendu.")
        t = {"id": i, "categorie": cat, "libelle": libelle, "condition": condition, "coef": g["coef"], "defaut": g["defaut"],
             "strates": None if strates is None else {"nombre": strates[0], "parmi": strates[1]}}
        if g["description"]:
            t["description"] = g["description"]
        if g["regle"] and not g["regle"].startswith("*"):
            t["regle"] = g["regle"]
        typologies.append(t)
    return {
        "titre": f"{TITRE_GRILLE} — version de {VERSION_GRILLE}",
        "version": VERSION_GRILLE,
        "mention": MENTION,
        "categories": [{"cle": c, "libelle": lib, "court": court} for c, lib, court in CATEGORIES],
        "strates": [{"cle": c, "libelle": lib} for c, lib in STRATES],
        "typologies": typologies,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    donnees = construire(sys.argv[1])
    CHEMIN_JSON.parent.mkdir(parents=True, exist_ok=True)
    CHEMIN_JSON.write_text(json.dumps(donnees, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    par_cat = {c: sum(1 for t in donnees["typologies"] if t["categorie"] == c) for c, *_ in CATEGORIES}
    print(f"{len(donnees['typologies'])} typologies {par_cat} → {CHEMIN_JSON}")
    print("par défaut :", [t["id"] for t in donnees["typologies"] if t["defaut"]])
