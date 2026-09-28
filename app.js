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

const CATEGORY_BY_ID = {
  'chest-press':'Brust','incline-chest-press':'Brust','triceps-pushdown':'Arme',
  'cable-external-rotation':'Schulter','scaption-raise':'Schulter',
  'lat-pulldown-neutral':'Rücken','seated-cable-row':'Rücken','high-row-machine':'Rücken',
  'ez-bar-curl':'Arme','hammer-curl':'Arme','squat':'Beine','romanian-deadlift':'Beine',
  'leg-curl':'Beine','leg-extension':'Beine','calf-raise':'Beine','leg-raise':'Core'
};
const CATEGORY_LABELS={chest:'Brust',back:'Rücken',shoulders:'Schulter','upper arms':'Arme','upper legs':'Beine','lower legs':'Beine',waist:'Core',cardio:'Ausdauer'};
const EQUIPMENT_LABELS={barbell:'Langhantel',dumbbell:'Kurzhanteln',cable:'Kabelzug','body weight':'Körpergewicht','leverage machine':'Maschine','sled machine':'Beinpresse','ez barbell':'SZ-Stange',band:'Band',weighted:'Zusatzgewicht','wheel roller':'Ab-Roller'};
const GERMAN_EXERCISE_NAMES=`Bankdrücken mit Langhantel|Schrägbankdrücken mit Langhantel|Negativbankdrücken mit Langhantel|Bankdrücken mit Kurzhanteln|Schrägbankdrücken mit Kurzhanteln|Negativbankdrücken mit Kurzhanteln|Kurzhantel-Flys|Schrägbank-Flys|Kabel-Flys stehend|Kabel-Flys auf Brusthöhe|Brust-Dips|Liegestütze|Erhöhte Liegestütze|Negative Liegestütze|Brustpresse|Klimmzüge|Klimmzüge im Untergriff|Latzug|Latzug im Untergriff|Überzüge am Kabel|Kabelrudern sitzend|Kabelrudern breit|Langhantelrudern vorgebeugt|Pendlay Rows|Kurzhantelrudern vorgebeugt|Einarmiges Kurzhantelrudern|Rudermaschine sitzend|T-Bar Rudern an der Maschine|Face Pulls am Kabel|Shrugs mit Langhantel|Shrugs mit Kurzhanteln|Schulterdrücken mit Langhantel sitzend|Military Press breit|Schulterdrücken mit Kurzhanteln|Arnold Press|Seitheben mit Kurzhanteln|Seitheben am Kabel|Frontheben mit Kurzhanteln|Frontheben am Kabel|Reverse Flys vorgebeugt|Reverse Flys mit Kurzhanteln|Aufrechtes Rudern mit Langhantel|Aufrechtes Rudern am Kabel|Bizepscurls mit Langhantel|Bizepscurls mit SZ-Stange|Bizepscurls mit Kurzhanteln|Hammercurls|Schrägbank-Curls|Konzentrationscurls|Preacher Curls mit Kurzhantel|Bizepscurls am Kabel|Hammercurls am Kabel|Enges Bankdrücken|Bank-Dips|Diamant-Liegestütze|Trizepsdrücken mit V-Griff|Trizepsdrücken mit geradem Griff|Trizepsdrücken mit Seil|Skull Crusher mit Langhantel|Trizepsstrecken liegend mit Kurzhanteln|Trizeps-Kickbacks|Kniebeugen mit Langhantel|Frontkniebeugen|Rumänisches Kreuzheben mit Langhantel|Kreuzheben mit Langhantel|Sumo-Kreuzheben|Ausfallschritte mit Langhantel|Rückwärts-Ausfallschritte mit Langhantel|Goblet Squats|Ausfallschritte mit Kurzhanteln|Rückwärts-Ausfallschritte mit Kurzhanteln|Rumänisches Kreuzheben mit Kurzhanteln|Kreuzheben mit Kurzhanteln|Einbeiniges Kreuzheben mit Kurzhantel|Einbeinige Beinpresse|Beinpresse 45°|Beinstrecker|Beinbeuger liegend|Beinbeuger sitzend|Hip Thrust mit Langhantel|Glute Bridge mit Langhantel|Glute Bridge am Boden|Sprungkniebeugen|Gehende Ausfallschritte|Bulgarian Split Squats|Step-ups mit Kurzhanteln|Wadenheben mit Langhantel|Wadenheben sitzend|Wadenheben stehend|Plank mit Zusatzgewicht|Seitstütz erhöht|Crunches am Boden|Negativ-Crunches|Bicycle Crunches mit Band|Russian Twists|Beinheben hängend|Beinheben am Captain's Chair|Kabel-Crunches kniend|Ab-Wheel Rollout|Mountain Climbers`.split('|');
const titleCase=value=>String(value).replace(/\b\w/g,c=>c.toUpperCase()).replace('Ez ','SZ-');
const sourceLibrary=window.VOLUMORA_EXERCISES?.length?window.VOLUMORA_EXERCISES:DEFAULT_PLAN.days.flatMap(day=>day.exercises.map(ex=>({...ex,category:CATEGORY_BY_ID[ex.id]||'Sonstige'})));
const EXERCISE_LIBRARY=sourceLibrary.map((ex,index)=>{const category=CATEGORY_LABELS[ex.category]||ex.category,equipment=EQUIPMENT_LABELS[ex.equipment]||ex.equipment||'';return {...ex,name:window.VOLUMORA_EXERCISES?.length?(GERMAN_EXERCISE_NAMES[index]||titleCase(ex.name)):titleCase(ex.name),sourceName:ex.name,category,equipment,sets:ex.sets||3,range:ex.range||(category==='Core'||ex.target==='calves'?'12–15':'8–12'),note:ex.note||equipment,favorite:false};});

const LS = {plans:'volumora-plans-v2', history:'volumora-history-v2', active:'volumora-active-v2', body:'volumora-body-v2', settings:'volumora-settings-v2', exercisePrefs:'volumora-exercise-prefs-v1'};
const $app = document.querySelector('#app');
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate = iso => new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(iso));
const fmtLong = iso => new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(iso));
const dateKey = value => { const d=new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const number = value => Number(String(value ?? '').replace(',','.')) || 0;
const rangeMax = range => Math.max(...String(range).match(/\d+/g)?.map(Number) || [12]);
const volumeOf = session => session.entries?.reduce((sum, entry) => sum + entry.sets.reduce((s,set) => s + (set.warmup||!set.done ? 0 : number(set.weight)*number(set.reps)),0),0) || 0;
const allPlans = () => read(LS.plans,{activePlanId:DEFAULT_PLAN.id,items:[clone(DEFAULT_PLAN)]});
const savePlans = plans => write(LS.plans,plans);
const activePlan = () => { const data=allPlans(); return data.items.find(p=>p.id===data.activePlanId) || data.items[0]; };
const getDay = (planId,dayId) => allPlans().items.find(p=>p.id===planId)?.days.find(d=>d.id===dayId);
const WEEKDAYS=['Mo','Di','Mi','Do','Fr','Sa','So'];
const scheduleSlots=count=>({1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4],6:[0,1,2,3,4,5]}[count]||[]);
const planSchedule=plan=>plan?.schedule||{mode:'flexible',assignments:{}};
const scheduleLabel=plan=>{const schedule=planSchedule(plan);return schedule.mode==='fixed'?plan.days.map(d=>WEEKDAYS[schedule.assignments?.[d.id]]).filter(Boolean).join(' · ')||'Feste Tage':'Flexible Reihenfolge';};
let state = {view:'home', planId:null, dayId:null, exerciseIndex:0, editPlanId:null, editorDayIndex:0, libraryDayIndex:null, replaceExerciseIndex:null, libraryCategory:'Alle', assistantStep:1, assistantDraft:null, assistantPreview:null, installPrompt:null, restUntil:0, restTimer:null};

function initialise(){
  if(!localStorage.getItem(LS.plans)) savePlans({activePlanId:DEFAULT_PLAN.id,items:[clone(DEFAULT_PLAN)]});
  const old=read('ppl-history-v1',[]);
  if(old.length && !localStorage.getItem(LS.history)) write(LS.history,old.map(s=>({...s,id:uid(),planId:DEFAULT_PLAN.id,planName:DEFAULT_PLAN.name,dayId:s.day,dayName:s.day?.[0].toUpperCase()+s.day?.slice(1),volume:volumeOf(s)})));
  if(!localStorage.getItem(LS.settings)) write(LS.settings,{theme:'auto',rest:90,increment:2.5,showRir:false,restTimer:false});
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
if('serviceWorker' in navigator){
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload();}});
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(reg=>reg.update()));
}

function topbar(){
  return `<header class="topbar"><div class="topbar-inner"><button class="brand" data-nav="home"><img src="assets/brand/volumora-mark.png" alt=""><span>VOLUMORA</span></button><div class="top-actions"><button class="icon-btn" id="quickTheme" aria-label="Farbschema wechseln">◐</button>${state.installPrompt?'<button class="compact-btn" id="installBtn">Installieren</button>':''}</div></div></header>`;
}
function nav(active){
  return `<nav class="bottom-nav"><div class="bottom-nav-inner">
    <button class="nav-btn ${active==='home'?'active':''}" data-nav="home"><span>●</span>Heute</button>
    <button class="nav-btn ${active==='plans'?'active':''}" data-nav="plans"><span>▦</span>Plan</button>
    <button class="nav-btn ${active==='analytics'?'active':''}" data-nav="analytics"><span>↗</span>Verlauf</button>
    <button class="nav-btn ${active==='more'?'active':''}" data-nav="more"><span>•••</span>Mehr</button>
  </div></nav>`;
}
const mediaCredit = () => `<footer class="media-credit">Übungsmedien: <a href="https://github.com/YaKohen/exercises-dataset" target="_blank" rel="noopener">Exercises Dataset</a></footer>`;
const empty = (title,text) => `<div class="empty"><strong>${title}</strong><p>${text}</p></div>`;

function render(){
  clearInterval(state.restTimer);
  const viewChanged=state.lastRenderedView!==state.view;state.lastRenderedView=state.view;
  if(viewChanged)window.scrollTo(0,0);
  const bare=['workout','planEditor','assistant'].includes(state.view);
  const content = state.view==='home' ? homeView() : state.view==='plans' ? plansView() : state.view==='assistant' ? assistantView() : state.view==='planEditor' ? planEditorView() : state.view==='workout' ? workoutView() : state.view==='analytics' ? analyticsView() : state.view==='body' ? bodyView() : state.view==='calendar' ? calendarView() : state.view==='backup' ? backupView() : state.view==='settings' ? settingsView() : moreView();
  $app.innerHTML=(state.view==='workout'?'':topbar())+content+(bare?'':nav(state.view==='calendar'?'analytics':['body','backup','settings'].includes(state.view)?'more':state.view));
  bind();
  if(viewChanged)requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  if(state.view==='analytics') requestAnimationFrame(drawAnalytics);
  if(state.view==='body') requestAnimationFrame(drawBodyChart);
  if(state.view==='workout') startRestTicker();
}

function homeView(){
  const today=new Date(), monday=new Date(today);monday.setDate(today.getDate()-((today.getDay()+6)%7));monday.setHours(0,0,0,0);
  const plan=activePlan(), history=read(LS.history,[]), last=history[0], week=history.filter(x=>new Date(x.finishedAt)>=monday), lastPlanSession=history.find(x=>x.planId===plan?.id), lastIndex=plan?.days.findIndex(d=>d.id===lastPlanSession?.dayId)??-1,schedule=planSchedule(plan),todayWeekday=(today.getDay()+6)%7,todayDone=history.some(h=>h.planId===plan?.id&&dateKey(h.finishedAt)===dateKey(today));
  let next=plan?.days?.length?plan.days[lastIndex>=0?(lastIndex+1)%plan.days.length:0]:null,nextLabel='Als Nächstes';
  if(schedule.mode==='fixed'){const scheduledToday=plan.days.find(d=>schedule.assignments?.[d.id]===todayWeekday);if(scheduledToday&&!todayDone){next=scheduledToday;nextLabel='Heute geplant';}else{for(let offset=1;offset<=7;offset++){const target=(todayWeekday+offset)%7,found=plan.days.find(d=>schedule.assignments?.[d.id]===target);if(found){next=found;nextLabel=`Als Nächstes · ${WEEKDAYS[target]}`;break;}}}}
  const readyDays=plan?.days?.filter(d=>d.exercises.length)||[],weekVolume=Math.round(week.reduce((s,x)=>s+(x.volume||volumeOf(x)),0));if(next&&!next.exercises.length&&readyDays.length)next=readyDays[0];
  return `<main class="shell home-shell">
    <section class="home-intro"><div><span class="eyebrow">${esc(plan?.name||'Volumora')}</span><h1>Heute</h1></div><button class="text-btn" data-nav="plans">Plan ändern</button></section>
    ${next?`<section class="next-card ${next.exercises.length?'':'empty-plan-card'}"><div><span class="next-label">${esc(next.exercises.length?nextLabel:'Plan vervollständigen')}</span><h2>${esc(next.name)}</h2><p>${next.exercises.length?`${next.exercises.length} Übungen · ${next.exercises.reduce((sum,ex)=>sum+number(ex.sets),0)} Sätze · ${esc(scheduleLabel(plan))}`:'Wähle die Übungen aus, mit denen du starten möchtest.'}</p></div><button class="primary start-main" ${next.exercises.length?`data-start="${next.id}" data-plan="${plan.id}"`:'id="editActivePlan"'}>${next.exercises.length?'Training starten':'Übungen auswählen'} <span>→</span></button></section>`:empty('Noch kein Training','Erstelle einen Plan, um loszulegen.')}
    ${readyDays.length?`<section class="home-week-summary"><div class="section-title"><h2>Diese Woche</h2><button class="text-btn" data-nav="calendar">Kalender</button></div><div class="week-summary"><div><b>${week.length} / ${readyDays.length}</b><span>Trainings</span></div><div class="week-progress"><i style="width:${Math.min(100,(week.length/readyDays.length)*100)}%"></i></div>${weekVolume?`<strong>${weekVolume.toLocaleString('de-DE')} kg</strong>`:''}</div></section>`:''}
    ${readyDays.filter(d=>d.id!==next?.id).length?`<section class="other-days"><div class="section-title"><h2>Weitere Einheiten</h2></div>${readyDays.filter(d=>d.id!==next?.id).map(d=>`<button data-start="${d.id}" data-plan="${plan.id}"><span><b>${esc(d.name)}</b><small>${d.exercises.length} Übungen · ${d.exercises.reduce((sum,ex)=>sum+number(ex.sets),0)} Sätze</small></span><i>→</i></button>`).join('')}</section>`:''}
    ${last?`<button class="last-session" data-nav="analytics"><span><small>Zuletzt · ${fmtLong(last.finishedAt)}</small><b>${esc(last.dayName||last.day)}</b></span><span><b>${Math.round(last.volume||volumeOf(last)).toLocaleString('de-DE')} kg</b><small>${last.totalSets||0} Sätze</small></span></button>`:''}
    </main>`;
}

function plansView(){
  const data=allPlans();
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Programm</span><h1>Dein Plan</h1><p>Ein klarer Wochenrhythmus und alle Einheiten an einem Ort.</p></div><div class="card-actions"><button class="secondary" id="planAssistant">Plan-Assistent</button><button class="primary" id="newPlan">+ Eigener Plan</button></div></section>
  <div class="plan-list">${data.items.map(p=>{const count=p.days.reduce((n,d)=>n+d.exercises.length,0);return `<article class="plan-card ${p.id===data.activePlanId?'selected':''}"><div><div class="eyebrow">${p.id===data.activePlanId?'Aktiver Plan':'Trainingsplan'}</div><h2>${esc(p.name)}</h2><p>${esc(scheduleLabel(p))} · ${p.days.length} ${p.days.length===1?'Tag':'Tage'} · ${count} ${count===1?'Übung':'Übungen'}</p></div><div class="card-actions">${p.id!==data.activePlanId?`<button class="secondary" data-activate-plan="${p.id}">Aktivieren</button>`:''}<button class="secondary" data-edit-plan="${p.id}">Bearbeiten</button><button class="icon-btn" data-copy-plan="${p.id}" title="Duplizieren">⧉</button>${data.items.length>1?`<button class="icon-btn danger" data-delete-plan="${p.id}" title="Löschen">×</button>`:''}</div></article>`;}).join('')}</div></main>`;
}

function assistantView(){
  const step=state.assistantStep||1,draft=state.assistantDraft||{goal:'muscle',days:3},progress=`<div class="assistant-progress"><i class="active"></i><i class="${step>=2?'active':''}"></i><i class="${step>=3?'active':''}"></i><span>Schritt ${step} von 3</span></div>`;
  if(step===2)return `<main class="shell narrow"><div class="backrow"><button class="back" id="assistantBack">←</button><span>Plan-Assistent</span></div>${progress}<section class="assistant-hero"><span class="eyebrow">Wochenrhythmus</span><h1>Wann trainierst du?</h1><p>Feste Tage geben Orientierung. Flexibel bedeutet: einfach immer mit der nächsten Einheit weitermachen.</p></section><form id="assistantScheduleForm" class="assistant-form"><fieldset><label><input type="radio" name="scheduleMode" value="flexible" checked><span><b>Flexible Reihenfolge</b><small>Wenn deine Trainingstage wechseln</small></span></label><label><input type="radio" name="scheduleMode" value="fixed"><span><b>Feste Wochentage</b><small>${draft.days} Einheiten sinnvoll über die Woche verteilt</small></span></label></fieldset><button class="primary full" type="submit">Vorschau anzeigen</button></form></main>`;
  if(step===3&&state.assistantPreview){const p=state.assistantPreview,schedule=planSchedule(p);return `<main class="shell narrow"><div class="backrow"><button class="back" id="assistantBack">←</button><span>Plan-Assistent</span></div>${progress}<section class="assistant-hero preview-head"><span class="eyebrow">Dein Vorschlag</span><h1>${esc(p.name)}</h1><p>${esc(scheduleLabel(p))}. Sofort verwenden oder vorher anpassen.</p></section><div class="plan-preview">${p.days.map((d,i)=>`<article><span>${schedule.mode==='fixed'?WEEKDAYS[schedule.assignments[d.id]]:i+1}</span><div><h2>${esc(d.name)}</h2><p>${d.exercises.map(x=>esc(x.name)).join(' · ')}</p></div><b>${d.exercises.length}</b></article>`).join('')}</div><div class="preview-actions"><button class="primary" id="useSuggestedPlan">Plan verwenden</button><button class="secondary" id="customizeSuggestedPlan">Erst anpassen</button></div></main>`;}
  return `<main class="shell narrow"><div class="backrow"><button class="back" data-nav="plans">←</button><span>Plan-Assistent</span></div>${progress}<section class="assistant-hero"><span class="eyebrow">Ziel und Umfang</span><h1>Was möchtest du erreichen?</h1><p>Volumora erstellt daraus einen einfachen, ausgewogenen Startplan.</p></section><form id="assistantForm" class="assistant-form"><fieldset><label><input type="radio" name="goal" value="muscle" ${draft.goal==='muscle'?'checked':''}><span><b>Muskelaufbau</b><small>Ausgewogenes Volumen und 8–12 Wiederholungen</small></span></label><label><input type="radio" name="goal" value="strength" ${draft.goal==='strength'?'checked':''}><span><b>Kraft</b><small>Schwere Grundübungen mit längeren Pausen</small></span></label><label><input type="radio" name="goal" value="fitness" ${draft.goal==='fitness'?'checked':''}><span><b>Allgemeine Fitness</b><small>Mehr Wiederholungen und kompakte Einheiten</small></span></label></fieldset><label class="days-choice"><span>Trainingstage pro Woche</span><select name="days">${[2,3,4,5,6].map(n=>`<option value="${n}" ${number(draft.days)===n?'selected':''}>${n} Trainingstage</option>`).join('')}</select></label><button class="primary full" type="submit">Weiter</button></form></main>`;
}

function createSuggestedPlan(goal,dayCount,scheduleMode='flexible'){
  const groups={
    push:['barbell bench press','dumbbell incline bench press','dumbbell seated shoulder press','dumbbell lateral raise','cable pushdown (with rope attachment)','dumbbell lying triceps extension'],
    pull:['pull-up','cable seated row','barbell bent over row','cable standing rear delt row (with rope)','barbell curl','dumbbell hammer curl'],
    legs:['barbell full squat','barbell romanian deadlift','lever alternate leg press','lever lying leg curl','lever leg extension','barbell standing calf raise'],
    upperA:['barbell bench press','pull-up','dumbbell seated shoulder press','cable seated row','dumbbell biceps curl','cable pushdown (with rope attachment)'],
    upperB:['dumbbell incline bench press','barbell bent over row','dumbbell lateral raise','cable pulldown','dumbbell hammer curl','barbell close-grip bench press'],
    lowerA:['barbell full squat','barbell romanian deadlift','dumbbell lunge','lever leg extension','lever seated leg curl','lever seated calf raise'],
    lowerB:['barbell deadlift','dumbbell goblet squat','dumbbell single leg split squat','barbell glute bridge','lever lying leg curl','bodyweight standing calf raise'],
    fullA:['barbell full squat','barbell bench press','cable seated row','dumbbell lateral raise','dumbbell biceps curl','cable kneeling crunch'],
    fullB:['barbell romanian deadlift','dumbbell incline bench press','pull-up','dumbbell lunge','cable pushdown (with rope attachment)','hanging leg raise']
  };
  const layouts={2:[['Ganzkörper A','fullA'],['Ganzkörper B','fullB']],3:[['Push','push'],['Pull','pull'],['Beine','legs']],4:[['Oberkörper A','upperA'],['Unterkörper A','lowerA'],['Oberkörper B','upperB'],['Unterkörper B','lowerB']],5:[['Push','push'],['Pull','pull'],['Beine','legs'],['Oberkörper','upperB'],['Unterkörper','lowerB']],6:[['Push A','push'],['Pull A','pull'],['Beine A','legs'],['Push B','push'],['Pull B','pull'],['Beine B','lowerB']]};
  const days=layouts[dayCount].map(([name,key])=>({id:uid(),name,subtitle:'Automatisch erstellt',exercises:groups[key].map(sourceName=>{const source=EXERCISE_LIBRARY.find(x=>x.sourceName===sourceName);const compound=/press|squat|deadlift|row|pull-up/.test(sourceName),range=goal==='strength'&&compound?'4–6':goal==='fitness'?'10–15':'8–12';return {...clone(source),id:uid(),libraryId:source.id,sets:goal==='fitness'?3:compound?4:3,range,rest:goal==='strength'?150:goal==='fitness'?60:90};})}));
  const assignments={};scheduleSlots(dayCount).forEach((weekday,i)=>assignments[days[i].id]=weekday);
  return {id:uid(),name:`${goal==='strength'?'Kraft':goal==='fitness'?'Fitness':'Muskelaufbau'} · ${dayCount} Tage`,description:'Vom Volumora Plan-Assistenten erstellt',createdAt:new Date().toISOString(),schedule:{mode:scheduleMode,assignments},days};
}

function planEditorView(){
  const p=allPlans().items.find(x=>x.id===state.editPlanId);
  if(!p){state.view='plans';return plansView();}
  const schedule=planSchedule(p);state.editorDayIndex=Math.min(state.editorDayIndex,p.days.length-1);const di=Math.max(0,state.editorDayIndex),d=p.days[di];
  return `<main class="shell simple-editor"><div class="backrow"><button class="back" data-nav="plans">←</button><span>Plan bearbeiten</span></div>
    <section class="simple-plan-head"><label><span>Name des Plans</span><input id="planName" value="${esc(p.name)}" maxlength="60"></label><p>Lege deine Trainingstage an und wähle anschließend Übungen aus der Bibliothek.</p><input id="planDescription" type="hidden" value="${esc(p.description||'')}"></section>
    <section class="schedule-editor"><div><span class="eyebrow">Wochenrhythmus</span><h2>Wann möchtest du trainieren?</h2></div><div class="schedule-mode"><label><input type="radio" name="planScheduleMode" value="flexible" ${schedule.mode!=='fixed'?'checked':''}> Flexibel</label><label><input type="radio" name="planScheduleMode" value="fixed" ${schedule.mode==='fixed'?'checked':''}> Feste Tage</label></div><div class="schedule-days" id="scheduleDays" ${schedule.mode==='fixed'?'':'hidden'}>${p.days.map((d,i)=>`<label><span>${esc(d.name)}</span><select data-schedule-day="${d.id}">${WEEKDAYS.map((name,weekday)=>`<option value="${weekday}" ${(schedule.assignments?.[d.id]??scheduleSlots(p.days.length)[i])===weekday?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}</div></section>
    <div class="editor-day-tabs">${p.days.map((day,i)=>`<button class="${i===di?'active':''}" data-editor-day="${i}"><span>${i+1}</span>${esc(day.name)}</button>`).join('')}</div>
    ${d?`<div class="editor-days"><section class="editor-day" data-day-index="${di}"><div class="simple-day-head"><div><span class="day-number">Tag ${di+1} von ${p.days.length}</span><input class="day-name" value="${esc(d.name)}" aria-label="Name des Trainingstags"><input class="day-subtitle" value="${esc(d.subtitle||'')}" placeholder="Optional: z. B. Rücken · Bizeps"></div><button class="icon-btn danger" data-remove-day="${di}" aria-label="Trainingstag löschen">×</button></div>
      <div class="editor-exercises">${d.exercises.length?d.exercises.map((ex,ei)=>exerciseEditor(ex,di,ei)).join(''):empty('Noch keine Übungen','Wähle Übungen aus der Bibliothek aus.')}</div><button class="choose-exercise" data-add-exercise="${di}"><span>＋</span><div><b>Übung auswählen</b><small>Bibliothek durchsuchen</small></div><i>→</i></button></section></div>`:''}
    <button class="add-day-card" id="addDay">＋ Neuer Trainingstag</button>
    <div class="editor-footer"><span>${p.days.length} ${p.days.length===1?'Trainingstag':'Trainingstage'}</span><button class="primary" id="savePlan">Fertig</button></div></main>${state.libraryDayIndex!==null?libraryView(p):''}`;
}

function exerciseEditor(ex,di,ei){
  return `<article class="plan-exercise-row" data-ex-index="${ei}">${ex.gif?`<img src="${esc(ex.gif)}" alt="">`:'<div class="custom-exercise-icon">＋</div>'}<div class="plan-exercise-main">${ex.custom?`<input class="custom-name" data-prop="name" value="${esc(ex.name)}" aria-label="Name der eigenen Übung">`:`<h3>${esc(ex.name)}</h3>`}<span>${esc(ex.category||CATEGORY_BY_ID[ex.libraryId||ex.id]||'Übung')}</span><div class="quick-fields"><label><span>Sätze</span><input data-prop="sets" type="number" min="1" max="12" value="${ex.sets}"></label><label><span>Wiederholungen</span><input data-prop="range" value="${esc(ex.range)}"></label></div><button class="swap-link" data-replace-exercise="${di}:${ei}">↻ Übung ersetzen</button><details><summary>Weitere Einstellungen</summary><div class="detail-fields"><label><span>Pause in Sekunden</span><input data-prop="rest" type="number" min="0" max="600" value="${ex.rest||''}" placeholder="Standard"></label><label><span>Eigener Hinweis</span><input data-prop="note" value="${esc(ex.note||'')}"></label></div></details></div><div class="row-actions"><button class="tiny" data-move="up" data-day="${di}" data-ex="${ei}" aria-label="Nach oben">↑</button><button class="tiny" data-move="down" data-day="${di}" data-ex="${ei}" aria-label="Nach unten">↓</button><button class="tiny danger" data-remove-exercise="${di}:${ei}" aria-label="Übung entfernen">×</button></div></article>`;
}

function libraryView(plan){
  const day=plan.days[state.libraryDayIndex],categories=['Alle','Brust','Rücken','Schulter','Arme','Beine','Core','Ausdauer'],prefs=read(LS.exercisePrefs,{favorites:[],recent:[]});
  const sorted=EXERCISE_LIBRARY.slice().sort((a,b)=>(prefs.favorites.includes(b.id)-prefs.favorites.includes(a.id))||(prefs.recent.indexOf(a.id)<0?99:prefs.recent.indexOf(a.id))-(prefs.recent.indexOf(b.id)<0?99:prefs.recent.indexOf(b.id)));
  return `<div class="library-backdrop"><section class="exercise-library" role="dialog" aria-modal="true" aria-label="Übung auswählen"><div class="library-head"><div><span class="eyebrow">${state.replaceExerciseIndex!==null?'Ersatz wählen':esc(day?.name||'Trainingstag')} · ${EXERCISE_LIBRARY.length} Übungen</span><h2>${state.replaceExerciseIndex!==null?'Übung ersetzen':'Übung auswählen'}</h2></div><button class="icon-btn" id="closeLibrary" aria-label="Schließen">×</button></div><label class="library-search"><span>⌕</span><input id="librarySearch" type="search" placeholder="Name, Muskel oder Gerät …" autocomplete="off"></label><div class="category-chips">${categories.map(c=>`<button class="${state.libraryCategory===c?'active':''}" data-library-category="${c}">${c}</button>`).join('')}</div><div class="library-list">${sorted.map(ex=>{const added=day?.exercises.some(x=>(x.libraryId||x.id)===ex.id),favorite=prefs.favorites.includes(ex.id);return `<article class="library-item" data-category="${ex.category}" data-search="${esc(`${ex.name} ${ex.sourceName||''} ${ex.category} ${ex.equipment||''} ${ex.target||''}`.toLowerCase())}"><img src="${esc(ex.gif)}" alt=""><div><h3>${esc(ex.name)}</h3><span>${ex.category} · ${esc(ex.equipment||'')} · ${ex.sets} × ${esc(ex.range)}</span></div><div class="library-actions"><button class="star ${favorite?'active':''}" data-library-favorite="${ex.id}" aria-label="Favorit">★</button><button class="${added&&state.replaceExerciseIndex===null?'added':''}" data-pick-exercise="${ex.id}" ${added&&state.replaceExerciseIndex===null?'disabled':''}>${added&&state.replaceExerciseIndex===null?'✓':'＋'}</button></div></article>`;}).join('')}</div><button class="custom-exercise-button" id="addCustomExercise">＋ Eigene Übung ohne Animation</button><button class="primary full library-done" id="closeLibraryBottom">Fertig</button></section></div>`;
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
  const hasRir=work.some(s=>s.rir!==''&&s.rir!==undefined),ready=work.length&&work.every(s=>number(s.reps)>=max)&&(!hasRir||work.reduce((a,s)=>a+number(s.rir),0)/work.length>=1);
  const inc=['squat','romanian-deadlift'].includes(ex.id)?5:number(read(LS.settings,{increment:2.5}).increment)||2.5;
  return ready?{text:`Progression: ${best+inc} kg versuchen`,weight:best+inc}:{text:`Ziel: ${best} kg bestätigen und Wiederholungen steigern`,weight:best};
}

function workoutView(){
  const day=getDay(state.planId,state.dayId); if(!day?.exercises.length){state.view='home';return homeView();}
  const session=activeSession(),settings=read(LS.settings,{theme:'auto',rest:90,increment:2.5,showRir:false}),showRir=!!settings.showRir;
  const completedExercises=session.entries.filter(e=>e.sets.some(s=>!s.warmup)&&e.sets.filter(s=>!s.warmup).every(s=>s.done)).length;
  const exerciseList=day.exercises.map((ex,index)=>{const entry=session.entries.find(e=>e.exerciseId===ex.id),work=entry.sets.filter(s=>!s.warmup),doneSets=work.filter(s=>s.done).length,complete=work.length&&doneSets===work.length,suggest=suggestion(ex,entry),prev=read(LS.history,[]).find(h=>h.planId===state.planId&&h.entries?.some(e=>e.exerciseId===ex.id))?.entries.find(e=>e.exerciseId===ex.id);return `<section class="workout-exercise ${complete?'complete':''}" id="exercise-${index}">
      <div class="workout-exercise-head"><span class="exercise-number">${complete?'✓':index+1}</span><div><small>Übung ${index+1} von ${day.exercises.length}</small><h2>${esc(ex.name)}</h2><p>${ex.sets} × ${esc(ex.range)} Wdh.</p></div><button class="favorite ${ex.favorite?'active':''}" data-favorite-exercise="${index}" aria-label="Favorit">★</button></div>
      ${ex.gif?`<details class="technique compact-technique"><summary><img src="${esc(ex.gif)}" alt=""><span><b>Technik</b><small>${esc(ex.note||'Bewegungsablauf ansehen')}</small></span><i>⌄</i></summary><div class="exercise-media"><img src="${esc(ex.gif)}" alt="Ausführung ${esc(ex.name)}"></div></details>`:ex.note?`<p class="coach-note">${esc(ex.note)}</p>`:''}
      ${suggest.weight!==null?`<div class="progression-row compact-progression"><span>↗</span><div><small>Empfehlung</small><b>${esc(suggest.text)}</b></div><button class="tiny" data-apply-suggestion="${index}" data-weight="${suggest.weight}">Nutzen</button></div>`:''}
      <div class="set-table ${showRir?'':'no-rir'}"><div class="set-head"><span>Satz</span><span>kg</span><span>Wdh.</span>${showRir?'<span>RIR</span>':''}<span></span></div><div class="set-list">${entry.sets.map((set,i)=>setRow(set,i,prev?.sets?.filter(s=>!s.warmup)?.[i],entry.sets.slice(0,i).filter(s=>!s.warmup).length+1,showRir,index)).join('')}</div></div>
      <div class="exercise-tools"><button class="text-btn" data-add-warmup="${index}">+ Aufwärmsatz</button><button class="text-btn" data-auto-warmup="${index}">Aufwärmen berechnen</button></div>
      <details class="exercise-notes" ${entry.note?'open':''}><summary>${entry.note?'Notiz bearbeiten':'＋ Notiz hinzufügen'}</summary><textarea data-exercise-note="${index}" placeholder="Technik, Geräteeinstellung, Gefühl …">${esc(entry.note||'')}</textarea></details>
    </section>`;}).join('');
  return `<main class="workout-shell" id="swipeArea"><div class="workout-top"><button class="back" id="exitWorkout">←</button><div><span>${esc(day.name)}</span><b>${completedExercises} / ${day.exercises.length} Übungen</b></div><div class="workout-top-actions"><button class="icon-btn" id="quickTheme" aria-label="Farbschema wechseln">◐</button><button class="text-btn" id="finishWorkout">Beenden</button></div></div>
    <div class="progress-line"><i style="width:${(completedExercises/day.exercises.length)*100}%"></i></div>
    <div class="workout-options"><details class="session-status"><summary>Tagesform <span>optional</span></summary><div class="marker-row"><label><input type="checkbox" data-marker="deload" ${session.markers.deload?'checked':''}> Deload</label><label><input type="checkbox" data-marker="ill" ${session.markers.ill?'checked':''}> Krank</label><label><input type="checkbox" data-marker="pain" ${session.markers.pain?'checked':''}> Schmerzen</label></div></details><button class="optional-field" id="toggleRir">${showRir?'RIR ausblenden':'RIR einblenden'}</button></div>
    <div class="workout-exercise-list">${exerciseList}</div>
    <div class="rest-timer ${state.restUntil>Date.now()?'show':''}" id="restTimer"><div><span>Pause</span><b id="restCount">0:00</b></div><button data-rest-add>+30</button><button data-rest-skip>Überspringen</button></div>
  </main>`;
}
function setRow(set,i,last,workIndex,showRir=false,exerciseIndex=0){
  const workNumber=set.warmup?'W':workIndex;
  return `<div class="set-row"><button class="set-delete" data-delete-set="${i}" data-exercise="${exerciseIndex}" aria-label="Satz löschen">Löschen</button><div class="set-card ${set.done?'complete':''} ${set.warmup?'warmup':''}" data-set="${i}"><div class="set-label"><b>${workNumber}</b><span>${set.warmup?'Warm-up':''}</span></div><label><span>kg</span><input aria-label="Gewicht Satz ${workNumber}" inputmode="decimal" type="number" step="0.5" min="0" data-set-field="weight" data-exercise="${exerciseIndex}" data-index="${i}" value="${set.weight}"></label><label><span>Wdh.</span><input aria-label="Wiederholungen Satz ${workNumber}" inputmode="numeric" type="number" min="0" data-set-field="reps" data-exercise="${exerciseIndex}" data-index="${i}" value="${set.reps}"></label>${showRir?`<label><span>RIR</span><input aria-label="RIR Satz ${workNumber}" inputmode="numeric" type="number" min="0" max="10" data-set-field="rir" data-exercise="${exerciseIndex}" data-index="${i}" value="${set.rir}"></label>`:''}<button class="set-check" data-set-done="${i}" data-exercise="${exerciseIndex}" aria-label="Satz fertig">${set.done?'✓':'○'}</button>${last?`<small>Zuletzt ${last.weight||'–'} kg × ${last.reps||'–'}</small>`:''}</div></div>`;
}

function analyticsView(){
  const history=read(LS.history,[]), body=read(LS.body,[]), exNames=[...new Set(history.flatMap(h=>h.entries?.map(e=>e.name)||[]))];
  const selected=state.analyticsExercise||exNames[0]||'';state.analyticsExercise=selected;
  const totalVolume=history.reduce((s,h)=>s+(h.volume||volumeOf(h)),0);
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Trainingstagebuch</span><h1>Verlauf</h1><p>Abgeschlossene Trainings und deine Entwicklung an einem Ort.</p></div><button class="secondary" data-nav="calendar">Kalender öffnen</button></section>
    <section class="metric-grid"><div><b>${history.length}</b><span>Trainings</span></div><div><b>${Math.round(totalVolume).toLocaleString('de-DE')}</b><span>kg Gesamtvolumen</span></div><div><b>${history.reduce((n,h)=>n+(h.totalSets||0),0)}</b><span>Sätze</span></div></section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Pro Training</span><h2>Trainingsvolumen</h2></div></div>${history.length?'<canvas id="volumeChart" height="220"></canvas>':empty('Noch keine Daten','Schließe dein erstes Training ab.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Geschätztes 1RM</span><h2>Kraftverlauf</h2></div><select id="analyticsExercise">${exNames.map(n=>`<option ${n===selected?'selected':''}>${esc(n)}</option>`).join('')}</select></div>${selected?'<canvas id="strengthChart" height="220"></canvas>':empty('Noch keine Übung','Trainingsdaten erscheinen automatisch hier.')}</section>
    <section class="chart-card"><div class="section-head"><div><span class="eyebrow">Körper</span><h2>Gewicht</h2></div><button class="text-btn" data-nav="body">Eintragen</button></div>${body.some(x=>x.weight)?'<canvas id="weightChart" height="190"></canvas>':empty('Noch kein Gewicht','Erfasse deine erste Messung.')}</section>
    <section class="section"><div class="section-head"><h2>Verlauf</h2></div>${history.length?`<div class="history-list">${history.map(h=>`<article class="history-card"><div><span class="eyebrow">${fmtLong(h.finishedAt)}</span><h3>${esc(h.dayName||h.day)}</h3><p>${[h.markers?.deload?'Deload':'',h.markers?.ill?'Krank':'',h.markers?.pain?'Schmerzen':''].filter(Boolean).join(' · ')||esc(h.planName||'')}</p></div><div class="history-metrics"><b>${Math.round(h.volume||volumeOf(h)).toLocaleString('de-DE')} kg</b><span>${h.totalSets||0} Sätze · ${Math.round((h.duration||0)/60)} min</span></div></article>`).join('')}</div>`:empty('Noch kein Verlauf','Deine abgeschlossenen Trainings landen hier.')}</section></main>`;
}

function moreView(){
  return `<main class="shell"><section class="page-head"><div><span class="eyebrow">Volumora</span><h1>Mehr</h1><p>Körperdaten, Sicherung und Einstellungen.</p></div></section><div class="menu-list"><button data-nav="body"><span>◎</span><div><b>Körper & Fotos</b><small>Gewicht, Maße und Fortschrittsbilder</small></div><i>→</i></button><button data-nav="backup"><span>⇅</span><div><b>Export & Backup</b><small>JSON sichern, CSV exportieren, Backup einspielen</small></div><i>→</i></button><button data-nav="settings"><span>◐</span><div><b>Einstellungen</b><small>Design, Pause und Gewichtsschritte</small></div><i>→</i></button></div><section class="about-card"><img src="assets/brand/volumora-mark.png" alt="Volumora Logo"><div><b>Volumora</b><p>Deine Trainingsdaten bleiben ausschließlich lokal auf diesem Gerät, bis du selbst ein Backup exportierst.</p></div></section>${mediaCredit()}</main>`;
}

function calendarView(){
  const history=read(LS.history,[]),plan=activePlan(),now=new Date(),year=now.getFullYear(),month=now.getMonth(),first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
  const sessions=new Map();history.forEach(h=>{const date=new Date(h.finishedAt),key=dateKey(date);if(date.getMonth()===month&&date.getFullYear()===year){const list=sessions.get(key)||[];list.push(h);sessions.set(key,list);}});
  const schedule=planSchedule(plan),fixed=schedule.mode==='fixed';
  const cells=Array.from({length:offset+days},(_,i)=>{if(i<offset)return '<div class="calendar-day blank"></div>';const d=new Date(year,month,i-offset+1),done=sessions.get(dateKey(d))||[],weekday=(d.getDay()+6)%7,plannedDay=fixed?plan.days.find(day=>schedule.assignments?.[day.id]===weekday):null;return `<div class="calendar-day ${done.length?'completed':''} ${dateKey(d)===dateKey(now)?'today':''}"><span>${d.getDate()}</span>${done.length?`<b>✓ ${esc(done[0].dayName||'Training')}</b>`:plannedDay?`<small>${esc(plannedDay.name)}</small>`:''}</div>`;});
  const upcoming=plan?.days?.map((d,i)=>`<div><span>${fixed?WEEKDAYS[schedule.assignments?.[d.id]]:(i+1)}</span><b>${esc(d.name)}</b><small>${d.exercises.length} Übungen</small></div>`).join('')||'';
  return `<main class="shell calendar-shell"><div class="backrow"><button class="back" data-nav="analytics">←</button><span>Trainingskalender</span></div><section class="calendar-head"><div><span class="eyebrow">Monatsansicht</span><h1>${new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(now)}</h1></div><div class="calendar-key">${fixed?'<span><i class="planned-dot"></i>Geplant</span>':''}<span><i class="done-dot"></i>Erledigt</span></div></section><div class="calendar-weekdays">${WEEKDAYS.map(x=>`<span>${x}</span>`).join('')}</div><section class="calendar-grid">${cells.join('')}</section><section class="calendar-plan"><div class="section-title"><h2>Wochenrhythmus</h2><small>${esc(scheduleLabel(plan))}</small></div>${upcoming||empty('Noch kein Plan','Erstelle zuerst einen Trainingsplan.')}</section></main>`;
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
  const s=read(LS.settings,{theme:'auto',rest:90,increment:2.5,restTimer:false});
  return `<main class="shell narrow"><div class="backrow"><button class="back" data-nav="more">←</button><span>Einstellungen</span></div><section class="page-head compact"><div><span class="eyebrow">App</span><h1>Einstellungen</h1></div></section><form class="settings-form" id="settingsForm"><label><span>Darstellung</span><select name="theme"><option value="auto" ${s.theme==='auto'?'selected':''}>Automatisch</option><option value="light" ${s.theme==='light'?'selected':''}>Hell</option><option value="dark" ${s.theme==='dark'?'selected':''}>Dunkel</option></select></label><label class="toggle-setting"><input name="restTimer" type="checkbox" ${s.restTimer?'checked':''}><span><b>Pausentimer</b><small>Nach einem erledigten Satz automatisch starten</small></span></label><label><span>Pausendauer</span><div class="unit-input"><input name="rest" type="number" min="0" max="600" value="${s.rest}"><i>Sek.</i></div></label><label><span>Standard-Gewichtsschritt</span><div class="unit-input"><input name="increment" type="number" min="0.25" step="0.25" value="${s.increment}"><i>kg</i></div></label><label class="toggle-setting"><input name="showRir" type="checkbox" ${s.showRir?'checked':''}><span><b>RIR anzeigen</b><small>Optionale Wiederholungsreserve beim Training</small></span></label><button class="primary" type="submit">Speichern</button></form><button class="secondary full install-settings" id="installHelp">Volumora auf dem Homescreen installieren</button></main>`;
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{state.view=b.dataset.nav;render();});
  document.querySelector('#editActivePlan')?.addEventListener('click',()=>{state.editPlanId=activePlan().id;state.editorDayIndex=0;state.view='planEditor';render();});
  document.querySelector('#quickTheme')?.addEventListener('click',()=>{const s=read(LS.settings,{});s.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';write(LS.settings,s);applyTheme();render();});
  document.querySelector('#installBtn')?.addEventListener('click',async()=>{await state.installPrompt?.prompt();state.installPrompt=null;render();});
  document.querySelector('#installHelp')?.addEventListener('click',()=>alert('iPhone/iPad: In Safari „Teilen“ → „Zum Home-Bildschirm“.\nAndroid: Browser-Menü → „App installieren“ oder „Zum Startbildschirm hinzufügen“.'));
  document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{state.planId=b.dataset.plan;state.dayId=b.dataset.start;state.exerciseIndex=0;state.view='workout';render();});
  bindPlans(); bindEditor(); bindWorkout(); bindBody(); bindBackup(); bindSettings();
  document.querySelector('#analyticsExercise')?.addEventListener('change',e=>{state.analyticsExercise=e.target.value;drawAnalytics();});
}

function bindPlans(){
  document.querySelector('#planAssistant')?.addEventListener('click',()=>{state.assistantStep=1;state.assistantDraft=null;state.assistantPreview=null;state.view='assistant';render();});
  document.querySelector('#assistantForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.assistantDraft={goal:f.get('goal'),days:number(f.get('days'))};state.assistantStep=2;render();});
  document.querySelector('#assistantScheduleForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.assistantPreview=createSuggestedPlan(state.assistantDraft.goal,state.assistantDraft.days,f.get('scheduleMode'));state.assistantStep=3;render();});
  document.querySelector('#assistantBack')?.addEventListener('click',()=>{state.assistantStep=Math.max(1,state.assistantStep-1);render();});
  const acceptSuggested=customize=>{const data=allPlans(),p=state.assistantPreview;data.items.push(p);data.activePlanId=p.id;savePlans(data);state.assistantStep=1;state.assistantDraft=null;state.assistantPreview=null;if(customize){state.editPlanId=p.id;state.editorDayIndex=0;state.view='planEditor';}else state.view='home';render();};
  document.querySelector('#useSuggestedPlan')?.addEventListener('click',()=>acceptSuggested(false));
  document.querySelector('#customizeSuggestedPlan')?.addEventListener('click',()=>acceptSuggested(true));
  document.querySelector('#newPlan')?.addEventListener('click',()=>{const data=allPlans(),day={id:uid(),name:'Training 1',subtitle:'',exercises:[]},p={id:uid(),name:'Mein Trainingsplan',description:'',createdAt:new Date().toISOString(),schedule:{mode:'flexible',assignments:{[day.id]:0}},days:[day]};data.items.push(p);savePlans(data);state.editPlanId=p.id;state.editorDayIndex=0;state.view='planEditor';render();});
  document.querySelectorAll('[data-edit-plan]').forEach(b=>b.onclick=()=>{state.editPlanId=b.dataset.editPlan;state.editorDayIndex=0;state.view='planEditor';render();});
  document.querySelectorAll('[data-activate-plan]').forEach(b=>b.onclick=()=>{const d=allPlans();d.activePlanId=b.dataset.activatePlan;savePlans(d);render();});
  document.querySelectorAll('[data-copy-plan]').forEach(b=>b.onclick=()=>{const d=allPlans(),p=clone(d.items.find(x=>x.id===b.dataset.copyPlan)),oldAssignments=p.schedule?.assignments||{},assignments={};p.id=uid();p.name+=' – Kopie';p.days.forEach(day=>{const oldId=day.id;day.id=uid();assignments[day.id]=oldAssignments[oldId];day.exercises.forEach(ex=>ex.id=uid());});p.schedule={mode:p.schedule?.mode||'flexible',assignments};d.items.push(p);savePlans(d);render();});
  document.querySelectorAll('[data-delete-plan]').forEach(b=>b.onclick=()=>{if(!confirm('Diesen Trainingsplan wirklich löschen?'))return;const d=allPlans();d.items=d.items.filter(x=>x.id!==b.dataset.deletePlan);if(d.activePlanId===b.dataset.deletePlan)d.activePlanId=d.items[0].id;savePlans(d);render();});
}

function collectPlan(){
  const data=allPlans(),p=data.items.find(x=>x.id===state.editPlanId);p.name=document.querySelector('#planName').value.trim()||'Mein Trainingsplan';p.description=document.querySelector('#planDescription').value.trim();
  const scheduleMode=document.querySelector('[name="planScheduleMode"]:checked')?.value||'flexible',assignments={};document.querySelectorAll('[data-schedule-day]').forEach(x=>assignments[x.dataset.scheduleDay]=number(x.value));p.schedule={mode:scheduleMode,assignments};
  document.querySelectorAll('.editor-day').forEach(el=>{const di=number(el.dataset.dayIndex),d=p.days[di];d.name=el.querySelector('.day-name').value.trim()||`Tag ${di+1}`;d.subtitle=el.querySelector('.day-subtitle').value.trim();el.querySelectorAll('.plan-exercise-row').forEach((row,ei)=>{const ex=d.exercises[ei];row.querySelectorAll('[data-prop]').forEach(input=>ex[input.dataset.prop]=input.dataset.prop==='sets'||input.dataset.prop==='rest'?number(input.value):input.value.trim());});});savePlans(data);return p;
}
function persistPlan(plan){const data=allPlans(),index=data.items.findIndex(x=>x.id===plan.id);data.items[index]=plan;savePlans(data);}
function bindEditor(){
  if(state.view!=='planEditor')return;
  document.querySelectorAll('[data-editor-day]').forEach(b=>b.onclick=()=>{collectPlan();state.editorDayIndex=number(b.dataset.editorDay);render();});
  document.querySelectorAll('[name="planScheduleMode"]').forEach(x=>x.onchange=()=>document.querySelector('#scheduleDays')?.toggleAttribute('hidden',x.value!=='fixed'));
  document.querySelector('#savePlan').onclick=()=>{collectPlan();state.view='plans';render();};
  document.querySelector('#addDay').onclick=()=>{const p=collectPlan(),day={id:uid(),name:`Tag ${p.days.length+1}`,subtitle:'',exercises:[]};p.days.push(day);const slots=scheduleSlots(p.days.length);p.schedule.assignments[day.id]=slots[slots.length-1]??0;state.editorDayIndex=p.days.length-1;persistPlan(p);render();};
  document.querySelectorAll('[data-remove-day]').forEach(b=>b.onclick=()=>{const p=collectPlan();p.days.splice(number(b.dataset.removeDay),1);state.editorDayIndex=Math.max(0,Math.min(state.editorDayIndex,p.days.length-1));persistPlan(p);render();});
  document.querySelectorAll('[data-add-exercise]').forEach(b=>b.onclick=()=>{collectPlan();state.libraryDayIndex=number(b.dataset.addExercise);state.replaceExerciseIndex=null;state.libraryCategory='Alle';render();});
  document.querySelectorAll('[data-replace-exercise]').forEach(b=>b.onclick=()=>{const [di,ei]=b.dataset.replaceExercise.split(':').map(Number);collectPlan();state.libraryDayIndex=di;state.replaceExerciseIndex=ei;state.libraryCategory='Alle';render();});
  document.querySelectorAll('[data-remove-exercise]').forEach(b=>b.onclick=()=>{const [di,ei]=b.dataset.removeExercise.split(':').map(Number),p=collectPlan();p.days[di].exercises.splice(ei,1);persistPlan(p);render();});
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const p=collectPlan(),list=p.days[number(b.dataset.day)].exercises,i=number(b.dataset.ex),j=b.dataset.move==='up'?i-1:i+1;if(j>=0&&j<list.length)[list[i],list[j]]=[list[j],list[i]];persistPlan(p);render();});
  document.querySelectorAll('[data-library-category]').forEach(b=>b.onclick=()=>{state.libraryCategory=b.dataset.libraryCategory;render();});
  const filterLibrary=()=>{const q=document.querySelector('#librarySearch')?.value.toLowerCase().trim()||'';document.querySelectorAll('.library-item').forEach(card=>card.hidden=(state.libraryCategory!=='Alle'&&card.dataset.category!==state.libraryCategory)||!card.dataset.search.includes(q));};
  document.querySelector('#librarySearch')?.addEventListener('input',filterLibrary);filterLibrary();
  document.querySelectorAll('[data-library-favorite]').forEach(b=>b.onclick=()=>{const prefs=read(LS.exercisePrefs,{favorites:[],recent:[]}),id=b.dataset.libraryFavorite;prefs.favorites=prefs.favorites.includes(id)?prefs.favorites.filter(x=>x!==id):[id,...prefs.favorites];write(LS.exercisePrefs,prefs);render();});
  document.querySelectorAll('[data-pick-exercise]').forEach(b=>b.onclick=()=>{const data=allPlans(),plan=data.items.find(x=>x.id===state.editPlanId),source=EXERCISE_LIBRARY.find(x=>x.id===b.dataset.pickExercise),picked={...clone(source),id:uid(),libraryId:source.id},list=plan.days[state.libraryDayIndex].exercises;if(state.replaceExerciseIndex!==null){const old=list[state.replaceExerciseIndex];picked.sets=old.sets;picked.range=old.range;picked.rest=old.rest;list[state.replaceExerciseIndex]=picked;}else list.push(picked);const prefs=read(LS.exercisePrefs,{favorites:[],recent:[]});prefs.recent=[source.id,...prefs.recent.filter(x=>x!==source.id)].slice(0,12);write(LS.exercisePrefs,prefs);savePlans(data);if(state.replaceExerciseIndex!==null){state.libraryDayIndex=null;state.replaceExerciseIndex=null;}render();});
  const closeLibrary=()=>{state.libraryDayIndex=null;state.replaceExerciseIndex=null;render();};
  document.querySelector('#closeLibrary')?.addEventListener('click',closeLibrary);document.querySelector('#closeLibraryBottom')?.addEventListener('click',closeLibrary);
  document.querySelector('#addCustomExercise')?.addEventListener('click',()=>{const data=allPlans(),plan=data.items.find(x=>x.id===state.editPlanId);plan.days[state.libraryDayIndex].exercises.push({...exercise(uid(),'Eigene Übung',3,'8–12','',''),custom:true,category:'Eigene Übung'});savePlans(data);closeLibrary();});
}

function mutateSession(fn,rerender=false){const s=activeSession();fn(s);write(LS.active,s);if(rerender)render();}
function bindWorkout(){
  if(state.view!=='workout')return;
  document.querySelectorAll('[data-marker]').forEach(x=>x.onchange=()=>mutateSession(s=>s.markers[x.dataset.marker]=x.checked));
  document.querySelectorAll('[data-set-field]').forEach(x=>x.oninput=()=>mutateSession(s=>{const e=s.entries[number(x.dataset.exercise)],set=e.sets[number(x.dataset.index)];set[x.dataset.setField]=x.value;}));
  document.querySelectorAll('[data-set-done]').forEach(b=>b.onclick=()=>{const exerciseIndex=number(b.dataset.exercise);mutateSession(s=>{const set=s.entries[exerciseIndex].sets[number(b.dataset.setDone)];set.done=!set.done;if(set.done){const settings=read(LS.settings,{rest:90,restTimer:false});if(settings.restTimer){const ex=getDay(state.planId,state.dayId).exercises[exerciseIndex];state.restUntil=Date.now()+(number(ex.rest)||number(settings.rest)||90)*1000;}navigator.vibrate?.(40);}},true);});
  document.querySelectorAll('[data-delete-set]').forEach(b=>b.onclick=()=>{const exerciseIndex=number(b.dataset.exercise),setIndex=number(b.dataset.deleteSet),entry=activeSession().entries[exerciseIndex];if(entry.sets.length<=1){alert('Mindestens ein Satz bleibt bestehen.');return;}mutateSession(s=>s.entries[exerciseIndex].sets.splice(setIndex,1),true);});
  document.querySelectorAll('.set-row').forEach(row=>{let startX=0,startY=0;row.onpointerdown=e=>{startX=e.clientX;startY=e.clientY;};row.onpointerup=e=>{const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)){document.querySelectorAll('.set-row.swiped').forEach(x=>x!==row&&x.classList.remove('swiped'));row.classList.toggle('swiped',dx<0);}};});
  document.querySelectorAll('[data-exercise-note]').forEach(x=>x.oninput=()=>mutateSession(s=>s.entries[number(x.dataset.exerciseNote)].note=x.value));
  document.querySelectorAll('[data-add-warmup]').forEach(b=>b.onclick=()=>mutateSession(s=>s.entries[number(b.dataset.addWarmup)].sets.unshift({weight:'',reps:'',rir:'',done:false,warmup:true}),true));
  document.querySelectorAll('[data-auto-warmup]').forEach(b=>b.onclick=()=>{const exerciseIndex=number(b.dataset.autoWarmup),entry=activeSession().entries[exerciseIndex],work=entry.sets.find(x=>!x.warmup),target=number(work?.weight)||suggestion(getDay(state.planId,state.dayId).exercises[exerciseIndex],entry).weight;if(!target){alert('Trage zuerst dein geplantes Arbeitsgewicht ein.');return;}const round=v=>Math.max(2.5,Math.round(v/2.5)*2.5);mutateSession(s=>{const e=s.entries[exerciseIndex];e.sets=e.sets.filter(x=>!x.warmup);e.sets.unshift(...[[.4,8],[.6,5],[.8,3]].map(([factor,reps])=>({weight:round(target*factor),reps,rir:'',done:false,warmup:true})));},true);});
  document.querySelector('#toggleRir')?.addEventListener('click',()=>{const s=read(LS.settings,{theme:'auto',rest:90,increment:2.5});s.showRir=!s.showRir;write(LS.settings,s);render();});
  document.querySelectorAll('[data-apply-suggestion]').forEach(b=>b.onclick=()=>mutateSession(s=>s.entries[number(b.dataset.applySuggestion)].sets.filter(x=>!x.warmup).forEach(x=>x.weight=b.dataset.weight),true));
  document.querySelectorAll('[data-favorite-exercise]').forEach(b=>b.onclick=()=>{const d=allPlans(),ex=d.items.find(p=>p.id===state.planId).days.find(x=>x.id===state.dayId).exercises[number(b.dataset.favoriteExercise)];ex.favorite=!ex.favorite;savePlans(d);render();});
  document.querySelector('#finishWorkout').onclick=finishWorkout;
  document.querySelector('#exitWorkout').onclick=()=>{state.view='home';render();};
  document.querySelector('[data-rest-add]')?.addEventListener('click',()=>{state.restUntil+=30000;updateRest();});
  document.querySelector('[data-rest-skip]')?.addEventListener('click',()=>{state.restUntil=0;document.querySelector('#restTimer')?.classList.remove('show');});
}
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
function bindSettings(){document.querySelector('#settingsForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),restTimer=f.get('restTimer')==='on';write(LS.settings,{theme:f.get('theme'),rest:number(f.get('rest')),increment:number(f.get('increment')),showRir:f.get('showRir')==='on',restTimer});if(!restTimer)state.restUntil=0;applyTheme();render();});}

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

if('scrollRestoration' in history)history.scrollRestoration='manual';
window.addEventListener('pageshow',()=>window.scrollTo(0,0));
initialise();render();
