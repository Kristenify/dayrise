/*
 * Prototype de parcours — Léon : menu de la journée → routines
 * indépendantes ("S'habiller", "Se préparer à partir") → félicitations →
 * validation parent (code + relecture/correction) → étoile + jauge de
 * journée → retour au menu → récompense de fin de journée une fois
 * toutes les routines validées.
 *
 * Modèle : voir docs/produit/modele-de-donnees.md — une Routine a une
 * liste ordonnée de Tâches (relation mère-fille). `etat.routines[id].fait`
 * est un tableau d'id de tâches (pas d'index numériques), pour rester
 * robuste au fait qu'il y ait plusieurs routines indépendantes.
 *
 * Aventures (AVENTURES) : sorties programmées, accessibles depuis la
 * porte "Partir à l'aventure". Même écrans que le trajet/arrivée chez
 * l'orthophoniste (désormais génériques, alimentés par l'aventure du
 * jour), mais certaines rapportent une récompense différente d'une
 * étoile de routine : une pièce (cf. `chargerPieces`/`ajouterPieces` et
 * docs/produit/modele-de-donnees.md).
 *
 * Un seul enfant, pas de sélecteur de profil. L'avatar est un vrai
 * sprite (assets/avatar/) ; le décor reste un dégradé CSS.
 *
 * Code parent : 1234 (valeur figée pour ce prototype, à rendre
 * configurable plus tard — cf. docs/produit/concept.md).
 */

const CODE_PARENT = "1234";

// `calque` = data-calque (ou tableau de data-calque) à révéler sur le
// sprite ; `retire: true` les CACHE au lieu de les révéler (routine du
// soir : on déshabille). `badge` = badge emoji pour ce qui n'a pas de
// sprite dédié (sac, brossage de dents).
//
// Petit-déjeuner n'est pas une tâche ici : ce sera un mini-jeu dédié
// (table de la cuisine, plusieurs sous-étapes) — cf. TODO.md. Le
// brossage de dents est ici une simple tâche en attendant le mini-jeu
// miroir prévu plus tard (même TODO).
// `emoji` (par routine) : utilisé par l'écran "Ma journée"
// (`construireJournee()`) pour repérer chaque routine d'un coup d'œil.
const ROUTINES = [
  {
    id: "shabiller",
    nom: "S'habiller",
    emoji: "👕",
    lieu: "chambre",
    felicitation: "Bravo Léon, tu t'es habillé tout seul !",
    taches: [
      { id: "calecon",     texte: "Mets ton caleçon.",     emoji: "🩲", zone: "zone-bassin", calque: "calque-calecon" },
      { id: "tshirt",      texte: "Mets ton t-shirt.",     emoji: "👕", zone: "zone-torse",  calque: "calque-haut" },
      { id: "pantalon",    texte: "Mets ton pantalon.",    emoji: "👖", zone: "zone-jambes", calque: "calque-pantalon" },
      { id: "chaussettes", texte: "Mets tes chaussettes.", emoji: "🧦", zone: "zone-pieds",  calque: "calque-chaussettes" },
    ],
  },
  {
    id: "partir",
    nom: "Se préparer à partir",
    emoji: "🚪",
    lieu: "salon",
    felicitation: "Bravo Léon, tu es prêt à partir !",
    // Manteau et sac retirés le temps de l'été (pas besoin de manteau,
    // on part avec juste les chaussures) — gardés ici en commentaire
    // pour les remettre facilement à la mauvaise saison :
    // { id: "manteau", texte: "Mets ton manteau.", emoji: "🧥", zone: "zone-torse", calque: "calque-manteau" },
    // { id: "sac",     texte: "Prends ton sac.",   emoji: "🎒", zone: "zone-dos",   badge: "dos" },
    taches: [
      { id: "chaussures", texte: "Mets tes chaussures.", emoji: "👟", zone: "zone-pieds", calque: "calque-chaussures" },
    ],
  },
  {
    id: "soir",
    nom: "Aller se coucher",
    emoji: "🌙",
    lieu: "chambre",
    felicitation: "Bravo Léon, tu es prêt à dormir !",
    taches: [
      { id: "enlever",  texte: "Enlève tes vêtements.", emoji: "👕", zone: "zone-torse",
        calque: ["calque-haut", "calque-pantalon", "calque-chaussettes", "calque-chaussures", "calque-manteau"],
        retire: true },
      { id: "ranger",   texte: "Range tes vêtements ou mets-les au sale.", emoji: "🧺", zone: "zone-dos" },
      { id: "dents",    texte: "Brosse-toi les dents.",                   emoji: "🪥", zone: "zone-visage", badge: "visage", badgeFait: "✨" },
      { id: "histoire", texte: "On lit l'histoire.",                      emoji: "📖", zone: "zone-jambes" },
      { id: "coucher",  texte: "Je vais me coucher.",                     emoji: "😴", zone: "zone-pieds" },
    ],
  },
];

// Repas : purement informatifs pour l'écran "Ma journée"
// (`construireJournee()`) — pas des routines (pas de tâches, pas
// d'horaire pour l'instant). `id` sert de référence dans `PLANNING_DEFAUT`
// et dans le planning édité par les parents (cf. plus bas).
const REPAS = [
  { id: "petit-dej", nom: "Petit-déjeuner", emoji: "🍳" },
  { id: "dejeuner",  nom: "Déjeuner",       emoji: "🍽️" },
  { id: "gouter",    nom: "Goûter",         emoji: "🍪" },
  { id: "diner",     nom: "Dîner",          emoji: "🌙🍽️" },
];

// Aventures : sorties, sur le même principe que le trajet/arrivée
// initialement codés pour Pauline (route en voiture -> programme annoncé
// à l'arrivée -> "C'est parti"). `date` (même format que `cleJour()`,
// ex. "2026-8-27") sert de filtre pour `aventuresDuJour()` — une
// aventure sans date (Pauline, récurrente) n'apparaît jamais toute
// seule dans les sorties du jour, elle attend d'être reprogrammée
// explicitement le moment venu.
// `personne` (emoji + nom) affiche un 2ᵉ sprite à l'arrivée quand
// l'aventure se passe chez quelqu'un ; absent pour une sortie sans
// praticien (magasin...).
// `recompensePieces` : 0 = pas de récompense propre à cette aventure
// (le cas de Pauline aujourd'hui). > 0 = une pièce sort du coffre à la
// fin (monnaie distincte des étoiles de routine, cf. `ajouterPieces`).
// `texteTrajetRetour` : texte du trajet retour (vers la maison), une
// fois l'aventure terminée ("C'est parti" déclenche ce retour, pas la
// récompense directement, cf. `terminerAventure`) — texte par défaut si
// absent.
// `apres` : où insérer cette aventure dans le planning par défaut du
// jour (cf. `planningParDefaut()`) — référence `{ type, id }` vers un
// autre item ("routine"/"repas"/"aventure"). Absent = ajoutée en fin de
// journée.
const AVENTURES = [
  {
    id: "pauline",
    lieu: "Chez Pauline",
    emoji: "🚗",
    texteTrajet: "On roule vers chez Pauline. Tu n'as rien à faire, tu peux regarder dehors.",
    personne: { emoji: "👩‍⚕️", nom: "Pauline" },
    texteArrivee: "Pauline est là. Orthophoniste, une demi-heure, comme la dernière fois.",
    programme: ["1. On entre et on s'assoit", "2. On travaille avec Pauline", "3. On repart"],
    recompensePieces: 0,
    texteTrajetRetour: "La séance est finie, on rentre à la maison.",
  },
  {
    id: "bricolage",
    date: "2026-8-28",
    // Après le petit-déjeuner, mais aussi (et surtout) après "Se préparer
    // à partir" : les deux routines requises pour partir en aventure
    // (`ROUTINES_REQUISES_DEPART`) doivent de toute façon être validées
    // avant que l'enfant puisse même ouvrir l'écran des sorties — les
    // placer avant dans le planning évite un ordre affiché qui
    // contredirait ce que le jeu impose réellement.
    apres: { type: "routine", id: "partir" },
    lieu: "Le magasin de bricolage",
    emoji: "🧰",
    texteTrajet: "On roule vers le magasin de bricolage.",
    texteArrivee: "On est arrivés au magasin de bricolage.",
    programme: [
      "1. On entre et on reste avec papa/maman",
      "2. On cherche ce qu'il faut pour le bricolage",
      "3. On repart",
    ],
    recompensePieces: 1,
    texteTrajetRetour: "On a fini, on rentre à la maison.",
  },
];

let dragCtx = null;
let routineActuelleId = null;
let aventureActuelleId = null;
// "aller" (vers l'aventure) ou "retour" (vers la maison, après "C'est
// parti") — pilote le texte du trajet et ce que fait la validation
// parent de "On est arrivés" (cf. allerAuTrajet/allerValidationArrivee).
let sensTrajet = "aller";

function aventureParId(id) { return AVENTURES.find(a => a.id === id); }
function aventuresDuJour() { return AVENTURES.filter(a => a.date === cleJour()); }

// Planning par défaut d'une journée type (écran "Ma journée") : une
// suite d'items `{ type: "routine"|"aventure"|"repas", id }`, dans
// l'ordre chronologique attendu. Les aventures du jour (`aventuresDuJour()`)
// s'y insèrent à la position indiquée par leur champ `apres` (fin de
// journée si absent). C'est cette liste, recalculée à chaque nouvelle
// journée puis copiée dans `etat.planning`, qui sert de point de départ
// éditable par un parent (cf. `construireJournee()`).
const PLANNING_DEFAUT = [
  { type: "repas", id: "petit-dej" },
  { type: "routine", id: "shabiller" },
  { type: "routine", id: "partir" },
  { type: "repas", id: "dejeuner" },
  { type: "repas", id: "gouter" },
  { type: "repas", id: "diner" },
  { type: "routine", id: "soir" },
];
function planningParDefaut() {
  const items = PLANNING_DEFAUT.map(ref => ({ ...ref }));
  aventuresDuJour().forEach(a => {
    const entree = { type: "aventure", id: a.id };
    const pos = a.apres ? items.findIndex(it => it.type === a.apres.type && it.id === a.apres.id) : -1;
    if (pos === -1) items.push(entree); else items.splice(pos + 1, 0, entree);
  });
  return items;
}
// Résout un item de planning en `{ emoji, nom }` à afficher — toujours
// dérivé des catalogues (ROUTINES/AVENTURES/REPAS), jamais dupliqué dans
// l'item lui-même, pour rester à jour si la routine/aventure change.
// Renvoie `null` pour une référence orpheline (id qui n'existe plus).
function libelleItemPlanning(item) {
  if (item.type === "routine") { const r = routineParId(item.id); return r ? { emoji: r.emoji, nom: r.nom } : null; }
  if (item.type === "aventure") { const a = aventureParId(item.id); return a ? { emoji: a.emoji, nom: a.lieu } : null; }
  if (item.type === "repas") { const r = REPAS.find(x => x.id === item.id); return r ? { emoji: r.emoji, nom: r.nom } : null; }
  return null;
}

// ---------------------------------------------------------------------
// Persistance (reset automatique chaque matin)
// ---------------------------------------------------------------------
function cleJour() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function etatParDefaut() {
  const routines = {};
  ROUTINES.forEach(r => { routines[r.id] = { fait: [], valide: false }; });
  return { jour: cleJour(), routines, etoiles: 0, journeeFaite: false, planning: planningParDefaut() };
}
// Répare un état du jour dont la forme est incomplète (ex. un champ
// ajouté par une mise à jour de l'app depuis la dernière sauvegarde de
// la tablette) EN PLACE, plutôt que de tout jeter. Avant (`etatValide()`,
// tout-ou-rien), le moindre champ manquant faisait repartir d'un état
// neuf — Léon a perdu une vraie progression de sa journée comme ça
// (cf. discussion produit, ajout de `planning`). Ne répare que si le
// JOUR correspond : un changement de date reste un vrai nouveau départ
// (l'ancien état est alors archivé, pas réparé — cf. `archiverJournee()`
// dans `chargerEtat()`). Renvoie `null` s'il n'y a vraiment rien
// d'exploitable (pas de `routines` du tout).
function etatRepare(etat) {
  if (!etat || typeof etat !== "object" || etat.jour !== cleJour()) return null;
  if (!etat.routines || typeof etat.routines !== "object") return null;
  ROUTINES.forEach(r => {
    if (!etat.routines[r.id] || !Array.isArray(etat.routines[r.id].fait)) {
      etat.routines[r.id] = { fait: [], valide: false };
    }
  });
  if (!Array.isArray(etat.planning)) etat.planning = planningParDefaut();
  if (typeof etat.etoiles !== "number") etat.etoiles = 0;
  if (typeof etat.journeeFaite !== "boolean") etat.journeeFaite = false;
  return etat;
}

// Historique des journées passées (`leon_historique`) — jamais remis à
// zéro, contrairement à `leon_journee`. Demandé explicitement une fois
// l'usage réel commencé avec Léon : jusqu'ici, une journée terminée
// était perdue dès que la suivante commençait. Archivée ici, juste
// avant d'être écrasée par une nouvelle journée (cf. `chargerEtat()`) —
// pas à chaque reset de test (`reinitialiserTout()`), qui ne représente
// pas une vraie journée. Bornée à 90 entrées pour ne pas grossir sans fin.
function archiverJournee(etat) {
  if (!etat || !etat.routines) return; // rien d'exploitable à garder
  try {
    const historique = JSON.parse(localStorage.getItem("leon_historique") || "[]");
    historique.push({
      jour: etat.jour,
      etoiles: etat.etoiles || 0,
      routinesValidees: ROUTINES.filter(r => etat.routines[r.id] && etat.routines[r.id].valide).map(r => r.id),
      journeeFaite: !!etat.journeeFaite,
    });
    while (historique.length > 90) historique.shift();
    localStorage.setItem("leon_historique", JSON.stringify(historique));
  } catch (e) {}
}

function chargerEtat() {
  let etat = null;
  try { const b = localStorage.getItem("leon_journee"); etat = b ? JSON.parse(b) : null; } catch (e) {}

  if (etat && etat.jour && etat.jour !== cleJour()) {
    archiverJournee(etat);
    etat = null;
  }

  etat = etatRepare(etat) || etatParDefaut();
  sauverEtat(etat);
  return etat;
}
function sauverEtat(etat) {
  try { localStorage.setItem("leon_journee", JSON.stringify(etat)); } catch (e) {}
}
function routineParId(id) { return ROUTINES.find(r => r.id === id); }

// Pièces : monnaie gagnée en aventure, distincte des étoiles de routine.
// Stockée à part de `leon_journee` et JAMAIS remise à zéro au changement
// de jour (contrairement aux étoiles) : une pièce reste gagnée jusqu'à
// être dépensée par Léon (activité de son choix) ou donnée à ses
// parents dans la vraie vie — ce n'est pas une jauge quotidienne.
function chargerPieces() {
  try {
    const n = JSON.parse(localStorage.getItem("leon_pieces"));
    return typeof n === "number" && n >= 0 ? n : 0;
  } catch (e) { return 0; }
}
function sauverPieces(n) {
  try { localStorage.setItem("leon_pieces", JSON.stringify(n)); } catch (e) {}
}
function ajouterPieces(n) {
  const total = chargerPieces() + n;
  sauverPieces(total);
  return total;
}

// toutes les tâches faites, toutes routines confondues — pour que
// l'avatar reste cohérent (habits déjà mis) sur tous les écrans
function tachesFaitesPartout(etat) {
  const s = new Set();
  ROUTINES.forEach(r => (etat.routines[r.id].fait || []).forEach(id => s.add(id)));
  return s;
}

// ---------------------------------------------------------------------
// Voix (Web Speech API, native, hors-ligne) + petit son de validation
// ---------------------------------------------------------------------
let derniereEtapeAnnoncee = null;
function dire(texte) {
  try {
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = "fr-FR";
    u.rate = 0.92;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}
let audioCtxPartage = null;
function jouerSon() {
  try {
    if (!audioCtxPartage) audioCtxPartage = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxPartage;
    if (ctx.state === "suspended") ctx.resume();
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.3);
    });
  } catch (e) {}
}

function afficherEcran(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ---------------------------------------------------------------------
// Avatar : synchronise les calques visibles sur toutes les instances
// (menu + écran de routine), à partir de l'ensemble des tâches faites
// toutes routines confondues — continuité visuelle d'un écran à l'autre.
// ---------------------------------------------------------------------
function synchroniserAvatar(etat) {
  const faites = tachesFaitesPartout(etat);
  const calques = new Set();
  const badges = {};
  ROUTINES.forEach(r => r.taches.forEach(t => {
    if (!faites.has(t.id)) return;
    if (t.calque) {
      const liste = Array.isArray(t.calque) ? t.calque : [t.calque];
      liste.forEach(c => { if (t.retire) calques.delete(c); else calques.add(c); });
    }
    if (t.badge) {
      if (t.retire) delete badges[t.badge]; else badges[t.badge] = t.badgeFait || t.emoji;
    }
  }));
  document.querySelectorAll(".avatar-calque[data-calque]").forEach(img => {
    img.classList.toggle("visible", calques.has(img.dataset.calque));
  });
  document.querySelectorAll(".badge-zone[data-badge]").forEach(b => {
    const texte = badges[b.dataset.badge];
    b.textContent = texte || "";
    b.classList.toggle("visible", !!texte);
  });
}

// ---------------------------------------------------------------------
// 0. Menu de la journée
// ---------------------------------------------------------------------
function construireMenu() {
  const etat = chargerEtat();
  // le mode édition de "Ma journée" ne survit pas à un retour au menu —
  // le code parent protège l'entrée en édition, pas juste un aller simple.
  journeeEnEdition = false;

  if (ROUTINES.every(r => etat.routines[r.id].valide) && !etat.journeeFaite) {
    allerFinDeJournee();
    return;
  }

  synchroniserAvatar(etat);

  // jauge de journée : une étoile par routine, gagnée une fois validée
  const jauge = document.getElementById("jauge-jour");
  jauge.innerHTML = "";
  ROUTINES.forEach(r => {
    const etoile = document.createElement("div");
    etoile.className = "etoile-jauge" + (etat.routines[r.id].valide ? " gagnee" : "");
    etoile.textContent = "⭐";
    jauge.appendChild(etoile);
  });
  const piecesTotal = chargerPieces();
  document.getElementById("pieces-total").textContent = piecesTotal > 0 ? "🪙 " + piecesTotal : "";

  // cartes de routines : la première non validée est jouable, les
  // suivantes restent grisées tant que la précédente n'est pas validée
  const liste = document.getElementById("liste-routines");
  liste.innerHTML = "";
  let precedenteValidee = true;
  ROUTINES.forEach(r => {
    const etatR = etat.routines[r.id];
    const debloquee = precedenteValidee && !etatR.valide;
    const carte = document.createElement("div");
    carte.dataset.id = r.id;
    carte.className = "carte-routine" + (etatR.valide ? " faite" : "") + (!precedenteValidee ? " verrouillee" : "");
    carte.innerHTML = `<div class="carte-routine-nom">${r.nom}</div><div class="carte-routine-etat">${etatR.valide ? "✓" : (precedenteValidee ? "" : "🔒")}</div>`;
    if (debloquee) carte.onclick = () => demarrerRoutine(r.id);
    liste.appendChild(carte);
    precedenteValidee = etatR.valide;
  });

  afficherEcran("screen-menu");
}

function demarrerRoutine(id) {
  routineActuelleId = id;
  derniereEtapeAnnoncee = null;
  synchroniserRoutineEcran();
  afficherEcran("screen-routine");
}

// Échappatoire pour un tap accidentel sur la mauvaise routine au menu —
// ne perd rien : les tâches déjà cochées restent dans `etat.routines`,
// retaper la même routine plus tard reprend exactement où on en était.
function retourMenuDepuisRoutine() {
  routineActuelleId = null;
  construireMenu();
}

// Routines indispensables avant de pouvoir partir à l'aventure. "Aller se
// coucher" n'en fait pas partie (sans rapport avec la sortie).
const ROUTINES_REQUISES_DEPART = ["shabiller", "partir"];

// Porte de sortie du menu vers les aventures/missions. Si des routines
// indispensables manquent, on NE NAVIGUE PAS de force vers l'une d'elles
// — l'enfant a pu appuyer sur la voiture par erreur. On reste sur le
// menu, on rappelle à voix haute ce qu'il reste à faire, et on fait
// clignoter la routine de rang 1 (la seule débloquée) pour attirer
// l'attention dessus sans forcer le geste.
function allerVersDepart() {
  const etat = chargerEtat();
  const manquantes = ROUTINES.filter(r => ROUTINES_REQUISES_DEPART.includes(r.id) && !etat.routines[r.id].valide);
  if (manquantes.length === 0) {
    dire("On part à l'aventure !");
    construireMissions();
    afficherEcran("screen-missions");
    return;
  }
  const noms = manquantes.map(r => r.nom).join(", ");
  dire("Avant de partir à l'aventure, il faut d'abord faire : " + noms + ".");
  clignoterRoutine(manquantes[0].id);
}

// Écran des sorties du jour : liste les aventures programmées pour
// aujourd'hui (`aventuresDuJour()`), sinon garde le texte d'origine
// "Rien de prévu aujourd'hui !".
function construireMissions() {
  const duJour = aventuresDuJour();
  const emoji = document.getElementById("missions-emoji");
  const texte = document.getElementById("missions-texte");
  const liste = document.getElementById("missions-liste");
  liste.innerHTML = "";
  if (duJour.length === 0) {
    emoji.textContent = "🚗";
    texte.textContent = "Rien de prévu aujourd'hui !";
    return;
  }
  emoji.textContent = duJour[0].emoji;
  texte.textContent = "";
  duJour.forEach(a => {
    const carte = document.createElement("div");
    carte.className = "carte-routine";
    carte.innerHTML = `<div class="carte-routine-nom">${a.emoji} ${a.lieu}</div><div class="carte-routine-etat"></div>`;
    carte.onclick = () => demarrerAventure(a.id);
    liste.appendChild(carte);
  });
}

function demarrerAventure(id) {
  aventureActuelleId = id;
  sensTrajet = "aller";
  allerAuTrajet();
}

// Écran "Ma journée" : le planning du jour (`etat.planning`), affiché
// dans l'ordre chronologique — pas de tâches à cocher ici, c'est un
// aperçu, pas un parcours. En lecture seule par défaut ; le mode édition
// (`journeeEnEdition`, activé via `basculerEditionJournee()`, protégé
// par le code parent) ajoute réordonnancement (▲▼), suppression et ajout
// depuis les catalogues existants (ROUTINES/AVENTURES/REPAS). Toujours
// remis en lecture seule en quittant vers le menu (cf. `construireMenu()`).
let journeeEnEdition = false;

function construireJournee() {
  const etat = chargerEtat();
  const conteneur = document.getElementById("journee-contenu");
  conteneur.innerHTML = "";

  const liste = document.createElement("div");
  liste.className = "liste-planning";
  etat.planning.forEach((item, i) => {
    const lib = libelleItemPlanning(item);
    if (!lib) return; // référence orpheline (id qui n'existe plus dans le catalogue) : ignorée proprement
    const ligne = document.createElement("div");
    ligne.className = "ligne-journee";
    ligne.innerHTML = `<span class="emoji-journee">${lib.emoji}</span><span class="texte-journee">${lib.nom}</span>`;
    if (journeeEnEdition) {
      const controles = document.createElement("div");
      controles.className = "controles-edition-journee";
      const btnHaut = document.createElement("button");
      btnHaut.className = "btn-mini-edition"; btnHaut.textContent = "▲";
      btnHaut.disabled = i === 0;
      btnHaut.onclick = () => deplacerItemPlanning(i, -1);
      const btnBas = document.createElement("button");
      btnBas.className = "btn-mini-edition"; btnBas.textContent = "▼";
      btnBas.disabled = i === etat.planning.length - 1;
      btnBas.onclick = () => deplacerItemPlanning(i, 1);
      const btnRetirer = document.createElement("button");
      btnRetirer.className = "btn-mini-edition btn-retirer"; btnRetirer.textContent = "✕";
      btnRetirer.onclick = () => retirerItemPlanning(i);
      controles.append(btnHaut, btnBas, btnRetirer);
      ligne.appendChild(controles);
    }
    liste.appendChild(ligne);
  });
  conteneur.appendChild(liste);

  if (journeeEnEdition) conteneur.appendChild(construireAjoutPlanning(etat));

  const btnModifier = document.getElementById("btn-modifier-journee");
  btnModifier.textContent = journeeEnEdition ? "✅" : "✏️";
  btnModifier.setAttribute("aria-label", journeeEnEdition ? "Terminer la modification" : "Modifier la journée");
}

// Active le mode édition — protégé par le code parent, réutilise le même
// écran/pavé numérique que la validation d'une routine ou d'une arrivée
// (cf. `apresCodeValide`). Le désactiver ne redemande pas le code : le
// code protège l'ENTRÉE en édition, pas la sortie.
function basculerEditionJournee() {
  if (journeeEnEdition) {
    journeeEnEdition = false;
    construireJournee();
    return;
  }
  codeSaisi = "";
  document.getElementById("validation-sous-titre").textContent = "Un parent entre le code pour modifier la journée.";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier();
  majCasesCode();
  apresCodeValide = () => {
    journeeEnEdition = true;
    afficherEcran("screen-journee");
    construireJournee();
  };
  afficherEcran("screen-validation");
}

function deplacerItemPlanning(i, delta) {
  const etat = chargerEtat();
  const j = i + delta;
  if (j < 0 || j >= etat.planning.length) return;
  const tmp = etat.planning[i];
  etat.planning[i] = etat.planning[j];
  etat.planning[j] = tmp;
  sauverEtat(etat);
  construireJournee();
}

function retirerItemPlanning(i) {
  const etat = chargerEtat();
  etat.planning.splice(i, 1);
  sauverEtat(etat);
  construireJournee();
}

function ajouterItemPlanning(type, id) {
  const etat = chargerEtat();
  etat.planning.push({ type, id });
  sauverEtat(etat);
  construireJournee();
}

// Catalogue d'ajout : tout ce qui existe (routines, aventures — pas
// seulement celles du jour, un parent peut vouloir reprogrammer Pauline
// par exemple —, repas) et n'est pas déjà dans le planning. Pas de
// création libre pour l'instant, seulement piocher dans l'existant.
function construireAjoutPlanning(etat) {
  const bloc = document.createElement("div");
  const label = document.createElement("div");
  label.className = "groupe-journee-titre";
  label.textContent = "AJOUTER À LA JOURNÉE";
  bloc.appendChild(label);

  const dejaLa = new Set(etat.planning.map(it => it.type + ":" + it.id));
  const candidats = [
    ...ROUTINES.map(r => ({ type: "routine", id: r.id, emoji: r.emoji, nom: r.nom })),
    ...AVENTURES.map(a => ({ type: "aventure", id: a.id, emoji: a.emoji, nom: a.lieu })),
    ...REPAS.map(r => ({ type: "repas", id: r.id, emoji: r.emoji, nom: r.nom })),
  ].filter(c => !dejaLa.has(c.type + ":" + c.id));

  if (candidats.length === 0) {
    const vide = document.createElement("div");
    vide.className = "recompenses-vide";
    vide.textContent = "Tout est déjà dans la journée.";
    bloc.appendChild(vide);
    return bloc;
  }

  const grille = document.createElement("div");
  grille.className = "grille-ajout-planning";
  candidats.forEach(c => {
    const b = document.createElement("button");
    b.className = "btn-ajout-planning";
    b.innerHTML = `<span>${c.emoji}</span><span>${c.nom}</span>`;
    b.onclick = () => ajouterItemPlanning(c.type, c.id);
    grille.appendChild(b);
  });
  bloc.appendChild(grille);
  return bloc;
}

// Écran "Mes récompenses" : les étoiles gagnées aujourd'hui et les
// pièces accumulées (cf. `chargerPieces` — pas remises à zéro chaque
// jour, donc affichées en total plutôt qu'"aujourd'hui"), présentées
// comme des objets à collectionner plutôt qu'un simple compteur —
// accessible en tapant sur les étoiles/pièces du menu (`btn-mes-recompenses`).
function construireRecompenses() {
  const etat = chargerEtat();
  const conteneur = document.getElementById("recompenses-contenu");
  conteneur.innerHTML = "";

  function ajouterGroupe(titre, n, visuelHTML, texteVide) {
    const groupe = document.createElement("div");
    const label = document.createElement("div");
    label.className = "groupe-journee-titre";
    label.textContent = titre;
    groupe.appendChild(label);
    if (n === 0) {
      const vide = document.createElement("div");
      vide.className = "recompenses-vide";
      vide.textContent = texteVide;
      groupe.appendChild(vide);
    } else {
      const grille = document.createElement("div");
      grille.className = "grille-recompenses";
      for (let i = 0; i < n; i++) {
        const item = document.createElement("div");
        item.className = "recompense-item";
        item.innerHTML = `<div class="visuel">${visuelHTML}</div>`;
        item.onclick = () => faireBrillier(item);
        grille.appendChild(item);
      }
      groupe.appendChild(grille);
    }
    conteneur.appendChild(groupe);
  }

  ajouterGroupe("MES ÉTOILES — AUJOURD'HUI", etat.etoiles || 0, "⭐", "Pas encore d'étoile aujourd'hui !");
  ajouterGroupe(
    "MES PIÈCES — AU TOTAL",
    chargerPieces(),
    '<div class="piece-visage"><img src="assets/avatar/leon-base.png" alt=""></div>',
    "Pas encore de pièce !"
  );
}

function faireBrillier(el) {
  el.classList.remove("briller");
  void el.offsetWidth; // relance l'animation même si elle vient de jouer
  el.classList.add("briller");
  jouerSon();
  if (navigator.vibrate) navigator.vibrate(30);
}

function clignoterRoutine(id) {
  const carte = document.querySelector('.carte-routine[data-id="' + id + '"]');
  if (!carte) return;
  carte.classList.remove("clignote");
  void carte.offsetWidth; // relance l'animation même si elle vient de jouer
  carte.classList.add("clignote");
}

// ---------------------------------------------------------------------
// 1. Écran d'une routine (générique, alimenté par ROUTINES)
// ---------------------------------------------------------------------
function synchroniserRoutineEcran() {
  const etat = chargerEtat();
  const routine = routineParId(routineActuelleId);
  const etatR = etat.routines[routine.id];

  synchroniserAvatar(etat);
  document.getElementById("nom-routine").textContent = routine.nom;
  document.getElementById("scene").classList.toggle("scene-salon", routine.lieu === "salon");

  // prochaine tâche à faire (première non cochée), seule jouable : les
  // suivantes n'ont pas d'icône glissable tant que celle-ci n'est pas
  // validée (ordre imposé).
  const prochaine = routine.taches.find(t => !etatR.fait.includes(t.id));

  const consigneEl = document.getElementById("etape-courante");
  if (prochaine) {
    consigneEl.textContent = prochaine.texte;
    if (derniereEtapeAnnoncee !== prochaine.id) {
      derniereEtapeAnnoncee = prochaine.id;
      dire(prochaine.texte);
    }
  }

  // liste : toutes les tâches restent visibles, pour que l'enfant voie
  // d'un coup d'œil la quantité totale à accomplir. Plus aucune ligne
  // n'est tapable (retour de terrain : l'enfant hésitait entre taper la
  // ligne et glisser l'icône) — seule l'icône de l'étape en cours, agrandie,
  // est glissable ; le texte reste affiché à côté pendant le geste
  // (lecture globale). Les tâches faites descendent en bas de liste.
  const restantes = routine.taches.filter(t => !etatR.fait.includes(t.id));
  const faites = routine.taches.filter(t => etatR.fait.includes(t.id));
  const liste = document.getElementById("chemin"); liste.innerHTML = "";
  [...restantes, ...faites].forEach(t => {
    const fait = etatR.fait.includes(t.id);
    const enCours = prochaine && t.id === prochaine.id;
    const noeud = document.createElement("div");
    noeud.className = "noeud" + (fait ? " fait" : "") + (enCours ? " en-cours" : "");
    const classeIcone = "pastille-mini" + (enCours ? " pastille-glissable" : "");
    noeud.innerHTML = `<div class="${classeIcone}">${t.emoji}</div><div class="texte-etape">${t.texte}</div><div class="coche-mini">✓</div>`;
    if (enCours) rendreGlissable(noeud.querySelector(".pastille-glissable"), t);
    liste.appendChild(noeud);
  });

  // barre de progression segmentée, propre à cette routine
  const barre = document.getElementById("barre-etapes");
  if (barre.childElementCount !== routine.taches.length) {
    barre.innerHTML = "";
    routine.taches.forEach(() => barre.appendChild(document.createElement("div")));
  }
  [...barre.children].forEach((seg, i) => seg.classList.toggle("fait", etatR.fait.includes(routine.taches[i].id)));

  if (!prochaine) setTimeout(() => finDeRoutine(), 500);
}

function marquerTache(id, valeur) {
  const etat = chargerEtat();
  const etatR = etat.routines[routineActuelleId];
  const pos = etatR.fait.indexOf(id);
  if (valeur && pos === -1) etatR.fait.push(id);
  if (!valeur && pos !== -1) etatR.fait.splice(pos, 1);
  sauverEtat(etat);
  synchroniserRoutineEcran();
  if (valeur) {
    jouerSon();
    if (navigator.vibrate) navigator.vibrate(45);
    const w = document.getElementById("avatar-wrap");
    w.classList.remove("pop"); void w.offsetWidth; w.classList.add("pop");
  }
}

// L'icône vit maintenant dans la ligne de la liste, à côté de son texte
// (lecture globale : le mot reste visible pendant le geste). On glisse un
// CLONE positionné en `fixed` par-dessus tout, plutôt que l'élément
// d'origine : l'icône d'origine passe juste en `visibility:hidden` (garde
// sa place dans la ligne, le texte ne bouge pas) le temps du geste.
function rendreGlissable(el, etape) {
  function debut(ev) {
    ev.preventDefault();
    const rect = el.getBoundingClientRect();
    const clone = el.cloneNode(true);
    Object.assign(clone.style, { position: "fixed", left: rect.left + "px", top: rect.top + "px",
      width: rect.width + "px", height: rect.height + "px", zIndex: "100", margin: "0", pointerEvents: "none" });
    document.body.appendChild(clone);
    el.style.visibility = "hidden";
    dragCtx = { el, clone, etape, offsetX: ev.clientX - rect.left, offsetY: ev.clientY - rect.top,
                startLeft: rect.left, startTop: rect.top };
    el.setPointerCapture(ev.pointerId);
    const zone = document.getElementById(etape.zone);
    if (zone) zone.classList.add("active");
  }
  function deplace(ev) {
    if (!dragCtx || dragCtx.el !== el) return;
    dragCtx.clone.style.left = (ev.clientX - dragCtx.offsetX) + "px";
    dragCtx.clone.style.top = (ev.clientY - dragCtx.offsetY) + "px";
  }
  function fin(ev) {
    if (!dragCtx || dragCtx.el !== el) return;
    const zoneEl = document.getElementById(etape.zone);
    let succes = false;
    if (zoneEl) {
      const zr = zoneEl.getBoundingClientRect(), cr = dragCtx.clone.getBoundingClientRect();
      const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
      succes = cx >= zr.left && cx <= zr.right && cy >= zr.top && cy <= zr.bottom;
    }
    if (zoneEl) zoneEl.classList.remove("active");
    if (succes) {
      dragCtx.clone.style.transition = "transform .18s ease, opacity .18s ease";
      dragCtx.clone.style.transform = "scale(0.3)";
      dragCtx.clone.style.opacity = "0";
      const clone = dragCtx.clone;
      setTimeout(() => { clone.remove(); marquerTache(etape.id, true); }, 160);
    } else {
      dragCtx.clone.style.transition = "left .3s ease, top .3s ease";
      dragCtx.clone.style.left = dragCtx.startLeft + "px";
      dragCtx.clone.style.top = dragCtx.startTop + "px";
      const clone = dragCtx.clone;
      setTimeout(() => { clone.remove(); el.style.visibility = ""; }, 300);
    }
    dragCtx = null;
  }
  el.addEventListener("pointerdown", debut);
  el.addEventListener("pointermove", deplace);
  el.addEventListener("pointerup", fin);
  el.addEventListener("pointercancel", fin);
}

// ---------------------------------------------------------------------
// 2. Fin de routine : félicitations puis appel au parent
// ---------------------------------------------------------------------
function finDeRoutine() {
  const routine = routineParId(routineActuelleId);
  const suite = "Maintenant va chercher papa ou maman pour obtenir ta récompense.";
  document.getElementById("bravo-routine-titre").textContent = routine.felicitation;
  document.getElementById("bravo-routine-soustitre").textContent = suite;
  afficherEcran("screen-bravo-routine");
  dire(routine.felicitation + " " + suite);
}

// ---------------------------------------------------------------------
// 3. Validation parent : code, puis une suite qui dépend de pourquoi on
// est là (`apresCodeValide`) — relecture/correction pour une routine
// (ci-dessous), ou juste continuer pour une simple confirmation
// d'arrivée (cf. allerValidationArrivee, pas de tâches à corriger).
// ---------------------------------------------------------------------
let codeSaisi = "";
let apresCodeValide = null;

function allerValidation() {
  const routine = routineParId(routineActuelleId);
  codeSaisi = "";
  document.getElementById("validation-sous-titre").textContent =
    "Un parent entre le code pour valider « " + routine.nom + " ».";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier();
  majCasesCode();
  apresCodeValide = () => {
    construireCorrection();
    document.getElementById("correction-wrap").classList.remove("hidden");
  };
  afficherEcran("screen-validation");
}

function construireClavier() {
  const clavier = document.getElementById("pavecode-clavier");
  clavier.innerHTML = "";
  const touches = ["1","2","3","4","5","6","7","8","9","⌫","0","OK"];
  touches.forEach(t => {
    const b = document.createElement("button");
    b.className = "touche-code";
    b.textContent = t;
    b.onclick = () => appuyerTouche(t);
    clavier.appendChild(b);
  });
}
function majCasesCode() {
  const cases = document.querySelectorAll(".case-code");
  cases.forEach((c, i) => c.classList.toggle("rempli", i < codeSaisi.length));
}
function appuyerTouche(t) {
  if (t === "⌫") { codeSaisi = codeSaisi.slice(0, -1); majCasesCode(); return; }
  if (t === "OK") { validerCode(); return; }
  if (codeSaisi.length >= 4) return;
  codeSaisi += t;
  majCasesCode();
  if (codeSaisi.length === 4) setTimeout(validerCode, 150);
}
function validerCode() {
  if (codeSaisi === CODE_PARENT) {
    document.getElementById("pavecode-erreur").textContent = "";
    document.getElementById("pavecode-wrap").classList.add("hidden");
    if (apresCodeValide) apresCodeValide();
  } else {
    document.getElementById("pavecode-erreur").textContent = "Code incorrect.";
    codeSaisi = "";
    majCasesCode();
  }
}

// relecture/correction : toutes les tâches de la routine sont ici
// déclickables (pas seulement l'étape en cours comme pendant la
// routine), pour que le parent puisse décocher ce qui n'a pas été fait.
function construireCorrection() {
  const etat = chargerEtat();
  const routine = routineParId(routineActuelleId);
  const etatR = etat.routines[routine.id];
  const liste = document.getElementById("correction-liste");
  liste.innerHTML = "";
  routine.taches.forEach(t => {
    const fait = etatR.fait.includes(t.id);
    const noeud = document.createElement("div");
    noeud.className = "noeud correctible" + (fait ? " fait" : "");
    noeud.innerHTML = `<div class="pastille-mini">${t.emoji}</div><div class="texte-etape">${t.texte}</div><div class="coche-mini">✓</div>`;
    noeud.onclick = () => {
      const e2 = chargerEtat();
      const r2 = e2.routines[routine.id];
      const pos = r2.fait.indexOf(t.id);
      if (pos === -1) r2.fait.push(t.id); else r2.fait.splice(pos, 1);
      sauverEtat(e2);
      synchroniserAvatar(e2);
      construireCorrection();
    };
    liste.appendChild(noeud);
  });
}

function validerRoutine() {
  const etat = chargerEtat();
  etat.routines[routineActuelleId].valide = true;
  etat.etoiles = (etat.etoiles || 0) + 1;
  sauverEtat(etat);
  jouerSon();
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  routineActuelleId = null;
  construireMenu();
}

// ---------------------------------------------------------------------
// 4. Récompense de fin de journée (une fois toutes les routines validées)
// ---------------------------------------------------------------------
function allerFinDeJournee() {
  const etat = chargerEtat();
  document.getElementById("coffre-texte").textContent = "Toutes les routines sont finies, Léon !";
  document.getElementById("coffre-recompense-texte").textContent = "+ " + (etat.etoiles || 0) + " ⭐ aujourd'hui";
  ouvrirCoffre("Bravo Léon, toutes les routines de la journée sont finies !", ["⭐", "✨", "🎉", "⭐", "✨"], () => allerAFin());
}

// Écran coffre : partagé entre la récompense de fin de journée (étoiles)
// et la récompense d'une aventure (pièce, cf. `terminerAventure`) — même
// geste d'ouverture, seuls le texte et la monnaie des confettis changent.
// `retour` est appelé quand le bouton "Terminé !" est pressé (pas
// toujours la même destination selon d'où vient la récompense).
let coffreRetour = null;
function ouvrirCoffre(texteVoix, symbolesConfettis, retour) {
  coffreRetour = retour;
  afficherEcran("screen-coffre");
  dire(texteVoix);
  jouerSon();
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  const emoji = document.getElementById("coffre-emoji");
  emoji.classList.remove("pop-ouverture"); void emoji.offsetWidth; emoji.classList.add("pop-ouverture");
  lancerConfettis(symbolesConfettis);
}

// petite volée de particules qui s'envolent à l'ouverture de la
// récompense — purement décoratif, respecte prefers-reduced-motion
function lancerConfettis(symboles) {
  const zone = document.getElementById("coffre-particules");
  zone.innerHTML = "";
  symboles.forEach((s, i) => {
    const p = document.createElement("span");
    p.className = "confetti";
    p.textContent = s;
    const angle = (i / symboles.length) * 360 + (Math.random() * 30 - 15);
    const distance = 70 + Math.random() * 30;
    p.style.setProperty("--dx", (Math.cos(angle * Math.PI / 180) * distance) + "px");
    p.style.setProperty("--dy", (Math.sin(angle * Math.PI / 180) * distance) + "px");
    p.style.animationDelay = (i * 40) + "ms";
    zone.appendChild(p);
  });
}

// ---------------------------------------------------------------------
// Trajet + arrivée — alimentés par l'aventure choisie (`aventureActuelleId`)
// et son sens (`sensTrajet`). Pas de minuteur/barre de progression : le
// trajet est un simple temps d'attente, et c'est un parent qui confirme
// "On est arrivés" (bouton -> code, cf. allerValidationArrivee) — pas
// l'enfant tout seul, et pas une horloge. Pauline reste accessible via ce
// même mécanisme mais n'est jamais programmée automatiquement (pas de
// `date`, cf. TODO.md) ; pour le moment seules les aventures listées
// dans `aventuresDuJour()` sont atteignables depuis l'écran des sorties.
// ---------------------------------------------------------------------
function allerAuTrajet() {
  const a = aventureParId(aventureActuelleId);
  const texte = sensTrajet === "retour" ? (a.texteTrajetRetour || "On rentre à la maison.") : a.texteTrajet;
  afficherEcran("screen-trajet");
  document.getElementById("trajet-texte").textContent = texte;
  document.getElementById("scene-trajet").classList.toggle("retour", sensTrajet === "retour");
  dire(texte);
}

function allerAArrivee() {
  const a = aventureParId(aventureActuelleId);
  afficherEcran("screen-arrivee");
  document.getElementById("arrivee-lieu").textContent = a.lieu;
  document.getElementById("arrivee-texte").textContent = a.texteArrivee;

  synchroniserAvatar(chargerEtat());
  const spritePersonne = document.getElementById("sprite-personne");
  if (a.personne) {
    spritePersonne.innerHTML = a.personne.emoji + "<span>" + a.personne.nom + "</span>";
    spritePersonne.classList.remove("hidden");
  } else {
    spritePersonne.classList.add("hidden");
    spritePersonne.innerHTML = "";
  }

  const programme = document.getElementById("arrivee-programme");
  programme.innerHTML = "";
  a.programme.forEach(ligne => {
    const div = document.createElement("div");
    div.className = "ligne-programme";
    div.textContent = ligne;
    programme.appendChild(div);
  });

  dire(a.texteArrivee);
}

// "C'est parti" (côté arrivée) ne termine pas l'aventure tout de suite :
// on repart d'abord vers la maison (trajet retour), et c'est cette
// arrivée-là, une fois validée par un parent, qui déclenche la
// récompense (cf. allerValidationArrivee).
function partirEnActivite() {
  sensTrajet = "retour";
  allerAuTrajet();
}

// Bouton "On est arrivés" du trajet (aller ou retour) : rien ne se passe
// tant qu'un parent n'a pas confirmé avec le code — même logique que la
// validation d'une routine, mais sans étape de correction (rien à
// décocher pour une simple confirmation d'arrivée).
function allerValidationArrivee() {
  const a = aventureParId(aventureActuelleId);
  codeSaisi = "";
  const lieu = sensTrajet === "retour" ? "la maison" : a.lieu;
  document.getElementById("validation-sous-titre").textContent =
    "Un parent entre le code pour confirmer l'arrivée : « " + lieu + " ».";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier();
  majCasesCode();
  apresCodeValide = sensTrajet === "retour" ? () => terminerAventure(a) : () => allerAArrivee();
  afficherEcran("screen-validation");
}

// Fin d'une aventure (une fois l'arrivée à la maison confirmée). Sans
// récompense propre (Pauline aujourd'hui) : retour direct au menu. Avec
// récompense (`recompensePieces` > 0) : la pièce sort du coffre, même
// écran/même geste que la récompense de fin de journée (cf.
// `ouvrirCoffre`).
function terminerAventure(a) {
  aventureActuelleId = null;
  if (a.recompensePieces > 0) {
    const total = ajouterPieces(a.recompensePieces);
    document.getElementById("coffre-texte").textContent = "Bravo Léon, tu as fait : " + a.lieu + " !";
    document.getElementById("coffre-recompense-texte").textContent =
      "+ " + a.recompensePieces + " 🪙 (" + total + " au total)";
    ouvrirCoffre("Bravo Léon, tu as gagné une pièce !", ["🪙", "✨", "🎉", "🪙", "✨"], () => construireMenu());
    return;
  }
  construireMenu();
}

// ---------------------------------------------------------------------
// 5. Fin de journée (écran de clôture)
// ---------------------------------------------------------------------
function allerAFin() {
  const etat = chargerEtat();
  etat.journeeFaite = true;
  sauverEtat(etat);
  document.getElementById("fin-etoiles").textContent = (etat.etoiles || 0) + " ⭐";
  afficherEcran("screen-fin");
}

function reinitialiserTout() {
  try { localStorage.removeItem("leon_journee"); } catch (e) {}
  derniereEtapeAnnoncee = null;
  routineActuelleId = null;
  construireMenu();
}

// Reset protégé par appui long (~900ms) : un tap accidentel ne doit jamais
// effacer la progression du jour. Remplit visuellement le bouton pendant
// l'appui pour que l'intention soit claire avant que ça se déclenche.
function protegerParAppuiLong(bouton, action, duree = 900) {
  let minuteur = null;
  const annuler = () => { clearTimeout(minuteur); minuteur = null; bouton.classList.remove("maintien"); };
  const demarrer = (ev) => {
    ev.preventDefault();
    bouton.classList.add("maintien");
    minuteur = setTimeout(() => {
      annuler();
      if (navigator.vibrate) navigator.vibrate(60);
      action();
    }, duree);
  };
  bouton.addEventListener("pointerdown", demarrer);
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => bouton.addEventListener(ev, annuler));
}

// ---------------------------------------------------------------------
// Horloge du menu — jour + heure, purement informatif (repère pour
// l'enfant/le parent, ne pilote aucune logique). Mise à jour même quand
// le menu n'est pas l'écran actif : coût négligeable, évite d'avoir à
// se souvenir de la relancer à chaque retour au menu.
// ---------------------------------------------------------------------
function majHorloge() {
  const el = document.getElementById("horloge");
  if (!el) return;
  const maintenant = new Date();
  const jour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const heure = maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  el.textContent = jour.charAt(0).toUpperCase() + jour.slice(1) + " — " + heure;
}
majHorloge();
setInterval(majHorloge, 15000);

// ---------------------------------------------------------------------
// Câblage des boutons + démarrage
// ---------------------------------------------------------------------
document.getElementById("btn-retour-routine").onclick = retourMenuDepuisRoutine;
document.getElementById("btn-voix-routine").onclick = () => dire(document.getElementById("etape-courante").textContent);
document.getElementById("btn-voix-coffre").onclick = () => dire(document.getElementById("coffre-texte").textContent);
document.getElementById("btn-voix-trajet").onclick = () => dire(document.getElementById("trajet-texte").textContent);
document.getElementById("btn-voix-arrivee").onclick = () => dire(document.getElementById("arrivee-texte").textContent);

protegerParAppuiLong(document.getElementById("btn-reset-test"), reinitialiserTout);

document.getElementById("btn-un-parent").onclick = allerValidation;
document.getElementById("btn-valider-routine").onclick = validerRoutine;

document.getElementById("btn-depart").onclick = allerVersDepart;
document.getElementById("btn-retour-menu").onclick = construireMenu;

document.getElementById("btn-journee").onclick = () => { construireJournee(); afficherEcran("screen-journee"); };
document.getElementById("btn-retour-menu-journee").onclick = construireMenu;
document.getElementById("btn-modifier-journee").onclick = basculerEditionJournee;

document.getElementById("btn-mes-recompenses").onclick = () => { construireRecompenses(); afficherEcran("screen-recompenses"); };
document.getElementById("btn-retour-menu-recompenses").onclick = construireMenu;

// Le bouton "Terminé !" du coffre ne va pas toujours au même endroit
// (fin de journée vs retour d'aventure) : `coffreRetour` est fixé par
// `ouvrirCoffre()` juste avant l'ouverture de l'écran.
document.getElementById("btn-continuer-coffre").onclick = () => { if (coffreRetour) coffreRetour(); };
document.getElementById("btn-arrive").onclick = allerValidationArrivee;
document.getElementById("btn-cest-parti").onclick = partirEnActivite;
protegerParAppuiLong(document.getElementById("btn-recommencer"), reinitialiserTout);

// point d'entrée : menu de la journée (le réveil, écran 01 du handoff,
// reste sauté pour ce prototype). Filet de sécurité : si quoi que ce
// soit plante ici (ex. un état corrompu malgré `etatRepare()`), on
// repart d'un état neuf plutôt que de laisser un écran vide sans recours
// pour un enfant seul devant la tablette — dernier recours seulement,
// `chargerEtat()` répare déjà les cas courants sans perdre la journée.
(function demarrer() {
  try {
    const etat = chargerEtat();
    if (etat.journeeFaite) { allerAFin(); return; }
    construireMenu();
  } catch (e) {
    try { localStorage.removeItem("leon_journee"); } catch (e2) {}
    construireMenu();
  }
})();
