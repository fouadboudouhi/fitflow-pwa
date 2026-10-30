# Übungsbibliothek: Datenaufbereitung (Meilenstein 8)

Reine Vorbereitung der Daten, noch nicht in die App eingebunden. Quelle ist der öffentliche Datensatz
[YaKohen/exercises-dataset](https://github.com/YaKohen/exercises-dataset) (`data/exercises.json`, 1.324 Übungen). Der Datensatz selbst
liegt nicht im Repo. Seine Lizenz ist unklar (siehe `THIRD_PARTY_ASSETS.md`); die abgeleiteten Texte hier eignen sich nur für den privaten,
nicht kommerziellen Prototyp.

| Datei | Inhalt |
| --- | --- |
| `exercise-selection.json` | 296 Übungen `{ id, nameDe, nameEn, trackType? }`, sortiert nach id |
| `steps.en.json` | `{ id: [Schritte] }`, 4–6 englische Schritte je Übung, aus `instructions.en` |
| `steps.de.json` | gleiche Struktur, deutsche Übersetzung (gleiche Schrittzahl wie `steps.en.json`) |
| `verify-selection.mjs` | Prüfskript, siehe unten |

Die Reihenfolge der Schlüssel in den Step-Dateien ist nicht bedeutsam (JavaScript sortiert Schlüssel wie `"1253"` beim Parsen vor `"0025"`),
Zuordnung immer über die id.

## Auswahl

- Alle 100 Alt-IDs aus `assets/data/exercises.js` sind enthalten (History-Verknüpfung). Ihre Namen stammen aus `src/locales/de.js` und
  `en.js`; Korrekturen siehe unten.
- 196 neue Übungen nach Verbreitung im Studio- und Heimtraining: Lang-/Kurzhantel-, Kabel- und Maschinenübungen, Smith-Machine-Basics,
  Kettlebell-Basics, Körpergewicht (Liegestütz-, Klimmzug-, Kniebeugen-Varianten), Core, Waden, Unterarme, Nacken, Cardio.
- Nicht aufgenommen: Dehn- und Mobilitätsübungen (Ausnahme: die beiden einzigen Nackenübungen des Datensatzes), Yoga, Akrobatik
  (Planche, Front Lever, Muscle-up), reine Widerstandsband-Übungen, exotische Geräte (Hands Bike, SkiErg, Reifen), Olympisches Gewichtheben
  (Ausnahme: Power Clean), Fast-Duplikate (Kamerawinkel, `(male)`-/`(female)`-Versionen, Varianten ohne echten Unterschied) und
  „v. 2“/„v. 3“-Varianten. Einzige Ausnahme: 0735 („sit-up v. 2“), weil das Original `sit-up` im Datensatz fehlt.
- Vier zunächst gewählte Übungen wurden wieder ersetzt, weil ihre Anleitung der Übung widerspricht: 3211 (Knie-Liegestütz, Text beschreibt
  normalen Liegestütz, ersetzt durch 2398), 0118 (Untergriff-Rudern, Text sagt Obergriff, ersetzt durch 1344), 0206 (Reverse Curl am Kabel,
  Text sagt Untergriff, ersetzt durch 0382) und 0593 (Reverse Hyperextension, Text lässt den Oberkörper statt der Beine hängen, ersetzt durch 0551).
- Lücken im Datensatz: kein Rudergerät, kein einfacher Plank (nur Weighted Front Plank, Side Plank, Plank mit Rotation), kein Bird Dog,
  Hollow Hold, Wall Sit, Pallof Press nur mit Band. Laufband nur als Gehen mit Steigung (3666); `run (equipment)` (0684) und `run` (0685)
  haben dieselbe Anleitung („auf der Stelle joggen“), deshalb ist nur 0685 enthalten.

### Namen

- `nameEn`: Datensatzname in Titelschreibweise. `lever` wird zu `Machine`, `smith` zu `Smith Machine`, `ez barbell` bleibt `EZ Barbell`
  (wie im Altbestand). Artefakte wie `(Male)`, `(Side Pov)` und die kaputte Kodierung `45в°` sind entfernt.
- Bewusst vom Datensatznamen abweichend (Platzhalter oder irreführend): 3533 `quads` ist ein Bodyweight Squat, 0003 `air bike` ein
  Bicycle Crunch, 0859 `wrist rollerer` ein Wrist Roller, 0128 `battling ropes` heißt Battle Ropes, 0798 `stationary bike walk` Stationary Bike,
  2311 `walking on stepmill` Stair Climber (Stepmill), 1764 `hanging leg hip raise` Hanging Knee Raise, 3523 `glute bridge two legs on bench (male)`
  Bodyweight Hip Thrust, 1759 `single leg squat (pistol) male` Pistol Squat, 3769 `curtsey squat` Curtsy Squat, 1391 `sled calf press on leg press`
  Leg Press Calf Raise, 1352 `lower back curl` Lower Back Curl (Superman).
- `nameDe`: übliche Studio-Bezeichnungen, innerhalb der Liste eindeutig. Smith Machine heißt „Multipresse“, Kabelgeräte „am Kabel“, Maschinen
  „an der Maschine“; Anglizismen nur, wo sie im Studio üblich sind (Flys, Curls, Crunches, Shrugs, Hip Thrust, Goblet Squats).

### trackType

Standardregel: `category` `cardio` ist `distance_time`, Gerät `body weight` ist `reps`, sonst `weight_reps`. Gesetzt sind nur die 15 Abweichungen:

- `time`: 2135 (Plank mit Zusatzgewicht), 3544 (Seitstütz), 3419 (L-Sit), 0128 (Battle Ropes), 2612 (Seilspringen), 1403 und 0716 (Nackendehnungen)
- `reps`: 0630, 1160, 3224, 3223, 3361 (Cardio mit Wiederholungen: Mountain Climber, Burpee, Jumping Jack, Star Jump, Skater Hop),
  0972 (Bicycle Crunch mit Band), 0857 (Ab Wheel), 0271 (Crunch auf dem Gymnastikball)

## Zähler (Ausgabe von `verify-selection.mjs`)

- Gesamt: 296 Übungen (100 Alt-IDs, 196 neu)
- Gruppen: chest 35, back 46, shoulders 37, arms 54, legs 75, core 37, cardio 12
- Geräte: body weight 71, dumbbell 57, cable 45, barbell 40, leverage machine 36, smith machine 11, kettlebell 10, weighted 7, ez barbell 6,
  sled machine 4, rope 2, band 1, elliptical machine 1, medicine ball 1, stability ball 1, stepmill machine 1, trap bar 1, wheel roller 1
- trackType (wirksam): weight_reps 215, reps 68, time 7, distance_time 6

Die Gruppen folgen `groupOfBodyPart` aus `src/library.js` (upper/lower arms ist arms, upper/lower legs ist legs, waist ist core, neck ist shoulders).
Cardio ist klein, weil der Datensatz nur 29 Cardio-Übungen enthält, von denen die meisten Drills sind.

## Schritte

- Englisch: `instructions.en` wird in Sätze zerlegt, jeder Satz ist ein Schritt. Bei mehr als 6 Sätzen (69 von 296 Übungen) fällt zuerst der
  generische Satz „Repeat for the desired number of repetitions.“ weg (41 Übungen reichte das), sonst werden benachbarte kurze Sätze
  zusammengefasst (28 Übungen). Inhalte werden nicht umformuliert.
- Deutsch: Übersetzung der englischen Schritte, je Schritt ein Schritt, Du-Form, kurze Imperativsätze, durchgehend gleiches Glossar
  („Langhantel“, „Kurzhanteln“, „Kabelzug“, „Multipresse“, „Obergriff“, „Ausgangsposition“, „Rumpf anspannen“, „kontrolliert absenken“).
  Sie wurde maschinell erstellt und per Skript (Schrittzahl, Sie-Form, englische Reste) sowie stichprobenartig geprüft, aber nicht von einem
  Muttersprachler lektoriert.
- Die Anleitungen wurden nicht fachlich korrigiert. Inhaltliche Fehler des Datensatzes stehen unten.

## Korrigierte Altnamen

Nur englische Namen, die deutschen Altnamen sind unverändert.

| ID | vorher | nachher | Grund |
| --- | --- | --- | --- |
| 0274 | Crunch Floor | Floor Crunch | Wortstellung des Datensatzes |
| 0857 | Wheel Rollerout | Ab Wheel Rollout | Tippfehler „Rollerout“ im Datensatz |
| 1463 | Sled 45° Leg Press (Side Pov) | Sled 45° Leg Press | Kamerahinweis im Namen |
| 2963 | Captains Chair Straight Leg Raise | Captain's Chair Straight Leg Raise | Apostroph |
| 3013 | Low Glute Bridge On Floor | Low Glute Bridge on Floor | Titelschreibweise |
| 3562 | Barbell Glute Bridge Two Legs On Bench (Male) | Barbell Hip Thrust | Artefakt „(Male)“, passt zu „Hip Thrust mit Langhantel“ |

Unverändert, aber auffällig: 0199 und 0238 sind dieselbe Übung (0199 ist die „v. 2“ des Straight-Arm Pulldown), beide bleiben wegen der
History; 0279 „Negative Liegestütze“ meint Füße erhöht (Decline), nicht Negativ-Wiederholungen; 2287 „Einbeinige Beinpresse“ ist die wechselseitige
Beinpresse.

## Bekannte Unschärfen des Datensatzes

- Die Anleitungen sind automatisch erzeugt und teils fehlerhaft. Widersprüche zum Namen bei übernommenen Übungen: 0129 („Knees Bent“, Text
  streckt die Beine), 0165 (Hammer Curl mit Untergriff), 0313 (Hammer Curl, Handflächen werden nach vorn gedreht), 0296 (Close-Grip Press mit
  Handflächen nach vorn), 0247 (Wrist Curl am Kabel, Unterarme liegen auf Bank), 0228 (Kickback, Stand mit dem Rücken zum Gerät), 1723 (Pushdown beginnt
  „mit gestrecktem Arm“), 1639 (Kabel-Curl mit Preacher-Polster), 0374 (Spider Curl mit Handflächen nach unten), 0446 und 1627 („Close-Grip“,
  Text nennt schulterbreiten bzw. gar keinen Griff), 0404 („Parallel Grip“, Handflächen nach vorn), 1323 („overhand“ und „palms facing each other“),
  0225 (Reverse Fly, Zug „nach vorn“), 0572 (Chin-Up mit Obergriff), 0407 (Seitbeuge zur „Gegenseite“), 0751 (Smith, aber „seat height“),
  0770 (Multipresse, aber „step back to clear the rack“), 1391 (Calf Press mit Knie- und Fußgelenkstreckung), 0599 („curl your legs up“).
- Text nennt das Merkmal des Namens nicht: „weighted“ ohne Zusatzgewicht (2135, 3670, 0841, 1767), Band fehlt bei 0972, „incline“ fehlt bei
  3544 (normaler Side Plank), 0685 beschreibt Joggen auf der Stelle, 3523 (Hip Thrust mit Körpergewicht) beginnt im Sitzen auf der Bankkante
  mit den Händen auf der Bank.
- Doppelte Einträge: gleicher Name bei 0576 und 0577 („lever chest press“), nahezu gleicher Text bei 0705 und 3544 (Side Plank), gleicher Text bei
  0001, 0260 und 0735 (Sit-up) sowie 0684 und 0685 (Run).
- Namen: `category` und `body_part` sind in allen Datensätzen identisch. `lever` steht für Hebelmaschinen, `sled` für Plattenmaschinen (Beinpresse,
  Hack Squat). Einzelne Gerätefelder passen nicht (0574 „lever bent over row“ hat `barbell`), `neck` enthält nur 2 Dehnungen.
- Drei Anleitungen nennen imperiale Maße („6 inches“, „a few feet“, „two feet“); in den deutschen Schritten stehen ca. 15 cm, 90 cm und 60 cm.

## Prüfung

```
curl -fsSL -o /tmp/volumora-dataset/exercises.json \
  https://raw.githubusercontent.com/YaKohen/exercises-dataset/main/data/exercises.json
node tools/verify-selection.mjs /tmp/volumora-dataset/exercises.json
```

Das Skript liest `assets/data/exercises.js` und `src/locales` nur lesend. Es prüft: alle Alt-IDs enthalten, ids eindeutig, sortiert und im
Datensatz vorhanden, 1–6 nicht leere Schritte je id in beiden Step-Dateien (gleiche Anzahl in beiden Sprachen), Namen nicht leer und eindeutig,
`trackType` gültig (Hinweis, wenn er der Standardregel entspricht). Am Ende gibt es die Zähler pro Gruppe, Gerät und trackType aus sowie
die Alt-Namen, die von den Wörterbüchern abweichen. Exit-Code 1 bei Fehlern.
