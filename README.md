# Volumora — Training & Fortschritt

Offline-fähige, installierbare Fitness-PWA für frei konfigurierbare Trainingspläne.

Die visuellen Regeln und Komponentenprinzipien sind in [`DESIGN.md`](DESIGN.md) dokumentiert.

## Funktionen
- Beliebig viele Trainingspläne und Tage mit 100 häufigen Übungen erstellen
- Dreistufiger Plan-Assistent für 2–6 Trainingstage mit Vorschau vor dem Speichern
- Wahl zwischen flexibler Trainingsreihenfolge und festen Wochentagen
- Favoriten, zuletzt verwendete Übungen und direkter Übungstausch
- Übungsanimationen und Hinweise werden bei der Auswahl automatisch übernommen
- Durchgehender Trainingsmodus: alle Übungen kompakt untereinander und ohne Weiter-Button
- Abgebrochene Trainings lassen sich von der Startseite aus fortsetzen, auch nach Änderungen am Plan
- Arbeits- und Aufwärmsätze, Gewicht, Wiederholungen und Notizen; RIR ist optional und standardmäßig ausgeblendet
- Sätze lassen sich mobil durch Wischen nach links löschen
- Automatisch berechnete Aufwärmsätze
- Automatische Progressive-Overload-Empfehlungen und optionaler Pausentimer
- Trainingsvolumen, geschätztes 1RM und Körpergewicht als Diagramme
- Körpermaße und komprimierte Fortschrittsfotos (Fotos liegen in IndexedDB, Messwerte in `localStorage`)
- JSON-Backup, validierter JSON-Import und CSV-Export
- Dark Mode, Favoriten sowie Deload-, Krankheits- und Schmerzmarker
- Wochenübersicht und Monatskalender mit Monatsnavigation für geplante und abgeschlossene Einheiten
- Professionelle Übungsanimationen aus einem kuratierten Übungsdatensatz
- Lokale Speicherung im Browser (`localStorage`)
- PWA-Manifest + Service Worker für Offline-Nutzung
- iPhone-freundliche Safe-Area und Homescreen-Nutzung

## Lokal starten
Ein Service Worker funktioniert nur über HTTP/HTTPS, nicht direkt per `file://`.

```bash
npm start
```

Dann `http://localhost:8080` öffnen. Alternativ funktioniert jeder statische Server, z. B. `python3 -m http.server 8080`.

## Tests
Die Smoke-Tests starten die echte App in Chromium und prüfen die wichtigsten Abläufe (Training, Plan-Editor, Assistent, Fotos, Backup-Import, Offline-Start).

```bash
npm install
npm test
```

## Daten
Alle Trainings- und Körperdaten bleiben im Browser des Geräts. Es gibt keinen Account und kein Backend. Für einen Gerätewechsel steht der JSON-Export zur Verfügung; er enthält auch die Fotos aus IndexedDB. Beim Import werden alle Werte geprüft und auf das erwartete Format gebracht.
