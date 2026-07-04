# 🚀 Geo-Gleiter: Die Formen-Jagd

Ein rasantes, pädagogisches Browserspiel von **JonFie Studios** für Kinder im
Grundschulalter: **geometrische Formen und Farben** erkennen und fangen –
das Schwester-Spiel des [Uhrzeit-Uhu](https://github.com/etechnik3r/uhrzeit-uhu)
im gleichen Design.

Der **Bordcomputer** gibt einen Auftrag („Sammle alle **DREIECKE**!“), von oben
fallen bunte Formen durchs Weltall – und das Kind steuert den Geo-Gleiter (🚀)
mit dem Finger nach links und rechts, um nur die richtigen Formen einzusammeln.

## ✨ Eigenschaften

- **Reines Vanilla JavaScript (ES6+)** – keine Frameworks, keine externen
  Bibliotheken, **keine Bilddateien**: Das Raumschiff ist ein Emoji, die fünf
  Formen (⚪ Kreis, ⬜ Quadrat, 🔺 Dreieck, 🔷 Raute, ⬡ Sechseck) entstehen rein
  aus CSS (`border-radius`, `clip-path`) – gestochen scharf und in vier
  leuchtenden Grundfarben (Rot, Blau, Grün, Gelb).
- **Drei Lern-Phasen** (automatisch steigend oder im Menü ⚙️ fest wählbar):
  - **Phase 1 (Klasse 1):** nur die Form zählt („Sammle Quadrate!“)
  - **Phase 2 (Klasse 1/2):** Form **und** Farbe („Fange rote Dreiecke!“)
  - **Phase 3 (Klasse 2/3):** Umkehrlogik („Sammle alles, ABER KEINE Kreise!“)
- **Touch-Drag-Steuerung:** Finger irgendwo aufs Spielfeld legen und wischen –
  das Schiff gleitet weich mit, ohne unter dem Finger zu verschwinden
  (relative Steuerung; am Desktop gehen auch Maus und Pfeiltasten).
- **Punktesystem ohne Frust:** richtige Form **+10** (leuchtet auf und
  zerplatzt), falsche Form **−5** (Schiff wackelt, Bildschirmrand blinkt kurz
  rot) – **kein Game Over**, verpasste Formen kosten nichts, der Punktestand
  fällt nie unter 0.
- **Level-Progression:** alle **10 richtigen Formen** gibt es Konfetti, einen
  neuen Auftrag und ein minimal höheres Tempo (der Fortschrittsbalken in der
  Konsole zeigt, wie weit es noch ist). Drei Grund-Tempi (🐢/🚀/☄️) im Menü.
- **Scrollender Weltraum:** zwei Sternen-Ebenen wandern per CSS-Animation mit
  Parallax-Effekt nach unten – je höher das Level, desto schneller der Flug.
- **Gleiche Designsprache wie Uhrzeit-Uhu:** Top-Bar mit Marke, weißen
  Punkte-Chips und ⚙️-Zahnrad, dunkles Schild mit goldener Schrift,
  Einstellungs-Seite mit Options-Karten, Konfetti-Feier, lokale Schriften
  (Baloo 2 / Nunito).
- **Browser-native Extras:** Soundeffekte über die Web Audio API
  (programmatisch erzeugt, abschaltbar), Rekord + Einstellungen im
  `localStorage`, automatische Pause bei Tab-Wechsel, PWA-Manifest.
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

## 📁 Dateistruktur

| Datei                  | Inhalt                                                      |
|------------------------|-------------------------------------------------------------|
| `index.html`           | Struktur/Markup (Top-Bar, Konsole, Spielfeld, Menü)          |
| `style.css`            | Aussehen, CSS-Formen, Sternen-Animation, responsives Layout  |
| `game.js`              | Gesamte Spiellogik (Game-Loop, Kollision, Touch, Sound)      |
| `manifest.webmanifest` | PWA-Manifest (installierbar)                                 |
| `icon.svg`             | App-Icon (Rakete + Formen)                                   |
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

Alle drei Themen sind im Quellcode (`game.js`) ausführlich auf Deutsch
kommentiert.

## 🎯 Anpassen

Häufige Stellschrauben liegen zentral am Anfang von `game.js`:

- **Punkte & Level-Rhythmus:** `PUNKTE_RICHTIG`, `PUNKTE_FALSCH`, `ZIEL_PRO_LEVEL`
- **Tempo:** `TEMPO_CONFIG`, `TEMPO_PRO_LEVEL`, `TEMPO_DECKEL`
- **Anteil passender Formen:** `TREFFER_QUOTE`
- **Formen/Farben (auch Namen):** `FORMEN`, `FARBEN`
- **Farbwerte & Design:** CSS-Variablen oben in `style.css`
- **Cache-Version bei Änderungen:** `?v=NUMMER` in `index.html` erhöhen
