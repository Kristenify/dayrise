# Modèle de données — notes en cours

Entités et relations, prises au fil des explications, avant
implémentation. Pas encore du code. Le pourquoi/l'intention est dans
`concept.md`, le déroulé écran par écran dans `parcours-journee.md`.

## Routine ↔ Tâche : relation mère-fille

Une **Routine** est indépendante des autres routines. Chaque routine a sa
propre liste ordonnée de **Tâches**.

Une tâche appartient à une routine (relation mère-fille : la routine est
la mère, ses tâches sont les filles). Pas de tâche partagée entre
plusieurs routines pour l'instant.

Les tâches seront **paramétrables par les parents** à terme (ajouter,
retirer, réordonner des tâches au sein d'une routine).

## Routines identifiées jusqu'ici

- **"S'habiller"** — du slip aux chaussettes : caleçon → t-shirt/pull →
  pantalon → chaussettes.
- **"Se préparer à partir"** — chaussures, manteau, sac.

(Ce découpage remplace la notion de "chambre"/"salon" par pièce codée en
dur dans le prototype actuel — à corriger : les routines sont l'unité de
modélisation, pas les pièces. Le lieu où ça se passe est une propriété de
la routine, pas l'inverse.)

## Récompense (aspect données)

- Chaque routine terminée + validée par un parent rapporte une étoile
  (champ à porter par la routine ou par l'état du jour — à trancher).
- Le total d'étoiles du jour alimente une jauge de journée.
- Voir `concept.md` pour la philosophie (jauge, correction avant
  validation) et `parcours-journee.md` pour où ça se déclenche dans le
  flux.

## Aventure (aspect données)

Une **Aventure** est une sortie programmée (ex. "chez Pauline",
"le magasin de bricolage") — cf. distinction Routine/Mission dans
`concept.md`. Dans le prototype (`AVENTURES` dans `app.js`), une
aventure porte : `lieu`, les textes du trajet et de l'arrivée, le
`programme` (3 lignes annoncées à l'arrivée), une `personne` optionnelle
(pour une sortie chez quelqu'un) et une `date` optionnelle (filtre pour
savoir si elle apparaît dans les sorties du jour — une aventure sans
date, comme "chez Pauline", n'apparaît jamais toute seule, cf. TODO.md).

## Pièce (aspect données) — monnaie distincte de l'étoile

- Une aventure peut rapporter des **pièces** au lieu d'une étoile de
  routine (`recompensePieces` sur l'Aventure). Voir `concept.md` pour
  la philosophie (pas une jauge de journée, se dépense plus tard ou se
  donne aux parents dans la vraie vie).
- Stockage à part de l'état du jour, justement parce que ça **ne suit
  pas le cycle quotidien** des étoiles : dans le prototype, une clé
  `localStorage` séparée (`leon_pieces`) qui n'est jamais réinitialisée
  au changement de jour.
- Pas encore de mécanique de dépense modélisée (boutique, choix
  d'activité) — juste le total qui s'accumule pour l'instant.

## Ce qui reste à préciser (suite des explications à venir)

- Comment une journée assemble plusieurs routines/missions (ordre,
  dépendances, conditions de passage de l'une à l'autre) — au-delà du
  principe déjà posé ("routine suivante grisée tant que la précédente
  n'est pas finie", paramétrable par les parents).
- Ce qui est réellement paramétrable par tâche vs par routine côté parent.
- Modélisation des "missions" (sorties/activités) par rapport aux
  routines — même entité, ou distincte ?
- Barème précis étoiles → récompense de fin de journée.
- D'autres routines à venir (dents, petit-déjeuner — déjà notées comme
  mini-jeux à part dans `TODO.md`).
