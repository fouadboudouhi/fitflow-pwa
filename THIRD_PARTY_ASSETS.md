# Third-party exercise media and data

Volumora does not ship any exercise media. Animations are hot-linked from two sources; the catalogue only
stores file names and dataset keys.

## YaKohen / Exercises Dataset (296 catalogue exercises)

- Repository: https://github.com/YaKohen/exercises-dataset (1,324 exercises with GIFs, thumbnails and
  English instructions). Its README carries a "License: Educational Only" badge and no licence text.
- What Volumora uses: the exercise ids, names, muscle and equipment fields, the GIF file names (loaded from
  `raw.githubusercontent.com/YaKohen/exercises-dataset/main/videos/`) and the English instructions, shortened
  to at most six steps. German names and instructions were written for Volumora on that basis.
- Pipeline: `tools/exercise-selection.json` (curated ids and names), `tools/steps.en.json`, `tools/steps.de.json`
  and `tools/import-exercises.mjs`, which generates `assets/data/exercises.js` and `assets/data/steps.*.js`.
  `tools/dataset-notes.md` documents the selection and known inaccuracies of the source texts.
- Usage: personal, non-commercial app. The app stays free and ad-free; the sources are named in the app
  (More › media credit).

## AscendAPI / ExerciseDB (16 default-plan exercises)

- Media host: https://static.exercisedb.dev (ExerciseDB V1 free media).
- The free V1 media is restricted to personal, educational, community and other non-commercial use; a paid
  plan is required before any commercial or monetised use.

## Before any commercial release

Replace both media sources with owned media or media under an explicit commercial licence, regenerate the
catalogue, and update the attribution shown in the app. The data pipeline keeps this to `assets/data/*` and
`tools/*`.

## Satoshi (interface typeface)

- Source: Fontshare, https://www.fontshare.com/fonts/satoshi (Indian Type Foundry).
- Licence: Fontshare / ITF Free Font Licence, free for personal and commercial use, web embedding included;
  the font files may not be sold or redistributed on their own, and no derivative fonts may be made.
- What Volumora ships: `assets/fonts/satoshi-500.woff2` and `assets/fonts/satoshi-700.woff2` (Medium and Bold,
  Latin subset as served by the Fontshare CDN), precached by the service worker.
