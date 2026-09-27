const CACHE='ppl-routine-v1';
const ASSETS=[
  './','./index.html','./styles.css','./app.js','./manifest.json',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png',
  './assets/exercises/chest-press.gif','./assets/exercises/incline-chest-press.gif','./assets/exercises/triceps-pushdown.gif','./assets/exercises/cable-external-rotation.gif','./assets/exercises/scaption-raise.gif',
  './assets/exercises/lat-pulldown-neutral.gif','./assets/exercises/seated-cable-row.gif','./assets/exercises/high-row-machine.gif','./assets/exercises/ez-bar-curl.gif','./assets/exercises/hammer-curl.gif',
  './assets/exercises/squat.gif','./assets/exercises/romanian-deadlift.gif','./assets/exercises/leg-curl.gif','./assets/exercises/leg-extension.gif','./assets/exercises/calf-raise.gif','./assets/exercises/leg-raise.gif'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match('./index.html'))));
});
