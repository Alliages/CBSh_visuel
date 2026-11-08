// CBSh visuel — interface (0.8.16) : onglets, chargement des données, rendu, saisie des surfaces du scénario actif (A ou B),
// bascule par les cartes de résultat, noms de scénarios modifiables, étiquettes cliquables de toutes les lignes (colonnes à gauche
// et à droite de l'illustration), zones à 0 m² grisées, popup de zone sur 2 colonnes, suppression des lignes vides, aide,
// sauvegarde locale, export / import JSON et export CSV. Le calcul est dans calcul.js, la validation et le CSV dans projet_io.js.
"use strict";
// Dépend de calcul.js (chargé avant, expose CBShCalcul).
const { indexerTypologies, calculerScenario, ecartScenarios, strateValide, verifierDonnees } = CBShCalcul;
// Dépend aussi de projet_io.js (chargé avant, expose CBShProjet).
const { CLE_STOCKAGE, serialiser, lireSauvegarde, validerProjet, lireFichierProjet, genererCsv, nomFichier } = CBShProjet;

// ================= Réglages =================
const ONGLETS = ["accueil", "saisie", "aide"];             // identifiants : #onglet-<id> (bouton) et #panneau-<id> (contenu)
const ONGLET_PAR_DEFAUT = "accueil";
const CHEMIN_NOMENCLATURE = "data/nomenclature.json";
const CHEMIN_PROJET = "data/projet_exemple.json";
const CHEMIN_ZONES = "data/zones.json";            // zones cliquables de l'axonométrie (généré par outils/generer_zones.py)
const LANGUE = "fr-FR";
const LIBELLE_ECO_AMENAGEABLES = "éco-aménageables";   // texte « m² éco-aménageables » (cartes de l'Accueil)
const CHEMIN_AXO = "assets/axo.svg";               // illustration (copie en couleur découpée sur la zone sélectionnée)
const SCENARIO_BASE = "A";                         // le gain se lit « variante / base »
const SCENARIO_VARIANTE = "B";
const SCENARIO_PAR_DEFAUT = "A";                   // scénario actif au chargement (seul modifiable ; l'autre est en lecture seule)
const ECHELLE_BARRE_KPI = 250;                     // m² éco correspondant à une barre pleine (cartes de l'Accueil)
const SEUIL_NUMERO_MOSAIQUE = 0.027;               // part de la parcelle à partir de laquelle un bloc affiche son n°
const SEUIL_M2_MOSAIQUE = 0.087;                   // … et sa surface en m²
const SEUIL_ECART_AFFICHE = 0.05;                  // m² éco : en dessous, l'écart d'une ligne n'est pas affiché
// Plan de l'Accueil : scène en unités de conception (voir .plan-stage dans style.css) et étiquettes des lignes
const PLAN_LARGEUR = 1370, PLAN_HAUTEUR = 703;      // scène entière : colonne de légendes | axonométrie | colonne de légendes
const PLAN_X_AXO = 300, PLAN_LARGEUR_AXO = 770;     // position et largeur de l'axonométrie dans la scène
const ETIQ_LARGEUR = 280, ETIQ_HAUTEUR = 50;        // étiquette
const ETIQ_ECART_AXO = 20;                          // espace entre l'axonométrie et chaque colonne d'étiquettes
const ETIQ_X_DROITE = PLAN_X_AXO + PLAN_LARGEUR_AXO + ETIQ_ECART_AXO;   // abscisse de la colonne de droite (1 090)
const ETIQ_MAX_PAR_COTE = 8;                        // au-delà, les étiquettes les plus proches du centre passent de l'autre côté
const ETIQ_PAS_MAX = 66;                            // écart maximal entre deux étiquettes (le pas se resserre s'il y en a beaucoup)
const ETIQ_COUDE_DANS_AXO = 20;                     // le coude des traits de repère est à cette distance du bord de l'axonométrie
const ETIQ_DECALAGE_REPERE = 10;                    // décalage vertical entre deux repères d'une même zone
const NOM_SCENARIO_MAX = 40;                        // longueur maximale du nom d'un scénario
const ERREURS_AFFICHEES = 3;                        // import refusé : nombre de motifs cités dans le message
const DELAI_CONFIRMATION_MS = 5000;                 // « Revenir à l'exemple » : délai pour confirmer
const NOM_COURT_MAX = 14;                           // nom abrégé (sélecteur de la coupe) : tronqué au-delà
const NBSP = " ";

// ================= Formats =================
const nf0 = new Intl.NumberFormat(LANGUE, { maximumFractionDigits: 0, useGrouping: "always" });   // « 1 000 » (sans « always », le français écrit « 1000 »)
const nf1 = new Intl.NumberFormat(LANGUE, { maximumFractionDigits: 1, useGrouping: "always" });
const nf2 = new Intl.NumberFormat(LANGUE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfCoef = new Intl.NumberFormat(LANGUE, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const espaceInsecable = (t) => t.replace(/\u202f/g, NBSP);          // espace fine du français → espace insécable ordinaire (plus lisible)
const entier = (x) => espaceInsecable(nf0.format(x));
const dec1 = (x) => espaceInsecable(nf1.format(x));
const cbshTxt = (x) => nf2.format(x);
/** Valeur signée (+ / −) selon l'arrondi d'affichage ; `pas` : 1 pour un entier, 10 pour une décimale, 100 pour deux. */
function signe(x, format, pas) {
  const r = Math.round(x * pas) / pas;
  return r > 0 ? `+${format(r)}` : r < 0 ? `−${format(-r)}` : format(0);
}
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ================= État =================
let nomenclature = null;     // data/nomenclature.json
let projet = null;           // data/projet_exemple.json (copie de travail : les surfaces du scénario actif sont modifiées ici)
let typologies = null;       // index id → typologie
let zonesDonnees = null;     // data/zones.json
let resultats = {};          // clé de scénario → résultat de calculerScenario
let scenarioActif = SCENARIO_PAR_DEFAUT;   // scénario modifiable (bascule A / B)
let sauvegardeActive = false;  // vrai dès la première modification (ou après une restauration) : avant, rien n'est écrit dans le navigateur

// ================= Onglets =================
const boutons = ONGLETS.map((id) => document.getElementById(`onglet-${id}`));
const panneaux = ONGLETS.map((id) => document.getElementById(`panneau-${id}`));

/** Affiche l'onglet demandé ; `majUrl` met à jour le fragment d'URL (#accueil / #saisie / #aide). */
function afficher(id, majUrl = true) {
  if (!ONGLETS.includes(id)) id = ONGLET_PAR_DEFAUT;
  ONGLETS.forEach((nom, i) => {
    const actif = nom === id;
    boutons[i].setAttribute("aria-selected", String(actif));
    boutons[i].tabIndex = actif ? 0 : -1;
    panneaux[i].hidden = !actif;
  });
  if (majUrl) history.replaceState(null, "", `#${id}`);
}

function initialiserOnglets() {
  boutons.forEach((bouton, i) => {
    bouton.addEventListener("click", () => afficher(ONGLETS[i]));
    // Navigation au clavier : flèches gauche/droite, début/fin
    bouton.addEventListener("keydown", (e) => {
      const n = ONGLETS.length;
      const cible = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[e.key];
      if (cible === undefined) return;
      e.preventDefault();
      afficher(ONGLETS[cible]);
      boutons[cible].focus();
    });
  });
  document.querySelector(".marque").addEventListener("click", (e) => { e.preventDefault(); afficher(ONGLET_PAR_DEFAUT); });
  window.addEventListener("hashchange", () => afficher(location.hash.slice(1), false));
  afficher(location.hash.slice(1) || ONGLET_PAR_DEFAUT, false);
}

// ================= Onglet Aide =================
const AIDE_SEUIL_SECTION = 0.3;                        // une section est « courante » quand son haut a passé ce rapport de la hauteur de l'écran

/** Sommaire de l'aide : un clic fait défiler jusqu'à la section ; la section courante (celle qui a franchi le haut de l'écran,
 *  ou la dernière quand on est en bas de page) est repérée dans le sommaire. */
function initialiserAide() {
  const panneau = document.getElementById("panneau-aide");
  const liens = [...document.querySelectorAll("[data-aide-section]")];
  const sections = liens.map((lien) => document.getElementById(lien.dataset.aideSection));
  const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)");
  const marquer = (indice) => liens.forEach((lien, i) => {
    lien.classList.toggle("actif", i === indice);
    if (i === indice) lien.setAttribute("aria-current", "true"); else lien.removeAttribute("aria-current");
  });
  liens.forEach((lien, i) => lien.addEventListener("click", () => {
    sections[i].scrollIntoView({ behavior: mouvementReduit.matches ? "auto" : "smooth", block: "start" });
  }));
  let attente = false;
  const majSommaire = () => {
    attente = false;
    if (panneau.hidden) return;
    const enBas = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let courant = 0;
    sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= window.innerHeight * AIDE_SEUIL_SECTION) courant = i; });
    marquer(enBas ? sections.length - 1 : courant);
  };
  window.addEventListener("scroll", () => { if (!attente) { attente = true; requestAnimationFrame(majSommaire); } }, { passive: true });
  window.addEventListener("hashchange", majSommaire);
}

// ================= Fragments HTML =================
const classeCat = (cle) => `cat-${cle}`;

function htmlPictos(strates) {
  if (strates === null) return '<span class="tiret" aria-label="sans objet">—</span>';
  const actives = nomenclature.strates.filter((s) => strates.includes(s.cle)).map((s) => s.libelle.toLowerCase()).join(", ");
  const icones = nomenclature.strates.map((s) =>
    `<svg class="picto${strates.includes(s.cle) ? "" : " picto--off"}" width="20" height="24" aria-hidden="true"><use href="#p-${s.cle === "sedum" ? "sedum" : s.cle}"/></svg>`).join("");
  return `<span class="strates" role="img" aria-label="Strates : ${esc(actives)}">${icones}</span>`;
}

function htmlBandeau(cat) {
  const k = cat.cle;
  return `<div class="bandeau ${classeCat(k)}" role="row">
  <div class="c-typo" role="rowheader"><span class="pastille-cat"></span><span class="nom-cat">${esc(cat.libelle)}</span></div>
  <div class="c-strates" role="presentation"></div><div class="c-coef" role="presentation"></div>
  <div class="c-a-m2" role="cell" data-sortie="cat-m2-A-${k}"></div><div class="c-a-eco" role="cell" data-sortie="cat-eco-A-${k}"></div><div class="c-sep" role="presentation"></div>
  <div class="c-b-m2" role="cell" data-sortie="cat-m2-B-${k}"></div><div class="c-b-eco" role="cell" data-sortie="cat-eco-B-${k}"></div><div class="c-ecart" role="presentation"></div>
</div>`;
}

/** Cellule « m² » d'un scénario : champ de saisie pour le scénario actif, texte (lecture seule) pour l'autre. */
function htmlCelluleM2(cle, l, t) {
  const classe = `c-${cle.toLowerCase()}-m2`;
  if (cle !== scenarioActif) return `<div class="${classe}" role="cell" data-sortie="m2-${cle}-${l.n}"></div>`;
  return `<div class="${classe}" role="cell"><input type="number" class="champ" min="0" step="any" inputmode="decimal" placeholder="—" data-ligne="${l.n}" aria-label="Surface en m², scénario ${cle}, ligne ${l.n} : ${esc(t.libelle)}"></div>`;
}

function htmlLigne(l) {
  const t = typologies.get(l.typologie);
  const defaut = t.defaut ? '<span class="defaut">défaut</span>' : "";
  return `<div class="ligne" role="row">
  <div class="c-typo" role="cell"><span class="n">${l.n}</span><div><div class="nom">${esc(t.libelle)}</div><div class="cond">${esc(l.precision ?? t.condition)}</div></div></div>
  <div class="c-strates" role="cell">${htmlPictos(l.strates)}</div>
  <div class="c-coef" role="cell"><b>${nfCoef.format(t.coef)}</b>${defaut}</div>
  ${htmlCelluleM2("A", l, t)}<div class="c-a-eco" role="cell" data-sortie="eco-A-${l.n}"></div><div class="c-sep" role="presentation"></div>
  ${htmlCelluleM2("B", l, t)}
  <div class="c-b-eco" role="cell" data-sortie="eco-B-${l.n}"></div>
  <div class="c-ecart" role="cell" data-sortie="ecart-${l.n}"></div>
  <div class="c-sup" role="cell"><button type="button" class="btn-retirer btn-retirer--tableau" data-supprimer="${l.n}" hidden title="Supprimer cette ligne (vide dans les deux scénarios)" aria-label="Supprimer la ligne ${l.n} (vide dans les deux scénarios)">✕</button></div>
</div>`;
}

function htmlMosaiqueLigne(cle, res) {
  const parcelle = res.surfaceParcelle;                 // Σ des surfaces, ou valeur forcée
  const blocs = [];
  const segmentsEco = [];
  for (const l of projet.lignes) {
    const { surface, eco } = res.parLigne.get(l.n);
    if (!surface) continue;
    const t = typologies.get(l.typologie);
    const part = surface / Math.max(parcelle, res.surfaceTotale);   // un dépassement de la parcelle forcée ne déborde pas de la barre
    let contenu = "";
    if (part > SEUIL_NUMERO_MOSAIQUE) contenu += `<span class="seg-n">${l.n}</span>`;
    if (part > SEUIL_M2_MOSAIQUE) contenu += `<span class="seg-m2">${entier(surface)}${NBSP}m²</span>`;
    blocs.push(`<span class="seg-bloc ${classeCat(t.categorie)}${t.coef === 0 ? " seg--zero" : ""}" style="--part:${(part * 100).toFixed(3)}%" title="n° ${l.n} · ${esc(t.libelle)} · ${entier(surface)} m²">${contenu}</span>`);
    if (eco > 0) segmentsEco.push(`<span class="${classeCat(t.categorie)}" style="flex:0 0 ${(eco / res.ecoTotal * 100).toFixed(3)}%"></span>`);
  }
  const nom = projet.scenarios.find((s) => s.cle === cle).nom;
  const lettre = `<span class="lettre lettre-${cle.toLowerCase()} lettre--l" aria-hidden="true">${cle}</span>`;
  const partEco = parcelle > 0 ? Math.min(res.ecoTotal / parcelle * 100, 100) : 0;
  return `<div class="mosa-ligne${cle === scenarioActif ? "" : " inactif"}">
  ${lettre}
  <div class="mosa-barres">
    <div class="barre-surf" role="img" aria-label="Scénario ${cle} (${esc(nom)}) : répartition des ${entier(parcelle)} m² de la parcelle">${blocs.join("")}</div>
    <div class="barre-eco" style="--part-eco:${partEco.toFixed(3)}%"><div class="eco-remplissage">${segmentsEco.join("")}</div><span class="pastille-cbsh">CBSh ${cbshTxt(res.cbsh)}</span></div>
  </div>
  <span class="mosa-total">${entier(parcelle)}${NBSP}m²</span>
</div>`;
}

// ================= Rendu initial (structure, textes fixes) =================
function rendreStructure() {
  const { scenarios } = projet;
  document.querySelectorAll('[data-libelle="eco-amenageables"]').forEach((el) => { el.textContent = LIBELLE_ECO_AMENAGEABLES; });
  for (const { cle } of scenarios) {
    for (const id of [`kpi-${cle}`, `saisie-${cle}`]) {
      const carte = document.getElementById(id);
      carte.querySelector(".scen-nom").textContent = `Scénario ${cle}`;
      // Le nom est un bouton : un clic le remplace par un champ de saisie (renommage sur place)
      carte.querySelector(".scen-sous").innerHTML = `<button type="button" class="nom-edit" data-renommer="${cle}" title="Renommer le scénario">`
        + `<span class="nom-texte"></span><svg class="nom-crayon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg></button>`;
    }
  }
  majNomsScenarios();
  rendreTableau();
  majFacade();
}

const nomCourt = (nom) => (nom.length > NOM_COURT_MAX ? `${nom.slice(0, NOM_COURT_MAX - 1).trimEnd()}…` : nom);

/** Affiche le nom de chaque scénario partout où il apparaît (sélecteurs, cartes, coupe) ; les lettres A et B restent fixes. */
function majNomsScenarios() {
  for (const { cle, nom } of projet.scenarios) {
    document.querySelectorAll(`[data-nom-scenario="${cle}"]`).forEach((el) => { el.textContent = nom; el.title = nom; });
    document.querySelectorAll(`[data-nom-court="${cle}"]`).forEach((el) => { el.textContent = nomCourt(nom); el.title = nom; });
    document.querySelectorAll(`[data-renommer="${cle}"]`).forEach((bouton) => {
      bouton.querySelector(".nom-texte").textContent = nom;
      bouton.setAttribute("aria-label", `Renommer le scénario ${cle} (nom actuel : ${nom})`);
    });
  }
}

/** Renommage sur place : Entrée ou sortie du champ valide (un nom vide est refusé), Échap annule. */
function demarrerRenommage(bouton) {
  const scenario = projet.scenarios.find((s) => s.cle === bouton.dataset.renommer);
  const champ = document.createElement("input");
  champ.type = "text";
  champ.className = "nom-edit-champ";
  champ.maxLength = NOM_SCENARIO_MAX;
  champ.value = scenario.nom;
  champ.setAttribute("aria-label", `Nom du scénario ${scenario.cle}`);
  let termine = false;
  const terminer = (valider, rendreFocus) => {
    if (termine) return;                                   // le retrait du champ déclenche un « blur » : on ne traite qu'une fois
    termine = true;
    const nouveau = champ.value.trim();
    const change = valider && nouveau && nouveau !== scenario.nom;
    if (change) scenario.nom = nouveau;
    champ.replaceWith(bouton);
    majNomsScenarios();
    majMosaique();                                         // l'étiquette d'accessibilité des barres reprend le nom
    if (change) projetModifie();
    if (rendreFocus) bouton.focus();
  };
  champ.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); terminer(true, true); }
    else if (e.key === "Escape") { e.preventDefault(); terminer(false, true); }
  });
  champ.addEventListener("blur", () => terminer(true, false));
  bouton.replaceWith(champ);
  champ.focus();
  champ.select();
}

function initialiserRenommage() {
  document.addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-renommer]");
    if (bouton) demarrerRenommage(bouton);
  });
}

/** Tableau : un bandeau par catégorie, puis ses lignes ; champs du scénario actif à leur valeur courante. */
function rendreTableau() {
  document.getElementById("tableau-corps").innerHTML = nomenclature.categories.map((cat) => {
    const lignes = projet.lignes.filter((l) => typologies.get(l.typologie).categorie === cat.cle);
    return lignes.length ? htmlBandeau(cat) + lignes.map(htmlLigne).join("") : "";
  }).join("");
  document.querySelectorAll(".champ[data-ligne]").forEach((champ) => {
    const surface = projet.lignes.find((l) => l.n === Number(champ.dataset.ligne)).surfaces[scenarioActif];
    champ.value = surface ? String(surface) : "";                  // vide si 0 (la maquette affiche alors « — »)
  });
}

/** Ligne « façade végétalisée » (hors CBSh) du tableau. */
function majFacade() {
  const facade = projet.facade_vegetalisee;
  document.querySelector('[data-facade="precision"]').textContent = facade.precision + (facade.mentionnee ? " · mentionnée au rapport" : "");
  document.querySelector('[data-facade="surface"]').textContent = entier(facade.surface);
}

// ================= Rendu des valeurs calculées =================
/** « Parcelle · 1 000 m² (Σ des surfaces) » ou « (forcée) » : rappel du dénominateur du CBSh. */
const texteParcelle = (res) =>
  `Parcelle · ${entier(res.surfaceParcelle)}${NBSP}m²${res.forcee ? " (forcée)" : " (Σ des surfaces)"}`;

function majKpi(cle) {
  const res = resultats[cle];
  const carte = document.getElementById(`kpi-${cle}`);
  carte.querySelector(".grand").textContent = cbshTxt(res.cbsh);
  carte.querySelector(".kpi-parcelle").textContent = texteParcelle(res);
  carte.querySelector(".kpi-cats").innerHTML = nomenclature.categories.map((cat) => {
    const eco = res.parCategorie[cat.cle]?.eco ?? 0;
    return `<li class="${classeCat(cat.cle)}"><span class="cat-nom">${esc(cat.court)}</span>`
      + `<span class="cat-barre"><span class="cat-remplissage" style="width:${Math.min(eco / ECHELLE_BARRE_KPI * 100, 100).toFixed(1)}%"></span></span>`
      + `<span class="cat-val">${entier(eco)}</span></li>`;
  }).join("");
}

function majCarteSaisie(cle) {
  const res = resultats[cle];
  const carte = document.getElementById(`saisie-${cle}`);
  carte.querySelector(".grand").textContent = cbshTxt(res.cbsh);
  carte.querySelector(".kpi-detail").textContent = `CBSh · ${entier(res.ecoTotal)}${NBSP}m² éco`;
  carte.querySelector(".kpi-parcelle").textContent = texteParcelle(res);
  carte.querySelector(".liste-cats").innerHTML = nomenclature.categories.map((cat) =>
    `<li class="${classeCat(cat.cle)}"><span class="pastille-cat"></span><span>${esc(cat.libelle)}</span>`
    + `<strong>${entier(res.parCategorie[cat.cle]?.eco ?? 0)}${NBSP}m²</strong></li>`).join("");
  // Contrôle Σ surfaces ≤ surface de la parcelle (toujours vrai quand la parcelle = Σ)
  const controle = carte.querySelector(".controle");
  const { conforme, ecart } = res.controle;
  controle.classList.toggle("controle--alerte", !conforme);
  if (!conforme) controle.textContent = `⚠ Σ surfaces = ${dec1(res.surfaceTotale)} > parcelle ${entier(res.surfaceParcelle)}${NBSP}m² (${signe(ecart, dec1, 10)})`;
  else if (res.forcee) controle.textContent = `✓ Σ surfaces = ${dec1(res.surfaceTotale)} / ${entier(res.surfaceParcelle)}${NBSP}m² · ${dec1(res.nonComptee)}${NBSP}m² non comptés`;
  else controle.textContent = `✓ Parcelle = Σ surfaces = ${entier(res.surfaceTotale)}${NBSP}m²`;
}

/** Texte de chaque cellule du tableau (clé = data-sortie). */
function valeursTableau() {
  const v = {};
  const [rA, rB] = [resultats[SCENARIO_BASE], resultats[SCENARIO_VARIANTE]];     // colonnes A et B fixes ; écart = B − A
  const m2 = (x) => (x ? entier(x) : "—");
  const eco = (ligne) => (ligne.surface ? dec1(ligne.eco) : "—");     // « — » seulement sans surface (0 si coefficient nul)
  for (const l of projet.lignes) {
    const a = rA.parLigne.get(l.n), b = rB.parLigne.get(l.n);
    v[`m2-A-${l.n}`] = m2(a.surface);
    v[`m2-B-${l.n}`] = m2(b.surface);
    v[`eco-A-${l.n}`] = eco(a);
    v[`eco-B-${l.n}`] = eco(b);
    const d = b.eco - a.eco;
    v[`ecart-${l.n}`] = Math.abs(d) < SEUIL_ECART_AFFICHE ? "" : signe(d, dec1, 10);
  }
  for (const cat of nomenclature.categories) {
    const k = cat.cle;
    v[`cat-m2-A-${k}`] = entier(rA.parCategorie[k]?.surface ?? 0);
    v[`cat-eco-A-${k}`] = entier(rA.parCategorie[k]?.eco ?? 0);
    v[`cat-m2-B-${k}`] = entier(rB.parCategorie[k]?.surface ?? 0);
    v[`cat-eco-B-${k}`] = entier(rB.parCategorie[k]?.eco ?? 0);
  }
  v["total-m2-A"] = entier(rA.surfaceTotale);
  v["total-eco-A"] = dec1(rA.ecoTotal);
  v["total-m2-B"] = entier(rB.surfaceTotale);
  v["total-eco-B"] = dec1(rB.ecoTotal);
  v["total-ecart"] = signe(rB.ecoTotal - rA.ecoTotal, dec1, 10);
  v["parcelle-A"] = entier(rA.surfaceParcelle);
  v["parcelle-B"] = entier(rB.surfaceParcelle);
  v["parcelle-mode-A"] = rA.forcee ? "forcée" : "= Σ";
  v["parcelle-mode-B"] = rB.forcee ? "forcée" : "= Σ";
  return v;
}

function majTableau() {
  const valeurs = valeursTableau();
  document.querySelectorAll("[data-supprimer]").forEach((bouton) => {       // ✕ visible seulement si la ligne vaut 0 dans les deux scénarios
    const n = Number(bouton.dataset.supprimer);
    bouton.hidden = !projet.scenarios.every(({ cle }) => resultats[cle].parLigne.get(n).surface === 0);
  });
  document.querySelectorAll("[data-sortie]").forEach((el) => {
    const cle = el.dataset.sortie;
    const texte = valeurs[cle] ?? "";
    if (!cle.startsWith("parcelle-mode-")) el.textContent = texte;
    if (/^(m2|eco)-/.test(cle)) el.classList.toggle("vide", texte === "—");          // cellules sans surface : grisées
    if (cle.startsWith("parcelle-mode-")) {                                       // pastille « forcée » / « = Σ »
      el.innerHTML = `<span class="mode-parcelle${texte === "forcée" ? " forcee" : ""}">${texte}</span>`;
    }
    if (cle.startsWith("ecart-")) {
      el.classList.toggle("plus", texte.startsWith("+"));
      el.classList.toggle("moins", texte.startsWith("−"));
    }
  });
}

/** Nom court d'une ligne pour son étiquette : intitulé de typologie + précision (strates ou matériau) ; le texte complet est en infobulle. */
function nomEtiquette(l, t) {
  const detail = t.strates ? t.condition.split(" · ").at(-1) : (l.precision ?? t.condition);
  return `${t.libelle} · ${detail}`;
}

/** Vrai si les segments [a1 a2] et [b1 b2] se croisent (test d'orientation). */
function segmentsSeCroisent(a1, a2, b1, b2) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a1, a2, b1) !== o(a1, a2, b2) && o(b1, b2, a1) !== o(b1, b2, a2);
}

/** Range les étiquettes d'une colonne de haut en bas de façon à limiter les croisements de traits : départ = ordre des repères
 *  en hauteur, puis échanges de deux étiquettes tant que le nombre de croisements diminue. `reperes` est modifié (réordonné).
 *  `xCoude` : abscisse du coude des traits de cette colonne. */
function ordonnerEtiquettes(reperes, yDe, xCoude) {
  const croisements = () => {
    let n = 0;
    for (let i = 0; i < reperes.length; i++) {
      for (let j = i + 1; j < reperes.length; j++) {
        const a = reperes[i], b = reperes[j];
        if (segmentsSeCroisent({ x: xCoude, y: yDe(i) }, a, { x: xCoude, y: yDe(j) }, b)) n++;
      }
    }
    return n;
  };
  let meilleur = croisements();
  for (let passe = 0, ameliore = true; ameliore && passe < 50; passe++) {
    ameliore = false;
    for (let i = 0; i < reperes.length; i++) {
      for (let j = i + 1; j < reperes.length; j++) {
        [reperes[i], reperes[j]] = [reperes[j], reperes[i]];
        const n = croisements();
        if (n < meilleur) { meilleur = n; ameliore = true; }
        else [reperes[i], reperes[j]] = [reperes[j], reperes[i]];          // pas mieux : on annule l'échange
      }
    }
  }
}

/** Étiquettes et traits de repère : une par ligne rattachée à une zone, réparties en deux colonnes de part et d'autre de l'illustration
 *  (côté de la moitié de la scène où se trouve le repère ; au plus ETIQ_MAX_PAR_COTE par côté), chacune rangée dans l'ordre qui limite
 *  les croisements de traits. Les lignes sans surface dans le scénario actif restent affichées, atténuées (0 m²). Chaque étiquette
 *  est un bouton : un clic ouvre la popup de sa zone. */
function rendreEtiquettes() {
  const res = resultats[scenarioActif];
  const [vx, vy, vl] = zonesDonnees.viewBox.split(" ").map(Number);
  const echelle = PLAN_LARGEUR_AXO / vl;                      // axo (repère du SVG) → scène
  const reperes = [];
  const rangDansZone = new Map();
  for (const l of projet.lignes) {
    const zone = zoneDeLigne(l);
    if (!zone) continue;
    const [ax, ay] = zone.ancres?.[l.n] ?? zone.ancre;
    const rang = rangDansZone.get(zone.id) ?? 0;              // deux lignes d'une même zone : repères légèrement décalés
    rangDansZone.set(zone.id, rang + 1);
    reperes.push({ l, zone, x: PLAN_X_AXO + (ax - vx) * echelle, y: (ay - vy) * echelle + rang * ETIQ_DECALAGE_REPERE });
  }
  // Répartition gauche / droite ; si un côté déborde, ses repères les plus proches du centre passent de l'autre côté
  const milieu = PLAN_LARGEUR / 2;
  const gauche = reperes.filter((r) => r.x < milieu), droite = reperes.filter((r) => r.x >= milieu);
  const alleger = (trop, autre) => {
    trop.sort((a, b) => Math.abs(a.x - milieu) - Math.abs(b.x - milieu));
    while (trop.length > ETIQ_MAX_PAR_COTE && autre.length < ETIQ_MAX_PAR_COTE) autre.push(trop.shift());
  };
  if (gauche.length > ETIQ_MAX_PAR_COTE) alleger(gauche, droite);
  else if (droite.length > ETIQ_MAX_PAR_COTE) alleger(droite, gauche);

  let etiquettes = "", liens = "";
  const colonne = (liste, xEtiq, xBord, xCoude) => {
    liste.sort((a, b) => a.y - b.y || a.l.n - b.l.n);        // ordre de départ : hauteur des repères
    const n = liste.length;
    const pas = n > 1 ? Math.min(ETIQ_PAS_MAX, (PLAN_HAUTEUR - ETIQ_HAUTEUR) / (n - 1)) : 0;
    const haut = (PLAN_HAUTEUR - ETIQ_HAUTEUR - pas * (n - 1)) / 2 + ETIQ_HAUTEUR / 2;     // pile centrée verticalement
    ordonnerEtiquettes(liste, (i) => haut + i * pas, xCoude);
    liste.forEach(({ l, zone, x, y }, i) => {
      const t = typologies.get(l.typologie);
      const { surface, coef, eco } = res.parLigne.get(l.n);
      const yEtiq = haut + i * pas;
      const zero = surface === 0 ? " etiq--zero" : "";
      etiquettes += `<button type="button" class="etiq ${classeCat(t.categorie)}${zero}" data-ligne="${l.n}" data-zone="${zone.id}" style="--y:${yEtiq.toFixed(1)};--x:${xEtiq}" `
        + `title="n° ${l.n} · ${esc(t.libelle)} · ${esc(l.precision ?? t.condition)} — cliquer pour saisir les surfaces" `
        + `aria-label="Saisir les surfaces, ligne ${l.n} : ${esc(nomEtiquette(l, t))} (${esc(zone.libelle)})">`
        + `<span class="etiq-n">${l.n}</span><span class="etiq-nom">${esc(nomEtiquette(l, t))}</span>`
        + `<span class="etiq-calc">${entier(surface)}${NBSP}m² × ${nfCoef.format(coef)}</span><span class="etiq-eco">${dec1(eco)}${NBSP}éco</span></button>`;
      liens += `<g class="${zero ? "lien--zero" : ""}"><polyline points="${xBord},${yEtiq.toFixed(1)} ${xCoude},${yEtiq.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}"/>`
        + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/></g>`;
    });
  };
  colonne(gauche, 0, ETIQ_LARGEUR, PLAN_X_AXO + ETIQ_COUDE_DANS_AXO);
  colonne(droite, ETIQ_X_DROITE, ETIQ_X_DROITE, PLAN_X_AXO + PLAN_LARGEUR_AXO - ETIQ_COUDE_DANS_AXO);
  document.getElementById("etiquettes").innerHTML = etiquettes;
  document.getElementById("liens").innerHTML = liens;
}

function majGain() {
  const g = ecartScenarios(resultats[SCENARIO_BASE], resultats[SCENARIO_VARIANTE]);
  document.getElementById("gain-valeur").textContent = signe(g.cbsh, cbshTxt, 100);
  document.getElementById("gain-m2").textContent = `${signe(g.eco, entier, 1)}${NBSP}m² ${LIBELLE_ECO_AMENAGEABLES}`;
}

function majMosaique() {
  document.getElementById("mosaique-lignes").innerHTML =
    projet.scenarios.map(({ cle }) => htmlMosaiqueLigne(cle, resultats[cle])).join("");
}

const scenarioCourant = () => projet.scenarios.find((s) => s.cle === scenarioActif);
const autreScenario = () => projet.scenarios.find((s) => s.cle !== scenarioActif).cle;

/** Surface de parcelle forcée du scénario (null = somme des surfaces). */
function surfaceForcee(cle) {
  return projet.scenarios.find((s) => s.cle === cle).surface_parcelle ?? null;
}

/** Recalcule les deux scénarios puis met à jour tout l'affichage (sans toucher aux champs de saisie). */
function recalculer() {
  for (const { cle } of projet.scenarios) {
    resultats[cle] = calculerScenario(projet.lignes, typologies, cle, surfaceForcee(cle));
  }
  // Le champ de la parcelle propose la somme des surfaces du scénario actif tant qu'il est vide
  document.getElementById("champ-parcelle").placeholder = entier(resultats[scenarioActif].surfaceTotale);
  for (const { cle } of projet.scenarios) { majKpi(cle); majCarteSaisie(cle); }
  majGain();
  majGrisage();
  rendreEtiquettes();
  majMosaique();
  majTableau();
}

// ================= Bascule de scénario =================
/** Place le champ « surface de la parcelle » dans la colonne du scénario actif (texte en lecture seule dans l'autre). */
function placerChampParcelle() {
  const champ = document.getElementById("champ-parcelle");
  for (const { cle } of projet.scenarios) {
    const cellule = document.querySelector(`[data-cellule-parcelle="${cle}"]`);
    cellule.querySelector("[data-sortie]").hidden = cle === scenarioActif;
    if (cle === scenarioActif) cellule.append(champ);
  }
  champ.value = scenarioCourant().surface_parcelle ?? "";
  champ.setAttribute("aria-label", `Surface de la parcelle en m², scénario ${scenarioActif} (vide = somme des surfaces)`);
  champ.setAttribute("aria-invalid", "false");
}

/** Change le scénario modifiable et met à jour les repères : sélecteurs, cartes, fonds, filigrane, colonnes du tableau, mosaïque. */
function definirScenarioActif(cle) {
  scenarioActif = cle;
  document.body.dataset.scenario = cle;                    // fond de l'illustration et de la coupe (variable CSS --fond-scenario)
  document.getElementById("tableau-saisie").dataset.actif = cle;
  for (const { cle: k } of projet.scenarios) {
    for (const id of [`kpi-${k}`, `saisie-${k}`]) {
      document.getElementById(id).classList.toggle("carte--actif", k === cle);
      document.getElementById(id).classList.toggle("inactif", k !== cle);
    }
  }
  document.querySelectorAll("button[data-scenario]").forEach((bouton) => {      // sélecteurs (.seg) et cartes de résultat (.carte-bascule)
    const actif = bouton.dataset.scenario === cle;
    bouton.classList.toggle("actif", actif);
    bouton.setAttribute("aria-pressed", String(actif));
  });
  document.querySelector(".filigrane").textContent = cle;
  rendreTableau();                                         // champs de saisie dans la colonne du scénario actif
  placerChampParcelle();
  recalculer();
}

function initialiserBascule() {
  document.querySelectorAll("button[data-scenario]").forEach((bouton) => {      // sélecteurs du plan et de la coupe, cartes de résultat
    bouton.addEventListener("click", () => {
      if (bouton.dataset.scenario === scenarioActif) return;
      definirScenarioActif(bouton.dataset.scenario);
      sauvegarder();                                       // le scénario affiché fait partie de la sauvegarde
    });
  });
}

// ================= Saisie =================
/** Surface saisie dans une cellule du scénario actif : vide = 0 ; refusée si négative ou illisible. */
function surfaceSaisie(champ) {
  if (champ.validity.badInput) return null;
  const brut = champ.value.trim();
  if (brut === "") return 0;
  const v = Number(brut);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

/** Surface de parcelle saisie : vide = null (somme des surfaces) ; refusée (undefined) si ≤ 0 ou illisible. */
function parcelleSaisie(champ) {
  if (champ.validity.badInput) return undefined;
  const brut = champ.value.trim();
  if (brut === "") return null;
  const v = Number(brut);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

function initialiserSaisie() {
  const champParcelle = document.getElementById("champ-parcelle");
  champParcelle.addEventListener("input", () => {
    const v = parcelleSaisie(champParcelle);
    champParcelle.setAttribute("aria-invalid", String(v === undefined));
    if (v === undefined) return;                           // valeur invalide : le calcul garde la dernière valeur valide
    scenarioCourant().surface_parcelle = v;
    recalculer();
    projetModifie();
  });
  champParcelle.addEventListener("focusout", () => {
    if (parcelleSaisie(champParcelle) !== undefined) return;
    champParcelle.value = scenarioCourant().surface_parcelle ?? "";
    champParcelle.setAttribute("aria-invalid", "false");
  });
  const corps = document.getElementById("tableau-corps");
  corps.addEventListener("click", (e) => {                 // ✕ d'une ligne vide dans les deux scénarios : suppression immédiate
    const bouton = e.target.closest("[data-supprimer]");
    if (!bouton) return;
    const ligne = ligneDe(Number(bouton.dataset.supprimer));
    if (!ligne || !ligneVide(ligne)) return;
    supprimerLigne(ligne);
    rendreTableau();
    recalculer();
    projetModifie();
    document.querySelector(".bouton-ajout").focus();       // le bouton cliqué n'existe plus : le focus reste dans la carte du tableau
  });
  corps.addEventListener("input", (e) => {
    const champ = e.target.closest(".champ");
    if (!champ) return;
    const surface = surfaceSaisie(champ);
    champ.setAttribute("aria-invalid", String(surface === null));
    if (surface === null) return;                          // valeur invalide : le calcul garde la dernière valeur valide
    projet.lignes.find((l) => l.n === Number(champ.dataset.ligne)).surfaces[scenarioActif] = surface;
    recalculer();
    projetModifie();
  });
  corps.addEventListener("focusout", (e) => {              // à la sortie du champ, on revient à la dernière valeur valide
    const champ = e.target.closest(".champ");
    if (!champ || surfaceSaisie(champ) !== null) return;
    const l = projet.lignes.find((x) => x.n === Number(champ.dataset.ligne));
    champ.value = l.surfaces[scenarioActif] ? String(l.surfaces[scenarioActif]) : "";
    champ.setAttribute("aria-invalid", "false");
  });
}

// ================= Zones cliquables et popups =================
const popup = document.getElementById("popup-zone");
let declencheur = null;      // étiquette qui a ouvert la popup (elle est redessinée à la validation : le focus lui est rendu par son n° de ligne)
let brouillon = null;        // saisie en cours dans la popup : { zone, categorie, lignes: [lignes brouillon] } (rien n'est appliqué avant « Valider »)

const ligneDe = (n) => projet.lignes.find((l) => l.n === n);
const libelleCategorie = (cle) => nomenclature.categories.find((c) => c.cle === cle).libelle;
const typologieDefaut = (cat) => nomenclature.typologies.find((t) => t.categorie === cat && t.defaut);
/** Strates par défaut d'une typologie : les premières de la liste autorisée (ex. 2 strates → herbacées + arbustes). */
const stratesParDefaut = (t) => (t.strates ? t.strates.parmi.slice(0, t.strates.nombre) : null);
const surfaceActive = (ligne) => ligne.surfaces[scenarioActif] ?? 0;

const trouverZone = (id) => zonesDonnees.zones.find((z) => z.id === id);

/** Zone de saisie d'une ligne : celle qui la liste (zones.json), sinon celle mémorisée sur la ligne (ligne créée) ; undefined si aucune. */
const zoneDeLigne = (ligne) => zonesDonnees.zones.find((z) => z.type === "saisie" && (z.lignes.includes(ligne.n) || z.id === ligne.zone));
const lignesDeZone = (zone) => projet.lignes.filter((l) => zoneDeLigne(l)?.id === zone.id);
const zonesDeSaisie = (categorie) => zonesDonnees.zones.filter((z) => z.type === "saisie" && z.categorie === categorie);

/** Toitures : une « classe » par épaisseur de substrat (libellé de typologie), avec ses variantes de strates. */
function classesToiture() {
  const classes = new Map();
  for (const t of nomenclature.typologies.filter((x) => x.categorie === "bat")) {
    if (!classes.has(t.libelle)) {
      classes.set(t.libelle, {
        libelle: t.libelle,
        nom: t.strates ? t.condition.split(" · ")[0] : t.libelle,       // « Substrat < 8 cm » ou « Toiture classique »
        detail: t.strates ? t.libelle : t.condition,
        typos: [],
      });
    }
    classes.get(t.libelle).typos.push(t);
  }
  return [...classes.values()];
}
const stratesPossibles = (classe) => new Set(classe.typos.flatMap((t) => t.strates?.parmi ?? []));

/** Typologie correspondant à une ligne du brouillon (null si la combinaison n'existe pas dans la nomenclature). */
function typologieDe(d) {
  if (brouillon.categorie !== "bat") return typologies.get(d.typologie);
  if (d.inconnu) return typologieDefaut("bat");
  const classe = classesToiture().find((c) => c.libelle === d.classe);
  return classe.typos.find((t) => strateValide(t, t.strates ? d.strates : null)) ?? null;
}

function ligneBrouillon(ligne) {
  const t = typologies.get(ligne.typologie);
  return { ligne, typologie: t.id, classe: t.libelle, strates: [...(ligne.strates ?? [])], inconnu: false,
           surface: surfaceActive(ligne), surfaceValide: true, supprimee: false };
}
function nouvelleLigneBrouillon(cat) {
  const t = typologieDefaut(cat);
  return { ligne: null, typologie: t.id, classe: t.libelle, strates: [...(stratesParDefaut(t) ?? [])], inconnu: false,
           surface: 0, surfaceValide: true, supprimee: false };
}

// ---------- Calque de zones ----------
function rendreZones() {
  const svg = document.getElementById("zones");
  svg.setAttribute("viewBox", zonesDonnees.viewBox);
  // Deux calques sous les zones cliquables : zones à 0 m² grisées, puis copie en couleur de la zone sélectionnée (au-dessus du gris)
  svg.innerHTML = '<g id="calque-gris"></g><g id="calque-focus"></g>' + zonesDonnees.zones.map((z) => {
    const attributs = `d="${z.chemin}" data-zone="${z.id}"`;
    if (z.type === "inerte") return `<path class="zone-axo zone-axo--inerte" ${attributs} aria-hidden="true"/>`;     // aucun événement, pas d'infobulle
    const classe = z.type === "saisie" ? classeCat(z.categorie) : "zone-axo--info";
    return `<path class="zone-axo ${classe}" ${attributs} tabindex="0" role="button" aria-label="${esc(z.libelle)}"><title>${esc(z.libelle)}</title></path>`;
  }).join("");
  svg.addEventListener("click", (e) => {
    const zone = e.target.closest(".zone-axo:not(.zone-axo--inerte)");
    if (zone) ouvrirPopup(zone.dataset.zone);
  });
  svg.addEventListener("keydown", (e) => {
    const zone = e.target.closest(".zone-axo:not(.zone-axo--inerte)");
    if (zone && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ouvrirPopup(zone.dataset.zone); }
  });
  // Survol (souris ou clavier) d'une zone : ses étiquettes se surlignent
  for (const [evenement, actif] of [["mouseover", true], ["mouseout", false], ["focusin", true], ["focusout", false]]) {
    svg.addEventListener(evenement, (e) => {
      const zone = e.target.closest(".zone-axo[data-zone]");
      if (zone) document.querySelectorAll(`.etiq[data-zone="${zone.dataset.zone}"]`).forEach((el) => el.classList.toggle("etiq--survol", actif));
    });
  }
  // Survol (souris ou clavier) d'une étiquette : sa zone se surligne ; clic : popup de la zone, focus sur la surface de la ligne
  const etiquettes = document.getElementById("etiquettes");
  for (const [evenement, actif] of [["mouseover", true], ["mouseout", false], ["focusin", true], ["focusout", false]]) {
    etiquettes.addEventListener(evenement, (e) => {
      const etiq = e.target.closest(".etiq");
      if (etiq) svg.querySelector(`.zone-axo[data-zone="${etiq.dataset.zone}"]`)?.classList.toggle("zone-axo--survol", actif);
    });
  }
  etiquettes.addEventListener("click", (e) => {
    const etiq = e.target.closest(".etiq");
    if (etiq) ouvrirPopup(etiq.dataset.zone, { ligne: Number(etiq.dataset.ligne) });
  });
}

// ---------- Zones à 0 m² grisées ----------
/** Grise, dans le scénario actif, les zones de saisie dont toutes les lignes valent 0 m² : copie désaturée de l'illustration découpée
 *  sur leurs contours, posée sur le fond du scénario. Les zones restent cliquables (c'est ainsi qu'on y saisit une première surface). */
function majGrisage() {
  const calque = document.getElementById("calque-gris");
  const grises = zonesDonnees.zones.filter((z) => z.type === "saisie" && lignesDeZone(z).every((l) => surfaceActive(l) === 0));
  if (!grises.length) { calque.innerHTML = ""; return; }
  const [x, y, largeur, hauteur] = zonesDonnees.viewBox.split(" ");
  calque.innerHTML = `<defs><clipPath id="decoupe-gris">${grises.map((z) => `<path d="${z.chemin}"/>`).join("")}</clipPath></defs>`
    + `<rect x="${x}" y="${y}" width="${largeur}" height="${hauteur}" style="fill:var(--fond-scenario)" clip-path="url(#decoupe-gris)" pointer-events="none"/>`
    + `<image class="axo-gris" href="${CHEMIN_AXO}" x="${x}" y="${y}" width="${largeur}" height="${hauteur}" clip-path="url(#decoupe-gris)" pointer-events="none"/>`;
}

// ---------- Contenu des popups ----------
function htmlBandeauPopup() {
  const nom = scenarioCourant().nom;
  return `<header class="popup-bandeau"><span class="lettre lettre-${scenarioActif.toLowerCase()} lettre--l" aria-hidden="true">${scenarioActif}</span>
    <div><p class="popup-scen">Scénario ${scenarioActif}</p><p class="popup-nom">${esc(nom)}</p></div></header>`;
}

/** Choix de la typologie d'une ligne : épaisseur + strates pour les toitures, liste déroulante pour les autres catégories. */
function htmlChoixLigne(categorie) {
  if (categorie === "bat") {
    const classes = classesToiture().map((c) => `<option value="${esc(c.libelle)}">${esc(c.nom)} · ${esc(c.detail)}</option>`).join("");
    const strates = nomenclature.strates.map((s) => `<label class="choix choix--court"><input type="checkbox" name="strate" value="${s.cle}">
      <span class="choix-nom">${esc(s.libelle)}</span></label>`).join("");
    const defaut = typologieDefaut("bat");
    return `<label class="champ-libelle">Épaisseur de substrat<select name="classe" class="select-popup">${classes}</select></label>
      <fieldset class="choix-groupe"><legend>Strates <span class="legende-note">arbustes et arbres : ≥ 20 % de la surface</span></legend><div class="choix-ligne">${strates}</div></fieldset>
      <label class="choix choix--inconnu"><input type="checkbox" name="inconnu"><span class="choix-nom">Je ne sais pas</span>
      <span class="choix-cond">coefficient par défaut · ${esc(defaut.libelle)} · ${esc(defaut.condition)}</span></label>`;
  }
  const options = nomenclature.typologies.filter((t) => t.categorie === categorie)
    .map((t) => `<option value="${t.id}">${esc(t.libelle)} · ${esc(t.condition)} (coef. ${nfCoef.format(t.coef)})</option>`).join("");
  return `<label class="champ-libelle">Typologie · coefficient<select name="typo" class="select-popup">${options}</select></label>`;
}

/** Une ligne du brouillon, sur 2 colonnes : choix de typologie à gauche ; surface, rappel de l'autre scénario et résultat à droite. */
function htmlLignePopup(d, i) {
  const titre = d.ligne ? `Ligne n° ${d.ligne.n}` : "Nouvelle ligne";
  if (d.supprimee) {
    const autre = d.ligne.surfaces[autreScenario()] ?? 0;
    const nomAutre = projet.scenarios.find((s) => s.cle === autreScenario()).nom;
    const message = autre > 0
      ? `${titre} : surface remise à 0 en « ${esc(scenarioCourant().nom)} » à la validation. Elle reste dans « ${esc(nomAutre)} » (${entier(autre)}${NBSP}m²) : remettez-la à 0 là aussi pour retirer la ligne.`
      : `${titre} : supprimée à la validation (0${NBSP}m² dans les deux scénarios).`;
    return `<section class="ligne-popup ligne-popup--supprimee" data-i="${i}"><p>${message}</p>
      <button type="button" class="btn" data-action="retablir-ligne">Rétablir</button></section>`;
  }
  const ref = d.ligne ? `<span class="popup-ref">Scénario ${autreScenario()} (lecture seule) : ${entier(d.ligne.surfaces[autreScenario()] ?? 0)}${NBSP}m²</span>` : "";
  return `<section class="ligne-popup" data-i="${i}">
    <div class="ligne-popup-tete"><b>${titre}</b><button type="button" class="btn-retirer" data-action="supprimer-ligne" title="Mettre à 0 m² dans ce scénario. La ligne est supprimée quand elle vaut 0 dans les deux." aria-label="Mettre cette ligne à 0 m² dans ce scénario (supprimée si elle vaut 0 dans les deux)">✕</button></div>
    <div class="ligne-popup-g">${htmlChoixLigne(brouillon.categorie)}</div>
    <div class="ligne-popup-d">
      <div class="popup-surface"><label>Surface <input type="number" class="champ champ--popup" min="0" step="any" inputmode="decimal" value="${d.surface || ""}" placeholder="0"></label><span>m²</span>${ref}</div>
      <div class="popup-resultat"></div>
    </div>
  </section>`;
}

function htmlPopup() {
  const { zone, categorie } = brouillon;
  return `${htmlBandeauPopup()}
  <div class="popup-corps">
    <div class="popup-entete">
      <h2 id="popup-titre" class="popup-titre"><span class="pastille-cat ${classeCat(categorie)}"></span>${esc(libelleCategorie(categorie))}</h2>
      <p class="popup-sous">${esc(zone.libelle)}</p>
    </div>
    ${zone.note ? `<p class="popup-note">${esc(zone.note)}</p>` : ""}
    <div id="popup-lignes" class="popup-lignes"></div>
    <button type="button" class="btn btn--ajout" data-action="ajouter-ligne">+ Ajouter une typologie</button>
  </div>
  <footer class="popup-pied">
    <span class="popup-pied-espace"></span>
    <button type="button" class="btn" data-action="annuler">Annuler</button>
    <button type="button" class="btn btn--plein" data-action="valider">Valider dans ${scenarioActif}</button>
  </footer>`;
}

function htmlPopupInfo(zone) {
  return `${htmlBandeauPopup()}
  <div class="popup-corps">
    <h2 id="popup-titre" class="popup-titre"><span class="info" aria-hidden="true">i</span>${esc(zone.info.titre)}</h2>
    <p class="popup-texte">${esc(zone.info.texte)}</p>
  </div>
  <footer class="popup-pied"><span class="popup-pied-espace"></span><button type="button" class="btn btn--plein" data-action="annuler">Fermer</button></footer>`;
}

function htmlPopupFacade() {
  const f = projet.facade_vegetalisee;
  return `${htmlBandeauPopup()}
  <div class="popup-corps">
    <h2 id="popup-titre" class="popup-titre"><span class="info" aria-hidden="true">i</span>Façade végétalisée</h2>
    <p class="popup-sous">${esc(f.precision)}</p>
    <p class="popup-alerte">Non comptabilisée dans le CBSh</p>
    <p class="popup-note">Le CBSh repose sur les surfaces en projection horizontale (sol et toitures) : une façade n'entre pas dans le calcul. Elle peut toutefois être mentionnée dans le rapport.</p>
    <div class="popup-surface"><label for="popup-facade-surface">Surface indicative</label>
      <input type="number" class="champ champ--popup" id="popup-facade-surface" min="0" step="any" inputmode="decimal" value="${f.surface || ""}" placeholder="0"><span>m²</span></div>
    <label class="choix choix--inconnu"><input type="checkbox" id="popup-facade-mention"${f.mentionnee ? " checked" : ""}><span class="choix-nom">Mentionner dans le rapport (hors CBSh)</span></label>
    <div class="popup-resultat"><p class="res-calc">Contribution au CBSh : <b>0${NBSP}m² éco</b></p></div>
  </div>
  <footer class="popup-pied"><span class="popup-pied-espace"></span><button type="button" class="btn btn--plein" data-action="annuler">Fermer</button></footer>`;
}

/** Choix de la catégorie d'une surface à ajouter (bouton « + Ajouter une surface » du tableau). */
function htmlPopupCategorie() {
  const boutons = nomenclature.categories.map((c) => `<button type="button" class="btn btn--categorie" data-categorie="${c.cle}">
    <span class="pastille-cat ${classeCat(c.cle)}"></span>${esc(c.libelle)}</button>`).join("");
  return `${htmlBandeauPopup()}
  <div class="popup-corps">
    <h2 id="popup-titre" class="popup-titre">Ajouter une surface</h2>
    <p class="popup-sous">Catégorie de la surface</p>
    <div class="choix-categories">${boutons}</div>
  </div>
  <footer class="popup-pied"><span class="popup-pied-espace"></span><button type="button" class="btn" data-action="annuler">Annuler</button></footer>`;
}

/** Choix de la zone de l'illustration qui recevra la nouvelle surface (toute ligne appartient à une zone). */
function htmlPopupZones(categorie) {
  const boutons = zonesDeSaisie(categorie).map((z) => `<button type="button" class="btn btn--categorie" data-zone-choix="${z.id}">
    <span class="pastille-cat ${classeCat(categorie)}"></span>${esc(z.libelle)}</button>`).join("");
  return `${htmlBandeauPopup()}
  <div class="popup-corps">
    <h2 id="popup-titre" class="popup-titre"><span class="pastille-cat ${classeCat(categorie)}"></span>${esc(libelleCategorie(categorie))}</h2>
    <p class="popup-sous">Zone de l'illustration qui recevra la surface</p>
    <div class="choix-categories">${boutons}</div>
  </div>
  <footer class="popup-pied"><span class="popup-pied-espace"></span><button type="button" class="btn" data-action="annuler">Annuler</button></footer>`;
}

// ---------- Synchronisation des contrôles ----------
/** Met à jour les contrôles d'une ligne du brouillon, son résultat, et l'état du bouton « Valider ». */
function majLignePopup(i) {
  const d = brouillon.lignes[i];
  const carte = popup.querySelector(`.ligne-popup[data-i="${i}"]`);
  if (d.supprimee) return;
  if (brouillon.categorie === "bat") {
    const classe = classesToiture().find((c) => c.libelle === d.classe);
    const possibles = stratesPossibles(classe);
    const select = carte.querySelector('select[name="classe"]');
    select.value = d.classe; select.disabled = d.inconnu;
    carte.querySelectorAll('input[name="strate"]').forEach((el) => {
      el.checked = d.strates.includes(el.value);
      el.disabled = d.inconnu || !possibles.has(el.value);              // ex. sédum seulement en extensif −
    });
    carte.querySelector('input[name="inconnu"]').checked = d.inconnu;
  } else {
    carte.querySelector('select[name="typo"]').value = String(d.typologie);
  }
  const t = typologieDe(d);
  const resultat = carte.querySelector(".popup-resultat");
  resultat.classList.toggle("popup-resultat--alerte", !t);
  resultat.innerHTML = t
    ? `<p class="res-typo"><b>${esc(t.libelle)}</b> · ${esc(t.condition)}</p>
       <p class="res-calc">Coef. <b>${nfCoef.format(t.coef)}</b>${d.inconnu ? " (par défaut)" : ""} × ${entier(d.surface)}${NBSP}m² = <b>${dec1(t.coef * d.surface)}${NBSP}m² éco</b></p>`
    : `<p class="res-typo">Combinaison de strates absente de la nomenclature pour cette épaisseur.</p>`;
}

function majPopup() {
  brouillon.lignes.forEach((_, i) => majLignePopup(i));
  const valide = brouillon.lignes.every((d) => d.supprimee || (typologieDe(d) && d.surfaceValide));
  popup.querySelector('[data-action="valider"]').disabled = !valide;
}

/** (Re)dessine les lignes du brouillon puis synchronise les contrôles. */
function rendreLignesPopup() {
  const conteneur = popup.querySelector("#popup-lignes");
  conteneur.innerHTML = brouillon.lignes.length
    ? brouillon.lignes.map(htmlLignePopup).join("")
    : `<p class="popup-note">Aucune surface dans cette zone.</p>`;
  majPopup();
}

// ---------- Ouverture, saisie, validation ----------
function montrerPopup() {
  if (!popup.open) popup.showModal();
  popup.querySelector("input:checked")?.scrollIntoView({ block: "nearest" });
  popup.querySelector(".champ--popup")?.focus();                        // focus sur une surface (plutôt que sur le 1er choix)
}

// ---------- Grisage hors zone sélectionnée ----------
/** Grise l'illustration et superpose une copie en couleur découpée sur le contour de la zone (fond du scénario compris). */
function focaliserZone(idZone) {
  retirerFocus();
  const zone = zonesDonnees.zones.find((z) => z.id === idZone);
  if (!zone?.chemin) return;
  const [x, y, largeur, hauteur] = zonesDonnees.viewBox.split(" ");
  document.getElementById("calque-focus").innerHTML =
    `<defs><clipPath id="decoupe-focus"><path d="${zone.chemin}"/></clipPath></defs>`
    + `<rect x="${x}" y="${y}" width="${largeur}" height="${hauteur}" style="fill:var(--fond-scenario)" clip-path="url(#decoupe-focus)" pointer-events="none"/>`
    + `<image href="${CHEMIN_AXO}" x="${x}" y="${y}" width="${largeur}" height="${hauteur}" clip-path="url(#decoupe-focus)" pointer-events="none"/>`;
  document.querySelector(".plan-stage").classList.add("plan-stage--focus");
}

function retirerFocus() {
  document.querySelector(".plan-stage").classList.remove("plan-stage--focus");
  document.getElementById("calque-focus").innerHTML = "";
}

/** Ouvre la popup d'une zone ; `ajouter` ajoute d'emblée une nouvelle ligne (bouton « + Ajouter une surface ») ;
 *  `ligne` : numéro de la ligne dont le champ de surface reçoit le focus (clic sur une étiquette). */
function ouvrirPopup(idZone, { ajouter = false, ligne = null } = {}) {
  const zone = trouverZone(idZone);
  if (!popup.open) declencheur = document.activeElement?.closest?.(".etiq") ?? null;       // pour rendre le focus à l'étiquette à la fermeture
  document.querySelectorAll(".zone-axo").forEach((el) => el.classList.toggle("zone-axo--ouverte", el.dataset.zone === idZone));
  focaliserZone(idZone);
  brouillon = null;
  popup.classList.toggle("popup--large", zone.type === "saisie");
  if (zone.type === "facade") popup.innerHTML = htmlPopupFacade();
  else if (zone.type === "info") popup.innerHTML = htmlPopupInfo(zone);
  else {
    brouillon = { zone, categorie: zone.categorie, lignes: lignesDeZone(zone).map(ligneBrouillon) };
    if (ajouter || brouillon.lignes.length === 0) brouillon.lignes.push(nouvelleLigneBrouillon(zone.categorie));
    popup.innerHTML = htmlPopup();
    rendreLignesPopup();
  }
  montrerPopup();
  const i = brouillon?.lignes.findIndex((d) => d.ligne?.n === ligne) ?? -1;
  if (ligne !== null && i >= 0) popup.querySelector(`.ligne-popup[data-i="${i}"] .champ--popup`)?.focus();
}

/** Vrai si la ligne vaut 0 m² dans tous les scénarios. */
const ligneVide = (ligne) => projet.scenarios.every(({ cle }) => (ligne.surfaces[cle] ?? 0) === 0);

/** Retire une ligne du projet (pas de renumérotation : les numéros des autres lignes ne changent pas). */
function supprimerLigne(ligne) {
  projet.lignes.splice(projet.lignes.indexOf(ligne), 1);
}

/** Applique le brouillon au scénario actif, puis met tout à jour. Une ligne qui vaut 0 m² dans les deux scénarios est supprimée. */
function validerPopup() {
  const { zone } = brouillon;
  for (const d of brouillon.lignes) {
    const t = typologieDe(d);
    const ligne = d.ligne;
    if (d.supprimee) {
      if (ligne) ligne.surfaces[scenarioActif] = 0;                      // la surface repart à 0 dans ce scénario seulement
      continue;
    }
    const stratesChoisies = brouillon.categorie === "bat" && !d.inconnu && t.strates ? [...d.strates] : stratesParDefaut(t);
    if (ligne) {
      if (t.id !== ligne.typologie) { ligne.precision = null; ligne.strates = stratesChoisies; }   // l'intitulé du tableau reprend la condition
      else if (brouillon.categorie === "bat") ligne.strates = stratesChoisies;
      ligne.typologie = t.id;
      ligne.surfaces[scenarioActif] = d.surface;
    } else if (d.surface > 0) {                                           // nouvelle ligne : créée seulement si elle a une surface
      const surfaces = Object.fromEntries(projet.scenarios.map((s) => [s.cle, 0]));
      surfaces[scenarioActif] = d.surface;
      projet.lignes.push({ n: Math.max(0, ...projet.lignes.map((l) => l.n)) + 1, typologie: t.id, precision: null,
                           strates: stratesChoisies, surfaces, zone: zone.id, creee: true });
    }
  }
  for (const d of brouillon.lignes) if (d.ligne && ligneVide(d.ligne)) supprimerLigne(d.ligne);    // vide dans A et B : la ligne disparaît
  rendreTableau();
  recalculer();
  projetModifie();
}

function initialiserPopup() {
  const indexCarte = (el) => Number(el.closest("[data-i]")?.dataset.i);

  popup.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "popup-facade-mention") { projet.facade_vegetalisee.mentionnee = el.checked; majFacade(); projetModifie(); return; }
    if (!brouillon) return;
    const i = indexCarte(el);
    const d = brouillon.lignes[i];
    if (!d) return;
    if (el.name === "classe") {
      const classe = classesToiture().find((c) => c.libelle === el.value);
      const gardees = d.strates.filter((s) => stratesPossibles(classe).has(s));
      d.classe = el.value;
      d.strates = classe.typos.some((t) => strateValide(t, t.strates ? gardees : null)) ? gardees : stratesParDefaut(classe.typos[0]) ?? [];
    } else if (el.name === "strate") {
      d.strates = [...el.closest(".ligne-popup").querySelectorAll('input[name="strate"]:checked')].map((x) => x.value);
    } else if (el.name === "inconnu") {
      d.inconnu = el.checked;
    } else if (el.name === "typo") {
      d.typologie = Number(el.value);
    }
    majPopup();
  });

  popup.addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "popup-facade-surface") {
      const v = surfaceSaisie(el);
      el.setAttribute("aria-invalid", String(v === null));
      if (v !== null) { projet.facade_vegetalisee.surface = v; majFacade(); projetModifie(); }
    } else if (brouillon && el.classList.contains("champ--popup")) {
      const d = brouillon.lignes[indexCarte(el)];
      const v = surfaceSaisie(el);
      el.setAttribute("aria-invalid", String(v === null));
      d.surfaceValide = v !== null;
      if (v !== null) d.surface = v;
      majPopup();
    }
  });

  popup.addEventListener("click", (e) => {
    if (e.target === popup) { popup.close(); return; }                   // clic sur le fond
    const categorie = e.target.closest("[data-categorie]")?.dataset.categorie;
    if (categorie) {                                                      // 2e étape : zone (directement si la catégorie n'en a qu'une)
      const zones = zonesDeSaisie(categorie);
      if (zones.length === 1) ouvrirPopup(zones[0].id, { ajouter: true });
      else { popup.classList.remove("popup--large"); popup.innerHTML = htmlPopupZones(categorie); }
      return;
    }
    const idZone = e.target.closest("[data-zone-choix]")?.dataset.zoneChoix;
    if (idZone) { ouvrirPopup(idZone, { ajouter: true }); return; }
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "annuler") { popup.close(); return; }
    if (!brouillon) return;
    const i = indexCarte(e.target);
    if (action === "ajouter-ligne") { brouillon.lignes.push(nouvelleLigneBrouillon(brouillon.categorie)); rendreLignesPopup(); popup.querySelector(".ligne-popup:last-of-type .champ--popup")?.focus(); }
    else if (action === "supprimer-ligne") {
      if (brouillon.lignes[i].ligne) brouillon.lignes[i].supprimee = true; else brouillon.lignes.splice(i, 1);
      rendreLignesPopup();
    }
    else if (action === "retablir-ligne") { brouillon.lignes[i].supprimee = false; rendreLignesPopup(); }
    else if (action === "valider") { validerPopup(); popup.close(); }
  });

  popup.addEventListener("close", () => {
    if (popup.open) return;               // « close » est asynchrone : une nouvelle popup est déjà ouverte, on ne touche à rien
    brouillon = null;
    document.querySelectorAll(".zone-axo--ouverte").forEach((el) => el.classList.remove("zone-axo--ouverte"));
    retirerFocus();
    if (declencheur) document.querySelector(`.etiq[data-ligne="${declencheur.dataset.ligne}"]`)?.focus();
    declencheur = null;
  });

  // Ajout d'une surface : choix de la catégorie, puis de la zone (liste), puis popup de la zone avec une nouvelle ligne
  document.querySelector(".bouton-ajout").addEventListener("click", () => {
    brouillon = null;
    popup.classList.remove("popup--large");
    popup.innerHTML = htmlPopupCategorie();
    montrerPopup();
  });
}

// ================= Sauvegarde locale, export et import =================
/** Écrit le projet dans le navigateur (localStorage) — seulement si une modification a déjà eu lieu ou si un projet a été restauré,
 *  pour que l'exemple, mis à jour d'une version à l'autre, ne soit pas figé dès la première visite. */
function sauvegarder(origine = "auto") {
  if (!sauvegardeActive) return;
  try {
    localStorage.setItem(CLE_STOCKAGE, serialiser(projet, scenarioActif, origine));
    afficherEtatSauvegarde(`Enregistré dans ce navigateur à ${new Date().toLocaleTimeString(LANGUE, { hour: "2-digit", minute: "2-digit" })}.`);
  } catch (erreur) {                                       // stockage refusé (navigation privée stricte, quota, politique du navigateur)
    afficherEtatSauvegarde("Enregistrement dans ce navigateur impossible : pensez à exporter le projet (.json).");
    console.warn("Sauvegarde locale impossible :", erreur);
  }
}

/** À appeler après chaque modification faite par l'utilisateur. */
function projetModifie() {
  sauvegardeActive = true;
  sauvegarder();
}

const afficherEtatSauvegarde = (texte) => { document.getElementById("etat-sauvegarde").textContent = texte; };

/** Message en haut de page (information ou erreur), avec un bouton pour le fermer. */
function afficherMessage(texte, erreur = false) {
  const bloc = document.getElementById("message-projet");
  bloc.className = `message-projet${erreur ? " erreur-projet" : ""}`;
  bloc.setAttribute("role", erreur ? "alert" : "status");
  bloc.innerHTML = '<span></span><button type="button" data-fermer-message>Fermer</button>';
  bloc.firstChild.textContent = texte;
  bloc.hidden = false;
}

/** Remplace l'exemple par la sauvegarde du navigateur, si elle existe et reste valide. Renvoie le message à afficher (ou null). */
function restaurerSauvegarde() {
  let texte;
  try { texte = localStorage.getItem(CLE_STOCKAGE); } catch { return null; }          // stockage inaccessible : on reste sur l'exemple
  if (texte === null) return null;
  const sauvegarde = lireSauvegarde(texte);
  const { projet: propre, erreurs } = sauvegarde ? validerProjet(sauvegarde.projet, nomenclature, zonesDonnees) : { projet: null, erreurs: ["enveloppe illisible"] };
  if (!propre) {
    console.warn("Sauvegarde locale ignorée :", erreurs);
    return { texte: "La sauvegarde de ce navigateur n'a pas pu être relue : l'exemple est affiché. Elle sera remplacée à votre prochaine modification.", erreur: true };
  }
  projet = propre;
  if (projet.scenarios.some((s) => s.cle === sauvegarde.scenarioActif)) scenarioActif = sauvegarde.scenarioActif;
  sauvegardeActive = true;
  const date = new Date(sauvegarde.enregistre).toLocaleString(LANGUE, { dateStyle: "short", timeStyle: "short" });
  const debut = sauvegarde.origine === "import" ? "Projet importé" : "Projet restauré depuis la sauvegarde de ce navigateur";
  return { texte: `${debut} (${date}). Menu « Projet » → « Revenir à l'exemple » pour repartir de l'exemple.`, erreur: false };
}

/** Télécharge un texte comme fichier. */
function telecharger(texte, nom, type) {
  const url = URL.createObjectURL(new Blob([texte], { type }));
  const lien = Object.assign(document.createElement("a"), { href: url, download: nom });
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Importe un fichier .json : s'il est valide, il est enregistré dans le navigateur puis la page est rechargée (tout est redessiné proprement). */
async function importerProjet(fichier) {
  let texte;
  try { texte = await fichier.text(); } catch { afficherMessage("Import impossible : le fichier n'a pas pu être lu.", true); return; }
  const { projet: propre, erreurs } = lireFichierProjet(texte, nomenclature, zonesDonnees);
  if (!propre) {
    const motifs = erreurs.slice(0, ERREURS_AFFICHEES).join(" ") + (erreurs.length > ERREURS_AFFICHEES ? ` (+ ${erreurs.length - ERREURS_AFFICHEES} autres)` : "");
    afficherMessage(`Import refusé : ${motifs}`, true);
    return;
  }
  try { localStorage.setItem(CLE_STOCKAGE, serialiser(propre, scenarioActif, "import")); }
  catch { afficherMessage("Import impossible : ce navigateur n'autorise pas l'enregistrement local.", true); return; }
  location.reload();
}

function initialiserMenuProjet() {
  const bouton = document.getElementById("bouton-projet");
  const panneau = document.getElementById("menu-projet");
  const entree = document.getElementById("fichier-projet");
  const reinitialiser = panneau.querySelector('[data-projet="reinitialiser"]');
  const texteReinit = reinitialiser.textContent;
  let minuteur = null;

  const annulerConfirmation = () => {
    clearTimeout(minuteur);
    reinitialiser.removeAttribute("data-confirmer");
    reinitialiser.textContent = texteReinit;
  };
  const ouvrir = (ouvert) => {
    panneau.hidden = !ouvert;
    bouton.setAttribute("aria-expanded", String(ouvert));
    if (!ouvert) annulerConfirmation();
  };

  bouton.addEventListener("click", () => ouvrir(panneau.hidden));
  document.addEventListener("click", (e) => { if (!panneau.hidden && !e.target.closest(".menu-projet")) ouvrir(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panneau.hidden) { ouvrir(false); bouton.focus(); } });
  panneau.addEventListener("focusout", (e) => { if (e.relatedTarget && !e.relatedTarget.closest(".menu-projet")) ouvrir(false); });

  panneau.addEventListener("click", (e) => {
    const action = e.target.closest("[data-projet]")?.dataset.projet;
    if (action === "exporter-json") { telecharger(JSON.stringify(projet, null, 2) + "\n", nomFichier(projet, "json"), "application/json"); ouvrir(false); }
    else if (action === "importer") entree.click();
    else if (action === "reinitialiser") {
      if (!reinitialiser.hasAttribute("data-confirmer")) {            // premier clic : demande de confirmation (efface les saisies)
        reinitialiser.setAttribute("data-confirmer", "");
        reinitialiser.textContent = "Confirmer : effacer mes saisies";
        minuteur = setTimeout(annulerConfirmation, DELAI_CONFIRMATION_MS);
        return;
      }
      try { localStorage.removeItem(CLE_STOCKAGE); } catch { /* stockage inaccessible : rien à effacer */ }
      location.reload();
    }
  });
  entree.addEventListener("change", () => {
    const fichier = entree.files[0];
    entree.value = "";                                              // permet de réimporter le même fichier
    ouvrir(false);
    if (fichier) importerProjet(fichier);
  });
  document.getElementById("bouton-csv").addEventListener("click", () => {
    telecharger("﻿" + genererCsv(projet, nomenclature, resultats), nomFichier(projet, "csv"), "text/csv;charset=utf-8");   // BOM : Excel reconnaît l'UTF-8
  });
  document.getElementById("message-projet").addEventListener("click", (e) => {
    if (e.target.closest("[data-fermer-message]")) document.getElementById("message-projet").hidden = true;
  });
}

// ================= Démarrage =================

async function charger(chemin) {
  const reponse = await fetch(chemin);
  if (!reponse.ok) throw new Error(`${chemin} : HTTP ${reponse.status}`);
  return reponse.json();
}

async function demarrer() {
  initialiserOnglets();
  try {
    [nomenclature, projet, zonesDonnees] = await Promise.all([charger(CHEMIN_NOMENCLATURE), charger(CHEMIN_PROJET), charger(CHEMIN_ZONES)]);
  } catch (erreur) {
    const bloc = document.getElementById("erreur-donnees");
    bloc.hidden = false;
    bloc.textContent = location.protocol === "file:"
      ? "Page ouverte depuis un fichier : les données ne peuvent pas être chargées. À la racine du dépôt, lancez « python -m http.server 8000 » puis ouvrez http://localhost:8000/."
      : "Impossible de charger les données (nomenclature ou projet). Vérifiez le dossier data/ et rechargez la page.";
    console.error(erreur);
    return;
  }
  const anomalies = verifierDonnees(nomenclature, projet, zonesDonnees);
  if (anomalies.length) console.warn("Données incohérentes :", anomalies);
  const restauration = restaurerSauvegarde();            // remplace `projet` et `scenarioActif` si une sauvegarde valide existe
  typologies = indexerTypologies(nomenclature);
  rendreStructure();
  rendreZones();
  initialiserSaisie();
  initialiserPopup();
  initialiserBascule();
  initialiserRenommage();
  initialiserAide();
  initialiserMenuProjet();
  definirScenarioActif(scenarioActif);                     // rend le tableau, place le champ de la parcelle et calcule
  if (restauration) afficherMessage(restauration.texte, restauration.erreur);
}

demarrer();
