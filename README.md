# 🚀 Geo-Gleiter: Die Formen-Jagd

Ein rasantes, pädagogisches Browserspiel von **JonFie Studios** für Kinder im
Grundschulalter: **geometrische Formen und Farben** erkennen und fangen –
das Schwester-Spiel des [Uhrzeit-Uhu](https://github.com/etechnik3r/uhrzeit-uhu)
im gleichen Design.

Der **Bordcomputer** gibt einen Auftrag („Sammle alle **DREIECKE**!“) – als
Text, als **Form-Symbol** und auf Wunsch per **Sprachausgabe** (auch für
Kinder, die noch nicht lesen können). Von oben fallen bunte Formen durchs
Weltall – und das Kind steuert den Geo-Gleiter (🚀) auf der **Wischfläche**
unter dem Schiff nach links und rechts, um nur die richtigen einzusammeln.

## ✨ Eigenschaften

- **Reines Vanilla JavaScript (ES6+)** – keine Frameworks, keine externen
  Bibliotheken, **keine Bilddateien**: Das Raumschiff ist ein Emoji, die
  2D-Formen (⚪ Kreis, ⬜ Quadrat, 🔺 Dreieck, 🔷 Raute, ⬡ Sechseck, ⭐ Stern)
  sind Inline-SVG mit **exakter Geometrie** (regelmäßiges Sechseck,
  gleichseitiges Dreieck) und kräftiger weißer Kontur – gestochen scharf,
  in vier leuchtenden Grundfarben und stark variierenden Größen.
- **Echte 3D-Objekte:** 🧊 Würfel und 🔺 Pyramide sind CSS-3D-Körper aus
  einzelnen Flächen, die sich dauerhaft um **zwei Achsen** drehen – man
  erkennt jederzeit, dass es Körper sind (kein „Dreieck, das Pyramide
  heißt“). Sie tauchen je nach Schwierigkeit ab bestimmten Leveln auf.
- **Energie-Mechanik mit echter Spannung:** Das Schiff startet mit vollem
  Energie-Akku – eine kleine **Batterie oben links im Spielfeld** (wie die
  Akku-Anzeige eines Handys, formlich eindeutig und klar vom goldenen
  Level-Fortschrittsbalken zu unterscheiden). Die Batterie hat **vier
  Zellen**: Jede **falsch** gefangene Form löscht eine Zelle – nach **vier
  Fehlgriffen** ist die **Mission zu Ende** (Ergebnis-Anzeige + „Neue
  Mission“-Button; Punkte und Level starten wieder bei 0, nur der Rekord
  bleibt). Bei den letzten Zellen färbt sich der Akku gelb bzw. rot und
  blinkt. Eine ⚡-Kapsel lädt eine Zelle wieder auf.
- **Bonus-Extras:** goldene ⚡-Energiekapseln laden eine Akku-Zelle wieder
  auf (und kommen öfter, wenn die Energie knapp ist), blaue 🛡️-Schutzschild-
  Kapseln legen eine schimmernde Energie-Blase um das Schiff, die die
  nächsten **2 Fehlgriffe** abfängt. Beides gibt zusätzlich +25 Punkte.
- **Eigenes SVG-Raumschiff:** der Geo-Gleiter ist ein selbst gezeichnetes
  Vektor-Raumschiff mit flackernder Triebwerksflamme – auf jedem Gerät
  identisch (kein System-Emoji mehr) und vorbereitet für spätere
  Schiffs-Varianten (Akzentfarbe über `--schiff-akzent` in `style.css`).
- **Drei Lern-Phasen** (automatisch steigend oder im Menü ⚙️ fest wählbar):
  - **Phase 1 (Klasse 1):** nur die Form zählt („Sammle Quadrate!“)
  - **Phase 2 (Klasse 1/2):** Form **und** Farbe („Fange rote Dreiecke!“)
  - **Phase 3 (Klasse 2/3):** Umkehrlogik („Alles, ABER KEINE Kreise!“)
- **Drei Schwierigkeitsstufen** (🐣 Leicht / 🚀 Mittel / ☄️ Schwer) für
  kleine, mittlere und große Kinder: skalieren Falltempo, Formen-Dichte,
  Größen-Streuung und den Formen-Vorrat (Stern/Würfel/Pyramide). Innerhalb
  einer Runde steigt die Schwierigkeit zusätzlich **inkrementell**: Level 1
  beginnt bewusst mit ganz wenigen Formen, mit jedem Level werden Dichte
  und Fluggeschwindigkeit größer.
- **Sprachausgabe:** der Bordcomputer liest jeden neuen Auftrag über die
  Web Speech API vor (deutsche Stimme, abschaltbar) – zusätzlich zeigt die
  Konsole die gesuchte Form als Symbol.
- **Klarer Levelübergang mit Explosion:** ist ein Level geschafft, **zer-
  platzen alle noch fallenden Formen** gleichzeitig mit einem kleinen
  Explosions-Blitz (nur die hilfreichen ⚡/🛡️-Extras bleiben liegen). So
  merkt man den Wechsel unmissverständlich und sammelt nicht mehr aus
  Versehen die „falschen“ Formen der alten Aufgabe ein. Danach eine kurze
  **Atempause** (es kommen kurz keine neuen Formen), dann erscheint und
  ertönt der neue Auftrag und es geht weiter.
- **Startbildschirm:** ein ruhiger, wertiger Auftakt mit dem echten
  SVG-Raumschiff (dasselbe, das man im Spiel steuert), Titel und
  „Los geht’s!“-Knopf – der erste Tipp schaltet zugleich Ton und
  Sprachausgabe frei (Browser erlauben das erst nach einer echten Geste).
- **Wischfläche + Steuerung:** eigener Wisch-Streifen **unter** dem
  Raumschiff – die Hand verdeckt nie das Schiff. Wischen direkt auf dem
  Spielfeld funktioniert weiterhin (relative Drag-Steuerung; am Desktop
  gehen auch Maus und Pfeiltasten). Pause ⏸️ sitzt oben in der Top-Bar, der
  Neustart 🔄 steckt (mit Sicherheitsabfrage) im Pause-Menü – beide sind
  beim Wischen nicht im Weg.
- **Lebendiges, leicht breiteres Spielfeld:** die Formen-Welt ist ein paar
  Prozent breiter als der Bildschirm und **schwenkt beim Lenken sanft mit**
  (Kamera-Effekt) – so wirkt der Flug nicht mehr statisch, und man erreicht
  auch Formen, die knapp über dem Rand liegen.
- **Faires Feedback:** richtige Form **+10** (leuchtet auf und zerplatzt),
  falsche Form **−5** und Energie-Verlust mit ruhigem Feedback: kurzer
  Brumm-Sound, eine kleine 🔥-Flamme am Schiff, roter Rand-Blitz.
  Verpasste Formen kosten nichts, der Punktestand fällt nie unter 0.
- **3D-Sternenfeld:** ein Canvas-Weltraum mit ~140 Sternen in echter
  Tiefenstaffelung – nahe Sterne sind groß, hell und schnell, ferne klein
  und langsam, und beim Lenken driften sie unterschiedlich stark zur Seite
  (Parallaxe). Je höher Level und Schwierigkeit, desto schneller der Flug.
- **Gleiche Designsprache wie Uhrzeit-Uhu:** Top-Bar mit Marke, weißen
  Punkte-Chips und ⚙️-Zahnrad, dunkles Schild mit goldener Schrift,
  Einstellungs-Seite mit Options-Karten, Konfetti-Feier, lokale Schriften
  (Baloo 2 / Nunito).
- **Browser-native Extras:** Soundeffekte über die Web Audio API
  (programmatisch erzeugt, abschaltbar), Rekord + Einstellungen im
  `localStorage`, automatische Pause bei Tab-Wechsel.
- **Installierbar als App (PWA):** komplettes Web-App-Manifest mit
  PNG-Icons (192/512) und maskierbarem Icon, iOS-Home-Screen-Tags und ein
  **Service Worker**, der die ganze App-Schale cached – so lässt sich das
  Spiel „zum Startbildschirm hinzufügen“ und läuft danach **auch offline**.
- **Mobile First:** Hochformat-Layout ohne Scrollen, große Schrift für
  Leseanfänger, `touch-action: none` für ruckelfreies Wischen; auf großen
  Bildschirmen bleibt das Spiel eine schmale Säule in der Mitte.

## 🚀 Starten

Keine Installation, kein Build nötig. Einfach die Datei **`index.html`** in
einem modernen Browser öffnen (Doppelklick genügt).

Empfohlen: ein lokaler Webserver (dann funktionieren Audio und Schriften
in allen Browsern zuverlässig):

```bash
# Python 3
python3 -m http.server 8000
# danach im Browser öffnen:  http://localhost:8000
```

**Als App installieren (PWA):** über `http://localhost` oder eine echte
**HTTPS**-Adresse aufrufen (Service Worker laufen nicht per `file://`). Dann
bietet der Browser „Installieren“ bzw. „Zum Startbildschirm hinzufügen“ an –
danach startet das Spiel wie eine echte App im Vollbild und funktioniert auch
ohne Internet.

## 📁 Dateistruktur

| Datei                  | Inhalt                                                      |
|------------------------|-------------------------------------------------------------|
| `index.html`           | Struktur/Markup (Top-Bar, Konsole, Spielfeld, Wischfläche, Menü) |
| `style.css`            | Aussehen, SVG-/3D-Formen, responsives Layout                 |
| `game.js`              | Gesamte Spiellogik (Game-Loop, Kollision, Touch, Sound, Sprache, Sternenfeld) |
| `manifest.webmanifest` | PWA-Manifest (Name, Icons, Farben – installierbar)           |
| `sw.js`                | Service Worker (cached die App-Schale → offline spielbar)    |
| `icon.svg` / `icon-maskable.svg` | App-Icons als Vektor (normal + maskierbar)        |
| `icon-*.png`           | Gerasterte App-Icons (192/512, maskierbar, Apple-Touch)      |
| `fonts/`               | Lokale Schriften (Baloo 2, Nunito – offline-fähig)           |
| `README.md`            | Diese Beschreibung                                           |

## 🧮 Wie das Spiel tickt (kurz erklärt)

- **Game-Loop:** `requestAnimationFrame` ruft die Schleife vor jedem
  Bildaufbau auf. Bewegt wird mit **Delta-Zeit** (`Weg = Tempo × vergangene
  Sekunden`), damit das Spiel auf 60-Hz- und 120-Hz-Displays gleich schnell
  läuft. Ein Deckel bei 50 ms verhindert Sprünge nach Tab-Wechseln.
- **Kollision:** klassischer **AABB-Rechteck-Test** zwischen Schiff und Form;
  die Fang-Box der Formen ist bewusst etwas kleiner als ihr Bild, damit
  knappes Vorbeischrammen nicht als Fehlgriff zählt.
- **Touch:** Pointer-Events (Touch + Maus + Stift in einer API) mit
  **relativem** Drag – der Fingerweg wird leicht verstärkt (×1,15) auf das
  Schiff übertragen, so erreicht man beide Ränder ohne umzugreifen.
- **3D-Objekte:** `transform-style: preserve-3d` + einzelne Flächen-Divs
  (`rotateY`/`rotateX` + `translateZ`); die Drehung um zwei Achsen ist
  bewusst Spiel-Information, keine Deko.
- **Sternenfeld:** ein `<canvas>` hinter dem Spiel; jeder Stern hat einen
  Tiefenwert `z` – Geschwindigkeit ~ `z³`, Größe/Helligkeit ~ `z`, plus
  seitliche Parallaxe beim Lenken.

Alle Themen sind im Quellcode (`game.js`) ausführlich auf Deutsch
kommentiert.

## 🎯 Anpassen

Häufige Stellschrauben liegen zentral am Anfang von `game.js`:

- **Punkte & Level-Rhythmus:** `PUNKTE_RICHTIG`, `PUNKTE_FALSCH`,
  `PUNKTE_BONUS`, `ZIEL_PRO_LEVEL`
- **Energie & Schild:** `ENERGIE_MAX`, `ENERGIE_KAPSEL_PLUS`,
  `ENERGIE_LEVEL_BONUS`, `SCHILD_LADUNGEN`, `energieVerlust` (in `STUFEN`)
- **Schwierigkeit:** `STUFEN` (Tempo, Dichte, Größen, Trefferquote, Rampe),
  `TEMPO_DECKEL`, `ATEMPAUSE_SEK`
- **Formen-Vorrat pro Stufe/Level:** `aktiverFormenPool()`
- **Formen/Farben (auch Namen):** `FORMEN`, `FARBEN`, `SVG_PFADE`
- **Farbwerte & Design:** CSS-Variablen oben in `style.css`
- **Cache-Version bei Änderungen:** `?v=NUMMER` in `index.html` erhöhen
