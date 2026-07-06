/* ===========================================================================
   Geo-Gleiter: Die Formen-Jagd  –  Spiellogik (game.js)
   ---------------------------------------------------------------------------
   Reines Vanilla JavaScript (ES6+), keine externen Bibliotheken.
   Ein Spiel von JonFie Studios – Schwester-Spiel des "Uhrzeit-Uhu".

   SPIELPRINZIP
     Von oben fallen bunte Formen. Der Bordcomputer gibt einen Auftrag
     ("Sammle alle DREIECKE!") – sichtbar oben als Text + Symbol UND auf
     Wunsch vorgelesen (Sprachausgabe fuer Kinder, die noch nicht lesen).
     Das Kind wischt auf der Wischflaeche unter dem Schiff (oder direkt
     auf dem Spielfeld), um den Geo-Gleiter zu steuern. Richtig = +10
     Punkte. Alle 10 richtigen Formen: kurze ATEMPAUSE (es fallen keine
     neuen Formen), dann neuer Auftrag.

   ENERGIE-MECHANIK (die Spannung im Spiel):
     Das Schiff startet mit voller Energie (Balken unter der Konsole).
     Jede FALSCH gefangene Form kostet Energie (je nach Schwierigkeit
     unterschiedlich viel). Ist der Balken leer -> MISSIONS-ENDE mit
     Ergebnis und "Neue Mission"-Button; Punkte/Level starten wieder bei 0,
     nur der Rekord bleibt. Gegensteuern kann man mit den Extras:
       ⚡ Energiekapsel : laedt den Balken wieder auf (+ Bonuspunkte)
       🛡️ Schutzschild  : schimmernde Blase um das Schiff, faengt die
                          naechsten 2 Fehlgriffe ab (ohne Energieverlust)

   FORMEN
     2D  : Kreis, Quadrat, Dreieck, Raute, Sechseck, Stern – als Inline-SVG
           mit exakter Geometrie (regelmaessiges Sechseck!) + weisser Kontur.
     3D  : Wuerfel und Pyramide – echte CSS-3D-Koerper, die sich um zwei
           Achsen drehen, damit man den Koerper wirklich erkennt.
           (Sie tauchen je nach Schwierigkeit ab bestimmten Leveln auf.)

   LERN-PHASEN (Einstellung "Automatisch" folgt dem Level):
     Phase 1: nur die FORM zaehlt            (Level 1–3)
     Phase 2: FORM und FARBE muessen stimmen (Level 4–6)
     Phase 3: Umkehrlogik "ABER KEINE …"     (ab Level 7)

   SCHWIERIGKEIT (Menue ⚙️): Leicht / Mittel / Schwer skaliert Tempo,
     Formen-Dichte, Groessen-Streuung und den Formen-Vorrat. Innerhalb
     einer Runde steigt die Dichte/Geschwindigkeit zusaetzlich pro Level –
     Level 1 startet bewusst SEHR luftig (wenige Formen).

   INHALT
     1. Konstanten & Konfiguration
     2. Spielzustand (State) inkl. Einstellungen
     3. HTML-Referenzen
     4. Hilfsfunktionen
     5. Formen-Baukasten (SVG + CSS-3D-Markup)
     6. Auftrag (Mission) wuerfeln + anzeigen + VORLESEN
     7. Formen & Extras erzeugen (Spawnen)
     8. DIE GAME-LOOP (requestAnimationFrame)   <-- Kern des Spiels
     9. Sternenfeld (Canvas, echte Tiefe)
    10. KOLLISIONSABFRAGE (Rechteck-Test)
    11. Feedback: richtig / falsch / Bonus / Level-Up
    12. TOUCH-STEUERUNG (Wisch-Drag, Spielfeld + Wischflaeche)
    13. Soundeffekte (Web Audio) + Sprachausgabe (Speech Synthesis)
    14. Speichern (localStorage)
    15. Pause, Neustart, Einstellungen, Popover
    16. Start
   ===========================================================================*/

(function () {
  "use strict";


  /* 1. KONSTANTEN & KONFIGURATION ----------------------------------------- */

  const SPEICHER_SCHLUESSEL = "geo-gleiter-state";

  // Alle Formen mit deutschen Namen (Mehrzahl fuer Auftrags-Texte).
  // dreiD:true = wird als rotierender CSS-3D-Koerper dargestellt.
  const FORMEN = {
    kreis:    { mehrzahl: "Kreise" },
    quadrat:  { mehrzahl: "Quadrate" },
    dreieck:  { mehrzahl: "Dreiecke" },
    raute:    { mehrzahl: "Rauten" },
    sechseck: { mehrzahl: "Sechsecke" },
    stern:    { mehrzahl: "Sterne" },
    wuerfel:  { mehrzahl: "Würfel",    dreiD: true },
    pyramide: { mehrzahl: "Pyramiden", dreiD: true }
  };

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
  const PUNKTE_BONUS   = 25;   // eingesammeltes Extra (⚡/🛡️)
  const ZIEL_PRO_LEVEL = 10;   // alle 10 richtigen Formen -> neues Level

  // Energie-Mechanik
  const ENERGIE_MAX          = 100;
  const ENERGIE_KAPSEL_PLUS  = 35;   // so viel laedt eine ⚡-Kapsel auf
  const ENERGIE_LEVEL_BONUS  = 15;   // kleines Aufladen als Level-Belohnung
  const SCHILD_LADUNGEN      = 2;    // so viele Fehlgriffe faengt 🛡️ ab

  // Bonus-Extras (Details siehe bonusErzeugen):
  //   ⚡ faellt regelmaessig (oefter, wenn die Energie knapp ist),
  //   🛡️ ist seltener und kommt nur, wenn gerade kein Schild aktiv ist.
  const BONUS_EMOJI = { energie: "⚡", schild: "🛡️" };

  // DIE DREI SCHWIERIGKEITSSTUFEN (Menue ⚙️):
  //   fallDauer     = Sekunden vom oberen bis zum unteren Rand (Level 1)
  //   spawnAbstand  = Sekunden zwischen zwei neuen Formen (Level 1)
  //   formMin/Max   = Groessen-Streuung der Formen in Pixel
  //   trefferQuote  = Anteil der Formen, die zum Auftrag passen
  //   rampe         = wie viel schneller/dichter es PRO LEVEL wird
  //   energieVerlust= wie viel Energie ein Fehlgriff kostet
  const STUFEN = {
    leicht: { fallDauer: 7.0, spawnAbstand: 2.4,  formMin: 52, formMax: 88, trefferQuote: 0.55, rampe: 0.04, energieVerlust: 18 },
    mittel: { fallDauer: 5.2, spawnAbstand: 1.7,  formMin: 42, formMax: 80, trefferQuote: 0.45, rampe: 0.05, energieVerlust: 25 },
    schwer: { fallDauer: 4.0, spawnAbstand: 1.25, formMin: 36, formMax: 74, trefferQuote: 0.40, rampe: 0.06, energieVerlust: 34 }
  };
  const TEMPO_DECKEL = 0.5;    // nie schneller als 50 % der Grund-Falldauer

  // Atempause beim Auftragswechsel: so lange kommen KEINE neuen Formen
  // (die alten fallen noch zu Ende – der Bildschirm leert sich kurz).
  const ATEMPAUSE_SEK = 3.2;
  const AUFTRAG_VERZOEGERUNG_MS = 1800;  // dann erscheint der neue Auftrag

  // Groesse des Gleiters (Pixel)
  const GLEITER_BREITE = 64;   // muss zu .gleiter in style.css passen
  const GLEITER_HOEHE  = 72;   // das SVG-Schiff ist hoeher als das alte Emoji
  const GLEITER_BODEN  = 14;   // Abstand des Gleiters vom unteren Feldrand

  // Fang-Box des Gleiters fuer die Kollision: DEUTLICH kleiner als die
  // Box oben. Das SVG zeigt eine spitz zulaufende Rakete mit schmalen
  // Fluegeln - drumherum ist viel durchsichtiger Rand. Ohne Verkleinerung
  // wuerde eine Form schon als "getroffen" zaehlen, obwohl optisch noch
  // Abstand zum Rumpf besteht. Werte von Hand am SVG abgemessen
  // (viewBox 0 0 64 80, siehe index.html):
  //   Breite : Fluegelspannweite reicht nur von x=14.5 bis x=49.5 (~35/64)
  //   Hoehe  : Rumpf reicht von der Nase (y=2) bis zur Duese (y=62) -
  //            die duenne Flammen-Spitze darunter zaehlt NICHT mit.
  const GLEITER_HITBOX_BREITE = 34;
  const GLEITER_HITBOX_HOEHE  = 54;


  /* 2. SPIELZUSTAND (STATE) ------------------------------------------------ */

  const state = {
    punkte: 0,
    rekord: 0,
    serie: 0,                // richtige Faenge IN FOLGE, s. formGefangen()
    level: 1,
    richtigeImLevel: 0,      // Zaehler bis ZIEL_PRO_LEVEL
    auftrag: null,           // { phase, form, farbe } – siehe auftragWuerfeln()
    formen: [],              // alle Formen/Extras, die gerade fallen
    pausiert: false,
    vorbei: false,           // true = Energie leer, Missions-Ende-Overlay offen

    energie: ENERGIE_MAX,    // 0..100 – leer bedeutet Missions-Ende
    schild: 0,               // uebrige Schutzschild-Ladungen (0 = kein Schild)

    // Gleiter-Steuerung: zielX = wohin der Finger will, gleiterX = wo das
    // Schiff wirklich ist (gleitet weich hinterher -> fuehlt sich gut an).
    gleiterX: 0,
    zielX: 0,

    // Spielfeld-Masse (werden bei Start + Resize gemessen)
    feldBreite: 0,
    feldHoehe: 0,

    // Zeitmessung fuer Loop + Spawner. spawnUhr wird beim Level-Up NEGATIV
    // gesetzt -> Atempause (sie muss erst wieder auf 0 hochzaehlen).
    letzteZeit: 0,
    spawnUhr: 0,
    energieUhr: 0,
    naechsteEnergie: 14,     // Sekunden bis zur naechsten ⚡-Kapsel (gewuerfelt)
    schildUhr: 0,
    naechsterSchild: 35,     // Sekunden bis zum naechsten 🛡️-Extra (gewuerfelt)
    runde: 0,                // zaehlt Neustarts (entwertet alte Level-Up-Timer)

    einstellungen: {
      phase: "auto",         // "auto" | "1" | "2" | "3"
      stufe: "mittel",       // "leicht" | "mittel" | "schwer"
      toene: "an",           // "an" | "aus"
      sprache: "an"          // "an" | "aus"  (Aufgaben vorlesen)
    }
  };


  /* 3. HTML-REFERENZEN ------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  const el = {
    spielfeld:     $("spielfeld"),
    wischZone:     $("wisch-zone"),
    gleiter:       $("gleiter"),
    weltraum:      $("weltraum"),
    konsole:       $("konsole"),
    konsoleLabel:  $("konsole-label"),
    auftragText:   $("auftrag-text"),
    auftragSymbol: $("auftrag-symbol"),
    fortschritt:   $("fortschritt-balken"),
    energie:       $("energie"),
    energieBalken: $("energie-balken"),
    endeOverlay:   $("ende-overlay"),
    endeText:      $("ende-text"),
    buttonNochmal: $("button-nochmal"),
    punkte:        $("anzeige-punkte"),
    rekord:        $("anzeige-rekord"),
    serie:         $("anzeige-serie"),
    statPunkte:    $("stat-punkte"),
    statSerie:     $("stat-serie"),
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

  // Aktive Schwierigkeitsstufe (Konfigurations-Objekt aus STUFEN)
  function stufe() {
    return STUFEN[state.einstellungen.stufe] || STUFEN.mittel;
  }

  // Tempo-Faktor des aktuellen Levels: Level 1 = 1.0, dann pro Level
  // etwas schneller (rampe haengt an der Schwierigkeitsstufe), gedeckelt.
  function levelFaktor() {
    return Math.max(TEMPO_DECKEL, 1 - (state.level - 1) * stufe().rampe);
  }

  // Aktuelle Falldauer in Sekunden (Stufe x Level) – auch das Sternenfeld
  // richtet sich danach, damit Flug und Formen zusammenpassen.
  function aktuelleFallDauer() {
    return stufe().fallDauer * levelFaktor();
  }

  // Aktive Lern-Phase: fest eingestellt oder automatisch aus dem Level.
  function aktuellePhase() {
    const wahl = state.einstellungen.phase;
    if (wahl !== "auto") return Number(wahl);
    if (state.level <= 3) return 1;      // erst nur Formen
    if (state.level <= 6) return 2;      // dann Form + Farbe
    return 3;                            // dann Umkehrlogik
  }

  // FORMEN-VORRAT: welche Formen aktuell im Spiel sind, haengt an
  // Schwierigkeitsstufe UND Level. So faengt jede Runde uebersichtlich an
  // und wird nach und nach bunter (inkrementelle Schwierigkeit).
  function aktiverFormenPool() {
    const s = state.einstellungen.stufe;
    const l = state.level;
    if (s === "leicht") {
      const p = ["kreis", "quadrat", "dreieck"];
      if (l >= 3) p.push("raute");
      if (l >= 5) p.push("sechseck");
      if (l >= 7) p.push("stern");
      return p;
    }
    if (s === "schwer") {
      const p = ["kreis", "quadrat", "dreieck", "raute", "sechseck", "stern"];
      if (l >= 2) p.push("wuerfel");
      if (l >= 3) p.push("pyramide");
      return p;
    }
    // mittel
    const p = ["kreis", "quadrat", "dreieck", "raute", "sechseck"];
    if (l >= 3) p.push("stern");
    if (l >= 5) p.push("wuerfel");
    if (l >= 7) p.push("pyramide");
    return p;
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


  /* 5. FORMEN-BAUKASTEN (SVG + CSS-3D-Markup) ---------------------------------
     Die 2D-Formen sind Inline-SVG: exakte Geometrie (das Sechseck ist ein
     REGELMAESSIGES Sechseck, das Dreieck gleichseitig), satte Fuellfarbe
     und eine kraeftige weisse Kontur -> gestochen scharf statt verwaschen.
     Alle Koordinaten leben in einer 100x100-viewBox und skalieren mit.

     Die 3D-Formen (Wuerfel, Pyramide) bestehen aus einzelnen Flaechen-Divs,
     die CSS per rotate/translateZ im Raum anordnet und dauerhaft um zwei
     Achsen dreht (style.css) – so erkennt man den Koerper von allen Seiten. */

  const SVG_PFADE = {
    kreis:    '<circle cx="50" cy="50" r="41"/>',
    quadrat:  '<rect x="11" y="11" width="78" height="78" rx="10"/>',
    // gleichseitig: Breite 86, Hoehe 86 x 0.866 = 74.5
    dreieck:  '<polygon points="50,8 93,82.5 7,82.5"/>',
    raute:    '<polygon points="50,4 91,50 50,96 9,50"/>',
    // regelmaessig (flache Oberseite): Umkreis-Radius 43 um (50,50)
    sechseck: '<polygon points="93,50 71.5,87.2 28.5,87.2 7,50 28.5,12.8 71.5,12.8"/>',
    // 5-zackiger Stern: Aussenradius 48, Innenradius 20 um (50,54)
    stern:    '<polygon points="50,6 61.8,37.8 95.6,39.2 69,60.2 78.2,92.8 ' +
              '50,74 21.8,92.8 31,60.2 4.4,39.2 38.2,37.8"/>'
  };

  // Baut das Innen-Markup einer Form. farbe=null -> neutrales Hellblau
  // (fuer das Auftrags-Symbol in Phase 1/3, wo die Farbe egal ist).
  // groessePx braucht nur 3D (Kantenlaenge fuer translateZ via --s).
  function formHTML(form, farbe, groessePx) {
    if (FORMEN[form].dreiD) {
      const farbKlasse = farbe ? "farbe-" + farbe : "farbe-neutral";
      const flaechen = form === "wuerfel"
        ? '<div class="w-vorn"></div><div class="w-hinten"></div>' +
          '<div class="w-rechts"></div><div class="w-links"></div>' +
          '<div class="w-oben"></div><div class="w-unten"></div>'
        : '<div class="p-f p-1"></div><div class="p-f p-2"></div>' +
          '<div class="p-f p-3"></div><div class="p-f p-4"></div>' +
          '<div class="p-boden"></div>';
      return '<div class="obj3d ' + form + " " + farbKlasse +
             '" style="--s:' + groessePx + 'px">' + flaechen + "</div>";
    }
    const fuellung = farbe ? "var(--form-" + farbe + ")" : "#e4ebff";
    return '<svg class="form-svg" viewBox="0 0 100 100" aria-hidden="true">' +
           '<g fill="' + fuellung + '" stroke="rgba(255,255,255,0.9)" ' +
           'stroke-width="5" stroke-linejoin="round">' +
           SVG_PFADE[form] + "</g></svg>";
  }


  /* 6. AUFTRAG (MISSION) WUERFELN + ANZEIGEN + VORLESEN ---------------------- */

  // Wuerfelt einen neuen Auftrag passend zu Lern-Phase und Formen-Vorrat.
  // Damit es nie langweilig wird, unterscheidet sich der neue Auftrag
  // immer vom vorherigen (andere Form oder andere Farbe).
  function auftragWuerfeln() {
    const phase = aktuellePhase();
    const pool = aktiverFormenPool();
    const alter = state.auftrag;
    let neuer = null;

    do {
      neuer = {
        phase: phase,
        form: zufallAus(pool),
        // Farbe spielt nur in Phase 2 eine Rolle
        farbe: phase === 2 ? zufallAus(FARB_NAMEN) : null
      };
    } while (alter && neuer.form === alter.form && neuer.farbe === alter.farbe);

    state.auftrag = neuer;
    auftragAnzeigen();
    auftragSprechen();
  }

  // Der Auftrag als schlichter Sprech-Text (fuer die Sprachausgabe).
  function auftragAlsText() {
    const a = state.auftrag;
    const formWort = FORMEN[a.form].mehrzahl;
    if (a.phase === 1) return "Sammle alle " + formWort + "!";
    if (a.phase === 2) {
      return "Fange " + FARBEN[a.farbe].adjektiv + " " + formWort + "!";
    }
    return "Sammle alles, aber keine " + formWort + "!";
  }

  // Schreibt den Auftrag gross in die Bordcomputer-Konsole – und zeigt
  // links daneben die gesuchte Form als Symbol (fuer Nicht-Leser!).
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
      html = 'Alles, <b class="wort-nicht">ABER KEINE</b> ' +
             '<b class="wort-form">' + formWort + "</b>!";
    }

    el.auftragText.innerHTML = html;
    el.auftragSymbol.innerHTML = formHTML(a.form, a.farbe, 44);
    el.auftragSymbol.classList.toggle("verboten", a.phase === 3);
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


  /* 7. FORMEN & EXTRAS ERZEUGEN (SPAWNEN) --------------------------------------- */

  // Erzeugt eine neue fallende Form am oberen Spielfeldrand.
  // Mit trefferQuote Wahrscheinlichkeit passt sie zum Auftrag, sonst ist
  // sie ein "Ablenker" – so gibt es immer genug zu fangen UND zu denken.
  function formErzeugen() {
    const a = state.auftrag;
    const pool = aktiverFormenPool();
    const sollTreffer = Math.random() < stufe().trefferQuote;
    let form, farbe;

    if (a.phase === 3) {
      // Umkehr-Phase: "Treffer" = jede erlaubte Form, "Ablenker" = die
      // verbotene Form (die darf NICHT gefangen werden).
      const erlaubte = pool.filter((f) => f !== a.form);
      form = sollTreffer ? zufallAus(erlaubte) : a.form;
      farbe = zufallAus(FARB_NAMEN);
    } else if (sollTreffer) {
      form = a.form;
      farbe = a.farbe || zufallAus(FARB_NAMEN);
    } else {
      // Ablenker wuerfeln, bis er NICHT zum Auftrag passt
      do {
        form = zufallAus(pool);
        farbe = zufallAus(FARB_NAMEN);
      } while (passtZumAuftrag({ form: form, farbe: farbe }));
    }

    // Das DOM-Element bauen: aeusseres Div (Position + Schatten), innen
    // SVG-Silhouette oder rotierender 3D-Koerper (siehe Baukasten oben).
    // Die Groessen streuen kraeftig (formMin..formMax je nach Stufe) –
    // das trainiert nebenbei: ein KLEINES Dreieck ist auch ein Dreieck.
    const s = stufe();
    const groesse = Math.round(zufallZwischen(s.formMin, s.formMax));
    const div = document.createElement("div");
    div.className = "form" + (FORMEN[form].dreiD ? " form-3d" : "");
    div.style.width = groesse + "px";
    div.style.height = groesse + "px";
    div.innerHTML = formHTML(form, farbe, groesse);
    el.spielfeld.appendChild(div);

    // Fallgeschwindigkeit in Pixel/Sekunde: Feldhoehe / Falldauer,
    // skaliert mit Stufe und Level. Leichte Zufalls-Streuung (±10 %),
    // damit die Formen nicht im Gleichschritt fallen.
    const geschwindigkeit =
      (state.feldHoehe / aktuelleFallDauer()) * zufallZwischen(0.9, 1.1);

    state.formen.push({
      el: div,
      form: form,
      farbe: farbe,
      bonus: false,
      groesse: groesse,
      x: zufallZwischen(groesse / 2, state.feldBreite - groesse / 2), // Mitte
      y: -groesse,                                    // startet oberhalb
      tempo: geschwindigkeit,
      erledigt: false      // true, sobald gefangen/entfernt (gegen Doppel-Treffer)
    });
  }

  // Erzeugt ein Bonus-Extra: "energie" (goldene ⚡-Kapsel, laedt den
  // Energie-Balken) oder "schild" (blaue 🛡️-Kapsel, aktiviert den
  // Schutzschild). Extras zaehlen NICHT zum Auftrag – einsammeln ist
  // immer gut und gibt zusaetzlich +25 Punkte.
  function bonusErzeugen(art) {
    const groesse = 54;
    const div = document.createElement("div");
    div.className = "form bonus" + (art === "schild" ? " bonus-schild" : "");
    div.style.width = groesse + "px";
    div.style.height = groesse + "px";
    div.innerHTML = '<div class="bonus-kapsel" style="font-size:' +
                    Math.round(groesse * 0.55) + 'px">' +
                    BONUS_EMOJI[art] + "</div>";
    el.spielfeld.appendChild(div);

    state.formen.push({
      el: div,
      form: art,
      farbe: null,
      bonus: true,
      groesse: groesse,
      x: zufallZwischen(groesse / 2, state.feldBreite - groesse / 2),
      y: -groesse,
      tempo: (state.feldHoehe / aktuelleFallDauer()) * 0.9,  // etwas gemuetlicher
      erledigt: false
    });
  }

  // Sekunden zwischen zwei Spawns: Grundwert der Stufe, wird pro Level
  // deutlich kuerzer (DICHTE steigt staerker als das Falltempo) – und die
  // ersten Level bekommen einen Extra-Aufschlag, damit der Einstieg mit
  // ganz WENIGEN Formen beginnt.
  function spawnAbstand() {
    const fruehBonus = 1 + Math.max(0, 3 - state.level) * 0.25;  // L1 +50 %, L2 +25 %
    return stufe().spawnAbstand * Math.pow(levelFaktor(), 1.5) * fruehBonus;
  }


  /* 8. DIE GAME-LOOP (requestAnimationFrame) ---------------------------------
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

    // Pausiert (Pause-Knopf, Menue offen, Tab unsichtbar) oder Mission
    // vorbei (Energie leer)? Dann nur die Zeitmessung weiterfuehren.
    if (state.pausiert || state.vorbei) return;

    /* --- a) Nachschub: alle spawnAbstand() Sekunden eine neue Form ---
       Waehrend der Atempause steht spawnUhr im Minus und muss sich erst
       wieder zu 0 hocharbeiten -> es kommen kurz KEINE neuen Formen.     */
    state.spawnUhr += dt;
    if (state.spawnUhr >= spawnAbstand()) {
      state.spawnUhr = 0;
      formErzeugen();
    }

    /* --- a2) Bonus-Extras auf eigenen, gemuetlichen Uhren ---
       ⚡-Kapseln kommen regelmaessig – und BEWUSST oefter, wenn die Energie
       knapp ist (heimliche Rettungsleine fuer kleine Spieler:innen).
       🛡️-Schilde sind seltener und nur, wenn keins aktiv ist.            */
    if (state.spawnUhr >= 0) {           // in der Atempause auch keine Extras
      state.energieUhr += dt;
      if (state.energieUhr >= state.naechsteEnergie) {
        state.energieUhr = 0;
        state.naechsteEnergie = state.energie < 40
          ? zufallZwischen(7, 12)
          : zufallZwischen(13, 20);
        bonusErzeugen("energie");
      }
      state.schildUhr += dt;
      if (state.schildUhr >= state.naechsterSchild) {
        state.schildUhr = 0;
        state.naechsterSchild = zufallZwischen(30, 50);
        if (state.schild === 0) bonusErzeugen("schild");
      }
    }

    /* --- b) Gleiter weich zum Finger-Ziel gleiten lassen ---
       Statt hart zu springen, naehert sich der Gleiter dem Ziel jeden Frame
       um einen Anteil der Reststrecke (exponentielles Glaetten). Das macht
       die Steuerung geschmeidig, ohne traege zu wirken.                    */
    const vorherX = state.gleiterX;
    state.gleiterX += (state.zielX - state.gleiterX) * Math.min(1, dt * 16);
    el.gleiter.style.transform =
      "translateX(" + (state.gleiterX - GLEITER_BREITE / 2) + "px)";

    /* --- c) Sternenfeld weiterfliegen lassen (mit Lenk-Parallaxe) --- */
    sterneMalen(dt, state.gleiterX - vorherX);

    /* --- d) Formen bewegen, Kollision pruefen, Aufraeumen --- */
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


  /* 9. STERNENFELD (Canvas, echte Tiefe) ---------------------------------------
     Statt einer flachen, mitwandernden Textur: ~140 einzelne Sterne, jeder
     mit eigener Tiefe z (0 = ganz fern, 1 = ganz nah).
       - Fallgeschwindigkeit ~ z^3  -> nahe Sterne rasen, ferne kriechen
       - Groesse + Helligkeit ~ z   -> nahe Sterne gross und hell
       - Beim Lenken driften die Sterne ENTGEGEN der Schiffsbewegung,
         nahe staerker als ferne -> raeumliche Parallaxe wie im Cockpit.
     Die Grundgeschwindigkeit haengt an aktuelleFallDauer(): steigt das
     Level (oder die Schwierigkeitsstufe), fliegt das Schiff spuerbar
     schneller durchs All.                                                  */

  const STERN_ANZAHL = 140;
  const STERN_FARBEN = ["#ffffff", "#ffffff", "#dfe8ff", "#cdd9ff", "#ffe9c9"];
  const sterne = [];
  let sternCtx = null;
  const bewegungReduziert =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sterneEinrichten() {
    sternCtx = el.weltraum.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.weltraum.width  = Math.round(window.innerWidth * dpr);
    el.weltraum.height = Math.round(window.innerHeight * dpr);
    sternCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (sterne.length === 0) {
      for (let i = 0; i < STERN_ANZAHL; i++) {
        sterne.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          z: 0.15 + Math.random() * 0.85,          // Tiefe: fern .. nah
          farbe: zufallAus(STERN_FARBEN)
        });
      }
    }
    sterneMalen(0, 0);      // sofort einmal zeichnen (auch vor dem 1. Frame)
  }

  function sterneMalen(dt, schiffDelta) {
    if (!sternCtx) return;
    const b = window.innerWidth;
    const h = window.innerHeight;
    // Grundtempo = Falltempo der Formen; nahe Sterne fliegen schneller
    // vorbei als die Formen (staerkeres Tiefen-Gefuehl).
    const basis = (state.feldHoehe || h) / aktuelleFallDauer();

    sternCtx.clearRect(0, 0, b, h);
    for (const s of sterne) {
      if (!bewegungReduziert) {
        s.y += basis * (0.10 + 1.15 * s.z * s.z * s.z) * dt;
        s.x -= schiffDelta * s.z * 0.35;           // Lenk-Parallaxe
        if (s.y > h + 3) { s.y = -3; s.x = Math.random() * b; }
        if (s.x < -4) s.x += b + 8;
        else if (s.x > b + 4) s.x -= b + 8;
      }
      sternCtx.globalAlpha = 0.25 + s.z * 0.7;
      sternCtx.fillStyle = s.farbe;
      sternCtx.beginPath();
      sternCtx.arc(s.x, s.y, 0.5 + s.z * 1.9, 0, 6.2832);
      sternCtx.fill();
    }
    sternCtx.globalAlpha = 1;
  }


  /* 10. KOLLISIONSABFRAGE (COLLISION DETECTION) --------------------------------
     Klassischer Rechteck-Test (AABB = "axis-aligned bounding box"):
     Zwei Rechtecke ueberlappen sich genau dann, wenn sie sich SOWOHL in
     der Breite ALS AUCH in der Hoehe ueberschneiden. Wir pruefen deshalb
     die vier "kann NICHT ueberlappen"-Faelle (zu weit links/rechts/oben/
     unten) und drehen das Ergebnis um.

     Kinderfreundlich gemogelt wird trotzdem:
       - Die Fang-Box der Form ist etwas KLEINER als ihr Bild (Faktor 0.75).
         So zaehlt ein knappes Vorbeischrammen nicht als (Fehl-)Fang –
         das fuehlt sich fairer an, besonders bei falschen Formen.
       - Die Fang-Box des GLEITERS ist ebenfalls kleiner als seine Box
         (GLEITER_HITBOX_BREITE/HOEHE) und folgt dem sichtbaren Rumpf +
         Fluegeln der Rakete statt des vollen, breiten SVG-Rahmens. Sonst
         wuerde eine Form schon "treffen", waehrend optisch noch deutlich
         Luft zwischen ihr und dem Schiff ist.                             */

  function beruehrtGleiter(f) {
    // Fang-Box der Form (leicht verkleinert, s. o.)
    const halb = (f.groesse * 0.75) / 2;
    const formLinks  = f.x - halb;
    const formRechts = f.x + halb;
    const formOben   = f.y - halb;
    const formUnten  = f.y + halb;

    // Fang-Box des Gleiters (liegt fest am unteren Feldrand): schmaler als
    // die volle SVG-Box und am Rumpf ausgerichtet - die duenne Flammen-
    // Spitze unten zaehlt nicht mit (s. Konstanten oben).
    const schiffLinks  = state.gleiterX - GLEITER_HITBOX_BREITE / 2;
    const schiffRechts = state.gleiterX + GLEITER_HITBOX_BREITE / 2;
    const schiffOben   = state.feldHoehe - GLEITER_BODEN - GLEITER_HOEHE;
    const schiffUnten  = schiffOben + GLEITER_HITBOX_HOEHE;

    // AABB-Test: keine Ueberlappung, wenn eine Box komplett neben/ueber/
    // unter der anderen liegt – sonst Treffer!
    return !(
      formRechts < schiffLinks ||   // Form ganz links vom Schiff
      formLinks  > schiffRechts ||  // Form ganz rechts vom Schiff
      formUnten  < schiffOben ||    // Form noch ueber dem Schiff
      formOben   > schiffUnten      // Form schon unter dem Schiff
    );
  }


  /* 11. FEEDBACK: RICHTIG / FALSCH / BONUS / LEVEL-UP --------------------------- */

  // Eine Form (oder ein Extra) wurde vom Gleiter beruehrt.
  function formGefangen(f) {
    f.erledigt = true;
    state.formen.splice(state.formen.indexOf(f), 1);

    if (f.bonus) {
      /* BONUS-EXTRA: immer gut! +25 Punkte, dazu die Spezial-Wirkung. */
      f.el.classList.add("gefangen");
      punkteAendern(+PUNKTE_BONUS, f.x, f.y, "bonus");
      if (f.form === "energie") {
        energieAendern(+ENERGIE_KAPSEL_PLUS);
        tonBonus();
      } else {
        schildAktivieren();
        tonSchildAn();
      }
    } else if (passtZumAuftrag(f)) {
      /* RICHTIG: Form poppt leuchtend auf, +10 Punkte, Fortschritt hoch */
      f.el.classList.add("gefangen");
      punkteAendern(+PUNKTE_RICHTIG, f.x, f.y);
      tonRichtig();

      state.richtigeImLevel += 1;
      serieSetzen(state.serie + 1);
      if (state.richtigeImLevel >= ZIEL_PRO_LEVEL) {
        levelAufstieg();
      }
    } else if (state.schild > 0) {
      /* FALSCH, aber der SCHUTZSCHILD faengt den Treffer ab: Schild
         blitzt hell auf, verliert eine Ladung – keine Energie, keine
         Minuspunkte. Bei 0 Ladungen verschwindet die Blase. */
      f.el.classList.add("daneben");
      state.schild -= 1;
      schildAnzeigen();
      tonSchildTreffer();
      el.gleiter.classList.remove("schild-blitz");
      void el.gleiter.offsetWidth;
      el.gleiter.classList.add("schild-blitz");
    } else {
      /* FALSCH: ruhiges, klares Feedback – kurzer Brumm-Sound, eine kleine
         Flamme ploppt am Schiff auf, der Rand blinkt rot, −5 Punkte UND
         Energie-Verlust. Ist der Balken leer -> Missions-Ende. */
      f.el.classList.add("daneben");
      punkteAendern(-PUNKTE_FALSCH, f.x, f.y);
      tonFalsch();
      flammeZeigen();
      energieAendern(-stufe().energieVerlust);
      serieSetzen(0);

      el.fehlerBlitz.classList.remove("an");
      void el.fehlerBlitz.offsetWidth;             // Animation neu starten
      el.fehlerBlitz.classList.add("an");
    }

    // Das Form-Div erst NACH seiner Abschieds-Animation wegraeumen
    const divWeg = f.el;
    setTimeout(() => divWeg.remove(), 400);

    fortschrittAnzeigen();
  }

  // Energie aendern (+/-), Balken aktualisieren, bei 0 Missions-Ende.
  function energieAendern(delta) {
    state.energie = begrenzen(state.energie + delta, 0, ENERGIE_MAX);
    energieAnzeigen();
    if (state.energie <= 0) missionEnde();
  }

  // Energie-Balken faerben: gruen -> gelb (unter 55 %) -> rot (unter 30 %).
  function energieAnzeigen() {
    el.energieBalken.style.width = state.energie + "%";
    el.energie.classList.toggle("knapp", state.energie <= 30);
    el.energie.classList.toggle("mittel",
      state.energie > 30 && state.energie <= 55);
  }

  // Schutzschild aktivieren (volle Ladungen) bzw. Anzeige aktualisieren.
  function schildAktivieren() {
    state.schild = SCHILD_LADUNGEN;
    schildAnzeigen();
  }
  function schildAnzeigen() {
    el.gleiter.classList.toggle("schild", state.schild > 0);
    el.gleiter.classList.toggle("schild-schwach", state.schild === 1);
  }

  // MISSIONS-ENDE: die Energie ist leer. Overlay mit Ergebnis zeigen,
  // Spiel anhalten – "Neue Mission" startet frisch bei 0 Punkten.
  function missionEnde() {
    if (state.vorbei) return;
    state.vorbei = true;
    const rekordSatz = state.punkte >= state.rekord && state.punkte > 0
      ? " 🏆 Neuer Rekord!"
      : " Dein Rekord bleibt bei " + state.rekord + " Punkten.";
    el.endeText.textContent =
      "Dein Raumschiff hat keine Energie mehr. " +
      "Du hast " + state.punkte + " Punkte geschafft und Level " +
      state.level + " erreicht!" + rekordSatz;
    el.endeOverlay.hidden = false;
    tonEnde();
    sprechen("Oh nein, die Energie ist leer! Du hast " + state.punkte +
             " Punkte geschafft. Versuch es gleich nochmal!");
    speichern();
  }

  // Kleine Flamme am Schiff (Fehlgriff-Feedback statt Wackeln).
  function flammeZeigen() {
    const fl = document.createElement("div");
    fl.className = "fehl-flamme";
    fl.textContent = "🔥";
    fl.style.left = state.gleiterX + "px";
    fl.style.top =
      (state.feldHoehe - GLEITER_BODEN - GLEITER_HOEHE - 8) + "px";
    el.spielfeld.appendChild(fl);
    setTimeout(() => fl.remove(), 700);
  }

  // Punkte gutschreiben/abziehen + schwebende "+10"/"−5"/"+25"-Zahl anzeigen.
  function punkteAendern(delta, x, y, extraKlasse) {
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
    flug.className = "punkte-flug " +
      (extraKlasse || (delta > 0 ? "plus" : "minus"));
    flug.textContent = (delta > 0 ? "+" : "−") + Math.abs(delta);
    flug.style.left = begrenzen(x - 20, 4, state.feldBreite - 44) + "px";
    flug.style.top = (y - 30) + "px";
    el.spielfeld.appendChild(flug);
    setTimeout(() => flug.remove(), 850);
  }

  // Trefferserie setzen (richtige Faenge IN FOLGE) + Chip aktualisieren.
  // Steht statt des Allzeit-Rekords staendig im HUD, weil sie waehrend
  // des Spielens viel oefter interessant ist als ein Wert, der sich meist
  // erst nach vielen Runden aendert. Der Rekord bleibt trotzdem einsehbar:
  // im Menue (Fortschritt) und auf dem Missions-Ende-Bildschirm.
  function serieSetzen(neu) {
    state.serie = neu;
    el.serie.textContent = state.serie;
    el.statSerie.classList.remove("puls");
    void el.statSerie.offsetWidth;
    el.statSerie.classList.add("puls");
  }

  // Fortschrittsbalken in der Konsole (0–10 richtige Formen)
  function fortschrittAnzeigen() {
    const anteil = (state.richtigeImLevel / ZIEL_PRO_LEVEL) * 100;
    el.fortschritt.style.width = anteil + "%";
  }

  // Level geschafft! Ablauf mit ATEMPAUSE:
  //   1. sofort: Konfetti + Fanfare + Lob per Sprachausgabe
  //   2. der Spawner pausiert (spawnUhr negativ) -> Bildschirm leert sich
  //   3. nach kurzer Verschnaufpause erscheint der neue Auftrag (Anzeige +
  //      Vorlesen), dann rollt der Nachschub wieder an.
  function levelAufstieg() {
    state.level += 1;
    state.richtigeImLevel = 0;
    state.spawnUhr = -ATEMPAUSE_SEK;             // Atempause: nichts spawnt
    energieAendern(+ENERGIE_LEVEL_BONUS);        // kleine Energie-Belohnung
    konfettiRegnen();
    tonLevelUp();
    speichern();

    el.konsoleLabel.textContent = "🛰️ BORDCOMPUTER · LEVEL " + state.level;
    el.auftragText.innerHTML = "🎉 Super! Kurz durchatmen …";
    el.auftragSymbol.innerHTML = "";
    el.auftragSymbol.classList.remove("verboten");
    sprechen("Super! Level " + state.level + "!");

    const runde = state.runde;
    setTimeout(() => {
      // Falls inzwischen neu gestartet wurde, keinen alten Auftrag wuerfeln
      if (state.runde === runde) auftragWuerfeln();
    }, AUFTRAG_VERZOEGERUNG_MS);
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


  /* 12. TOUCH-STEUERUNG (WISCH-DRAG) -------------------------------------------
     Gesteuert wird mit POINTER-EVENTS: die fassen Touch, Maus und Stift in
     einer API zusammen – ein Handler fuer alles. Die Handler haengen an
     ZWEI Bereichen: am Spielfeld selbst UND an der Wischflaeche darunter.
     So kann das Kind unterhalb des Schiffs wischen (nichts wird verdeckt),
     aber auch direkt auf dem Spielfeld – beides steuert dasselbe Schiff.

     Es ist eine RELATIVE Drag-Steuerung:
       - Beim Aufsetzen des Fingers merken wir uns nur dessen X-Position.
       - Bei jeder Bewegung schieben wir das ZIEL des Gleiters um genauso
         viele Pixel weiter, wie der Finger seit dem letzten Event wanderte.
       - Der Gleiter springt also NICHT unter den Finger!
     Der Faktor 1.15 uebersetzt Fingerweg leicht verstaerkt in Schiffsweg,
     dann erreicht man beide Raender, ohne umgreifen zu muessen.

     Wichtig fuer fluessiges Wischen (sonst scrollt/zoomt der Browser):
       - CSS  : .spielfeld, .wisch-zone { touch-action: none; }
       - HTML : <meta viewport ... user-scalable=no>                        */

  let fingerAktiv = false;
  let fingerLetztesX = 0;
  let ersterTipp = true;

  function steuerungEinrichten() {
    [el.spielfeld, el.wischZone].forEach((zone) => {
      zone.addEventListener("pointerdown", (e) => {
        // Tipp auf einen Button oder ein Overlay (Pause / Missions-Ende)?
        // Dann NICHT steuern und vor allem NICHT capturen – sonst schluckt
        // der Pointer-Capture den Klick, bevor er den Button erreicht.
        if (e.target.closest("button, .pause-overlay")) return;
        fingerAktiv = true;
        fingerLetztesX = e.clientX;
        // Auch wenn der Finger die Zone kurz verlaesst: Events weiter an uns
        zone.setPointerCapture(e.pointerId);
        audioAufwecken();      // Browser erlauben Ton erst nach einer Geste
        if (ersterTipp) {
          // Sprachausgabe darf ebenfalls erst nach einer Geste starten –
          // deshalb wird der allererste Auftrag jetzt (nach)gesprochen.
          ersterTipp = false;
          auftragSprechen();
        }
      });

      zone.addEventListener("pointermove", (e) => {
        if (!fingerAktiv) return;
        const delta = e.clientX - fingerLetztesX;  // Fingerweg seit letztem Event
        fingerLetztesX = e.clientX;
        state.zielX = begrenzen(
          state.zielX + delta * 1.15,
          GLEITER_BREITE / 2,
          state.feldBreite - GLEITER_BREITE / 2
        );
      });

      const loslassen = () => { fingerAktiv = false; };
      zone.addEventListener("pointerup", loslassen);
      zone.addEventListener("pointercancel", loslassen);
    });

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


  /* 13. SOUND (Web Audio) + SPRACHAUSGABE (Speech Synthesis) ------------------- */

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
  function tonBonus() {    // glitzerndes Aufwaerts-Arpeggio fuer ⚡-Energie
    ton(784,  0,    0.10, "triangle", 0.22);
    ton(988,  0.07, 0.10, "triangle", 0.22);
    ton(1319, 0.14, 0.22, "triangle", 0.24);
  }
  function tonSchildAn() { // sattes "Aufladen" beim Einsammeln von 🛡️
    ton(330, 0,    0.14, "sine", 0.22);
    ton(494, 0.10, 0.14, "sine", 0.22);
    ton(659, 0.20, 0.26, "sine", 0.24);
  }
  function tonSchildTreffer() { // heller "Pling" – Schild hat abgefangen
    ton(1175, 0,    0.08, "sine", 0.20);
    ton(880,  0.06, 0.14, "sine", 0.16);
  }
  function tonEnde() {     // sanft absteigende Toene (kein Schreck-Sound)
    ton(523, 0,    0.18, "triangle", 0.22);
    ton(415, 0.16, 0.18, "triangle", 0.20);
    ton(330, 0.32, 0.34, "triangle", 0.18);
  }
  function tonLevelUp() {  // kleine Fanfare
    ton(523, 0,    0.14, "triangle", 0.25);
    ton(659, 0.12, 0.14, "triangle", 0.25);
    ton(784, 0.24, 0.14, "triangle", 0.25);
    ton(1047, 0.36, 0.30, "triangle", 0.28);
  }

  // --- Sprachausgabe (Web Speech API): der Bordcomputer liest Auftraege
  //     vor – wichtig fuer Kinder, die noch nicht (fluessig) lesen. -------
  let deutscheStimme = null;

  function stimmeWaehlen() {
    if (!window.speechSynthesis) return;
    const stimmen = window.speechSynthesis.getVoices();
    deutscheStimme =
      stimmen.find((v) => v.lang === "de-DE") ||
      stimmen.find((v) => v.lang && v.lang.indexOf("de") === 0) || null;
  }

  // anhaengen=true reiht den Text hinter laufende Ausgaben (z. B. erst
  // "Super! Level 4!", dann der neue Auftrag) statt sie abzubrechen.
  function sprechen(text, anhaengen) {
    if (state.einstellungen.sprache !== "an") return;
    if (!window.speechSynthesis) return;
    try {
      if (!anhaengen) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      if (deutscheStimme) u.voice = deutscheStimme;
      u.rate = 0.95;       // einen Hauch langsamer = besser verstaendlich
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) { /* Sprachausgabe nicht verfuegbar – Anzeige reicht */ }
  }

  function auftragSprechen() {
    if (state.auftrag) sprechen(auftragAlsText(), true);
  }


  /* 14. SPEICHERN (localStorage) ------------------------------------------------
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
        // Migration: die fruehere "tempo"-Einstellung heisst jetzt "stufe"
        const alteTempi = { ruhig: "leicht", normal: "mittel", flott: "schwer" };
        if (daten.einstellungen.tempo && !daten.einstellungen.stufe) {
          state.einstellungen.stufe =
            alteTempi[daten.einstellungen.tempo] || "mittel";
        }
        delete state.einstellungen.tempo;
        if (!STUFEN[state.einstellungen.stufe]) {
          state.einstellungen.stufe = "mittel";
        }
      }
    } catch (e) { /* kaputte/fremde Daten ignorieren */ }
  }


  /* 15. PAUSE, NEUSTART, EINSTELLUNGEN, POPOVER ---------------------------------- */

  function pauseSetzen(an) {
    state.pausiert = an;
    el.pauseOverlay.hidden = !an;
    el.buttonPause.textContent = an ? "▶️" : "⏸️";
    el.buttonPause.setAttribute("aria-label", an ? "Weiter" : "Pause");
  }
  function pauseUmschalten() {
    if (state.vorbei) return;    // nach Missions-Ende zaehlt nur "Neue Mission"
    pauseSetzen(!state.pausiert);
  }

  // Neustart ("Neue Mission"): Punkte/Level/Energie auf Anfang,
  // Spielfeld leeren, neuer Auftrag. Der Rekord bleibt natuerlich.
  function neustart() {
    state.runde += 1;
    state.punkte = 0;
    state.level = 1;
    state.richtigeImLevel = 0;
    state.spawnUhr = 0;
    state.energieUhr = 0;
    state.naechsteEnergie = zufallZwischen(13, 20);
    state.schildUhr = 0;
    state.naechsterSchild = zufallZwischen(30, 50);
    state.energie = ENERGIE_MAX;
    state.schild = 0;
    state.vorbei = false;
    state.formen.forEach((f) => f.el.remove());
    state.formen = [];
    el.punkte.textContent = "0";
    el.endeOverlay.hidden = true;
    energieAnzeigen();
    schildAnzeigen();
    fortschrittAnzeigen();
    serieSetzen(0);
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
        // Phase/Stufe bestimmen Auftrag + Formen-Vorrat -> sofort neu wuerfeln
        if (setting === "phase" || setting === "stufe") auftragWuerfeln();
        // Sprachausgabe abgeschaltet? Laufende Ansage sofort stoppen.
        if (setting === "sprache" && karte.dataset.wert === "aus" &&
            window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
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
        "⭐ Deine Punkte: richtige Form +10, falsche Form −5 und " +
        "Energie-Verlust! ⚡ lädt die Energie auf, 🛡️ schützt vor " +
        "2 Fehlgriffen (beide +25 Punkte).");
    });
    el.statSerie.addEventListener("click", () => {
      popoverZeigen(el.statSerie,
        "🔥 Richtige Formen IN FOLGE – ein Fehlgriff setzt sie auf 0 " +
        "zurück. Deinen Rekord aller Zeiten (🏆 " + state.rekord +
        " Punkte) findest du im Menü.");
    });
    // Tipp irgendwo anders schliesst das Popover sofort
    document.addEventListener("pointerdown", (e) => {
      if (!el.popover.hidden && !el.popover.contains(e.target)) {
        el.popover.hidden = true;
      }
    }, true);
  }


  /* 16. START ---------------------------------------------------------------- */

  function start() {
    laden();
    el.rekord.textContent = state.rekord;

    feldVermessen();
    sterneEinrichten();
    state.gleiterX = state.feldBreite / 2;   // Schiff startet in der Mitte
    state.zielX = state.gleiterX;
    state.naechsteEnergie = zufallZwischen(13, 20);
    state.naechsterSchild = zufallZwischen(30, 50);
    energieAnzeigen();

    // Stimmen laden Browser oft erst asynchron nach
    stimmeWaehlen();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = stimmeWaehlen;
    }

    auftragWuerfeln();
    fortschrittAnzeigen();
    steuerungEinrichten();
    menueEinrichten();
    popoverEinrichten();

    el.buttonPause.addEventListener("click", pauseUmschalten);
    el.buttonWeiter.addEventListener("click", () => pauseSetzen(false));
    el.buttonNeustart.addEventListener("click", neustart);
    el.buttonNochmal.addEventListener("click", neustart);

    // Bildschirm gedreht oder Fenster veraendert? Feld + Sterne neu vermessen.
    window.addEventListener("resize", () => {
      feldVermessen();
      sterneEinrichten();
    });

    // Tab in den Hintergrund? Automatisch pausieren (fair + spart Akku).
    // Nach dem Missions-Ende nicht: dort liegt schon das Ende-Overlay.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !state.vorbei) pauseSetzen(true);
    });

    // Die Game-Loop anwerfen: ab jetzt uebernimmt requestAnimationFrame.
    requestAnimationFrame((t) => {
      state.letzteZeit = t;
      requestAnimationFrame(gameLoop);
    });
  }

  start();

})();
