"use strict";
// CBSh — calcul pur (aucun accès au DOM, testable sous Node : `npm test`).
// CBSh = Σ (surface × coefficient) / surface de la parcelle. Surfaces en projection horizontale (sol + toitures).
// Surface de la parcelle : par défaut la somme des surfaces saisies ; on peut la « forcer » à une valeur supérieure
// quand tout n'est pas compté (la part non comptée vaut 0 m² éco). Chaque scénario a sa propre valeur.
// Le coefficient d'une surface est celui de sa typologie (nomenclature, version de septembre 2024).
// Script classique (pas de module ES) : il se charge aussi quand la page est ouverte depuis un fichier.

(function () {
// ================= Réglages =================
const TOLERANCE_SURFACE = 0.05;   // m² : dépassement toléré de la surface de la parcelle (forcée) par Σ des surfaces

// ================= Nomenclature =================
/** Index des typologies par identifiant. */
function indexerTypologies(nomenclature) {
  return new Map(nomenclature.typologies.map((t) => [t.id, t]));
}

/** Vrai si `strates` (liste de clés) respecte la règle de la typologie (nombre exact, choisies parmi `parmi`). */
function strateValide(typologie, strates) {
  const regle = typologie.strates;
  if (regle === null) return strates === null;
  if (!Array.isArray(strates) || strates.length !== regle.nombre) return false;
  return new Set(strates).size === strates.length && strates.every((s) => regle.parmi.includes(s));
}

// ================= Calcul =================
/**
 * Calcule un scénario.
 * @param {Array} lignes  lignes du projet : { n, typologie, surfaces: { A, B, … } }
 * @param {Map} typologies  index renvoyé par indexerTypologies
 * @param {string} scenario  clé du scénario ("A", "B", …)
 * @param {?number} surfaceForcee  surface de la parcelle forcée (m², > 0) ; null/undefined = somme des surfaces
 * @returns {{surfaceParcelle:number, forcee:boolean, nonComptee:number, surfaceTotale:number, ecoTotal:number, cbsh:number, parCategorie:Object, parLigne:Map, controle:Object}}
 */
function calculerScenario(lignes, typologies, scenario, surfaceForcee = null) {
  const forcee = surfaceForcee !== null && surfaceForcee !== undefined;
  if (forcee && !(surfaceForcee > 0)) throw new RangeError(`Surface de parcelle invalide : ${surfaceForcee}`);
  const parLigne = new Map();
  const parCategorie = {};
  let surfaceTotale = 0;
  let ecoTotal = 0;
  for (const ligne of lignes) {
    const typologie = typologies.get(ligne.typologie);
    if (!typologie) throw new Error(`Typologie inconnue : ${ligne.typologie} (ligne ${ligne.n})`);
    const surface = Number(ligne.surfaces?.[scenario] ?? 0);
    if (!Number.isFinite(surface) || surface < 0) throw new RangeError(`Surface invalide (ligne ${ligne.n}, scénario ${scenario}) : ${surface}`);
    const eco = surface * typologie.coef;            // m² éco-aménageables de la ligne
    parLigne.set(ligne.n, { surface, coef: typologie.coef, eco });
    const cat = (parCategorie[typologie.categorie] ??= { surface: 0, eco: 0 });
    cat.surface += surface;
    cat.eco += eco;
    surfaceTotale += surface;
    ecoTotal += eco;
  }
  const surfaceParcelle = forcee ? surfaceForcee : surfaceTotale;          // dénominateur du CBSh
  const ecart = surfaceTotale - surfaceParcelle;                            // > 0 : Σ dépasse la parcelle forcée
  return {
    scenario,
    surfaceParcelle,
    forcee,
    nonComptee: Math.max(0, -ecart),                                        // part de la parcelle sans surface saisie
    surfaceTotale,
    ecoTotal,
    cbsh: surfaceParcelle > 0 ? ecoTotal / surfaceParcelle : 0,              // 0 si rien n'est saisi (parcelle = Σ = 0)
    parCategorie,
    parLigne,
    controle: { ecart, conforme: ecart <= TOLERANCE_SURFACE },              // Σ surfaces ≤ surface de la parcelle ?
  };
}

/** Gain d'un scénario `cible` par rapport à `reference` (résultats de calculerScenario). */
function ecartScenarios(reference, cible) {
  return { cbsh: cible.cbsh - reference.cbsh, eco: cible.ecoTotal - reference.ecoTotal };
}

// ================= Contrôle des données =================
/** Vérifie la cohérence de la nomenclature et du projet ; renvoie la liste des anomalies (vide si tout va bien). */
function verifierDonnees(nomenclature, projet, zonesDonnees = null) {
  const erreurs = [];
  const categories = new Set(nomenclature.categories.map((c) => c.cle));
  const cleStrates = new Set(nomenclature.strates.map((s) => s.cle));
  const ids = new Set();
  for (const t of nomenclature.typologies) {
    if (ids.has(t.id)) erreurs.push(`Typologie ${t.id} : identifiant en double`);
    ids.add(t.id);
    if (!categories.has(t.categorie)) erreurs.push(`Typologie ${t.id} : catégorie inconnue (${t.categorie})`);
    if (!(t.coef >= 0 && t.coef <= 1)) erreurs.push(`Typologie ${t.id} : coefficient hors de [0 ; 1] (${t.coef})`);
    if (t.strates !== null) {
      if (!(t.strates.nombre >= 1 && t.strates.nombre <= t.strates.parmi.length)) erreurs.push(`Typologie ${t.id} : nombre de strates incohérent`);
      for (const s of t.strates.parmi) if (!cleStrates.has(s)) erreurs.push(`Typologie ${t.id} : strate inconnue (${s})`);
    }
  }
  const typologies = indexerTypologies(nomenclature);
  const { parcelle, scenarios, lignes } = projet;
  if (Math.abs(parcelle.largeur * parcelle.profondeur - parcelle.surface) > TOLERANCE_SURFACE) {
    erreurs.push(`Parcelle : ${parcelle.largeur} × ${parcelle.profondeur} ≠ ${parcelle.surface} m²`);
  }
  const numeros = new Set();
  for (const l of lignes) {
    if (numeros.has(l.n)) erreurs.push(`Ligne ${l.n} : numéro en double`);
    numeros.add(l.n);
    const t = typologies.get(l.typologie);
    if (!t) { erreurs.push(`Ligne ${l.n} : typologie inconnue (${l.typologie})`); continue; }
    if (!strateValide(t, l.strates)) erreurs.push(`Ligne ${l.n} : strates incompatibles avec la typologie ${t.id}`);
    for (const { cle } of scenarios) {
      const s = l.surfaces?.[cle];
      if (!(Number.isFinite(s) && s >= 0)) erreurs.push(`Ligne ${l.n} : surface invalide pour le scénario ${cle}`);
    }
  }
  // Zones de l'illustration (facultatif) : lignes citées existantes, catégorie cohérente, une ligne dans une seule zone
  if (zonesDonnees) {
    const dejaVues = new Map();
    for (const z of zonesDonnees.zones) {
      if (z.type === "info" && !z.info) erreurs.push(`Zone ${z.id} : texte d'information manquant`);
      if (z.type !== "saisie") continue;
      if (!categories.has(z.categorie)) erreurs.push(`Zone ${z.id} : catégorie inconnue (${z.categorie})`);
      for (const n of z.lignes ?? []) {
        const l = lignes.find((x) => x.n === n);
        if (!l) { erreurs.push(`Zone ${z.id} : ligne ${n} inexistante`); continue; }
        if (typologies.get(l.typologie)?.categorie !== z.categorie) erreurs.push(`Zone ${z.id} : la ligne ${n} n'est pas de la catégorie ${z.categorie}`);
        if (dejaVues.has(n)) erreurs.push(`Ligne ${n} : présente dans deux zones (${dejaVues.get(n)}, ${z.id})`);
        dejaVues.set(n, z.id);
      }
    }
    // Toute ligne appartient à une zone (listée dans zones.json, ou mémorisée sur la ligne si elle a été créée) : 0.8.13
    const idsSaisie = new Set(zonesDonnees.zones.filter((z) => z.type === "saisie").map((z) => z.id));
    for (const l of lignes) {
      if (!dejaVues.has(l.n) && !idsSaisie.has(l.zone)) erreurs.push(`Ligne ${l.n} : aucune zone de l'illustration`);
    }
  }
  if (erreurs.length === 0) {
    for (const { cle } of scenarios) {
      const forcee = scenarios.find((s) => s.cle === cle).surface_parcelle ?? null;
      if (forcee !== null && !(forcee > 0)) { erreurs.push(`Scénario ${cle} : surface de parcelle forcée invalide (${forcee})`); continue; }
      const r = calculerScenario(lignes, typologies, cle, forcee);
      if (!r.controle.conforme) erreurs.push(`Scénario ${cle} : Σ surfaces = ${r.surfaceTotale} m² > parcelle forcée ${forcee} m²`);
    }
  }
  return erreurs;
}

// Exposé en global (script classique : fonctionne aussi sans serveur) et importable sous Node pour les tests.
globalThis.CBShCalcul = { TOLERANCE_SURFACE, indexerTypologies, strateValide, calculerScenario, ecartScenarios, verifierDonnees };
})();
