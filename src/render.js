// Renders the current view into #app and wires its event handlers.
import { drawAnalytics, drawBodyChart } from './charts.js';
import { state } from './state.js';
import * as analytics from './views/analytics.js';
import * as assistant from './views/assistant.js';
import * as body from './views/body.js';
import * as calendar from './views/calendar.js';
import * as editor from './views/editor.js';
import * as home from './views/home.js';
import * as more from './views/more.js';
import * as plans from './views/plans.js';
import { bindShell, nav, topbar } from './views/shell.js';
import * as workout from './views/workout.js';

const VIEWS = {
  home,
  plans,
  assistant,
  planEditor: editor,
  workout,
  analytics,
  calendar,
  body,
  more,
  backup: more,
  settings: more,
};
const BARE = ['workout', 'planEditor', 'assistant'];
const NAV_FOR = { calendar: 'analytics', body: 'more', backup: 'more', settings: 'more' };
const $app = document.querySelector('#app');

export function navigate(view, patch = {}) {
  Object.assign(state, patch);
  state.view = view;
  render();
}

export function render() {
  clearInterval(state.restTimer);
  const viewChanged = state.lastRenderedView !== state.view;
  state.lastRenderedView = state.view;
  if (viewChanged && state.reloadPending && state.view !== 'workout') {
    location.reload();
    return;
  }
  if (viewChanged) window.scrollTo(0, 0);
  const module = VIEWS[state.view] || more;
  // A view may redirect (e.g. workout without exercises); render whatever the state says afterwards.
  let content = module.view();
  if (state.view !== state.lastRenderedView) {
    state.lastRenderedView = state.view;
    content = (VIEWS[state.view] || more).view();
  }
  const bare = BARE.includes(state.view);
  $app.innerHTML =
    (state.view === 'workout' ? '' : topbar()) +
    content +
    (bare ? '' : nav(NAV_FOR[state.view] || state.view));
  bindShell();
  (VIEWS[state.view] || more).bind();
  if (viewChanged) requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  if (state.view === 'analytics') requestAnimationFrame(() => drawAnalytics(state.analyticsExercise));
  if (state.view === 'body') requestAnimationFrame(drawBodyChart);
  if (state.view === 'workout') workout.startRestTicker();
}
