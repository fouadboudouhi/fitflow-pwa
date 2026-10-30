// Inline SVG icons: one family, 24px grid, 1.75px round strokes, optical weight matched across the set.
// Unicode glyphs rendered inconsistently across platforms, so every symbol in the interface comes from here.
const PATHS = {
  // Tabs
  home: '<path d="M4 10.6 12 4l8 6.6V19a2 2 0 0 1-2 2h-3.6v-5.5H9.6V21H6a2 2 0 0 1-2-2z"/>',
  plan: '<rect x="4.5" y="3.5" width="15" height="17" rx="3"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>',
  chart: '<path d="M3.5 17.5 9.5 11l4 4 7-7.5"/><path d="M16 7.5h4.5V12"/>',
  more: '<circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  // Navigation and controls
  'chevron-left': '<path d="M14.5 6 8.5 12l6 6"/>',
  'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  close: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  down: '<path d="M12 5v14m6-6-6 6-6-6"/>',
  drag: '<circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.8l-5.3 2.8 1.1-5.8-4.3-4.1 5.9-.8z"/>',
  // Objects
  person: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
  dumbbell: '<path d="M3 10.5v3M6.5 8v8M17.5 8v8M21 10.5v3M6.5 12h11"/>',
  backup:
    '<path d="M12 3.5v11M8.5 7 12 3.5 15.5 7"/><path d="M4 14v3.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V14"/>',
  download:
    '<path d="M12 3.5v11M8.5 11l3.5 3.5 3.5-3.5"/><path d="M4 14v3.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V14"/>',
  share:
    '<path d="M12 3.5v11M8.5 7 12 3.5 15.5 7"/><path d="M4 14v3.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V14"/>',
  settings:
    '<path d="M4 7.5h9M17.5 7.5H20M4 12h2.5M10.5 12H20M4 16.5h11.5M19.5 16.5H20"/><circle cx="15.5" cy="7.5" r="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="17.5" cy="16.5" r="2"/>',
  install: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M12 8v6M9.5 11.5 12 14l2.5-2.5"/>',
  shield: '<path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  trophy:
    '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5v1a3 3 0 0 0 3 3M17 6h2.5v1a3 3 0 0 1-3 3"/><path d="M12 13.5V17M9 20h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  note: '<path d="m15.5 4.5 4 4L8 20H4v-4z"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M7 7l.8 13h8.4L17 7"/><path d="M10 11v6M14 11v6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.5 2M9.5 3h5"/>',
  trend: '<path d="M3.5 17.5 9.5 11l4 4 7-7.5"/><path d="M16 7.5h4.5V12"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H15"/>',
  theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  body: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
};
export const icon = (name) =>
  `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] || ''}</svg>`;
