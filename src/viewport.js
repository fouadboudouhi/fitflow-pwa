// Installed iOS apps lay the viewport out below the status bar but keep painting scrolled content into the
// status-bar zone above it. --status-gap is that zone's height (screen minus viewport), so a fixed strip can
// cover it; the bottom inset comes straight from CSS (env) and needs no script.
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function measured(side) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;visibility:hidden;height:0;padding-bottom:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(probe);
  const value = probe.offsetHeight;
  probe.remove();
  return value;
}

export function calibrateInset() {
  const portrait = window.innerHeight >= window.innerWidth;
  const gap =
    standalone() && portrait ? Math.max(0, Math.min(120, (screen.height || 0) - window.innerHeight)) : 0;
  document.documentElement.style.setProperty('--status-gap', `${gap}px`);
}

// iOS moves the whole layout up to make room for the keyboard. --keyboard-shift lets the workout header stay;
// --visible-height is the part of the screen the keyboard leaves, which the chat fills exactly.
function watchKeyboardShift() {
  const vv = window.visualViewport;
  if (!vv) return;
  // Installed on iOS the inner height shrinks along with the keyboard, so the tallest height seen is the reference.
  let tallest = 0;
  window.addEventListener('orientationchange', () => {
    tallest = 0;
  });
  const sync = () => {
    const root = document.documentElement;
    tallest = Math.max(tallest, vv.height);
    root.style.setProperty('--keyboard-shift', `${Math.max(0, Math.round(vv.offsetTop))}px`);
    root.style.setProperty('--visible-height', `${Math.round(vv.height)}px`);
    root.classList.toggle('keyboard-open', vv.height < tallest - 40);
  };
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  sync();
}

export function watchInset() {
  watchKeyboardShift();
  calibrateInset();
  window.addEventListener('resize', calibrateInset);
  window.addEventListener('orientationchange', () => setTimeout(calibrateInset, 300));
  setTimeout(calibrateInset, 500);
}

// What the device reports, for the diagnostics line in Settings.
export function viewportReport() {
  const vv = window.visualViewport;
  return [
    `inner ${window.innerWidth}×${window.innerHeight}`,
    `screen ${screen.width}×${screen.height}`,
    vv ? `visual ${Math.round(vv.width)}×${Math.round(vv.height)} @${Math.round(vv.offsetTop)}` : '',
    `inset top ${measured('top')} bottom ${measured('bottom')} · gap ${getComputedStyle(document.documentElement).getPropertyValue('--status-gap').trim()}`,
    standalone() ? 'standalone' : 'browser',
    (navigator.userAgent.match(/OS (\d+_\d+(?:_\d+)?)/) || [])[1]?.replace(/_/g, '.') || '',
  ]
    .filter(Boolean)
    .join(' · ');
}
