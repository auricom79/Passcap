const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={interested:'<circle cx="8" cy="7" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 4 5"/>',favorites:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',comments:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-4-.9L3 21l1.9-5.5a10 10 0 0 1-.9-4 8.5 8.5 0 0 1 17 0Z"/><path d="M8 11h8M8 14h5"/>'};
const labels={interested:'personnes intéressées',favorites:'mises en favoris',comments:'commentaires'};
const cache=new Map();let inFlight=false,queued=false,epoch=0;
export function statsMarkup(id){return `<span class="event-stats" data-event-stats="${esc(id)}" role="group" aria-label="Activité de l’événement">${Object.keys(labels).map(k=>`<span class="event-stat stat-${k}" data-stat="${k}" role="img" aria-label="${labels[k]} : chargement" title="${labels[k]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[k]}</svg><span data-stat-value aria-hidden="true">—</span></span>`).join('')}</span>`;}
function paint(target,counts){for(const node of target.querySelectorAll('[data-stat]')){const key=node.dataset.stat,value=counts?.[key];node.querySelector('[data-stat-value]').textContent=Number.isSafeInteger(value)?new Intl.NumberFormat('fr-FR').format(value):'—';node.setAttribute('aria-label',labels[key]+' : '+(value??'indisponible'));node.title=labels[key]+' : '+(value??'indisponible');}}
export function hydrateStats(){if(typeof document==='undefined')return;queued=true;queueMicrotask(load);}
async function load(){
 if(inFlight||!queued)return;queued=false;const targets=[...document.querySelectorAll('[data-event-stats]')].filter(n=>!n.closest('[hidden]'));
 const ids=[...new Set(targets.map(n=>n.dataset.eventStats))],missing=ids.filter(id=>!cache.has(id)||Date.now()-cache.get(id).at>30000);
 for(const target of targets)if(cache.has(target.dataset.eventStats))paint(target,cache.get(target.dataset.eventStats).counts);
 if(!missing.length)return;inFlight=true;const version=epoch;
 try{for(let start=0;start<missing.length;start+=100){const batch=missing.slice(start,start+100),r=await fetch('/api/community/stats',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:batch})});if(!r.ok)throw Error();const data=await r.json();if(epoch!==version)break;for(const item of data.items||[])cache.set(item.id,{counts:item,at:Date.now()});}
  if(epoch===version)for(const target of document.querySelectorAll('[data-event-stats]'))if(cache.has(target.dataset.eventStats))paint(target,cache.get(target.dataset.eventStats).counts);
 }catch{if(epoch===version)for(const target of targets)if(!cache.has(target.dataset.eventStats))paint(target,null);}
 finally{inFlight=false;if(queued)queueMicrotask(load);}
}
export function refreshStats(){epoch++;cache.clear();hydrateStats();}
if(typeof window!=='undefined'){window.addEventListener('focus',refreshStats);document.addEventListener('visibilitychange',()=>{if(!document.hidden)hydrateStats();});}
