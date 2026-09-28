# Volumora Design System

Quiet, private workout companion. One obvious next action per screen, no explanatory copy, no decoration. The interface is mobile-first and usable one-handed in a gym.

## 1. Visual Theme

- Calm and precise. The content (a plan, a set, a number) is the design; chrome stays out of the way.
- One accent hue, green, used only for action, selection, progress and completion.
- Depth comes from tonal layers and 1px hairlines, never from shadows on resting elements.
- Nothing is decorated: no uppercase tracked labels above headings, no arrows appended to buttons, no marketing copy inside the product, no cards inside cards.
- No top bar. The bottom navigation is the only chrome; each screen starts with its title.
- One primary action per screen. Everything secondary lives in a „⋯“ action sheet, never as a row of visible buttons.

## 2. Color Palette

Tokens live in `styles.css` on `:root` and `html[data-theme=dark]`.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--paper` | `#F6F7F4` | `#0B0E0C` | canvas |
| `--surface` | `#FFFFFF` | `#121713` | lists, cards, sheets |
| `--cloud` | `#EEF1ED` | `#1A211C` | inset fields, tracks, chips |
| `--line` | `#DDE2DC` | `#293129` | hairlines |
| `--ink` | `#131713` | `#F2F5F2` | text |
| `--muted` | `#606760` | `#98A099` | secondary text (4.5:1 on every surface) |
| `--green` | `#16B86A` | `#34D889` | fills: primary button, progress, chips |
| `--on-green` | `#0B1A10` | `#0B1A10` | text on green fills |
| `--green-ink` | `#0D7A45` | `#34D889` | green text and links |
| `--danger` | `#C43B37` | `#FF756F` | destructive only |
| `--orange`, `--blue` | | | second and third chart series only |

Rules: text never wears a fill color; red is destructive only; amber is caution only; never rely on color alone for state.

## 3. Typography Rules

- System sans-serif stack. No web font is loaded.
- Scale: page title 30–40px/800 with `-0.03em` tracking, card title 28–36px/800, section heading 15–16px/800, body 14–16px/500–650, secondary 12–13px muted, table headers 9–10px/800 uppercase.
- Numbers that line up use `font-variant-numeric: tabular-nums`.
- Sentence case everywhere. The only uppercase text is a settings group heading or a table column header.
- Headings carry the page. No label above a heading, no subtitle copy below it unless it names a date, a plan or another fact.

## 4. Component Stylings

- **Primary button**: green fill, dark text, 12px radius, 48–52px tall, centered label, no icon. One per screen.
- **Secondary button**: surface fill, 1px line. **Text button**: green-ink text, no border.
- **List** (`.list` + `.row`): one surface with 16px radius, rows separated by hairlines, a chevron at the right of every tappable row. Used for days, sessions and menus.
- **Next card**: the one bordered card on the home screen; label (sentence case, green-ink), title, one fact line, primary button.
- **Stat row**: three numbers between two hairlines, no fill.
- **Chart card**: surface, 1px line, 20px radius, sentence-case title, canvas with crosshair tooltip.
- **Segmented control**: inset track, active segment on surface with a 1px shadow.
- **Set table**: one shared header row, one row per set, inputs on `--cloud`, trailing completion control, "Zuletzt" hint under the inputs.
- **Chips**: hairline pill for state, green fill for positive state (Aktiv, Bestwert, PR).
- **Sheet**: bottom sheet on surface for confirmations and details; **Action sheet**: list of secondary actions, destructive ones in red; **Toast**: ink pill with optional Rückgängig.
- **Settings** save on change. No Speichern button.

## 5. Layout Principles

- 4/8px grid. Outer margin 16px on phones, 24px on wider screens. Content column 760px for reading views, 680px for the workout, 1120px max.
- Section rhythm 24–28px. Card padding 18–22px. List row 60px minimum, 44px minimum for every control, 48px for inputs used during training.
- Summary before detail on every screen. One primary action visible without scrolling.
- Optional state (Tagesform, RIR, notes) stays collapsed until requested.

## 6. Depth & Elevation

- Resting elements: 1px `--line` borders on `--surface`, no shadow.
- Temporary overlays (sheet, toast, tooltip, segmented active state): a single soft shadow.
- Blur is reserved for the sticky top and bottom bars.

## 7. Do's and Don'ts

Do: sentence case, one accent, lists over cards, chevrons on tappable rows, facts instead of copy, undo instead of confirm, placeholders instead of hint lines, „⋯“ menus instead of button rows.
Don't: eyebrows, tracked uppercase labels, appended arrows, middle-dot meta strings longer than two facts, dark "stat tile" blocks, gradients, nested cards, bounce easing, decorative icons.

## 8. Responsive Behavior

- Phone first (390px). Rows stack, stat row keeps three columns, backup tiles collapse to one column.
- 600px+: sheets center on screen, the shell widens, cards keep their padding.
- Safe areas: bars add `env(safe-area-inset-*)` padding; nothing sits behind them.
- Motion: one 160ms fade on view change, 120ms press feedback, 180ms color transitions; all off under `prefers-reduced-motion`.

## 9. Agent Prompt Guide

When adding or changing a screen:

1. Start from an existing view module; reuse `.list`/`.row`, `.stat-row`, `.chart-card`, `.segmented`, `.chip`, `sheet()`, `toast()` before writing new CSS.
2. Only tokens for color. Text on green is `--on-green`; green text is `--green-ink`.
3. No eyebrow labels, no arrows in button labels, no explanatory sentence under a title, no top bar.
   A screen has at most one primary button; put further actions into `actionSheet()`.
4. Every destructive action gets `undoToast`; only truly irreversible actions get `confirmDialog`.
5. Every tappable row shows a chevron; every icon button has an `aria-label`.
6. Run `npm test`. The axe check must stay at zero serious violations in both themes.
