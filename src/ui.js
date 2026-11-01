// In-app replacements for alert() and confirm(): a toast with optional undo, and a bottom-sheet confirmation.
import { t } from './i18n.js';
import { icon } from './icons.js';
import { popOverlay, pushOverlay } from './router.js';

let current = null; // { el, timer, commit }

function dismissToast(undone = false) {
  if (!current) return;
  const { el, timer, commit } = current;
  current = null;
  clearTimeout(timer);
  el.classList.remove('show');
  setTimeout(() => el.remove(), 220);
  if (!undone) commit?.();
}

// Shows a message for a few seconds. `action` adds a button; `commit` runs once the toast goes away without
// that button being pressed, which is how "Rückgängig" works: the destructive part is deferred until then.
export function toast(message, { action, commit, duration = 5000 } = {}) {
  dismissToast();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = action.label;
    button.onclick = () => {
      dismissToast(true);
      action.onClick();
    };
    el.append(button);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', t('common.close'));
  close.innerHTML = icon('close');
  close.onclick = () => dismissToast();
  el.append(close);
  document.body.append(el);
  current = { el, commit, timer: setTimeout(() => dismissToast(), duration) };
  requestAnimationFrame(() => el.classList.add('show'));
}

// Deletion with a way back: `undo` restores, `commit` finalises after the toast expired.
export const undoToast = (message, undo, commit) =>
  toast(message, { action: { label: t('common.undo'), onClick: undo }, commit, duration: 6000 });

export function confirmDialog({
  title,
  text = '',
  confirmLabel = t('common.ok'),
  cancelLabel = t('common.cancel'),
  danger = false,
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"><h2 id="sheetTitle"></h2>${text ? '<p></p>' : ''}<div class="sheet-actions">${cancelLabel ? '<button type="button" class="secondary" data-cancel></button>' : ''}<button type="button" class="primary ${danger ? 'danger-fill' : ''}" data-ok></button></div></div>`;
    backdrop.querySelector('h2').textContent = title;
    if (text) backdrop.querySelector('p').textContent = text;
    const ok = backdrop.querySelector('[data-ok]');
    const cancel = backdrop.querySelector('[data-cancel]');
    ok.textContent = confirmLabel;
    if (cancel) cancel.textContent = cancelLabel;
    const previous = document.activeElement;
    let entry = null;
    const close = (result) => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 200);
      previous?.focus?.({ preventScroll: true });
      popOverlay(entry);
      resolve(result);
    };
    entry = pushOverlay(() => close(false));
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      } else if (e.key === 'Tab') {
        e.stopPropagation();
        const items = [ok, cancel].filter(Boolean);
        const index = items.indexOf(document.activeElement);
        if (index < 0 || (!e.shiftKey && index === items.length - 1) || (e.shiftKey && index === 0)) {
          e.preventDefault();
          items[e.shiftKey ? items.length - 1 : 0].focus();
        }
      }
    };
    ok.onclick = () => close(true);
    if (cancel) cancel.onclick = () => close(false);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(backdrop);
    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      (cancel || ok).focus();
    });
  });
}

export const infoDialog = (title, text) =>
  confirmDialog({ title, text, confirmLabel: t('common.understood'), cancelLabel: null });

// Non-blocking bottom sheet with arbitrary content (an element, or trusted markup from the app's own templates).
export function sheet({ title, content, closeLabel = t('common.close'), autoFocus = true }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="infoSheetTitle"><div class="sheet-head"><h2 id="infoSheetTitle"></h2><button type="button" class="icon-btn" data-close aria-label="${closeLabel}">${icon('close')}</button></div><div class="sheet-body"></div></div>`;
  backdrop.querySelector('h2').textContent = title;
  const body = backdrop.querySelector('.sheet-body');
  if (content instanceof Node) body.append(content);
  else body.innerHTML = content;
  const previous = document.activeElement;
  let entry = null;
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 200);
    previous?.focus?.({ preventScroll: true });
    popOverlay(entry);
  };
  entry = pushOverlay(close);
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };
  backdrop.querySelector('[data-close]').onclick = close;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    if (autoFocus) backdrop.querySelector('[data-close]').focus({ preventScroll: true });
  });
  return close;
}

// Bottom sheet with a short list of actions. Secondary actions live here instead of as visible buttons.
export function actionSheet(title, actions) {
  const list = document.createElement('div');
  list.className = 'action-list';
  let close = () => {};
  let used = false;
  actions.filter(Boolean).forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-item ${action.danger ? 'danger' : ''}`;
    button.textContent = action.label;
    if (action.hint) {
      const hint = document.createElement('small');
      hint.textContent = action.hint;
      button.append(hint);
    }
    button.onclick = () => {
      // A double click would otherwise run the action twice while the sheet fades out.
      if (used) return;
      used = true;
      close();
      action.onClick();
    };
    list.append(button);
  });
  close = sheet({ title, content: list });
  return close;
}
