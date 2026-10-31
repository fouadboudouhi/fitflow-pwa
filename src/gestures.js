// Touch gestures: a swipe from the left edge goes back (the screen follows the finger), a downward drag
// dismisses a sheet. Both end in the same actions the buttons trigger, so nothing is reachable only by swiping.
const EDGE = 28;
const TRIGGER = 90;
const EASE = 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)';

let drag = null;

function target(touch, element) {
  const sheet = element.closest?.('.sheet');
  if (sheet) return { kind: 'sheet', el: sheet, close: () => sheet.closest('.sheet-backdrop')?.click() };
  if (touch.clientX > EDGE) return null;
  const picker = document.querySelector('.library-backdrop .exercise-library');
  if (picker)
    return { kind: 'back', el: picker, close: () => picker.querySelector('#closeLibrary')?.click() };
  const main = document.querySelector('#app > main');
  const back = main?.querySelector('.back');
  return main && back ? { kind: 'back', el: main, close: () => back.click() } : null;
}

function onStart(e) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  const found = target(touch, e.target);
  if (found) drag = { ...found, x: touch.clientX, y: touch.clientY, active: false, distance: 0 };
}

function onMove(e) {
  if (!drag) return;
  const touch = e.touches[0];
  const dx = touch.clientX - drag.x;
  const dy = touch.clientY - drag.y;
  if (!drag.active) {
    const along = drag.kind === 'back' ? dx : dy;
    const across = drag.kind === 'back' ? Math.abs(dy) : Math.abs(dx);
    if (across > 10 && across > along) {
      drag = null;
      return;
    }
    if (drag.kind === 'sheet' && drag.el.scrollTop > 0) {
      drag = null;
      return;
    }
    if (along < 10) return;
    drag.active = true;
    drag.el.style.transition = 'none';
  }
  drag.distance = Math.max(0, drag.kind === 'back' ? dx : dy);
  drag.el.style.transform =
    drag.kind === 'back' ? `translateX(${drag.distance}px)` : `translateY(${drag.distance}px)`;
}

function onEnd() {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!d.active) return;
  d.el.style.transition = EASE;
  if (d.distance > TRIGGER) {
    d.el.style.transform = d.kind === 'back' ? 'translateX(100%)' : 'translateY(100%)';
    setTimeout(() => {
      d.close();
      d.el.style.transform = '';
      d.el.style.transition = '';
    }, 180);
  } else {
    d.el.style.transform = '';
    setTimeout(() => (d.el.style.transition = ''), 320);
  }
}

export function initGestures() {
  document.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd, { passive: true });
  document.addEventListener('touchcancel', onEnd, { passive: true });
}
