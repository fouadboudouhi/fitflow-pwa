import { render } from '../render.js';
import { getBody, photos, saveBody } from '../storage.js';
import { dayKey, esc, fmtDate, number, uid } from '../util.js';
import { backRow } from './shell.js';

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.72));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const photoMarkup = (e) => {
  const alt = `Fortschritt vom ${fmtDate(e.day || e.date)}`;
  if (e.hasPhoto) return `<img data-photo="${esc(e.id)}" alt="${alt}">`;
  if (typeof e.photo === 'string' && e.photo.startsWith('data:image/'))
    return `<img src="${esc(e.photo)}" alt="${alt}">`;
  return '<div class="photo-placeholder">Kein Foto</div>';
};
const measures = (e) =>
  [
    ['Taille', e.waist],
    ['Brust', e.chest],
    ['Arm', e.arm],
    ['Bein', e.thigh],
  ]
    .filter((x) => x[1])
    .map((x) => `${x[0]} ${esc(x[1])} cm`)
    .join(' · ') || 'Keine Maße';
const numberField = (name, label) =>
  `<label><span>${label}</span><input type="number" step="0.1" name="${name}"></label>`;

export function view() {
  const entries = getBody();
  return `<main class="shell">${backRow('Körper & Fotos', 'more')}<section class="page-head compact"><div><span class="eyebrow">Entwicklung</span><h1>Körperdaten</h1><p>Private Messungen und Bilder – nur lokal gespeichert.</p></div></section>
    <form class="body-form" id="bodyForm"><label><span>Datum</span><input type="date" name="date" value="${dayKey()}" required></label>${numberField('weight', 'Gewicht (kg)')}${numberField('waist', 'Taille (cm)')}${numberField('chest', 'Brust (cm)')}${numberField('arm', 'Arm (cm)')}${numberField('thigh', 'Oberschenkel (cm)')}<label class="photo-field"><span>Fortschrittsfoto</span><input type="file" name="photo" accept="image/*"></label><button class="primary" type="submit">Messung speichern</button></form>
    ${entries.some((x) => x.weight) ? '<section class="chart-card"><h2>Gewichtsverlauf</h2><canvas id="bodyChart" height="210" role="img" aria-label="Gewichtsverlauf"></canvas></section>' : ''}
    <section class="body-grid">${entries.map((e) => `<article class="body-entry">${photoMarkup(e)}<div><span class="eyebrow">${fmtDate(e.day || e.date)}</span><h3>${e.weight ? `${esc(e.weight)} kg` : 'Messung'}</h3><p>${measures(e)}</p></div><button class="icon-btn danger" data-delete-body="${e.id}" aria-label="Messung löschen">×</button></article>`).join('')}</section></main>`;
}

function loadPhotos() {
  document.querySelectorAll('img[data-photo]').forEach(async (img) => {
    const src = await photos.get(img.dataset.photo);
    if (src && img.isConnected) img.src = src;
  });
}

export function bind() {
  loadPhotos();
  document.querySelector('#bodyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const file = f.get('photo');
    const day = dayKey(f.get('date')) || dayKey();
    const entry = {
      id: uid(),
      date: new Date(`${day}T12:00:00`).toISOString(),
      day,
      weight: number(f.get('weight')) || '',
      waist: number(f.get('waist')) || '',
      chest: number(f.get('chest')) || '',
      arm: number(f.get('arm')) || '',
      thigh: number(f.get('thigh')) || '',
      hasPhoto: false,
    };
    if (file?.size) {
      try {
        await photos.set(entry.id, await compressImage(file));
        entry.hasPhoto = true;
      } catch {
        alert('Das Foto konnte nicht gespeichert werden. Die Messung wird ohne Foto gesichert.');
      }
    }
    const all = getBody();
    all.unshift(entry);
    saveBody(all);
    render();
  });
  document.querySelectorAll('[data-delete-body]').forEach((b) => {
    b.onclick = () => {
      if (!confirm('Diese Messung löschen?')) return;
      saveBody(getBody().filter((x) => x.id !== b.dataset.deleteBody));
      photos.remove(b.dataset.deleteBody);
      render();
    };
  });
}
