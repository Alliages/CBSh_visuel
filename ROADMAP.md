# ROADMAP — Outil CBSh

Décisions de conception et spécification détaillée : voir `claude/PASSATION_CBSh.md` (documents du projet Claude).

## Fait (conception, maquettes)
- [x] Maquettes Accueil v7 (axo illustré cliquable, popups toiture / eau / façade, grisage hors zone sélectionnée)
- [x] Onglet Saisie et détails : version A « tranche » retenue (coupe de principe entre cartes A et B + tableau 12 lignes)
- [x] Repérage du scénario actif : A contour / B plein, sélecteur nommé, cadre, estompage, popup « Valider dans B », colonne A en lecture seule
- [x] Représentation symbolique : une zone = une grande catégorie (la noue = toute la catégorie « eau »)
- [x] Logo « Pousse » et favicons

## Synthèse (état à la 0.9.1, version test)
**Fonctionne** : calcul CBSh de deux scénarios (A, B) avec comparaison, vérifié sur un cas de référence ; Accueil (axonométrie cliquable, légendes à gauche et à droite, zones à 0 m² grisées, cartes de bascule) ; saisie par popups de zone et par tableau (ajout, suppression des lignes vides) ; noms de scénarios modifiables ; onglet Aide intégré ; sauvegarde automatique dans le navigateur ; export / import JSON ; export CSV pour Excel. Réglages regroupés dans `js/config.js`. 44 tests Node (calcul, cas de référence, données, validation, CSV, configuration).
**Pour la 1.0** (première version annoncée et diffusée) : retours des testeurs de la 0.9.0 ; mise en page mobile (< 900 px) ; source du texte « végétalisation et photovoltaïque ».
**Prochaine version technique (0.9.2)** : découper `app.js` (formats, étiquettes, popups, sauvegarde/import) et tester la logique pure extraite ; alléger l'axo.
**Après** : confort de saisie (confirmations, « Appliquer aussi à A », « Créer B à partir de A »), modes d'affichage de l'axo, 4 états du protocole GT 7.

## Développement (GitHub Pages statique HTML/CSS/JS)
- [x] 0.8.0 squelette : 2 onglets, mise en page, illustrations statiques
- [x] 0.8.2 nomenclature JSON + calcul + tableau éditable
- [x] 0.8.3 correctif : scripts classiques (onglets utilisables hors serveur), message d'erreur de chargement des données
- [x] 0.8.4 surface de la parcelle : somme des surfaces ou valeur forcée (par scénario)
- [x] 0.8.6 rappel de la surface de la parcelle dans les cartes de l'Accueil
- [x] 0.8.8 axo cliquable (calque de zones) + popups par catégorie
- [x] 0.8.9 zones à lignes multiples, surfaces non représentées, ajout de surface, données d'exemple cohérentes
- [x] 0.8.10 axo : retrait du contexte et des cotes, recentrage, oiseaux, cohérence de l'illustration (barre extensive, bande est)
- [x] 0.8.12 bascule de scénario + grisage de la zone sélectionnée + repérage du scénario actif
- [x] 0.8.13 retours 0.8.12 : étiquettes de toutes les lignes, popup 2 colonnes, bascule par les cartes, fonds par scénario, toute ligne dans une zone
- [x] 0.8.14 retours 0.8.13 : légendes à gauche et à droite et cliquables, zones à 0 m² grisées, noms de scénarios modifiables, suppression des lignes vides, parcelle non forcée
- [x] 0.8.15 onglet Aide intégré (sommaire fixe, texte et figure de l'aide fournie)
- [x] 0.8.16 sauvegarde locale (noms de scénarios compris) + export CSV/JSON ; aide refaite (4 catégories, figure SVG aux couleurs de l'app) ; démarrage sur le scénario A
- [x] 0.8.17 corrections de l'audit : zone des lignes créées, import (parcelle forcée typée, surfaces bornées), politique de sécurité de contenu, grisage mémorisé, sauvegarde différée
- [x] 0.8.18 lisibilité : `js/config.js`, variables en tête, lignes longues coupées, outils Python factorisés (`outils/constantes.py`)
- [x] 0.9.0 version test : calcul vérifié sur cas de référence, aide corrigée (Σ ≤ parcelle) et complétée, arrondi commun des m² éco, plus de débordement horizontal dès 1 101 px
- [x] 0.9.1 nouveaux scénarios d'exemple : A = valeurs par défaut (CBSh 0,206), B = variante « best » (0,382), mêmes surfaces par zone ; lignes 13 à 17 (valeurs par défaut)
- [ ] 0.9.2 découpage de `app.js` en scripts (formats, étiquettes, popups, sauvegarde) et tests de la logique pure ; allègement de l'axo

## Idées / évolutions
- [ ] **Vue du ciel à l'échelle** du projet créé dans l'application : plan 2D généré à partir des surfaces saisies (parcelle, emprise bâtie, zones par catégorie), en complément ou à la place de l'axonométrie symbolique (les surfaces restent modifiables, l'axo n'a pas de valeur d'échelle)
- [ ] Une ligne = une seule typologie : changer de typologie sur une même surface oblige à déplacer la surface d'une ligne à l'autre (17 lignes dans l'exemple, dont la moitié à 0 m² dans chaque scénario). Étudier une typologie propre à chaque scénario pour une même ligne (lecture plus simple de l'Accueil et du tableau)
- [x] Aide : mentionner la sauvegarde automatique, l'export CSV / JSON et l'import (menu « Projet »)
- [x] Zone d'une ligne créée : `ligne.zone` prime sur les listes de `zones.json` (0.8.17, `zoneDeLigne` dans `calcul.js`)
- [ ] Projet restauré : proposer de revenir à la version du site quand l'exemple change
- [x] Aide : « la somme doit être égale à la parcelle » (texte d'origine) alors que l'outil accepte Σ ≤ parcelle ; harmoniser le texte ou le contrôle
- [ ] Popups : choix des strates pour les espaces verts (aujourd'hui strates par défaut de la typologie)
- [ ] Axo cliquable sur écran étroit (calque masqué sous 900 px)
- [ ] Arbres de la bande est (axo et coupe) : à retirer ou à garder alors que la ligne 8 est en « pleine terre · 1 strate »
- [ ] Popup : la laisser voir la zone sélectionnée (aujourd'hui centrée, elle masque l'axo grisé)
- [ ] Source du texte « végétalisation et photovoltaïque » (provisoire, non sourcé)
- [ ] Zones du sol cachées par un bâtiment : l'emprise cliquable déborde sur les façades
- [ ] Dimensions de la parcelle (40 × 25 m, dans les données) : plus affichées depuis 0.8.13 ; décider où les montrer
- [ ] Grisage des zones à 0 m² : un arbre qui déborde sur une zone voisine est coupé net au contour de la zone (ex. arbre du jardin sur dalle)
- [x] Mise en page : débordement horizontal de 17 px à 1280 px de large (cartes de chiffres clés de l'Accueil, déjà présent en 0.8.13)
- [ ] Noms de scénarios : choix du nom abrégé de la coupe (aujourd'hui nom tronqué à 14 caractères)
- [ ] Message de confirmation après validation (« … modifiée dans B »)
- [ ] Confirmation si changement de scénario avec une popup ouverte
- [ ] Case « Appliquer aussi à A » dans la popup (décochée par défaut)
- [ ] Marqueur « ≠ A » dans l'axo de B sur les zones qui diffèrent de A
- [ ] Bouton « Créer B à partir de A »
- [ ] Modes d'affichage de l'axo : Catégorie / Strates / Coef. (en plus d'Illustration)
- [ ] Étendre à 4 états du protocole GT7 (état initial, worst, base, best)
- [ ] Exploiter l'espace libre des cartes A/B de l'onglet 2 (ex. mini-mosaïque)
- [ ] Partage multi-utilisateurs (nécessiterait un serveur)
- [ ] Mise en page mobile (< 900 px) : seul un empilement de secours existe en 0.8.0
- [x] Règle d'arrondi commune des m² éco (« +275 » à l'Accueil, « +274,7 » dans le tableau)
- [ ] Textes des illustrations SVG (chargées en `<img>`) : police Inter non appliquée, repli sur la police système
- [ ] Alléger l'axo (963 Ko, 108 Ko compressés) : réduire les décimales et les éléments de texture ; idem `coupe_tranche.svg` (363 Ko)
- [ ] Tests de `app.js` : extraire la logique pure (disposition des étiquettes, formats, choix de typologie des toitures) pour la tester sous Node
- [ ] Rangement des étiquettes mémorisé (il ne dépend pas des surfaces) : ne mettre à jour que les textes à chaque frappe

## Données
- [x] Coefficients par défaut : le repérage vient de l'astérisque de la grille (l'agricole « 0,6* » n'est pas souligné) — confirmé (8 novembre 2026)
- [x] Texte de la mention GT 7 / Cap 2030 : formulation confirmée (8 novembre 2026)
- [x] Nettoyer la nomenclature (20240902_Nomenclature_CBSh_Diffusion_.xlsx) : IDs en #REF!, dernière ligne des toitures sans ID, coefficients mêlant texte (« 0,1* ») et nombres ; repérer les coefficients par défaut (soulignés) → `data/nomenclature.json`
- [x] Contrôle Σ surfaces = surface de la parcelle (surfaces projetées, pas de façades)
