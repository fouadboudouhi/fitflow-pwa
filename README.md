# Volumora — Training & Fortschritt

Offline-fähige, installierbare Fitness-PWA für frei konfigurierbare Trainingspläne.

Die visuellen Regeln und Komponentenprinzipien sind in [`DESIGN.md`](DESIGN.md) dokumentiert.

## Funktionen
- Beliebig viele Trainingspläne und Tage mit 100 häufigen Übungen erstellen
- Minimalistischer Plan-Assistent für 2–6 Trainingstage, ohne Equipment-Abfrage
- Favoriten, zuletzt verwendete Übungen und direkter Übungstausch
- Übungsanimationen und Hinweise werden bei der Auswahl automatisch übernommen
- Geführter Trainingsmodus mit nur einer aktuellen Übung
- Arbeits- und Aufwärmsätze, Gewicht, Wiederholungen, RIR/RPE und Notizen
- Automatisch berechnete Aufwärmsätze
- Automatische Progressive-Overload-Empfehlungen und Pausentimer
- Trainingsvolumen, geschätztes 1RM und Körpergewicht als Diagramme
- Körpermaße und komprimierte Fortschrittsfotos
- JSON-Backup, JSON-Import und CSV-Export
- Dark Mode, Favoriten sowie Deload-, Krankheits- und Schmerzmarker
- Wochenübersicht und Monatskalender für geplante und abgeschlossene Einheiten
- Professionelle Übungsanimationen aus einem kuratierten Übungsdatensatz
- Lokale Speicherung im Browser (`localStorage`)
- PWA-Manifest + Service Worker für Offline-Nutzung
- iPhone-freundliche Safe-Area und Homescreen-Nutzung

## Lokal starten
Ein Service Worker funktioniert nur über HTTP/HTTPS, nicht direkt per `file://`.

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

## Daten
Alle Trainings- und Körperdaten bleiben im Browser des Geräts. Es gibt keinen Account und kein Backend. Für einen Gerätewechsel steht der JSON-Export zur Verfügung.
