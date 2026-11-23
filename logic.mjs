import {isEligibleRecord} from './content-policy.mjs';
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dateFormatters=new Map();
export function localDate(value, zone='Europe/Paris') {
 if(!dateFormatters.has(zone))dateFormatters.set(zone,new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:zone}));
 const parts=Object.fromEntries(dateFormatters.get(zone).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function validDate(value) {
 return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
function addDays(value, days) {const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function dateRange(state={}, now=new Date(), zone='Europe/Paris') {
 const today=localDate(now,zone);
 switch(state.period||'today'){
  case 'all': return {start:today,end:'9999-12-31'};
  case 'tomorrow': {const tomorrow=addDays(today,1);return {start:tomorrow,end:tomorrow};}
  case 'week': {const weekday=new Date(today+'T12:00:00Z').getUTCDay();return {start:today,end:addDays(today,(7-weekday)%7)};}
  case 'date': return validDate(state.date)?{start:state.date,end:state.date}:null;
  case 'range': return validDate(state.dateFrom)&&validDate(state.dateTo)&&state.dateFrom<=state.dateTo?{start:state.dateFrom,end:state.dateTo}:null;
  default: return {start:today,end:today};
 }
}
export function matchingSessions(record, state=null, now=new Date()) {
 const zone=record.timezone||'Europe/Paris',range=state?dateRange(state,now,zone):null;
 if(state&&!range)return [];
 return (record.timings||[]).filter(t=>{
  const start=new Date(t.start),end=new Date(t.end);
  if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<start||end<now)return false;
  if(!range)return true;
  // An event ending at midnight does not also occupy the following day.
  return localDate(start,zone)<=range.end&&localDate(new Date(Math.max(+start,+end-1)),zone)>=range.start;
 }).sort((a,b)=>new Date(a.start)-new Date(b.start));
}
export function nextSession(record, now=new Date(), state=null) {return matchingSessions(record,state,now)[0]||null;}
export function sessionDate(timing,state,zone='Europe/Paris',now=new Date()) {
 return [localDate(timing.start,zone),localDate(now,zone),dateRange(state,now,zone)?.start||''].sort().at(-1);
}
export function hasAge(record) { return record.age && (Number.isFinite(record.age.min) || Number.isFinite(record.age.max)); }
export function ageMatches(record, age) {
 if(!age || !hasAge(record)) return null;
 const bounds = {child:[0,11],teen:[12,17],adult:[18,Infinity]}[age];
 return (record.age.min ?? 0) <= bounds[1] && (record.age.max ?? Infinity) >= bounds[0];
}
export function matchesSavedNeeds(record,needs=[]){return record.type!=='event'||!needs.length||needs.every(k=>record.features?.[k]?.value===true);}
export function filterRecords(records, state, now = new Date()) {
 const query=normalize(state.query).trim();
 return records.filter(r=>{
  if(!isEligibleRecord(r)||!matchesSavedNeeds(r,state.profileNeeds||[]))return false;
  if(state.eventKind&&(r.type!=='event'||r.eventKind!==state.eventKind))return false;
  if(state.tab!=='all' && r.type!==state.tab)return false;
  if(state.city && !normalize(r.city).includes(normalize(state.city).trim()))return false;
  if(query && !normalize([r.title,r.description,r.category,r.city,r.venue].join(' ')).includes(query))return false;
  if(r.type==='event'){
   if(![1,2].includes(r.status))return false;
   if(!nextSession(r,now,state))return false;
  }
  const age=ageMatches(r,state.age);
  if(age===false || (state.age && age===null && !state.unknown))return false;
  if(state.need){
   const value=r.features[state.need]?.value;
   if(value===false || (value!==true && !state.unknown))return false;
  } else if(!state.age && !state.unknown && !Object.values(r.features).some(f=>f.value===true)) return false;
  return true;
 });
}
export function sortRecords(records, tab, now = new Date(), state=null) {
 const information=r=>Object.values(r.features).filter(f=>f.value===true).length;
 if(tab==='place')return [...records].sort((a,b)=>information(b)-information(a)||a.title.localeCompare(b.title,'fr'));
 // Keep day headings chronological, but show that day's precise sessions before
 // overlapping periods. Use the matching session, not the span of a whole series.
 const keys=new Map(records.map(r=>{
  const t=nextSession(r,now,state),zone=r.timezone||'Europe/Paris';
  if(!t)return [r,{day:'9999-12-31',span:Infinity,start:Infinity}];
  const start=+new Date(t.start),last=Math.max(start,+new Date(t.end)-1);
  const firstDay=localDate(start,zone),lastDay=localDate(last,zone);
  // Count calendar days, including 23/25-hour days, with an exclusive midnight end.
  const span=1+(Date.parse(lastDay+'T00:00:00Z')-Date.parse(firstDay+'T00:00:00Z'))/86400000;
  return [r,{day:sessionDate(t,state||{period:'all'},zone,now),span,start}];
 }));
 const byDateAndSpecificity=(a,b)=>{
  const x=keys.get(a),y=keys.get(b);
  return x.day.localeCompare(y.day)||x.span-y.span||x.start-y.start;
 };
 if(tab==='event')return [...records].sort(byDateAndSpecificity);
 const events=records.filter(r=>r.type==='event').sort((a,b)=>byDateAndSpecificity(a,b)||information(b)-information(a));
 const places=records.filter(r=>r.type==='place').sort((a,b)=>information(b)-information(a)||a.title.localeCompare(b.title,'fr'));
 const result=[];let i=0,j=0;while(i<events.length||j<places.length){if(i<events.length)result.push(events[i++]);if(j<places.length)result.push(places[j++]);if(i<events.length)result.push(events[i++]);}return result;
}
