# Volumora Design System

Quiet, private workout companion. One obvious next action per screen, no explanatory copy, no decoration. The interface is mobile-first and usable one-handed in a gym: neutral surfaces, Satoshi at two weights, a small type scale with generous space around it, hairlines instead of boxes in the training, and motion that eases the way the platform does.

## 1. Visual Theme

- Calm and precise. The content (a plan, a set, a number) is the design; chrome stays out of the way.
- One accent hue, green, used only for action, selection, progress and completion.
- Depth comes from tone: white cards on a light grey canvas, dark grey cards on black. Hairlines separate rows inside a surface; resting elements have no border. Light mode adds one soft ambient shadow under cards, dark mode none.
- Nothing is decorated: no arrows appended to buttons, no marketing copy inside the product, no cards inside cards. Uppercase is reserved for the hero label and the set table captions.
- No top bar. The bottom tab bar is the only chrome; each screen starts with its title.
- One primary action per screen. Everything secondary lives in a „⋯“ action sheet, never as a row of visible buttons.

## 2. Color Palette

Tokens live in `styles.css` on `:root` and `html[data-theme=dark]`. The last section of the file holds the current values; earlier sections are history.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--paper` | `#F2F2F7` | `#000000` | canvas |
| `--surface` | `#FFFFFF` | `#111113` | lists, cards, sheets |
| `--cloud` | `#ECECF1` | `#19191C` | fields, tracks, secondary buttons, picture tiles |
| `--line` | `#E2E2E7` | `#222226` | hairlines between rows |
| `--ink` | `#1C1C1E` | `#F2F2F3` | text |
| `--muted` | `#66666D` | `#86868E` | secondary text (4.5:1 on every surface) |
| `--green` | `#34C759` | `#30D158` | fills: primary button, switches, progress, done check |
| `--on-green` | `#0B1A10` | `#0B1A10` | text on green fills |
| `--green-ink` | `#176D30` | `#30D158` | green text, links, active tab |
| `--danger` | `#D70015` | `#FF6961` | destructive only |
| `--blue`, `--orange` | | | second and third chart series only |

Rules: text never wears a fill color; red is destructive only; amber is caution only; never rely on color alone for state. Tints (green at 14–18 % over a surface) mark positive state on chips, icons and trained calendar days.

## 3. Typography Rules

- Satoshi, self-hosted in `assets/fonts/` (Medium 500 and Bold 700, licence in `THIRD_PARTY_ASSETS.md`), with the system stack as fallback. Charts name it too.
- Two weights only: **700** for titles, names, buttons and anything emphasised, **500** for text. A rule asking for 400 or 600 lands on one of these.
- Sizes: body 14px, page and hero title 26px (`-0.02em`), exercise name 16px, row title 14.5px, secondary 12–13px muted, section heading 13px muted bold, tab labels 10px, set captions 10px uppercase with `0.06em` tracking, set values 17px bold with a 10.5px muted unit.
- Inputs people type into stay at 16px or larger, so iOS does not zoom.
- Numbers that line up use `font-variant-numeric: tabular-nums`.
- Sentence case everywhere else. Headings carry the page; a subtitle only names a date, a plan or another fact.

## 4. Component Stylings

- **Primary button**: green pill, dark text, 44px tall, 15px bold, no icon. One per screen.
- **Secondary button**: `--cloud` pill, no border. **Text button**: green-ink text, 14px bold. **Icon and back buttons**: 44px target, `--cloud` fill, 12px radius; back is a chevron, never an arrow glyph.
- **List** (`.list` + `.row`): one surface with 20px radius, rows 50px minimum separated by hairlines, a faint chevron at the right of every tappable row, an optional tinted icon tile at the left.
- **Hero** (`.next-card`): 20px radius; green uppercase label, week ring top right (`done/goal`), 26px title, one fact line, pill button.
- **Week line** (`.week-line`): muted heading with the streak on the right, then three numbers (volume, records, sessions) split by hairlines, no fill.
- **Chart card**: surface, sentence-case title, canvas with crosshair tooltip.
- **Segmented control**: `--cloud` track with 2px inset, active segment on surface with a 1px shadow (grey in dark mode).
- **Switch**: 51×31 iOS-style toggle, green when on, white knob with a short eased slide.
- **Fields and selects**: `--cloud` fill, no border, 12px radius, 44px tall, 16px text, no number spinners.
- **Exercise head**: 44px picture tile with 13px radius (a dumbbell icon stands in), 16px name, one fact line with the last result, done count on the right.
- **Set table**: no card and no field boxes. Uppercase captions, one hairline per row, values set like text left-aligned under their caption (a hidden `.set-sizer` makes the input exactly as wide as its number, so the unit follows it), last session's values as muted placeholders, a 2px green underline while typing, a 28px ring on the right margin that fills green with a pop when the set lands.
- **Plan editor**: the plan name reads as the page title and the day as a plain heading, both without a field box. Day pills like the picker chips. Exercises are hairline rows: drag handle, 44px picture tile, name, then sets and reps set like text with a muted caption. A 2px green underline marks the field in use. The optional details (rest, step, hint, type) open as ordinary fields under the row.
- **Calendar**: plain muted numbers without cells; trained days get a green tint, a bold number and the session name.
- **Picker**: same scale, hairline rows, a green plus on a `--cloud` circle, green fill once added.
- **Chips**: pill for neutral state, green tint with green-ink text for positive state (Aktiv, Bestwert, PR).
- **Sheet**: rises from the bottom edge with a grabber, 24px top radius; **Action sheet**: list of 48px actions, destructive ones in red; **Toast** and **rest pill**: floating, with a little spring. The rest pill sits 24px from the sides on `--cloud`.
- **Settings** save on change. No Speichern button.

## 5. Layout Principles

- 4/8px grid. Outer margin 24px on phones. Content column 760px for reading views, 680px for the workout, 1120px max.
- Section rhythm 26–30px. Card padding 16–20px. List row 50px minimum, 44px minimum for every control including the set fields and the check, even where the drawing is smaller.
- Summary before detail on every screen. One primary action visible without scrolling.
- Optional state (Tagesform, RIR, notes) stays collapsed until requested.

## 6. Depth & Elevation

- Resting elements: `--surface` on `--paper`, no border; light mode adds `--shadow-card` (a 1px contact shadow plus a soft 32px ambient one), dark mode relies on tone alone.
- Floating elements (sheet, toast, rest timer, tooltip): `--shadow-float`.
- Blur with saturation is reserved for the tab bar, the workout bar, the editor footer and the floating pills.

## 7. Motion

Easing tokens: `--ease` (the platform's modal curve, `cubic-bezier(.32,.72,0,1)`), `--ease-out` (fast start, long settle), `--ease-spring` (a touch of overshoot for pops only).

- **View change**: deeper screens slide in from the right (360ms), going back slides in from the left (300ms), full-screen flows (workout, editor, assistant, summary) rise like a modal (440ms), a tab switch fades up (320ms). `render.js` adds `view-push`, `view-pop`, `view-modal` or `view-fade` next to `view-enter`.
- **Press**: controls scale to 0.97 in 80ms and ease back over 400ms; tab icons scale to 0.9; rows and action items highlight instantly.
- **Sheet**: 500ms rise on `--ease`, backdrop fade 280ms. **Toast and rest timer**: 500ms spring in, 220ms fade out.
- **Set done**: the ring fills and pops (0.8 → 1.12 → 1) in 400ms. **Switch**: knob slides in 300ms.
- Everything is off under `prefers-reduced-motion`.

## 8. Do's and Don'ts

Do: sentence case, one accent, lists over cards, chevrons on tappable rows, facts instead of copy, undo instead of confirm, placeholders instead of hint lines, „⋯“ menus instead of button rows, tints instead of fills for state, hairlines instead of boxes in the training.
Don't: appended arrows, middle-dot meta strings longer than two facts, dark "stat tile" blocks, gradients, nested cards, borders around cards, boxed input fields in the set table, weights other than 500 and 700, decorative icons.

## 9. Responsive Behavior

- Phone first (375–402px). Rows stack, stat row keeps three columns, backup tiles collapse to one column.
- 600px+: sheets center on screen and scale in, the shell widens, cards keep their padding.
- Installed on iOS: the status bar is opaque in the canvas colour (`theme-color`), so nothing scrolls under it; the tab bar and sheets pad for the home indicator through `--inset-bottom` (measured and clamped in `src/viewport.js`).

## 10. Agent Prompt Guide

When adding or changing a screen:

1. Start from an existing view module; reuse `.list`/`.row`, `.stat-row`, `.chart-card`, `.segmented`, `.chip`, `sheet()`, `toast()` before writing new CSS.
2. Only tokens for color. Text on green is `--on-green`; green text is `--green-ink`. New rules go into the last section of `styles.css`.
3. No extra uppercase labels (the hero label and set captions are the only ones), no arrows in button labels, no explanatory sentence under a title, no top bar, no borders around cards.
   A screen has at most one primary button; put further actions into `actionSheet()`.
4. Every destructive action gets `undoToast`; only truly irreversible actions get `confirmDialog`.
5. Every tappable row shows a chevron; every icon button has an `aria-label`.
6. Motion only through the easing tokens and the existing classes; nothing bounces except a pop.
7. Run `npm test`. The axe check must stay at zero serious violations in both themes.
