# ROADMAP — Outil CBSh

Décisions de conception et spécification détaillée : voir `claude/PASSATION_CBSh.md` (documents du projet Claude).

## Fait (conception, maquettes)
- [x] Maquettes Accueil v7 (axo illustré cliquable, popups toiture / eau / façade, grisage hors zone sélectionnée)
- [x] Onglet Saisie et détails : version A « tranche » retenue (coupe de principe entre cartes A et B + tableau 12 lignes)
- [x] Repérage du scénario actif : A contour / B plein, sélecteur nommé, cadre, estompage, popup « Valider dans B », colonne A en lecture seule
- [x] Représentation symbolique : une zone = une grande catégorie (la noue = toute la catégorie « eau »)
- [x] Logo « Pousse » et favicons

## Synthèse (état à la 0.8.16)
**Fonctionne** : calcul CBSh de deux scénarios (A, B) avec comparaison ; Accueil (axonométrie cliquable, légendes à gauche et à droite, zones à 0 m² grisées, cartes de bascule) ; saisie par popups de zone et par tableau (ajout, suppression des lignes vides) ; noms de scénarios modifiables ; onglet Aide intégré ; sauvegarde automatique dans le navigateur ; export / import JSON ; export CSV pour Excel. 33 tests Node (calcul, données, validation, CSV).
**Reste pour la 0.9** (proposition, à valider) :
- calcul vérifié sur un cas de référence (point de sortie de la 0.9) ;
- données : coefficients par défaut à confirmer avec le GT 7, texte de la mention GT 7 / Cap 2030, source du texte « végétalisation et photovoltaïque » ;
- cohérence : texte de l'aide (« somme égale à la parcelle ») et contrôle de l'outil (Σ ≤ parcelle) ; rattachement des lignes créées à leur zone (voir Idées) ;
- mise en page : débordement de 17 px à 1 280 px, arrondi commun des m² éco.
**Après la 0.9** : confort de saisie (confirmations, « Appliquer aussi à A », « Créer B à partir de A »), modes d'affichage de l'axo, 4 états du protocole GT 7, mobile, allègement de l'axo.

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
- [x] 0.8.16 sauvegarde locale (noms de scénarios compris) + export CSV/JSON
- [ ] 0.9 outil fonctionnel, calcul vérifié sur cas de référence

## Idées / évolutions
- [ ] Aide : mentionner la sauvegarde automatique, l'export CSV / JSON et l'import (menu « Projet »)
- [ ] Zone d'une ligne créée : si une ligne supprimée libère son numéro (ex. 12) et qu'une nouvelle ligne le reprend dans une autre zone, `zoneDeLigne` cherche d'abord dans les listes de `zones.json` et peut la rattacher à l'ancienne zone ; à vérifier, puis donner la priorité à `ligne.zone`
- [ ] Projet restauré : proposer de revenir à la version du site quand l'exemple change
- [ ] Aide : « la somme doit être égale à la parcelle » (texte d'origine) alors que l'outil accepte Σ ≤ parcelle ; harmoniser le texte ou le contrôle
- [ ] Popups : choix des strates pour les espaces verts (aujourd'hui strates par défaut de la typologie)
- [ ] Axo cliquable sur écran étroit (calque masqué sous 900 px)
- [ ] Arbres de la bande est (axo et coupe) : à retirer ou à garder alors que la ligne 8 est en « pleine terre · 1 strate »
- [ ] Popup : la laisser voir la zone sélectionnée (aujourd'hui centrée, elle masque l'axo grisé)
- [ ] Source du texte « végétalisation et photovoltaïque » (provisoire, non sourcé)
- [ ] Zones du sol cachées par un bâtiment : l'emprise cliquable déborde sur les façades
- [ ] Dimensions de la parcelle (40 × 25 m, dans les données) : plus affichées depuis 0.8.13 ; décider où les montrer
- [ ] Grisage des zones à 0 m² : un arbre qui déborde sur une zone voisine est coupé net au contour de la zone (ex. arbre du jardin sur dalle)
- [ ] Mise en page : débordement horizontal de 17 px à 1280 px de large (cartes de chiffres clés de l'Accueil, déjà présent en 0.8.13)
- [ ] Noms de scénarios : choix du nom abrégé de la coupe (aujourd'hui nom tronqué à 14 caractères)
- [ ] Le scénario affiché au chargement est B (désormais « Projet de base ») : décider si la variante doit s'afficher en premier
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
- [ ] Règle d'arrondi commune des m² éco (« +275 » à l'Accueil, « +274,7 » dans le tableau)
- [ ] Textes des illustrations SVG (chargées en `<img>`) : police Inter non appliquée, repli sur la police système
- [ ] Alléger l'axo (963 Ko, 108 Ko compressés) : réduire les décimales et les éléments de texture

## Données
- [ ] Coefficients par défaut : le repérage vient de l'astérisque de la grille (l'agricole « 0,6* » n'est pas souligné) — à confirmer avec le GT 7
- [ ] Texte de la mention GT 7 / Cap 2030 : vérifier la formulation exigée par la grille
- [x] Nettoyer la nomenclature (20240902_Nomenclature_CBSh_Diffusion_.xlsx) : IDs en #REF!, dernière ligne des toitures sans ID, coefficients mêlant texte (« 0,1* ») et nombres ; repérer les coefficients par défaut (soulignés) → `data/nomenclature.json`
- [x] Contrôle Σ surfaces = surface de la parcelle (surfaces projetées, pas de façades)
