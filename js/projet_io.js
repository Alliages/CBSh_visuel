"use strict";
// CBSh — sauvegarde et échanges de projet (aucun accès au DOM ni au stockage : testable sous Node avec `npm test`).
//  - enveloppe de sauvegarde locale (sérialiser / lireSauvegarde) ;
//  - contrôle et nettoyage d'un projet lu (sauvegarde du navigateur ou fichier .json importé) ;
//  - export CSV prêt pour Excel en français (séparateur « ; », virgule décimale).
// Script classique (pas de module ES) : il se charge aussi quand la page est ouverte depuis un fichier.

(function () {
// ================= Réglages =================
const CLE_STOCKAGE = "cbsh_visuel_projet";          // clé de localStorage
const FORMAT = "cbsh-visuel";                       // marque de l'enveloppe de sauvegarde
const VERSION_FORMAT = 1;                           // à incrémenter si la structure du projet change
const CLES_SCENARIOS = ["A", "B"];                  // l'interface gère exactement ces deux scénarios
const NOM_SCENARIO_MAX = 40;                        // longueur maximale du nom d'un scénario
const TEXTE_MAX = 200;                              // longueur maximale d'un texte libre (nom du projet, précisions)
const LIGNES_MAX = 500;                             // nombre maximal de lignes d'un projet importé
const TAILLE_FICHIER_MAX = 1_000_000;               // octets : au-delà, un fichier importé est refusé
const SEPARATEUR_CSV = ";";                         // Excel en français
const DECIMALES_M2 = 2, DECIMALES_CBSH = 4;         // arrondis du CSV

const { verifierDonnees, zoneDeLigne, SURFACE_MAX } = globalThis.CBShCalcul;

// ================= Sauvegarde locale =================
/** Enveloppe enregistrée dans le navigateur : le projet, le scénario affiché et l'origine (« auto » ou « import »). */
function serialiser(projet, scenarioActif, origine = "auto", date = new Date()) {
  return JSON.stringify({ format: FORMAT, version: VERSION_FORMAT, enregistre: date.toISOString(), origine, scenarioActif, projet });
}

/** Lit une enveloppe : { projet, scenarioActif, enregistre, origine } ou null si le texte n'est pas une enveloppe lisible. */
function lireSauvegarde(texte) {
  let o;
  try { o = JSON.parse(texte); } catch { return null; }
  if (!o || o.format !== FORMAT || o.version !== VERSION_FORMAT || typeof o.projet !== "object") return null;
  return { projet: o.projet, scenarioActif: o.scenarioActif, enregistre: o.enregistre, origine: o.origine === "import" ? "import" : "auto" };
}

// ================= Contrôle d'un projet lu =================
const texteCourt = (t, max) => String(t).trim().slice(0, max);
const estNombre = (x) => typeof x === "number" && Number.isFinite(x);
const estEntier = (x) => Number.isInteger(x) && x > 0;

/**
 * Contrôle un projet venu de l'extérieur et en renvoie une copie nettoyée (seuls les champs connus sont gardés).
 * @returns {{projet: ?Object, erreurs: string[]}} `projet` vaut null s'il y a des erreurs.
 */
function validerProjet(brut, nomenclature, zonesDonnees) {
  const erreurs = [];
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return { projet: null, erreurs: ["Le fichier ne contient pas un projet CBSh."] };
  const { parcelle, scenarios, facade_vegetalisee: facade, lignes } = brut;

  if (!parcelle || ![parcelle.largeur, parcelle.profondeur, parcelle.surface].every(estNombre)) erreurs.push("Parcelle : largeur, profondeur et surface attendues.");
  if (!Array.isArray(scenarios) || scenarios.length !== CLES_SCENARIOS.length || !CLES_SCENARIOS.every((c, i) => scenarios[i]?.cle === c)) {
    erreurs.push(`Scénarios : ${CLES_SCENARIOS.join(" et ")} attendus, dans cet ordre.`);
  }
  if (!facade || !estNombre(facade.surface) || facade.surface < 0 || facade.surface > SURFACE_MAX) erreurs.push("Façade végétalisée : surface attendue.");
  if (Array.isArray(scenarios)) {                       // surface de parcelle forcée : nombre > 0 (ou absente = somme des surfaces)
    for (const s of scenarios) {
      const f = s?.surface_parcelle;
      if (f != null && !(estNombre(f) && f > 0 && f <= SURFACE_MAX)) erreurs.push(`Scénario ${s.cle} : surface de parcelle forcée invalide.`);
    }
  }
  if (!Array.isArray(lignes)) erreurs.push("Lignes : liste attendue.");
  else if (lignes.length > LIGNES_MAX) erreurs.push(`Lignes : ${LIGNES_MAX} au plus.`);
  if (erreurs.length) return { projet: null, erreurs };

  const propre = {
    nom: texteCourt(brut.nom ?? "", TEXTE_MAX),
    parcelle: { largeur: parcelle.largeur, profondeur: parcelle.profondeur, surface: parcelle.surface },
    scenarios: scenarios.map((s) => ({
      cle: s.cle,
      nom: texteCourt(s.nom ?? "", NOM_SCENARIO_MAX) || `Scénario ${s.cle}`,
      surface_parcelle: s.surface_parcelle ?? null,
    })),
    facade_vegetalisee: { surface: facade.surface, precision: texteCourt(facade.precision ?? "", TEXTE_MAX), mentionnee: facade.mentionnee === true },
    lignes: [],
  };
  for (const l of lignes) {
    if (!l || !estEntier(l.n) || !estEntier(l.typologie) || typeof l.surfaces !== "object" || l.surfaces === null) { erreurs.push("Ligne illisible (numéro, typologie ou surfaces)."); continue; }
    const ligne = {
      n: l.n,
      typologie: l.typologie,
      precision: l.precision == null ? null : texteCourt(l.precision, TEXTE_MAX),
      strates: l.strates === null || l.strates === undefined ? null : l.strates,
      surfaces: Object.fromEntries(CLES_SCENARIOS.map((c) => [c, l.surfaces[c]])),
    };
    if (typeof l.zone === "string") ligne.zone = l.zone.slice(0, 60);
    if (l.creee === true) ligne.creee = true;
    propre.lignes.push(ligne);
  }
  if (erreurs.length) return { projet: null, erreurs };

  // Mêmes contrôles que pour les données d'exemple (typologies, strates, surfaces, parcelle forcée) — sans les zones, voir plus bas
  erreurs.push(...verifierDonnees(nomenclature, propre));
  // Toute ligne doit appartenir à une zone de l'illustration (listée dans zones.json, ou mémorisée sur la ligne). Les listes de
  // zones.json ne sont pas comparées au projet : une ligne supprimée y reste citée.
  for (const l of propre.lignes) {
    if (!zoneDeLigne(l, zonesDonnees)) erreurs.push(`Ligne ${l.n} : aucune zone de l'illustration.`);
  }
  return erreurs.length ? { projet: null, erreurs } : { projet: propre, erreurs: [] };
}

/** Lit le texte d'un fichier .json importé (projet seul, ou enveloppe de sauvegarde) ; renvoie { projet, erreurs }. */
function lireFichierProjet(texte, nomenclature, zonesDonnees) {
  if (texte.length > TAILLE_FICHIER_MAX) return { projet: null, erreurs: ["Fichier trop volumineux pour un projet CBSh."] };
  let o;
  try { o = JSON.parse(texte); } catch { return { projet: null, erreurs: ["Le fichier n'est pas un JSON valide."] }; }
  if (o && o.format === FORMAT && o.projet) o = o.projet;               // enveloppe de sauvegarde acceptée aussi
  return validerProjet(o, nomenclature, zonesDonnees);
}

// ================= Export CSV =================
/** Texte d'une cellule : guillemets si besoin ; un texte qui commencerait par = + - @ est neutralisé (pas de formule dans Excel). */
function celluleTexte(t) {
  let s = String(t ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Nombre au format français sans séparateur de milliers (« 368,7 »), arrondi à `decimales` ; « -0 » évité. */
function celluleNombre(x, decimales) {
  const r = Number(x.toFixed(decimales)) + 0;
  return String(r).replace(".", ",");
}

/**
 * CSV du projet : une ligne par surface, puis la synthèse (totaux, parcelle, CBSh, écart B − A).
 * @param {Object} resultats  résultats de calculerScenario par clé de scénario
 */
function genererCsv(projet, nomenclature, resultats) {
  const typo = new Map(nomenclature.typologies.map((t) => [t.id, t]));
  const categorie = new Map(nomenclature.categories.map((c) => [c.cle, c.libelle]));
  const strate = new Map(nomenclature.strates.map((s) => [s.cle, s.libelle]));
  const [a, b] = CLES_SCENARIOS;
  const nom = Object.fromEntries(projet.scenarios.map((s) => [s.cle, s.nom]));
  const ligneCsv = (cellules) => cellules.join(SEPARATEUR_CSV);
  const m2 = (x) => celluleNombre(x, DECIMALES_M2);
  const sortie = [];

  sortie.push(ligneCsv(["N°", "Catégorie", "Typologie", "Précision", "Strates", "Coefficient",
    ...[a, b].flatMap((c) => [`Surface ${c} — ${nom[c]} (m²)`, `m² éco ${c} — ${nom[c]}`]), "Écart m² éco (B − A)"].map(celluleTexte)));
  for (const l of projet.lignes) {
    const t = typo.get(l.typologie);
    const [ra, rb] = [resultats[a].parLigne.get(l.n), resultats[b].parLigne.get(l.n)];
    sortie.push(ligneCsv([
      l.n, celluleTexte(categorie.get(t.categorie)), celluleTexte(t.libelle), celluleTexte(l.precision ?? t.condition),
      celluleTexte(l.strates ? l.strates.map((k) => strate.get(k)).join(", ") : ""), celluleNombre(t.coef, 2),
      m2(ra.surface), m2(ra.eco), m2(rb.surface), m2(rb.eco), m2(rb.eco - ra.eco),
    ]));
  }

  sortie.push("", ligneCsv(["Synthèse", `Scénario ${a} — ${nom[a]}`, `Scénario ${b} — ${nom[b]}`, "Écart B − A"].map(celluleTexte)));
  const [ta, tb] = [resultats[a], resultats[b]];
  const synthese = [
    ["Surface saisie (m²)", ta.surfaceTotale, tb.surfaceTotale, DECIMALES_M2],
    ["Surface de la parcelle (m²)", ta.surfaceParcelle, tb.surfaceParcelle, DECIMALES_M2],
    ["Surface éco-aménageable (m²)", ta.ecoTotal, tb.ecoTotal, DECIMALES_M2],
    ["CBSh", ta.cbsh, tb.cbsh, DECIMALES_CBSH],
  ];
  for (const [libelle, va, vb, d] of synthese) sortie.push(ligneCsv([celluleTexte(libelle), celluleNombre(va, d), celluleNombre(vb, d), celluleNombre(vb - va, d)]));
  sortie.push(ligneCsv([celluleTexte(`Façade végétalisée (hors CBSh, m²) — ${projet.facade_vegetalisee.precision}`), celluleNombre(projet.facade_vegetalisee.surface, DECIMALES_M2), "", ""]));
  return sortie.join("\r\n") + "\r\n";
}

/** Nom de fichier : « cbsh_<nom du projet>_<aaaa-mm-jj>.<extension> » (nom réduit à des caractères sûrs). */
function nomFichier(projet, extension, date = new Date()) {
  const base = (projet.nom || "projet").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "projet";
  return `cbsh_${base}_${date.toISOString().slice(0, 10)}.${extension}`;
}

globalThis.CBShProjet = { CLE_STOCKAGE, TAILLE_FICHIER_MAX, serialiser, lireSauvegarde, validerProjet, lireFichierProjet, genererCsv, celluleTexte, celluleNombre, nomFichier };
})();
