// Bottom inset for bars and floating controls. Installed iOS apps sometimes report a home-indicator inset
// that the system already keeps clear (the web view ends above it) or one far larger than the indicator;
// the measured value is clamped and, when the viewport is already short by that amount, not applied twice.
const MAX_INSET = 40;

function measuredInset() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;height:0;padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  const inset = probe.offsetHeight;
  probe.remove();
  return inset;
}

export function calibrateInset() {
  const inset = measuredInset();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const missing = (screen.height || 0) - window.innerHeight;
  const countedTwice = standalone && inset > 0 && missing >= inset - 2 && missing < inset + 120;
  document.documentElement.style.setProperty(
    '--inset-bottom',
    countedTwice ? '0px' : `${Math.min(inset, MAX_INSET)}px`
  );
}

export function watchInset() {
  calibrateInset();
  window.addEventListener('orientationchange', () => setTimeout(calibrateInset, 300));
}
