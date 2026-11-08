"use strict";
// CBSh — réglages et textes modifiables, regroupés ici pour être retrouvés et relus facilement.
// Aucune logique : seulement des valeurs. Chargé en premier ; les autres scripts les lisent via `CBShConfig`.
// Script classique (pas de module ES) : il se charge aussi quand la page est ouverte depuis un fichier.
// La palette et les dimensions de la mise en page restent dans css/style.css (variables de :root).

(function () {
// ================= Données et langue =================
const CHEMIN_NOMENCLATURE = "data/nomenclature.json";
const CHEMIN_PROJET = "data/projet_exemple.json";
const CHEMIN_ZONES = "data/zones.json";            // zones cliquables de l'axonométrie (généré par outils/generer_zones.py)
const CHEMIN_AXO = "assets/axo.svg";               // illustration (copie en couleur découpée sur la zone sélectionnée)
const LANGUE = "fr-FR";

// ================= Scénarios =================
const CLES_SCENARIOS = ["A", "B"];                 // l'interface gère exactement ces deux scénarios, dans cet ordre
const SCENARIO_BASE = "A";                         // le gain se lit « variante / base »
const SCENARIO_VARIANTE = "B";
const SCENARIO_PAR_DEFAUT = "A";                   // scénario actif au chargement (seul modifiable ; l'autre est en lecture seule)
const NOM_SCENARIO_MAX = 40;                       // longueur maximale du nom d'un scénario
const NOM_COURT_MAX = 14;                          // nom abrégé (sélecteur de la coupe) : tronqué au-delà

// ================= Nomenclature =================
const CAT_TOITURE = "bat";                         // clé de la catégorie « toitures » (popup à épaisseur de substrat et strates)

// ================= Calcul et affichage des résultats =================
const TOLERANCE_SURFACE = 0.05;                    // m² : dépassement toléré de la surface de la parcelle (forcée) par Σ des surfaces
const SURFACE_MAX = 1e9;                           // m² : borne haute d'une surface saisie ou importée (évite les débordements numériques)
const ECHELLE_BARRE_KPI = 250;                     // m² éco correspondant à une barre pleine (cartes de l'Accueil)
const SEUIL_NUMERO_MOSAIQUE = 0.027;               // part de la parcelle à partir de laquelle un bloc de la mosaïque affiche son n°
const SEUIL_M2_MOSAIQUE = 0.087;                   // … et sa surface en m²
const SEUIL_ECART_AFFICHE = 0.05;                  // m² éco : en dessous, l'écart d'une ligne n'est pas affiché

// ================= Plan de l'Accueil (scène en unités de conception, voir .plan-stage dans style.css) =================
// PLAN_LARGEUR / PLAN_HAUTEUR / PLAN_X_AXO / PLAN_LARGEUR_AXO doivent rester cohérents avec style.css (aspect-ratio, --u, .zones)
// et avec le viewBox du calque « liens » de index.html.
const PLAN_LARGEUR = 1370, PLAN_HAUTEUR = 703;      // scène entière : colonne de légendes | axonométrie | colonne de légendes
const PLAN_X_AXO = 300, PLAN_LARGEUR_AXO = 770;     // position et largeur de l'axonométrie dans la scène
const ETIQ_LARGEUR = 280, ETIQ_HAUTEUR = 50;        // étiquette
const ETIQ_ECART_AXO = 20;                          // espace entre l'axonométrie et chaque colonne d'étiquettes
const ETIQ_MAX_PAR_COTE = 8;                        // au-delà, les étiquettes les plus proches du centre passent de l'autre côté
const ETIQ_PAS_MAX = 66;                            // écart maximal entre deux étiquettes (le pas se resserre s'il y en a beaucoup)
const ETIQ_COUDE_DANS_AXO = 20;                     // le coude des traits de repère est à cette distance du bord de l'axonométrie
const ETIQ_DECALAGE_REPERE = 10;                    // décalage vertical entre deux repères d'une même zone
const ETIQ_RAYON_REPERE = 5;                        // rayon du point de repère sur l'illustration
const ETIQ_PASSES_MAX = 50;                         // rangement des étiquettes : nombre maximal de passes d'échanges

// ================= Aide =================
const AIDE_SEUIL_SECTION = 0.3;                     // une section est « courante » quand son haut a passé ce rapport de la hauteur de l'écran

// ================= Sauvegarde, import et export =================
const CLE_STOCKAGE = "cbsh_visuel_projet";          // clé de localStorage
const FORMAT = "cbsh-visuel";                       // marque de l'enveloppe de sauvegarde
const VERSION_FORMAT = 1;                           // à incrémenter si la structure du projet change
const DELAI_SAUVEGARDE_MS = 400;                    // sauvegarde locale différée après la dernière modification (évite une écriture par frappe)
const DELAI_CONFIRMATION_MS = 5000;                 // « Revenir à l'exemple » : délai pour confirmer
const ERREURS_AFFICHEES = 3;                        // import refusé : nombre de motifs cités dans le message
const TEXTE_MAX = 200;                              // longueur maximale d'un texte libre (nom du projet, précisions)
const ZONE_ID_MAX = 60;                             // longueur maximale d'un identifiant de zone lu dans un projet
const LIGNES_MAX = 500;                             // nombre maximal de lignes d'un projet importé
const TAILLE_FICHIER_MAX = 1_000_000;               // octets : au-delà, un fichier importé est refusé
const SEPARATEUR_CSV = ";";                         // Excel en français
const DECIMALES_M2 = 2, DECIMALES_CBSH = 4;         // arrondis du CSV

// ================= Textes =================
const LIBELLE_ECO_AMENAGEABLES = "éco-aménageables";   // texte « m² éco-aménageables » (cartes de l'Accueil)
const TEXTES = {
  // Chargement des données
  erreurFichier: "Page ouverte depuis un fichier : les données ne peuvent pas être chargées. À la racine du dépôt, lancez « python -m http.server 8000 » puis ouvrez http://localhost:8000/.",
  erreurDonnees: "Impossible de charger les données (nomenclature ou projet). Vérifiez le dossier data/ et rechargez la page.",
  // Sauvegarde locale
  sauvegardeFaite: (heure) => `Enregistré dans ce navigateur à ${heure}.`,
  sauvegardeImpossible: "Enregistrement dans ce navigateur impossible : pensez à exporter le projet (.json).",
  restaurationIllisible: "La sauvegarde de ce navigateur n'a pas pu être relue : l'exemple est affiché. Elle sera remplacée à votre prochaine modification.",
  restaurationFaite: (debut, date) => `${debut} (${date}). Menu « Projet » → « Revenir à l'exemple » pour repartir de l'exemple.`,
  debutRestaurationAuto: "Projet restauré depuis la sauvegarde de ce navigateur",
  debutRestaurationImport: "Projet importé",
  // Import
  importIllisible: "Import impossible : le fichier n'a pas pu être lu.",
  importRefuse: (motifs) => `Import refusé : ${motifs}`,
  importAutres: (n) => ` (+ ${n} autres)`,
  importStockage: "Import impossible : ce navigateur n'autorise pas l'enregistrement local.",
};

globalThis.CBShConfig = Object.freeze({
  CHEMIN_NOMENCLATURE, CHEMIN_PROJET, CHEMIN_ZONES, CHEMIN_AXO, LANGUE,
  CLES_SCENARIOS, SCENARIO_BASE, SCENARIO_VARIANTE, SCENARIO_PAR_DEFAUT, NOM_SCENARIO_MAX, NOM_COURT_MAX,
  CAT_TOITURE,
  TOLERANCE_SURFACE, SURFACE_MAX, ECHELLE_BARRE_KPI, SEUIL_NUMERO_MOSAIQUE, SEUIL_M2_MOSAIQUE, SEUIL_ECART_AFFICHE,
  PLAN_LARGEUR, PLAN_HAUTEUR, PLAN_X_AXO, PLAN_LARGEUR_AXO, ETIQ_LARGEUR, ETIQ_HAUTEUR, ETIQ_ECART_AXO, ETIQ_MAX_PAR_COTE,
  ETIQ_PAS_MAX, ETIQ_COUDE_DANS_AXO, ETIQ_DECALAGE_REPERE, ETIQ_RAYON_REPERE, ETIQ_PASSES_MAX,
  AIDE_SEUIL_SECTION,
  CLE_STOCKAGE, FORMAT, VERSION_FORMAT, DELAI_SAUVEGARDE_MS, DELAI_CONFIRMATION_MS, ERREURS_AFFICHEES,
  TEXTE_MAX, ZONE_ID_MAX, LIGNES_MAX, TAILLE_FICHIER_MAX, SEPARATEUR_CSV, DECIMALES_M2, DECIMALES_CBSH,
  LIBELLE_ECO_AMENAGEABLES, TEXTES,
});
})();
