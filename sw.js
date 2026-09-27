const CACHE='volumora-v10';
const ASSETS=[
  './','./index.html','./styles.css','./app.js','./manifest.json','./assets/data/exercises.js',
  './assets/brand/volumora-mark.png','./assets/icons/favicon-32.png',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const sameOrigin=new URL(e.request.url).origin===self.location.origin;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(res=>{caches.open(CACHE).then(c=>c.put('./index.html',res.clone()));return res}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(sameOrigin){
    e.respondWith(fetch(e.request).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(e.request,res.clone()));return res}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{if(res.ok||res.type==='opaque')caches.open(CACHE).then(c=>c.put(e.request,res.clone()));return res})));
});
