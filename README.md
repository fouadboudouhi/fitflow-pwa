# Volumora — Training & Fortschritt

Offline-fähige, installierbare Fitness-PWA für frei konfigurierbare Trainingspläne.

Die visuellen Regeln sind in [`DESIGN.md`](DESIGN.md) dokumentiert, im neunteiligen DESIGN.md-Format, damit auch KI-Werkzeuge konsistent daran weiterbauen.

## Funktionen
- Deutsch und Englisch: folgt der Gerätesprache, in den Einstellungen umschaltbar; weitere Sprachen sind eine Datei in `src/locales/`
- Beliebig viele Trainingspläne und Tage mit 100 häufigen Übungen erstellen
- Dreistufiger Plan-Assistent für 2–6 Trainingstage mit Vorschau vor dem Speichern
- Flexible Reihenfolge: der nächste Trainingstag folgt auf den zuletzt absolvierten
- Favoriten, zuletzt verwendete Übungen und direkter Übungstausch
- Übungsanimationen und Hinweise werden bei der Auswahl automatisch übernommen
- Durchgehender Trainingsmodus: alle Übungen kompakt untereinander und ohne Weiter-Button
- Abgebrochene Trainings lassen sich von der Startseite aus fortsetzen, auch nach Änderungen am Plan
- Pro Übung nur die Satz-Tabelle, ein „+ Satz“ und ein „⋯“-Menü für Aufwärmsätze, Scheibenrechner, Notiz und RIR
- Arbeits- und Aufwärmsätze, Gewicht, Wiederholungen und Notizen; RIR ist optional und standardmäßig ausgeblendet
- Sätze lassen sich mobil durch Wischen nach links löschen
- Automatisch berechnete Aufwärmsätze
- Automatische Progressive-Overload-Empfehlungen und optionaler Pausentimer
- Trainingsvolumen, geschätztes 1RM und Körpergewicht als Diagramme mit Tooltip, Zeitraumwahl und Volumen pro Muskelgruppe
- Abgeschlossene Trainings lassen sich öffnen, korrigieren und löschen; Bestwerte werden beim Abhaken erkannt
- Übungs-Historie direkt im Training; Pausentimer überlebt einen Neustart und kann im Hintergrund benachrichtigen
- Homescreen-Shortcut „Training starten“
- Gewichtseinheit kg oder lbs (intern immer Kilogramm), Scheibenrechner für Langhantelübungen
- Wochenziel mit Serie auf der Startseite
- Körpermaße und komprimierte Fortschrittsfotos (Fotos liegen in IndexedDB, Messwerte in `localStorage`)
- JSON-Backup, validierter JSON-Import und CSV-Export; Import der CSV-Exporte von Hevy und Strong (Übungen werden dem Katalog zugeordnet, unbekannte werden eigene Übungen)
- Dark Mode, Favoriten sowie Deload-, Krankheits- und Schmerzmarker
- Wochenübersicht und Monatskalender mit Monatsnavigation für geplante und abgeschlossene Einheiten
- Professionelle Übungsanimationen aus einem kuratierten Übungsdatensatz
- Lokale Speicherung im Browser (`localStorage`)
- PWA-Manifest + Service Worker für Offline-Nutzung
- iPhone-freundliche Safe-Area und Homescreen-Nutzung

## Aufbau
Kein Build-Schritt, kein Framework: `index.html` lädt `src/app.js` als ES-Modul.

| Modul | Aufgabe |
| --- | --- |
| `src/storage.js` | `localStorage`-Zugriff, IndexedDB für Fotos, versionierte Migrationen |
| `src/i18n.js`, `src/locales/*.js` | Übersetzungen: `t(key, params)`, Plural, Datums- und Zahlenformat je Sprache |
| `src/library.js` | Übungskatalog (296 Übungen aus `assets/data/exercises.js`, erzeugt von `tools/import-exercises.mjs`) mit stabilen Schlüsseln für Muskelgruppe, Gerät und Zielmuskel, plus der eingebaute Standardplan; Namen kommen aus dem Wörterbuch, Anleitungen aus `assets/data/steps.*.js` |
| `src/plans.js` | Wochenrhythmus, Plan-Assistent, nächste Einheit |
| `src/workout.js` | Sessions anlegen, fortsetzen, abschließen, Progressionsvorschläge |
| `src/backup.js` | JSON-Export, Validierung und Import, CSV |
| `src/importers.js` | Hevy- und Strong-CSV: Parser, Übungszuordnung, Zusammenführen in den Verlauf |
| `src/charts.js` | Canvas-Diagramme |
| `src/ui.js` | Toast mit Rückgängig, Bottom-Sheets für Bestätigungen und Inhalte (ersetzt `alert`/`confirm`) |
| `src/units.js`, `src/plates.js` | Einheitenumrechnung und Scheibenrechner |
| `src/render.js` | Rendert die aktive View und bindet ihre Events |
| `src/views/*.js` | Eine Datei pro Bildschirm, jeweils `view()` und `bind()` |

Übungen werden über ihre Bibliotheks-ID (`libraryId`) verknüpft. Verlauf und Kraftkurven bleiben deshalb auch nach Umbenennungen oder Planwechseln zusammen. Trainings und Messungen tragen zusätzlich einen lokalen Tagesschlüssel (`day`, `YYYY-MM-DD`), damit Kalender und Wochenansicht in jeder Zeitzone stabil sind. Das Datenschema ist versioniert; Migrationen in `src/storage.js` laufen genau einmal.

## Lokal starten
Ein Service Worker funktioniert nur über HTTP/HTTPS, nicht direkt per `file://`.

```bash
npm start
```

Dann `http://localhost:8080` öffnen. Alternativ funktioniert jeder statische Server, z. B. `python3 -m http.server 8080`.

## Tests und Formatierung
Unit-Tests decken die reinen Module ab (`tests/unit.test.mjs`). Die Smoke-Tests starten die echte App in Chromium und prüfen die wichtigsten Abläufe: Training, Plan-Editor, Assistent, Fotos, Backup-Import, Datenmigration, Rückgängig-Funktion, Offline-Start und einen axe-core-Check auf Barrierefreiheit. GitHub Actions führt beides bei jedem Push aus.

```bash
npm install
npx playwright install chromium
npm test
npm run format
```

## Daten
Alle Trainings- und Körperdaten bleiben im Browser des Geräts. Es gibt keinen Account und kein Backend. Einzige Ausnahme sind die optionalen KI-Funktionen (`src/ai.js`, `src/aiPrompts.js`, `src/views/ai.js`): Wer einen eigenen Claude-API-Schlüssel einträgt, schickt beim Senden direkt aus dem Browser die eigenen Nachrichten und eine Trainingszusammenfassung an Anthropic. Schlüssel und Chat liegen nur im `localStorage` und kommen nicht ins Backup. Für einen Gerätewechsel steht der JSON-Export zur Verfügung; er enthält auch die Fotos aus IndexedDB. Beim Import werden alle Werte geprüft und auf das erwartete Format gebracht.

## Lizenz
Der Quellcode steht unter der [MIT-Lizenz](LICENSE). Übungsanimationen und andere Medien von Dritten sind davon ausgenommen und gehören ihren jeweiligen Rechteinhabern, siehe [`THIRD_PARTY_ASSETS.md`](THIRD_PARTY_ASSETS.md).
