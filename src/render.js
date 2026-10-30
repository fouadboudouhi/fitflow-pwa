// Renders the current view into #app and wires its event handlers.
import { drawAnalytics, drawBodyChart } from './charts.js';
import { pushView } from './router.js';
import { state } from './state.js';
import * as analytics from './views/analytics.js';
import * as assistant from './views/assistant.js';
import * as body from './views/body.js';
import * as calendar from './views/calendar.js';
import * as customExercises from './views/customExercises.js';
import * as editor from './views/editor.js';
import * as home from './views/home.js';
import * as legal from './views/legal.js';
import * as more from './views/more.js';
import * as onboarding from './views/onboarding.js';
import * as plans from './views/plans.js';
import * as records from './views/records.js';
import * as session from './views/session.js';
import { bindShell, nav, topbar } from './views/shell.js';
import * as summary from './views/summary.js';
import * as templates from './views/templates.js';
import * as workout from './views/workout.js';

const VIEWS = {
  home,
  plans,
  assistant,
  planEditor: editor,
  workout,
  analytics,
  calendar,
  session,
  body,
  more,
  backup: more,
  settings: more,
  onboarding,
  summary,
  records,
  templates,
  customExercises,
  legal,
};
const BARE = ['workout', 'planEditor', 'assistant', 'onboarding', 'summary'];
const NAV_FOR = {
  calendar: 'analytics',
  session: 'analytics',
  records: 'analytics',
  templates: 'plans',
  body: 'more',
  backup: 'more',
  settings: 'more',
  customExercises: 'more',
  legal: 'more',
};
const $app = document.querySelector('#app');

// How a view arrives: deeper screens slide in from the right, going back slides in from the left, full-screen
// flows (workout, editor, assistant) rise like a modal, a tab switch fades.
const transitionClass = (from, to) => {
  if (BARE.includes(to) && !BARE.includes(from)) return 'view-modal';
  if (NAV_FOR[to] === from) return 'view-push';
  if (NAV_FOR[from] === to) return 'view-pop';
  return 'view-fade';
};

export function navigate(view, patch = {}, { replace = false } = {}) {
  Object.assign(state, patch);
  state.view = view;
  pushView(view, patch, replace);
  render();
}

// The router calls this when the user steps back through the history: same as navigate, without a new entry.
export function applyRoute(view, patch = {}) {
  Object.assign(state, patch);
  state.view = view;
  render();
}

export function redrawCharts() {
  if (state.view === 'analytics') drawAnalytics(state.analyticsExercise, state.analyticsRange || '3m');
  if (state.view === 'body') drawBodyChart();
}

export function render() {
  clearInterval(state.restTimer);
  const previous = state.lastRenderedView;
  const viewChanged = previous !== state.view;
  state.lastRenderedView = state.view;
  if (viewChanged) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const module = VIEWS[state.view] || more;
  // A view may redirect (e.g. workout without exercises); render whatever the state says afterwards.
  let content = module.view();
  if (state.view !== state.lastRenderedView) {
    state.lastRenderedView = state.view;
    content = (VIEWS[state.view] || more).view();
    pushView(state.view, {}, true);
  }
  const bare = BARE.includes(state.view);
  // Re-rendering the same view must not lose what the user opened or where they were typing.
  const openDetails = viewChanged ? [] : [...document.querySelectorAll('details[open][id]')].map((d) => d.id);
  const active = document.activeElement;
  const focusKey =
    !viewChanged && active?.dataset?.setField
      ? `[data-set-field="${active.dataset.setField}"][data-exercise="${active.dataset.exercise}"][data-index="${active.dataset.index}"]`
      : null;
  $app.innerHTML = topbar() + content + (bare ? '' : nav(NAV_FOR[state.view] || state.view));
  if (viewChanged)
    $app.querySelector('main')?.classList.add('view-enter', transitionClass(previous, state.view));
  openDetails.forEach((id) => document.getElementById(id)?.setAttribute('open', ''));
  if (focusKey) document.querySelector(focusKey)?.focus({ preventScroll: true });
  bindShell();
  (VIEWS[state.view] || more).bind();
  if (viewChanged) requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  requestAnimationFrame(redrawCharts);
  if (state.view === 'workout') workout.startRestTicker();
}
