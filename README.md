# Dayrise — jeu pixel art de routines pour deux enfants (TSA/TDAH)

## Contexte du projet

Application pour aider deux enfants — Colette (5 ans) et Léon (8 ans),
tous deux TSA et TDAH — à accomplir leurs routines quotidiennes en
autonomie, du réveil au retour à la maison. Le planning visuel de la
journée et un jeu de vie en pixel art sont fusionnés en un seul objet :
la journée est la carte, les lieux sont les niveaux, les routines sont
des phases d'action (on doit faire quelque chose), les trajets/attentes
sont des phases sans pression (on n'a rien à faire).

**Appareil cible :** tablette Android déjà possédée par la famille. App
web autonome, sans build, installée localement (Chrome → "Ajouter à
l'écran d'accueil"), fonctionnant **hors-ligne**.

**Contrainte structurante :** les enfants ne savent pas lire. Chaque
écran doit être jouable à l'oreille et à l'image — texte jamais porteur
d'information seule. Les réglages sensoriels (contraste, densité,
mouvement, débit vocal) sont propres à chaque enfant.

## D'où vient ce projet (historique)

1. Premières explorations (boutons électroniques, liseuse Kindle
   recyclée) écartées — voir `docs/legacy/` pour le tout premier
   prototype (Léo/Nina), qui documentait ces décisions.
2. **Handoff de design complet** reçu et versionné dans
   [`docs/design-handoff/`](docs/design-handoff/README.md) : bible
   d'univers "Dayrise", 12 maquettes d'écran, calibrage sensoriel,
   tokens de couleur/typo, modèle de données. C'est la référence
   d'intention actuelle — **à lire avant toute décision de design ou de
   flux**.
3. Le projet vise maintenant explicitement Colette et Léon (plus Léo/
   Nina de la toute première itération, conservée en archive).
4. Depuis le test réel avec Léon, le parcours et le modèle de données
   évoluent au-delà du handoff initial (routines/tâches, missions,
   système de récompense) — ces décisions produit propres au projet sont
   versionnées au fil de l'eau dans
   [`docs/produit/`](docs/produit/concept.md), distinctes du handoff reçu
   (figé). Le prototype (`app/`) a été refondu en conséquence (menu de
   routines, validation parent avec correction, jauge de journée — voir
   [`TODO.md`](TODO.md)) ; les missions et le paramétrage parent restent
   à faire.

## Où en est le projet

Deux chantiers séparés, volontairement non synchronisés pour l'instant :

### 1. Prototype fonctionnel (`app/`) — priorité actuelle

Un parcours jouable pour **Léon et Colette**, chacun sur son propre
appareil (pas un sélecteur de profil partagé) : menu de la journée
listant des **routines** indépendantes ("S'habiller", "Se préparer à
partir" — relation mère-fille Routine ↔ Tâches, cf. `docs/produit/`),
chacune en glisser-déposer, suivie d'une validation parent (code +
relecture/correction) qui accorde une étoile et remplit une jauge de
journée. Récompense automatique une fois toutes les routines validées.
L'avatar utilise déjà un vrai sprite (calques révélés progressivement,
cohérents entre le menu et l'écran de routine, propre à chaque enfant —
Colette a par exemple sa propre robe) ; le reste du décor est encore en
formes CSS + emoji. Trajet et arrivée chez une praticienne (Pauline et
Elsa pour Léon, Arianne pour Colette) sont codés et branchés au parcours,
mais réutilisent encore l'écran générique de n'importe quelle sortie —
un enchaînement propre à une visite chez une praticienne reste à
concevoir (voir [`TODO.md`](TODO.md)). Voir [`app/README.md`](app/README.md)
pour le détail de ce qui est couvert.

### 2. Exploration de direction artistique (`scripts/`, `assets/`)

En parallèle, exploration de ce à quoi pourraient ressembler des sprites
plus détaillés (avatars, chambre de Léon) :
- génération procédurale (Python/Pillow) — voir `scripts/generate_*.py`
  (c'est ce générateur qui alimente l'avatar du prototype, via
  `app/assets/avatar/`)
- intégration d'assets réels sous licence libre (packs Bitglow,
  pièces vue du dessus) — voir `scripts/extract_sprites.py`
  et `scripts/compose_room_*.py`, et `assets/external/*/license.txt`
  pour les termes de licence de chaque pack.

Le décor (pièces) de ces deux chantiers n'est pas encore relié au
prototype — seul l'avatar l'est. Voir [`TODO.md`](TODO.md) pour la suite.

## Structure du dépôt

```
routine-et-planning/
├── README.md                     ce fichier
├── TODO.md                       liste vivante : fait / prochaines étapes / mis de côté
├── app/                          prototype fonctionnel (voir app/README.md)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── assets/avatar/            sprites de l'avatar (alimentés par scripts/generate_*.py)
├── docs/
│   ├── design-handoff/           référence de design "Dayrise" reçue (figée, à lire avant toute décision de flux/UI)
│   ├── produit/                  décisions produit propres au projet, prises depuis (concept, parcours, modèle de données) + fonctionnalites.md (vue d'ensemble pour en parler, tenue à jour)
│   └── legacy/                   tout premier prototype (Léo/Nina), conservé pour mémoire
├── scripts/                      génération procédurale + extraction de sprites (Python/Pillow)
└── assets/
    ├── external/                 packs tiers sous licence libre (Bitglow) + license.txt de chacun
    └── generated/                sorties des scripts (sprites, aperçus de pièces) — pas de travail manuel dedans
```

## Gestion des branches

Léon utilise l'app tous les jours : le dépôt distingue donc une branche
stable de ce qu'il a réellement sous les mains d'une branche de travail.

- **`main`** — version stable, celle qui correspond à ce qui est
  installé sur la tablette de Léon. On n'y touche pas directement.
- **`dev`** — branche de développement, où se fait tout le travail en
  cours. C'est elle qui avance au fil des sessions.

Workflow :

1. Le travail se fait sur `dev` (ou une branche dédiée créée depuis
   `dev` pour un chantier précis, fusionnée dans `dev` une fois prête).
2. Une fois un changement testé et jugé prêt pour Léon, fusionner `dev`
   dans `main` :
   ```bash
   git checkout main
   git merge dev
   ```
3. C'est seulement à ce moment-là que la tablette de Léon doit être mise
   à jour vers ce que contient `main` — pas à chaque session de travail
   sur `dev`.
4. Pousser `main` (`git push origin main`) déclenche automatiquement la
   publication de `app/` sur GitHub Pages (cf. "Déploiement" ci-dessous)
   — c'est ce qui rend le changement réellement disponible pour la
   tablette de Léon.

## Déploiement

- **Dépôt** : [github.com/Kristenify/dayrise](https://github.com/Kristenify/dayrise)
  (public — `assets/external/` en est volontairement exclu, cf.
  `.gitignore` : licence Bitglow non redistribuable, non utilisé par
  l'app déployée de toute façon).
- **App en ligne** : [kristenify.github.io/dayrise](https://kristenify.github.io/dayrise/)
  — publiée automatiquement (`.github/workflows/deploy.yml`) à chaque
  push sur `main`, à partir du contenu de `app/` uniquement.
- **Installation sur la tablette de Léon** : ouvrir l'URL ci-dessus une
  fois dans le navigateur, puis "Ajouter à l'écran d'accueil". Un
  service worker (`app/sw.js`) met ensuite l'app en cache : elle
  continue de fonctionner **hors-ligne**, sans dépendre d'aucun serveur
  (ni GitHub, ni le Mac utilisé pour développer) — voir `app/README.md`
  pour le détail technique.
