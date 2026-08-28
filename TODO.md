# To-do — Dayrise

Liste vivante, mise à jour au fil des sessions. Une case cochée veut dire
testé en direct (pas juste écrit) — voir aussi
[`app/README.md`](app/README.md) pour le détail de ce que couvre le
prototype actuel.

## Fait

- [x] Handoff de design versionné dans `docs/design-handoff/`
- [x] Dépôt restructuré (`app/`, `assets/`, `docs/`, `scripts/`)
- [x] Prototype de parcours jouable pour Léon (`app/`)
  - [x] **Menu de la journée** — liste les routines (`ROUTINES`), la
        première seule cliquable, les suivantes grisées/verrouillées
        (🔒) tant que la précédente n'est pas validée. Avatar affiché
        dans son état réel du moment, jauge de journée (une étoile par
        routine).
  - [x] **Porte de sortie vers les missions** — bouton voiture 🚗 sur le
        menu ("Partir à l'aventure"), distinct des cartes de routine.
        N'ouvre l'écran des sorties (`screen-missions`, cf. "Aventures +
        pièces" plus bas pour son contenu) que si "S'habiller" et
        "Se préparer à partir" sont validées. **Sinon, pas de navigation
        forcée** (correction suite au retour de Léon) : rappel vocal des
        routines manquantes + la routine de rang 1 clignote sur le menu,
        l'enfant garde la main sur le geste. Options d'icône et détail du
        comportement dans `docs/produit/concept.md`.
  - [x] **Routines indépendantes**, relation mère-fille Routine ↔ Tâches
        (cf. `docs/produit/modele-de-donnees.md`) : "S'habiller" (caleçon
        → t-shirt → pantalon → chaussettes — le pull, redondant avec le
        t-shirt, a été retiré), "Se préparer à partir" (chaussures
        seulement pour l'instant — manteau et sac retirés le temps de
        l'été, gardés en commentaire dans `ROUTINES` pour les remettre à
        la mauvaise saison) et **"Aller se coucher"**
        (enlève les vêtements → range/sale → dents → histoire → coucher),
        ajoutée pour un test le soir même avec Léon. Débloquée seulement
        une fois les deux routines précédentes validées (ordre
        séquentiel des routines, comme le reste). "Enlève tes vêtements"
        est la première tâche qui **retire** plusieurs calques d'un coup
        (`retire: true`, `calque` en tableau) plutôt que d'en ajouter —
        l'avatar se déshabille visiblement. Écran de routine générique,
        alimenté par la routine choisie au menu.
  - [x] Ordre imposé au sein d'une routine : une seule tâche actionnable
        à la fois. Liste récapitulative complète toujours visible.
  - [x] **Icône glissable fusionnée dans la liste** (retour de Léon,
        2ᵉ ronde de test) — avant, l'enfant avait le choix entre taper la
        ligne ou glisser une icône séparée dans un plateau à part, et
        alternait entre les deux (icône trop petite). Maintenant : plus
        aucune ligne n'est tapable, seule l'icône de l'étape en cours est
        glissable, agrandie (72px), directement dans la ligne — le texte
        reste affiché à côté pendant le geste (lecture globale). Les
        tâches faites redescendent en bas de la liste.
  - [x] **Fin de routine → félicitations** (texte spécifique à la
        routine, dit à voix haute) **→ appel au parent**.
  - [x] **Validation parent** : code à 4 chiffres puis écran de
        relecture/correction (toutes les tâches redeviennent
        déclickables, pour que le parent décoche ce qui n'a pas été
        réellement fait) → bouton "Valider" → étoile + jauge de journée
        mise à jour → retour au menu.
  - [x] **Récompense de fin de journée**, automatique une fois toutes les
        routines validées (confettis + total d'étoiles).
  - [x] Avatar en sprite réel (pas des formes CSS), calques révélés
        progressivement, cohérents sur tous les écrans (menu + routine)
        via `synchroniserAvatar()` — départ nu → caleçon → habillé au fur
        et à mesure, quelle que soit la routine en cours.
  - [x] Voix automatique à chaque nouvelle étape (Web Speech API,
        hors-ligne) + bouton réécouter
  - [x] Bouton reset de test sur tous les écrans
  - [x] Dents et petit-déjeuner retirés du parcours actif — deviendront
        des mini-jeux dédiés (miroir salle de bain, table cuisine),
        pas de simples étapes drag-and-drop (cf. "Pas encore designé")
  - [x] **Robustesse du chargement d'état** — `etatValide()` vérifie que
        l'état stocké correspond bien à la forme attendue (pas juste la
        date), + filet de sécurité au démarrage (`try/catch` autour du
        point d'entrée) qui repart d'un état neuf en cas de format
        imprévu. Corrige un bug réel : un état d'un ancien format de
        `localStorage` (même date du jour) faisait planter
        silencieusement `construireMenu()` et laissait le menu vide,
        sans aucune routine cliquable.
- [x] **Aventures + pièces** — trajet/arrivée (initialement codés en dur
      pour Pauline) généralisés et pilotés par `AVENTURES` (`app.js`),
      branchés sur l'écran des sorties (`construireMissions()`, appelé
      depuis la porte "Partir à l'aventure") : une aventure programmée
      pour aujourd'hui (champ `date`) y apparaît comme carte cliquable.
      Première aventure de contenu réel : "Le magasin de bricolage"
      (28/08/2026). Séquence : trajet (temps d'attente, **pas de barre
      de progression/minuteur** — juste un bouton "On est arrivés",
      cf. ci-dessous), avec la **vraie scène de la fenêtre de voiture**
      (`app/assets/scenes/fenetre-voiture.jpg`, image fournie) et
      **Léon de profil en silhouette** au premier plan (`#silhouette-leon`,
      un `<path>` SVG — pas de nouvel asset dessiné, juste une forme
      sombre à contre-jour) → arrivée, avec cette fois **le vrai sprite
      avatar de Léon** (habillé selon l'état réel, plus un emoji
      générique) → programme annoncé → "C'est parti" → **trajet
      retour** (texte différent + silhouette et fenêtre retournées en
      CSS, `sensTrajet`) vers la maison → une fois cette arrivée-là
      confirmée, la récompense. Une aventure peut
      rapporter des **pièces** au lieu d'une étoile de routine
      (`recompensePieces`) — monnaie séparée, stockée à part
      (`leon_pieces`) et **jamais remise à zéro** au changement de jour
      (contrairement aux étoiles), sort du même coffre que la récompense
      de fin de journée (cf. `docs/produit/concept.md` et
      `modele-de-donnees.md`). Chez Pauline reste dans `AVENTURES` mais
      sans `date` : n'apparaît jamais tout seul dans les sorties du jour
      (comportement inchangé, cf. section "Mis de côté" ci-dessous).
  - [x] **"On est arrivés" validé par un parent, pas par l'enfant** — le
        bouton du trajet (aller ou retour) ouvre l'écran de code parent
        (`allerValidationArrivee()`, même pavé numérique que la
        validation d'une routine, mais sans étape de correction — rien à
        décocher pour une simple confirmation d'arrivée). Généralisation
        du câblage code → suite (`apresCodeValide`), pour que le même
        écran serve aux deux cas (routine et arrivée d'aventure).
- [x] **Écran "Ma journée"** (`construireJournee()`, accessible depuis un
      bouton secondaire du menu) — le planning du jour affiché **dans
      l'ordre chronologique** (routines, aventure(s) du jour, repas —
      `REPAS` — mélangés dans une seule liste, sans horaire). Modèle :
      `PLANNING_DEFAUT` (`app.js`) est un squelette de journée type
      (petit-déj → s'habiller → se préparer à partir → déjeuner → goûter
      → dîner → coucher) ; les aventures du jour s'y insèrent à la
      position donnée par leur champ `apres` (`{ type, id }` d'un autre
      item — cf. "Le magasin de bricolage" ci-dessus, inséré après "Se
      préparer à partir" plutôt que juste après le petit-déj, pour rester
      cohérent avec le fait que l'enfant ne peut de toute façon pas
      partir en aventure avant d'être habillé/prêt,
      `ROUTINES_REQUISES_DEPART`). Le résultat est copié dans
      `etat.planning` à chaque nouvelle journée — c'est cette copie,
      pas le calcul par défaut, qui s'affiche et qui devient éditable.
      - [x] **Mode édition protégé par le code parent** — bouton ✏️ →
            code à 4 chiffres (réutilise `apresCodeValide`, même
            mécanisme que la validation d'une routine ou d'une arrivée)
            → chaque ligne gagne ▲ / ▼ (réordonner) et ✕ (retirer), plus
            un bloc "Ajouter à la journée" qui liste tout ce qui existe
            (routines, **toutes** les aventures — pas seulement celles
            du jour, pour pouvoir reprogrammer Pauline par ex. — et
            repas) et n'est pas déjà dans le planning ; taper dessus
            l'ajoute en fin de liste. Sortir du mode édition (retaper le
            bouton, devenu ✅) ne redemande pas le code — seule l'entrée
            est protégée. Revenir au menu réinitialise le mode édition
            (`construireMenu()`) : il faut le code à chaque fois qu'on
            veut modifier, pas une fois pour la session.
- [x] **Écran "Mes récompenses"** (`construireRecompenses()`, accessible
      en tapant sur les étoiles/pièces du menu, `btn-mes-recompenses`) —
      les étoiles du jour et le total de pièces présentés comme des
      objets à collectionner : chaque étoile/pièce tourne doucement en
      continu et brille un instant au toucher (deux animations séparées,
      `transform` pour la rotation et `filter` pour l'éclat, pour ne pas
      se marcher dessus). La pièce affiche un portrait de Léon — simple
      recadrage CSS du sprite avatar existant sur la zone du visage
      (`.piece-visage`), pas un nouvel asset, **petit et teinté dans le
      ton doré de la pièce** (`filter: grayscale + sepia + hue-rotate`,
      façon profil gravé plutôt que photo couleur en pleine pièce).
      Bouton retour vers le menu.
- [x] **Bouton retour sur l'écran de routine** (`btn-retour-routine`,
      `retourMenuDepuisRoutine()`) — pour un tap accidentel sur la
      mauvaise routine au menu. Pas protégé par appui long comme le
      reset : revenir en arrière ne perd rien (les tâches déjà cochées
      restent dans `etat.routines`, retaper la même routine plus tard
      reprend où on en était), donc pas besoin de la même friction
      volontaire que pour un vrai effacement.
- [x] **Horloge du menu** (`#horloge`, `majHorloge()`) — jour + heure en
      français (`Intl`/`toLocaleDateString`), mise à jour toutes les 15s.
      Purement informatif, ne pilote aucune logique.
- [x] **Stocker l'historique des journées de Léon** (demandé
      explicitement une fois l'usage réel commencé) — `leon_historique`
      dans `localStorage`, jamais remis à zéro. Chaque journée est
      archivée (`archiverJournee()`) juste avant d'être écrasée par la
      suivante — au changement de date détecté dans `chargerEtat()`, pas
      au reset de test. Bornée à 90 entrées. Pas encore d'écran pour la
      consulter (juste le stockage, demandé en premier) — sert de base à
      un futur écran parent type "la semaine" (handoff, écran 06).
- [x] **Chargement d'état qui répare au lieu de tout jeter**
      (`etatRepare()`, remplace l'ancien `etatValide()` tout-ou-rien) —
      **corrige une vraie perte de données rencontrée par Léon**. Avant :
      le moindre champ manquant dans `leon_journee` par rapport à la
      forme attendue (ex. `planning`, ajouté cette session) faisait
      repartir d'un état neuf, effaçant routines/étoiles du jour même si
      elles étaient valides. Maintenant : seuls les champs manquants
      sont complétés avec des valeurs par défaut, en place — un
      changement de date reste le seul cas qui repart vraiment de zéro
      (et archive l'ancien état au lieu de le jeter, cf. ci-dessus).
- [x] **Manifest + installation PWA** (`app/manifest.json`, icônes
      `app/assets/icons/icon-192.png`/`icon-512.png` générées depuis le
      sprite avatar, balises `<link rel="manifest">`/`apple-touch-icon`/
      `apple-mobile-web-app-*` dans `index.html`) — icône d'écran
      d'accueil ("Ajouter à l'écran d'accueil") plutôt qu'un favori/onglet
      de navigateur classique. Priorité montée depuis l'incident de
      réinitialisation : Léon y accède actuellement via un lien/favori
      ouvert à chaque fois (pas une icône dédiée) — un lancement moins
      stable dans le temps qu'une icône pointant toujours vers la même
      origine. Reste à faire réellement l'installation sur la tablette de
      Léon (l'utilisateur doit ouvrir l'URL une fois dans le navigateur
      et choisir "Ajouter à l'écran d'accueil" — pas automatisable
      depuis le code).
- [x] **Service worker hors-ligne** (`app/sw.js`, enregistré depuis
      `app.js`) — met en cache l'app shell (HTML/CSS/JS/manifest +
      images) au premier chargement, stratégie stale-while-revalidate
      (sert le cache tout de suite, le rafraîchit en tâche de fond dès
      qu'un réseau est là). Rend l'app **vraiment indépendante d'un
      serveur particulier** après le premier chargement — répond
      directement au besoin d'installer sur la tablette de Léon sans
      dépendre du Mac de son parent. Nécessite HTTPS ou `localhost` (les
      navigateurs n'activent pas les service workers sur du http:// brut,
      ex. une IP locale) — encore une raison d'héberger sur une vraie
      URL (GitHub Pages) plutôt qu'un serveur de dev.
- [x] **Dépôt Git + déploiement GitHub Pages** — `main` (stable, ce qui
      est déployé) / `dev` (travail en cours), cf. section "Gestion des
      branches" du README racine. Poussé sur GitHub, `app/` publié via
      GitHub Pages (cf. `.github/workflows/` s'il existe, sinon branche
      `gh-pages`) pour une URL stable, HTTPS, indépendante de toute
      machine perso — c'est cette URL que la tablette de Léon doit
      ouvrir une fois puis "Ajouter à l'écran d'accueil". `assets/external/`
      (packs Bitglow) volontairement exclu du dépôt : la licence interdit
      la redistribution en fichiers autonomes, incompatible avec un repo
      public (cf. `.gitignore`) — ces assets restent en local uniquement,
      l'app déployée ne les utilise pas de toute façon.
- [x] **Espace parent (v1)** — hub protégé par le code (bouton ⚙️
      discret, `position: fixed`, visible sur tous les écrans comme le
      reset, mais pas protégé par appui long : pas destructif). **Lié
      directement à l'espace enfant** — même `app.js`, même
      `localStorage`, pas d'outil séparé : un changement fait ici a un
      effet immédiat sur ce que Léon voit (cf.
      `docs/produit/concept.md`). Options accessibles :
  - [x] **Relancer une routine** (demandé explicitement : si l'état de
        Léon a changé, ex. il s'est redéshabillé en rentrant) — liste
        toutes les routines avec leur état, taper l'une d'elles réutilise
        l'écran de correction déjà existant (mêmes éléments DOM que la
        validation parent, pas de duplication) pour décocher ce qui n'est
        plus vrai. À la confirmation (`confirmerRelanceRoutine()`) : si
        la routine était validée, son étoile est retirée (sera regagnée
        à la revalidation, pour ne pas gonfler le compteur) et
        `journeeFaite` repasse à faux. **Corrige un vrai bug découvert en
        testant cette fonctionnalité** : le déblocage/verrouillage des
        routines au menu ne regardait que la routine *immédiatement*
        précédente, pas toutes les précédentes — en relançant une
        routine du milieu, une routine plus loin dans la liste pouvait se
        retrouver débloquée à tort en sautant celle qu'on venait de
        relancer (cf. `construireMenu()`, `toutPrecedentValide`).
  - [x] **Historique des journées** — lecture seule de `leon_historique`
        (déjà stocké, cf. plus haut), jour/étoiles/routines validées,
        plus récent en premier.
  - [x] **Changer le code parent** — deux saisies identiques de suite
        avant d'enregistrer (comme un changement de mot de passe),
        réutilise le même pavé numérique que la vérification du code
        existant (`construireClavier()`/`majCasesCode()` généralisés pour
        prendre un conteneur + callback, au lieu d'être dupliqués).
        Code persisté à part (`leon_code_parent`), "1234" par défaut tant
        qu'aucun nouveau code n'est enregistré.
  - [x] **Planning du jour** — pas une nouvelle fonctionnalité, juste un
        lien direct vers le mode édition de "Ma journée" déjà existant
        (entre directement en édition, sans redemander le code — déjà
        authentifié dans l'espace parent).
  - [x] **Activités** (demandé explicitement, en deux temps : d'abord un
        formulaire de création directe, puis reformulé en un vrai menu
        d'accès + création) — liste **toutes** les activités
        (`toutesLesAventures()` : catalogue en dur + créées par un
        parent), chacune tapable pour l'**ajouter/retirer du planning du
        jour** (`basculerActivitePlanning()`) — donc de "Partir à
        l'aventure" (cf. lien ci-dessous). Bouton "+ Nouvelle activité"
        en bas → formulaire (nom, icône parmi 16 emoji, texte du trajet,
        texte de l'arrivée, 3 étapes sur place, pièce à la fin oui/non),
        ajoutée directement au planning d'aujourd'hui à la création
        (`creerNouvelleAventure()`), toujours juste après "Se préparer à
        partir" comme "Le magasin de bricolage" (même raison : impossible
        de partir en aventure avant d'être habillé/prêt). Trajet/arrivée
        pré-remplis à partir du nom dès qu'il quitte le champ (suggestion
        éditable, grammaire pas garantie — ex. "à le" au lieu de "au").
        Persistée à part (`leon_aventures_perso`, jamais remise à zéro),
        fusionnée avec le catalogue en dur `AVENTURES` partout où on
        cherche une aventure — le reste du code ne distingue pas d'où
        elle vient.
        - [x] **Lien planning ↔ "Partir à l'aventure"** (la vraie
              demande derrière celle-ci) — jusqu'ici, "Partir à
              l'aventure" listait les aventures par leur champ `date`
              (`aventuresDuJour()`), complètement indépendamment du
              planning que l'espace parent permet d'éditer : y ajouter/
              retirer une aventure n'avait aucun effet sur les sorties
              visibles par l'enfant. Nouvelle fonction
              `aventuresPlanifieesAujourdhui()` : dérive la liste des
              sorties du jour du planning (`etat.planning`) plutôt que du
              champ `date`, qui ne sert plus qu'à l'ensemencement d'une
              nouvelle journée (`planningParDefaut()`). Ajouter/retirer
              une aventure du planning (Activités, "Ajouter à la
              journée", ou une nouvelle activité) l'ajoute/la retire
              maintenant bien de "Partir à l'aventure".
  - [x] **Routines** (demandé explicitement, même principe que les
        activités) — liste **toutes** les routines
        (`toutesLesRoutines()` : catalogue en dur + créées par un
        parent) avec leur état du jour, **en lecture seule** cette fois
        (pas de bascule planning : contrairement à une activité, une
        routine fait partie du parcours tous les jours dès qu'elle
        existe, il n'y a pas d'interrupteur jour par jour à proposer —
        pour corriger une routine précise, "Relancer une routine" reste
        l'écran dédié). Bouton "+ Nouvelle routine" → formulaire (nom,
        icône, lieu chambre/salon, jusqu'à 5 tâches — texte + emoji +
        zone parmi les 6 `.zone-cible` existantes). Pas de `calque`
        proposé (demanderait un sprite existant pour chaque nouveau
        vêtement/objet) : chaque tâche a son propre emoji, sans effet
        persistant sur l'avatar, comme "Range tes vêtements"/"On lit
        l'histoire" dans "Aller se coucher" aujourd'hui. Persistée à part
        (`leon_routines_perso`), fusionnée avec `ROUTINES` via
        `toutesLesRoutines()` — remplace la vingtaine d'usages directs de
        `ROUTINES` dans `app.js` (menu, avatar, jauge, planning...) pour
        qu'une routine créée se comporte identiquement à une routine du
        catalogue en dur partout, y compris le chaînage séquentiel du
        menu (ajoutée à la fin de l'ordre). Récurrente tous les jours dès
        la création (`planningParDefaut()` inclut désormais aussi les
        routines perso, pas seulement `PLANNING_DEFAUT`), contrairement
        aux activités qui ne reviennent que si programmées. Testé de bout
        en bout : création → apparaît dans le menu enfant, verrouillage
        séquentiel correct, glisser-déposer fonctionnel, félicitations,
        validation parent, étoile.
- [x] **"Aller se coucher" débloquée par l'heure, plus par les autres
      routines** (demandé explicitement, suite à "Relancer une routine")
      — cette routine sortait mal de son chaînage séquentiel avec
      "S'habiller"/"Se préparer à partir" : un parent relançant
      "S'habiller" en soirée (ex. l'enfant s'est redéshabillé) se
      retrouvait avec le coucher verrouillé juste avant l'heure de
      dormir, alors que les deux n'ont aucun rapport. Solution :
      `disponibleApresHeure: 18` sur la routine "soir" (`ROUTINES`) —
      débloquée dès cette heure passée, **indépendamment** de l'état des
      autres routines (ni bloquée par elles, ni prise en compte pour en
      bloquer une suivante, cf. `construireMenu()`). Empêche aussi le
      risque inverse signalé : sans une notion d'heure, un enfant aurait
      pu passer directement à "Aller se coucher" (donc se déshabiller,
      première tâche) à n'importe quel moment de la journée sans avoir
      rien fait d'autre. Icône dédiée (🕒 au lieu de 🔒) et message vocal
      distinct ("Ce n'est pas encore l'heure pour...") pour ne pas laisser
      croire qu'une autre routine doit être finie avant.
- [x] Exploration direction artistique : générateur procédural (avatars
      Colette/Léon, chambre de Léon), packs Bitglow téléchargés (salle de
      bain, chambre, salon/cuisine — licence perso/commercial ok, cf.
      `assets/external/*/license.txt`)
- [x] **Test réel avec Léon — concept validé** (sur la toute première
      version, un seul écran de routine). Usage quotidien depuis, pendant
      que le reste de l'app se construit.
- [x] Passe UX/UI sur l'existant, suite au test avec Léon :
  - [x] Bouton reset protégé par appui long (~900ms) au lieu d'un tap —
        un enfant ne peut plus effacer sa journée par accident
  - [x] Texte et cibles tactiles agrandis, optimisés pour l'écran d'une
        tablette (`#app` élargi, tailles de police et boutons augmentés)
  - [x] Barre de progression segmentée (une pastille par étape) à la
        place du compteur "3/10"
  - [x] Chaque étape a un effet visible sur l'avatar — nouveau calque
        "pull" distinct du t-shirt (avant : même visuel, aucun
        changement perceptible)
  - [x] Célébration à l'ouverture du coffre/récompense (confettis +
        rebond, en plus du son/vibration déjà là)
- [x] **Mini-jeu brossage de dents** (`screen-dents`) — remplace le
      badge ✨ obtenu par glisser-déposer (placeholder noté dans "Pas
      encore designé") : la tâche `dents` de "Aller se coucher" a
      maintenant `miniJeu: "dents"` au lieu de `zone`, et s'ouvre en
      tapant sa ligne (`ouvrirMiniJeu()`) plutôt qu'en y glissant
      l'icône. Minuteur de 3 minutes réparties en 6 zones dans l'ordre
      où les brosser (haut-gauche → haut-devant → haut-droite →
      bas-gauche → bas-devant → bas-droite, 30s chacune). Une fois les
      6 zones épuisées, revient à la routine avec la tâche marquée
      faite — même geste que les autres (son, vibration, étoile de
      tâche, badge ✨ sur le visage de l'avatar, toujours via
      `marquerTache()`).
  - [x] **Aucune action requise pendant le brossage** — demandé
        explicitement : la version initiale demandait de garder le
        doigt sur la zone en cours, ce qui faisait concurrence au vrai
        geste de brossage (l'enfant a besoin de ses mains pour la vraie
        brosse à dents, pas pour l'écran). Le minuteur démarre et
        avance tout seul dès l'ouverture (`dentsEnCours`, vrai par
        défaut) ; la seule interaction possible est un bouton
        Pause/Reprendre dédié (`toggleDentsPause()`), jamais requis.
- [x] **"Enlève tes vêtements" glisse l'avatar, pas la carte** — pour se
      déshabiller (1ʳᵉ tâche de "Aller se coucher"), on tire maintenant
      l'avatar habillé (`avatarGlissable: true`) hors de la scène (vers
      le bas) plutôt que de glisser une icône de liste jusqu'à lui —
      sens plus logique que pour s'habiller, où le vêtement n'existe pas
      encore sur l'avatar. `rendreAvatarGlissable()` (app.js), variante
      de `rendreGlissable()` : succès si lâché sous `#scene`. Une flèche
      ⬇ sous l'avatar (`#fleche-detacher`) indique la direction du geste
      tant que la tâche est en cours — retour de terrain (le geste seul,
      sans indice, n'était pas assez intuitif).
  - [x] **Seuls les vêtements se détachent, pas l'avatar entier** —
        correctif suite à un autre retour de terrain (le corps de Léon
        disparaissait entièrement de la scène pendant le geste, pas
        seulement ses habits — pas logique pour "enlève TES vêtements").
        `rendreAvatarGlissable()` ne clone plus que les calques
        actuellement visibles listés dans `etape.calque` (donc juste le
        t-shirt/pantalon/etc.) ; le corps, le visage, restent en place
        et visibles tout du long. Cacher/remontrer un calque pendant le
        geste réutilise le même mécanisme que `synchroniserAvatar()`
        (classe `visible`, jamais de style inline) pour rester cohérent
        si la routine est relancée ensuite.
  - [x] **Pile de vêtements pour "Range tes vêtements"** — demandé
        explicitement en écho au point précédent : les habits qui
        viennent de tomber ne disparaissent plus dans le vide, ils
        réapparaissent en pile dans la scène (`#pile-vetements`,
        `pileGlissable: true`) que l'enfant glisse ensuite vers un
        panier — réutilise `rendreGlissable()` tel quel (seule la
        source du glisser change, la liste vers la scène), pas de
        nouvelle fonction nécessaire.
  - [x] **Panier de linge visible en permanence** — demandé
        explicitement : `zone-dos` (invisible, ne s'affiche qu'au
        survol pendant un glisser) remplacée par `zone-panier`, associée
        à un panier 🧺 réellement visible à côté de Léon
        (`#panier-linge`) dès le début de "Aller se coucher" — pas
        seulement pendant la tâche "ranger" — pour que la cible soit
        connue avant même que les vêtements ne tombent.
- [x] **Refonte menu + routines + validation parent**, à partir des
      principes notés dans `docs/produit/` (routines indépendantes,
      relation mère-fille Routine ↔ Tâches, étoiles → jauge de journée,
      correction parent avant validation) — voir le détail dans le bloc
      "Prototype de parcours jouable" ci-dessus. Ces docs restent la
      référence pour ce qui n'est **pas encore** fait (paramétrage
      parent, missions, proposition d'activité par l'enfant) :
      [`concept.md`](docs/produit/concept.md),
      [`parcours-journee.md`](docs/produit/parcours-journee.md),
      [`modele-de-donnees.md`](docs/produit/modele-de-donnees.md).

## Prochaines étapes (par ordre de priorité)

> À garder en tête : Léon a vu et validé le nouveau parcours (menu →
> routine → félicitations → validation/correction → jauge), avec un seul
> point de friction relevé (icône à glisser trop petite, confusion avec
> le tap sur la liste) — corrigé dans cette session (icône fusionnée dans
> la liste, agrandie, plus aucune ligne tapable). **Ce correctif précis
> n'a pas encore été revu par Léon** — à observer à la prochaine
> utilisation.

1. [ ] **Repasser tous les écrans un par un** — après la densification
       récente (espace parent complet : relancer une routine, historique,
       changer le code, planning du jour, catalogues Activités/Routines +
       création), revalider chaque écran et chaque parcours en conditions
       réelles plutôt que sur la seule lecture du code : le glisser-déposer,
       les boutons retour, le pavé code, les formulaires de création
       restent fluides sur tablette ; les enchaînements (verrouillage
       séquentiel des routines, déblocage par heure de "Aller se coucher",
       lien planning ↔ "Partir à l'aventure") se comportent comme prévu
       après tous les ajouts récents ; rien n'a régressé.
2. [ ] **Contenu des missions** — première aventure de contenu réel
       ajoutée ("Le magasin de bricolage", cf. "Fait" ci-dessus), mais
       `AVENTURES` reste en dur dans `app.js` (comme `ROUTINES`) : pas
       encore d'écran parent pour en programmer/reprogrammer. Reste à
       faire : plus d'aventures (orthophoniste redevient programmable
       avec une vraie date, vélo...) et leur paramétrage côté parent.
       Cf. `docs/produit/concept.md`.
3. [ ] **Généraliser à Colette** — ses propres routines + calibrage doux
       (handoff, écran 05 "deuxième peau"), preuve que l'architecture
       tient avec un 2ᵉ profil
4. [ ] **Rendre le contenu pilotable côté parent** — plusieurs briques
       faites via l'espace parent (cf. "Fait" plus haut) : réordonner/
       retirer/ajouter les *items du planning du jour*, relancer une
       routine, changer le code, consulter l'historique. Reste en dur
       dans `app.js` : le contenu de `ROUTINES` et `AVENTURES`
       elles-mêmes (impossible de créer/modifier une routine ou une
       aventure depuis l'app, seulement de piocher dans ce qui existe
       déjà pour le planning) ; le verrouillage séquentiel entre
       routines (toujours figé dans le code, indépendant de l'ordre du
       planning qui lui est éditable).
5. [ ] **Barème de récompense de fin de journée** — actuellement juste
       "total d'étoiles affiché", pas de vraie récompense différenciée
       selon la quantité (cf. `docs/produit/concept.md`)
6. [ ] **Direction artistique** — une fois le parcours éprouvé sur les
       deux enfants : intégrer les packs Bitglow ou affiner le
       procédural pour les pièces, brancher des sprites de décor sur
       l'app (aujourd'hui la scène reste un simple dégradé de fond)

## Mis de côté (code présent, pas branché)

- **Chez Pauline** reste dans `AVENTURES` (`app.js`, écrans
  `screen-trajet`/`screen-arrivee` désormais génériques et branchés pour
  les aventures qui ONT une `date`) mais sans `date` : ne réapparaît
  jamais tout seul dans les sorties du jour. À reprogrammer explicitement
  (lui donner une `date`, ou une vraie récurrence — pas encore modélisée)
  le jour où on voudra la réintégrer au parcours actif.

## Pas encore designé (cf. handoff, section "Ce qui n'est pas encore conçu")

- **Routine petit-déjeuner** — cuisine, plusieurs sous-étapes (préparer la
  table, sortir le repas, manger...), pas une étape isolée.
- Routine du soir
- Écran parent de composition de la journée
- Boutique des prix / contenu du coffre par enfant
- Écran de renfort (dépassement de temps)
