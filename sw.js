/* ===========================================================================
   Geo-Gleiter: Die Formen-Jagd  –  Service Worker (sw.js)
   ---------------------------------------------------------------------------
   Macht das Spiel als PWA installierbar UND offline spielbar: beim Installieren
   wird die komplette "App-Schale" (HTML, CSS, JS, Schriften, Icons) in einen
   Cache gelegt. Danach laedt alles blitzschnell aus dem Cache – auch ohne Netz.

   WICHTIG: Bei jeder Aenderung an den Dateien die ?v=NUMMER in index.html UND
   die CACHE_VERSION hier hochzaehlen. Ein neuer Cache-Name sorgt dafuer, dass
   der Service Worker die frischen Dateien laedt und den alten Cache wegraeumt.
   =========================================================================== */

const CACHE_VERSION = "geo-gleiter-v6";

// Alle Pfade RELATIV (fuehrendes "./"), damit die App auch in einem
// Unterverzeichnis (z. B. https://name.github.io/geo-gleiter/) funktioniert.
const APP_SCHALE = [
  "./",
  "./index.html",
  "./style.css?v=6",
  "./game.js?v=6",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./icon-apple-180.png",
  "./fonts/baloo2-latin.woff2",
  "./fonts/nunito-latin.woff2"
];

// INSTALL: App-Schale vorladen. addAll ist "alles-oder-nichts"; damit ein
// einzelner Fehltreffer die Installation nicht komplett scheitern laesst,
// legen wir die Dateien einzeln und fehlertolerant ab.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(APP_SCHALE.map((url) =>
        cache.add(url).catch(() => { /* einzelne Datei fehlt? egal, weiter */ })
      ))
    ).then(() => self.skipWaiting())
  );
});

// ACTIVATE: alte Cache-Versionen aufraeumen und sofort uebernehmen.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(namen
        .filter((n) => n !== CACHE_VERSION)
        .map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// FETCH: nur eigene GET-Anfragen behandeln.
//   - Seitenaufrufe (Navigation): erst Netz, sonst die gecachte index.html
//     (so startet die App auch offline).
//   - alles andere: erst Cache, sonst Netz (und ins Cache nachlegen).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((treffer) => {
      if (treffer) return treffer;
      return fetch(req).then((antwort) => {
        // Erfolgreiche, gleiche-Herkunft-Antworten fuer spaeter mitnehmen.
        if (antwort && antwort.status === 200 && antwort.type === "basic") {
          const kopie = antwort.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, kopie));
        }
        return antwort;
      }).catch(() => treffer);
    })
  );
});
