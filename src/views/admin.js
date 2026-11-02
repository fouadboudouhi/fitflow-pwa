// For whoever runs the server: the Claude key everyone uses, the monthly budgets and invitations. Only an account
// the server marks as admin gets here; the server refuses everyone else anyway.
import { fmtNumber, t } from '../i18n.js';
import { icon } from '../icons.js';
import { render } from '../render.js';
import { SyncError, adminCall, isAdmin, refreshMe } from '../sync.js';
import { sheet, toast } from '../ui.js';
import { esc } from '../util.js';
import * as more from './more.js';
import { parentRow } from './shell.js';

const money = (value) => fmtNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const errorText = (err) =>
  t(`admin.error.${err instanceof SyncError ? err.code : 'server'}`, null, t('admin.error.server'));

export function view() {
  if (!isAdmin()) return more.view();
  return `<main class="shell narrow admin">${parentRow('more')}<section class="page-head compact"><h1>${t('admin.title')}</h1></section><div id="adminMount"><p class="muted">${t('admin.loading')}</p></div></main>`;
}

const userRow = (user, month) =>
  `<form class="admin-user" data-admin-user="${esc(user.username)}"><div class="row-main"><b>${esc(user.username)}${user.admin ? ` <span class="chip chip-green">${t('admin.adminChip')}</span>` : ''}</b><small>${t('admin.usedOf', { used: money(user.used), budget: money(user.budget), month })}</small></div><label class="admin-budget"><span>${t('admin.budget')}</span><input type="number" inputmode="decimal" min="0" step="0.5" name="budget" value="${user.ownBudget ?? ''}" placeholder="${money(user.budget)}" aria-label="${esc(t('admin.budgetFor', { user: user.username }))}"></label><button class="secondary" type="submit">${t('common.save')}</button></form>`;

function draw(mount, data) {
  const month = new Date(`${data.month}-01T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  mount.innerHTML = `<section class="list-section"><h2>${t('admin.claude')}</h2><p class="muted settings-hint">${t(data.ai.configured ? 'admin.keySet' : 'admin.keyMissing')}</p>
    <form class="settings-form" id="adminAiForm" novalidate><label><span>${t('ai.keyLabel')}</span><input id="adminKey" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${data.ai.configured ? '••••••••' : 'sk-ant-api…'}"></label><label><span>${t('admin.defaultBudget')}</span><div class="unit-input"><input id="adminDefaultBudget" type="number" inputmode="decimal" min="0" step="0.5" value="${data.ai.defaultBudget}"><i>$</i></div></label><p class="ai-error" role="alert" id="adminAiError" hidden></p><button class="primary full" type="submit">${t('common.save')}</button></form>
    <p class="muted settings-hint">${t('admin.keyHint')}</p></section>
    <section class="list-section"><h2>${t('admin.users')}</h2><p class="muted settings-hint">${t('admin.usersHint')}</p><div class="admin-users">${data.users.map((user) => userRow(user, month)).join('')}</div></section>
    <section class="list-section"><h2>${t('admin.invites')}</h2><p class="muted settings-hint">${t('admin.invitesHint')}</p><button type="button" class="secondary full" id="adminInvite">${t('admin.newInvite')}</button>${
      data.invites.length
        ? `<div class="list admin-invites">${data.invites.map((i) => `<button type="button" class="row" data-invite="${esc(i.code)}"><span class="row-main"><b class="mono">${esc(i.code)}</b><small>${t('admin.inviteOpen')}</small></span>${icon('chevron-right')}</button>`).join('')}</div>`
        : ''
    }</section>`;
}

function showInvite(code) {
  const box = document.createElement('div');
  box.innerHTML = `<p>${t('admin.inviteText')}</p><p class="sync-code" id="inviteCode">${esc(code)}</p><button type="button" class="secondary full" id="inviteCopy">${t('admin.inviteCopy')}</button>${navigator.share ? `<button type="button" class="secondary full" id="inviteShare">${t('admin.inviteShare')}</button>` : ''}`;
  box.querySelector('#inviteCopy').addEventListener('click', async () => {
    await navigator.clipboard?.writeText(code).catch(() => {});
    toast(t('sync.copied'));
  });
  box
    .querySelector('#inviteShare')
    ?.addEventListener('click', () =>
      navigator
        .share({ text: t('admin.inviteMessage', { code, url: location.href.split('?')[0] }) })
        .catch(() => {})
    );
  sheet({ title: t('admin.inviteTitle'), content: box });
}

async function load(mount) {
  try {
    draw(mount, await adminCall('/overview'));
  } catch (err) {
    mount.innerHTML = `<p class="ai-error" role="alert">${esc(errorText(err))}</p>`;
    return;
  }
  mount.querySelector('#adminAiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const line = mount.querySelector('#adminAiError');
    const key = mount.querySelector('#adminKey').value.trim();
    const defaultBudget = mount.querySelector('#adminDefaultBudget').value;
    line.hidden = true;
    const button = e.target.querySelector('button');
    button.disabled = true;
    try {
      await adminCall('/ai', {
        method: 'PUT',
        body: JSON.stringify({ ...(key ? { key } : {}), defaultBudget }),
      });
      await refreshMe().catch(() => {});
      toast(t('admin.saved'));
      await load(mount);
    } catch (err) {
      line.textContent = errorText(err);
      line.hidden = false;
      button.disabled = false;
    }
  });
  mount.querySelectorAll('[data-admin-user]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = form.querySelector('input').value;
      try {
        await adminCall(`/users/${encodeURIComponent(form.dataset.adminUser)}`, {
          method: 'PUT',
          body: JSON.stringify({ budget: value === '' ? null : value }),
        });
        await refreshMe().catch(() => {});
        toast(t('admin.saved'));
        await load(mount);
      } catch (err) {
        toast(errorText(err));
      }
    });
  });
  mount.querySelector('#adminInvite').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      const { code } = await adminCall('/invites', { method: 'POST' });
      showInvite(code);
      await load(mount);
    } catch (err) {
      toast(errorText(err));
      e.currentTarget.disabled = false;
    }
  });
  mount
    .querySelectorAll('[data-invite]')
    .forEach((b) => b.addEventListener('click', () => showInvite(b.dataset.invite)));
}

export function bind() {
  if (!isAdmin()) return more.bind();
  const mount = document.querySelector('#adminMount');
  if (mount) load(mount);
}
