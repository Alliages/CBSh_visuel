# CBSh — Biotope de la parcelle

Outil web de calcul et de comparaison du **CBSh** (coefficient de biotope surfacique harmonisé) pour deux scénarios d'un même projet.

`CBSh = Σ (surface × coefficient) / surface de la parcelle` — surfaces en projection horizontale (sol + toitures), façades exclues.

- Déploiement : [https://alliages.github.io/cbsh_visuel/](https://alliages.github.io/CBSh_visuel/)
- Version : voir `VERSION` · historique : `CHANGELOG.md` · suite : `ROADMAP.md`
- Licence : GPL-3.0 (`LICENSE`)

> Le CBSh est un indicateur élaboré au sein du GT 7 – Biodiversité, piloté par le CSTB, dans le cadre du projet Cap 2030 (nomenclature de septembre 2024). L'outil en ligne du CSTB est propriétaire : seule la méthode est reprise ici.

## État
Version 0.8.x : outil en construction. Le calcul et la saisie des surfaces (scénarios A et B, noms modifiables) fonctionnent ; les valeurs affichées sont des données d'exemple.

## Lancer en local
Site statique, aucune dépendance. Les données sont chargées par `fetch` : le site doit être servi (pas ouvert directement depuis un fichier). Depuis PowerShell, à la racine du dépôt :

```powershell
python -m http.server 8000
```

puis ouvrir http://localhost:8000/ .

## Tests
```powershell
npm test
```
(Node ≥ 20, aucune dépendance : nomenclature, calcul, cohérence des données.)

## Régénérer la nomenclature
```powershell
pip install openpyxl
python outils/nomenclature_xlsx_vers_json.py chemin\vers\20240902_Nomenclature_CBSh_Diffusion_.xlsx
```

## Régénérer les zones cliquables de l'axonométrie
```powershell
python outils/generer_zones.py
```
(Contours en mètres projetés en isométrie, écrits dans `data/zones.json` ; aucune dépendance. Chaque zone a un type — `saisie`, `info`, `inerte`, `facade` — et, pour `saisie`, une catégorie, la liste de ses lignes et une ancre (repère des étiquettes). Toute ligne du projet doit appartenir à une zone.)

## Arborescence
```
index.html                     page unique (onglets Accueil / Saisie et détails / Aide)
css/style.css                  palette et dimensions en variables, en tête
js/calcul.js                   calcul CBSh (pur, testé)
js/projet_io.js                sauvegarde locale, validation d'un projet importé, export CSV (pur, testé)
js/app.js                      onglets, rendu, saisie, bascule A/B, étiquettes, zones cliquables, grisage, popups, menu Projet ; réglages en tête
data/nomenclature.json         nomenclature de septembre 2024
data/projet_exemple.json       parcelle, scénarios A et B, lignes d'exemple
data/zones.json                zones cliquables de l'axonométrie (généré)
assets/                        illustrations (axo, coupe), logo et favicons, police Inter
outils/                        conversion de la nomenclature, génération des zones, retouche de l'axo (0.8.10, usage unique), tests
```
