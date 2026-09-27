const WORKOUTS = {
  push: {
    label: 'Push', subtitle: 'Brust · Trizeps · Schulter',
    exercises: [
      {id:'chest-press', name:'Brustpresse', sets:3, range:'10–15', gif:'assets/exercises/chest-press.gif', note:'Neutraler Griff · Ellbogen ca. 30–45° · nicht maximal tief.'},
      {id:'incline-chest-press', name:'Schrägbank-Brustpresse', sets:3, range:'10–15', gif:'assets/exercises/incline-chest-press.gif', note:'Maschine · leichte Schräge · möglichst neutraler Griff · schmerzfreier Bewegungsweg.'},
      {id:'triceps-pushdown', name:'Trizeps Pushdown', sets:3, range:'10–15', gif:'assets/exercises/triceps-pushdown.gif', note:'Seilgriff · Ellbogen ruhig am Körper.'},
      {id:'cable-external-rotation', name:'Außenrotation am Kabel', sets:2, range:'15–20', gif:'assets/exercises/cable-external-rotation.gif', note:'Sehr leicht · Ellbogen am Körper · kontrolliert.'},
      {id:'scaption-raise', name:'Scaption Raise', sets:2, range:'12–15', gif:'assets/exercises/scaption-raise.gif', note:'Sehr leicht · Arme leicht schräg nach vorne · nur bis Schulterhöhe.'}
    ]
  },
  pull: {
    label: 'Pull', subtitle: 'Rücken · Bizeps',
    exercises: [
      {id:'lat-pulldown-neutral', name:'Latzug neutral', sets:3, range:'8–12', gif:'assets/exercises/lat-pulldown-neutral.gif', note:'Neutraler Griff · zur oberen Brust · nicht hinter den Kopf.'},
      {id:'seated-cable-row', name:'Kabelrudern neutral', sets:3, range:'8–12', gif:'assets/exercises/seated-cable-row.gif', note:'Parallelgriff · Ellbogen relativ nah am Körper · Oberkörper ruhig.'},
      {id:'high-row-machine', name:'High Row Maschine', sets:3, range:'10–12', gif:'assets/exercises/high-row-machine.gif', note:'Möglichst neutraler Griff · nicht mit den Schultern hochziehen.'},
      {id:'ez-bar-curl', name:'SZ-Curls', sets:3, range:'8–12', gif:'assets/exercises/ez-bar-curl.gif', note:'Ellbogen ruhig am Körper · kein Schwung.'},
      {id:'hammer-curl', name:'Hammer Curls', sets:2, range:'10–15', gif:'assets/exercises/hammer-curl.gif', note:'Handflächen zueinander · kontrolliert.'}
    ]
  },
  legs: {
    label: 'Legs', subtitle: 'Beine · Waden · Bauch',
    exercises: [
      {id:'squat', name:'Kniebeugen', sets:3, range:'8–12', gif:'assets/exercises/squat.gif', note:'Normale Kniebeuge · nur schmerzfreie Tiefe · keine Drehung im Knie unter Last.'},
      {id:'romanian-deadlift', name:'Romanian Deadlift', sets:3, range:'8–12', gif:'assets/exercises/romanian-deadlift.gif', note:'Knie leicht gebeugt · Hüfte nach hinten · Rücken neutral.'},
      {id:'leg-curl', name:'Beinbeuger Maschine', sets:3, range:'10–15', gif:'assets/exercises/leg-curl.gif', note:'Sitzend oder liegend · kontrolliert.'},
      {id:'leg-extension', name:'Beinstrecker Maschine', sets:3, range:'12–15', gif:'assets/exercises/leg-extension.gif', note:'Leicht bis moderat starten · nicht explosiv durchstrecken.'},
      {id:'calf-raise', name:'Wadenheben', sets:3, range:'12–20', gif:'assets/exercises/calf-raise.gif', note:'Oben kurz halten · langsam absenken.'},
      {id:'leg-raise', name:'Beinheben', sets:3, range:'10–15', gif:'assets/exercises/leg-raise.gif', note:'Liegend oder Knieheben am Captain’s Chair · Rücken kontrolliert.'}
    ]
  }
};

const $app = document.querySelector('#app');
const LS = { history:'ppl-history-v1', active:'ppl-active-session-v1' };
let state = { view:'home', workout:null, installPrompt:null };

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } };
const write = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const fmtDate = iso => new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(iso));
const fmtTime = iso => new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(iso));

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.installPrompt=e; render(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));

function nav(active='home'){
  return `<nav class="bottom-nav"><div class="bottom-nav-inner">
    <button class="nav-btn ${active==='home'?'active':''}" data-nav="home"><span class="nav-icon">●</span>Heute</button>
    <button class="nav-btn ${active==='plan'?'active':''}" data-nav="plan"><span class="nav-icon">▦</span>Plan</button>
    <button class="nav-btn ${active==='history'?'active':''}" data-nav="history"><span class="nav-icon">↺</span>Verlauf</button>
  </div></nav>`;
}
function topbar(){return `<header class="topbar"><div class="topbar-inner"><div class="brand">PPL <span>ROUTINE</span></div>${state.installPrompt?'<button class="icon-btn" id="installBtn">Installieren</button>':''}</div></header>`}
function render(){
  if(state.view==='workout') $app.innerHTML = renderWorkout();
  else if(state.view==='plan') $app.innerHTML = topbar()+renderPlan()+nav('plan');
  else if(state.view==='history') $app.innerHTML = topbar()+renderHistory()+nav('history');
  else $app.innerHTML = topbar()+renderHome()+nav('home');
  bind();
}

function renderHome(){
  const history=read(LS.history,[]);
  const last=history[0];
  return `<main class="shell">
    <section class="hero"><div class="eyebrow">Dein fester 3-Tage-Plan</div><h1>TRAIN.<br>TRACK.<br>REPEAT.</h1><p class="sub">Push, Pull, Legs. Dieselben Übungen, klare Routine. Gewicht und tatsächlich geschaffte Wiederholungen pro Satz speichern.</p></section>
    <section class="section"><div class="section-head"><h2 class="section-title">Training wählen</h2><span class="muted">3× / Woche</span></div>
      <div class="day-grid">${Object.entries(WORKOUTS).map(([key,w])=>`<button class="day-card" data-start="${key}"><div><div class="big">${w.label}</div><div class="meta">${w.exercises.length} Übungen<br>${w.subtitle}</div></div><span class="arrow">→</span></button>`).join('')}</div>
    </section>
    ${last?`<section class="section"><div class="section-head"><h2 class="section-title">Zuletzt</h2></div><div class="progress-card"><div class="progress-row"><div><div class="eyebrow" style="color:#cacacb">${fmtDate(last.finishedAt)}</div><div class="progress-big">${WORKOUTS[last.day].label}</div></div><div>${last.totalSets} Sätze</div></div></div></section>`:''}
    <section class="section"><button class="secondary full" id="installHelp">Auf iPhone-Homescreen legen</button><p class="install-tip">In Safari: Teilen → <b>Zum Home-Bildschirm</b>. Danach startet die PWA wie eine App und dein Verlauf bleibt lokal auf dem Gerät gespeichert.</p></section>
  </main>`;
}

function freshSession(day){
  const hist=read(LS.history,[]);
  const lastSame=hist.find(s=>s.day===day);
  return {
    day, startedAt:new Date().toISOString(),
    entries: WORKOUTS[day].exercises.map(ex=>({
      id:ex.id,
      sets:Array.from({length:ex.sets},(_,i)=>({weight:lastSame?.entries?.find(e=>e.id===ex.id)?.sets?.[i]?.weight ?? '', reps:'', done:false}))
    }))
  };
}
function getActive(day){
  const active=read(LS.active,null);
  return active?.day===day ? active : freshSession(day);
}
function renderWorkout(){
  const day=state.workout;
  const w=WORKOUTS[day];
  const s=getActive(day); write(LS.active,s);
  const total=s.entries.reduce((n,e)=>n+e.sets.length,0), done=s.entries.reduce((n,e)=>n+e.sets.filter(x=>x.done).length,0);
  return `${topbar()}<main class="shell">
    <div class="backrow"><button class="back" data-nav="home">←</button><span class="muted">Training</span></div>
    <h1 class="workout-title">${w.label}</h1><div class="workout-meta">${w.subtitle} · ${done}/${total} Sätze erledigt</div>
    ${w.exercises.map(ex=>renderExercise(ex,s)).join('')}
    <div class="sticky-finish"><button class="primary full" id="finishWorkout">Training abschließen</button></div>
  </main>`;
}
function renderExercise(ex,s){
  const entry=s.entries.find(e=>e.id===ex.id);
  const history=read(LS.history,[]); const last=history.find(h=>h.day===s.day)?.entries?.find(e=>e.id===ex.id);
  return `<section class="exercise-card" data-ex="${ex.id}">
    <div class="exercise-head"><div><h2 class="exercise-name">${ex.name}</h2><div class="target">Ziel: ${ex.sets} × ${ex.range} Wdh.</div></div></div>
    <div class="exercise-media"><img class="exercise-gif" src="${ex.gif}" alt="Animierte Ausführung: ${ex.name}"><span class="motion-chip">1 Sek. Loop</span></div>
    <p class="note">${ex.note}</p>
    <div class="set-head"><span>Satz</span><span>Gewicht</span><span>Wdh. geschafft</span><span>✓</span></div>
    ${entry.sets.map((set,i)=>`<div>
      <div class="set-row">
        <div class="set-number">${i+1}</div>
        <label class="field-wrap"><input inputmode="decimal" type="number" min="0" step="0.5" value="${set.weight}" data-field="weight" data-index="${i}" aria-label="Gewicht Satz ${i+1}"><span>kg</span></label>
        <label class="field-wrap"><input inputmode="numeric" type="number" min="0" step="1" value="${set.reps}" data-field="reps" data-index="${i}" aria-label="Wiederholungen Satz ${i+1}"><span>Wdh.</span></label>
        <input class="done" type="checkbox" ${set.done?'checked':''} data-field="done" data-index="${i}" aria-label="Satz ${i+1} erledigt">
      </div>
      ${last?.sets?.[i] ? `<div class="last">Letztes Mal: ${last.sets[i].weight || '–'} kg × ${last.sets[i].reps || '–'}</div>`:''}
    </div>`).join('')}
    <div class="set-actions"><button class="pill" data-add-set="${ex.id}">+ Satz</button>${entry.sets.length>1?`<button class="pill danger" data-remove-set="${ex.id}">− Satz</button>`:''}</div>
  </section>`;
}

function renderPlan(){
  return `<main class="shell"><section class="hero"><div class="eyebrow">Routine</div><h1>DEIN<br>PLAN.</h1><p class="sub">Die Übungen bleiben bewusst gleich. Tippe ein Training, um direkt zu starten.</p></section>
    ${Object.entries(WORKOUTS).map(([key,w])=>`<section class="section"><div class="section-head"><h2 class="section-title">${w.label}</h2><button class="secondary" data-start="${key}">Starten</button></div>${w.exercises.map(ex=>`<div class="plan-card"><div class="exercise-head"><div><div class="exercise-name">${ex.name}</div><div class="target">${ex.sets} × ${ex.range}</div></div></div><div class="exercise-media"><img class="exercise-gif" loading="lazy" src="${ex.gif}" alt="${ex.name}"><span class="motion-chip">1 Sek. Loop</span></div><p class="note">${ex.note}</p></div>`).join('')}</section>`).join('')}
  </main>`;
}
function renderHistory(){
  const history=read(LS.history,[]);
  return `<main class="shell"><section class="hero"><div class="eyebrow">Fortschritt</div><h1>VERLAUF.</h1><p class="sub">Deine tatsächlich geschafften Wiederholungen und Gewichte bleiben lokal auf diesem Gerät gespeichert.</p></section>
    <section class="section">${history.length?history.map(h=>`<details class="history-card"><summary><div class="history-top"><div><div class="history-day">${WORKOUTS[h.day].label}</div><div class="history-date">${fmtDate(h.finishedAt)} · ${fmtTime(h.finishedAt)}</div></div><div class="history-count">${h.totalSets} Sätze</div></div></summary><div>${h.entries.map(e=>{const ex=WORKOUTS[h.day].exercises.find(x=>x.id===e.id);return `<div class="history-ex"><div class="history-ex-name">${ex?.name||e.id}</div><div class="history-sets">${e.sets.map((s,i)=>`Satz ${i+1}: <b>${s.weight||'–'} kg × ${s.reps||'–'} Wdh.</b>`).join('<br>')}</div></div>`}).join('')}</div></details>`).join(''):'<div class="empty">Noch kein Training gespeichert.</div>'}</section>
  </main>`;
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{state.view=b.dataset.nav;state.workout=null;render();scrollTo(0,0)});
  document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{state.view='workout';state.workout=b.dataset.start;render();scrollTo(0,0)});
  const install=document.querySelector('#installBtn'); if(install) install.onclick=async()=>{await state.installPrompt.prompt(); state.installPrompt=null; render()};
  const help=document.querySelector('#installHelp'); if(help) help.onclick=()=>toast('Safari: Teilen → Zum Home-Bildschirm');
  if(state.view==='workout') bindWorkout();
}
function bindWorkout(){
  const day=state.workout;
  document.querySelectorAll('.exercise-card').forEach(card=>{
    const exid=card.dataset.ex;
    card.querySelectorAll('input[data-field]').forEach(inp=>{
      const save=()=>{
        const s=getActive(day), e=s.entries.find(x=>x.id===exid), set=e.sets[+inp.dataset.index];
        if(inp.dataset.field==='done') set.done=inp.checked;
        else set[inp.dataset.field]=inp.value;
        write(LS.active,s);
      };
      inp.addEventListener('change',save); inp.addEventListener('input',save);
    });
  });
  document.querySelectorAll('[data-add-set]').forEach(b=>b.onclick=()=>{
    const s=getActive(day), e=s.entries.find(x=>x.id===b.dataset.addSet); e.sets.push({weight:'',reps:'',done:false}); write(LS.active,s); render();
  });
  document.querySelectorAll('[data-remove-set]').forEach(b=>b.onclick=()=>{
    const s=getActive(day), e=s.entries.find(x=>x.id===b.dataset.removeSet); if(e.sets.length>1)e.sets.pop(); write(LS.active,s); render();
  });
  document.querySelector('#finishWorkout').onclick=()=>{
    const s=getActive(day);
    const hasAny=s.entries.some(e=>e.sets.some(x=>x.reps!=='' || x.weight!=='' || x.done));
    if(!hasAny){ toast('Trag zuerst mindestens einen Satz ein.'); return; }
    const finished={...s,finishedAt:new Date().toISOString(),totalSets:s.entries.reduce((n,e)=>n+e.sets.filter(x=>x.done || x.reps!=='' || x.weight!=='').length,0)};
    const history=read(LS.history,[]); history.unshift(finished); write(LS.history,history.slice(0,150)); localStorage.removeItem(LS.active);
    state.view='history';state.workout=null;render();scrollTo(0,0);toast('Training gespeichert.');
  };
}
function toast(msg){const old=document.querySelector('.toast'); if(old)old.remove(); const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2200)}

render();
