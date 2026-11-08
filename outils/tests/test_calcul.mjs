// Tests du calcul CBSh et de la cohérence des données : `npm test` (ou `node --test outils/tests/test_calcul.mjs`), Node ≥ 20.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
await import("../../js/calcul.js");                       // script classique : expose globalThis.CBShCalcul
await import("../../js/projet_io.js");                    // expose globalThis.CBShProjet (0.8.16)
const { indexerTypologies, calculerScenario, ecartScenarios, strateValide, verifierDonnees } = globalThis.CBShCalcul;
const { serialiser, lireSauvegarde, validerProjet, lireFichierProjet, genererCsv, celluleTexte, celluleNombre, nomFichier } = globalThis.CBShProjet;

// ================= Données =================
const lire = (chemin) => JSON.parse(readFileSync(new URL(chemin, import.meta.url), "utf-8"));
const nomenclature = lire("../../data/nomenclature.json");
const projet = lire("../../data/projet_exemple.json");
const zones = lire("../../data/zones.json");
const typologies = indexerTypologies(nomenclature);
const proche = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const copie = (x) => structuredClone(x);

// ================= Nomenclature =================
test("nomenclature : 41 typologies, identifiants 1 à 41, répartition par catégorie", () => {
  assert.equal(nomenclature.typologies.length, 41);
  assert.deepEqual(nomenclature.typologies.map((t) => t.id), Array.from({ length: 41 }, (_, i) => i + 1));
  const n = (c) => nomenclature.typologies.filter((t) => t.categorie === c).length;
  assert.deepEqual([n("bat"), n("voi"), n("ev"), n("eau")], [12, 6, 18, 5]);
});

test("nomenclature : coefficients par défaut repérés dans la grille (astérisque)", () => {
  assert.deepEqual(nomenclature.typologies.filter((t) => t.defaut).map((t) => t.id), [2, 13, 19, 27, 30, 37]);
});

test("nomenclature : coefficients de contrôle (grille de septembre 2024)", () => {
  const coef = (id) => typologies.get(id).coef;
  assert.deepEqual([1, 2, 12, 13, 18, 19, 23, 26, 27, 29, 30, 36, 37, 39, 41].map(coef),
                   [0, 0.1, 0.7, 0, 0.3, 0.3, 0.7, 0.8, 0.7, 0.9, 0.6, 1, 0.2, 1, 0.8]);
});

test("données : nomenclature et projet d'exemple cohérents", () => {
  assert.deepEqual(verifierDonnees(nomenclature, projet, zones), []);
});

// ================= Calcul =================
// Le projet d'exemple ne force pas la parcelle (0.8.14) : dénominateur = Σ des surfaces de chaque scénario (966 m² : les 34 m² de
// venelle ne sont pas comptés). Depuis 0.8.14, A = « Variante « best » » (CBSh élevé) et B = « Projet de base » (valeurs échangées).
const forcee = (cle) => projet.scenarios.find((s) => s.cle === cle).surface_parcelle ?? null;

test("projet d'exemple : parcelle non forcée (null) pour A et B, noms échangés", () => {
  assert.equal(forcee("A"), null);
  assert.equal(forcee("B"), null);
  assert.deepEqual(projet.scenarios.map((s) => s.nom), ["Variante « best »", "Projet de base"]);
  assert.equal(projet.parcelle.surface, 1000);               // surface de la parcelle (donnée de référence, non utilisée comme dénominateur)
});

test("projet d'exemple : scénario A (variante, CBSh 368,7 / 966 = 0,3817)", () => {
  const a = calculerScenario(projet.lignes, typologies, "A", forcee("A"));
  proche(a.surfaceTotale, 966);
  proche(a.surfaceParcelle, 966);                            // parcelle = Σ
  assert.equal(a.forcee, false);
  proche(a.nonComptee, 0);
  proche(a.ecoTotal, 368.7);
  proche(a.cbsh, 368.7 / 966);
  assert.equal(a.controle.conforme, true);
  proche(a.parCategorie.bat.eco, 122.4);
  proche(a.parCategorie.voi.eco, 21);
  proche(a.parCategorie.ev.eco, 215.5);
  proche(a.parCategorie.eau.eco, 9.8);
  proche(a.parLigne.get(4).eco, 75.6);
  proche(a.parLigne.get(8).eco, 33.6);              // ligne 8 : pleine terre 1 strate (coef 0,7) × 48 m²
});

test("projet d'exemple : scénario B (base, CBSh 136 / 966 = 0,1408) et gain B − A", () => {
  const a = calculerScenario(projet.lignes, typologies, "A", forcee("A"));
  const b = calculerScenario(projet.lignes, typologies, "B", forcee("B"));
  proche(b.surfaceTotale, 966);
  proche(b.ecoTotal, 136);
  proche(b.cbsh, 136 / 966);
  proche(b.parCategorie.bat.eco, 20);
  proche(b.parCategorie.voi.eco, 11);
  proche(b.parCategorie.ev.eco, 105);
  proche(b.parCategorie.eau.eco, 0);                // catégorie présente, sans surface dans le scénario de base
  const g = ecartScenarios(a, b);                   // gain = B − A : négatif, la base est moins bonne que la variante
  proche(g.cbsh, 136 / 966 - 368.7 / 966);
  proche(g.eco, -232.7);
});

test("modification d'une surface de A : la parcelle (= Σ) suit, le CBSh aussi", () => {
  const p = copie(projet);
  p.lignes.find((l) => l.n === 3).surfaces.A = 100;       // 204 → 100 : −104 m² × 0,2 = −20,8 m² éco
  const a = calculerScenario(p.lignes, typologies, "A");
  proche(a.ecoTotal, 368.7 - 20.8);
  proche(a.surfaceTotale, 862);
  proche(a.surfaceParcelle, 862);                          // dénominateur = Σ des surfaces
  assert.equal(a.forcee, false);
  proche(a.cbsh, (368.7 - 20.8) / 862);
  assert.equal(a.controle.conforme, true);
  proche(a.nonComptee, 0);
});

test("surface de parcelle forcée supérieure à Σ : dénominateur forcé, part non comptée à 0", () => {
  const p = copie(projet);
  p.lignes.find((l) => l.n === 3).surfaces.A = 100;
  const a = calculerScenario(p.lignes, typologies, "A", 1000);
  assert.equal(a.forcee, true);
  proche(a.surfaceParcelle, 1000);
  proche(a.nonComptee, 138);
  proche(a.cbsh, (368.7 - 20.8) / 1000);
  assert.equal(a.controle.conforme, true);
});

test("surface de parcelle forcée inférieure à Σ : signalée, calcul maintenu sur la valeur forcée", () => {
  const a = calculerScenario(projet.lignes, typologies, "A", 800);
  assert.equal(a.controle.conforme, false);
  proche(a.controle.ecart, 166);
  proche(a.cbsh, 368.7 / 800);
});

test("scénarios indépendants : A sur sa somme, B sur sa valeur forcée", () => {
  const a = calculerScenario(projet.lignes, typologies, "A");
  const b = calculerScenario(projet.lignes, typologies, "B", 1200);
  proche(a.cbsh, 368.7 / 966);                             // sans forçage : Σ des surfaces de A (966 m²)
  proche(b.cbsh, 136 / 1200);
});

test("cas limites : aucune surface, parcelle forcée nulle, typologie inconnue, surface négative", () => {
  const vide = copie(projet);
  vide.lignes.forEach((l) => { l.surfaces.B = 0; });
  const r = calculerScenario(vide.lignes, typologies, "B");
  assert.equal(r.cbsh, 0);                                 // pas de division par zéro
  assert.equal(r.controle.conforme, true);
  assert.throws(() => calculerScenario(projet.lignes, typologies, "B", 0), RangeError);
  assert.throws(() => calculerScenario(projet.lignes, typologies, "B", -10), RangeError);
  assert.throws(() => calculerScenario([{ n: 1, typologie: 999, surfaces: { B: 1 } }], typologies, "B"), /inconnue/);
  assert.throws(() => calculerScenario([{ n: 1, typologie: 1, surfaces: { B: -5 } }], typologies, "B"), RangeError);
});

test("lignes vides dans les deux scénarios : sans effet sur le calcul, détectables (suppression de ligne, 0.8.14)", () => {
  const p = copie(projet);
  p.lignes.push({ n: 13, typologie: 27, precision: null, strates: ["herbacees"], surfaces: { A: 0, B: 0 }, zone: "bande-est", creee: true });
  assert.deepEqual(verifierDonnees(nomenclature, p, zones), []);
  const avant = calculerScenario(projet.lignes, typologies, "A");
  const apres = calculerScenario(p.lignes, typologies, "A");
  proche(apres.ecoTotal, avant.ecoTotal);
  assert.deepEqual(p.lignes.filter((l) => Object.values(l.surfaces).every((v) => v === 0)).map((l) => l.n), [13]);
  const a = calculerScenario(p.lignes.filter((l) => l.n !== 13), typologies, "A");
  proche(a.cbsh, avant.cbsh);                              // une fois la ligne retirée, rien ne change
});

test("données : parcelle forcée trop petite ou invalide signalée", () => {
  const p = copie(projet);
  p.scenarios.find((s) => s.cle === "B").surface_parcelle = 900;
  assert.match(verifierDonnees(nomenclature, p).join(" "), /Scénario B : Σ surfaces = 966 m² > parcelle forcée 900/);
  p.scenarios.find((s) => s.cle === "B").surface_parcelle = -1;
  assert.match(verifierDonnees(nomenclature, p).join(" "), /Scénario B : surface de parcelle forcée invalide/);
});

// ================= Règles de strates =================
test("strates : nombre exact, parmi les types autorisés, sans doublon", () => {
  const t8 = typologies.get(8);                              // intensif −, 2 strates parmi herbacées / arbustes / arbres
  assert.equal(strateValide(t8, ["herbacees", "arbres"]), true);
  assert.equal(strateValide(t8, ["herbacees"]), false);
  assert.equal(strateValide(t8, ["herbacees", "herbacees"]), false);
  assert.equal(strateValide(t8, ["sedum", "arbres"]), false);
  assert.equal(strateValide(typologies.get(1), null), true); // toiture classique : sans strates
  assert.equal(strateValide(typologies.get(1), ["sedum"]), false);
});

test("données : une ligne aux strates incompatibles est signalée", () => {
  const p = copie(projet);
  p.lignes.find((l) => l.n === 2).strates = ["herbacees", "arbres"];     // ligne 2 : extensif − (sédum seul)
  assert.match(verifierDonnees(nomenclature, p).join(" "), /Ligne 2 : strates incompatibles/);
});

// ================= Zones cliquables =================
test("zones : types, contours, lignes existantes et de la bonne catégorie, une ligne dans une seule zone", () => {
  const ids = new Set();
  for (const z of zones.zones) {
    assert.ok(!ids.has(z.id), `zone en double : ${z.id}`);
    ids.add(z.id);
    assert.ok(["saisie", "info", "inerte", "facade"].includes(z.type), `zone ${z.id} : type inconnu`);
    assert.match(z.chemin, /^M[\d.,\- LMZ]+Z$/, `zone ${z.id} : contour illisible`);
    if (z.type === "info") assert.ok(z.info?.titre && z.info?.texte, `zone ${z.id} : texte d'information manquant`);
    if (z.type === "saisie") assert.ok(z.lignes.length > 0, `zone ${z.id} : aucune ligne`);
  }
  assert.equal(zones.zones.filter((z) => z.type === "facade").length, 1);
  assert.deepEqual(zones.zones.filter((z) => z.type === "inerte").map((z) => z.id), ["venelle-dalles"]);
  assert.equal(zones.viewBox, "290 78 920 840");              // viewBox de l'axo recentré (0.8.10)
});

test("zones : toute ligne du projet d'exemple appartient à une zone ; la zone sédum a disparu (0.8.13)", () => {
  const parLigne = new Map(zones.zones.filter((z) => z.type === "saisie").flatMap((z) => z.lignes.map((n) => [n, z.id])));
  assert.deepEqual(projet.lignes.filter((l) => !parLigne.has(l.n)).map((l) => l.n), []);
  assert.equal(parLigne.get(2), "toit-extensive-barre");              // ligne 2 (sédum) reprise par la barre
  assert.equal(parLigne.get(9), "pleine-terre");                      // ligne 9 (A seulement) dans la pleine terre
  assert.ok(!zones.zones.some((z) => z.id === "toit-sedum-pv"));
  assert.equal(zones.zones.find((z) => z.id === "pv-toiture").type, "info");   // panneaux : information seule
});

test("zones : une ligne sans zone est signalée ; une ligne créée avec sa zone est acceptée", () => {
  const p = copie(projet);
  p.lignes.push({ n: 13, typologie: 27, precision: null, strates: ["herbacees"], surfaces: { A: 0, B: 10 } });
  assert.match(verifierDonnees(nomenclature, p, zones).join(" "), /Ligne 13 : aucune zone/);
  p.lignes.at(-1).zone = "bande-est"; p.lignes.at(-1).creee = true;
  assert.deepEqual(verifierDonnees(nomenclature, p, zones), []);
});

test("zones : chaque zone de saisie a une ancre dans l'illustration (traits de repère des étiquettes)", () => {
  const [x0, y0, l, h] = zones.viewBox.split(" ").map(Number);
  for (const z of zones.zones.filter((x) => x.type === "saisie")) {
    for (const [x, y] of [z.ancre, ...Object.values(z.ancres ?? {})]) {
      assert.ok(x > x0 && x < x0 + l && y > y0 && y < y0 + h, `zone ${z.id} : ancre hors de l'illustration`);
    }
  }
  assert.ok(zones.zones.find((z) => z.id === "toit-extensive-barre").ancres["2"], "ancre propre de la ligne 2");
  const pt = zones.zones.find((z) => z.id === "pleine-terre");
  assert.ok(pt.ancres["9"] && pt.ancres["10"], "repères propres des lignes 9 et 10 (pointe de la bande)");
  assert.notDeepEqual(pt.ancres["9"], pt.ancres["10"]);
});

test("zones : les panneaux couvrent toute la largeur de la barre et ne font plus partie de la zone de toiture (0.8.14)", () => {
  const barre = zones.zones.find((z) => z.id === "toit-extensive-barre"), pv = zones.zones.find((z) => z.id === "pv-toiture");
  assert.equal(pv.type, "info");
  assert.equal(pv.chemin, "M717,134.8 L777.4,169.6 L630.6,254.4 L570.2,219.5 Z");     // x 6,35 → 11 m, y 1,35 → 12,65 m, z 17,2 m
  assert.equal(barre.chemin.split("M").length - 1, 1, "la zone de la barre n'a plus qu'un contour");
  // le repère de la ligne 2 est sur les panneaux : à l'altitude des panneaux, dans leur emprise
  const [ax, ay] = barre.ancres["2"];
  assert.equal(ay, 221);                                                            // 335 + (8,7 + 10,5)·7,5 − 17,2·15
  assert.ok(ax > 570 && ax < 778, "ancre de la ligne 2 dans l'emprise horizontale des panneaux");
});

test("zones : une ligne en double dans deux zones ou de mauvaise catégorie est signalée", () => {
  const z = copie(zones);
  z.zones.find((x) => x.id === "bande-est").lignes.push(4);             // ligne 4 = toiture : mauvaise catégorie et déjà prise
  const msg = verifierDonnees(nomenclature, projet, z).join(" ");
  assert.match(msg, /Zone bande-est : la ligne 4 n'est pas de la catégorie ev/);
  assert.match(msg, /Ligne 4 : présente dans deux zones/);
  z.zones.find((x) => x.id === "stabilise").lignes.push(99);
  assert.match(verifierDonnees(nomenclature, projet, z).join(" "), /ligne 99 inexistante/);
});

// ================= Aide (0.8.15) =================
test("aide : l'image de la nomenclature existe, et l'onglet et ses sections sont dans index.html", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf-8");
  assert.ok(existsSync(new URL("../../assets/aide_cbsh_nomenclature.svg", import.meta.url)), "image absente");
  assert.match(html, /id="onglet-aide"[^>]*aria-controls="panneau-aide"/);
  assert.match(html, /id="panneau-aide"/);
  assert.equal(html.match(/<div[\s>]/g).length, html.match(/<\/div>/g).length, "balises <div> déséquilibrées");
  // le panneau Aide est frère des autres panneaux (pas imbriqué dans « Saisie » : il resterait masqué)
  const saisie = html.slice(html.indexOf('id="panneau-saisie"'), html.indexOf('<div id="panneau-aide"'));   // débute après le « <div » du panneau
  assert.equal(saisie.match(/<div[\s>]/g).length + 1, saisie.match(/<\/div>/g).length, "panneau Saisie non refermé avant le panneau Aide");
  // chaque entrée du sommaire pointe vers une section existante
  const cibles = [...html.matchAll(/data-aide-section="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(cibles.length, 6);
  for (const id of cibles) assert.ok(html.includes(`id="${id}"`), `section ${id} absente`);
  assert.match(readFileSync(new URL("../../js/app.js", import.meta.url), "utf-8"), /const ONGLETS = \["accueil", "saisie", "aide"\]/);
  assert.equal(html.match(/class="aide-cat aide-cat--/g).length, 4, "les 4 cartes de catégories");
});

test("scénario affiché au chargement : A", () => {
  assert.match(readFileSync(new URL("../../js/app.js", import.meta.url), "utf-8"), /const SCENARIO_PAR_DEFAUT = "A";/);
});

// ================= Sauvegarde, import et export (0.8.16) =================
const resultatsExemple = () => Object.fromEntries(projet.scenarios.map(({ cle, surface_parcelle }) => [cle, calculerScenario(projet.lignes, typologies, cle, surface_parcelle)]));

test("sauvegarde : aller-retour de l'enveloppe, et projet d'exemple accepté tel quel", () => {
  const texte = serialiser(projet, "A", "import", new Date("2026-11-08T12:00:00Z"));
  const lu = lireSauvegarde(texte);
  assert.equal(lu.scenarioActif, "A");
  assert.equal(lu.origine, "import");
  assert.equal(lu.enregistre, "2026-11-08T12:00:00.000Z");
  const { projet: propre, erreurs } = validerProjet(lu.projet, nomenclature, zones);
  assert.deepEqual(erreurs, []);
  assert.deepEqual(propre.lignes.map((l) => [l.n, l.typologie, l.surfaces]), projet.lignes.map((l) => [l.n, l.typologie, l.surfaces]));
  assert.equal(propre.scenarios[0].nom, projet.scenarios[0].nom);
});

test("sauvegarde : texte illisible, autre format ou autre version → null", () => {
  assert.equal(lireSauvegarde("pas du json"), null);
  assert.equal(lireSauvegarde('{"format":"autre","version":1,"projet":{}}'), null);
  assert.equal(lireSauvegarde('{"format":"cbsh-visuel","version":99,"projet":{}}'), null);
});

test("import : un projet dont une ligne a été supprimée reste valide (les listes de zones.json ne sont pas comparées)", () => {
  const p = copie(projet);
  p.lignes = p.lignes.filter((l) => l.n !== 12);
  assert.deepEqual(validerProjet(p, nomenclature, zones).erreurs, []);
});

test("import : le fichier JSON seul et l'enveloppe de sauvegarde sont acceptés", () => {
  assert.deepEqual(lireFichierProjet(JSON.stringify(projet), nomenclature, zones).erreurs, []);
  assert.deepEqual(lireFichierProjet(serialiser(projet, "B"), nomenclature, zones).erreurs, []);
});

test("import : refus motivé des fichiers invalides", () => {
  const refus = (modif, motif) => {
    const p = copie(projet);
    modif(p);
    const { projet: sortie, erreurs } = validerProjet(p, nomenclature, zones);
    assert.equal(sortie, null);
    assert.match(erreurs.join(" "), motif);
  };
  assert.match(lireFichierProjet("{pas du json", nomenclature, zones).erreurs[0], /JSON valide/);
  assert.match(lireFichierProjet("[1,2]", nomenclature, zones).erreurs[0], /pas un projet/);
  assert.match(lireFichierProjet(" ".repeat(1_000_001), nomenclature, zones).erreurs[0], /volumineux/);
  refus((p) => { p.scenarios.pop(); }, /Scénarios/);
  refus((p) => { p.scenarios[0].cle = "C"; }, /Scénarios/);
  refus((p) => { delete p.parcelle; }, /Parcelle/);
  refus((p) => { delete p.facade_vegetalisee; }, /Façade/);
  refus((p) => { p.lignes = "x"; }, /Lignes/);
  refus((p) => { p.lignes[0].typologie = 999; }, /typologie inconnue/);
  refus((p) => { p.lignes[0].surfaces.A = -5; }, /surface invalide/);
  refus((p) => { p.lignes[1].n = p.lignes[0].n; }, /numéro en double/);
  refus((p) => { p.lignes[2].strates = ["arbres"]; }, /strates incompatibles/);
  refus((p) => { p.scenarios[1].surface_parcelle = 100; }, /parcelle forcée/);
  refus((p) => { p.lignes[0].zone = "inconnue"; p.lignes.push({ n: 50, typologie: 1, precision: null, strates: null, surfaces: { A: 1, B: 1 }, zone: "inconnue" }); }, /Ligne 50 : aucune zone/);
});

test("import : le projet est nettoyé (champs inconnus ignorés, textes tronqués, nom de scénario par défaut)", () => {
  const p = copie(projet);
  p.script = "<img src=x onerror=alert(1)>";
  p.lignes[0].autre = 1;
  p.scenarios[0].nom = "x".repeat(100);
  p.scenarios[1].nom = "   ";
  const { projet: propre, erreurs } = validerProjet(p, nomenclature, zones);
  assert.deepEqual(erreurs, []);
  assert.equal("script" in propre, false);
  assert.equal("autre" in propre.lignes[0], false);
  assert.equal(propre.scenarios[0].nom.length, 40);
  assert.equal(propre.scenarios[1].nom, "Scénario B");
});

test("CSV : cellules (guillemets, formules neutralisées, virgule décimale, pas de -0)", () => {
  assert.equal(celluleTexte('a;b'), '"a;b"');
  assert.equal(celluleTexte('dit "oui"'), '"dit ""oui"""');
  assert.equal(celluleTexte("=SOMME(A1)"), "'=SOMME(A1)");
  assert.equal(celluleTexte("-1+2"), "'-1+2");
  assert.equal(celluleTexte("Toiture"), "Toiture");
  assert.equal(celluleNombre(368.7, 2), "368,7");
  assert.equal(celluleNombre(1234.5678, 2), "1234,57");
  assert.equal(celluleNombre(-0.0001, 2), "0");
  assert.equal(celluleNombre(0.38172, 4), "0,3817");
});

test("CSV : une ligne par surface, synthèse cohérente avec le calcul", () => {
  const res = resultatsExemple();
  const lignes = genererCsv(projet, nomenclature, res).trimEnd().split("\r\n");
  const colonnes = (l) => l.split(";");
  assert.equal(colonnes(lignes[0]).length, 11);
  assert.match(lignes[0], /^N°;Catégorie;Typologie;Précision;Strates;Coefficient;Surface A — Variante « best » \(m²\)/);
  const donnees = lignes.slice(1, 1 + projet.lignes.length);
  assert.equal(donnees.length, 12);
  assert.ok(donnees.every((l) => colonnes(l).length === 11 || l.includes('"')), "une ligne n'a pas 11 colonnes");
  // Ligne 1 (A = 132, B = 200, coefficient 0) : surfaces, m² éco et écart
  assert.deepEqual(colonnes(donnees[0]).slice(0, 1).concat(colonnes(donnees[0]).slice(-5)), ["1", "132", "0", "200", "0", "0"]);
  // La somme des m² éco de la colonne A redonne le total du calcul
  const somme = donnees.reduce((t, l) => t + Number(colonnes(l)[7].replace(",", ".")), 0);
  proche(somme, res.A.ecoTotal, 0.01 * donnees.length);
  const synthese = Object.fromEntries(lignes.slice(1 + donnees.length + 2).map((l) => [colonnes(l)[0], colonnes(l)]));
  assert.equal(synthese["CBSh"][1], celluleNombre(res.A.cbsh, 4));
  assert.equal(synthese["CBSh"][2], celluleNombre(res.B.cbsh, 4));
  assert.equal(synthese["Surface de la parcelle (m²)"][1], "966");
});

test("fichiers : nom sans caractères spéciaux", () => {
  assert.equal(nomFichier({ nom: "Projet d'exemple (valeurs illustratives)" }, "csv", new Date("2026-11-08T10:00:00Z")), "cbsh_Projet_d_exemple_valeurs_illustratives_2026-11-08.csv");
  assert.equal(nomFichier({ nom: "" }, "json", new Date("2026-11-08T10:00:00Z")), "cbsh_projet_2026-11-08.json");
});

test("index.html : menu Projet, bouton CSV actif, scripts dans l'ordre", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf-8");
  assert.match(html, /id="bouton-projet"[^>]*aria-controls="menu-projet"/);
  assert.match(html, /id="bouton-csv"/);
  assert.doesNotMatch(html, /class="bouton-export" disabled/);
  assert.ok(html.indexOf("js/calcul.js") < html.indexOf("js/projet_io.js") && html.indexOf("js/projet_io.js") < html.indexOf("js/app.js"));
  assert.equal(html.match(/<div[\s>]/g).length, html.match(/<\/div>/g).length);
});

// ================= 0.8.17 =================
const { zoneDeLigne, SURFACE_MAX } = globalThis.CBShCalcul;

test("zone d'une ligne : ligne.zone prime sur les listes de zones.json (numéro repris après suppression)", () => {
  const listee = zones.zones.find((z) => z.type === "saisie" && z.lignes.length);
  const autre = zones.zones.find((z) => z.type === "saisie" && z.id !== listee.id);
  const n = listee.lignes[0];
  assert.equal(zoneDeLigne({ n }, zones).id, listee.id);                       // ligne de l'exemple : zone listée
  assert.equal(zoneDeLigne({ n, zone: autre.id }, zones).id, autre.id);        // ligne créée qui reprend ce numéro : sa propre zone
  assert.equal(zoneDeLigne({ n: 999, zone: "inconnue" }, zones), undefined);
});

test("import : surface de parcelle forcée en texte, négative ou démesurée → refus", () => {
  for (const valeur of ["5", -1, 0, SURFACE_MAX * 10]) {
    const p = copie(projet);
    p.scenarios[0].surface_parcelle = valeur;
    const { projet: sortie, erreurs } = validerProjet(p, nomenclature, zones);
    assert.equal(sortie, null, `valeur ${valeur} acceptée`);
    assert.ok(erreurs.length > 0);
  }
});

test("import : surface de ligne démesurée → refus", () => {
  const p = copie(projet);
  p.lignes[0].surfaces.A = SURFACE_MAX * 10;
  assert.equal(validerProjet(p, nomenclature, zones).projet, null);
});

test("import : un nom de scénario contenant du HTML reste un simple texte (échappé à l'affichage)", () => {
  const p = copie(projet);
  p.scenarios[0].nom = '<img src=x onerror="alert(1)">';
  const { projet: sortie, erreurs } = validerProjet(p, nomenclature, zones);
  assert.deepEqual(erreurs, []);
  assert.equal(sortie.scenarios[0].nom, '<img src=x onerror="alert(1)">');
});

test("index.html : politique de sécurité de contenu présente avant les scripts, sans script en ligne", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf-8");
  assert.ok(html.indexOf("Content-Security-Policy") > 0 && html.indexOf("Content-Security-Policy") < html.indexOf("<script"));
  assert.match(html, /script-src 'self'/);
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/);
  assert.doesNotMatch(html, /\son(click|error|load)=/);
});
