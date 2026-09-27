# DESIGN.md — PPL Routine

Adapted from the Nike reference in VoltAgent/awesome-design-md for a compact mobile workout PWA.

## Visual theme
Athletic, direct, monochrome, high contrast. The interface should feel more like a training tool than a dashboard.

## Color roles
- Ink: `#111111`
- Canvas: `#ffffff`
- Soft cloud: `#f5f5f5`
- Hairline: `#e5e5e5`
- Muted text: `#707072`
- Success: `#007d48` (semantic only)

## Typography
- Display: bold uppercase system sans / Arial Black fallback, tight tracking.
- UI/body: system sans, 400–850 weights.
- Large typographic contrast; avoid decorative type.

## Components
- Primary actions are black pill buttons with white text.
- Secondary actions are soft-gray pill buttons.
- Workout/day cards are flat with no shadows.
- Inputs use soft radii and clear focus borders.
- Exercise media is full-width and flat on a soft-gray background.

## Layout
- Mobile-first, max content width ~760px.
- 8px base spacing rhythm.
- 18px mobile side gutters.
- Bottom navigation fixed with safe-area padding.
- Generous 48px-ish separation between major blocks, tighter rhythm within exercises.

## Depth
No decorative drop shadows. Use hairline separators, white space, and surface tone.

## Do
- Keep workouts one-tap away.
- Make "Wdh. geschafft" explicit and easy to enter.
- Preserve large tap targets.
- Use motion only as exercise demonstration or subtle pressed feedback.

## Don't
- No gradients as decoration.
- No glass cards inside content.
- No colorful dashboard charts in the MVP.
- No hidden interactions required to log a set.
