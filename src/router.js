// Browser history integration: the system back button closes open sheets first, then steps back through views.
// Every view is a history entry ({ view, patch }); all overlays that are open share one extra entry on top of it.
import { state } from './state.js';

const overlays = [];
let overlayEntry = false; // the current history entry is the overlays' entry
let skipPops = 0; // pops we caused ourselves by closing an overlay through its own button
let pendingPop = false; // an overlay closed itself; its entry goes away unless a navigation takes it over
let pendingReplace = null; // a view that replaces the entry below an overlay, once that overlay's entry is gone
let currentView = null; // the view entry on top of the history, with the view it came from
let applyView = () => {};

const sameEntry = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function initRouter(handler) {
  applyView = handler;
  currentView = { view: state.view, patch: {} };
  history.replaceState({ volumora: currentView }, '');
  window.addEventListener('popstate', (e) => {
    if (skipPops > 0) {
      skipPops--;
      if (pendingReplace) history.replaceState(pendingReplace, '');
      pendingReplace = null;
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
      currentView = entry;
      applyView(entry.view, entry.patch || {});
    }
  });
}

// Records a view change. Re-selecting the current view replaces its entry instead of stacking duplicates.
export function pushView(view, patch = {}, replace = false) {
  const current = history.state?.volumora;
  const same = !!current && current.view === view && sameEntry(current.patch, patch);
  const replaces = replace || (overlayEntry && !overlays.length) || same;
  currentView = { view, patch, from: replaces ? currentView?.from : currentView?.view };
  // Replacing a view right after a dialog closed: the dialog's entry goes first, then the view below it changes.
  if (pendingPop && replace) {
    pendingPop = false;
    overlayEntry = false;
    pendingReplace = { volumora: currentView };
    skipPops++;
    history.back();
    return;
  }
  if (replaces) history.replaceState({ volumora: currentView }, '');
  else history.pushState({ volumora: currentView }, '');
  overlayEntry = false;
  pendingPop = false;
}
// The view the current one was opened from, as far as the history knows.
export const previousView = () => currentView?.from;

// `close` is what the router calls when the user presses back while the overlay is open.
export function pushOverlay(close) {
  const item = { close, closedByHistory: false };
  overlays.push(item);
  pendingPop = false;
  if (!overlayEntry) {
    history.pushState({ overlay: true }, '');
    overlayEntry = true;
  }
  return item;
}

// Called by an overlay when it closes itself (button, Escape, backdrop). The shared history entry goes away once
// the last overlay is gone. That waits a tick: a navigation or sheet that follows at once takes the entry over,
// because a real history.back() would pop whatever they had just pushed.
export function popOverlay(item) {
  const index = overlays.indexOf(item);
  if (index < 0) return;
  overlays.splice(index, 1);
  if (item.closedByHistory || overlays.length || !overlayEntry) return;
  pendingPop = true;
  setTimeout(() => {
    if (!pendingPop) return;
    pendingPop = false;
    overlayEntry = false;
    skipPops++;
    history.back();
  });
}
