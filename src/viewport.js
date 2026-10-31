// Bottom inset for bars and floating controls. Installed iOS apps sometimes report a home-indicator inset far
// larger than the indicator, or keep the indicator area clear themselves (the viewport ends above it). The
// measured value is clamped, and not applied at all when the viewport is already shorter than the screen.
const MAX_INSET = 40;

function measured(side) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;visibility:hidden;height:0;padding-bottom:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(probe);
  const value = probe.offsetHeight;
  probe.remove();
  return value;
}
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function calibrateInset() {
  const inset = measured('bottom');
  const portrait = window.innerHeight >= window.innerWidth;
  const missing = (screen.height || 0) - window.innerHeight;
  const systemKeepsClear = standalone() && portrait && missing >= 20;
  document.documentElement.style.setProperty(
    '--inset-bottom',
    systemKeepsClear ? '0px' : `${Math.min(inset, MAX_INSET)}px`
  );
}

export function watchInset() {
  calibrateInset();
  window.addEventListener('orientationchange', () => setTimeout(calibrateInset, 300));
}

// What the device reports, for the diagnostics line in Settings.
export function viewportReport() {
  const vv = window.visualViewport;
  return [
    `inner ${window.innerWidth}×${window.innerHeight}`,
    `screen ${screen.width}×${screen.height}`,
    vv ? `visual ${Math.round(vv.width)}×${Math.round(vv.height)} @${Math.round(vv.offsetTop)}` : '',
    `inset top ${measured('top')} bottom ${measured('bottom')} → ${getComputedStyle(document.documentElement).getPropertyValue('--inset-bottom').trim()}`,
    standalone() ? 'standalone' : 'browser',
    (navigator.userAgent.match(/OS (\d+_\d+(?:_\d+)?)/) || [])[1]?.replace(/_/g, '.') || '',
  ]
    .filter(Boolean)
    .join(' · ');
}
