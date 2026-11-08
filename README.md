# CBSh — Biotope de la parcelle

Outil web de calcul et de comparaison du **CBSh** (coefficient de biotope surfacique harmonisé) pour deux scénarios d'un même projet.

`CBSh = Σ (surface × coefficient) / surface de la parcelle` — surfaces en projection horizontale (sol + toitures), façades exclues.

- Déploiement : [https://alliages.github.io/cbsh_visuel/](https://alliages.github.io/cbsh_visuel/)
- Version : voir `VERSION` · historique : `CHANGELOG.md` · suite : `ROADMAP.md`
- Licence : GPL-3.0 (`LICENSE`)

> Le CBSh est un indicateur élaboré au sein du GT 7 – Biodiversité, piloté par le CSTB, dans le cadre du projet Cap 2030 (nomenclature de septembre 2024). L'outil en ligne du CSTB est propriétaire : seule la méthode est reprise ici.

## État
**Version 0.9.0 : version test.** L'outil fonctionne : calcul et comparaison de deux scénarios (A et B, noms modifiables), saisie par le plan illustré ou par le tableau, sauvegarde automatique dans le navigateur, export / import JSON, export CSV pour Excel, aide intégrée. Le calcul est vérifié sur un cas de référence (voir `outils/tests/test_calcul.mjs`). Les valeurs affichées au démarrage sont des données d'exemple. Retours bienvenus avant la première version annoncée (1.0).

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
pip install -r outils/requirements.txt
python outils/nomenclature_xlsx_vers_json.py chemin\vers\20240902_Nomenclature_CBSh_Diffusion_.xlsx
```

## Régénérer les zones cliquables de l'axonométrie
```powershell
python outils/generer_zones.py
```
(Contours en mètres projetés en isométrie, écrits dans `data/zones.json` ; aucune dépendance. Chaque zone a un type — `saisie`, `info`, `inerte`, `facade` — et, pour `saisie`, une catégorie, la liste de ses lignes et une ancre (repère des étiquettes). Toute ligne du projet doit appartenir à une zone.)

## Régénérer la figure de l'aide
```powershell
python outils/generer_image_aide.py
```
(Écrit `assets/aide_cbsh_nomenclature.svg` aux couleurs de l'application ; aucune dépendance.)

## Réglages
Les valeurs que l'on peut vouloir modifier (chemins des données, seuils, dimensions du plan de l'Accueil, longueurs maximales, délais, messages d'état) sont dans `js/config.js`. La palette et les dimensions de la mise en page sont dans les variables de `:root` de `css/style.css`. Côté Python : `outils/constantes.py`.

## Arborescence
```
index.html                     page unique (onglets Accueil / Saisie et détails / Aide)
css/style.css                  palette et dimensions en variables, en tête
js/config.js                   réglages et textes modifiables (chemins, seuils, dimensions du plan, messages) : à lire en premier
js/calcul.js                   calcul CBSh (pur, testé)
js/projet_io.js                sauvegarde locale, validation d'un projet importé, export CSV (pur, testé)
js/app.js                      onglets, rendu, saisie, bascule A/B, étiquettes, zones cliquables, grisage, popups, menu Projet
data/nomenclature.json         nomenclature de septembre 2024
data/projet_exemple.json       parcelle, scénarios A et B, lignes d'exemple
data/zones.json                zones cliquables de l'axonométrie (généré)
assets/                        illustrations (axo, coupe), logo et favicons, police Inter
outils/                        conversion de la nomenclature, génération des zones et de la figure d'aide, constantes.py (chemins, palette, projection), tests
```
