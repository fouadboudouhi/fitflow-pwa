# PPL Routine — PWA

Offline-fähige, installierbare Push/Pull/Legs-PWA.

## Funktionen
- Push / Pull / Legs mit fest hinterlegtem Plan
- 16 lokal gebündelte animierte Übungs-GIFs (schematische MVP-Darstellung)
- Gewicht und **tatsächlich geschaffte Wiederholungen pro Satz** eintragen
- Satz als erledigt markieren
- Sätze hinzufügen / entfernen
- Letzte Werte beim nächsten gleichen Training anzeigen
- Trainingsverlauf lokal im Browser (`localStorage`)
- PWA-Manifest + Service Worker für Offline-Nutzung
- iPhone-freundliche Safe-Area und Homescreen-Nutzung

## Lokal starten
Ein Service Worker funktioniert nur über HTTP/HTTPS, nicht direkt per `file://`.

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

## Daten
Alle Trainingsdaten bleiben im Browser des Geräts. Es gibt im MVP keinen Account und kein Backend.
