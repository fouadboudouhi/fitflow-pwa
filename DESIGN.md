# Volumora Design System

Quiet, private workout companion. One obvious next action per screen, no explanatory copy, no decoration. The interface is mobile-first, usable one-handed in a gym, and feels native on the phone it is installed on: neutral surfaces, the system typeface at calm weights, depth from tone rather than lines, and motion that eases the way the platform does.

## 1. Visual Theme

- Calm and precise. The content (a plan, a set, a number) is the design; chrome stays out of the way.
- One accent hue, green, used only for action, selection, progress and completion.
- Depth comes from tone: white cards on a light grey canvas, dark grey cards on black. Hairlines separate rows inside a surface; resting elements have no border. Light mode adds one soft ambient shadow under cards, dark mode none.
- Nothing is decorated: no uppercase tracked labels above headings, no arrows appended to buttons, no marketing copy inside the product, no cards inside cards.
- No top bar. The bottom tab bar is the only chrome; each screen starts with its title.
- One primary action per screen. Everything secondary lives in a „⋯“ action sheet, never as a row of visible buttons.

## 2. Color Palette

Tokens live in `styles.css` on `:root` and `html[data-theme=dark]` (the last section of the file holds the current values; earlier sections are history).

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--paper` | `#F2F2F7` | `#000000` | canvas |
| `--surface` | `#FFFFFF` | `#1C1C1E` | lists, cards, sheets |
| `--cloud` | `#ECECF1` | `#2C2C2E` | inset fields, tracks, secondary buttons |
| `--line` | `#E2E2E7` | `#323236` | hairlines between rows |
| `--ink` | `#1C1C1E` | `#F5F5F7` | text |
| `--muted` | `#66666D` | `#9A9AA0` | secondary text (4.5:1 on every surface) |
| `--green` | `#34C759` | `#30D158` | fills: primary button, switches, progress |
| `--on-green` | `#0B1A10` | `#0B1A10` | text on green fills |
| `--green-ink` | `#176D30` | `#30D158` | green text, links, active tab |
| `--danger` | `#D70015` | `#FF453A` | destructive only |
| `--blue`, `--orange` | | | second and third chart series only |

Rules: text never wears a fill color; red is destructive only; amber is caution only; never rely on color alone for state. Tints (green at 14–18 % over a surface) mark positive state on chips, icons and completed sets.

## 3. Typography Rules

- System stack, SF Pro on Apple devices, Roboto/Segoe elsewhere: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, 'Segoe UI', Roboto, sans-serif`. No web font is loaded.
- Three weights only: **700** for titles (page title 32px, card title 30px, exercise 20px, day name 18px, all with `-0.02em` tracking), **600** for names, buttons and anything bold inline, **400–500** for text.
- Sizes: body 16–17px, secondary 13–15px muted, tab labels 10.5px, table headers 10px with `0.06em` tracking (the only uppercase text besides settings group headings).
- Numbers that line up use `font-variant-numeric: tabular-nums`.
- Sentence case everywhere. Headings carry the page: no label above, no subtitle unless it names a date, a plan or another fact.

## 4. Component Stylings

- **Primary button**: green fill, dark text, 14px radius, 50–52px tall, 17px/600 label, no icon. One per screen.
- **Secondary button**: `--cloud` fill, no border. **Text button**: green-ink text, 16px/600. **Icon and back buttons**: 44px, `--cloud` fill, 12px radius; back is a chevron, never an arrow glyph.
- **List** (`.list` + `.row`): one surface with 18px radius, rows 58px minimum separated by hairlines, a faint chevron at the right of every tappable row, an optional tinted icon tile at the left.
- **Next card**: the hero on the home screen; 24px radius, label (sentence case, green-ink), title, one fact line, primary button.
- **Stat row**: three numbers between two hairlines, no fill.
- **Chart card**: surface, 18px radius, sentence-case title, canvas with crosshair tooltip.
- **Segmented control**: `--cloud` track with 2px inset, active segment on surface with a 1px shadow (grey in dark mode).
- **Switch**: 51×31 iOS-style toggle, green when on, white knob with a short eased slide.
- **Fields**: `--cloud` fill, no border, 12px radius, 48px tall, 17px text (so iOS does not zoom), green focus ring.
- **Set table**: transparent header row, one row per set, inputs on `--cloud`, a completion control that pops once when the set lands; completed rows get a green tint.
- **Chips**: hairline pill for neutral state, green tint with green-ink text for positive state (Aktiv, Bestwert, PR).
- **Sheet**: rises from the bottom edge with a grabber, 24px top radius; **Action sheet**: list of 52px actions, destructive ones in red; **Toast** and **rest timer**: floating blurred pills with a little spring.
- **Settings** save on change. No Speichern button.

## 5. Layout Principles

- 4/8px grid. Outer margin 16px on phones, 20px on wider screens. Content column 760px for reading views, 680px for the workout, 1120px max.
- Section rhythm 20–26px. Card padding 16–22px. List row 58px minimum, 44px minimum for every control, 48px for inputs used during training.
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
- **Set done**: the check pops (0.8 → 1.12 → 1) in 400ms. **Switch**: knob slides in 300ms.
- Everything is off under `prefers-reduced-motion`.

## 8. Do's and Don'ts

Do: sentence case, one accent, lists over cards, chevrons on tappable rows, facts instead of copy, undo instead of confirm, placeholders instead of hint lines, „⋯“ menus instead of button rows, tints instead of fills for state.
Don't: eyebrows, tracked uppercase labels, appended arrows, middle-dot meta strings longer than two facts, dark "stat tile" blocks, gradients, nested cards, borders around cards, black weights, decorative icons.

## 9. Responsive Behavior

- Phone first (375–390px). Rows stack, stat row keeps three columns, backup tiles collapse to one column.
- 600px+: sheets center on screen and scale in, the shell widens, cards keep their padding.
- Installed on iOS: the status bar is opaque in the canvas colour (`theme-color`), so nothing scrolls under it; the tab bar and sheets pad for the home indicator through `--inset-bottom` (measured and clamped in `src/viewport.js`).

## 10. Agent Prompt Guide

When adding or changing a screen:

1. Start from an existing view module; reuse `.list`/`.row`, `.stat-row`, `.chart-card`, `.segmented`, `.chip`, `sheet()`, `toast()` before writing new CSS.
2. Only tokens for color. Text on green is `--on-green`; green text is `--green-ink`. New rules go into the last section of `styles.css`.
3. No eyebrow labels, no arrows in button labels, no explanatory sentence under a title, no top bar, no borders around cards.
   A screen has at most one primary button; put further actions into `actionSheet()`.
4. Every destructive action gets `undoToast`; only truly irreversible actions get `confirmDialog`.
5. Every tappable row shows a chevron; every icon button has an `aria-label`.
6. Motion only through the easing tokens and the existing classes; nothing bounces except a pop.
7. Run `npm test`. The axe check must stay at zero serious violations in both themes.
