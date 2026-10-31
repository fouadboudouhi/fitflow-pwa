// Touch gestures the way the platform does them: a drag from the left edge pulls the current screen aside while
// the screen it returns to slides in underneath; a drag down dismisses a sheet. Distance or speed decides; the
// result is the same action the back control or the sheet's close would trigger.
import { previewHtml } from './render.js';
import { state } from './state.js';

const EDGE = 22;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
let drag = null;

const backDestination = (back) => {
  if (back.dataset.nav) return back.dataset.nav;
  if (back.id === 'editorBack') return state.editorReturn || 'plans';
  if (back.id === 'exitWorkout') return 'home';
  if (back.id === 'templatesBack') return 'templates';
  return null;
};

function sheetTarget(element) {
  const sheet = element.closest?.('.sheet');
  if (!sheet || sheet.scrollTop > 0) return null;
  const backdrop = sheet.closest('.sheet-backdrop');
  return { kind: 'sheet', el: sheet, dim: backdrop, finish: () => backdrop?.click() };
}

function backTarget() {
  const picker = document.querySelector('.library-backdrop .exercise-library');
  if (picker)
    return { kind: 'back', el: picker, finish: () => picker.querySelector('#closeLibrary')?.click() };
  const main = document.querySelector('#app > main');
  const back = main?.querySelector('.back');
  if (!main || !back) return null;
  const destination = backDestination(back);
  return {
    kind: 'back',
    el: main,
    under: destination ? previewHtml(destination) : '',
    finish: () => {
      state.skipViewAnimation = true;
      back.click();
    },
  };
}

function mountUnderlay(target) {
  if (target.kind !== 'back' || !target.under) return;
  const under = document.createElement('div');
  under.className = 'gesture-underlay';
  under.innerHTML = target.under;
  under.setAttribute('aria-hidden', 'true');
  document.body.appendChild(under);
  target.underEl = under;
  target.el.classList.add('gesture-dragging');
}

function paint(target, progress) {
  const px = progress * (target.kind === 'back' ? window.innerWidth : window.innerHeight);
  target.el.style.transform = target.kind === 'back' ? `translateX(${px}px)` : `translateY(${px}px)`;
  if (target.underEl) target.underEl.style.transform = `translateX(${-30 * (1 - progress)}%)`;
  if (target.underEl) target.underEl.style.setProperty('--dim', String(0.45 * (1 - progress)));
  if (target.dim) target.dim.style.opacity = String(1 - progress * 0.9);
}

function settle(target, done, duration) {
  const t = `${duration}ms ${EASE}`;
  target.el.style.transition = `transform ${t}`;
  if (target.underEl) target.underEl.style.transition = `transform ${t}`;
  if (target.dim) target.dim.style.transition = `opacity ${t}`;
  requestAnimationFrame(() => paint(target, done ? 1 : 0));
  setTimeout(() => {
    if (done) target.finish();
    target.el.style.transform = '';
    target.el.style.transition = '';
    target.el.classList.remove('gesture-dragging');
    if (target.dim) {
      target.dim.style.opacity = '';
      target.dim.style.transition = '';
    }
    target.underEl?.remove();
  }, duration + 20);
}

function onDown(e) {
  if (!e.isPrimary || e.pointerType === 'mouse') return;
  const target = sheetTarget(e.target) || (e.clientX <= EDGE ? backTarget() : null);
  if (!target) return;
  drag = { target, x: e.clientX, y: e.clientY, t: e.timeStamp, active: false, progress: 0, samples: [] };
}

function onMove(e) {
  if (!drag || !e.isPrimary) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  const { target } = drag;
  const along = target.kind === 'back' ? dx : dy;
  const across = target.kind === 'back' ? Math.abs(dy) : Math.abs(dx);
  if (!drag.active) {
    if (across > 8 && across > along) {
      drag = null;
      return;
    }
    if (along < 8) return;
    drag.active = true;
    mountUnderlay(target);
    target.el.style.transition = 'none';
    if (target.underEl) target.underEl.style.transition = 'none';
    if (target.dim) target.dim.style.transition = 'none';
  }
  const size = target.kind === 'back' ? window.innerWidth : window.innerHeight;
  drag.progress = Math.min(1, Math.max(0, along) / size);
  drag.samples.push([e.timeStamp, along]);
  if (drag.samples.length > 6) drag.samples.shift();
  paint(target, drag.progress);
}

function onUp(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!d.active) return;
  const [t0, p0] = d.samples[0];
  const [t1, p1] = d.samples[d.samples.length - 1];
  const velocity = t1 > t0 ? (p1 - p0) / (t1 - t0) : 0;
  const done = e.type !== 'pointercancel' && (d.progress > 0.35 || velocity > 0.55);
  settle(d.target, done, done ? 240 : 320);
}

export function initGestures() {
  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointercancel', onUp, { passive: true });
}
