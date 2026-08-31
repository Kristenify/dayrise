/*
 * Prototype de parcours — Léon ET Colette : menu de la journée → routines
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
 * Aventures : sorties programmées, accessibles depuis la porte "Partir à
 * l'aventure". Même écrans que le trajet/arrivée chez une praticienne
 * (génériques, alimentés par l'aventure du jour), mais certaines
 * rapportent une récompense différente d'une étoile de routine : une
 * pièce (cf. `chargerPieces`/`ajouterPieces` et
 * docs/produit/modele-de-donnees.md).
 *
 * Profils (PROFILS, plus bas) : CHAQUE ENFANT UTILISE SON PROPRE APPAREIL
 * — ce n'est PAS un sélecteur dans une même app partagée (Colette aura sa
 * tablette, distincte de celle de Léon). `profilActif()` détermine "quel
 * enfant est CET appareil" une bonne fois pour toutes (query param
 * `?enfant=`, retenu ensuite dans `localStorage` sur cet appareil, cf.
 * `resoudreProfilActif()`) — pas un choix qui revient à chaque session.
 * Toutes les clés `localStorage` propres à un enfant (journée, étoiles,
 * pièces, historique, routines/aventures perso) sont préfixées par
 * `profilActif().prefixe` (cf. `cle()`) ; celles de l'appareil/famille
 * (code parent, mode debug) restent partagées, cf. `codeParentActuel()`/
 * `modeDebugActif()`. Léon garde exactement ses clés `leon_...`
 * d'aujourd'hui (zéro migration, zéro risque sur sa tablette réelle) ;
 * Colette obtient les mêmes clés préfixées `colette_`. Voir
 * `docs/produit/modele-de-donnees.md` pour le détail de ce qui est
 * commun (REPAS, PLANNING_DEFAUT, moteur générique) vs propre à un enfant
 * (ROUTINES, vêtements/avatar, aventures avec une praticienne précise).
 *
 * Code parent : partagé par appareil (pas par enfant — mêmes parents des
 * deux côtés), 1234 par défaut tant qu'aucun n'a été enregistré.
 */

// ---------------------------------------------------------------------
// Mode debug (tests) : toujours actif sur un serveur de dev local
// (localhost/127.0.0.1, quel que soit le port — évite d'avoir à rouvrir
// `?debug=1` à chaque fois que le port change d'une session de test à
// l'autre) ; ailleurs (ex. une URL de prévisualisation non-localhost),
// activable une fois via `?debug=1` dans l'URL, retenu ensuite sur CET
// appareil/navigateur via `dayrise_debug` (localStorage) — partagé par
// appareil, pas par enfant (un appareil de test reste en debug quel que
// soit le profil affiché dessus, cf. `resoudreProfilActif()` plus bas).
// N'affecte jamais les tablettes réelles de Léon/Colette : elles ne
// chargent que l'URL GitHub Pages publiée, jamais un localhost (cf.
// app/README.md). Ajoute un bouton 🧪 (cf. index.html, symétrique de
// ⚙️/↺) qui ouvre un panneau listant tous les écrans, chacun atteint via
// sa vraie fonction d'entrée plutôt qu'un simple `afficherEcran` — pour
// ne jamais laisser un écran sans les données dont il dépend (routine en
// cours, aventure en cours...), comme s'il avait été atteint normalement.
(function initModeDebug() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has("debug")) {
      if (params.get("debug") === "0") localStorage.removeItem("dayrise_debug");
      else localStorage.setItem("dayrise_debug", "1");
    }
  } catch (e) {}
})();
function modeDebugActif() {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return true;
  // `leon_debug` : ancienne clé (avant le support multi-profil), lue en
  // secours pour ne pas redemander `?debug=1` sur un appareil qui l'avait
  // déjà activé — jamais réécrite.
  try { return localStorage.getItem("dayrise_debug") === "1" || localStorage.getItem("leon_debug") === "1"; } catch (e) { return false; }
}

// `dateDebugForcee` (Date, null = heure réelle) simule le moment présent
// pour les deux seuls verrous qui en dépendent réellement (réveil, cf.
// `dortEncore()`/`prochainReveil()` ; déblocage `disponibleApresHeure`,
// cf. `construireMenu()`) sans avoir à attendre ni à changer l'heure de
// l'appareil. Une vraie Date (pas juste une heure du jour) : `dortEncore()`
// compare à un horodatage du LENDEMAIN une fois le coucher simulé (cf.
// `endormir()`), donc avancer doit pouvoir passer minuit — se contenter de
// changer l'heure du jour courant ne débloquerait jamais le réveil.
// Volontairement en mémoire seulement (pas persisté) : un rechargement
// repart de l'heure réelle plutôt que de risquer de fausser une session
// ultérieure oubliée en mode debug.
let dateDebugForcee = null;
function dateActuelle() {
  return dateDebugForcee || new Date();
}

// Code parent : persisté à part (`dayrise_code_parent`), modifiable depuis
// l'espace parent (cf. demarrerChangementCode()) — "1234" tant qu'aucun
// nouveau code n'a été enregistré. Partagé par APPAREIL, pas par enfant
// (cf. resoudreProfilActif() plus bas) : ce sont les mêmes parents des
// deux côtés, pas une raison d'avoir deux codes à retenir.
function codeParentActuel() {
  try {
    // `leon_code_parent` : ancienne clé (avant le support multi-profil),
    // lue en secours pour ne pas réinitialiser silencieusement le code
    // qu'Alexandra a peut-être déjà changé sur la tablette de Léon —
    // jamais réécrite (sauverCodeParent() n'écrit plus que la nouvelle clé).
    return localStorage.getItem("dayrise_code_parent") || localStorage.getItem("leon_code_parent") || "1234";
  } catch (e) { return "1234"; }
}
function sauverCodeParent(code) {
  try { localStorage.setItem("dayrise_code_parent", code); } catch (e) {}
}

// ---------------------------------------------------------------------
// Profils (Léon, Colette, ...) — CHAQUE ENFANT SUR SON PROPRE APPAREIL,
// PAS un sélecteur dans une même app partagée. `resoudreProfilActif()`
// détermine une bonne fois pour toutes "quel enfant est cet appareil" :
// query param `?enfant=id` (une fois, comme `?debug=1`), retenu ensuite
// dans `localStorage` SUR CET APPAREIL (`dayrise_enfant`). Par défaut
// (aucun choix jamais fait) : "leon" — pour que la tablette de Léon,
// déjà en usage réel, continue de fonctionner sans aucune configuration
// après cette mise à jour. Un parent peut aussi changer le profil d'un
// appareil depuis l'espace parent (cf. `construireParentAppareil()`) —
// utile si un appareil est un jour réattribué, ou pour ajouter un 3ᵉ
// enfant plus tard (il suffit d'une nouvelle entrée dans PROFILS).
//
// `prefixe` retrouve exactement les clés `localStorage` déjà utilisées
// par le prototype Léon-seul (`leon_journee`, `leon_pieces`, ...) : zéro
// migration, zéro risque de perte sur sa tablette réelle. Colette obtient
// les mêmes clés préfixées `colette_`.
const PROFILS = {
  leon: {
    id: "leon",
    prefixe: "leon",
    prenom: "Léon",
    routines: () => ROUTINES_LEON,
    aventuresPropres: () => AVENTURES_LEON,
    chambre: "assets/scenes/chambre-leon.jpg",
    dodo: "assets/avatar/leon-dodo.png",
    sprites: {
      base: "assets/avatar/leon-base.png",
      calques: [
        { calque: "calque-calecon",     fichier: "assets/avatar/leon-calecon.png" },
        { calque: "calque-haut",        fichier: "assets/avatar/leon-haut.png" },
        { calque: "calque-pantalon",    fichier: "assets/avatar/leon-pantalon.png" },
        { calque: "calque-chaussettes", fichier: "assets/avatar/leon-chaussettes.png" },
        { calque: "calque-chaussures",  fichier: "assets/avatar/leon-chaussures.png" },
        { calque: "calque-manteau",     fichier: "assets/avatar/leon-manteau.png" },
      ],
    },
  },
  colette: {
    id: "colette",
    prefixe: "colette",
    prenom: "Colette",
    routines: () => ROUTINES_COLETTE,
    aventuresPropres: () => AVENTURES_COLETTE,
    chambre: "assets/scenes/chambre-colette.jpg",
    dodo: "assets/avatar/colette-dodo.png",
    sprites: {
      base: "assets/avatar/colette-base.png",
      calques: [
        { calque: "calque-culotte",     fichier: "assets/avatar/colette-culotte.png" },
        { calque: "calque-haut",        fichier: "assets/avatar/colette-haut.png" },
        { calque: "calque-robe",        fichier: "assets/avatar/colette-robe.png" },
        { calque: "calque-chaussettes", fichier: "assets/avatar/colette-chaussettes.png" },
        { calque: "calque-chaussures",  fichier: "assets/avatar/colette-chaussures.png" },
        { calque: "calque-manteau",     fichier: "assets/avatar/colette-manteau.png" },
      ],
    },
  },
};

(function initProfilActif() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.has("enfant") && PROFILS[params.get("enfant")]) {
      localStorage.setItem("dayrise_enfant", params.get("enfant"));
    }
  } catch (e) {}
})();
function profilActifId() {
  try {
    const stocke = localStorage.getItem("dayrise_enfant");
    if (stocke && PROFILS[stocke]) return stocke;
  } catch (e) {}
  return "leon";
}
function profilActif() { return PROFILS[profilActifId()]; }
// Préfixe une clé localStorage propre à l'enfant actif (journée, étoiles,
// historique, code, routines/aventures perso...) — jamais pour une clé
// partagée par appareil (code parent, debug), cf. plus haut.
function cle(nomBase) { return profilActif().prefixe + "_" + nomBase; }

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
//
// Une routine par enfant (ROUTINES_LEON / ROUTINES_COLETTE) plutôt qu'un
// seul catalogue partagé : même PRINCIPE (mêmes `id`/`nom`/nombre de
// routines, dans le même ordre — "par défaut, elles doivent être
// identiques") mais des TÂCHES propres à chaque enfant, notamment pour
// les vêtements (Colette a une culotte/un haut/une robe, pas un
// caleçon/pantalon) — cf. docs/produit/modele-de-donnees.md. Le moteur
// (synchroniserRoutineEcran, marquerTache, rendreGlissable...) reste
// entièrement générique et partagé : il ne lit jamais "shabiller" ou
// "calecon" en dur, seulement la structure Routine/Tâche. Un parent peut
// diverger encore plus au fil du temps (ex. ajouter/retirer une tâche
// chez l'un sans toucher l'autre) sans rien casser côté moteur.
const ROUTINES_LEON = [
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
    // Volontairement PAS chaînée après "S'habiller"/"Se préparer à
    // partir" (contrairement aux autres routines, cf. construireMenu()) :
    // le coucher n'a rien à voir avec le fait d'être habillé pour sortir,
    // et les enchaîner créait un vrai risque — si un parent relance
    // "S'habiller" en soirée (cf. espace parent), "Aller se coucher" se
    // serait retrouvée verrouillée juste avant le coucher. À la place,
    // débloquée par l'heure : avant `disponibleApresHeure`, elle reste
    // inaccessible (pour éviter l'autre risque inverse — un enfant qui
    // irait se déshabiller pour "aller se coucher" en pleine journée sans
    // avoir rien fait d'autre), après, elle l'est, indépendamment de
    // l'état des autres routines.
    disponibleApresHeure: 18,
    taches: [
      // `avatarGlissable: true` (au lieu de `zone`) : contrairement aux
      // autres tâches, ce n'est pas l'icône de la liste qu'on glisse vers
      // l'avatar, mais l'avatar (habillé) lui-même qu'on tire hors de la
      // scène — plus logique pour DÉshabiller que d'amener une carte
      // jusqu'à lui (cf. rendreAvatarGlissable, plus bas).
      { id: "enlever",  texte: "Enlève tes vêtements.", emoji: "👕",
        calque: ["calque-haut", "calque-pantalon", "calque-chaussettes", "calque-chaussures", "calque-manteau"],
        retire: true, avatarGlissable: true },
      // `pileGlissable: true` : contrairement aux autres tâches, ce n'est
      // pas l'icône de la liste qui se glisse vers `zone` mais la pile de
      // vêtements qui apparaît dans la scène une fois "enlever" fait (cf.
      // #pile-vetements, synchroniserRoutineEcran()) — matérialise les
      // habits qui viennent de tomber, plutôt que de les faire disparaître
      // pour de bon avant même cette tâche.
      { id: "ranger",   texte: "Range tes vêtements ou mets-les au sale.", emoji: "🧺", zone: "zone-panier", pileGlissable: true },
      // `miniJeu: "dents"` (au lieu de `zone`) : cette tâche s'ouvre en
      // tapant sa ligne (cf. ouvrirMiniJeu()) plutôt qu'en y glissant
      // l'icône — lance l'écran dédié `screen-dents` (minuteur +
      // 6 zones). `badge`/`badgeFait` restent : le ✨ sur le visage de
      // l'avatar continue de refléter que les dents sont faites, une
      // fois le mini-jeu terminé (marquerTache() y est appelé pareil).
      { id: "dents",    texte: "Brosse-toi les dents.",                   emoji: "🪥", miniJeu: "dents", badge: "visage", badgeFait: "✨" },
      // `miniJeu: "histoire"` (au lieu de `zone`), même principe que
      // "dents" ci-dessus : ouvre l'écran dédié `screen-histoire`
      // (image + texte) en tapant la ligne, plutôt qu'un glisser-déposer
      // — pas de geste à faire, juste un moment calme sur le canapé.
      { id: "histoire", texte: "On lit l'histoire.",                      emoji: "📖", miniJeu: "histoire" },
      { id: "coucher",  texte: "Je vais me coucher.",                     emoji: "😴", zone: "zone-pieds" },
    ],
  },
];

// Colette : mêmes `id`/`nom`/`emoji`/`lieu`, même nombre de routines, même
// ordre — seules les tâches de "S'habiller" et le vocabulaire genré
// changent (culotte/haut/robe au lieu de caleçon/t-shirt/pantalon ; les
// calques associés pointent vers assets/avatar/colette-*.png via
// PROFILS.colette.sprites, pas vers ceux de Léon). "Se préparer à partir"
// est réellement identique (les chaussures ne dépendent pas du genre).
const ROUTINES_COLETTE = [
  {
    id: "shabiller",
    nom: "S'habiller",
    emoji: "👕",
    lieu: "chambre",
    felicitation: "Bravo Colette, tu t'es habillée toute seule !",
    taches: [
      { id: "culotte",     texte: "Mets ta culotte.",      emoji: "🩲", zone: "zone-bassin", calque: "calque-culotte" },
      { id: "haut",        texte: "Mets ton haut.",        emoji: "👚", zone: "zone-torse",  calque: "calque-haut" },
      { id: "robe",        texte: "Mets ta robe.",         emoji: "👗", zone: "zone-jambes", calque: "calque-robe" },
      { id: "chaussettes", texte: "Mets tes chaussettes.", emoji: "🧦", zone: "zone-pieds",  calque: "calque-chaussettes" },
    ],
  },
  {
    id: "partir",
    nom: "Se préparer à partir",
    emoji: "🚪",
    lieu: "salon",
    felicitation: "Bravo Colette, tu es prête à partir !",
    taches: [
      { id: "chaussures", texte: "Mets tes chaussures.", emoji: "👟", zone: "zone-pieds", calque: "calque-chaussures" },
    ],
  },
  {
    id: "soir",
    nom: "Aller se coucher",
    emoji: "🌙",
    lieu: "chambre",
    felicitation: "Bravo Colette, tu es prête à dormir !",
    disponibleApresHeure: 18,
    taches: [
      { id: "enlever",  texte: "Enlève tes vêtements.", emoji: "👗",
        calque: ["calque-haut", "calque-robe", "calque-chaussettes", "calque-chaussures", "calque-manteau"],
        retire: true, avatarGlissable: true },
      { id: "ranger",   texte: "Range tes vêtements ou mets-les au sale.", emoji: "🧺", zone: "zone-panier", pileGlissable: true },
      { id: "dents",    texte: "Brosse-toi les dents.",                   emoji: "🪥", miniJeu: "dents", badge: "visage", badgeFait: "✨" },
      { id: "histoire", texte: "On lit l'histoire.",                      emoji: "📖", miniJeu: "histoire" },
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
// praticien (magasin, école...).
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
//
// Trois catalogues plutôt qu'un seul, pour maximiser ce qui est en commun
// SANS forcer une praticienne partagée entre les deux enfants :
// - AVENTURES_COMMUNES : identique pour tous les profils (l'école).
// - AVENTURES_LEON / AVENTURES_COLETTE : propres à un enfant (chacun a sa
//   psychomotricienne — Elsa pour Léon, Arianne pour Colette — même
//   Pauline, l'orthophoniste, reste spécifique à Léon). Même structure de
//   données que Pauline/le magasin de bricolage : rien de nouveau côté
//   moteur, juste de nouvelles entrées, cf. `toutesLesAventures()`.
const AVENTURES_COMMUNES = [
  {
    id: "ecole",
    lieu: "L'école",
    emoji: "🎒",
    texteTrajet: "On roule vers l'école.",
    texteArrivee: "On est arrivés à l'école.",
    programme: ["1. On dit au revoir", "2. On passe une bonne journée", "3. Un parent vient nous chercher"],
    recompensePieces: 0,
    texteTrajetRetour: "L'école est finie, on rentre à la maison.",
  },
];

const AVENTURES_LEON = [
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
    id: "elsa",
    lieu: "Chez Elsa",
    emoji: "🤸",
    texteTrajet: "On roule vers chez Elsa. Tu n'as rien à faire, tu peux regarder dehors.",
    personne: { emoji: "🧑‍⚕️", nom: "Elsa" },
    texteArrivee: "Elsa est là. Psychomotricienne, comme la dernière fois.",
    programme: ["1. On entre et on s'assoit", "2. On travaille avec Elsa", "3. On repart"],
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

const AVENTURES_COLETTE = [
  {
    id: "arianne",
    lieu: "Chez Arianne",
    emoji: "🤸",
    texteTrajet: "On roule vers chez Arianne. Tu n'as rien à faire, tu peux regarder dehors.",
    personne: { emoji: "🧑‍⚕️", nom: "Arianne" },
    texteArrivee: "Arianne est là. Psychomotricienne, comme la dernière fois.",
    programme: ["1. On entre et on s'assoit", "2. On travaille avec Arianne", "3. On repart"],
    recompensePieces: 0,
    texteTrajetRetour: "La séance est finie, on rentre à la maison.",
  },
];

let dragCtx = null;
let routineActuelleId = null;
let aventureActuelleId = null;
// "aller" (vers l'aventure) ou "retour" (vers la maison, après "C'est
// parti") — pilote le texte du trajet et ce que fait la validation
// parent de "On est arrivés" (cf. allerAuTrajet/allerValidationArrivee).
let sensTrajet = "aller";

// Activités créées par un parent (cf. ouvrirNouvelleAventure()) —
// persistées à part des catalogues en dur, jamais remises à zéro, sous
// une clé propre à l'enfant actif (cf. `cle()`). `toutesLesAventures()`
// est la vue combinée à utiliser partout où on cherche/liste des
// aventures : communes + propres au profil actif + créées par un parent
// pour ce profil — le reste du code n'a pas à savoir d'où une aventure
// donnée vient.
function chargerAventuresPerso() {
  try { return JSON.parse(localStorage.getItem(cle("aventures_perso")) || "[]"); } catch (e) { return []; }
}
function sauverAventuresPerso(liste) {
  try { localStorage.setItem(cle("aventures_perso"), JSON.stringify(liste)); } catch (e) {}
}
function toutesLesAventures() {
  return AVENTURES_COMMUNES.concat(profilActif().aventuresPropres()).concat(chargerAventuresPerso());
}

function aventureParId(id) { return toutesLesAventures().find(a => a.id === id); }
function aventuresDuJour() { return toutesLesAventures().filter(a => a.date === cleJour()); }
// Une aventure est accessible aujourd'hui dans "Partir à l'aventure" si
// et seulement si elle est dans le planning du jour (`etat.planning`) —
// pas directement via son champ `date`, qui ne sert qu'à l'y insérer une
// première fois (cf. `planningParDefaut()`). Ça lie directement les
// deux, comme demandé : ajouter/retirer une activité du planning
// l'ajoute/la retire de "Partir à l'aventure", que ce soit via "Ajouter
// à la journée" ou en créant une nouvelle activité.
function aventuresPlanifieesAujourdhui() {
  const etat = chargerEtat();
  return etat.planning
    .filter(it => it.type === "aventure")
    .map(it => aventureParId(it.id))
    .filter(Boolean);
}

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
  // Routines créées par un parent : absentes de PLANNING_DEFAUT (qui ne
  // connaît que le catalogue en dur), donc ajoutées ici en plus, à la
  // fin — récurrentes tous les jours comme les autres routines,
  // contrairement aux aventures qui ne reviennent que si programmées.
  chargerRoutinesPerso().forEach(r => {
    if (!items.some(it => it.type === "routine" && it.id === r.id)) items.push({ type: "routine", id: r.id });
  });
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
  toutesLesRoutines().forEach(r => { routines[r.id] = { fait: [], valide: false }; });
  return { jour: cleJour(), routines, etoiles: 0, journeeFaite: false, reveilFait: false, reveil: { bienDormi: null, humeur: null }, planning: planningParDefaut() };
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
  toutesLesRoutines().forEach(r => {
    if (!etat.routines[r.id] || !Array.isArray(etat.routines[r.id].fait)) {
      etat.routines[r.id] = { fait: [], valide: false };
    }
  });
  if (!Array.isArray(etat.planning)) etat.planning = planningParDefaut();
  if (typeof etat.etoiles !== "number") etat.etoiles = 0;
  if (typeof etat.journeeFaite !== "boolean") etat.journeeFaite = false;
  if (typeof etat.reveilFait !== "boolean") etat.reveilFait = false;
  if (!etat.reveil || typeof etat.reveil !== "object") etat.reveil = { bienDormi: null, humeur: null };
  return etat;
}

// Historique des journées passées (`cle("historique")`, ex. `leon_historique`
// pour Léon) — jamais remis à zéro, contrairement à `cle("journee")`.
// Demandé explicitement une fois l'usage réel commencé avec Léon :
// jusqu'ici, une journée terminée était perdue dès que la suivante
// commençait. Archivée ici, juste avant d'être écrasée par une nouvelle
// journée (cf. `chargerEtat()`) — pas à chaque reset de test
// (`reinitialiserTout()`), qui ne représente pas une vraie journée.
// Bornée à 90 entrées pour ne pas grossir sans fin.
function archiverJournee(etat) {
  if (!etat || !etat.routines) return; // rien d'exploitable à garder
  try {
    const historique = JSON.parse(localStorage.getItem(cle("historique")) || "[]");
    historique.push({
      jour: etat.jour,
      etoiles: etat.etoiles || 0,
      routinesValidees: toutesLesRoutines().filter(r => etat.routines[r.id] && etat.routines[r.id].valide).map(r => r.id),
      journeeFaite: !!etat.journeeFaite,
      reveil: etat.reveil || { bienDormi: null, humeur: null },
    });
    while (historique.length > 90) historique.shift();
    localStorage.setItem(cle("historique"), JSON.stringify(historique));
  } catch (e) {}
}

function chargerEtat() {
  let etat = null;
  try { const b = localStorage.getItem(cle("journee")); etat = b ? JSON.parse(b) : null; } catch (e) {}

  if (etat && etat.jour && etat.jour !== cleJour()) {
    archiverJournee(etat);
    etat = null;
  }

  etat = etatRepare(etat) || etatParDefaut();
  sauverEtat(etat);
  return etat;
}
function sauverEtat(etat) {
  try { localStorage.setItem(cle("journee"), JSON.stringify(etat)); } catch (e) {}
}
// Routines créées par un parent (cf. creerNouvelleRoutine()) — même
// principe que chargerAventuresPerso()/toutesLesAventures() : persistées
// à part du catalogue en dur du profil actif, jamais remises à zéro,
// fusionnées partout où le code cherche/liste des routines pour que le
// reste ne distingue pas d'où une routine donnée vient.
function chargerRoutinesPerso() {
  try { return JSON.parse(localStorage.getItem(cle("routines_perso")) || "[]"); } catch (e) { return []; }
}
function sauverRoutinesPerso(liste) {
  try { localStorage.setItem(cle("routines_perso"), JSON.stringify(liste)); } catch (e) {}
}
function toutesLesRoutines() { return profilActif().routines().concat(chargerRoutinesPerso()); }

function routineParId(id) { return toutesLesRoutines().find(r => r.id === id); }

// Pièces : monnaie gagnée en aventure, distincte des étoiles de routine.
// Stockée à part de `cle("journee")` et JAMAIS remise à zéro au
// changement de jour (contrairement aux étoiles) : une pièce reste
// gagnée jusqu'à être dépensée par l'enfant (activité de son choix) ou
// donnée à ses parents dans la vraie vie — ce n'est pas une jauge
// quotidienne.
function chargerPieces() {
  try {
    const n = JSON.parse(localStorage.getItem(cle("pieces")));
    return typeof n === "number" && n >= 0 ? n : 0;
  } catch (e) { return 0; }
}
function sauverPieces(n) {
  try { localStorage.setItem(cle("pieces"), JSON.stringify(n)); } catch (e) {}
}
// Seul point d'entrée qui écrit `cle("pieces")` (avec `sauverPieces`,
// jamais appelée ailleurs) : le total ne peut donc **jamais diminuer**,
// même si `n` était un jour négatif par erreur (`Math.max(0, n)`) — les
// pièces ne se remettent pas à zéro comme les étoiles, et rien dans
// l'app ne doit pouvoir les retirer du compte, cf. plus haut ("dépensée
// ... dans la vraie vie", pas une transaction dans l'app). Fonctionne
// déjà pour Colette (clé propre à son profil via `cle()`) sans variante
// parallèle, pour garder la même garantie des deux côtés.
function ajouterPieces(n) {
  const total = chargerPieces() + Math.max(0, n);
  sauverPieces(total);
  return total;
}

// toutes les tâches faites, toutes routines confondues — pour que
// l'avatar reste cohérent (habits déjà mis) sur tous les écrans
function tachesFaitesPartout(etat) {
  const s = new Set();
  toutesLesRoutines().forEach(r => (etat.routines[r.id].fait || []).forEach(id => s.add(id)));
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
// Avatar : construit les calques <img> depuis le profil actif, une seule
// fois au démarrage (cf. appliquerProfilAuDom(), appelée depuis demarrer())
// — seule leur VISIBILITÉ change ensuite à chaque rendu, cf.
// synchroniserAvatar() juste après. index.html ne contient plus la liste
// de calques en dur (spécifique à Léon) dans ses 3 emplacements
// (#avatar-wrap-menu, #avatar-wrap, #avatar-wrap-arrivee) : un seul point
// de vérité ici, alimenté par `profilActif().sprites`, plutôt que de
// dupliquer 2x la même liste de balises `<img>` dans le HTML (Léon/
// Colette) alors qu'un seul profil est actif par appareil (cf. PROFILS).
// Insère toujours AVANT les `.badge-zone` (dos/visage), qui restent en
// dur dans index.html et doivent rester par-dessus les vêtements.
function construireCalquesAvatar(idConteneur) {
  const conteneur = document.getElementById(idConteneur);
  if (!conteneur) return;
  conteneur.querySelectorAll(".avatar-calque").forEach(img => img.remove());
  const profil = profilActif();
  const base = document.createElement("img");
  base.className = "avatar-calque";
  base.src = profil.sprites.base;
  base.alt = "";
  conteneur.prepend(base);
  const avantBadge = conteneur.querySelector(".badge-zone");
  profil.sprites.calques.forEach(c => {
    const img = document.createElement("img");
    img.className = "avatar-calque";
    img.dataset.calque = c.calque;
    img.src = c.fichier;
    img.alt = "";
    conteneur.insertBefore(img, avantBadge);
  });
}

// Applique le profil actif aux quelques endroits du DOM qui affichent son
// prénom ou son avatar en dur dans index.html (le reste — routines,
// textes parlés... — vient déjà des catalogues par profil, cf. PROFILS/
// ROUTINES_LEON/ROUTINES_COLETTE plus haut). Appelé une seule fois au
// démarrage (cf. demarrer()) : le profil actif ne change pas en cours de
// session (cf. resoudreProfilActif()) — changer d'appareil, pas d'onglet.
function appliquerProfilAuDom() {
  const profil = profilActif();
  document.title = "Dayrise — " + profil.prenom;
  ["prenom-menu", "prenom-routine", "arrivee-prenom-enfant"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = profil.prenom;
  });
  ["avatar-wrap-menu", "avatar-wrap", "avatar-wrap-arrivee"].forEach(construireCalquesAvatar);
  // L'écran "en sommeil" reste volontairement SANS la photo de chambre
  // (contrairement à #scene pendant une routine, cf.
  // synchroniserRoutineEcran()) : fond sombre et uni pour ne pas être
  // lumineux juste avant/pendant le sommeil — cf. #screen-dodo dans
  // styles.css.
  //
  // Avatar endormi (allongé de tout son long, yeux fermés, sous une
  // couette) plutôt qu'un simple emoji générique — propre à chaque
  // enfant comme le reste de l'avatar (cf. PROFILS[id].dodo, généré par
  // scripts/generate_sprites_detailed_preview.py, draw_dodo()). Ses
  // couleurs sont volontairement atténuées en CSS (cf. #dodo-avatar dans
  // styles.css), même logique de sobriété que l'absence de décor.
  document.getElementById("dodo-avatar").src = profil.dodo;
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
  toutesLesRoutines().forEach(r => r.taches.forEach(t => {
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

  // Déclenché par "Aller se coucher" spécifiquement, pas par le fait que
  // toutes les routines du jour soient validées : Léon peut très bien
  // n'avoir rien fait d'autre de la journée et aller directement se
  // coucher, ce doit quand même clôturer la journée.
  if (etat.routines.soir.valide && !etat.journeeFaite) {
    allerFinDeJournee();
    return;
  }

  synchroniserAvatar(etat);

  // jauge de journée : une étoile par routine, gagnée une fois validée
  const jauge = document.getElementById("jauge-jour");
  jauge.innerHTML = "";
  toutesLesRoutines().forEach(r => {
    const etoile = document.createElement("div");
    etoile.className = "etoile-jauge" + (etat.routines[r.id].valide ? " gagnee" : "");
    etoile.textContent = "⭐";
    jauge.appendChild(etoile);
  });
  const piecesTotal = chargerPieces();
  document.getElementById("pieces-total").textContent = piecesTotal > 0 ? "🪙 " + piecesTotal : "";

  // cartes de routines : la première non validée est jouable, les
  // suivantes restent grisées tant que TOUTES les précédentes ne sont
  // pas validées — pas juste l'immédiatement précédente. Distinction qui
  // ne se voyait pas tant que les routines s'enchaînaient forcément dans
  // l'ordre, mais compte depuis qu'un parent peut relancer une routine
  // du milieu (cf. relancerRoutine()) : sans ça, une routine plus loin
  // dans la liste réapparaîtrait débloquée juste parce que celle qui la
  // précède immédiatement est restée validée, en sautant celle qu'on
  // vient de relancer.
  //
  // Une routine avec `disponibleApresHeure` (ex. "Aller se coucher")
  // sort volontairement de ce chaînage : ni bloquée par les précédentes,
  // ni prise en compte pour bloquer une éventuelle suivante — débloquée
  // par l'heure plutôt que par les autres routines (cf. sa définition
  // dans ROUTINES_LEON/ROUTINES_COLETTE pour le pourquoi).
  //
  // De même, seules les routines du catalogue par défaut du profil actif
  // (`profilActif().routines()`) s'enchaînent entre elles : une routine
  // créée par un parent (chargerRoutinesPerso) est toujours disponible,
  // ni bloquée par les précédentes ni prise en compte pour bloquer une
  // suivante — sinon un petit-déjeuner ajouté par un parent se
  // retrouverait verrouillé derrière "S'habiller"/"Se préparer à partir"
  // du seul fait d'avoir été créé après elles, sans aucun rapport réel
  // entre les deux.
  const liste = document.getElementById("liste-routines");
  liste.innerHTML = "";
  let toutPrecedentValide = true;
  toutesLesRoutines().forEach(r => {
    const etatR = etat.routines[r.id];
    const carte = document.createElement("div");
    carte.dataset.id = r.id;

    if (r.disponibleApresHeure !== undefined) {
      const heureAtteinte = dateActuelle().getHours() >= r.disponibleApresHeure;
      const debloquee = heureAtteinte && !etatR.valide;
      carte.className = "carte-routine" + (etatR.valide ? " faite" : (!heureAtteinte ? " verrouillee" : ""));
      carte.innerHTML = `<div class="carte-routine-nom">${r.nom}</div><div class="carte-routine-etat">${etatR.valide ? "✓" : (heureAtteinte ? "" : "🕒")}</div>`;
      if (debloquee) carte.onclick = () => demarrerRoutine(r.id);
      else if (!etatR.valide) carte.onclick = () => dire("Ce n'est pas encore l'heure pour « " + r.nom + " ».");
      liste.appendChild(carte);
      return;
    }

    const chainee = profilActif().routines().some(rr => rr.id === r.id);
    const verrouillee = chainee && !toutPrecedentValide;
    const debloquee = !verrouillee && !etatR.valide;
    // "verrouillee" ne s'applique qu'à une routine PAS ENCORE validée —
    // sinon une routine déjà faite (ex. "Se préparer à partir") peut se
    // retrouver visuellement "verrouillée" après qu'un parent a relancé
    // une routine précédente depuis l'espace parent, alors qu'elle reste
    // bel et bien validée.
    carte.className = "carte-routine" + (etatR.valide ? " faite" : (verrouillee ? " verrouillee" : ""));
    carte.innerHTML = `<div class="carte-routine-nom">${r.nom}</div><div class="carte-routine-etat">${etatR.valide ? "✓" : (verrouillee ? "🔒" : "")}</div>`;
    if (debloquee) carte.onclick = () => demarrerRoutine(r.id);
    liste.appendChild(carte);
    if (chainee) toutPrecedentValide = toutPrecedentValide && etatR.valide;
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
  const manquantes = profilActif().routines().filter(r => ROUTINES_REQUISES_DEPART.includes(r.id) && !etat.routines[r.id].valide);
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

// Écran des sorties du jour : liste les aventures du planning
// (`aventuresPlanifieesAujourdhui()` — pas `aventuresDuJour()`, qui ne
// sert qu'à l'ensemencement initial d'une nouvelle journée), sinon
// garde le texte d'origine "Rien de prévu aujourd'hui !".
function construireMissions() {
  const duJour = aventuresPlanifieesAujourdhui();
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
  ecranAvantValidation = document.querySelector(".screen.active").id;
  codeSaisi = "";
  modeCode = "verifier";
  document.getElementById("validation-sous-titre").textContent = "Un parent entre le code pour modifier la journée.";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier(document.getElementById("pavecode-clavier"), appuyerTouche);
  majCasesCode(document.getElementById("pavecode-cases"), codeSaisi);
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
// par exemple —, repas) et n'est pas déjà dans le planning. Inclut les
// activités créées par un parent (cf. `toutesLesAventures()`) au même
// titre que celles du catalogue en dur.
function construireAjoutPlanning(etat) {
  const bloc = document.createElement("div");
  const label = document.createElement("div");
  label.className = "groupe-journee-titre";
  label.textContent = "AJOUTER À LA JOURNÉE";
  bloc.appendChild(label);

  const dejaLa = new Set(etat.planning.map(it => it.type + ":" + it.id));
  const candidats = [
    ...toutesLesRoutines().map(r => ({ type: "routine", id: r.id, emoji: r.emoji, nom: r.nom })),
    ...toutesLesAventures().map(a => ({ type: "aventure", id: a.id, emoji: a.emoji, nom: a.lieu })),
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
    // Même recadrage CSS (.piece-visage) pour les deux enfants : les deux
    // sprites de base viennent du même générateur, tête au même endroit
    // sur la même grille (cf. scripts/generate_sprites_detailed_preview.py).
    '<div class="piece-visage"><img src="' + profilActif().sprites.base + '" alt=""></div>',
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
  // Panier de linge : présent en permanence pendant "Aller se coucher",
  // pas seulement pendant la tâche "ranger" — sert de repère fixe avant
  // même que les vêtements ne tombent (cf. #panier-linge, index.html).
  document.getElementById("panier-linge").classList.toggle("visible", routine.id === "soir");

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

  // Avatar directement glissable pour une tâche `avatarGlissable` (ex.
  // "enlève tes vêtements") : la poignée invisible est reconstruite à
  // chaque rendu (comme #chemin plus bas) pour ne jamais accumuler
  // d'écouteurs sur #avatar-wrap, qui lui reste le même élément DOM
  // d'un rendu à l'autre (contrairement aux lignes de #chemin, recréées
  // à chaque fois). L'avatar respire doucement (`.invite-glisser`) pour
  // inviter le geste tant que cette tâche est en cours.
  const avatarWrapRoutine = document.getElementById("avatar-wrap");
  avatarWrapRoutine.classList.toggle("invite-glisser", !!(prochaine && prochaine.avatarGlissable));
  document.getElementById("fleche-detacher").classList.toggle("visible", !!(prochaine && prochaine.avatarGlissable));
  const poignee = document.getElementById("avatar-poignee");
  poignee.innerHTML = "";
  if (prochaine && prochaine.avatarGlissable) {
    const poigneeGlissable = document.createElement("div");
    poigneeGlissable.className = "poignee-glissable";
    poignee.appendChild(poigneeGlissable);
    rendreAvatarGlissable(poigneeGlissable, avatarWrapRoutine, prochaine);
  }

  // Pile de vêtements pour une tâche `pileGlissable` (ex. "Range tes
  // vêtements") : matérialise dans la scène ce qui vient de tomber
  // pendant `avatarGlissable` (ci-dessus), plutôt que de le faire
  // disparaître pour de bon avant même cette tâche. Reconstruite à
  // chaque rendu (même raison que la poignée avatar) ; se glisse comme
  // n'importe quelle icône de tâche normale (rendreGlissable(), vers
  // `zone`), juste depuis la scène plutôt que depuis la liste.
  const pileConteneur = document.getElementById("pile-vetements");
  pileConteneur.innerHTML = "";
  if (prochaine && prochaine.pileGlissable) {
    const pile = document.createElement("div");
    pile.className = "pile-glissable";
    pile.textContent = "👕";
    pileConteneur.appendChild(pile);
    rendreGlissable(pile, prochaine);
  }

  // liste : toutes les tâches restent visibles, pour que l'enfant voie
  // d'un coup d'œil la quantité totale à accomplir. Plus aucune ligne
  // n'est tapable (retour de terrain : l'enfant hésitait entre taper la
  // ligne et glisser l'icône) — seule l'icône de l'étape en cours, agrandie,
  // est glissable ; le texte reste affiché à côté pendant le geste
  // (lecture globale). Les tâches faites descendent en bas de liste.
  // Exception : une tâche `avatarGlissable` (ci-dessus) n'a pas d'icône
  // glissable dans la liste — le geste se fait sur l'avatar, pas ici.
  const restantes = routine.taches.filter(t => !etatR.fait.includes(t.id));
  const faites = routine.taches.filter(t => etatR.fait.includes(t.id));
  const liste = document.getElementById("chemin"); liste.innerHTML = "";
  [...restantes, ...faites].forEach(t => {
    const fait = etatR.fait.includes(t.id);
    const enCours = prochaine && t.id === prochaine.id;
    const noeud = document.createElement("div");
    noeud.className = "noeud" + (fait ? " fait" : "") + (enCours ? " en-cours" : "") + (enCours && t.miniJeu ? " noeud-tapable" : "");
    const glisserIci = enCours && !t.avatarGlissable && !t.miniJeu && !t.pileGlissable;
    const classeIcone = "pastille-mini" + (glisserIci ? " pastille-glissable" : "");
    noeud.innerHTML = `<div class="${classeIcone}">${t.emoji}</div><div class="texte-etape">${t.texte}</div><div class="coche-mini">✓</div>`;
    if (glisserIci) rendreGlissable(noeud.querySelector(".pastille-glissable"), t);
    // `miniJeu` (ex. "dents") : ouvre un écran dédié en tapant la ligne,
    // plutôt qu'en y glissant l'icône (cf. ouvrirMiniJeu()).
    if (enCours && t.miniJeu) noeud.onclick = () => ouvrirMiniJeu(t);
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

// Variante de rendreGlissable() pour une tâche `avatarGlissable` (ex.
// "enlève tes vêtements") : ce qu'on glisse n'est pas une icône de la
// liste vers une zone, mais les vêtements ACTUELLEMENT PORTÉS (ceux
// listés dans `etape.calque`) tirés hors de la scène — succès si on les
// lâche sous le bas de #scene (pas de zone précise à viser, cible
// volontairement large et sans ambiguïté avec la tâche suivante "Range
// tes vêtements", qui a sa propre zone-dos).
//
// Retour de terrain (session précédente) : cloner tout #avatar-wrap et
// le cacher pendant le geste faisait disparaître Léon entier de la
// scène, pas juste ses habits — pas intuitif ("enlève TES vêtements",
// pas "pars"). Ici seuls les calques visibles concernés sont clonés
// (donc juste le t-shirt/pantalon/etc.) ; le reste de l'avatar (corps,
// visage...) ne bouge jamais.
//
// `poignee` est une zone de tap invisible superposée à l'avatar
// (#avatar-poignee, reconstruite à chaque rendu) : les calques de
// l'avatar ont `pointer-events:none`, il faut donc un élément dédié
// pour capter le geste, sur toute la silhouette (on peut attraper
// n'importe quel vêtement visible en tapant n'importe où sur lui).
// Cacher/remontrer un calque utilise le même mécanisme que
// synchroniserAvatar() (classe `visible`, jamais de style inline) pour
// qu'un futur passage de synchroniserAvatar() (ex. après un "Relancer
// une routine" parent) ne se heurte pas à un style oublié.
function rendreAvatarGlissable(poignee, avatarWrap, etape) {
  function debut(ev) {
    ev.preventDefault();
    const rect = avatarWrap.getBoundingClientRect();
    const calques = Array.isArray(etape.calque) ? etape.calque : [etape.calque];
    const imgs = calques
      .map(c => avatarWrap.querySelector('.avatar-calque[data-calque="' + c + '"]'))
      .filter(img => img && img.classList.contains("visible"));
    const clone = document.createElement("div");
    Object.assign(clone.style, { position: "fixed", left: rect.left + "px", top: rect.top + "px",
      width: rect.width + "px", height: rect.height + "px", zIndex: "100", pointerEvents: "none" });
    imgs.forEach(img => {
      const imgClone = img.cloneNode(true); // clone AVANT de cacher l'original : garde la classe "visible" (opacity/scale)
      Object.assign(imgClone.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
      clone.appendChild(imgClone);
      img.classList.remove("visible");
    });
    document.body.appendChild(clone);
    dragCtx = { el: avatarWrap, clone, etape, imgs, offsetX: ev.clientX - rect.left, offsetY: ev.clientY - rect.top,
                startLeft: rect.left, startTop: rect.top };
    poignee.setPointerCapture(ev.pointerId);
  }
  function deplace(ev) {
    if (!dragCtx || dragCtx.el !== avatarWrap) return;
    dragCtx.clone.style.left = (ev.clientX - dragCtx.offsetX) + "px";
    dragCtx.clone.style.top = (ev.clientY - dragCtx.offsetY) + "px";
  }
  function fin(ev) {
    if (!dragCtx || dragCtx.el !== avatarWrap) return;
    const sr = document.getElementById("scene").getBoundingClientRect();
    const cr = dragCtx.clone.getBoundingClientRect();
    const succes = (cr.top + cr.height / 2) > sr.bottom;
    const imgs = dragCtx.imgs;
    if (succes) {
      dragCtx.clone.style.transition = "transform .2s ease, opacity .2s ease";
      dragCtx.clone.style.transform = "translateY(40px)";
      dragCtx.clone.style.opacity = "0";
      const clone = dragCtx.clone;
      setTimeout(() => {
        clone.remove();
        // les vêtements restent cachés (classe déjà retirée) : la tâche
        // est faite, marquerTache() -> synchroniserAvatar() confirme le
        // même état, rien à restaurer ici contrairement à l'échec.
        marquerTache(etape.id, true);
      }, 180);
    } else {
      dragCtx.clone.style.transition = "left .3s ease, top .3s ease";
      dragCtx.clone.style.left = dragCtx.startLeft + "px";
      dragCtx.clone.style.top = dragCtx.startTop + "px";
      const clone = dragCtx.clone;
      setTimeout(() => {
        clone.remove();
        imgs.forEach(img => img.classList.add("visible")); // remis sur le vrai avatar
      }, 300);
    }
    dragCtx = null;
  }
  poignee.addEventListener("pointerdown", debut);
  poignee.addEventListener("pointermove", deplace);
  poignee.addEventListener("pointerup", fin);
  poignee.addEventListener("pointercancel", fin);
}

// ---------------------------------------------------------------------
// Mini-jeu : brossage de dents (tâche `miniJeu: "dents"`) — écran dédié
// (screen-dents), pas un simple glisser-déposer comme le reste (cf.
// TODO.md, "Pas encore designé"). 6 zones dans l'ordre où les brosser
// (haut-gauche → haut-devant → haut-droite → bas-gauche → bas-devant →
// bas-droite), chacune avec sa part du minuteur total (3 minutes ÷ 6 =
// 30s/zone).
//
// Volontairement AUCUNE action requise de l'enfant pendant le brossage
// (demandé explicitement) : il doit se concentrer sur le geste réel
// avec sa vraie brosse à dents, pas sur l'écran. Le minuteur démarre
// tout seul à l'ouverture et avance tout seul, zone après zone
// (`dentsEnCours`, vrai par défaut) — la seule interaction possible est
// de le mettre en pause/reprendre (bouton dédié, cf. toggleDentsPause()),
// jamais requise. Une fois les 6 zones épuisées, marque la tâche `dents` de la
// routine en cours comme faite (même geste que les autres — son,
// vibration, étoile de tâche via marquerTache()) et revient à
// l'écran de routine.
const ZONES_DENTS = ["haut-gauche", "haut-devant", "haut-droite", "bas-gauche", "bas-devant", "bas-droite"];
const LIBELLES_ZONES_DENTS = {
  "haut-gauche": "en haut, à gauche", "haut-devant": "en haut, devant", "haut-droite": "en haut, à droite",
  "bas-gauche": "en bas, à gauche",   "bas-devant": "en bas, devant",   "bas-droite": "en bas, à droite",
};
const DUREE_BROSSAGE_SEC = 180; // 3 minutes au total
const DUREE_PAR_ZONE = DUREE_BROSSAGE_SEC / ZONES_DENTS.length;

let dentsEtapeRoutine = null; // la tâche `dents` de la routine en cours, pour marquerTache() à la fin
let dentsZoneIndex = 0;
let dentsTempsRestant = DUREE_PAR_ZONE;
let dentsEnCours = true; // le minuteur avance tout seul par défaut ; false seulement si mis en pause
let dentsMinuteurId = null;

// Point d'entrée générique pour toute tâche `miniJeu` (aujourd'hui, une
// seule valeur possible : "dents") — dispatché depuis
// synchroniserRoutineEcran() au tap sur la ligne de la tâche.
function ouvrirMiniJeu(etape) {
  if (etape.miniJeu === "dents") demarrerBrossageDents(etape);
  if (etape.miniJeu === "histoire") ouvrirHistoire(etape);
}

function demarrerBrossageDents(etape) {
  dentsEtapeRoutine = etape;
  dentsZoneIndex = 0;
  dentsTempsRestant = DUREE_PAR_ZONE;
  dentsEnCours = true; // démarre tout seul, cf. commentaire plus haut
  const barre = document.getElementById("dents-barre");
  if (barre.childElementCount !== ZONES_DENTS.length) {
    barre.innerHTML = "";
    ZONES_DENTS.forEach(() => barre.appendChild(document.createElement("div")));
  }
  majAffichageDents();
  afficherEcran("screen-dents");
  dire("Brosse tes dents, zone par zone. Commence " + LIBELLES_ZONES_DENTS[ZONES_DENTS[0]] + ".");
  if (dentsMinuteurId) clearInterval(dentsMinuteurId); // sécurité, ne devrait jamais rester actif
  dentsMinuteurId = setInterval(tickDents, 250);
}

// Seule action possible pendant le brossage — jamais requise, juste
// disponible (ex. interruption). Ne modifie ni la zone ni le temps
// restant, juste si le minuteur avance.
function toggleDentsPause() {
  dentsEnCours = !dentsEnCours;
  majAffichageDents();
}

function tickDents() {
  if (!dentsEnCours) return;
  dentsTempsRestant = Math.max(0, dentsTempsRestant - 0.25);
  majAffichageDents();
  if (dentsTempsRestant <= 0) avancerZoneDents();
}

function avancerZoneDents() {
  jouerSon();
  if (navigator.vibrate) navigator.vibrate(30);
  dentsZoneIndex++;
  if (dentsZoneIndex >= ZONES_DENTS.length) { finBrossageDents(); return; }
  dentsTempsRestant = DUREE_PAR_ZONE;
  // dentsEnCours n'est pas touché : le minuteur enchaîne sur la zone
  // suivante sans s'arrêter, sauf si l'enfant/parent l'a mis en pause.
  majAffichageDents();
  dire("Brosse maintenant " + LIBELLES_ZONES_DENTS[ZONES_DENTS[dentsZoneIndex]] + ".");
}

function finBrossageDents() {
  clearInterval(dentsMinuteurId);
  dentsMinuteurId = null;
  dire("Bravo, tes dents sont propres !");
  const etape = dentsEtapeRoutine;
  dentsEtapeRoutine = null;
  marquerTache(etape.id, true); // met à jour l'avatar (badge ✨), le son/vibration/étoile de tâche habituels
  afficherEcran("screen-routine");
}

// Quitter avant la fin (bouton retour) : rien n'est encore enregistré
// dans etat.routines (seul finBrossageDents() appelle marquerTache()),
// donc rien à perdre — mais il faut couper le minuteur, sinon il continue
// de tourner en arrière-plan et pourrait déclencher avancerZoneDents()
// sur un écran qu'on a quitté.
function quitterBrossageDents() {
  if (dentsMinuteurId) { clearInterval(dentsMinuteurId); dentsMinuteurId = null; }
  dentsEtapeRoutine = null;
  afficherEcran("screen-routine");
}

// ---------------------------------------------------------------------
// Mini-jeu : histoire du soir (tâche `miniJeu: "histoire"`) — écran dédié
// (screen-histoire), même principe que les dents ci-dessus mais sans
// minuteur : juste une image (parent/enfants sur le canapé, cf.
// app/assets/scenes/histoire-soir.jpg) et un texte, le temps que la
// lecture ait vraiment lieu à côté de la tablette. C'est un parent qui
// appuie sur "L'histoire est finie" une fois la lecture terminée (comme
// "On est arrivés"/"C'est parti" en aventure) — pas l'enfant, il n'y a
// rien à faire ici, juste à écouter.
const TEXTE_HISTOIRE = "On lit l'histoire du soir, on reste assis calmement sur le canapé et on profite de ce moment de détente et de partage.";
let histoireEtapeRoutine = null;

function ouvrirHistoire(etape) {
  histoireEtapeRoutine = etape;
  document.getElementById("histoire-texte").textContent = TEXTE_HISTOIRE;
  afficherEcran("screen-histoire");
  dire(TEXTE_HISTOIRE);
}

// Échappatoire pour un tap accidentel sur la ligne, même principe que
// retourMenuDepuisRoutine() : rien n'est encore enregistré (seul
// finHistoire() appelle marquerTache()), donc rien à perdre.
function quitterHistoire() {
  histoireEtapeRoutine = null;
  afficherEcran("screen-routine");
}

function finHistoire() {
  const etape = histoireEtapeRoutine;
  histoireEtapeRoutine = null;
  marquerTache(etape.id, true);
  afficherEcran("screen-routine");
}

function formatChrono(secondes) {
  const total = Math.ceil(secondes);
  return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
}

function majAffichageDents() {
  document.querySelectorAll(".zone-dent").forEach((zoneEl, i) => {
    const remplissage = zoneEl.querySelector(".zone-dent-remplissage");
    if (i < dentsZoneIndex) {
      zoneEl.classList.add("faite"); zoneEl.classList.remove("active", "brossage-actif");
      remplissage.style.height = "100%";
    } else if (i === dentsZoneIndex) {
      zoneEl.classList.remove("faite"); zoneEl.classList.add("active");
      zoneEl.classList.toggle("brossage-actif", dentsEnCours); // anime tant que le minuteur avance, plus lié au toucher
      remplissage.style.height = ((1 - dentsTempsRestant / DUREE_PAR_ZONE) * 100) + "%";
    } else {
      zoneEl.classList.remove("faite", "active", "brossage-actif");
      remplissage.style.height = "0%";
    }
  });
  document.getElementById("dents-consigne").textContent = "Brosse " + LIBELLES_ZONES_DENTS[ZONES_DENTS[dentsZoneIndex]] + ".";
  document.getElementById("dents-chrono").textContent = formatChrono(dentsTempsRestant);
  const barre = document.getElementById("dents-barre");
  [...barre.children].forEach((seg, i) => seg.classList.toggle("fait", i < dentsZoneIndex));
  const btnPause = document.getElementById("btn-pause-dents");
  btnPause.textContent = dentsEnCours ? "⏸️ Pause" : "▶️ Reprendre";
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
// Écran actif juste avant d'ouvrir screen-validation (n'importe laquelle
// de ses 5 entrées : validation de routine, édition de la journée,
// espace parent, changement de code, confirmation d'arrivée) — capturé
// pour que le bouton retour du bandeau puisse y ramener sans avoir à
// connaître spécifiquement d'où on vient.
let ecranAvantValidation = null;
// "verifier" (code existant, cas normal) | "nouveau1"/"nouveau2" (les
// deux saisies successives d'un nouveau code, cf. demarrerChangementCode()).
let modeCode = "verifier";
let premierNouveauCode = "";
// Bouton de la correction (#btn-valider-routine) : sert à la fois à
// valider une routine tout juste finie (étoile) et à confirmer une
// relance de routine depuis l'espace parent (pas d'étoile en plus,
// cf. confirmerRelanceRoutine()) — même écran/liste, action différente.
let actionCorrection = null;

function allerValidation() {
  ecranAvantValidation = document.querySelector(".screen.active").id;
  const routine = routineParId(routineActuelleId);
  codeSaisi = "";
  modeCode = "verifier";
  document.getElementById("validation-sous-titre").textContent =
    "Un parent entre le code pour valider « " + routine.nom + " ».";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier(document.getElementById("pavecode-clavier"), appuyerTouche);
  majCasesCode(document.getElementById("pavecode-cases"), codeSaisi);
  apresCodeValide = () => {
    document.getElementById("correction-note").textContent = "Décoche ce qui n'a pas vraiment été fait, puis valide.";
    document.getElementById("btn-valider-routine").textContent = "Valider — donner l'étoile ⭐";
    actionCorrection = validerRoutine;
    construireCorrection();
    document.getElementById("correction-wrap").classList.remove("hidden");
  };
  afficherEcran("screen-validation");
}

// Généralisé (conteneur + callback) pour servir aussi bien le pavé du
// code existant que celui d'un nouveau code (cf. demarrerChangementCode())
// sans dupliquer le clavier.
function construireClavier(conteneur, onTouche) {
  conteneur.innerHTML = "";
  const touches = ["1","2","3","4","5","6","7","8","9","⌫","0","OK"];
  touches.forEach(t => {
    const b = document.createElement("button");
    b.className = "touche-code";
    b.textContent = t;
    b.onclick = () => onTouche(t);
    conteneur.appendChild(b);
  });
}
function majCasesCode(conteneurCases, saisi) {
  const cases = conteneurCases.querySelectorAll(".case-code");
  cases.forEach((c, i) => c.classList.toggle("rempli", i < saisi.length));
}
function appuyerTouche(t) {
  if (t === "⌫") { codeSaisi = codeSaisi.slice(0, -1); majCasesCode(document.getElementById("pavecode-cases"), codeSaisi); return; }
  if (t === "OK") { validerCode(); return; }
  if (codeSaisi.length >= 4) return;
  codeSaisi += t;
  majCasesCode(document.getElementById("pavecode-cases"), codeSaisi);
  if (codeSaisi.length === 4) setTimeout(validerCode, 150);
}
function validerCode() {
  const cases = document.getElementById("pavecode-cases");

  if (modeCode === "verifier") {
    if (codeSaisi === codeParentActuel()) {
      document.getElementById("pavecode-erreur").textContent = "";
      document.getElementById("pavecode-wrap").classList.add("hidden");
      if (apresCodeValide) apresCodeValide();
    } else {
      document.getElementById("pavecode-erreur").textContent = "Code incorrect.";
      codeSaisi = "";
      majCasesCode(cases, codeSaisi);
    }
    return;
  }

  // Changement de code (cf. demarrerChangementCode()) : deux saisies
  // identiques de suite avant d'être enregistré, comme un changement de
  // mot de passe classique — évite d'enregistrer une faute de frappe.
  if (modeCode === "nouveau1") {
    premierNouveauCode = codeSaisi;
    codeSaisi = "";
    modeCode = "nouveau2";
    document.getElementById("validation-sous-titre").textContent = "Retape le même code pour confirmer.";
    majCasesCode(cases, codeSaisi);
    return;
  }
  // modeCode === "nouveau2"
  if (codeSaisi === premierNouveauCode) {
    sauverCodeParent(premierNouveauCode);
    document.getElementById("pavecode-wrap").classList.add("hidden");
    dire("Nouveau code enregistré.");
    modeCode = "verifier";
    construireEspaceParent();
    afficherEcran("screen-parent");
  } else {
    document.getElementById("pavecode-erreur").textContent = "Les deux codes ne correspondent pas. On recommence.";
    codeSaisi = "";
    premierNouveauCode = "";
    modeCode = "nouveau1";
    document.getElementById("validation-sous-titre").textContent = "Entre le nouveau code à 4 chiffres.";
    majCasesCode(cases, codeSaisi);
  }
}

// relecture/correction : toutes les tâches de la routine sont ici
// déclickables (pas seulement l'étape en cours comme pendant la
// routine), pour que le parent puisse décocher ce qui n'a pas été fait
// (ou plus vrai, cf. relancerRoutine()).
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
// Espace parent — hub protégé par le code, pour que les changements
// faits ici aient un effet direct sur ce que l'enfant voit (même état
// `leon_journee`/`localStorage`, pas un outil séparé). Cf.
// docs/produit/concept.md pour la philosophie.
// ---------------------------------------------------------------------
function ouvrirEspaceParent() {
  ecranAvantValidation = document.querySelector(".screen.active").id;
  codeSaisi = "";
  modeCode = "verifier";
  document.getElementById("validation-sous-titre").textContent = "Un parent entre le code pour accéder à l'espace parent.";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier(document.getElementById("pavecode-clavier"), appuyerTouche);
  majCasesCode(document.getElementById("pavecode-cases"), codeSaisi);
  apresCodeValide = () => {
    construireEspaceParent();
    afficherEcran("screen-parent");
  };
  afficherEcran("screen-validation");
}

function construireEspaceParent() {
  const conteneur = document.getElementById("parent-contenu");
  conteneur.innerHTML = "";
  const options = [
    {
      emoji: "🔁", titre: "Relancer une routine",
      soustitre: "Si l'état de " + profilActif().prenom + " a changé (ex. il/elle s'est redéshabillé·e)",
      action: () => { construireParentRoutines(); afficherEcran("screen-parent-routines"); },
    },
    {
      emoji: "🗓️", titre: "Planning du jour",
      soustitre: "Réordonner, retirer ou ajouter les activités d'aujourd'hui",
      action: () => { journeeEnEdition = true; construireJournee(); afficherEcran("screen-journee"); },
    },
    {
      emoji: "📅", titre: "Historique des journées",
      soustitre: "Revoir les jours précédents",
      action: () => { construireHistorique(); afficherEcran("screen-parent-historique"); },
    },
    {
      emoji: "🔑", titre: "Changer le code parent",
      soustitre: "Code à 4 chiffres, actuellement " + codeParentActuel().replace(/./g, "•"),
      action: () => { demarrerChangementCode(); },
    },
    {
      emoji: "🗺️", titre: "Activités",
      soustitre: "Voir toutes les sorties, ou en créer une nouvelle",
      action: () => { construireParentActivites(); afficherEcran("screen-parent-activites"); },
    },
    {
      emoji: "🧩", titre: "Routines",
      soustitre: "Voir toutes les routines, ou en créer une nouvelle",
      action: () => { construireRoutinesCatalogue(); afficherEcran("screen-parent-routines-catalogue"); },
    },
    {
      emoji: "📱", titre: "Cet appareil",
      soustitre: "Affiche " + profilActif().prenom + " — changer l'enfant de cet appareil",
      action: () => { construireParentAppareil(); afficherEcran("screen-parent-appareil"); },
    },
  ];
  options.forEach(o => {
    const carte = document.createElement("div");
    carte.className = "carte-routine carte-parent" + (o.action ? "" : " verrouillee");
    carte.innerHTML =
      `<div class="carte-routine-nom">${o.emoji} ${o.titre}<div class="carte-parent-soustitre">${o.soustitre}</div></div>`;
    if (o.action) carte.onclick = o.action;
    conteneur.appendChild(carte);
  });
}

// "Cet appareil" : quel profil (PROFILS) cet appareil affiche — PAS un
// sélecteur destiné à l'enfant (cf. resoudreProfilActif()/PROFILS plus
// haut, et le TODO "gestion des profils" qui a motivé cet écran) :
// Colette a sa propre tablette, distincte de celle de Léon. Sert à
// configurer un appareil une bonne fois pour toutes (au lieu de
// mémoriser la syntaxe `?enfant=...` dans l'URL), ou à en réattribuer un
// (remplacement, ajout d'un 3ᵉ enfant plus tard — il suffira d'une
// nouvelle entrée dans PROFILS pour qu'elle apparaisse ici automatiquement).
function construireParentAppareil() {
  const actif = profilActifId();
  const liste = document.getElementById("parent-appareil-liste");
  liste.innerHTML = "";
  Object.values(PROFILS).forEach(p => {
    const carte = document.createElement("div");
    carte.className = "carte-routine" + (p.id === actif ? " faite" : "");
    carte.innerHTML = `<div class="carte-routine-nom">${p.prenom}</div><div class="carte-routine-etat">${p.id === actif ? "✓ actif" : ""}</div>`;
    if (p.id !== actif) carte.onclick = () => changerProfilAppareil(p.id);
    liste.appendChild(carte);
  });
}

// Change le profil de CET appareil (pas juste la session en cours) puis
// recharge : à peu près tout l'état affiché (routines, avatar, étoiles,
// jauge...) est déterminé au chargement via `profilActif()`, un
// rechargement est donc plus sûr qu'essayer de tout re-synchroniser à la
// main depuis ce seul écran.
function changerProfilAppareil(id) {
  try { localStorage.setItem("dayrise_enfant", id); } catch (e) {}
  location.reload();
}

// Liste des routines avec leur état, pour choisir laquelle relancer.
// Toutes affichées (pas seulement les validées) : un parent peut aussi
// vouloir corriger une routine en cours sans attendre la fin.
function construireParentRoutines() {
  const etat = chargerEtat();
  document.getElementById("parent-routines-intro").textContent =
    "Si l'état de " + profilActif().prenom + " a changé (ex. il/elle s'est redéshabillé·e), choisis la routine à relancer.";
  const liste = document.getElementById("parent-routines-liste");
  liste.innerHTML = "";
  toutesLesRoutines().forEach(r => {
    const etatR = etat.routines[r.id];
    const etatTexte = etatR.valide
      ? "✓ validée"
      : (etatR.fait.length > 0 ? etatR.fait.length + "/" + r.taches.length : "pas commencée");
    const carte = document.createElement("div");
    carte.className = "carte-routine";
    carte.innerHTML = `<div class="carte-routine-nom">${r.emoji} ${r.nom}</div><div class="carte-routine-etat">${etatTexte}</div>`;
    carte.onclick = () => relancerRoutine(r.id);
    liste.appendChild(carte);
  });
}

// Réutilise l'écran/la liste de correction déjà construits pour la
// validation parent (mêmes éléments DOM), mais sans redemander le code
// (déjà dans l'espace parent authentifié) et avec une action différente
// à la confirmation (cf. confirmerRelanceRoutine, pas de nouvelle étoile).
function relancerRoutine(id) {
  routineActuelleId = id;
  const routine = routineParId(id);
  document.getElementById("validation-sous-titre").textContent = "Relancer « " + routine.nom + " ».";
  document.getElementById("pavecode-wrap").classList.add("hidden");
  document.getElementById("correction-note").textContent = "Décoche ce qui n'est plus vrai, puis mets à jour.";
  document.getElementById("btn-valider-routine").textContent = "Mettre à jour";
  actionCorrection = confirmerRelanceRoutine;
  construireCorrection();
  document.getElementById("correction-wrap").classList.remove("hidden");
  afficherEcran("screen-validation");
}

// Si la routine était validée, on retire l'étoile qu'elle avait
// rapportée : elle sera regagnée quand l'enfant la revalidera pour de
// bon, sinon le compteur d'étoiles serait gonflé. `journeeFaite` et le
// verrou de sommeil (`cle("reveil")`, cf. `endormir`) ne repassent à faux
// que si c'est "Aller se coucher" qu'on relance — cf. construireMenu() :
// c'est la seule routine qui conditionne la journée "finie", relancer
// une autre routine (ex. correction sur "S'habiller" après coup) n'a pas
// à rouvrir l'écran de clôture ni à réveiller l'app.
function confirmerRelanceRoutine() {
  const etat = chargerEtat();
  const etatR = etat.routines[routineActuelleId];
  if (etatR.valide) {
    etatR.valide = false;
    etat.etoiles = Math.max(0, (etat.etoiles || 0) - 1);
  }
  if (routineActuelleId === "soir") {
    etat.journeeFaite = false;
    try { localStorage.removeItem(cle("reveil")); } catch (e) {}
  }
  sauverEtat(etat);
  synchroniserAvatar(etat);
  jouerSon();
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  routineActuelleId = null;
  construireParentRoutines();
  afficherEcran("screen-parent-routines");
}

function construireHistorique() {
  const conteneur = document.getElementById("parent-historique-liste");
  conteneur.innerHTML = "";
  let historique = [];
  try { historique = JSON.parse(localStorage.getItem(cle("historique")) || "[]"); } catch (e) {}
  if (historique.length === 0) {
    const vide = document.createElement("div");
    vide.className = "recompenses-vide";
    vide.textContent = "Pas encore de journée archivée.";
    conteneur.appendChild(vide);
    return;
  }
  historique.slice().reverse().forEach(j => {
    const noms = j.routinesValidees.map(id => { const r = routineParId(id); return r ? r.nom : id; });
    const resume = noms.length > 0 ? noms.join(", ") : "aucune routine validée";
    const ligne = document.createElement("div");
    ligne.className = "ligne-journee";
    ligne.innerHTML =
      `<span class="emoji-journee">📅</span>` +
      `<span class="texte-journee">` +
        `<span>${j.jour} — ${j.etoiles} ⭐ — ${resume}</span>` +
        texteReveilHistorique(j.reveil) +
      `</span>`;
    conteneur.appendChild(ligne);
  });
}

// Ligne secondaire "réveil" (bien dormi / humeur, cf. finReveil) sous une
// journée archivée. Chaîne vide (donc rien affiché) pour les journées
// d'avant cette fonctionnalité (pas de `reveil` dans l'archive, cf.
// archiverJournee) ou si le rituel n'a jamais été fait ce jour-là (les
// deux réponses restent à `null`) — pas de placeholder "pas de données"
// pour ne pas alourdir une liste qui peut compter jusqu'à 90 entrées.
function texteReveilHistorique(reveil) {
  if (!reveil || (reveil.bienDormi === null && !reveil.humeur)) return "";
  const parts = [];
  if (reveil.bienDormi !== null) parts.push(reveil.bienDormi ? "😊 A bien dormi" : "😞 N'a pas bien dormi");
  const h = reveil.humeur && EMOJI_HUMEUR.find(e => e.id === reveil.humeur);
  if (h) parts.push(h.emoji + " " + h.texte);
  return parts.length ? `<span class="texte-journee-reveil">${parts.join(" · ")}</span>` : "";
}

// Deux saisies identiques de suite avant d'enregistrer (cf. `validerCode()`,
// branche "nouveau1"/"nouveau2") — réutilise le même pavé que la
// vérification du code existant, pas de nouvel écran.
function demarrerChangementCode() {
  ecranAvantValidation = document.querySelector(".screen.active").id;
  codeSaisi = "";
  modeCode = "nouveau1";
  premierNouveauCode = "";
  document.getElementById("validation-sous-titre").textContent = "Entre le nouveau code à 4 chiffres.";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier(document.getElementById("pavecode-clavier"), appuyerTouche);
  majCasesCode(document.getElementById("pavecode-cases"), codeSaisi);
  afficherEcran("screen-validation");
}

// Liste de toutes les activités (catalogue en dur + créées par un
// parent) — accès + création, cf. carte "Activités" du hub. Toucher une
// activité l'ajoute/la retire du planning du jour, donc de "Partir à
// l'aventure" (même logique que le catalogue de "Ma journée", ici
// recentré sur les seules activités).
function construireParentActivites() {
  const etat = chargerEtat();
  const planifiees = new Set(etat.planning.filter(it => it.type === "aventure").map(it => it.id));
  const liste = document.getElementById("parent-activites-liste");
  liste.innerHTML = "";
  toutesLesAventures().forEach(a => {
    const programmee = planifiees.has(a.id);
    const carte = document.createElement("div");
    carte.className = "carte-routine" + (programmee ? " faite" : "");
    carte.innerHTML =
      `<div class="carte-routine-nom">${a.emoji} ${a.lieu}</div><div class="carte-routine-etat">${programmee ? "✓ aujourd'hui" : ""}</div>`;
    carte.onclick = () => basculerActivitePlanning(a.id);
    liste.appendChild(carte);
  });
}

function basculerActivitePlanning(id) {
  const etat = chargerEtat();
  const pos = etat.planning.findIndex(it => it.type === "aventure" && it.id === id);
  if (pos === -1) etat.planning.push({ type: "aventure", id }); else etat.planning.splice(pos, 1);
  sauverEtat(etat);
  construireParentActivites();
}

// Nouvelle activité : formulaire minimal. Une nouvelle aventure n'a ni
// `personne` ni `date` fixe : elle est ajoutée directement au planning
// du jour à la création (voir `creerNouvelleAventure()`), c'est ça qui
// la rend accessible dans "Partir à l'aventure" plutôt qu'un champ date
// à remplir.
const EMOJI_ACTIVITE = ["🏊","🚲","🎨","🎪","🍕","🌳","⚽","🎬","🏥","🛒","🎵","🧩","🎡","🐶","🎳","🍦"];
let emojiChoisiActivite = EMOJI_ACTIVITE[0];

// Grille de choix d'emoji, générique (réutilisée par les formulaires
// activité ET routine) : `conteneur` reçoit les boutons, `actuel` marque
// celui sélectionné, `onChoix(e)` est rappelé au clic — à l'appelant de
// mettre à jour sa variable et de reconstruire la grille.
function construireGrilleEmoji(conteneur, liste, actuel, onChoix) {
  conteneur.innerHTML = "";
  liste.forEach(e => {
    const b = document.createElement("button");
    b.className = "emoji-choix-btn" + (e === actuel ? " choisi" : "");
    b.textContent = e;
    b.onclick = () => onChoix(e);
    conteneur.appendChild(b);
  });
}
function construireGrilleEmojiActivite() {
  construireGrilleEmoji(document.getElementById("na-emoji-grille"), EMOJI_ACTIVITE, emojiChoisiActivite,
    (e) => { emojiChoisiActivite = e; construireGrilleEmojiActivite(); });
}

function ouvrirNouvelleAventure() {
  ["na-nom", "na-trajet", "na-arrivee", "na-etape1", "na-etape2", "na-etape3"]
    .forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("na-piece").checked = false;
  document.getElementById("na-erreur").textContent = "";
  emojiChoisiActivite = EMOJI_ACTIVITE[0];
  construireGrilleEmojiActivite();
  afficherEcran("screen-parent-nouvelle-aventure");
}

// Pré-remplit trajet/arrivée à partir du nom dès qu'il quitte le champ —
// simple suggestion (grammaire pas garantie, ex. "à le" au lieu de "au"),
// jamais écrasée si le parent a déjà tapé quelque chose dans ces champs.
function suggererTextesActivite() {
  const nom = document.getElementById("na-nom").value.trim();
  if (!nom) return;
  const trajetEl = document.getElementById("na-trajet");
  const arriveeEl = document.getElementById("na-arrivee");
  if (!trajetEl.value.trim()) trajetEl.value = "On roule vers " + nom + ".";
  if (!arriveeEl.value.trim()) arriveeEl.value = "On est arrivés à " + nom + ".";
}

function creerNouvelleAventure() {
  const nom = document.getElementById("na-nom").value.trim();
  const texteTrajet = document.getElementById("na-trajet").value.trim();
  const texteArrivee = document.getElementById("na-arrivee").value.trim();
  const e1 = document.getElementById("na-etape1").value.trim();
  const e2 = document.getElementById("na-etape2").value.trim();
  const e3 = document.getElementById("na-etape3").value.trim();
  const pieceOui = document.getElementById("na-piece").checked;

  if (!nom || !texteTrajet || !texteArrivee || !e1 || !e2 || !e3) {
    document.getElementById("na-erreur").textContent = "Remplis tous les champs avant de créer l'activité.";
    return;
  }

  const nouvelle = {
    id: "perso-" + Date.now(),
    lieu: nom,
    emoji: emojiChoisiActivite,
    texteTrajet,
    texteArrivee,
    programme: ["1. " + e1, "2. " + e2, "3. " + e3],
    recompensePieces: pieceOui ? 1 : 0,
    texteTrajetRetour: "On a fini, on rentre à la maison.",
    // Comme "Le magasin de bricolage" : après "Se préparer à partir",
    // pas juste après le petit-déj — l'enfant ne peut de toute façon pas
    // partir en aventure avant d'être habillé/prêt.
    apres: { type: "routine", id: "partir" },
  };

  const perso = chargerAventuresPerso();
  perso.push(nouvelle);
  sauverAventuresPerso(perso);

  const etat = chargerEtat();
  etat.planning.push({ type: "aventure", id: nouvelle.id });
  sauverEtat(etat);

  dire("Nouvelle activité créée : " + nom + ".");
  construireParentActivites();
  afficherEcran("screen-parent-activites");
}

// Catalogue des routines (accès + création, carte "Routines" du hub).
// Contrairement aux activités, une routine n'a pas d'interrupteur
// jour par jour — elle fait partie du parcours tous les jours dès
// qu'elle existe (cf. `toutesLesRoutines()`, `planningParDefaut()`).
// Liste donc en lecture seule (mêmes lignes que l'historique, pas des
// cartes tapables) plutôt qu'un bascule comme pour les activités — pour
// corriger une routine précise, "Relancer une routine" reste l'écran
// dédié.
function construireRoutinesCatalogue() {
  const etat = chargerEtat();
  const liste = document.getElementById("parent-routines-catalogue-liste");
  liste.innerHTML = "";
  toutesLesRoutines().forEach(r => {
    const etatR = etat.routines[r.id];
    const etatTexte = etatR.valide
      ? "✓ validée"
      : (etatR.fait.length > 0 ? etatR.fait.length + "/" + r.taches.length : "pas commencée");
    const ligne = document.createElement("div");
    ligne.className = "ligne-journee";
    ligne.innerHTML =
      `<span class="emoji-journee">${r.emoji}</span><span class="texte-journee">${r.nom}</span><span class="carte-routine-etat">${etatTexte}</span>`;
    liste.appendChild(ligne);
  });
}

// Nouvelle routine : contrairement à une activité, une routine a un
// nombre variable de tâches, chacune ciblant une zone précise de
// l'avatar (`.zone-cible` dans index.html) — jusqu'à 5 lignes de tâche
// fixes dans le formulaire, les vides sont simplement ignorées (au
// moins une requise). Pas de `calque` proposé (ça demanderait un sprite
// existant pour chaque nouveau vêtement/objet) : chaque tâche a son
// propre emoji, affiché tel quel, sans effet persistant sur l'avatar —
// comme "Range tes vêtements"/"Je vais me coucher" dans "Aller se
// coucher" aujourd'hui.
const EMOJI_ROUTINE = ["🪥","🛁","🧦","🧸","📚","🍽️","🧴","✏️","🧹","🚿","🎒","👕","🧼","⏰","🌟","🧦"];
const ZONE_PAR_DEFAUT_ROUTINE = "zone-torse";
let emojiChoisiRoutine = EMOJI_ROUTINE[0];
let lieuChoisiRoutine = "chambre";

function construireGrilleEmojiRoutine() {
  construireGrilleEmoji(document.getElementById("nr-emoji-grille"), EMOJI_ROUTINE, emojiChoisiRoutine,
    (e) => { emojiChoisiRoutine = e; construireGrilleEmojiRoutine(); });
}

function choisirLieuRoutine(lieu) {
  lieuChoisiRoutine = lieu;
  document.getElementById("nr-lieu-chambre").classList.toggle("choisi", lieu === "chambre");
  document.getElementById("nr-lieu-salon").classList.toggle("choisi", lieu === "salon");
}

function ouvrirNouvelleRoutine() {
  document.getElementById("nr-nom").value = "";
  for (let i = 1; i <= 5; i++) {
    document.getElementById("nr-t" + i + "-texte").value = "";
    document.getElementById("nr-t" + i + "-emoji").value = "";
    document.getElementById("nr-t" + i + "-zone").value = ZONE_PAR_DEFAUT_ROUTINE;
  }
  document.getElementById("nr-erreur").textContent = "";
  emojiChoisiRoutine = EMOJI_ROUTINE[0];
  construireGrilleEmojiRoutine();
  choisirLieuRoutine("chambre");
  afficherEcran("screen-parent-nouvelle-routine");
}

function creerNouvelleRoutine() {
  const nom = document.getElementById("nr-nom").value.trim();
  const taches = [];
  for (let i = 1; i <= 5; i++) {
    const texte = document.getElementById("nr-t" + i + "-texte").value.trim();
    if (!texte) continue;
    const emoji = document.getElementById("nr-t" + i + "-emoji").value.trim() || "✅";
    const zone = document.getElementById("nr-t" + i + "-zone").value;
    taches.push({ id: "t" + i, texte, emoji, zone });
  }

  if (!nom || taches.length === 0) {
    document.getElementById("nr-erreur").textContent = "Donne un nom et remplis au moins une tâche avant de créer la routine.";
    return;
  }

  const nouvelle = {
    id: "routine-perso-" + Date.now(),
    nom,
    emoji: emojiChoisiRoutine,
    lieu: lieuChoisiRoutine,
    felicitation: "Bravo " + profilActif().prenom + ", tu as fini : " + nom + " !",
    taches,
  };

  const perso = chargerRoutinesPerso();
  perso.push(nouvelle);
  sauverRoutinesPerso(perso);

  // Ajoutée tout de suite à l'état du jour (etat.routines) et au
  // planning d'aujourd'hui — sinon `toutesLesRoutines()` la connaîtrait
  // déjà, mais un `etat.routines`/`etat.planning` chargé avant sa
  // création ne l'aurait pas. `planningParDefaut()` s'occupe des jours
  // suivants (routine récurrente, cf. sa définition).
  const etat = chargerEtat();
  etat.routines[nouvelle.id] = { fait: [], valide: false };
  etat.planning.push({ type: "routine", id: nouvelle.id });
  sauverEtat(etat);

  dire("Nouvelle routine créée : " + nom + ".");
  construireRoutinesCatalogue();
  afficherEcran("screen-parent-routines-catalogue");
}

// ---------------------------------------------------------------------
// 4. Récompense de fin de journée (une fois "Aller se coucher" validée),
// puis endormissement de l'app jusqu'au lendemain HEURE_REVEIL
// ---------------------------------------------------------------------
// Message de clôture de la journée, pas un récapitulatif des routines
// faites (cf. les appelants : déclenché par "Aller se coucher" seule,
// même si l'enfant n'a rien fait d'autre de la journée). Identique à
// l'écrit et à l'oral (cf. `dire`). Fonction (pas une constante) : dépend
// du prénom du profil actif.
function texteFinJournee(profil) {
  return "Bravo pour toutes les routines que tu as faites aujourd'hui " + profil.prenom + ". Bonne nuit et à demain.";
}
const HEURE_REVEIL = 7;
function texteReveilBonjour(profil) { return "Bonjour " + profil.prenom; }
const TEXTE_REVEIL_DORMI = "As-tu bien dormi ?";
const TEXTE_REVEIL_HUMEUR = "Comment te sens-tu ? Choisis bien ta réponse avec l'image qui te plaît le plus.";

function afficherRecompenseFinDeJournee(etat) {
  document.getElementById("coffre-texte").textContent = texteFinJournee(profilActif());
  document.getElementById("coffre-recompense-texte").textContent = "+ " + (etat.etoiles || 0) + " ⭐ aujourd'hui";
}

// `cle("reveil")` (horodatage ISO, prochain HEURE_REVEIL) est
// volontairement une clé à part de `cle("journee")` : cette dernière
// repart de zéro dès que la date change (cf. `chargerEtat`), ce qui
// arrive à minuit — bien avant l'heure de réveil. Le verrou doit
// survivre à ce passage de minuit pour tenir jusqu'au matin.
function prochainReveil(depuis) {
  const reveil = new Date(depuis);
  reveil.setHours(HEURE_REVEIL, 0, 0, 0);
  if (reveil <= depuis) reveil.setDate(reveil.getDate() + 1);
  return reveil;
}

function dortEncore() {
  const reveil = localStorage.getItem(cle("reveil"));
  if (reveil && dateActuelle() < new Date(reveil)) return true;
  try { localStorage.removeItem(cle("reveil")); } catch (e) {}
  return false;
}

// Écran "en sommeil" (screen-dodo) : aucune carte, aucun bouton, rien à
// faire tant que `dortEncore()` est vrai. Seuls les boutons globaux
// (⚙️ espace parent, ↺ reset — hors des .screen, toujours affichés)
// restent atteignables : c'est le bypass parental exceptionnel, via le
// code déjà existant (cf. ouvrirEspaceParent). construireMenu() ne
// revérifie pas ce verrou : une fois le code entré, revenir à l'écran
// enfant depuis l'espace parent suffit à le lever pour la session en
// cours (il retient au prochain rechargement si l'heure n'est pas
// encore passée, cf. `demarrer`).
//
// Une fois l'heure passée, ce même écran devient tapable (cf. wiring de
// `#screen-dodo` plus bas) : un tap de Léon lance le rituel du réveil
// (`ouvrirReveil`) plutôt qu'un retour direct au menu. `reveilFait` (sur
// `etat`, réparé comme `journeeFaite` dans `etatRepare`) retient que le
// rituel a eu lieu pour ne pas le rejouer à chaque rechargement du reste
// de la journée — cf. `demarrer` et `finReveil`.
function endormir() {
  const etat = chargerEtat();
  etat.journeeFaite = true;
  sauverEtat(etat);
  try { localStorage.setItem(cle("reveil"), prochainReveil(dateActuelle()).toISOString()); } catch (e) {}
  afficherEcran("screen-dodo");
}

// Rituel du réveil (bonjour → as-tu bien dormi → comment te sens-tu),
// avant d'arriver au menu du jour déjà connu de l'enfant. Les 3 écrans
// sont volontairement sans bouton retour (comme screen-bravo-routine/
// screen-coffre) : une fois lancé, on ne revient pas en arrière dans le
// rituel, on avance jusqu'au menu.
function ouvrirReveil() {
  const texte = texteReveilBonjour(profilActif());
  document.getElementById("reveil-bonjour-texte").textContent = texte;
  afficherEcran("screen-reveil-bonjour");
  dire(texte);
}

function etapeReveilDormi() {
  document.getElementById("reveil-dormi-texte").textContent = TEXTE_REVEIL_DORMI;
  afficherEcran("screen-reveil-dormi");
  dire(TEXTE_REVEIL_DORMI);
}

const EMOJI_HUMEUR = [
  { id: "malade", emoji: "🤒", texte: "Malade" },
  { id: "fatigue", emoji: "😴", texte: "Fatigué" },
  { id: "pleine-forme", emoji: "💪", texte: "En pleine forme" },
  { id: "normal", emoji: "🙂", texte: "Normal" },
  { id: "triste", emoji: "😢", texte: "Triste" },
  { id: "content", emoji: "😄", texte: "Content" },
];
function construireGrilleHumeur() {
  const conteneur = document.getElementById("reveil-humeur-grille");
  conteneur.innerHTML = "";
  EMOJI_HUMEUR.forEach(h => {
    const b = document.createElement("button");
    b.className = "btn-humeur";
    b.innerHTML = `<span class="btn-humeur-emoji">${h.emoji}</span><span class="btn-humeur-texte">${h.texte}</span>`;
    b.onclick = () => finReveil(h.id);
    conteneur.appendChild(b);
  });
}
// `bienDormi` vient du tap précédent (oui/non), pas encore enregistré à
// ce stade (cf. wiring de btn-dormi-oui/non plus bas) — stocké ici plutôt
// que dans une fonction dédiée, pour éviter un aller-retour localStorage
// en plus par étape.
function etapeReveilHumeur(bienDormi) {
  const etat = chargerEtat();
  etat.reveil.bienDormi = bienDormi;
  sauverEtat(etat);
  document.getElementById("reveil-humeur-texte").textContent = TEXTE_REVEIL_HUMEUR;
  construireGrilleHumeur();
  afficherEcran("screen-reveil-humeur");
  dire(TEXTE_REVEIL_HUMEUR);
}

// `humeurId` : un des `id` de EMOJI_HUMEUR, choisi par le bouton tapé
// dans `construireGrilleHumeur()`. Stocké dans `etat.reveil` (jour
// courant) puis, au changement de jour, recopié dans `leon_historique`
// par `archiverJournee()` — pas d'écran dédié pour le consulter encore,
// juste le stockage (même approche que l'a été l'historique au départ).
function finReveil(humeurId) {
  const etat = chargerEtat();
  etat.reveil.humeur = humeurId;
  etat.reveilFait = true;
  sauverEtat(etat);
  construireMenu();
}

function allerFinDeJournee() {
  const etat = chargerEtat();
  afficherRecompenseFinDeJournee(etat);
  ouvrirCoffre(texteFinJournee(profilActif()), ["⭐", "✨", "🎉", "⭐", "✨"], endormir);
}

// Écran coffre : partagé entre la récompense de fin de journée (étoiles)
// et la récompense d'une aventure (pièce, cf. `terminerAventure`) — même
// geste d'ouverture, seuls le texte et la monnaie des confettis changent.
// `retour` est appelé quand le bouton "Terminé !" est pressé (pas
// toujours la même destination selon d'où vient la récompense).
let coffreRetour = null;
function ouvrirCoffre(texteVoix, symbolesConfettis, retour) {
  coffreRetour = retour;
  document.getElementById("coffre-titre").textContent = "Bravo " + profilActif().prenom + " !";
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
  ecranAvantValidation = document.querySelector(".screen.active").id;
  const a = aventureParId(aventureActuelleId);
  codeSaisi = "";
  modeCode = "verifier";
  const lieu = sensTrajet === "retour" ? "la maison" : a.lieu;
  document.getElementById("validation-sous-titre").textContent =
    "Un parent entre le code pour confirmer l'arrivée : « " + lieu + " ».";
  document.getElementById("correction-wrap").classList.add("hidden");
  document.getElementById("pavecode-wrap").classList.remove("hidden");
  document.getElementById("pavecode-erreur").textContent = "";
  construireClavier(document.getElementById("pavecode-clavier"), appuyerTouche);
  majCasesCode(document.getElementById("pavecode-cases"), codeSaisi);
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
    const prenom = profilActif().prenom;
    document.getElementById("coffre-texte").textContent = "Bravo " + prenom + ", tu as fait : " + a.lieu + " !";
    document.getElementById("coffre-recompense-texte").textContent =
      "+ " + a.recompensePieces + " 🪙 (" + total + " au total)";
    ouvrirCoffre("Bravo " + prenom + ", tu as gagné une pièce !", ["🪙", "✨", "🎉", "🪙", "✨"], () => construireMenu());
    return;
  }
  construireMenu();
}

function reinitialiserTout() {
  try { localStorage.removeItem(cle("journee")); } catch (e) {}
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
// Panneau debug (cf. modeDebugActif() en tête de fichier). Les listes de
// routines/aventures sont reconstruites à chaque ouverture (pas une
// seule fois au chargement) pour refléter une activité/routine créée
// entre-temps par un parent (cf. toutesLesRoutines()/toutesLesAventures()).
// ---------------------------------------------------------------------

// Enveloppe une action de navigation du panneau : l'exécute puis referme
// le panneau, pour que l'écran visé (dessous, plein écran lui aussi)
// redevienne visible immédiatement — sinon le panneau resterait au-dessus.
// Pas utilisé pour les actions qui restent DANS le panneau (horloge de
// test, fermeture).
function puisFermerDebug(action) {
  return () => { action(); document.getElementById("debug-panel").classList.add("hidden"); };
}

function boutonDebug(texte, action) {
  const b = document.createElement("button");
  b.className = "btn-debug-item";
  b.textContent = texte;
  b.onclick = action;
  return b;
}

function construireDebug() {
  document.getElementById("debug-code-parent").textContent = codeParentActuel();
  document.getElementById("debug-profil-valeur").textContent = profilActif().prenom;
  const boutonsProfil = document.getElementById("debug-profils");
  boutonsProfil.innerHTML = "";
  Object.values(PROFILS).forEach(p => {
    if (p.id === profilActifId()) return; // déjà actif, rien à proposer
    boutonsProfil.appendChild(boutonDebug("👤 Passer à " + p.prenom, () => changerProfilAppareil(p.id)));
  });
  majAffichageHeureDebug();

  const routines = document.getElementById("debug-routines");
  routines.innerHTML = "";
  toutesLesRoutines().forEach(r => {
    routines.appendChild(boutonDebug("▶️ " + r.nom, puisFermerDebug(() => demarrerRoutine(r.id))));
    routines.appendChild(boutonDebug("🎉 Fin — " + r.nom, puisFermerDebug(() => { routineActuelleId = r.id; finDeRoutine(); })));
    routines.appendChild(boutonDebug("🔑 Valider — " + r.nom, puisFermerDebug(() => { routineActuelleId = r.id; allerValidation(); })));
  });

  const aventures = document.getElementById("debug-aventures");
  aventures.innerHTML = "";
  toutesLesAventures().forEach(a => {
    aventures.appendChild(boutonDebug("🚗 Trajet — " + a.lieu, puisFermerDebug(() => { aventureActuelleId = a.id; sensTrajet = "aller"; allerAuTrajet(); })));
    aventures.appendChild(boutonDebug("📍 Arrivée — " + a.lieu, puisFermerDebug(() => { aventureActuelleId = a.id; allerAArrivee(); })));
  });
}

// Affiche juste l'heure ("18h05") si la date simulée reste le jour réel
// en cours, ou date + heure ("1 sept. 07h00") une fois minuit passé —
// sinon un saut de jour (ex. après avoir simulé le coucher, cf.
// `endormir()`) resterait invisible dans le panneau.
function majAffichageHeureDebug() {
  const el = document.getElementById("debug-heure-valeur");
  if (dateDebugForcee === null) { el.textContent = "réelle"; return; }
  const heure = dateDebugForcee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const memeJour = dateDebugForcee.toDateString() === new Date().toDateString();
  el.textContent = memeJour ? heure : dateDebugForcee.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " " + heure;
}

function ajusterHeureDebug(delta) {
  dateDebugForcee = new Date(dateActuelle().getTime() + delta * 3600000);
  majAffichageHeureDebug();
  majHorloge();
}

function reinitialiserHeureDebug() {
  dateDebugForcee = null;
  majAffichageHeureDebug();
  majHorloge();
}

function toggleDebug() {
  const panneau = document.getElementById("debug-panel");
  const ouverture = panneau.classList.contains("hidden");
  if (ouverture) construireDebug();
  panneau.classList.toggle("hidden", !ouverture);
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
  const maintenant = dateActuelle();
  const jour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const heure = maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  // 🧪 en préfixe quand l'heure est simulée (cf. dateDebugForcee) — pour
  // ne jamais laisser croire, y compris à qui teste, que c'est l'heure réelle.
  el.textContent = (dateDebugForcee !== null ? "🧪 " : "") + jour.charAt(0).toUpperCase() + jour.slice(1) + " — " + heure;
}
majHorloge();
setInterval(majHorloge, 15000);

// ---------------------------------------------------------------------
// Câblage des boutons + démarrage
// ---------------------------------------------------------------------
document.getElementById("btn-retour-routine").onclick = retourMenuDepuisRoutine;
document.getElementById("btn-voix-routine").onclick = () => dire(document.getElementById("etape-courante").textContent);
document.getElementById("btn-retour-dents").onclick = quitterBrossageDents;
document.getElementById("btn-pause-dents").onclick = toggleDentsPause;
document.getElementById("btn-retour-histoire").onclick = quitterHistoire;
document.getElementById("btn-voix-histoire").onclick = () => dire(document.getElementById("histoire-texte").textContent);
document.getElementById("btn-fini-histoire").onclick = finHistoire;
document.getElementById("btn-voix-coffre").onclick = () => dire(document.getElementById("coffre-texte").textContent);
document.getElementById("btn-voix-trajet").onclick = () => dire(document.getElementById("trajet-texte").textContent);
document.getElementById("btn-voix-arrivee").onclick = () => dire(document.getElementById("arrivee-texte").textContent);
document.getElementById("btn-voix-reveil-bonjour").onclick = () => dire(document.getElementById("reveil-bonjour-texte").textContent);
document.getElementById("btn-voix-reveil-dormi").onclick = () => dire(document.getElementById("reveil-dormi-texte").textContent);
document.getElementById("btn-voix-reveil-humeur").onclick = () => dire(document.getElementById("reveil-humeur-texte").textContent);

protegerParAppuiLong(document.getElementById("btn-reset-test"), reinitialiserTout);

document.getElementById("btn-un-parent").onclick = allerValidation;
document.getElementById("btn-valider-routine").onclick = () => { if (actionCorrection) actionCorrection(); };
// Retour discret : ramène à l'écran actif juste avant l'ouverture de
// screen-validation (cf. ecranAvantValidation, capturé à chacune de ses
// 5 entrées) — rien n'est perdu, aucune des 5 entrées ne modifie l'état
// avant que le code soit validé (sauf décocher/recocher en relecture,
// qui reste tel quel, cf. construireCorrection()).
document.getElementById("btn-retour-validation").onclick = () => afficherEcran(ecranAvantValidation || "screen-menu");

document.getElementById("btn-depart").onclick = allerVersDepart;
document.getElementById("btn-retour-menu").onclick = construireMenu;

document.getElementById("btn-journee").onclick = () => { construireJournee(); afficherEcran("screen-journee"); };
document.getElementById("btn-retour-menu-journee").onclick = construireMenu;
document.getElementById("btn-modifier-journee").onclick = basculerEditionJournee;

document.getElementById("btn-mes-recompenses").onclick = () => { construireRecompenses(); afficherEcran("screen-recompenses"); };
document.getElementById("btn-retour-menu-recompenses").onclick = construireMenu;

document.getElementById("btn-espace-parent").onclick = ouvrirEspaceParent;
document.getElementById("btn-retour-menu-parent").onclick = construireMenu;
document.getElementById("btn-retour-parent-routines").onclick = () => { construireEspaceParent(); afficherEcran("screen-parent"); };
document.getElementById("btn-retour-parent-historique").onclick = () => { construireEspaceParent(); afficherEcran("screen-parent"); };

document.getElementById("na-nom").addEventListener("blur", suggererTextesActivite);
document.getElementById("btn-creer-aventure").onclick = creerNouvelleAventure;
document.getElementById("btn-retour-parent-nouvelle-aventure").onclick = () => { construireParentActivites(); afficherEcran("screen-parent-activites"); };

document.getElementById("btn-nouvelle-activite").onclick = ouvrirNouvelleAventure;
document.getElementById("btn-retour-parent-activites").onclick = () => { construireEspaceParent(); afficherEcran("screen-parent"); };

document.getElementById("btn-nouvelle-routine").onclick = ouvrirNouvelleRoutine;
document.getElementById("btn-retour-parent-routines-catalogue").onclick = () => { construireEspaceParent(); afficherEcran("screen-parent"); };
document.getElementById("nr-lieu-chambre").onclick = () => choisirLieuRoutine("chambre");
document.getElementById("nr-lieu-salon").onclick = () => choisirLieuRoutine("salon");
document.getElementById("btn-creer-routine").onclick = creerNouvelleRoutine;
document.getElementById("btn-retour-parent-nouvelle-routine").onclick = () => { construireRoutinesCatalogue(); afficherEcran("screen-parent-routines-catalogue"); };

document.getElementById("btn-retour-parent-appareil").onclick = () => { construireEspaceParent(); afficherEcran("screen-parent"); };

// Le bouton "Terminé !" du coffre ne va pas toujours au même endroit
// (fin de journée vs retour d'aventure) : `coffreRetour` est fixé par
// `ouvrirCoffre()` juste avant l'ouverture de l'écran.
document.getElementById("btn-continuer-coffre").onclick = () => { if (coffreRetour) coffreRetour(); };
document.getElementById("btn-arrive").onclick = allerValidationArrivee;
document.getElementById("btn-cest-parti").onclick = partirEnActivite;

// Tap sur l'écran dodo : n'agit que si l'heure est passée (cf.
// `ouvrirReveil`/`demarrer`) — avant ça, `dortEncore()` garde l'écran
// volontairement inerte, seul le bypass parental (⚙️, hors des .screen)
// reste atteignable.
document.getElementById("screen-dodo").onclick = () => { if (!dortEncore()) ouvrirReveil(); };
document.getElementById("btn-reveil-bonjour").onclick = etapeReveilDormi;
document.getElementById("btn-dormi-oui").onclick = () => etapeReveilHumeur(true);
document.getElementById("btn-dormi-non").onclick = () => etapeReveilHumeur(false);

// Panneau debug (cf. modeDebugActif() en tête de fichier) : masqué par
// défaut (classe .hidden posée dans index.html), révélé ici seulement si
// activé sur CET appareil/navigateur.
document.getElementById("btn-debug").onclick = toggleDebug;
document.getElementById("btn-debug-fermer").onclick = toggleDebug;
document.getElementById("btn-debug-heure-moins").onclick = () => ajusterHeureDebug(-1);
document.getElementById("btn-debug-heure-plus").onclick = () => ajusterHeureDebug(1);
document.getElementById("btn-debug-heure-reelle").onclick = reinitialiserHeureDebug;

document.getElementById("btn-debug-dodo").onclick = puisFermerDebug(() => afficherEcran("screen-dodo"));
document.getElementById("btn-debug-bonjour").onclick = puisFermerDebug(ouvrirReveil);
document.getElementById("btn-debug-dormi").onclick = puisFermerDebug(etapeReveilDormi);
document.getElementById("btn-debug-humeur").onclick = puisFermerDebug(() => etapeReveilHumeur(true));

document.getElementById("btn-debug-menu").onclick = puisFermerDebug(construireMenu);
document.getElementById("btn-debug-missions").onclick = puisFermerDebug(() => { construireMissions(); afficherEcran("screen-missions"); });
document.getElementById("btn-debug-journee").onclick = puisFermerDebug(() => { construireJournee(); afficherEcran("screen-journee"); });
document.getElementById("btn-debug-recompenses").onclick = puisFermerDebug(() => { construireRecompenses(); afficherEcran("screen-recompenses"); });
document.getElementById("btn-debug-coffre").onclick = puisFermerDebug(allerFinDeJournee);

document.getElementById("btn-debug-parent").onclick = puisFermerDebug(() => { construireEspaceParent(); afficherEcran("screen-parent"); });
document.getElementById("btn-debug-parent-routines").onclick = puisFermerDebug(() => { construireParentRoutines(); afficherEcran("screen-parent-routines"); });
document.getElementById("btn-debug-parent-historique").onclick = puisFermerDebug(() => { construireHistorique(); afficherEcran("screen-parent-historique"); });
document.getElementById("btn-debug-parent-activites").onclick = puisFermerDebug(() => { construireParentActivites(); afficherEcran("screen-parent-activites"); });
document.getElementById("btn-debug-parent-routines-catalogue").onclick = puisFermerDebug(() => { construireRoutinesCatalogue(); afficherEcran("screen-parent-routines-catalogue"); });
document.getElementById("btn-debug-parent-appareil").onclick = puisFermerDebug(() => { construireParentAppareil(); afficherEcran("screen-parent-appareil"); });
document.getElementById("btn-debug-nouvelle-activite").onclick = puisFermerDebug(ouvrirNouvelleAventure);
document.getElementById("btn-debug-nouvelle-routine").onclick = puisFermerDebug(ouvrirNouvelleRoutine);
document.getElementById("btn-debug-code-reel").onclick = puisFermerDebug(ouvrirEspaceParent);

document.getElementById("btn-debug-reset").onclick = puisFermerDebug(reinitialiserTout);

document.getElementById("btn-debug").classList.toggle("hidden", !modeDebugActif());

// Service worker : rend l'app utilisable hors-ligne après un premier
// chargement, indépendamment de la disponibilité d'un serveur particulier
// ensuite (cf. sw.js). Échoue silencieusement sur http:// simple (une IP
// locale par ex.) — les navigateurs n'activent les service workers que
// sur HTTPS ou localhost ; l'app fonctionne quand même, juste sans cache
// hors-ligne dans ce cas.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// point d'entrée : menu de la journée (le réveil, écran 01 du handoff,
// reste sauté pour ce prototype). Filet de sécurité : si quoi que ce
// soit plante ici (ex. un état corrompu malgré `etatRepare()`), on
// repart d'un état neuf plutôt que de laisser un écran vide sans recours
// pour un enfant seul devant la tablette — dernier recours seulement,
// `chargerEtat()` répare déjà les cas courants sans perdre la journée.
(function demarrer() {
  try {
    // Avant toute chose : calques d'avatar + prénom du profil actif dans
    // le DOM (cf. appliquerProfilAuDom()) — les écrans qui suivent
    // (dodo ou menu) en dépendent déjà (synchroniserAvatar() ne fait que
    // basculer la visibilité de calques qui doivent déjà exister).
    appliquerProfilAuDom();
    // Encore en sommeil (tablette rouverte en pleine nuit) : reste sur
    // l'écran dodo, avant même de toucher à l'état du jour — pas
    // d'interaction possible avant `dortEncore()` == false (cf. `endormir`).
    // Heure passée mais rituel du réveil pas encore fait aujourd'hui (ex.
    // tablette éteinte puis rallumée après l'heure) : même écran dodo,
    // mais tapable cette fois — cf. wiring de `#screen-dodo`.
    if (dortEncore() || !chargerEtat().reveilFait) { afficherEcran("screen-dodo"); return; }
    construireMenu();
  } catch (e) {
    try { localStorage.removeItem(cle("journee")); } catch (e2) {}
    construireMenu();
  }
})();
