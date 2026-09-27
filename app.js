const DEMOS = {
  chest: 'https://static.exercisedb.dev/media/DOoWcnA.gif', incline: 'https://static.exercisedb.dev/media/jHAnWmT.gif',
  pushdown: 'https://static.exercisedb.dev/media/dU605di.gif', rotation: 'https://static.exercisedb.dev/media/FWdVhcW.gif',
  scaption: 'https://static.exercisedb.dev/media/c9MnDRp.gif', lat: 'https://static.exercisedb.dev/media/rkg41Fb.gif',
  row: 'https://static.exercisedb.dev/media/fUBheHs.gif', highrow: 'https://static.exercisedb.dev/media/nZZZy9m.gif',
  curl: 'https://static.exercisedb.dev/media/6TG6x2w.gif', hammer: 'https://static.exercisedb.dev/media/slDvUAU.gif',
  squat: 'https://static.exercisedb.dev/media/iYzB0Cz.gif', rdl: 'https://static.exercisedb.dev/media/wQ2c4XD.gif',
  legcurl: 'https://static.exercisedb.dev/media/17lJ1kr.gif', extension: 'https://static.exercisedb.dev/media/my33uHU.gif',
  calf: 'https://static.exercisedb.dev/media/ykUOVze.gif', raise: 'https://static.exercisedb.dev/media/9IxJdtC.gif'
};

const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const exercise = (id, name, sets, range, gif, note) => ({id, name, sets, range, gif, note, favorite:false});
const DEFAULT_PLAN = {
  id:'ppl-default', name:'Push · Pull · Legs', description:'Ausgewogener 3-Tage-Plan', createdAt:new Date().toISOString(),
  days:[
    {id:'push', name:'Push', subtitle:'Brust · Trizeps · Schulter', exercises:[
      exercise('chest-press','Brustpresse',3,'10–15',DEMOS.chest,'Neutraler Griff · Ellbogen ca. 30–45°.'),
      exercise('incline-chest-press','Schrägbank-Brustpresse',3,'10–15',DEMOS.incline,'Leichte Schräge · schmerzfreier Bewegungsweg.'),
      exercise('triceps-pushdown','Trizeps Pushdown',3,'10–15',DEMOS.pushdown,'Seilgriff · Ellbogen ruhig am Körper.'),
      exercise('cable-external-rotation','Außenrotation am Kabel',2,'15–20',DEMOS.rotation,'Sehr leicht und kontrolliert.'),
      exercise('scaption-raise','Scaption Raise',2,'12–15',DEMOS.scaption,'Arme leicht schräg nach vorne · bis Schulterhöhe.')
    ]},
    {id:'pull', name:'Pull', subtitle:'Rücken · Bizeps', exercises:[
      exercise('lat-pulldown-neutral','Latzug neutral',3,'8–12',DEMOS.lat,'Zur oberen Brust · nicht hinter den Kopf.'),
      exercise('seated-cable-row','Kabelrudern neutral',3,'8–12',DEMOS.row,'Oberkörper ruhig halten.'),
      exercise('high-row-machine','High Row Maschine',3,'10–12',DEMOS.highrow,'Schultern nicht hochziehen.'),
      exercise('ez-bar-curl','SZ-Curls',3,'8–12',DEMOS.curl,'Ellbogen ruhig · kein Schwung.'),
      exercise('hammer-curl','Hammer Curls',2,'10–15',DEMOS.hammer,'Handflächen zueinander · kontrolliert.')
    ]},
    {id:'legs', name:'Legs', subtitle:'Beine · Waden · Bauch', exercises:[
      exercise('squat','Kniebeugen',3,'8–12',DEMOS.squat,'Nur schmerzfreie Tiefe · Knie stabil.'),
      exercise('romanian-deadlift','Romanian Deadlift',3,'8–12',DEMOS.rdl,'Hüfte nach hinten · Rücken neutral.'),
      exercise('leg-curl','Beinbeuger Maschine',3,'10–15',DEMOS.legcurl,'Sitzend oder liegend · kontrolliert.'),
      exercise('leg-extension','Beinstrecker Maschine',3,'12–15',DEMOS.extension,'Nicht explosiv durchstrecken.'),
      exercise('calf-raise','Wadenheben',3,'12–20',DEMOS.calf,'Oben kurz halten · langsam absenken.'),
      exercise('leg-raise','Beinheben',3,'10–15',DEMOS.raise,'Rumpf und Rücken kontrolliert halten.')
    ]}
  ]
};

const LS = {plans:'volumora-plans-v2', history:'volumora-history-v2', active:'volumora-active-v2', body:'volumora-body-v2', settings:'volumora-settings-v2'};
const $app = document.querySelector('#app');
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate = iso => new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(iso));
const fmtLong = iso => new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(iso));
const number = value => Number(String(value ?? '').replace(',','.')) || 0;
const rangeMax = range => Math.max(...String(range).match(/\d+/g)?.map(Number) || [12]);
const volumeOf = session => session.entries?.reduce((sum, entry) => sum + entry.sets.reduce((s,set) => s + (set.warmup||!set.done ? 0 : number(set.weight)*number(set.reps)),0),0) || 0;
const allPlans = () => read(LS.plans,{activePlanId:DEFAULT_PLAN.id,items:[clone(DEFAULT_PLAN)]});
const savePlans = plans => write(LS.plans,plans);
const activePlan = () => { const data=allPlans(); return data.items.find(p=>p.id===data.activePlanId) || data.items[0]; };
const getDay = (planId,dayId) => allPlans().items.find(p=>p.id===planId)?.days.find(d=>d.id===dayId);
let state = {view:'home', planId:null, dayId:null, exerciseIndex:0, editPlanId:null, installPrompt:null, restUntil:0, restTimer:null};

function initialise(){
  if(!localStorage.getItem(LS.plans)) savePlans({activePlanId:DEFAULT_PLAN.id,items:[clone(DEFAULT_PLAN)]});
  const old=read('ppl-history-v1',[]);
  if(old.length && !localStorage.getItem(LS.history)) write(LS.history,old.map(s=>({...s,id:uid(),planId:DEFAULT_PLAN.id,planName:DEFAULT_PLAN.name,dayId:s.day,dayName:s.day?.[0].toUpperCase()+s.day?.slice(1),volume:volumeOf(s)})));
  if(!localStorage.getItem(LS.settings)) write(LS.settings,{theme:'auto',rest:90,increment:2.5});
  applyTheme();
}

function applyTheme(){
  const setting=read(LS.settings,{theme:'auto'}).theme;
  const theme=setting==='auto' ? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light') : setting;
  document.documentElement.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0b0d0c':'#f3f1eb');
}

window.addEventListener('beforeinstallprompt', e=>{e.preventDefault();state.installPrompt=e;render();});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(read(LS.settings,{}).theme==='auto')applyTheme();});
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));

function topbar(){
  return `<header class="topbar"><div class="topbar-inner"><button class="brand" data-nav="home"><img src="assets/brand/volumora-mark.png" alt=""><span>VOLUMORA</span></button><div class="top-actions"><button class="icon-btn" id="quickTheme" aria-label="Farbschema wechseln">◐</button>${state.installPrompt?'<button class="compact-btn" id="installBtn">Installieren</button>':''}</div></div></header>`;
}
function nav(active){
  return `<nav class="bottom-nav"><div class="bottom-nav-inner">
    <button class="nav-btn ${active==='home'?'active':''}" data-nav="home"><span>●</span>Heute</button>
    <button class="nav-btn ${active==='plans'?'active':''}" data-nav="plans"><span>▦</span>Pläne</button>
    <button class="nav-btn ${active==='analytics'?'active':''}" data-nav="analytics"><span>↗</span>Analyse</button>
    <button class="nav-btn ${active==='more'?'active':''}" data-nav="more"><span>•••</span>Mehr</button>
  </div></nav>`;
}
const mediaCredit = () => `<footer class="media-credit">Übungsmedien: <a href="https://ascendapi.com" target="_blank" rel="noopener">AscendAPI / ExerciseDB</a></footer>`;
const empty = (title,text) => `<div class="empty"><strong>${title}</strong><p>${text}</p></div>`;

function render(){
  clearInterval(state.restTimer);
  const bare=['workout','planEditor'].includes(state.view);
  const content = state.view==='home' ? homeView() : state.view==='plans' ? plansView() : state.view==='planEditor' ? planEditorView() : state.view==='workout' ? workoutView() : state.view==='analytics' ? analyticsView() : state.view==='body' ? bodyView() : state.view==='backup' ? backupView() : state.view==='settings' ? settingsView() : moreView();
  $app.innerHTML=topbar()+content+(bare?'':nav(state.view==='body'||state.view==='backup'||state.view==='settings'?'more':state.view));
  bind();
  if(state.view==='analytics') requestAnimationFrame(drawAnalytics);
  if(state.view==='body') requestAnimationFrame(drawBodyChart);
  if(state.view==='workout') startRestTicker();
}

function homeView(){
  const plan=activePlan(), history=read(LS.history,[]), last=history[0], weekStart=Date.now()-7*864e5;
  const week=history.filter(x=>new Date(x.finishedAt)>weekStart);
  return `<main class="shell">
    <section class="hero"><div class="eyebrow">${esc(plan.name)} · aktiver Plan</div><h1>STÄRKER.<br>JEDEN SATZ.</h1><p>Plane frei. Trainiere fokussiert. Sieh, wie dein Volumen wächst.</p></section>
    <section class="stats-strip"><div><b>${week.length}</b><span>Trainings / 7 Tage</span></div><div><b>${Math.round(week.reduce((s,x)=>s+(x.volume||volumeOf(x)),0)).toLocaleString('de-DE')}</b><span>kg Volumen</span></div><div><b>${history.length}</b><span>gesamt</span></div></section>
    <section class="section"><div class="section-head"><div><span class="eyebrow">Heute</span><h2>Training wählen</h2></div><button class="text-btn" data-nav="plans">Plan ändern</button></div>
      ${plan.days.length?`<div class="day-grid">${plan.days.map((d,i)=>`<button class="day-card" ${d.exercises.length?`data-start="${d.id}" data-plan="${plan.id}"`:'disabled'}><div><span class="day-count">0${i+1}</span><h3>${esc(d.name)}</h3><p>${esc(d.subtitle||`${d.exercises.length} Übungen`)}</p></div><span class="arrow">${d.exercises.length?'→':'Leer'}</span></button>`).join('')}</div>`:empty('Noch kein Trainingstag','Füge deinem Plan einen Trainingstag hinzu.')}
    </section>
    ${last?`<section class="section"><div class="section-head"><h2>Letztes Training</h2><button class="text-btn" data-nav="analytics">Alle Daten</button></div><div class="history-card"><div><span class="eyebrow">${fmtLong(last.finishedAt)}</span><h3>${esc(last.dayName||last.day)}</h3></div><div class="history-metrics"><b>${Math.round(last.volume||volumeOf(last)).toLocaleString('de-DE')} kg</b><span>${last.totalSets||0} Sätze</span></div></div></section>`:''}
    ${mediaCredit()}</main>`;
}

function plansView(){
  const data=allPlans();
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Programm</span><h1>Deine Pläne</h1><p>Erstelle beliebig viele Pläne und lege einen davon als aktiv fest.</p></div><button class="primary" id="newPlan">+ Neuer Plan</button></section>
  <div class="plan-list">${data.items.map(p=>`<article class="plan-card ${p.id===data.activePlanId?'selected':''}"><div><div class="eyebrow">${p.id===data.activePlanId?'Aktiver Plan':'Trainingsplan'}</div><h2>${esc(p.name)}</h2><p>${p.days.length} Tage · ${p.days.reduce((n,d)=>n+d.exercises.length,0)} Übungen</p></div><div class="card-actions">${p.id!==data.activePlanId?`<button class="secondary" data-activate-plan="${p.id}">Aktivieren</button>`:''}<button class="secondary" data-edit-plan="${p.id}">Bearbeiten</button><button class="icon-btn" data-copy-plan="${p.id}" title="Duplizieren">⧉</button>${data.items.length>1?`<button class="icon-btn danger" data-delete-plan="${p.id}" title="Löschen">×</button>`:''}</div></article>`).join('')}</div></main>`;
}

function planEditorView(){
  const p=allPlans().items.find(x=>x.id===state.editPlanId);
  if(!p){state.view='plans';return plansView();}
  return `<main class="shell"><div class="backrow"><button class="back" data-nav="plans">←</button><span>Plan bearbeiten</span></div>
    <section class="editor-title"><label><span>Name des Plans</span><input id="planName" value="${esc(p.name)}" maxlength="60"></label><label><span>Beschreibung</span><input id="planDescription" value="${esc(p.description||'')}" maxlength="100"></label></section>
    <div class="editor-days">${p.days.map((d,di)=>`<section class="editor-day" data-day-index="${di}"><div class="editor-day-head"><div class="grow"><input class="day-name" value="${esc(d.name)}" aria-label="Name des Trainingstags"><input class="day-subtitle" value="${esc(d.subtitle||'')}" placeholder="z. B. Rücken · Bizeps"></div><button class="icon-btn danger" data-remove-day="${di}">×</button></div>
      <div class="editor-exercises">${d.exercises.map((ex,ei)=>exerciseEditor(ex,di,ei)).join('')}</div><button class="secondary full" data-add-exercise="${di}">+ Übung hinzufügen</button></section>`).join('')}</div>
    <div class="editor-footer"><button class="secondary" id="addDay">+ Trainingstag</button><button class="primary" id="savePlan">Plan speichern</button></div></main>`;
}

function exerciseEditor(ex,di,ei){
  return `<div class="exercise-editor" data-ex-index="${ei}"><div class="drag-actions"><button class="tiny" data-move="up" data-day="${di}" data-ex="${ei}">↑</button><button class="tiny" data-move="down" data-day="${di}" data-ex="${ei}">↓</button></div><div class="exercise-fields"><label class="wide"><span>Übung</span><input data-prop="name" value="${esc(ex.name)}"></label><label><span>Sätze</span><input data-prop="sets" type="number" min="1" max="12" value="${ex.sets}"></label><label><span>Wdh.</span><input data-prop="range" value="${esc(ex.range)}"></label><label><span>Pause s</span><input data-prop="rest" type="number" min="0" max="600" value="${ex.rest||''}" placeholder="Standard"></label><label class="wide"><span>Hinweis</span><input data-prop="note" value="${esc(ex.note||'')}"></label><label class="wide"><span>Demo-URL (optional)</span><input data-prop="gif" value="${esc(ex.gif||'')}"></label></div><button class="icon-btn danger" data-remove-exercise="${di}:${ei}">×</button></div>`;
}

function freshSession(planId,dayId){
  const plan=allPlans().items.find(p=>p.id===planId), day=plan.days.find(d=>d.id===dayId), history=read(LS.history,[]);
  const last=history.find(h=>h.planId===planId&&h.dayId===dayId);
  return {id:uid(),planId,planName:plan.name,dayId,dayName:day.name,startedAt:new Date().toISOString(),current:0,markers:{deload:false,ill:false,pain:false},entries:day.exercises.map(ex=>{
    const previous=last?.entries?.find(e=>e.exerciseId===ex.id);
    return {exerciseId:ex.id,name:ex.name,note:'',sets:Array.from({length:ex.sets},(_,i)=>({weight:previous?.sets?.filter(s=>!s.warmup)?.[i]?.weight??'',reps:'',rir:'',done:false,warmup:false}))};
  })};
}
function activeSession(){
  const saved=read(LS.active,null);
  if(saved?.planId===state.planId&&saved?.dayId===state.dayId)return saved;
  const fresh=freshSession(state.planId,state.dayId);write(LS.active,fresh);return fresh;
}
function suggestion(ex,entry){
  const history=read(LS.history,[]), previous=history.find(h=>h.planId===state.planId&&h.entries?.some(e=>e.exerciseId===ex.id))?.entries.find(e=>e.exerciseId===ex.id);
  if(!previous)return {text:'Starte konservativ und lasse 2–3 Wiederholungen im Tank.',weight:null};
  const work=previous.sets.filter(s=>!s.warmup&&s.done), max=rangeMax(ex.range), best=Math.max(...work.map(s=>number(s.weight)),0);
  const ready=work.length&&work.every(s=>number(s.reps)>=max)&&work.reduce((a,s)=>a+number(s.rir),0)/work.length>=1;
  const inc=['squat','romanian-deadlift'].includes(ex.id)?5:number(read(LS.settings,{increment:2.5}).increment)||2.5;
  return ready?{text:`Progression: ${best+inc} kg versuchen`,weight:best+inc}:{text:`Ziel: ${best} kg bestätigen und Wiederholungen steigern`,weight:best};
}

function workoutView(){
  const day=getDay(state.planId,state.dayId); if(!day?.exercises.length){state.view='home';return homeView();}
  const session=activeSession(); state.exerciseIndex=Math.min(state.exerciseIndex,day.exercises.length-1);
  const ex=day.exercises[state.exerciseIndex], entry=session.entries.find(e=>e.exerciseId===ex.id), done=session.entries.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0), total=session.entries.reduce((n,e)=>n+e.sets.length,0), suggest=suggestion(ex,entry);
  const prev=read(LS.history,[]).find(h=>h.planId===state.planId&&h.entries?.some(e=>e.exerciseId===ex.id))?.entries.find(e=>e.exerciseId===ex.id);
  return `<main class="workout-shell" id="swipeArea"><div class="workout-top"><button class="back" id="exitWorkout">←</button><div><span>${esc(day.name)}</span><b>${state.exerciseIndex+1} / ${day.exercises.length}</b></div><button class="text-btn" id="finishWorkout">Beenden</button></div>
    <div class="progress-line"><i style="width:${((state.exerciseIndex+1)/day.exercises.length)*100}%"></i></div>
    <div class="marker-row"><label><input type="checkbox" data-marker="deload" ${session.markers.deload?'checked':''}> Deload</label><label><input type="checkbox" data-marker="ill" ${session.markers.ill?'checked':''}> Krank</label><label><input type="checkbox" data-marker="pain" ${session.markers.pain?'checked':''}> Schmerzen</label></div>
    <section class="guided-card"><div class="guided-head"><div><span class="eyebrow">${esc(day.name)}</span><h1>${esc(ex.name)}</h1><p>${ex.sets} × ${esc(ex.range)} Wdh.</p></div><button class="favorite ${ex.favorite?'active':''}" id="favoriteExercise" aria-label="Favorit">★</button></div>
      ${ex.gif?`<div class="exercise-media"><img src="${esc(ex.gif)}" alt="Ausführung ${esc(ex.name)}"><span>Demo</span></div>`:''}
      ${ex.note?`<p class="coach-note">${esc(ex.note)}</p>`:''}
      <div class="suggestion"><div><span>Progressive Overload</span><b>${esc(suggest.text)}</b></div>${suggest.weight!==null?`<button class="tiny" id="applySuggestion" data-weight="${suggest.weight}">Übernehmen</button>`:''}</div>
      <div class="set-list">${entry.sets.map((set,i)=>setRow(set,i,prev?.sets?.filter(s=>!s.warmup)?.[i])).join('')}</div>
      <button class="secondary full" id="addWarmup">+ Aufwärmsatz</button>
      <label class="notes-field"><span>Notiz zu dieser Übung</span><textarea id="exerciseNote" placeholder="Technik, Geräteeinstellung, Gefühl …">${esc(entry.note||'')}</textarea></label>
    </section>
    <div class="workout-nav"><button class="secondary" id="prevExercise" ${state.exerciseIndex===0?'disabled':''}>← Zurück</button><button class="primary" id="nextExercise">${state.exerciseIndex===day.exercises.length-1?'Training abschließen':'Nächste Übung →'}</button></div>
    <div class="rest-timer ${state.restUntil>Date.now()?'show':''}" id="restTimer"><div><span>Pause</span><b id="restCount">0:00</b></div><button data-rest-add>+30</button><button data-rest-skip>Überspringen</button></div>
  </main>`;
}
function setRow(set,i,last){
  return `<div class="set-card ${set.done?'complete':''}" data-set="${i}"><div class="set-label"><b>${set.warmup?'W':'Satz '+(i+1)}</b><label><input type="checkbox" data-set-field="warmup" data-index="${i}" ${set.warmup?'checked':''}> Warm-up</label></div><label><span>kg</span><input inputmode="decimal" type="number" step="0.5" min="0" data-set-field="weight" data-index="${i}" value="${set.weight}"></label><label><span>Wdh.</span><input inputmode="numeric" type="number" min="0" data-set-field="reps" data-index="${i}" value="${set.reps}"></label><label><span>RIR</span><input inputmode="numeric" type="number" min="0" max="10" data-set-field="rir" data-index="${i}" value="${set.rir}"></label><button class="set-check" data-set-done="${i}" aria-label="Satz fertig">${set.done?'✓':'○'}</button>${last?`<small>Zuletzt ${last.weight||'–'} kg × ${last.reps||'–'}</small>`:''}</div>`;
}

function analyticsView(){
  const history=read(LS.history,[]), body=read(LS.body,[]), exNames=[...new Set(history.flatMap(h=>h.entries?.map(e=>e.name)||[]))];
  const selected=state.analyticsExercise||exNames[0]||'';state.analyticsExercise=selected;
  const totalVolume=history.reduce((s,h)=>s+(h.volume||volumeOf(h)),0);
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Fortschritt</span><h1>Analyse</h1><p>Volumen, Kraftentwicklung und Körpergewicht auf einen Blick.</p></div></section>
    <section class="metric-grid"><div><b>${history.length}</b><span>Trainings</span></div><div><b>${Math.round(totalVolume).toLocaleString('de-DE')}</b><span>kg Gesamtvolumen</span></div><div><b>${history.reduce((n,h)=>n+(h.totalSets||0),0)}</b><span>Sätze</span></div></section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Pro Training</span><h2>Trainingsvolumen</h2></div></div>${history.length?'<canvas id="volumeChart" height="220"></canvas>':empty('Noch keine Daten','Schließe dein erstes Training ab.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Geschätztes 1RM</span><h2>Kraftverlauf</h2></div><select id="analyticsExercise">${exNames.map(n=>`<option ${n===selected?'selected':''}>${esc(n)}</option>`).join('')}</select></div>${selected?'<canvas id="strengthChart" height="220"></canvas>':empty('Noch keine Übung','Trainingsdaten erscheinen automatisch hier.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Körper</span><h2>Gewicht</h2></div><button class="text-btn" data-nav="body">Eintragen</button></div>${body.some(x=>x.weight)?'<canvas id="weightChart" height="190"></canvas>':empty('Noch kein Gewicht','Erfasse deine erste Messung.')}</section>
    <section class="section"><div class="section-head"><h2>Verlauf</h2></div>${history.length?`<div class="history-list">${history.map(h=>`<article class="history-card"><div><span class="eyebrow">${fmtLong(h.finishedAt)}</span><h3>${esc(h.dayName||h.day)}</h3><p>${[h.markers?.deload?'Deload':'',h.markers?.ill?'Krank':'',h.markers?.pain?'Schmerzen':''].filter(Boolean).join(' · ')||esc(h.planName||'')}</p></div><div class="history-metrics"><b>${Math.round(h.volume||volumeOf(h)).toLocaleString('de-DE')} kg</b><span>${h.totalSets||0} Sätze · ${Math.round((h.duration||0)/60)} min</span></div></article>`).join('')}</div>`:empty('Noch kein Verlauf','Deine abgeschlossenen Trainings landen hier.')}</section></main>`;
}

function moreView(){
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Volumora</span><h1>Mehr</h1><p>Alles für Körperdaten, Sicherung und deine App-Einstellungen.</p></div></section><div class="menu-list"><button data-nav="body"><span>◎</span><div><b>Körper & Fotos</b><small>Gewicht, Maße und Fortschrittsbilder</small></div><i>→</i></button><button data-nav="backup"><span>⇅</span><div><b>Export & Backup</b><small>JSON sichern, CSV exportieren, Backup einspielen</small></div><i>→</i></button><button data-nav="settings"><span>◐</span><div><b>Einstellungen</b><small>Design, Pause und Gewichtsschritte</small></div><i>→</i></button></div><section class="about-card"><img src="assets/brand/volumora-mark.png" alt="Volumora Logo"><div><b>Volumora</b><p>Deine Trainingsdaten bleiben ausschließlich lokal auf diesem Gerät, bis du selbst ein Backup exportierst.</p></div></section>${mediaCredit()}</main>`;
}

function bodyView(){
  const entries=read(LS.body,[]);
  return `<main class="shell"><div class="backrow"><button class="back" data-nav="more">←</button><span>Körper & Fotos</span></div><section class="page-head compact"><div><span class="eyebrow">Entwicklung</span><h1>Körperdaten</h1><p>Private Messungen und Bilder – nur lokal gespeichert.</p></div></section>
    <form class="body-form" id="bodyForm"><label><span>Datum</span><input type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></label><label><span>Gewicht (kg)</span><input type="number" step="0.1" name="weight"></label><label><span>Taille (cm)</span><input type="number" step="0.1" name="waist"></label><label><span>Brust (cm)</span><input type="number" step="0.1" name="chest"></label><label><span>Arm (cm)</span><input type="number" step="0.1" name="arm"></label><label><span>Oberschenkel (cm)</span><input type="number" step="0.1" name="thigh"></label><label class="photo-field"><span>Fortschrittsfoto</span><input type="file" name="photo" accept="image/*"></label><button class="primary" type="submit">Messung speichern</button></form>
    ${entries.some(x=>x.weight)?'<section class="chart-card"><h2>Gewichtsverlauf</h2><canvas id="bodyChart" height="210"></canvas></section>':''}
    <section class="body-grid">${entries.map(e=>`<article class="body-entry">${e.photo?`<img src="${e.photo}" alt="Fortschritt vom ${fmtDate(e.date)}">`:'<div class="photo-placeholder">Kein Foto</div>'}<div><span class="eyebrow">${fmtDate(e.date)}</span><h3>${e.weight?`${e.weight} kg`:'Messung'}</h3><p>${[['Taille',e.waist],['Brust',e.chest],['Arm',e.arm],['Bein',e.thigh]].filter(x=>x[1]).map(x=>`${x[0]} ${x[1]} cm`).join(' · ')||'Keine Maße'}</p></div><button class="icon-btn danger" data-delete-body="${e.id}">×</button></article>`).join('')}</section></main>`;
}

function backupView(){
  return `<main class="shell narrow"><div class="backrow"><button class="back" data-nav="more">←</button><span>Export & Backup</span></div><section class="page-head compact"><div><span class="eyebrow">Deine Daten</span><h1>Sichern & mitnehmen</h1><p>Ein JSON-Backup enthält Pläne, Trainings, Einstellungen und Körperdaten inklusive Fotos.</p></div></section><div class="backup-grid"><button class="action-tile" id="exportJson"><span>↓</span><b>Vollständiges Backup</b><small>JSON herunterladen</small></button><button class="action-tile" id="exportCsv"><span>↓</span><b>Training als Tabelle</b><small>CSV herunterladen</small></button><label class="action-tile"><span>↑</span><b>Backup einspielen</b><small>JSON auswählen</small><input type="file" id="importJson" accept="application/json,.json"></label></div><div class="warning"><b>Wichtig</b><p>Beim Import werden die aktuellen lokalen Daten überschrieben. Exportiere vorher ein Backup, wenn du sie behalten möchtest.</p></div></main>`;
}

function settingsView(){
  const s=read(LS.settings,{theme:'auto',rest:90,increment:2.5});
  return `<main class="shell narrow"><div class="backrow"><button class="back" data-nav="more">←</button><span>Einstellungen</span></div><section class="page-head compact"><div><span class="eyebrow">App</span><h1>Einstellungen</h1></div></section><form class="settings-form" id="settingsForm"><label><span>Darstellung</span><select name="theme"><option value="auto" ${s.theme==='auto'?'selected':''}>Automatisch</option><option value="light" ${s.theme==='light'?'selected':''}>Hell</option><option value="dark" ${s.theme==='dark'?'selected':''}>Dunkel</option></select></label><label><span>Standard-Pause</span><div class="unit-input"><input name="rest" type="number" min="0" max="600" value="${s.rest}"><i>Sek.</i></div></label><label><span>Standard-Gewichtsschritt</span><div class="unit-input"><input name="increment" type="number" min="0.25" step="0.25" value="${s.increment}"><i>kg</i></div></label><button class="primary" type="submit">Speichern</button></form><button class="secondary full install-settings" id="installHelp">Volumora auf dem Homescreen installieren</button></main>`;
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{state.view=b.dataset.nav;render();});
  document.querySelector('#quickTheme')?.addEventListener('click',()=>{const s=read(LS.settings,{});s.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';write(LS.settings,s);applyTheme();render();});
  document.querySelector('#installBtn')?.addEventListener('click',async()=>{await state.installPrompt?.prompt();state.installPrompt=null;render();});
  document.querySelector('#installHelp')?.addEventListener('click',()=>alert('iPhone/iPad: In Safari „Teilen“ → „Zum Home-Bildschirm“.\nAndroid: Browser-Menü → „App installieren“ oder „Zum Startbildschirm hinzufügen“.'));
  document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{state.planId=b.dataset.plan;state.dayId=b.dataset.start;state.exerciseIndex=0;state.view='workout';render();});
  bindPlans(); bindEditor(); bindWorkout(); bindBody(); bindBackup(); bindSettings();
  document.querySelector('#analyticsExercise')?.addEventListener('change',e=>{state.analyticsExercise=e.target.value;drawAnalytics();});
}

function bindPlans(){
  document.querySelector('#newPlan')?.addEventListener('click',()=>{const data=allPlans(),p={id:uid(),name:'Mein Trainingsplan',description:'',createdAt:new Date().toISOString(),days:[]};data.items.push(p);savePlans(data);state.editPlanId=p.id;state.view='planEditor';render();});
  document.querySelectorAll('[data-edit-plan]').forEach(b=>b.onclick=()=>{state.editPlanId=b.dataset.editPlan;state.view='planEditor';render();});
  document.querySelectorAll('[data-activate-plan]').forEach(b=>b.onclick=()=>{const d=allPlans();d.activePlanId=b.dataset.activatePlan;savePlans(d);render();});
  document.querySelectorAll('[data-copy-plan]').forEach(b=>b.onclick=()=>{const d=allPlans(),p=clone(d.items.find(x=>x.id===b.dataset.copyPlan));p.id=uid();p.name+=' – Kopie';p.days.forEach(day=>{day.id=uid();day.exercises.forEach(ex=>ex.id=uid());});d.items.push(p);savePlans(d);render();});
  document.querySelectorAll('[data-delete-plan]').forEach(b=>b.onclick=()=>{if(!confirm('Diesen Trainingsplan wirklich löschen?'))return;const d=allPlans();d.items=d.items.filter(x=>x.id!==b.dataset.deletePlan);if(d.activePlanId===b.dataset.deletePlan)d.activePlanId=d.items[0].id;savePlans(d);render();});
}

function collectPlan(){
  const data=allPlans(),p=data.items.find(x=>x.id===state.editPlanId);p.name=document.querySelector('#planName').value.trim()||'Mein Trainingsplan';p.description=document.querySelector('#planDescription').value.trim();
  document.querySelectorAll('.editor-day').forEach((el,di)=>{const d=p.days[di];d.name=el.querySelector('.day-name').value.trim()||`Tag ${di+1}`;d.subtitle=el.querySelector('.day-subtitle').value.trim();el.querySelectorAll('.exercise-editor').forEach((row,ei)=>{const ex=d.exercises[ei];row.querySelectorAll('[data-prop]').forEach(input=>ex[input.dataset.prop]=input.dataset.prop==='sets'||input.dataset.prop==='rest'?number(input.value):input.value.trim());});});savePlans(data);return p;
}
function persistPlan(plan){const data=allPlans(),index=data.items.findIndex(x=>x.id===plan.id);data.items[index]=plan;savePlans(data);}
function bindEditor(){
  if(state.view!=='planEditor')return;
  document.querySelector('#savePlan').onclick=()=>{collectPlan();state.view='plans';render();};
  document.querySelector('#addDay').onclick=()=>{const p=collectPlan();p.days.push({id:uid(),name:`Tag ${p.days.length+1}`,subtitle:'',exercises:[]});persistPlan(p);render();};
  document.querySelectorAll('[data-remove-day]').forEach(b=>b.onclick=()=>{const p=collectPlan();p.days.splice(number(b.dataset.removeDay),1);persistPlan(p);render();});
  document.querySelectorAll('[data-add-exercise]').forEach(b=>b.onclick=()=>{const p=collectPlan(),d=p.days[number(b.dataset.addExercise)];d.exercises.push(exercise(uid(),'Neue Übung',3,'8–12','',''));persistPlan(p);render();});
  document.querySelectorAll('[data-remove-exercise]').forEach(b=>b.onclick=()=>{const [di,ei]=b.dataset.removeExercise.split(':').map(Number),p=collectPlan();p.days[di].exercises.splice(ei,1);persistPlan(p);render();});
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const p=collectPlan(),list=p.days[number(b.dataset.day)].exercises,i=number(b.dataset.ex),j=b.dataset.move==='up'?i-1:i+1;if(j>=0&&j<list.length)[list[i],list[j]]=[list[j],list[i]];persistPlan(p);render();});
}

function mutateSession(fn,rerender=false){const s=activeSession();fn(s);write(LS.active,s);if(rerender)render();}
function bindWorkout(){
  if(state.view!=='workout')return;
  document.querySelectorAll('[data-marker]').forEach(x=>x.onchange=()=>mutateSession(s=>s.markers[x.dataset.marker]=x.checked));
  document.querySelectorAll('[data-set-field]').forEach(x=>x.oninput=()=>mutateSession(s=>{const e=s.entries[state.exerciseIndex],set=e.sets[number(x.dataset.index)];set[x.dataset.setField]=x.type==='checkbox'?x.checked:x.value;}));
  document.querySelectorAll('[data-set-done]').forEach(b=>b.onclick=()=>mutateSession(s=>{const set=s.entries[state.exerciseIndex].sets[number(b.dataset.setDone)];set.done=!set.done;if(set.done){const ex=getDay(state.planId,state.dayId).exercises[state.exerciseIndex];state.restUntil=Date.now()+(number(ex.rest)||number(read(LS.settings,{rest:90}).rest)||90)*1000;navigator.vibrate?.(40);}},true));
  document.querySelector('#exerciseNote').oninput=e=>mutateSession(s=>s.entries[state.exerciseIndex].note=e.target.value);
  document.querySelector('#addWarmup').onclick=()=>mutateSession(s=>s.entries[state.exerciseIndex].sets.unshift({weight:'',reps:'',rir:'',done:false,warmup:true}),true);
  document.querySelector('#applySuggestion')?.addEventListener('click',e=>mutateSession(s=>s.entries[state.exerciseIndex].sets.filter(x=>!x.warmup).forEach(x=>x.weight=e.currentTarget.dataset.weight),true));
  document.querySelector('#favoriteExercise').onclick=()=>{const d=allPlans(),ex=d.items.find(p=>p.id===state.planId).days.find(x=>x.id===state.dayId).exercises[state.exerciseIndex];ex.favorite=!ex.favorite;savePlans(d);render();};
  document.querySelector('#prevExercise').onclick=()=>{state.exerciseIndex--;render();};
  document.querySelector('#nextExercise').onclick=()=>state.exerciseIndex===getDay(state.planId,state.dayId).exercises.length-1?finishWorkout():nextExercise();
  document.querySelector('#finishWorkout').onclick=finishWorkout;
  document.querySelector('#exitWorkout').onclick=()=>{state.view='home';render();};
  document.querySelector('[data-rest-add]')?.addEventListener('click',()=>{state.restUntil+=30000;updateRest();});
  document.querySelector('[data-rest-skip]')?.addEventListener('click',()=>{state.restUntil=0;document.querySelector('#restTimer')?.classList.remove('show');});
  let startX=0;const area=document.querySelector('#swipeArea');area.ontouchstart=e=>startX=e.touches[0].clientX;area.ontouchend=e=>{const dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>80){dx<0?nextExercise():state.exerciseIndex>0&&(state.exerciseIndex--,render());}};
}
function nextExercise(){const max=getDay(state.planId,state.dayId).exercises.length-1;if(state.exerciseIndex<max){state.exerciseIndex++;render();}}
function finishWorkout(){
  const s=activeSession(), done=s.entries.reduce((n,e)=>n+e.sets.filter(x=>x.done).length,0);if(!done&&!confirm('Noch kein Satz ist erledigt. Training trotzdem speichern?'))return;
  s.finishedAt=new Date().toISOString();s.duration=Math.max(60,Math.round((new Date(s.finishedAt)-new Date(s.startedAt))/1000));s.totalSets=done;s.volume=volumeOf(s);s.entries.forEach(e=>e.sets.forEach(x=>x.rpe=x.rir===''?'':10-number(x.rir)));
  const h=read(LS.history,[]);h.unshift(s);write(LS.history,h);localStorage.removeItem(LS.active);state.view='analytics';render();
}
function startRestTicker(){updateRest();state.restTimer=setInterval(updateRest,1000);}
function updateRest(){const box=document.querySelector('#restTimer'),count=document.querySelector('#restCount');if(!box||!count)return;const left=Math.max(0,Math.ceil((state.restUntil-Date.now())/1000));box.classList.toggle('show',left>0);count.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;if(left===0&&state.restUntil){navigator.vibrate?.([100,80,100]);state.restUntil=0;}}

function bindBody(){
  document.querySelector('#bodyForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get('photo'),entry={id:uid(),date:new Date(`${f.get('date')}T12:00:00`).toISOString(),weight:number(f.get('weight'))||'',waist:number(f.get('waist'))||'',chest:number(f.get('chest'))||'',arm:number(f.get('arm'))||'',thigh:number(f.get('thigh'))||'',photo:''};if(file?.size)entry.photo=await compressImage(file);const a=read(LS.body,[]);a.unshift(entry);write(LS.body,a);render();});
  document.querySelectorAll('[data-delete-body]').forEach(b=>b.onclick=()=>{if(!confirm('Diese Messung löschen?'))return;write(LS.body,read(LS.body,[]).filter(x=>x.id!==b.dataset.deleteBody));render();});
}
function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,900/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.72));URL.revokeObjectURL(img.src);};img.onerror=reject;img.src=URL.createObjectURL(file);});}

function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function bindBackup(){
  document.querySelector('#exportJson')?.addEventListener('click',()=>download(`volumora-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:2,exportedAt:new Date().toISOString(),plans:allPlans(),history:read(LS.history,[]),body:read(LS.body,[]),settings:read(LS.settings,{})},null,2),'application/json'));
  document.querySelector('#exportCsv')?.addEventListener('click',()=>{const rows=[['Datum','Plan','Training','Übung','Satz','Typ','Gewicht kg','Wiederholungen','RIR','RPE','Volumen kg']];read(LS.history,[]).forEach(h=>h.entries.forEach(e=>e.sets.forEach((s,i)=>rows.push([h.finishedAt,h.planName,h.dayName,e.name,i+1,s.warmup?'Warm-up':'Arbeit',s.weight,s.reps,s.rir,s.rpe,number(s.weight)*number(s.reps)]))));download(`volumora-training-${new Date().toISOString().slice(0,10)}.csv`,rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(';')).join('\n'),'text/csv;charset=utf-8');});
  document.querySelector('#importJson')?.addEventListener('change',async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!data.plans?.items||!Array.isArray(data.history))throw new Error();if(!confirm('Aktuelle lokale Daten durch dieses Backup ersetzen?'))return;write(LS.plans,data.plans);write(LS.history,data.history);write(LS.body,data.body||[]);write(LS.settings,data.settings||{theme:'auto',rest:90,increment:2.5});applyTheme();alert('Backup wurde erfolgreich importiert.');state.view='home';render();}catch{alert('Diese Datei ist kein gültiges Volumora-Backup.');}});
}
function bindSettings(){document.querySelector('#settingsForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);write(LS.settings,{theme:f.get('theme'),rest:number(f.get('rest')),increment:number(f.get('increment'))});applyTheme();render();});}

function lineChart(canvas,points,{label='',color='#007d48',suffix='',fill=true}={}){
  if(!canvas||!points.length)return;const dpr=devicePixelRatio||1,w=canvas.clientWidth||600,h=Number(canvas.getAttribute('height'))||220;canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);const pad={l:46,r:16,t:24,b:34},vals=points.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1,x=i=>pad.l+(i/Math.max(1,points.length-1))*(w-pad.l-pad.r),y=v=>pad.t+(1-(v-min)/span)*(h-pad.t-pad.b);
  c.clearRect(0,0,w,h);c.font='12px system-ui';c.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line');c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted');c.lineWidth=1;
  for(let i=0;i<3;i++){const yy=pad.t+i*(h-pad.t-pad.b)/2;c.beginPath();c.moveTo(pad.l,yy);c.lineTo(w-pad.r,yy);c.stroke();const val=max-i*span/2;c.fillText(`${Math.round(val)}${suffix}`,4,yy+4);}
  c.beginPath();points.forEach((p,i)=>i?c.lineTo(x(i),y(p.value)):c.moveTo(x(i),y(p.value)));c.lineWidth=3;c.strokeStyle=color;c.stroke();
  if(fill){c.lineTo(x(points.length-1),h-pad.b);c.lineTo(x(0),h-pad.b);c.closePath();c.globalAlpha=.1;c.fillStyle=color;c.fill();c.globalAlpha=1;}
  points.forEach((p,i)=>{c.beginPath();c.arc(x(i),y(p.value),4,0,Math.PI*2);c.fillStyle=color;c.fill();});c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted');const indexes=points.length>4?[0,Math.floor((points.length-1)/2),points.length-1]:points.map((_,i)=>i);indexes.forEach(i=>{const text=points[i].label;c.fillText(text,Math.max(pad.l-4,Math.min(x(i)-16,w-50)),h-10);});
}
function drawAnalytics(){
  const history=read(LS.history,[]).slice().reverse();lineChart(document.querySelector('#volumeChart'),history.slice(-12).map(h=>({label:fmtDate(h.finishedAt),value:Math.round(h.volume||volumeOf(h))})),{suffix:' kg'});
  const strength=history.map(h=>{const e=h.entries?.find(x=>x.name===state.analyticsExercise),best=Math.max(...(e?.sets||[]).filter(s=>s.done&&!s.warmup).map(s=>number(s.weight)*(1+number(s.reps)/30)),0);return best?{label:fmtDate(h.finishedAt),value:Math.round(best)}:null;}).filter(Boolean);lineChart(document.querySelector('#strengthChart'),strength.slice(-12),{color:'#f08a3c',suffix:' kg'});
  const body=read(LS.body,[]).filter(x=>x.weight).slice().reverse();lineChart(document.querySelector('#weightChart'),body.map(x=>({label:fmtDate(x.date),value:number(x.weight)})),{color:'#5b6ee1',suffix:' kg'});
}
function drawBodyChart(){const body=read(LS.body,[]).filter(x=>x.weight).slice().reverse();lineChart(document.querySelector('#bodyChart'),body.map(x=>({label:fmtDate(x.date),value:number(x.weight)})),{color:'#5b6ee1',suffix:' kg'});}

initialise();render();
