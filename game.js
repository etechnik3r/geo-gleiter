/* ===========================================================================
   Geo-Gleiter: Die Formen-Jagd  –  Spiellogik (game.js)
   ---------------------------------------------------------------------------
   Reines Vanilla JavaScript (ES6+), keine externen Bibliotheken.
   Ein Spiel von JonFie Studios – Schwester-Spiel des "Uhrzeit-Uhu".

   SPIELPRINZIP
     Von oben fallen bunte CSS-Formen. Der Bordcomputer gibt einen Auftrag
     ("Sammle alle DREIECKE!"). Das Kind wischt mit dem Finger nach links/
     rechts, um den Geo-Gleiter (🚀) zu steuern und die richtigen Formen
     einzusammeln. Richtig = +10 Punkte, falsch = −5 Punkte (nie unter 0,
     KEIN Game Over). Alle 10 richtigen Formen: neues Level, neuer Auftrag,
     etwas hoeheres Tempo.

   LERN-PHASEN (Einstellung "Automatisch" folgt dem Level):
     Phase 1: nur die FORM zaehlt            (Level 1–3)
     Phase 2: FORM und FARBE muessen stimmen (Level 4–6)
     Phase 3: Umkehrlogik "ABER KEINE …"     (ab Level 7)

   INHALT
     1. Konstanten & Konfiguration
     2. Spielzustand (State) inkl. Einstellungen
     3. HTML-Referenzen
     4. Hilfsfunktionen
     5. Auftrag (Mission) wuerfeln + anzeigen
     6. Formen erzeugen (Spawnen)
     7. DIE GAME-LOOP (requestAnimationFrame)   <-- Kern des Spiels
     8. KOLLISIONSABFRAGE (Rechteck-Test)       <-- ausfuehrlich erklaert
     9. Feedback: richtig / falsch / Level-Up
    10. TOUCH-STEUERUNG (Wisch-Drag)            <-- ausfuehrlich erklaert
    11. Soundeffekte (Web Audio, programmatisch erzeugt)
    12. Speichern (localStorage)
    13. Pause, Neustart, Einstellungen, Popover
    14. Start
   ===========================================================================*/

(function () {
  "use strict";


  /* 1. KONSTANTEN & KONFIGURATION ----------------------------------------- */

  const SPEICHER_SCHLUESSEL = "geo-gleiter-state";

  // Die fuenf Formen mit deutschen Namen (Mehrzahl fuer die Auftrags-Texte).
  const FORMEN = {
    kreis:    { mehrzahl: "Kreise" },
    quadrat:  { mehrzahl: "Quadrate" },
    dreieck:  { mehrzahl: "Dreiecke" },
    raute:    { mehrzahl: "Rauten" },
    sechseck: { mehrzahl: "Sechsecke" }
  };
  const FORM_NAMEN = Object.keys(FORMEN);

  // Die vier Grundfarben (adjektiv = fuer Texte wie "rote KREISE").
  const FARBEN = {
    rot:   { adjektiv: "rote" },
    blau:  { adjektiv: "blaue" },
    gruen: { adjektiv: "grüne" },
    gelb:  { adjektiv: "gelbe" }
  };
  const FARB_NAMEN = Object.keys(FARBEN);

  // Punkte & Level-Rhythmus
  const PUNKTE_RICHTIG = 10;   // richtige Form gefangen
  const PUNKTE_FALSCH  = 5;    // falsche Form gefangen (wird abgezogen)
  const ZIEL_PRO_LEVEL = 10;   // alle 10 richtigen Formen -> neues Level

  // Tempo-Voreinstellungen (Menue ⚙️): fallDauer = Sekunden, die eine Form
  // vom oberen bis zum unteren Rand braucht (bei Level 1).
  // spawnAbstand = Sekunden zwischen zwei neuen Formen (bei Level 1).
  const TEMPO_CONFIG = {
    ruhig:  { fallDauer: 6.0, spawnAbstand: 1.5 },
    normal: { fallDauer: 4.6, spawnAbstand: 1.15 },
    flott:  { fallDauer: 3.6, spawnAbstand: 0.9 }
  };

  // Pro Level wird alles ~5 % schneller – aber gedeckelt, damit es fuer
  // Kinderhaende immer noch fair bleibt.
  const TEMPO_PRO_LEVEL = 0.05;
  const TEMPO_DECKEL    = 0.55;    // nie schneller als 55 % der Grund-Falldauer

  // Wie oft eine Form fallen soll, die zum Auftrag passt (Rest = Ablenker).
  // Genug Treffer-Chancen halten kleine Spieler:innen bei Laune.
  const TREFFER_QUOTE = 0.45;

  // Groesse der Formen und des Gleiters (Pixel)
  const FORM_MIN = 44;
  const FORM_MAX = 64;
  const GLEITER_BREITE = 64;   // muss zu .gleiter in style.css passen
  const GLEITER_HOEHE  = 64;
  const GLEITER_BODEN  = 10;   // Abstand des Gleiters vom unteren Feldrand


  /* 2. SPIELZUSTAND (STATE) ------------------------------------------------ */

  const state = {
    punkte: 0,
    rekord: 0,
    level: 1,
    richtigeImLevel: 0,      // Zaehler bis ZIEL_PRO_LEVEL
    auftrag: null,           // { phase, form, farbe } – siehe auftragWuerfeln()
    formen: [],              // alle Formen, die gerade fallen
    pausiert: false,

    // Gleiter-Steuerung: zielX = wohin der Finger will, gleiterX = wo das
    // Schiff wirklich ist (gleitet weich hinterher -> fuehlt sich gut an).
    gleiterX: 0,
    zielX: 0,

    // Spielfeld-Masse (werden bei Start + Resize gemessen)
    feldBreite: 0,
    feldHoehe: 0,

    // Zeitmessung fuer Loop + Spawner
    letzteZeit: 0,
    spawnUhr: 0,

    einstellungen: {
      phase: "auto",         // "auto" | "1" | "2" | "3"
      tempo: "normal",       // "ruhig" | "normal" | "flott"
      toene: "an"            // "an" | "aus"
    }
  };


  /* 3. HTML-REFERENZEN ------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  const el = {
    spielfeld:     $("spielfeld"),
    gleiter:       $("gleiter"),
    konsole:       $("konsole"),
    konsoleLabel:  $("konsole-label"),
    auftragText:   $("auftrag-text"),
    fortschritt:   $("fortschritt-balken"),
    punkte:        $("anzeige-punkte"),
    rekord:        $("anzeige-rekord"),
    statPunkte:    $("stat-punkte"),
    statRekord:    $("stat-rekord"),
    fehlerBlitz:   $("fehler-blitz"),
    konfetti:      $("konfetti"),
    popover:       $("popover"),
    pauseOverlay:  $("pause-overlay"),
    buttonPause:   $("button-pause"),
    buttonWeiter:  $("button-weiter"),
    buttonNeustart:$("button-neustart"),
    buttonAbout:   $("button-about"),
    einstellungen: $("einstellungen"),
    buttonMenue:   $("button-einstellungen"),
    menueZu:       $("einstellungen-zu"),
    menueFertig:   $("einstellungen-fertig"),
    buttonReset:   $("button-reset")
  };


  /* 4. HILFSFUNKTIONEN ------------------------------------------------------ */

  // Zufaelliges Element aus einem Array
  function zufallAus(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  // Zufallszahl zwischen min und max
  function zufallZwischen(min, max) {
    return min + Math.random() * (max - min);
  }

  // Wert in Grenzen halten (z. B. Gleiter am Spielfeldrand stoppen)
  function begrenzen(wert, min, max) {
    return Math.max(min, Math.min(max, wert));
  }

  // Tempo-Faktor des aktuellen Levels: Level 1 = 1.0, dann pro Level
  // etwas schneller, aber nie unter den Deckel.
  function levelFaktor() {
    return Math.max(TEMPO_DECKEL, 1 - (state.level - 1) * TEMPO_PRO_LEVEL);
  }

  // Aktive Lern-Phase: fest eingestellt oder automatisch aus dem Level.
  function aktuellePhase() {
    const wahl = state.einstellungen.phase;
    if (wahl !== "auto") return Number(wahl);
    if (state.level <= 3) return 1;      // erst nur Formen
    if (state.level <= 6) return 2;      // dann Form + Farbe
    return 3;                            // dann Umkehrlogik
  }

  // Spielfeld neu vermessen (Start, Resize, Drehen des Geraets)
  function feldVermessen() {
    state.feldBreite = el.spielfeld.clientWidth;
    state.feldHoehe  = el.spielfeld.clientHeight;
    state.gleiterX = begrenzen(state.gleiterX, GLEITER_BREITE / 2,
                               state.feldBreite - GLEITER_BREITE / 2);
    state.zielX = begrenzen(state.zielX, GLEITER_BREITE / 2,
                            state.feldBreite - GLEITER_BREITE / 2);
  }


  /* 5. AUFTRAG (MISSION) WUERFELN + ANZEIGEN -------------------------------- */

  // Wuerfelt einen neuen Auftrag passend zur aktiven Lern-Phase.
  // Damit es nie langweilig wird, unterscheidet sich der neue Auftrag
  // immer vom vorherigen (andere Form oder andere Farbe).
  function auftragWuerfeln() {
    const phase = aktuellePhase();
    const alter = state.auftrag;
    let neuer = null;

    do {
      neuer = {
        phase: phase,
        form: zufallAus(FORM_NAMEN),
        // Farbe spielt nur in Phase 2 eine Rolle
        farbe: phase === 2 ? zufallAus(FARB_NAMEN) : null
      };
    } while (alter && neuer.form === alter.form && neuer.farbe === alter.farbe);

    state.auftrag = neuer;
    auftragAnzeigen();
  }

  // Schreibt den Auftrag gross in die Bordcomputer-Konsole.
  // Wichtige Woerter bekommen eigene <b>-Spans mit Farbe (style.css).
  // Sicherheit: alle Texte stammen aus den festen Tabellen oben, nie von
  // Nutzereingaben – innerHTML ist hier deshalb unbedenklich.
  function auftragAnzeigen() {
    const a = state.auftrag;
    const formWort = FORMEN[a.form].mehrzahl.toUpperCase();
    let html = "";

    if (a.phase === 1) {
      html = 'Sammle alle <b class="wort-form">' + formWort + "</b>!";
    } else if (a.phase === 2) {
      const farbWort = FARBEN[a.farbe].adjektiv.toUpperCase();
      html = 'Fange <b class="farbe-' + a.farbe + '">' + farbWort +
             '</b> <b class="wort-form">' + formWort + "</b>!";
    } else {
      html = 'Sammle alles, <b class="wort-nicht">ABER KEINE</b> ' +
             '<b class="wort-form">' + formWort + "</b>!";
    }

    el.auftragText.innerHTML = html;
    el.konsoleLabel.textContent = "🛰️ BORDCOMPUTER · LEVEL " + state.level;

    // Konsole huepft kurz, damit der Blick zum neuen Auftrag wandert
    el.konsole.classList.remove("neu");
    void el.konsole.offsetWidth;               // Trick: Animation neu starten
    el.konsole.classList.add("neu");
  }

  // Prueft, ob eine gefangene Form zum Auftrag passt.
  function passtZumAuftrag(form) {
    const a = state.auftrag;
    if (a.phase === 1) return form.form === a.form;
    if (a.phase === 2) return form.form === a.form && form.farbe === a.farbe;
    /* Phase 3 (Umkehrung): ALLES ist richtig – ausser der verbotenen Form */
    return form.form !== a.form;
  }


  /* 6. FORMEN ERZEUGEN (SPAWNEN) --------------------------------------------- */

  // Erzeugt eine neue fallende Form am oberen Spielfeldrand.
  // Mit TREFFER_QUOTE Wahrscheinlichkeit passt sie zum Auftrag, sonst ist
  // sie ein "Ablenker" – so gibt es immer genug zu fangen UND zu denken.
  function formErzeugen() {
    const a = state.auftrag;
    const sollTreffer = Math.random() < TREFFER_QUOTE;
    let form, farbe;

    if (a.phase === 3) {
      // Umkehr-Phase: "Treffer" = jede erlaubte Form, "Ablenker" = die
      // verbotene Form (die darf NICHT gefangen werden).
      const erlaubte = FORM_NAMEN.filter((f) => f !== a.form);
      form = sollTreffer ? zufallAus(erlaubte) : a.form;
      farbe = zufallAus(FARB_NAMEN);
    } else if (sollTreffer) {
      form = a.form;
      farbe = a.farbe || zufallAus(FARB_NAMEN);
    } else {
      // Ablenker wuerfeln, bis er NICHT zum Auftrag passt
      do {
        form = zufallAus(FORM_NAMEN);
        farbe = zufallAus(FARB_NAMEN);
      } while (passtZumAuftrag({ form: form, farbe: farbe }));
    }

    // Das DOM-Element bauen: aeusseres Div (Position + Glow) mit innerem
    // Div (Silhouette per clip-path) – siehe Erklaerung in style.css.
    const groesse = Math.round(zufallZwischen(FORM_MIN, FORM_MAX));
    const div = document.createElement("div");
    div.className = "form form-" + form + " farbe-" + farbe;
    div.style.width = groesse + "px";
    div.style.height = groesse + "px";
    div.innerHTML = '<div class="form-innen"></div>';
    el.spielfeld.appendChild(div);

    // Fallgeschwindigkeit in Pixel/Sekunde: Feldhoehe / Falldauer,
    // skaliert mit Tempo-Einstellung und Level. Leichte Zufalls-Streuung
    // (±10 %), damit die Formen nicht im Gleichschritt fallen.
    const tempo = TEMPO_CONFIG[state.einstellungen.tempo];
    const geschwindigkeit =
      (state.feldHoehe / (tempo.fallDauer * levelFaktor())) *
      zufallZwischen(0.9, 1.1);

    state.formen.push({
      el: div,
      form: form,
      farbe: farbe,
      groesse: groesse,
      x: zufallZwischen(groesse / 2, state.feldBreite - groesse / 2), // Mitte
      y: -groesse,                                    // startet oberhalb
      tempo: geschwindigkeit,
      erledigt: false      // true, sobald gefangen/entfernt (gegen Doppel-Treffer)
    });
  }

  // Sekunden zwischen zwei Spawns (wird mit dem Level kuerzer).
  function spawnAbstand() {
    return TEMPO_CONFIG[state.einstellungen.tempo].spawnAbstand * levelFaktor();
  }


  /* 7. DIE GAME-LOOP (requestAnimationFrame) ---------------------------------
     Das Spiel laeuft in einer Endlos-Schleife, die der Browser selbst taktet:
     requestAnimationFrame ruft unsere Funktion VOR JEDEM BILDAUFBAU auf
     (meist 60x pro Sekunde, auf schnellen Displays auch 120x).

     Damit das Spiel auf JEDEM Geraet gleich schnell ist, rechnen wir nicht
     "pro Frame", sondern mit der echten vergangenen Zeit (Delta-Zeit "dt"):
       neuer Ort = alter Ort + Geschwindigkeit(px/s) * dt(s)
     Ein 120-Hz-Handy macht dann doppelt so viele, halb so grosse Schritte
     wie ein 60-Hz-Handy – die Formen fallen ueberall gleich schnell.       */

  function gameLoop(zeitstempel) {
    // Immer sofort den NAECHSTEN Frame bestellen – so laeuft die Schleife
    // endlos weiter, ohne den Browser zu blockieren (kein while(true)!).
    requestAnimationFrame(gameLoop);

    // Delta-Zeit in Sekunden. Deckel bei 50 ms: war der Tab im Hintergrund,
    // waere dt riesig und alle Formen wuerden "durch den Gleiter springen"
    // (Tunnel-Effekt). So macht das Spiel stattdessen einen Mini-Schritt.
    const dt = Math.min((zeitstempel - state.letzteZeit) / 1000, 0.05);
    state.letzteZeit = zeitstempel;

    // Pausiert (Pause-Knopf, Menue offen, Tab unsichtbar)? Dann nur die
    // Zeitmessung weiterfuehren, aber nichts bewegen.
    if (state.pausiert) return;

    /* --- a) Nachschub: alle spawnAbstand() Sekunden eine neue Form --- */
    state.spawnUhr += dt;
    if (state.spawnUhr >= spawnAbstand()) {
      state.spawnUhr = 0;
      formErzeugen();
    }

    /* --- b) Gleiter weich zum Finger-Ziel gleiten lassen ---
       Statt hart zu springen, naehert sich der Gleiter dem Ziel jeden Frame
       um einen Anteil der Reststrecke (exponentielles Glaetten). Das macht
       die Steuerung geschmeidig, ohne traege zu wirken.                    */
    state.gleiterX += (state.zielX - state.gleiterX) * Math.min(1, dt * 16);
    el.gleiter.style.transform =
      "translateX(" + (state.gleiterX - GLEITER_BREITE / 2) + "px)";

    /* --- c) Formen bewegen, Kollision pruefen, Aufraeumen --- */
    for (let i = state.formen.length - 1; i >= 0; i--) {
      const f = state.formen[i];
      if (f.erledigt) continue;

      f.y += f.tempo * dt;   // fallen: Geschwindigkeit * vergangene Zeit

      // Position per transform setzen (GPU-beschleunigt, kein Reflow).
      // x/y beschreiben die MITTE der Form, transform braucht die Ecke.
      f.el.style.transform =
        "translate(" + (f.x - f.groesse / 2) + "px," +
                       (f.y - f.groesse / 2) + "px)";

      if (beruehrtGleiter(f)) {
        formGefangen(f);
      } else if (f.y - f.groesse / 2 > state.feldHoehe) {
        // Unten rausgefallen: einfach entfernen. Verpasste richtige Formen
        // kosten BEWUSST nichts – kein Frust, der Nachschub kommt ja schon.
        f.erledigt = true;
        f.el.remove();
        state.formen.splice(i, 1);
      }
    }
  }


  /* 8. KOLLISIONSABFRAGE (COLLISION DETECTION) --------------------------------
     Klassischer Rechteck-Test (AABB = "axis-aligned bounding box"):
     Zwei Rechtecke ueberlappen sich genau dann, wenn sie sich SOWOHL in
     der Breite ALS AUCH in der Hoehe ueberschneiden. Wir pruefen deshalb
     die vier "kann NICHT ueberlappen"-Faelle (zu weit links/rechts/oben/
     unten) und drehen das Ergebnis um.

     Kinderfreundlich gemogelt wird trotzdem:
       - Die Fang-Box der Form ist etwas KLEINER als ihr Bild (Faktor 0.75).
         So zaehlt ein knappes Vorbeischrammen nicht als (Fehl-)Fang –
         das fuehlt sich fairer an, besonders bei falschen Formen.          */

  function beruehrtGleiter(f) {
    // Fang-Box der Form (leicht verkleinert, s. o.)
    const halb = (f.groesse * 0.75) / 2;
    const formLinks  = f.x - halb;
    const formRechts = f.x + halb;
    const formOben   = f.y - halb;
    const formUnten  = f.y + halb;

    // Fang-Box des Gleiters (liegt fest am unteren Feldrand)
    const schiffLinks  = state.gleiterX - GLEITER_BREITE / 2;
    const schiffRechts = state.gleiterX + GLEITER_BREITE / 2;
    const schiffUnten  = state.feldHoehe - GLEITER_BODEN;
    const schiffOben   = schiffUnten - GLEITER_HOEHE;

    // AABB-Test: keine Ueberlappung, wenn eine Box komplett neben/ueber/
    // unter der anderen liegt – sonst Treffer!
    return !(
      formRechts < schiffLinks ||   // Form ganz links vom Schiff
      formLinks  > schiffRechts ||  // Form ganz rechts vom Schiff
      formUnten  < schiffOben ||    // Form noch ueber dem Schiff
      formOben   > schiffUnten      // Form schon unter dem Schiff
    );
  }


  /* 9. FEEDBACK: RICHTIG / FALSCH / LEVEL-UP ---------------------------------- */

  // Eine Form wurde vom Gleiter beruehrt.
  function formGefangen(f) {
    f.erledigt = true;
    state.formen.splice(state.formen.indexOf(f), 1);

    if (passtZumAuftrag(f)) {
      /* RICHTIG: Form poppt leuchtend auf, +10 Punkte, Fortschritt hoch */
      f.el.classList.add("gefangen");
      punkteAendern(+PUNKTE_RICHTIG, f.x, f.y);
      tonRichtig();

      state.richtigeImLevel += 1;
      if (state.richtigeImLevel >= ZIEL_PRO_LEVEL) {
        levelAufstieg();
      }
    } else {
      /* FALSCH: sanftes Feedback – Schiff wackelt, Rand blinkt rot,
         −5 Punkte (nie unter 0). Der Spielfluss laeuft einfach weiter. */
      f.el.classList.add("daneben");
      punkteAendern(-PUNKTE_FALSCH, f.x, f.y);
      tonFalsch();

      el.gleiter.classList.remove("wackelt");
      void el.gleiter.offsetWidth;             // Animation neu starten
      el.gleiter.classList.add("wackelt");

      el.fehlerBlitz.classList.remove("an");
      void el.fehlerBlitz.offsetWidth;
      el.fehlerBlitz.classList.add("an");
    }

    // Das Form-Div erst NACH seiner Abschieds-Animation wegraeumen
    const divWeg = f.el;
    setTimeout(() => divWeg.remove(), 400);

    fortschrittAnzeigen();
  }

  // Punkte gutschreiben/abziehen + schwebende "+10"/"−5"-Zahl anzeigen.
  function punkteAendern(delta, x, y) {
    state.punkte = Math.max(0, state.punkte + delta);

    // Rekord live mitfuehren
    if (state.punkte > state.rekord) {
      state.rekord = state.punkte;
      el.rekord.textContent = state.rekord;
    }
    el.punkte.textContent = state.punkte;
    speichern();

    // Chip kurz pulsieren lassen
    el.statPunkte.classList.remove("puls");
    void el.statPunkte.offsetWidth;
    el.statPunkte.classList.add("puls");

    // Schwebende Punktzahl an der Fangstelle
    const flug = document.createElement("div");
    flug.className = "punkte-flug " + (delta > 0 ? "plus" : "minus");
    flug.textContent = (delta > 0 ? "+" : "−") + Math.abs(delta);
    flug.style.left = begrenzen(x - 20, 4, state.feldBreite - 44) + "px";
    flug.style.top = (y - 30) + "px";
    el.spielfeld.appendChild(flug);
    setTimeout(() => flug.remove(), 850);
  }

  // Fortschrittsbalken in der Konsole (0–10 richtige Formen)
  function fortschrittAnzeigen() {
    const anteil = (state.richtigeImLevel / ZIEL_PRO_LEVEL) * 100;
    el.fortschritt.style.width = anteil + "%";
  }

  // Level geschafft: Feier + neuer Auftrag + minimal hoeheres Tempo.
  function levelAufstieg() {
    state.level += 1;
    state.richtigeImLevel = 0;
    auftragWuerfeln();       // zeigt auch Label/Level neu an
    konfettiRegnen();
    tonLevelUp();
    speichern();

    // Sternen-Scrolling passend zum Level leicht beschleunigen (CSS-Variable)
    const dauer = Math.max(4, 10 * levelFaktor());
    document.documentElement.style.setProperty("--sterne-dauer", dauer + "s");
  }

  // Kleine Konfetti-Feier in den vier Formen-Farben.
  function konfettiRegnen() {
    const farben = ["#ff5a4e", "#3d8bff", "#34d074", "#ffd23f", "#f3c44a"];
    for (let i = 0; i < 26; i++) {
      const k = document.createElement("div");
      k.className = "konfetti";
      k.style.left = Math.random() * 100 + "vw";
      k.style.background = zufallAus(farben);
      k.style.animationDelay = Math.random() * 0.4 + "s";
      el.konfetti.appendChild(k);
      setTimeout(() => k.remove(), 2200);
    }
  }


  /* 10. TOUCH-STEUERUNG (WISCH-DRAG) -------------------------------------------
     Gesteuert wird mit POINTER-EVENTS: die fassen Touch, Maus und Stift in
     einer API zusammen – ein Handler fuer alles.

     Es ist eine RELATIVE Drag-Steuerung:
       - Beim Aufsetzen des Fingers merken wir uns nur dessen X-Position.
       - Bei jeder Bewegung schieben wir das ZIEL des Gleiters um genauso
         viele Pixel weiter, wie der Finger seit dem letzten Event wanderte.
       - Der Gleiter springt also NICHT unter den Finger! Das Kind kann
         bequem im unteren Bildschirmbereich wischen und verdeckt das
         Schiff dabei nie mit der eigenen Hand.
     Der Faktor 1.15 uebersetzt Fingerweg leicht verstaerkt in Schiffsweg,
     dann erreicht man beide Raender, ohne umgreifen zu muessen.

     Wichtig fuer fluessiges Wischen (sonst scrollt/zoomt der Browser):
       - CSS  : .spielfeld { touch-action: none; }
       - HTML : <meta viewport ... user-scalable=no>                        */

  let fingerAktiv = false;
  let fingerLetztesX = 0;

  function steuerungEinrichten() {
    el.spielfeld.addEventListener("pointerdown", (e) => {
      fingerAktiv = true;
      fingerLetztesX = e.clientX;
      // Auch wenn der Finger kurz das Feld verlaesst: Events weiter an uns
      el.spielfeld.setPointerCapture(e.pointerId);
      audioAufwecken();      // Browser erlauben Ton erst nach einer Geste
    });

    el.spielfeld.addEventListener("pointermove", (e) => {
      if (!fingerAktiv) return;
      const delta = e.clientX - fingerLetztesX;   // Fingerweg seit letztem Event
      fingerLetztesX = e.clientX;
      state.zielX = begrenzen(
        state.zielX + delta * 1.15,
        GLEITER_BREITE / 2,
        state.feldBreite - GLEITER_BREITE / 2
      );
    });

    const loslassen = () => { fingerAktiv = false; };
    el.spielfeld.addEventListener("pointerup", loslassen);
    el.spielfeld.addEventListener("pointercancel", loslassen);

    // Bonus fuer Desktop-Tests: Pfeiltasten steuern ebenfalls.
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const schritt = e.key === "ArrowLeft" ? -36 : 36;
        state.zielX = begrenzen(state.zielX + schritt,
          GLEITER_BREITE / 2, state.feldBreite - GLEITER_BREITE / 2);
      } else if (e.key === " " || e.key === "p") {
        pauseUmschalten();
      }
    });
  }


  /* 11. SOUNDEFFEKTE (Web Audio API, programmatisch – keine Audiodateien) ----- */

  let audioCtx = null;

  // Browser starten Audio erst nach einer Nutzer-Geste – deshalb wird der
  // AudioContext beim ersten Antippen des Spielfelds angelegt/aufgeweckt.
  function audioAufwecken() {
    if (state.einstellungen.toene !== "an") return;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  // Einen kurzen Ton spielen (Frequenz in Hz, Start-Verzoegerung/Dauer in s)
  function ton(frequenz, wann, dauer, typ, lautstaerke) {
    if (!audioCtx || state.einstellungen.toene !== "an") return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + wann;
    osc.type = typ;
    osc.frequency.setValueAtTime(frequenz, t);
    gain.gain.setValueAtTime(lautstaerke, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dauer); // ausklingen
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dauer);
  }

  function tonRichtig() {  // froehliches Doppel-Pling aufwaerts
    ton(660, 0,    0.12, "triangle", 0.25);
    ton(880, 0.09, 0.16, "triangle", 0.22);
  }
  function tonFalsch() {   // kurzer, weicher Brummer (nicht erschreckend)
    ton(200, 0, 0.16, "square", 0.10);
    ton(150, 0.10, 0.18, "square", 0.08);
  }
  function tonLevelUp() {  // kleine Fanfare
    ton(523, 0,    0.14, "triangle", 0.25);
    ton(659, 0.12, 0.14, "triangle", 0.25);
    ton(784, 0.24, 0.14, "triangle", 0.25);
    ton(1047, 0.36, 0.30, "triangle", 0.28);
  }


  /* 12. SPEICHERN (localStorage) ------------------------------------------------
     Gespeichert werden Rekord und Einstellungen (Punkte/Level starten bei
     jedem Besuch frisch – kurze Runden passen besser zu kurzen Pausen). */

  function speichern() {
    try {
      localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({
        rekord: state.rekord,
        einstellungen: state.einstellungen
      }));
    } catch (e) { /* privater Modus o. ae. – Spiel laeuft ohne Speichern weiter */ }
  }

  function laden() {
    try {
      const roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
      if (!roh) return;
      const daten = JSON.parse(roh);
      if (typeof daten.rekord === "number") state.rekord = daten.rekord;
      if (daten.einstellungen) {
        Object.assign(state.einstellungen, daten.einstellungen);
      }
    } catch (e) { /* kaputte/fremde Daten ignorieren */ }
  }


  /* 13. PAUSE, NEUSTART, EINSTELLUNGEN, POPOVER ---------------------------------- */

  function pauseSetzen(an) {
    state.pausiert = an;
    el.pauseOverlay.hidden = !an;
    el.buttonPause.textContent = an ? "▶️ Weiter" : "⏸️ Pause";
  }
  function pauseUmschalten() { pauseSetzen(!state.pausiert); }

  // Neustart: Punkte/Level auf Anfang, Spielfeld leeren, neuer Auftrag.
  function neustart() {
    state.punkte = 0;
    state.level = 1;
    state.richtigeImLevel = 0;
    state.spawnUhr = 0;
    state.formen.forEach((f) => f.el.remove());
    state.formen = [];
    el.punkte.textContent = "0";
    document.documentElement.style.setProperty("--sterne-dauer", "10s");
    fortschrittAnzeigen();
    auftragWuerfeln();
    pauseSetzen(false);
  }

  // --- Einstellungs-Menue (Zahnrad ⚙️) ---
  let warVorMenuePausiert = false;

  function menueOeffnen() {
    warVorMenuePausiert = state.pausiert;
    pauseSetzen(true);                    // im Menue pausiert das Spiel
    el.pauseOverlay.hidden = true;        // aber ohne Pause-Schild darunter
    el.einstellungen.classList.add("offen");
    el.einstellungen.setAttribute("aria-hidden", "false");
    menueKartenMarkieren();
  }

  function menueSchliessen() {
    el.einstellungen.classList.remove("offen");
    el.einstellungen.setAttribute("aria-hidden", "true");
    pauseSetzen(warVorMenuePausiert);
  }

  // Die gewaehlten Options-Karten optisch markieren (Klasse .aktiv)
  function menueKartenMarkieren() {
    document.querySelectorAll(".opt-karte").forEach((karte) => {
      const passt =
        state.einstellungen[karte.dataset.setting] === karte.dataset.wert;
      karte.classList.toggle("aktiv", passt);
    });
  }

  function menueEinrichten() {
    el.buttonMenue.addEventListener("click", menueOeffnen);
    el.menueZu.addEventListener("click", menueSchliessen);
    el.menueFertig.addEventListener("click", menueSchliessen);
    el.einstellungen.addEventListener("click", (e) => {
      if (e.target === el.einstellungen) menueSchliessen(); // Klick daneben
    });

    // Options-Karten: Einstellung uebernehmen + speichern
    document.querySelectorAll(".opt-karte").forEach((karte) => {
      karte.addEventListener("click", () => {
        const setting = karte.dataset.setting;
        state.einstellungen[setting] = karte.dataset.wert;
        menueKartenMarkieren();
        speichern();
        // Ein Phasen-Wechsel soll sofort sichtbar werden -> neuer Auftrag
        if (setting === "phase") auftragWuerfeln();
      });
    });

    el.buttonReset.addEventListener("click", () => {
      state.rekord = 0;
      el.rekord.textContent = "0";
      speichern();
      popoverZeigen(el.buttonReset, "Der Rekord wurde zurückgesetzt. 🧹");
    });
  }

  // --- Kleines Popover (Ueber das Spiel / Chip-Erklaerungen) ---
  let popoverTimer = null;

  function popoverZeigen(anker, html) {
    el.popover.innerHTML = html;
    el.popover.hidden = false;
    const rect = anker.getBoundingClientRect();
    const breite = el.popover.offsetWidth;
    el.popover.style.top = rect.bottom + 10 + "px";
    el.popover.style.left =
      begrenzen(rect.left, 8, window.innerWidth - breite - 8) + "px";
    clearTimeout(popoverTimer);
    popoverTimer = setTimeout(() => { el.popover.hidden = true; }, 4000);
  }

  function popoverEinrichten() {
    el.buttonAbout.addEventListener("click", () => {
      popoverZeigen(el.buttonAbout,
        '<span class="about-titel">🚀 Geo-Gleiter</span>' +
        '<span class="about-unter">Die Formen-Jagd</span>' +
        'Fange die Formen aus dem Auftrag des Bordcomputers!' +
        '<span class="about-studio">✨ Ein Spiel von JonFie Studios</span>');
    });
    el.statPunkte.addEventListener("click", () => {
      popoverZeigen(el.statPunkte,
        "⭐ Deine Punkte: richtige Form +10, falsche Form −5.");
    });
    el.statRekord.addEventListener("click", () => {
      popoverZeigen(el.statRekord,
        "🏆 Dein bester Punktestand aller Zeiten.");
    });
    // Tipp irgendwo anders schliesst das Popover sofort
    document.addEventListener("pointerdown", (e) => {
      if (!el.popover.hidden && !el.popover.contains(e.target)) {
        el.popover.hidden = true;
      }
    }, true);
  }


  /* 14. START ---------------------------------------------------------------- */

  function start() {
    laden();
    el.rekord.textContent = state.rekord;

    feldVermessen();
    state.gleiterX = state.feldBreite / 2;   // Schiff startet in der Mitte
    state.zielX = state.gleiterX;

    auftragWuerfeln();
    fortschrittAnzeigen();
    steuerungEinrichten();
    menueEinrichten();
    popoverEinrichten();

    el.buttonPause.addEventListener("click", pauseUmschalten);
    el.buttonWeiter.addEventListener("click", () => pauseSetzen(false));
    el.buttonNeustart.addEventListener("click", neustart);

    // Bildschirm gedreht oder Fenster veraendert? Feld neu vermessen.
    window.addEventListener("resize", feldVermessen);

    // Tab in den Hintergrund? Automatisch pausieren (fair + spart Akku).
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseSetzen(true);
    });

    // Die Game-Loop anwerfen: ab jetzt uebernimmt requestAnimationFrame.
    requestAnimationFrame((t) => {
      state.letzteZeit = t;
      requestAnimationFrame(gameLoop);
    });
  }

  start();

})();
