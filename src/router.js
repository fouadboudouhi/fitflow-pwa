// Browser history integration: the system back button closes open sheets first, then steps back through views.
// Every view is a history entry ({ view, patch }); all overlays that are open share one extra entry on top of it.
import { state } from './state.js';

const overlays = [];
let overlayEntry = false; // the current history entry is the overlays' entry
let skipPops = 0; // pops we caused ourselves by closing an overlay through its own button
let applyView = () => {};

const sameEntry = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function initRouter(handler) {
  applyView = handler;
  history.replaceState({ volumora: { view: state.view, patch: {} } }, '');
  window.addEventListener('popstate', (e) => {
    if (skipPops > 0) {
      skipPops--;
      return;
    }
    if (overlays.length) {
      // Back with something open: close the top overlay and keep the remaining ones reachable.
      const top = overlays.pop();
      top.closedByHistory = true;
      overlayEntry = false;
      top.close();
      if (overlays.length) {
        history.pushState({ overlay: true }, '');
        overlayEntry = true;
      }
      return;
    }
    if (e.state?.overlay) {
      // An orphaned overlay entry: nothing is open any more, step over it.
      history.back();
      return;
    }
    const entry = e.state?.volumora;
    if (entry) {
      overlayEntry = false;
      applyView(entry.view, entry.patch || {});
    }
  });
}

// Records a view change. Re-selecting the current view replaces its entry instead of stacking duplicates.
export function pushView(view, patch = {}, replace = false) {
  const entry = { volumora: { view, patch } };
  const current = history.state?.volumora;
  if (replace || (overlayEntry && !overlays.length) || sameEntry(current, entry.volumora))
    history.replaceState(entry, '');
  else history.pushState(entry, '');
  overlayEntry = false;
}

// `close` is what the router calls when the user presses back while the overlay is open.
export function pushOverlay(close) {
  const item = { close, closedByHistory: false };
  overlays.push(item);
  if (!overlayEntry) {
    history.pushState({ overlay: true }, '');
    overlayEntry = true;
  }
  return item;
}

// Called by an overlay when it closes itself (button, Escape, backdrop). Removes the shared history entry once the
// last overlay is gone; a follow-up push (another sheet, a navigation) simply lands on top of the pending pop.
export function popOverlay(item) {
  const index = overlays.indexOf(item);
  if (index < 0) return;
  overlays.splice(index, 1);
  if (item.closedByHistory || overlays.length || !overlayEntry) return;
  overlayEntry = false;
  skipPops++;
  history.back();
}
