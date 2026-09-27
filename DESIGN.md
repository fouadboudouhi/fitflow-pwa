# Volumora Design System

## Direction

Volumora is a quiet, private workout companion. It should feel focused, calm and fast in a gym: one obvious next action, little explanatory copy and no decorative dashboard clutter. The interface is mobile-first and must remain usable one-handed.

## Foundations

- Use one functional accent: Volumora green. Green means action, selection, progress or completion.
- Build on neutral canvas, surface and inset layers. Never use gradients or large decorative color fields.
- Use the system sans-serif stack. Screen titles are 32–40px/800, section titles 18–20px/800, body 14–16px/500–650, labels 10–12px/750.
- Follow a 4/8px spacing grid. Mobile outer margin is 16px; card padding 16–20px; section rhythm 24–32px.
- Minimum interactive target is 44×44px. Inputs used during training are at least 48px high.
- Corners: 10px controls, 14px grouped rows, 18–20px major surfaces. Avoid excessive pill shapes.
- Depth comes from tonal separation and 1px borders. Use shadows only for temporary overlays.

## Color roles

- Light canvas `#F6F7F4`, surface `#FFFFFF`, inset `#EEF1ED`, ink `#131713`, muted `#687069`, line `#DDE2DC`.
- Dark canvas `#0B0E0C`, surface `#121713`, inset `#1A211C`, ink `#F2F5F2`, muted `#98A099`, line `#293129`.
- Action green `#16B86A` light and `#34D889` dark.
- Red is destructive only; amber is caution only.

## Core components

- Navigation bars are flat, safe-area aware and use a hairline separator.
- A screen gets one primary filled action. Secondary actions are text or neutral outline controls.
- Major cards contain one concept only. Avoid cards inside cards.
- Workout sets use a compact table: one shared column header, one row per set, tabular numerals and a trailing completion control.
- Exercise media is secondary. Show a compact preview and let the user expand it; never push logging controls below a full-screen animation by default.
- Optional state such as illness, pain and deload stays collapsed until requested.
- Motion is 160–220ms ease-out and respects `prefers-reduced-motion`.

## Guardrails

- Do not repeat labels in every set row.
- Do not use oversized marketing headlines inside the product.
- Do not stack multiple bordered callouts before the main task.
- Do not rely on color alone for status.
- Never place controls behind browser or PWA safe areas.
