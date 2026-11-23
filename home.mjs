import {statsMarkup,hydrateStats} from './event-stats.mjs';
import {activeProfileNeeds} from './profile-filter.mjs';
import {illustrationMarkup} from './media.mjs';
import {filterRecords,nextSession,localDate} from './logic.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
export function weekend(now=new Date(),zone='Europe/Paris'){
 const d=new Date(localDate(now,zone)+'T12:00:00Z'),day=d.getUTCDay();d.setUTCDate(d.getUTCDate()+((6-day+7)%7||7));
 const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+1);return {period:'range',dateFrom:start,dateTo:d.toISOString().slice(0,10)};
}
export function distance(a,r){if(!Number.isFinite(r.lat)||!Number.isFinite(r.lon))return Infinity;const rad=x=>x*Math.PI/180,dlat=rad(r.lat-a.latitude),dlon=rad(r.lon-a.longitude);return 6371*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(r.lat))*Math.sin(dlon/2)**2));}
const photos=[
 {id:'1790749871044-3a4e689a8f24',source:'people-laughing-at-cafe-table-JvAhh4FNqSU',alt:'Des amis rient ensemble autour d’un café',author:'Vitaly Gariev'},
 {id:'1556340346-5e30da977c4d',source:'group-of-people-enjoying-concerts-VSkeg0xHsss',alt:'Un public enthousiaste partage un concert en plein air',author:'Lachy Spratt'},
 {id:'1758275557233-773c6c03614e',source:'friends-enjoying-a-picnic-and-toasting-drinks-outdoors-6lkDaLeroEA',alt:'Un groupe d’amis partage un pique-nique au parc',author:'Vitaly Gariev'},
 {id:'1753351056691-8def2e061576',source:'friends-take-a-selfie-at-a-coffee-shop-PrmuagA6fCY',alt:'Des amis souriants prennent un selfie au café',author:'Vitaly Gariev'}
];
function people(i){const p=photos[i];return `<figure class="pane-photo"><img src="https://images.unsplash.com/photo-${p.id}?auto=format&amp;fit=crop&amp;w=960&amp;q=80" alt="${p.alt}" width="960" height="540" ${i?'loading="lazy"':'fetchpriority="high"'} decoding="async" referrerpolicy="no-referrer"><figcaption><a href="https://unsplash.com/photos/${p.source}" target="_blank" rel="noopener noreferrer">${p.author} · Unsplash</a></figcaption></figure>`;}
export function mountHome(catalog,api){
 let department='';try{department=localStorage.getItem('passcap-department')||'';}catch{}if(!catalog.departments.some(d=>d.code===department))department='';
 let active=0,coords=null,records=[],failed=0,loaded=0,shown=6;
 const labels=['Aujourd’hui','Demain','Le week-end prochain','Rechercher…'];
 $('outing-accordion').innerHTML=labels.map((label,i)=>`<section class="outing-pane pane-${i}" data-pane="${i}"><h2><button id="outing-toggle-${i}" aria-expanded="${i===0}" aria-controls="outing-content-${i}"><span class="pane-number">0${i+1}</span><span>${label}</span><span class="pane-plus" aria-hidden="true">↗</span></button></h2><div id="outing-content-${i}" class="outing-content" ${i?'hidden':''}>${people(i)}<p class="pane-caption">${['L’envie n’attend pas.','Un bon moment en perspective.','Deux jours pour se faire plaisir.','Votre sortie, à votre façon.'][i]}</p><label class="home-department">Où sort-on ?<select data-home-department><option value="">Partout en France</option>${catalog.departments.map(d=>`<option value="${esc(d.code)}">${esc(d.code)} · ${esc(d.nom)}</option>`).join('')}</select></label>${i<3?`<div class="home-events" id="home-events-${i}" aria-live="polite"></div><button class="home-more" data-home-more hidden>Encore des idées ↓</button>`:'<p>Une carte, des dates et des filtres pour trouver ce qui vous ressemble.</p><a class="search-entry" href="#search-form">Explorer le moteur de recherche ↗</a>'}</div></section>`).join('');
 function period(r){return active===2?weekend(new Date(),r.timezone):{period:active===1?'tomorrow':'today'};}
 function render(){
  document.querySelectorAll('[data-home-department]').forEach(s=>s.value=department);
  $('home-location').textContent=department?`Vos idées de sorties · ${catalog.departments.find(d=>d.code===department)?.nom}`:coords?'Autour de vous · les événements les plus proches en premier':'Des idées de sorties dans toute la France';
  if(active===3)return;
  const rows=records.filter(r=>(!department||r.department===department)&&filterRecords([r],{...period(r),tab:'event',unknown:true,profileNeeds:activeProfileNeeds()}).length);
  rows.sort(coords?(a,b)=>distance(coords,a)-distance(coords,b)||a.title.localeCompare(b.title,'fr'):(a,b)=>hash(a.id)-hash(b.id));
  const target=$('home-events-'+active);
  target.innerHTML=(!loaded?'<p>Les idées de sorties arrivent…</p>':'')+rows.slice(0,shown).map(r=>{const t=nextSession(r,new Date(),period(r)),km=coords?distance(coords,r):Infinity;return `<div class="home-event-row">${illustrationMarkup(r)}<button class="home-event" data-home-event="${esc(r.id)}"><span class="home-event-date">${localDate(t.start,r.timezone||'Europe/Paris')<localDate(new Date(),r.timezone||'Europe/Paris')?'En cours · depuis le ':''}${esc(new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',hour:t.dateOnly?undefined:'2-digit',minute:t.dateOnly?undefined:'2-digit',timeZone:r.timezone||'Europe/Paris'}).format(new Date(t.start)))}</span><strong>${esc(r.title)}</strong><span>${esc(r.city)}${Number.isFinite(km)?` · ${Math.round(km)} km`:''}</span>${statsMarkup(r.id)}<span class="home-event-arrow" aria-hidden="true">↗</span></button></div>`;}).join('')+(loaded===catalog.departments.length&&!rows.length?`<p class="home-empty">${activeProfileNeeds().length?'Aucun événement avec une adaptation déclarée pour tous vos besoins sur cette période. Désactivez le filtre du profil pour élargir les idées.':'Pas d’événement renseigné pour cette période ici. Essayez un autre département ou explorez les prochaines dates dans la recherche.'}</p>`:'')+(failed?'<p>Certains territoires n’ont pas pu être chargés. <button data-home-retry>Réessayer</button></p>':'');
  const more=document.querySelector(`[data-pane="${active}"] [data-home-more]`);more.hidden=rows.length<=shown;hydrateStats();
 }
 function setDepartment(code){department=code;shown=6;try{if(code)localStorage.setItem('passcap-department',code);else localStorage.removeItem('passcap-department');}catch{}render();}
 document.querySelectorAll('[id^=outing-toggle-]').forEach((b,i)=>b.addEventListener('click',()=>{active=i;shown=6;for(let n=0;n<4;n++){const on=n===i;$('outing-toggle-'+n).setAttribute('aria-expanded',String(on));$('outing-content-'+n).hidden=!on;document.querySelector(`[data-pane="${n}"]`).classList.toggle('is-open',on);}$('search-experience').hidden=i!==3;render();}));
 document.querySelector('[data-pane="0"]').classList.add('is-open');
 for(const id of ['nav-home','nav-search','nav-events'])$(id)?.addEventListener('click',()=>{
  $('outing-toggle-'+(id==='nav-home'?0:3)).click();
  if(id==='nav-events'){$('tab-event').click();$('results').scrollIntoView({behavior:'auto'});$('results-title').focus({preventScroll:true});}
  else $(id==='nav-home'?'intro-title':'search-form').scrollIntoView({behavior:'auto'});
 });
 document.querySelectorAll('.skip-links a').forEach(a=>a.addEventListener('click',()=>{$('outing-toggle-3').click();}));

 $('outing-accordion').addEventListener('change',e=>{if(e.target.matches('[data-home-department]')){setDepartment(e.target.value);api.selectDepartment(department);}});
 $('outing-accordion').addEventListener('click',e=>{const b=e.target.closest('[data-home-event]');if(b)api.showDetails(b.dataset.homeEvent);if(e.target.closest('[data-home-more]')){shown+=6;render();}if(e.target.closest('[data-home-retry]'))loadRecords();});
 async function loadRecords(){failed=0;loaded=0;let index=0;const all=[];async function worker(){while(index<catalog.departments.length){const d=catalog.departments[index++];try{const res=await fetch('./'+d.file);if(!res.ok)throw Error();const json=await res.json();all.push(...json.records.filter(r=>r.type==='event'));}catch{failed++;}loaded++;} }await Promise.all(Array.from({length:5},worker));records=all;render();}
 render();loadRecords();
 if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{coords=p.coords;render();},()=>render(),{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
 return {get department(){return department;},setDepartment,refresh:render,find:id=>records.find(r=>r.id===id)};
}
function hash(value){let h=0;for(const c of String(value))h=(h*31+c.charCodeAt(0))|0;return h>>>0;}
