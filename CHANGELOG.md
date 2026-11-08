# Changelog — Outil CBSh

## 0.8.16 — sauvegarde locale, export / import JSON, export CSV
- **Sauvegarde automatique dans le navigateur** (localStorage) : surfaces, lignes ajoutées ou supprimées, noms de scénarios, surface de parcelle forcée, façade végétalisée et scénario affiché sont conservés au rechargement. Rien n'est écrit avant la première modification (l'exemple, mis à jour d'une version à l'autre, n'est pas figé à la première visite). Un message en haut de page indique qu'un projet a été restauré (date et heure), avec un bouton « Fermer ».
- **Menu « Projet »** dans l'en-tête (à côté d'« Exporter .csv ») : état de l'enregistrement, « Exporter le projet (.json) », « Importer un projet (.json)… », « Revenir à l'exemple » (deux clics : le premier demande confirmation, annulée par Échap, la fermeture du menu ou 5 s).
- **Export JSON** : le projet tel qu'il est dans `data/projet_exemple.json` (même structure, relisible à l'import). Nom `cbsh_<nom du projet>_<date>.json`.
- **Import JSON** : fichier de projet (ou enveloppe de sauvegarde). Contrôle complet avant acceptation : scénarios A et B, parcelle, façade, typologies connues, strates compatibles, surfaces ≥ 0, numéros uniques, Σ ≤ parcelle forcée, chaque ligne rattachée à une zone de l'illustration. Les champs inconnus sont ignorés, les textes tronqués (nom de scénario : 40 caractères). Un fichier refusé n'écrase rien ; le message cite les trois premiers motifs. Un projet accepté est enregistré, puis la page est rechargée.
- **Export CSV** (bouton « Exporter .csv », jusque-là désactivé) : une ligne par surface (n°, catégorie, typologie, précision, strates, coefficient, m² et m² éco de A et de B, écart B − A), puis une synthèse (surface saisie, parcelle, m² éco, CBSh, écart) et la façade (hors CBSh). Prêt pour Excel en français : séparateur « ; », virgule décimale, UTF-8 avec BOM, fins de ligne CRLF. Un texte commençant par = + - @ est neutralisé (apostrophe) pour ne pas être lu comme formule.
- **Sauvegarde illisible** (JSON corrompu, version de format inconnue, projet invalide) : ignorée, l'exemple est affiché, un message l'indique ; elle est remplacée à la prochaine modification.
- **Mise en page** : sous 1 400 px, espaces et marges des onglets et des boutons de l'en-tête réduits (le sous-titre reste sur une ligne à 1 280 px) ; en-tête empilé (< 1 100 px) : le menu s'ouvre vers la droite.
- **Technique** : nouveau fichier `js/projet_io.js` (sans accès au DOM : enveloppe de sauvegarde, validation, CSV, noms de fichiers), chargé entre `calcul.js` et `app.js`. Réglages en tête de chaque fichier. Tests Node : 33 (10 nouveaux : aller-retour, refus motivés, nettoyage, CSV, noms de fichiers, `index.html`).
- **Limites** : la sauvegarde est propre à un navigateur et à une adresse (pas de partage entre appareils : passer par l'export JSON) ; elle est perdue si l'utilisateur vide les données du site ; en navigation privée stricte, l'état du menu signale que l'enregistrement est impossible. Un projet restauré ne suit plus les mises à jour de l'exemple (« Revenir à l'exemple »).
- **Compléments (même version)** :
  - **Démarrage sur le scénario A** : `SCENARIO_PAR_DEFAUT` passe de « B » à « A » (état initial de `index.html` aligné : cartes, sélecteurs, filigrane, fond). Une sauvegarde locale existante garde son scénario affiché.
  - **Aide** : rubriques renommées (« Comment se calcule-t-il ? », « Les 4 catégories », « Utiliser l'outil ») ; la section des catégories reçoit 4 cartes aux couleurs de l'application (toitures, voiries, espaces verts, masses d'eau) avec fourchette de coefficients et coefficient par défaut.
  - **Figure de la nomenclature** : `assets/aide_cbsh_nomenclature.svg` (palette du projet, pictogrammes dessinés pour l'outil) remplace la JPEG ; générée par `outils/generer_image_aide.py`.
  - Tests Node : 34 (cartes de catégories, scénario par défaut ; image SVG).

## 0.8.15 — onglet Aide intégré
- **Troisième onglet « Aide »** (après Accueil et Saisie) : page à sommaire fixe à gauche (6 rubriques : définition, calcul, nomenclature, règles de saisie, utilisation de l'outil, pour aller plus loin), sections en cartes à droite. Un clic dans le sommaire fait défiler jusqu'à la section ; la rubrique courante est repérée (la dernière en bas de page). Sous 1 100 px, le sommaire passe au-dessus du contenu. Lien profond `#aide` ; `aria-current` sur la rubrique courante.
- **Contenu** : textes de l'aide fournie (`aide.html`), reprise de la formule, des trois exemples de coefficients et de l'exemple 410 m² / 1 000 m² ; figure `assets/aide_cbsh_nomenclature.jpg` (chargement différé) ; lien vers le livrable GT 7 phase 1.
- **Adaptations du texte d'origine** : « A (projet de base) et B (variante) » rendu neutre (les noms ont été échangés en 0.8.14 et sont modifiables) ; ajout de deux conseils (renommer un scénario, ✕ de suppression d'une ligne vide).
- **À trancher** : l'aide d'origine écrit que la somme des surfaces « doit être égale » à la parcelle ; l'outil accepte Σ ≤ parcelle (parcelle par défaut = Σ). Texte laissé tel quel pour validation.
- `aide.html` autonome non repris (remplacé par l'onglet).
- Tests Node : 23 (présence de l'image, onglet et panneau, équilibre des `<div>`, panneau Saisie refermé avant l'Aide, 6 cibles du sommaire, liste `ONGLETS`).

## 0.8.14 — retours sur la 0.8.13 : légendes des deux côtés et cliquables, zones vides grisées, noms modifiables, suppression des lignes vides
**Accueil**
- **Légendes à gauche et à droite** de l'illustration : scène élargie de 1 082 à 1 370 unités (colonne 280 + espace 20 + axo 770 + espace 20 + colonne 280 ; l'axo garde sa taille). Une légende va du côté de sa zone (moitié gauche ou droite de la scène, 8 au plus par côté), rangée dans l'ordre qui limite les croisements de traits dans chaque colonne. Sous 900 px, empilement sous l'illustration comme avant.
- **Légendes cliquables** (boutons) : un clic ouvre la popup de la zone, le champ de surface de la ligne cliquée a le focus ; à la fermeture, le focus revient à la légende. Le survol (ou le focus) d'une légende surligne sa zone dans l'axo, et réciproquement.
- **Zones à 0 m² grisées** : une zone de saisie dont toutes les lignes valent 0 m² dans le scénario affiché est désaturée (copie de l'axo découpée sur son contour, sur le fond du scénario). Elle reste cliquable. Les zones d'information, la venelle et la façade ne sont jamais grisées. Limite : un arbre qui déborde sur la zone voisine est coupé net au contour.
- **Cartes de résultat** (Accueil et Saisie) : la carte du scénario actif prend la teinte du fond de l'axo (bronze clair pour A, céladon clair pour B) ; contour noir conservé.
- **Panneaux photovoltaïques** : la zone d'information couvre toute la largeur de la barre (x 6,35 → 11 m, y 1,35 → 12,65 m) ; la zone de toiture extensive de la barre ne la comprend plus (cliquer sur les panneaux n'ouvre plus sa saisie). Le repère de la ligne 2 pointe sur les panneaux.
- **Pleine terre (bande ouest)** : les repères des lignes 9 et 10 pointent sur la pointe basse de la bande (visibles, plus masqués par l'arbre et la butte), décalés de 2 m.
- **Noms de scénarios modifiables** : clic sur le nom dans une carte (Accueil ou Saisie) → champ de saisie sur place (Entrée ou sortie du champ valide, Échap annule, 40 caractères, nom vide refusé). Le nom se propage aux sélecteurs, à la coupe (nom tronqué à 14 caractères) et aux étiquettes d'accessibilité ; les lettres A et B restent fixes. Le nom n'est pas conservé au rechargement (sauvegarde locale prévue en 0.8.16).
**Suppression de lignes**
- **Popup** : le ✕ met la ligne à 0 m² dans le scénario affiché ; à la validation, une ligne qui vaut 0 m² dans A et dans B est supprimée (tableau, légende, calcul), sans renumérotation. Sinon elle reste, et un message indique où elle subsiste. Infobulle du ✕ explicite. Ce n'était pas un défaut de code : l'ancien ✕ ne retirait jamais la ligne.
- **Onglet Saisie et détails** : nouvelle colonne étroite à droite de « Écart » ; un ✕ y apparaît sur les lignes vides dans les deux scénarios (il suit la saisie) et supprime la ligne immédiatement, sans confirmation.
**Données et coupe**
- **Données d'exemple** : surfaces de A et B échangées, noms échangés (A = « Variante « best » », B = « Projet de base »). Le gain B − A est donc négatif (−0,24). Le scénario affiché au chargement reste B.
- **Surface de parcelle non forcée** : `surface_parcelle` passe de 1000 à `null` pour A et B ; le dénominateur est la somme des surfaces (966 m²). Les CBSh changent donc légèrement : variante 0,382 (avant : 0,369 sur 1 000 m²), base 0,141 (avant : 0,136). Le champ « Surface de la parcelle » reste vide, avec la somme en grisé ; la parcelle de 1 000 m² (40 × 25 m) reste dans les données comme référence.
- **Coupe de principe** : une seule voiture dans le parking souterrain (la verte, recentrée dans la salle ; elle dépassait dans la noue) ; la voiture orange est retirée de `coupe_tranche.svg`.
**Technique**
- `outils/generer_zones.py` : zone des panneaux, repères propres des lignes 9, 10 et 2 (`ancres_m`, avec altitude facultative) ; `zones.json` regénéré.
- `app.js` : calques `calque-gris` et `calque-focus` sous les zones ; `supprimerLigne`, `ligneVide` ; étiquettes en deux colonnes (`ETIQ_*` en tête de fichier).
- Tests Node : 22 (parcelle `null`, valeurs de A et B échangées, ligne vide dans les deux scénarios, panneaux et repères).
- Limites connues : légendes plus étroites que la scène sous 1 448 px de large (réduction proportionnelle, texte plus petit) ; débordement horizontal de 17 px à 1 280 px dû aux cartes de chiffres clés (déjà présent en 0.8.13).

## 0.8.13 — retours sur la 0.8.12 : étiquettes de toutes les lignes, popup 2 colonnes, bascule par les cartes
**Accueil**
- **Étiquettes** : une étiquette (n°, intitulé, surface × coef., m² éco) pour **chaque** ligne rattachée à une zone (12), générée par le code (plus de liste écrite à la main). Rangées dans la colonne de gauche, dans l'ordre qui limite les croisements de traits ; repères calculés au centre de la zone (`ancre` dans `zones.json`). Une ligne sans surface dans le scénario actif reste affichée, atténuée (0 m²). Corrige l'absence de coefficient sur la bande plantée (ligne 8) et les légendes manquantes.
- **Toute ligne appartient à une zone** : la bande « Surfaces non représentées » est supprimée. La ligne 9 (A seulement) rejoint la zone « Pleine terre » ; « + Ajouter une surface » demande la catégorie, puis la zone (liste ; directement si la catégorie n'en a qu'une) et ouvre la popup de cette zone avec une nouvelle ligne. Une ligne créée garde sa zone, apparaît dans l'axo (étiquette) et dans le tableau.
- **Zone « Toiture sédum de la barre » supprimée** : la ligne 2 (sédum) rejoint « Toiture extensive de la barre » (lignes 2 et 3) dont le contour reprend l'emprise de l'ancienne zone. La zone « Panneaux photovoltaïques » reste informative, inchangée.
- **Venelle** : zone totalement inerte (aucun événement souris, plus d'infobulle).
- **Cartes de résultat A et B** : un clic bascule le scénario (bouton transparent sur toute la carte, accessible au clavier). Carte inactive : curseur main, pleine opacité, liseré doré et pastille « Voir ce scénario » au survol.
- **Fond de l'axo et de la coupe** selon le scénario actif : bronze clair (A, `#f5e8e3`), céladon clair (B, `#e6f3ec`). Le rectangle de fond a été retiré des deux SVG (transparents) ; le fond vient du CSS (`--fond-scenario`, `body[data-scenario]`). La copie en couleur de la zone sélectionnée garde ce fond.
- Pastille « Parcelle 40 × 25 m · 1 000 m² » de l'en-tête supprimée (la surface reste dans les cartes et dans le tableau).
**Popup de zone**
- **2 colonnes** (largeur 900 px) : à gauche le choix (épaisseur, strates, « Je ne sais pas » ; liste de typologies pour les autres catégories), à droite la surface, le rappel de l'autre scénario et le résultat. Titre et zone sur une ligne. Une colonne sous 760 px.
- Bouton « Supprimer » remplacé par une pastille ✕ (24 px) ; la ligne retirée reste rétablissable avant « Valider ».
**Onglet Saisie et détails**
- Cartes A et B cliquables (bascule), comme à l'Accueil.
- Survol (et focus clavier) d'une ligne du tableau : fond céladon et trait doré à gauche.
- Le cadre du scénario actif (et le voile de l'autre) couvre tout le tableau, de l'en-tête à la ligne « Façade » (total, parcelle et façade compris).
**Technique**
- `verifierDonnees` signale toute ligne sans zone. Tests Node : 20 (zone sédum supprimée, ligne 2 → barre, ligne 9 → pleine terre, ligne sans zone, ancres).
- `outils/generer_zones.py` : zone `pleine-terre` = lignes 9 et 10, zone barre = lignes 2 et 3, calcul des ancres (`ancre`, `ancres` par ligne).
- Fonds retirés de `axo.svg` et `coupe_tranche.svg` par suppression du rectangle `#f6f3ec` (opération manuelle, hors `retoucher_axo.py` qui reste à usage unique sur l'axo 0.8.9).
- Limites connues : traits de repère longs vers les zones à droite de l'axo ; un nom d'étiquette trop long est tronqué (texte complet en infobulle) ; sous 900 px les étiquettes s'empilent sous l'illustration.

## 0.8.12 — bascule de scénario et grisage de la zone sélectionnée
- **Bascule A / B** : les deux sélecteurs nommés (plan de l'Accueil et coupe de l'onglet Saisie) sont actifs et synchronisés ; le scénario choisi devient le seul modifiable (B par défaut au chargement).
- **Repérage du scénario actif**, partout : cadre épais sur sa carte de chiffres clés (Accueil et Saisie), l'autre carte estompée ; filigrane du plan à sa lettre ; mosaïque (ligne inactive estompée) ; étiquettes du plan sur ses valeurs ; popup avec bandeau « Scénario X · nom », bouton « Valider dans X » et rappel « Scénario Y (lecture seule) : … m² ».
- **Tableau** : les colonnes A et B gardent leur place (A à gauche, B à droite) ; les champs de saisie passent dans la colonne du scénario actif, l'autre est voilée et marquée « lecture seule » ; cadre sur la colonne active. Le champ « Surface de la parcelle » suit : la surface forcée de A devient modifiable quand A est actif. L'écart et le gain restent « B − A ».
- **Grisage** : à l'ouverture d'une popup de zone, l'illustration est grisée ; la zone sélectionnée reste en couleur (copie de l'axo découpée sur son contour, dans le calque de zones) avec son contour doré pointillé ; retrait à la fermeture (Valider, Annuler, Échap). Pas de grisage pour les surfaces non représentées (aucun contour).
- Corrections d'affichage : liste déroulante de la popup contenue dans sa largeur ; badge « défaut » placé à gauche du coefficient (il débordait sur la colonne A).
- Limites connues : en A, les étiquettes du plan (lignes 7, 10, 11, propres à B) affichent 0 m² ; la popup, centrée, masque une grande part de l'illustration grisée.
- Le calcul (`calcul.js`) est inchangé ; tests Node : 18.

## 0.8.10 — axonométrie recentrée et illustration cohérente
- **Axonométrie** : retrait du contexte (immeubles et arbres voisins), des lignes grises et des cotes « 40 m » / « 25 m » (la parcelle 40 × 25 m reste dans la pastille de l'en-tête) ; contenu recentré (seul le `viewBox` change : `290 78 920 840`, taille inchangée) ; `axo.svg` passe de 963 à 942 Ko.
- **Cohérence avec les données** : toiture de la barre sans arbustes ni arbres (couverture herbacée / sédum seule, ligne 3 = extensive 9 à 12 cm herbacées) ; sol de la bande est en herbe (pleine terre, ligne 8) au lieu de pavés enherbés ; venelle dallée conservée ; local technique, passerelle bois, panneaux et personnages inchangés.
- **Oiseaux** : les quatre sont conservés et rapprochés de la toiture de la barre.
- **Coupe de principe** : arbustes de la toiture n° 3 retirés (herbacées seules).
- **Répercussion** : nouveau `viewBox` dans `data/zones.json` (lu désormais dans l'axo par `outils/generer_zones.py`) et dans `index.html` ; traits de repère étiquettes → illustration décalés de 15,1 unités vers le haut.
- Nouvel outil `outils/retoucher_axo.py` (bibliothèque standard) : applique ces retouches une seule fois et refuse de s'exécuter si l'axo n'est pas celui de 0.8.9 ou s'il est déjà retouché.
- Limite connue : les deux arbres de la bande est (illustration et coupe) subsistent alors que la ligne 8 est en « pleine terre · 1 strate » (voir ROADMAP).

## 0.8.9 — zones à lignes multiples, surfaces non représentées, données d'exemple cohérentes
- **Modèle zone ↔ lignes** : une zone de l'axonométrie porte une ou plusieurs lignes de sa catégorie (`zones.json` : `type`, `categorie`, `lignes`). La popup liste les lignes de la zone (typologie + surface), avec **« + Ajouter une typologie »** (nouvelle ligne de la même catégorie, rattachée à la zone) et **« Supprimer »** par ligne (surface remise à 0 dans B ; une ligne créée par la popup est retirée) ; rien n'est appliqué avant « Valider dans B ».
- **Surfaces non représentées** : bande sous l'illustration listant les lignes sans zone (ex. ligne 9), ouvrant la même popup ; bouton « + Autre surface ». Le bouton **« + Ajouter une surface »** du tableau est activé (choix de la catégorie, puis popup). L'illustration reste symbolique et ne montre pas toutes les lignes.
- **Types de zones** : `saisie`, `info` (popup d'information sans saisie), `inerte` (non sélectionnable), `facade`.
  - Venelle dallée : ni survol ni focus, infobulle « non comptée dans le CBSh » ; hors tableau et hors calcul.
  - Panneaux photovoltaïques : zone d'information (la végétalisation et le photovoltaïque se cumulent ; texte provisoire, sans source), pas une ligne du tableau.
  - Terrasse bois du plot : zone d'information (assimilée à une toiture classique, comptée dans la ligne 1, modifiable depuis la zone « Toiture bitume »).
- **Données d'exemple** : parcelle forcée à 1 000 m² dans A et B (venelle de 34 m² non comptée) ; ligne 3 = toiture extensive + 9 à 12 cm herbacées (zone `toit-extensive-barre`, ancienne `toit-intensive-barre`) ; ligne 5 : A 306 / B 72 ; ligne 8 = pleine terre 1 strate (coef. 0,7). Nouvelles valeurs : **A 0,136 ; B 0,3687 ; gain +0,23 (+233 m² éco)**.
- `verifierDonnees(nomenclature, projet, zones)` contrôle aussi les zones (lignes existantes, catégorie cohérente, une ligne dans une seule zone). Tests : 18.
- Infobulles « disponible en… » : bascule de scénario et grisage → 0.8.12, export → 0.8.14.

## 0.8.8 — axonométrie cliquable et popups de saisie
- Calque de **14 zones cliquables** sur l'axonométrie (`data/zones.json`, généré par `outils/generer_zones.py` d'après la projection isométrique de l'illustration) : survol et focus clavier (Tab, Entrée / Espace), contour doré pointillé sur les zones de la ligne en cours d'édition.
- **Popup de saisie** (scénario B ; bandeau « Scénario B · Variante « best » », A en lecture seule) ; rien n'est appliqué avant « Valider dans B » ; « Supprimer » remet la surface à 0 ; Échap, clic sur le fond ou « Annuler » ferment sans rien changer :
  - Toitures : épaisseur de substrat + strates (arbustes et arbres : ≥ 20 % de la surface ; sédum réservé à l'extensif −), « Je ne sais pas » = coefficient par défaut, combinaison absente de la nomenclature signalée ;
  - Masses d'eau, Voiries, Espaces verts au sol : liste des typologies de la catégorie avec coefficient ;
  - Façade végétalisée : popup informative (non comptabilisée), surface indicative et case « Mentionner dans le rapport » appliquées au tableau.
- Une popup modifie la **typologie et la surface de la ligne entière** du tableau (ex. bitume de la barre et terrasse du plot = ligne 1) ; le tableau, les cartes, la mosaïque, le gain et les étiquettes de l'axo se recalculent.
- Limites connues : écran étroit (< 900 px), calque masqué ; pour les espaces verts, les strates affichées dans le tableau sont celles par défaut de la typologie choisie ; grisage du reste de l'illustration prévu en 0.8.10.
- Correction : le tableau est regénéré à chaque modification de typologie (`rendreTableau`).
- Tests : cohérence de `zones.json` (15 tests).

## 0.8.6 — surface de la parcelle sur l'Accueil
- Les cartes des scénarios A et B de l'Accueil rappellent la surface de la parcelle sous le CBSh (« Parcelle · 1 000 m² (Σ des surfaces) » ou « (forcée) »), comme dans l'onglet Saisie et détails.
- Étapes suivantes de la ROADMAP décalées d'un cran (axo cliquable 0.8.8, bascule 0.8.10, export 0.8.12) ; infobulles « disponible en… » alignées.

## 0.8.4 — surface de la parcelle : somme des surfaces ou valeur forcée
- La surface de la parcelle (dénominateur du CBSh) n'est plus une constante : par défaut elle vaut la **somme des surfaces** du scénario ; on peut la **forcer** à une valeur supérieure quand tout n'est pas compté (la part non comptée vaut 0 m² éco).
- Deux valeurs distinctes, une par scénario (`scenarios[].surface_parcelle` dans les données, `null` = somme) : A en lecture seule, B saisissable.
- Onglet Saisie et détails : nouvelle ligne « Surface de la parcelle » sous le Total (pastille « = Σ » ou « forcée » ; le champ propose la somme en grisé) ; rappel « Parcelle · … m² » sous « CBSh · … m² éco » dans la carte de chaque scénario ; message de contrôle adapté (part non comptée, ou alerte si Σ dépasse la parcelle forcée).
- Valeur forcée ≤ 0 ou illisible refusée ; mosaïque de l'Accueil calée sur la surface de parcelle de chaque scénario.
- `calculerScenario(lignes, typologies, scénario, surfaceForcée)` : renvoie en plus `forcee` et `nonComptee` ; plus de division par zéro quand rien n'est saisi (CBSh = 0). Tests : 14.
- Les valeurs d'exemple ne changent pas (A = 0,136 ; B = 0,4107).

## 0.8.3 — correctif : onglets et valeurs à 0
- Cause : `js/app.js` et `js/calcul.js` étaient des modules ES, que le navigateur refuse de charger hors serveur (`file://`) ou si le serveur envoie un mauvais type MIME pour `.js` (cas fréquent avec `python -m http.server` sous Windows). Résultat : aucun onglet actif et aucune valeur.
- Les deux fichiers sont maintenant des scripts classiques (`calcul.js` expose `CBShCalcul`, chargé avant `app.js`) : les onglets fonctionnent dans tous les cas.
- Si les données (`fetch` de `data/*.json`) ne peuvent pas être chargées, un message explicite s'affiche (consigne `python -m http.server` en `file://`).
- `package.json` : suppression de `"type": "module"` ; tests adaptés (10/10).

## 0.8.2 — nomenclature JSON, calcul, tableau éditable
- Nomenclature de septembre 2024 convertie en `data/nomenclature.json` (41 typologies, coefficients et valeurs par défaut lus dans la grille ; identifiants attribués dans l'ordre de la grille, ses `#REF!` étant cassés). Script de conversion : `outils/nomenclature_xlsx_vers_json.py`.
- Projet d'exemple en `data/projet_exemple.json` (parcelle, scénarios A et B, 12 lignes, façade végétalisée hors CBSh).
- Calcul pur dans `js/calcul.js` : CBSh = Σ (surface × coef.) / surface de la parcelle, par scénario et par catégorie, gain B / A, contrôle Σ surfaces = surface de la parcelle, règles de strates, contrôle de cohérence des données.
- Tests : `npm test` (Node ≥ 20, aucune dépendance) — nomenclature, projet d'exemple (A 0,136 ; B 0,4107), modification de surface, cas limites.
- Tableau d'occupation des sols généré depuis les données ; **surfaces du scénario B modifiables** (A en lecture seule). Cartes, gain, étiquettes de l'axo, mosaïque et totaux se recalculent à la saisie ; alerte si Σ surfaces ≠ surface de la parcelle ; valeur vide = 0, valeur négative refusée.
- Textes : titre « Capacité d’accueil biodiversité d’un projet », sous-titre « Calcul du Coefficient de Biotope Surfacique harmonisé », pied de page réduit à la mention GT 7 / Cap 2030 avec le seul lien GT 7 Biodiversité, « Outil CBSh » remplacé par « CBSh visuel ».
- Libellé « éco-aménageables » en variable (`LIBELLE_ECO_AMENAGEABLES`, en tête de `js/app.js`).
- Le site charge ses données par `fetch` : il doit être servi (GitHub Pages ou `python -m http.server`), pas ouvert en `file://`.
- `package.json` minimal (script de test).

## 0.8.0 — squelette statique
- Squelette HTML/CSS/JS statique (GitHub Pages, sans dépendance, sans appel externe).
- Deux onglets fonctionnels : **Accueil** et **Saisie et détails** (navigation clavier, lien direct `#saisie`).
- Accueil : cartes A / gain / B, plan de la parcelle (axonométrie illustrée, 3 étiquettes reliées), mosaïque « de la surface à la valeur écologique ».
- Saisie et détails : cartes A / B, coupe de principe « tranche », tableau d'occupation des sols (12 lignes, total, façade végétalisée hors CBSh).
- Données d'exemple en dur (A = 0,14 ; B = 0,41 ; gain +0,27), remplacées en 0.8.2. Sélecteurs, champs de saisie et export présents mais non actifs.
- Police Inter auto-hébergée (sous-ensemble latin, licence OFL dans `assets/fonts/`).
- Mention GT 7 / Cap 2030 en pied de page.
- Axonométrie recadrée (viewBox) sur la zone utile ; couleurs de texte secondaires assombries pour le contraste (≥ 4,5:1).
