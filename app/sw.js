/*
 * Service worker — rend l'app utilisable hors-ligne une fois chargée une
 * première fois, et indépendante de la disponibilité d'un serveur
 * particulier ensuite (cf. discussion produit sur la réinitialisation :
 * ne plus dépendre d'un serveur de dev qui peut changer d'adresse ou
 * être éteint). Stratégie "stale-while-revalidate" : sert le cache
 * immédiatement si présent (marche hors-ligne), tout en rafraîchissant
 * le cache en tâche de fond dès qu'un réseau est disponible.
 *
 * Nécessite HTTPS (ou localhost) — les navigateurs n'activent pas les
 * service workers sur http:// simple (ex. une IP locale), cf. app/README.md.
 *
 * Incrémenter CACHE_NAME à chaque changement de cette liste (ou pour
 * forcer un rafraîchissement) : `activate` supprime les caches d'un nom
 * différent.
 *
 * Les deux jeux d'avatar (leon-*.png ET colette-*.png) sont mis en cache
 * ici, même si un appareil donné n'affiche jamais qu'un seul profil (cf.
 * PROFILS/profilActif() dans app.js) : ce fichier ne sait pas à l'avance
 * quel enfant tel appareil affichera, et le coût (quelques petits PNG)
 * est négligeable pour un usage à la maison.
 */
const CACHE_NAME = "dayrise-v10";
const A_METTRE_EN_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/avatar/leon-base.png",
  "./assets/avatar/leon-calecon.png",
  "./assets/avatar/leon-haut.png",
  "./assets/avatar/leon-pantalon.png",
  "./assets/avatar/leon-chaussettes.png",
  "./assets/avatar/leon-chaussures.png",
  "./assets/avatar/leon-manteau.png",
  "./assets/avatar/colette-base.png",
  "./assets/avatar/colette-culotte.png",
  "./assets/avatar/colette-haut.png",
  "./assets/avatar/colette-robe.png",
  "./assets/avatar/colette-chaussettes.png",
  "./assets/avatar/colette-chaussures.png",
  "./assets/avatar/colette-manteau.png",
  "./assets/avatar/leon-dodo.png",
  "./assets/avatar/colette-dodo.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/scenes/fenetre-voiture.jpg",
  "./assets/scenes/chambre-leon.jpg",
  "./assets/scenes/chambre-colette.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(A_METTRE_EN_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((reponseEnCache) => {
      const misAJour = fetch(event.request)
        .then((reponseReseau) => {
          if (reponseReseau && reponseReseau.ok) {
            const copie = reponseReseau.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie));
          }
          return reponseReseau;
        })
        .catch(() => reponseEnCache);
      return reponseEnCache || misAJour;
    })
  );
});
