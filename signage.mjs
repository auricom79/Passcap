import {statsMarkup} from './event-stats.mjs';
import {illustrationMarkup} from './media.mjs';
// Icons from Lucide (ISC); license distributed in icons-license.txt.
const paths={"accessibility": "<circle cx=\"16\" cy=\"4\" r=\"1\" />\n  <path d=\"m18 19 1-7-6 1\" />\n  <path d=\"m5 8 3-3 5.5 3-2.36 3.5\" />\n  <path d=\"M4.24 14.5a5 5 0 0 0 6.88 6\" />\n  <path d=\"M13.76 17.5a5 5 0 0 0-6.88-6\" />", "ear": "<path d=\"M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0\" />\n  <path d=\"M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4\" />", "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" />\n  <circle cx=\"12\" cy=\"12\" r=\"3\" />", "brain": "<path d=\"M12 18V5\" />\n  <path d=\"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4\" />\n  <path d=\"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5\" />\n  <path d=\"M17.997 5.125a4 4 0 0 1 2.526 5.77\" />\n  <path d=\"M18 18a4 4 0 0 0 2-7.464\" />\n  <path d=\"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517\" />\n  <path d=\"M6 18a4 4 0 0 1-2-7.464\" />\n  <path d=\"M6.003 5.125a4 4 0 0 0-2.526 5.77\" />", "infinity": "<path d=\"M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8\" />", "heart": "<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\" />", "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" />\n  <path d=\"M2 12h20\" />", "phone": "<path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\" />", "mail": "<path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\" />\n  <rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />", "info": "<circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <path d=\"M12 16v-4\" />\n  <path d=\"M12 8h.01\" />", "calendar-days": "<path d=\"M8 2v3\" />\n  <path d=\"M16 2v3\" />\n  <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" />\n  <path d=\"M3 9h18\" />\n  <path d=\"M8 13h.01\" />\n  <path d=\"M12 13h.01\" />\n  <path d=\"M16 13h.01\" />\n  <path d=\"M8 17h.01\" />\n  <path d=\"M12 17h.01\" />\n  <path d=\"M16 17h.01\" />", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" />\n  <path d=\"M16 3.128a4 4 0 0 1 0 7.744\" />\n  <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" />\n  <circle cx=\"9\" cy=\"7\" r=\"4\" />", "circle-question-mark": "<circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\" />\n  <path d=\"M12 17h.01\" />"};
export const needs={
 motor:{short:'Moteur',label:'Mobilité et déplacement',icon:'accessibility'},
 hearing:{short:'Auditif',label:'Handicap auditif',icon:'ear'},
 visual:{short:'Visuel',label:'Handicap visuel',icon:'eye'},
 mental:{short:'Intellectuel',label:'Handicap intellectuel',icon:'brain'},
 autism:{short:'Autisme',label:'Autisme et besoins sensoriels',icon:'infinity'},
 psychic:{short:'Psychique',label:'Handicap psychique',icon:'heart'}
};
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function icon(name){return `<svg class="sign-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||paths.info}</svg>`;}
export function webURL(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
export function emailAddress(value){
 const email=String(value??'').trim();
 return /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,63}$/.test(email)?email:null;
}
export function phoneNumber(value){
 const first=String(value??'').trim().split(/\s*(?:[;,/]|\bou\b)\s*/i)[0];
 if(!/^[+\d\s().-]+$/.test(first))return null;
 const number=first.replace(/^([+]\d{1,3})\s*\(0\)/,'$1').replace(/[\s().-]/g,'');
 return /^\+?\d{8,15}$/.test(number)?number:null;
}
export function contacts(record){
 return {website:webURL(record.website),phone:phoneNumber(record.phone),email:emailAddress(record.email)};
}
export function declaredNeeds(record){return Object.keys(needs).filter(key=>record.features?.[key]?.value===true);}
function contactAction(kind,href,label,record,detail){
 const title=`${label} : ${record.title}${detail?' · '+detail:''}`;
 return `<a class="sign-action" href="${escapeHTML(href)}" aria-label="${escapeHTML(title)}" title="${escapeHTML(detail||label)}"${kind==='globe'?' target="_blank" rel="noopener noreferrer"':''}>${icon(kind)}<span>${label}</span></a>`;
}
export function contactActions(record){
 const c=contacts(record);
 return `${c.website?contactAction('globe',c.website,'Site',record,'nouvel onglet'):''}${c.phone?contactAction('phone','tel:'+c.phone,'Appeler',record,c.phone):''}${c.email?contactAction('mail','mailto:'+encodeURIComponent(c.email),'E-mail',record,c.email):''}`;
}
export function cardMarkup(record,{timing='',age='',selectedNeed='',programCount=0}={}){
 const esc=escapeHTML,event=record.type==='event';
 const badges=Object.entries(needs).map(([key,n])=>{
  const feature=record.features?.[key],value=feature?.value;
  const state=value===true?'declared':value===false?'unavailable':'unknown';
  const status=value===true?'Adaptation déclarée':value===false?'Indiqué non adapté':'Non renseigné';
  const marker=value===true?'✓':value===false?'−':'?';
  const label=feature?.label??(value===null?'À vérifier':'');
  const detail=label?` · ${label}`:'';
  return `<li class="need-sign need-sign--${state}" data-need="${key}" title="${esc(status+detail)}"><span class="need-symbol">${icon(n.icon)}<span class="need-status" aria-hidden="true">${marker}</span></span><span>${n.short}</span><span class="sr-only"> : ${esc(status)} par la source${esc(detail)}.</span></li>`;
 }).join('');
 const missing=selectedNeed&&record.features[selectedNeed]?.value!==true;
 return `<article class="card ${event?'event':'place'}">${illustrationMarkup(record)}<div class="card-top"><span class="kind-label">${event?'Événement':'Lieu'}</span>${record.category&&record.category!==(event?'Événement':'Lieu')?`<span class="category">${esc(record.category)}</span>`:''}</div><div class="card-body"><h3 tabindex="-1">${esc(record.title)}</h3><p class="location">${esc(record.city)}${event&&record.venue&&record.venue!==record.title?` · ${esc(record.venue)}`:''}</p>${(event&&timing)||age?`<div class="card-meta">${event&&timing?`<span>${icon('calendar-days')}<span>${esc(timing)}</span></span>`:''}${age?`<span>${icon('users')}<span>${esc(age)}</span></span>`:''}</div>`:''}${event?statsMarkup(record.id):''}<ul class="need-signs" aria-label="Informations sur les adaptations">${badges}</ul>${missing?`<p class="need-unconfirmed">${icon('circle-question-mark')}<span>${esc(needs[selectedNeed].short)} : à vérifier</span></p>`:''}</div><div class="card-actions" role="group" aria-label="Contacts et informations : ${esc(record.title)}">${contactActions(record)}${programCount?`<button class="sign-action" data-program="${esc(record.id)}" aria-label="Programmation de ${esc(record.venue||record.title)} : ${programCount} événements" aria-haspopup="dialog" aria-controls="detail">${icon('calendar-days')}<span>Programme (${programCount})</span></button>`:''}<button class="sign-action info-action" data-open="${esc(record.id)}" aria-label="Info : ${esc(record.title)}" aria-haspopup="dialog" aria-controls="detail">${icon('info')}<span>Info</span></button></div></article>`;
}
export function legendMarkup(){return Object.values(needs).map(n=>`<li>${icon(n.icon)}<span>${n.label}</span></li>`).join('');}
