# Prototype de parcours — Léon

Prototype **HTML/CSS/JS vanilla, sans build, sans dépendance**. S'ouvre
directement dans un navigateur (`index.html`) ou via un petit serveur
statique local (`python3 -m http.server` depuis ce dossier) si le
navigateur bloque le chargement de `styles.css`/`app.js` en `file://`.

**Concept validé par un test réel avec Léon.** Utilisé au quotidien
pendant que le reste de l'app se construit — voir `TODO.md` à la racine
et `docs/produit/` pour le modèle qui a guidé cette version.

**Déploiement/installation sur la tablette de Léon** : l'app est publiée
sur GitHub Pages (URL stable, HTTPS, indépendante de toute machine
perso — cf. "Gestion des branches" dans le README racine). Ouvrir cette
URL une fois dans le navigateur de la tablette, puis "Ajouter à l'écran
d'accueil" : `manifest.json` fournit l'icône, `sw.js` (service worker)
met l'app en cache pour qu'elle marche ensuite **hors-ligne**, sans
dépendre d'aucun serveur. Un serveur de dev local (`python3 -m
http.server`, ou l'équivalent utilisé pendant le développement) reste
utile pour tester en cours de route, mais n'est jamais ce que la
tablette de Léon doit charger au quotidien.

## Ce qui est couvert

Un seul enfant (Léon), un seul jour type. Modèle : une **Routine** a une
liste ordonnée de **Tâches** (relation mère-fille — voir
`docs/produit/modele-de-donnees.md`). Deux routines pour l'instant
(`ROUTINES` dans `app.js`) :

- **"S'habiller"** — caleçon → t-shirt → pantalon → chaussettes (le pull
  a été retiré, redondant avec le t-shirt).
- **"Se préparer à partir"** — chaussures seulement pour l'instant ;
  manteau et sac retirés le temps de l'été, gardés en commentaire dans
  `ROUTINES` (`app.js`) pour les remettre facilement à la mauvaise
  saison.
- **"Aller se coucher"** — enlève les vêtements (retire plusieurs
  calques d'un coup, `retire: true`) → range/sale → dents → histoire →
  coucher.

Séquence :

1. **Menu de la journée** — liste des routines. Seule la première non
   validée est cliquable ; les suivantes sont grisées/verrouillées (🔒)
   tant que la précédente n'est pas validée. L'avatar y est affiché dans
   son état réel du moment (habillé ou non selon ce qui est déjà fait),
   avec une jauge de journée (une étoile par routine validée), et une
   horloge (jour + heure, `#horloge`/`majHorloge()`, purement
   informative). Un bouton voiture 🚗 distinct ("Partir à l'aventure")
   ouvre `screen-missions` (actuellement vide, pas encore de mission)
   **seulement si** "Se préparer à partir" est validée — sinon il ramène
   directement dans cette routine (`allerVersDepart()`).
2. **Écran de routine** (générique, alimenté par la routine choisie) —
   liste récapitulative complète toujours visible (l'enfant mesure ce
   qu'il reste à faire), ordre imposé (une seule tâche actionnable à la
   fois). Aucune ligne n'est tapable : seule l'icône de l'étape en cours,
   agrandie (72px), est glissable — directement dans sa ligne, le texte
   reste affiché à côté pendant le geste (lecture globale). Les tâches
   faites redescendent en bas de la liste. Un bouton retour discret (←,
   `btn-retour-routine`) ramène au menu sans rien perdre — pour un tap
   accidentel sur la mauvaise routine.
3. **Fin de routine** — félicitations spécifiques à la routine (texte +
   voix), puis message pour aller chercher un parent.
4. **Validation parent** — code à 4 chiffres (`1234`, en dur pour ce
   prototype) puis écran de **relecture/correction** : toutes les tâches
   redeviennent cliquables pour que le parent décoche ce qui n'a pas été
   réellement fait avant de valider. À la validation : étoile gagnée,
   retour au menu.
5. **Récompense de fin de journée** — automatique une fois toutes les
   routines validées : confettis, total d'étoiles.
6. **Aventures** (`AVENTURES` dans `app.js`) — depuis le menu, "Partir à
   l'aventure" ouvre `screen-missions`, qui liste les aventures
   programmées pour aujourd'hui (champ `date`, même format que
   `cleJour()`). Taper une carte lance :
   - **Trajet** — pas de barre de progression/minuteur, juste un temps
     d'attente avec la scène de la fenêtre de voiture
     (`app/assets/scenes/fenetre-voiture.jpg`) et Léon de profil en
     silhouette SVG au premier plan (`#silhouette-leon`) → bouton "On est
     arrivés", qui ouvre l'écran de **validation parent** (code à 4
     chiffres, pas de correction) plutôt que d'avancer tout seul.
   - **Arrivée** — le vrai sprite avatar de Léon (habillé selon l'état
     réel, pas un emoji générique), programme annoncé (3 lignes) →
     "C'est parti", qui déclenche un **trajet retour** vers la maison
     (texte différent, fenêtre + silhouette retournées en CSS,
     `sensTrajet`) plutôt que la récompense directement.
   - Une fois l'arrivée à la maison confirmée par un parent : la
     récompense. Une aventure peut rapporter des **pièces**
     (`recompensePieces`) au lieu d'une étoile de routine : monnaie
     séparée, stockée à part (`leon_pieces`), jamais remise à zéro au
     changement de jour, affichée en permanence à côté de la jauge de
     journée dès qu'elle est non nulle. Sort du même coffre que la
     récompense de fin de journée (texte + confettis adaptés). Voir
     `docs/produit/concept.md` et `modele-de-donnees.md` pour la
     philosophie (pourquoi pas une étoile).
7. **"Ma journée"** (`construireJournee()`, bouton secondaire sur le
   menu) — le planning du jour (`etat.planning`) affiché **dans l'ordre
   chronologique** (routines, aventure(s) du jour, repas — `REPAS` —
   mélangés en une seule liste, pas d'horaire pour l'instant). Calculé
   par défaut à chaque nouvelle journée (`PLANNING_DEFAUT` +
   insertion des aventures du jour via leur champ `apres`), puis
   **éditable** via un mode protégé par le code parent (bouton ✏️ →
   code → ▲/▼/✕ sur chaque ligne + un catalogue "Ajouter à la journée").
   Sortir du mode édition ne redemande pas le code ; revenir au menu si.
8. **"Mes récompenses"** (`construireRecompenses()`, en tapant sur les
   étoiles/pièces du menu) — étoiles du jour et total de pièces
   présentés comme des objets à collectionner (rotation continue,
   brillent au toucher). La pièce affiche un petit portrait de Léon
   teinté façon profil gravé sur une pièce d'or (`.piece-visage`),
   recadré depuis le sprite avatar existant — pas de nouvel asset dédié.

Voix : synthèse vocale native du navigateur (`SpeechSynthesis`, `fr-FR`),
annoncée automatiquement à chaque nouvelle étape, rejouable via le bouton
🔊. Retour haptique (`navigator.vibrate`) sur chaque validation —
Android/Chrome uniquement.

Bouton reset (coin haut-droit sur tous les écrans, ou en pied de l'écran
de fin) protégé par un **appui long** (~900ms) plutôt qu'un simple tap,
pour qu'un enfant ne puisse pas effacer sa journée par accident.

## Ce qui n'est volontairement PAS couvert (voir `docs/produit/` et `docs/design-handoff/`)

- **Paramétrage parent** : `ROUTINES`, `AVENTURES`, `CODE_PARENT`, et
  l'ordre/verrouillage entre routines (actuellement séquentiel et figé)
  sont en dur dans `app.js`, pas encore configurables par une UI parent
  — programmer une nouvelle aventure veut dire éditer `AVENTURES` dans
  le code.
- **Dépense des pièces** : le total s'accumule et s'affiche, mais aucune
  boutique/mécanique de dépense n'est encore conçue (cf. `TODO.md`,
  section "Pas encore désigné").
- **Barème de récompense de fin de journée** : le total d'étoiles
  s'affiche, mais rien ne varie encore selon la quantité.
- **Dents et petit-déjeuner** ne sont plus des étapes drag-and-drop ici :
  ce seront des mini-jeux dédiés construits plus tard (brossage devant un
  miroir dans la salle de bain avec ses propres animations ; préparation
  de la table dans la cuisine).
- **Chez Pauline** reste dans `AVENTURES` (mêmes écrans génériques
  `screen-trajet`/`screen-arrivee` que les autres aventures) mais sans
  `date` : n'apparaît jamais tout seul dans les sorties du jour. À
  reprogrammer explicitement le jour où on voudra la réintégrer.
- Écran de réveil (01) — sauté pour ce prototype, l'app démarre
  directement sur le menu de la journée.
- Colette, le sélecteur de profil, le créateur d'avatar.
- Décor de pièce : la scène reste un simple dégradé CSS (teinte
  différente par routine via `lieu`), pas de vrai décor illustré.
  L'avatar, lui, est un vrai sprite (voir `assets/generated/` et
  `scripts/generate_*.py` pour le générateur qui l'alimente, dans
  `app/assets/avatar/`).
- Écran parent (06), calibrage sensoriel (07), écran praticienne (11),
  renfort en cas de dépassement (12).

## État et persistance

`localStorage`, clé `leon_journee`, remise à zéro automatiquement si la
date stockée diffère d'aujourd'hui. Forme :

```
{
  jour: "2026-8-26",
  routines: { shabiller: { fait: [...idsDeTâches], valide: bool },
              partir:    { fait: [...idsDeTâches], valide: bool } },
  etoiles: 0,
  journeeFaite: bool,
  planning: [ { type: "routine"|"aventure"|"repas", id: "..." }, ... ]
}
```

`fait` est un tableau d'**id de tâches** (pas d'index numériques) —
robuste au fait qu'il y ait plusieurs routines indépendantes.

`planning` est la version *éditable* de "Ma journée" (cf. plus haut) :
calculé une fois par `planningParDefaut()` à la création de l'état du
jour, puis modifié en place par le mode édition
(`deplacerItemPlanning`/`retirerItemPlanning`/`ajouterItemPlanning`).
Chaque item ne stocke qu'une référence `{ type, id }`, jamais le
nom/emoji : `libelleItemPlanning()` les résout à l'affichage depuis
`ROUTINES`/`AVENTURES`/`REPAS`, pour rester à jour si le catalogue
change. Une référence qui ne résout plus rien (id supprimé du
catalogue) est silencieusement ignorée à l'affichage plutôt que de
planter.

Les **pièces** sont dans une clé séparée, `leon_pieces` (un simple
nombre), volontairement **hors de `leon_journee`** : contrairement aux
étoiles, elles ne doivent pas être remises à zéro au changement de jour
(`chargerPieces`/`sauverPieces`/`ajouterPieces` dans `app.js`).

L'**historique** des journées passées est dans une troisième clé,
`leon_historique` (tableau, jamais remis à zéro, borné à 90 entrées) :
chaque journée y est archivée (`archiverJournee()`) au moment où
`chargerEtat()` détecte un changement de date, juste avant que
`leon_journee` ne soit écrasée par la nouvelle journée. Entrée :
`{ jour, etoiles, routinesValidees: [...ids], journeeFaite }`. Pas
encore d'écran pour la consulter, juste le stockage pour l'instant.

**Important si tu changes la forme de `leon_journee`** :
`chargerEtat()` appelle `etatRepare()`, qui **complète en place** les
champs manquants d'un état dont le jour est bon plutôt que de tout jeter
(seul un changement de date fait vraiment repartir de zéro — et archive
l'ancien état au lieu de le perdre, cf. ci-dessus). Avant, un
`etatValide()` tout-ou-rien repartait d'un état neuf au moindre champ
manquant, y compris quand seule la *forme* avait changé (ex. l'ajout du
champ `planning`) — **ça a fait perdre une vraie progression de Léon en
cours de journée**, pas juste un bug théorique. Si tu ajoutes un champ à
la forme de l'état, ajoute sa réparation dans `etatRepare()` (valeur par
défaut sensée), pas juste sa vérification. Il y a aussi un filet de
sécurité au démarrage (`try/catch` dans l'IIFE `demarrer()`) pour le
seul cas vraiment irrécupérable (JSON corrompu) — dernier recours, pas
le mécanisme principal.

## Points d'entrée utiles pour étendre

- `ROUTINES` (`app.js`) — tableau de routines, chacune avec `id`, `nom`,
  `emoji` (repris par l'écran "Ma journée"), `lieu` (pilote la teinte de
  scène), `felicitation` (texte de fin), et `taches` (le même format
  qu'avant : `zone` doit correspondre à un élément `.zone-cible` dans
  `index.html`, `calque` révèle un sprite existant dans `assets/avatar/`
  via `data-calque`, `badge` affiche un emoji via `data-badge` si aucun
  sprite n'existe encore). Ajouter une routine = ajouter une entrée ici ;
  elle apparaît automatiquement au menu, verrouillée jusqu'à ce que la
  précédente soit validée.
- `REPAS` (`app.js`) — tableau plat `{ id, nom, emoji }`, purement
  informatif pour l'écran "Ma journée" (pas de tâches, pas d'horaire).
- `AVENTURES` (`app.js`) — tableau d'aventures, chacune avec `lieu`,
  `emoji`, `texteTrajet`, `texteArrivee`, `texteTrajetRetour` (trajet du
  retour vers la maison — texte générique par défaut si absent),
  `programme` (3 lignes), `personne` optionnelle (`{ emoji, nom }`,
  affiche un 2ᵉ sprite à l'arrivée à côté du vrai avatar de Léon), `date`
  optionnelle (format `cleJour()`, ex. `"2026-8-27"` — absente =
  n'apparaît jamais toute seule dans les sorties du jour), `apres`
  optionnelle (`{ type, id }` d'un autre item du planning — où l'insérer
  dans `PLANNING_DEFAUT` quand elle est programmée ; absente = ajoutée en
  fin de journée) et `recompensePieces` (0 = pas de récompense propre,
  sinon une pièce sort du coffre une fois le retour à la maison
  confirmé). Ajouter une aventure = ajouter une entrée ici ; avec une
  `date` d'aujourd'hui elle apparaît automatiquement dans
  `screen-missions` et dans "Ma journée".
- `PLANNING_DEFAUT` (`app.js`) — le squelette de journée type utilisé par
  `planningParDefaut()` pour initialiser `etat.planning` à chaque
  nouveau jour (avant édition éventuelle par un parent, cf. plus haut).
- `synchroniserAvatar()` — recalcule les calques/badges visibles à partir
  de **toutes** les routines (pas seulement la routine en cours), pour
  que l'avatar reste cohérent entre le menu et l'écran de routine.
- `rendreGlissable(el, etape)` — moteur générique de glisser-déposer
  (pointer events, hit-test). Glisse un **clone** de `el` positionné en
  `fixed`, pas `el` lui-même (qui passe juste en `visibility:hidden` le
  temps du geste) : ça permet à `el` de vivre dans une ligne de liste,
  à côté de son texte, sans faire sauter la mise en page quand le geste
  commence.
- `CODE_PARENT` en tête de fichier pour ajuster rapidement le code du
  coffre pendant les tests.
- `#silhouette-leon` (`index.html`/`styles.css`) — Léon de profil sur
  l'écran de trajet est un `<path>` SVG à aplat uni (`fill`), pas un
  sprite : simple à retourner (`scaleX(-1)`, cf. `.retour`) et à
  recolorer, mais grossier — à remplacer par un vrai sprite de profil si
  la direction artistique l'exige un jour.
- `.piece-visage` (`styles.css`) — portrait de pièce recadré depuis
  `assets/avatar/leon-base.png` via un positionnement `absolute` en px
  (pas de détourage réel) puis teinté au filtre CSS
  (`grayscale`+`sepia`+`hue-rotate`) façon profil gravé. Values ajustées
  à l'œil pour ce sprite précis — à recalculer si le sprite change.
- `A_METTRE_EN_CACHE` (`sw.js`) — liste des fichiers mis en cache pour le
  fonctionnement hors-ligne. **Si tu ajoutes un asset référencé par
  `index.html`/`styles.css`** (nouvelle image, nouvelle scène...),
  ajoute-le ici aussi, sinon il ne sera pas disponible hors-ligne.
  Incrémenter `CACHE_NAME` (ex. `dayrise-v2`) force le renouvellement du
  cache d'un appareil déjà installé au prochain chargement en ligne.
