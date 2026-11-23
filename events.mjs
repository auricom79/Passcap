import {matchingSessions} from './logic.mjs';
import {isEligibleRecord} from './content-policy.mjs';
export const eventKinds={exhibition:'Expositions',theatre:'Théâtre',opera:'Opéra',concert:'Concerts',sport:'Sport et matchs',dance:'Danse',cinema:'Cinéma',workshop:'Ateliers',visit:'Visites',other:'Autres événements'};
export function detailSessions(record,state,now=new Date()){
 const selected=matchingSessions(record,state,now);
 return selected.length?selected:matchingSessions(record,{period:'all'},now);
}
const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function venueKey(record){
 if(record.type==='event'&&!record.venue)return '';
 let city=clean(record.city),name=clean(record.venue||record.title);
 if(!record.department||!city||!name||city==='commune non precisee')return '';
 if(record.department==='75'&&/^paris(?:\s|\d|$)/.test(city))city='paris';
 if(name==='stade du parc des princes')name='parc des princes';
 return `${record.department}|${city}|${name}`;
}
export function relatedEvents(records,record,now=new Date()){
 const key=venueKey(record);if(!key)return [];
 const start=r=>Math.min(...r.timings.filter(t=>new Date(t.end)>=now).map(t=>+new Date(t.start)));
 return records.filter(r=>r.id!==record.id&&r.type==='event'&&isEligibleRecord(r)&&[1,2].includes(r.status)&&venueKey(r)===key&&matchingSessions(r,null,now).length).sort((a,b)=>start(a)-start(b));
}
