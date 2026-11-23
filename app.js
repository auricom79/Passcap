import {hydrateStats} from './event-stats.mjs';
import {activeProfileNeeds,subscribeProfileFilter} from './profile-filter.mjs';
import {mountCommunity} from './community.mjs';
import {mountHome} from './home.mjs';
import {illustrationMarkup,watchIllustrations} from './media.mjs';
import {relatedEvents,detailSessions} from './events.mjs';
import {cardMarkup,contacts,legendMarkup} from './signage.mjs';
import {filterRecords,sortRecords,nextSession,matchingSessions,localDate,dateRange,sessionDate,hasAge} from './logic.mjs';
import {mountMap} from './map.mjs';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?esc(u.href):null;}catch{return null;}};
const fmt=new Intl.NumberFormat('fr-FR');
const date=(value,zone='Europe/Paris')=>value&&!Number.isNaN(new Date(value).getTime())?new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:zone}).format(new Date(value)):'Date non précisée';
const day=(value,zone='Europe/Paris')=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:zone}).format(new Date(value));
const time=(value,zone='Europe/Paris')=>new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:zone}).format(new Date(value));
const labels={motor:'Mobilité et déplacement',hearing:'Audition',visual:'Vision',mental:'Handicap intellectuel',autism:'Autisme et besoins sensoriels',psychic:'Handicap psychique'};
let home;
let data,visible=12,filtered=[],activeTab='all',map,loading=false,loadError=false,requestId=0;
const shardCache=new Map();
function state(){return {profileNeeds:activeProfileNeeds(),tab:activeTab,city:$('city').value,age:$('age').value,need:$('need').value,query:$('query').value,unknown:$('unknown').checked,eventKind:$('event-kind').value,period:document.querySelector('[name=period]:checked').value,date:$('date').value,dateFrom:$('date-from').value,dateTo:$('date-to').value};}
function ageLabel(r){if(!hasAge(r))return 'Âges accueillis : à vérifier';const {min,max}=r.age;if(min!=null&&max!=null)return min===max?`${min} ans`:`De ${min} à ${max} ans`;return min!=null?`À partir de ${min} ans`:`Jusqu’à ${max} ans`;}
function selectedTimezone(){return data?.departments.find(d=>d.code===$('department').value)?.timezone||data?.records[0]?.timezone||'Europe/Paris';}
function syncDateFields(seed=false){
 const s=state(),single=s.period==='date',range=s.period==='range',today=localDate(new Date(),selectedTimezone());
 $('date-inputs').hidden=!single&&!range;
 for(const [id,show] of [['date',single],['date-from',range],['date-to',range]]){
  $(id==='date'?'single-date-wrap':id+'-wrap').hidden=!show;$(id).disabled=!show;$(id).required=show;
  if(seed&&show&&!$(id).value)$(id).value=id==='date-to'?$('date-from').value||today:today;
 }
 $('date-to').min=$('date-from').value;
 const reversed=range&&s.dateFrom&&s.dateTo&&s.dateFrom>s.dateTo;
 $('date-to').setCustomValidity(reversed?'La date de fin doit être égale ou postérieure à la date de début.':'');
 $('date-error').hidden=!reversed;$('date-error').textContent=reversed?'La date de fin doit être égale ou postérieure à la date de début.':'';
 $('period-wrap').disabled=activeTab==='place';
 $('period-help').textContent=activeTab==='place'?'Les dates concernent les événements. Les horaires des lieux sont à confirmer.':'Dates des événements, en heure locale. Les lieux restent affichés, horaires à confirmer.';
}
function periodLabel(s){
 if(s.period==='date')return date(s.date+'T12:00:00Z','UTC');
 if(s.period==='range')return `du ${date(s.dateFrom+'T12:00:00Z','UTC')} au ${date(s.dateTo+'T12:00:00Z','UTC')}`;
 return {today:'Aujourd’hui',tomorrow:'Demain',week:'Cette semaine, jusqu’à dimanche'}[s.period];
}
function timingLabel(r,s,now){
 const t=nextSession(r,now,s);if(!t)return 'Horaires : à vérifier';
 const zone=r.timezone||'Europe/Paris',last=new Date(Math.max(+new Date(t.start),+new Date(t.end)-1));
 if(localDate(t.start,zone)!==localDate(last,zone))return `${day(t.start,zone)} – ${day(last,zone)}`;
 if(t.dateOnly)return `${day(t.start,zone)} · horaires à vérifier`;
 const wholeDay=time(t.start,zone)==='00:00'&&time(t.end,zone)==='23:59';
 return `${day(t.start,zone)}${wholeDay?'':` · ${time(t.start,zone)}`}`;
}
function card(r,s,now){return cardMarkup(r,{timing:r.type==='event'?timingLabel(r,s,now):'',age:hasAge(r)?ageLabel(r):'',selectedNeed:s.need,programCount:relatedEvents(data.records,r,now).length});}
function render(reset=true){
 if(!data)return;if(reset)visible=12;syncDateFields();const now=new Date(),s=state(),department=data.departments.find(d=>d.code===$('department').value);
 $('cards').setAttribute('aria-busy',String(loading));$('event-availability').hidden=true;
 $('results-title').textContent=department?`${activeTab==='event'?'Les prochaines sorties':activeTab==='place'?'Des lieux à découvrir':'À découvrir'} · ${department.nom}`:'Choisissez votre territoire';
 if(!department||loading||loadError){
  $('cards').replaceChildren();$('empty').hidden=true;$('more').hidden=true;
  $('count').textContent=loading?'Chargement des fiches du territoire…':loadError?'Les fiches n’ont pas pu être chargées.':`${fmt.format(data.totalPlaces)} lieux et ${fmt.format(data.totalEvents)} événements avec une adaptation déclarée. Choisissez parmi 101 départements.`;
  $('department-state').innerHTML=loading?'Chargement en cours…':loadError?'<strong>Chargement interrompu.</strong> Votre sélection est conservée.<button id="retry-department">Réessayer</button>':'Sélectionnez un département sur la carte ou dans la liste pour consulter les lieux et les événements disponibles.';
  if(loadError)$('retry-department').addEventListener('click',()=>{selectDepartment($('department').value);$('results-title').focus();});return;
 }
 if(activeTab!=='place'&&!dateRange(s,now,selectedTimezone())){
  $('cards').replaceChildren();$('empty').hidden=true;$('more').hidden=true;
  $('count').textContent='Choisissez une date ou une période valide.';$('department-state').textContent='Complétez les dates dans la recherche.';return;
 }
 $('department-state').textContent='';filtered=sortRecords(filterRecords(data.records,s,now),activeTab,now,s);const shown=filtered.slice(0,visible);let previous='';
 $('cards').innerHTML=shown.map(r=>{let heading='';if(activeTab==='event'){const t=nextSession(r,now,s),key=sessionDate(t,s,r.timezone,now);if(key!==previous){heading=`<h3 class="day-heading">${esc(day(key+'T12:00:00Z','UTC'))}</h3>`;previous=key;}}return heading+card(r,s,now);}).join('');
 const known=filtered.filter(r=>s.need?r.features[s.need]?.value===true:Object.values(r.features).some(f=>f.value===true)).length;
 if(filtered.length===0){$('empty').querySelector('h3').textContent=data.records.length?'Aucune fiche pour cette recherche':'Aucune fiche avec adaptation déclarée dans ce territoire';$('empty').querySelector('p').textContent=data.records.length?'Essayez une autre date, une autre période ou élargissez les autres filtres.':'Cela ne signifie pas qu’il n’existe aucune offre adaptée. Les sources actuelles ne renseignent aucune fiche répondant à nos critères. Choisissez un autre département.';$('empty-reset').hidden=!data.records.length;}
 const eventCount=filtered.filter(r=>r.type==='event').length;
 if(activeTab!=='place'&&eventCount===0){
  const upcoming=filterRecords(data.records,{...s,tab:'event',period:'all'},now).length;
  $('event-availability').hidden=false;$('upcoming-events').hidden=upcoming===0;
  $('event-availability-text').textContent=upcoming?`Aucun événement sur cette période · ${fmt.format(upcoming)} à venir.`:'Aucun événement renseigné pour ces critères. La programmation locale n’est pas exhaustive.';
 }
 hydrateStats();
 const noun=activeTab==='event'?'événement':activeTab==='place'?'lieu':'fiche';$('count').textContent=`${fmt.format(filtered.length)} ${noun}${filtered.length!==1?'s':''} · ${s.need?`${fmt.format(known)} avec ${labels[s.need].toLowerCase()} déclaré · `:''}${fmt.format(shown.length)} affichées${activeTab==='place'?'':` · ${periodLabel(s)}`}`;
 $('empty').hidden=filtered.length>0;$('more').hidden=visible>=filtered.length;$('more').textContent=`Voir plus de résultats (${Math.min(visible,filtered.length)} sur ${fmt.format(filtered.length)})`;
}
async function selectDepartment(code,updateUrl=true){
 const token=++requestId;const department=data?.departments.find(d=>d.code===code);$('department').value=department?code:'';home?.setDepartment(department?code:'');map?.select(department?code:'');$('city').value='';$('city-options').replaceChildren();$('city').disabled=!department;data.records=[];loadError=false;loading=!!department;
 $('selected-territory').textContent=department?`${department.nom} · ${department.code}`:'France métropolitaine & DROM';
 $('territory-coverage').textContent=department?`${fmt.format(department.places)} lieu${department.places!==1?'x':''} et ${fmt.format(department.events)} événement${department.events!==1?'s':''} référencés`:'101 départements à explorer.';
 if(updateUrl){const url=new URL(location.href);if(department)url.searchParams.set('departement',code);else url.searchParams.delete('departement');history.replaceState(null,'',url);}
 render();if(!department)return;
 try{
  let rows=shardCache.get(code);
  if(!rows){const response=await fetch('./'+department.file,{cache:'no-cache'});if(!response.ok)throw new Error('department');const json=await response.json();if(!Array.isArray(json.records)||json.records.some(r=>r.department!==code))throw new Error('schema');rows=json.records;shardCache.set(code,rows);if(shardCache.size>5){const oldest=shardCache.keys().next().value;if(oldest!==code)shardCache.delete(oldest);}}
  if(token!==requestId)return;data.records=rows;loading=false;
  const cities=[...new Set(rows.map(r=>r.city).filter(c=>c!=='Commune non précisée'))].sort((a,b)=>a.localeCompare(b,'fr'));
  $('city-options').innerHTML=cities.map(c=>`<option value="${esc(c)}"></option>`).join('');render();
 }catch{if(token!==requestId)return;loading=false;loadError=true;render();}
}
function reset(){for(const id of ['city','age','need','query','event-kind'])$(id).value='';$('unknown').checked=true;document.querySelector('[name=period][value=today]').checked=true;for(const id of ['date','date-from','date-to'])$(id).value='';syncDateFields();render();}
function programme(r){
 const events=relatedEvents(data.records,r);if(!events.length)return '';
 return `<section class="venue-programme" aria-labelledby="programme-title"><h3 id="programme-title" tabindex="-1">${r.type==='place'?'À l’affiche dans ce lieu':'Autres événements dans ce lieu'}</h3><ul>${events.map(e=>`<li><button class="programme-entry" data-open="${esc(e.id)}"><span>${esc(e.title)}</span><span class="programme-date">${esc(timingLabel(e,{period:'all'},new Date()))}</span></button></li>`).join('')}</ul></section>`;
}
function showDetails(id){const r=data.records.find(r=>r.id===id)||home?.find(id);if(!r)return;const contact=contacts(r);const source=safeURL(r.sourceUrl);const website=safeURL(r.website);const map=Number.isFinite(r.lat)&&Number.isFinite(r.lon)?`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=17/${r.lat}/${r.lon}`:null;const timings=detailSessions(r,state());let schedule='';if(r.type==='event')schedule=`<h3>Prochaines séances</h3><p class="small-note">Horaires locaux du territoire · ${esc(r.timezone)}</p><ul>${timings.slice(0,6).map(t=>`<li>${esc(date(t.start,r.timezone))}${t.dateOnly?`${localDate(t.start,r.timezone)!==localDate(new Date(new Date(t.end)-1),r.timezone)?' – '+esc(date(new Date(new Date(t.end)-1),r.timezone)):''} · horaires à vérifier`:` · ${time(t.start,r.timezone)}${t.endTimeKnown===false?' · fin non renseignée':`–${time(t.end,r.timezone)}`}`}${safeURL(t.sourceUrl)?` · <a href="${safeURL(t.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source de la séance</a>`:''}</li>`).join('')}</ul>${timings.length>6?`<p class="small-note">${timings.length-6} autres séances sont indiquées dans la source.</p>`:''}`;
$('detail-kind').textContent=r.type==='event'?'UNE SORTIE À PRÉPARER':r.category;
$('detail-content').innerHTML=`${illustrationMarkup(r,{detail:true})}<h2 id="detail-title">${esc(r.title)}</h2><p class="location">${esc(r.city)}${r.venue&&r.venue!==r.title?` · ${esc(r.venue)}`:''}</p><div class="detail-summary"><p><strong>Public :</strong> ${esc(ageLabel(r))}</p><p><strong>Adresse :</strong> ${esc(r.address||'À vérifier')}</p><p><strong>Conditions :</strong> ${esc(r.conditions)}</p>${contact.phone?`<p><strong>Téléphone :</strong> <a href="tel:${esc(contact.phone)}">${esc(r.phone)}</a></p>`:''}${contact.email?`<p><strong>E-mail :</strong> <a href="mailto:${esc(encodeURIComponent(contact.email))}">${esc(contact.email)}</a></p>`:''}${r.status===2?'<p><strong>Horaires modifiés :</strong> consultez la source avant votre départ.</p>':''}</div><p class="plain-description">${esc(r.description)}</p>${r.descriptionTruncated?'<p class="small-note">Description abrégée. Le texte complet est disponible dans la fiche source.</p>':''}${schedule}${r.scheduleNote?`<p class="small-note">${esc(r.scheduleNote)}</p>`:''}<h3>Ce qui est déclaré pour l’accueil</h3><p class="small-note">Informations fournies par ${esc(r.source)}. Les besoins individuels sont à confirmer auprès du lieu.</p>${Object.entries(labels).map(([k,label])=>{const f=r.features[k];return `<div class="feature-row"><span>${label}</span><span class="${f?.value===true?'yes':f?.value===false?'no':'unspecified'}">${esc(f?.label||'À vérifier')}${safeURL(f?.sourceUrl)?` · <a href="${safeURL(f.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source de l’adaptation</a>`:''}</span></div>`;}).join('')}${r.details?.length?`<h3>Caractéristiques du lieu</h3>${r.details.map(d=>`<div class="feature-row"><span>${esc(d.label)}</span><span>${d.value?'Oui, selon la source':'Non, selon la source'}</span></div>`).join('')}`:''}${programme(r)}<div class="source-block"><p><strong>${esc(r.source)} · ${esc(r.producer)}</strong></p><p>${esc(r.sourceUpdatedLabel||'Mise à jour')} : ${esc(date(r.updatedAt))}</p><p>Importé dans Pass Cap le ${esc(date(data.importedAt))}. Informations non vérifiées sur place.</p>${r.contactUpdatedAt?`<p>Coordonnées d’inscription consultées le ${esc(date(r.contactUpdatedAt))}.</p>`:''}</div><div class="detail-actions">${source?`<a href="${source}" target="_blank" rel="noopener noreferrer">Consulter la fiche source</a>`:''}${website&&website!==source?`<a href="${website}" target="_blank" rel="noopener noreferrer">Site du lieu</a>`:''}${map?`<a href="${map}" target="_blank" rel="noopener noreferrer">Situer sur une carte</a>`:''}</div>`;community.attachEvent(r);if(!$('detail').open)$('detail').showModal();else{$('detail-title').tabIndex=-1;$('detail-title').focus();}}
function initialize(){
 $('signage-legend').innerHTML=legendMarkup();
 const option=d=>`<option value="${esc(d.code)}">${esc(d.code)} · ${esc(d.nom)}</option>`;
 $('department').innerHTML='<option value="">Choisir un territoire</option><optgroup label="France métropolitaine">'+data.departments.filter(d=>!d.drom).map(option).join('')+'</optgroup><optgroup label="DROM">'+data.departments.filter(d=>d.drom).map(option).join('')+'</optgroup>';
 $('snapshot').textContent=`Mise à jour du ${date(data.importedAt)} · Agenda jusqu’au ${date(data.horizonEnd)}`;
 $('map-totals').innerHTML=`<div><strong>${fmt.format(data.totalPlaces)}</strong><span>lieux importés</span></div><div><strong>${fmt.format(data.totalEvents)}</strong><span>événements sur 90 jours</span></div><div><strong>101</strong><span>départements, dont 5 DROM</span></div>`;
 $('source-list').innerHTML=data.sources.map(s=>`<div class="source-item"><a href="${safeURL(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(s.name)}</strong></a><p>${esc(s.description)}</p><p>${fmt.format(s.count)} fiches importées · ${esc(date(s.updatedAt))}</p><p><a href="${safeURL(s.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.license)}</a> · source conservée sur chaque fiche.</p></div>`).join('');render();
}
$('search-form').addEventListener('submit',e=>{e.preventDefault();if(!$('department').value){$('department').focus();return;}render();$('results').focus({preventScroll:true});$('results').scrollIntoView({behavior:'auto',block:'start'});});
for(const id of ['age','need','unknown'])$(id).addEventListener('change',()=>render());let timer;for(const id of ['query','city'])$(id).addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>render(),150);});
for(const input of document.querySelectorAll('[name=period]'))input.addEventListener('change',()=>{syncDateFields(true);render();});
for(const id of ['date','date-from','date-to'])$(id).addEventListener('input',()=>{syncDateFields();render();});
$('department').addEventListener('change',()=>selectDepartment($('department').value));$('clear-department').addEventListener('click',()=>selectDepartment(''));
$('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',()=>{reset();$('results-title').focus();});$('more').addEventListener('click',()=>{const firstNew=visible;visible+=12;render(false);const title=$('cards').querySelectorAll('.card h3')[firstNew];(title||$('results-title')).focus();});
const tabs=[...document.querySelectorAll('[data-tab]')];function selectTab(button){activeTab=button.dataset.tab;if(activeTab==='place')$('event-kind').value='';tabs.forEach(b=>{b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1;});$('results-panel').setAttribute('aria-labelledby',button.id);render();}tabs.forEach((b,i)=>{b.addEventListener('click',()=>selectTab(b));b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!=null){e.preventDefault();selectTab(tabs[n]);tabs[n].focus();}});});
for(const area of ['cards','detail-content'])$(area).addEventListener('click',e=>{const b=e.target.closest('[data-open],[data-program]');if(!b)return;showDetails(b.dataset.open||b.dataset.program);if(b.dataset.program)$('programme-title')?.focus();});
$('event-kind').addEventListener('change',()=>{if($('event-kind').value)selectTab($('tab-event'));else render();});
$('upcoming-events').addEventListener('click',()=>{document.querySelector('[name=period][value=range]').checked=true;$('date-from').value=localDate(new Date(),selectedTimezone());$('date-to').value=localDate(data.horizonEnd,selectedTimezone());syncDateFields();selectTab($('tab-event'));$('results-title').focus();});
for(const id of ['about','detail']){$(`${id}-close`).addEventListener('click',()=>$(id).close());$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});}for(const id of ['sources-btn'])$(id).addEventListener('click',()=>$('about').showModal());
async function load(){
 try{
  const response=await fetch('./data.json',{cache:'no-cache'});if(!response.ok)throw new Error('catalog');data=await response.json();if(!Array.isArray(data.departments))throw new Error('schema');data.records=[];initialize();
  let requested=new URL(location.href).searchParams.get('departement')||'';
  if(!data.departments.some(d=>d.code===requested))requested='';
  home=mountHome(data,{selectDepartment,showDetails});
  await selectDepartment(requested||home.department,false);
  const eventId=new URL(location.href).searchParams.get('evenement');if(eventId)showDetails(eventId);
  try{const r=await fetch('./map-data.json',{cache:'no-cache'});if(!r.ok)throw new Error('map');map=mountMap(await r.json(),data.departments,code=>selectDepartment(code));map.select($('department').value);}catch{$('france-map').innerHTML='<p class="map-error">La carte ne peut pas être affichée. La liste des départements reste disponible pour votre recherche.</p>';}
 }catch{$('count').textContent='Les données ne sont pas disponibles pour le moment.';$('department-state').innerHTML='<div class="error">Impossible de charger les territoires.<button id="retry">Réessayer</button></div>';$('retry').addEventListener('click',()=>{load();$('results-title').focus();});}
}
const community=mountCommunity({openEvent:showDetails});
subscribeProfileFilter(()=>{home?.refresh();render();});
watchIllustrations(document);
load();
