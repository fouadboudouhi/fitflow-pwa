# Volumora — Training & Fortschritt

Offline-fähige, installierbare Fitness-PWA für frei konfigurierbare Trainingspläne.

## Funktionen
- Beliebig viele Trainingspläne, Tage und Übungen erstellen
- Geführter Trainingsmodus mit nur einer aktuellen Übung
- Arbeits- und Aufwärmsätze, Gewicht, Wiederholungen, RIR/RPE und Notizen
- Automatische Progressive-Overload-Empfehlungen und Pausentimer
- Trainingsvolumen, geschätztes 1RM und Körpergewicht als Diagramme
- Körpermaße und komprimierte Fortschrittsfotos
- JSON-Backup, JSON-Import und CSV-Export
- Dark Mode, Favoriten sowie Deload-, Krankheits- und Schmerzmarker
- Professionelle Übungsanimationen von ExerciseDB
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
