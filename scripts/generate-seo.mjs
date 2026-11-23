import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const OUT = join(ROOT, 'seo-dist');
const ORIGIN = 'https://passcap.org';
const MIN_INDEXABLE = 3;
const needs = {
  motor: 'mobilité et déplacement',
  hearing: 'handicap auditif',
  visual: 'handicap visuel',
  mental: 'handicap intellectuel',
  autism: 'autisme et besoins sensoriels',
  psychic: 'handicap psychique'
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const future = record => record.type === 'event' && (record.timings || []).some(t => new Date(t.end || t.start).getTime() >= Date.now());
const declared = (record, need) => record.features?.[need]?.value === true;

async function loadData(){
  const catalog = JSON.parse(await readFile(join(ROOT, 'data.json'), 'utf8'));
  const records = [];
  for(const department of catalog.departments){
    const shard = JSON.parse(await readFile(join(ROOT, department.file), 'utf8'));
    records.push(...shard.records.filter(future));
  }
  return {catalog, records};
}

function card(event){
  const first = (event.timings || []).find(t => new Date(t.end || t.start).getTime() >= Date.now());
  const date = first ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:event.timezone || 'Europe/Paris'}).format(new Date(first.start)) : 'Date à confirmer';
  return `<li><article><h2><a href="/evenements/fiche/${encodeURIComponent(event.id)}">${esc(event.title)}</a></h2><p>${esc(event.city || event.department)} · ${esc(date)}</p><p>${esc(event.category || 'Événement')}</p></article></li>`;
}

function page({title, description, canonical, events, breadcrumbs, links=[]}){
  const indexable = events.length >= MIN_INDEXABLE;
  const list = events.slice(0,100).map(card).join('');
  const jsonLd = JSON.stringify({
    '@context':'https://schema.org',
    '@type':'ItemList',
    name:title,
    numberOfItems:events.length,
    itemListElement:events.slice(0,100).map((event,index)=>({'@type':'ListItem',position:index+1,url:`${ORIGIN}/evenements/fiche/${encodeURIComponent(event.id)}`,name:event.title}))
  }).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Pass Cap</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${ORIGIN}${canonical}">${indexable?'':'<meta name="robots" content="noindex,follow">'}<script type="application/ld+json">${jsonLd}</script><link rel="stylesheet" href="/styles.css"><link rel="icon" href="/favicon.svg"></head><body><header class="header"><a class="brand" href="/">Pass Cap</a><nav><a href="/evenements">Tous les événements</a></nav></header><main class="seo-page"><nav aria-label="Fil d’Ariane">${breadcrumbs.map((item,index)=>index===breadcrumbs.length-1?`<span>${esc(item.label)}</span>`:`<a href="${item.href}">${esc(item.label)}</a> · `).join('')}</nav><h1>${esc(title)}</h1><p>${esc(description)}</p><p><strong>${events.length}</strong> événement${events.length>1?'s':''} trouvé${events.length>1?'s':''}.</p>${links.length?`<nav aria-label="Explorer aussi"><ul>${links.map(link=>`<li><a href="${link.href}">${esc(link.label)}</a></li>`).join('')}</ul></nav>`:''}<ul class="seo-events">${list}</ul></main><footer class="footer"><a href="/">Explorer toutes les sorties</a><a href="/confidentialite.html">Confidentialité</a></footer></body></html>`;
}

async function save(path, html){
  const dir = join(OUT, path);
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'index.html'),html);
}

const {catalog, records} = await loadData();
const urls = ['/','/evenements'];
const byDepartment = new Map(catalog.departments.map(d=>[d.code, records.filter(r=>r.department===d.code)]));
const cityMap = new Map();
for(const event of records){
  if(!event.city) continue;
  const key = slug(event.city);
  if(!cityMap.has(key)) cityMap.set(key,{city:event.city,departments:new Set(),events:[]});
  cityMap.get(key).departments.add(event.department);
  cityMap.get(key).events.push(event);
}

for(const department of catalog.departments){
  const events = byDepartment.get(department.code) || [];
  const path = `/evenements/departement/${department.code}`;
  await save(path,page({title:`Sorties et événements dans ${department.nom}`,description:`Découvrez les événements à venir dans ${department.nom}, avec les adaptations d’accessibilité déclarées par les organisateurs et les sources publiques.`,canonical:path,events,breadcrumbs:[{label:'Événements',href:'/evenements'},{label:department.nom}],links:Object.entries(needs).map(([key,label])=>({href:`${path}/handicap/${key}`,label:`Sorties adaptées : ${label}`}))}));
  if(events.length>=MIN_INDEXABLE) urls.push(path);
  for(const [need,label] of Object.entries(needs)){
    const filtered = events.filter(e=>declared(e,need));
    const crossPath = `${path}/handicap/${need}`;
    await save(crossPath,page({title:`Sorties avec adaptation ${label} dans ${department.nom}`,description:`Événements dans ${department.nom} pour lesquels une adaptation liée à ${label} est déclarée. Informations à confirmer auprès de l’organisateur.`,canonical:crossPath,events:filtered,breadcrumbs:[{label:'Événements',href:'/evenements'},{label:department.nom,href:path},{label}],links:[]}));
    if(filtered.length>=MIN_INDEXABLE) urls.push(crossPath);
  }
}

for(const [key,entry] of cityMap){
  const departmentCode = [...entry.departments].sort((a,b)=>entry.events.filter(e=>e.department===b).length-entry.events.filter(e=>e.department===a).length)[0];
  const department = entry.departments.size===1 ? catalog.departments.find(d=>d.code===departmentCode) : null;
  const citySlug = key;
  const path = `/evenements/ville/${citySlug}`;
  await save(path,page({title:`Sorties et événements à ${entry.city}`,description:`Découvrez les événements à venir à ${entry.city}${department?` (${department.nom})`:''}, avec les adaptations d’accessibilité déclarées.`,canonical:path,events:entry.events,breadcrumbs:[{label:'Événements',href:'/evenements'},...(department?[{label:department.nom,href:`/evenements/departement/${department.code}`}]:[]),{label:entry.city}],links:Object.entries(needs).map(([need,label])=>({href:`${path}/handicap/${need}`,label:`À ${entry.city} : ${label}`}))}));
  if(entry.events.length>=MIN_INDEXABLE) urls.push(path);
  for(const [need,label] of Object.entries(needs)){
    const filtered=entry.events.filter(e=>declared(e,need));
    const crossPath=`${path}/handicap/${need}`;
    await save(crossPath,page({title:`Sorties avec adaptation ${label} à ${entry.city}`,description:`Événements à ${entry.city} avec une adaptation déclarée liée à ${label}. Informations à confirmer auprès de l’organisateur.`,canonical:crossPath,events:filtered,breadcrumbs:[{label:'Événements',href:'/evenements'},{label:entry.city,href:path},{label}],links:[]}));
    if(filtered.length>=MIN_INDEXABLE) urls.push(crossPath);
  }
}

for(const [need,label] of Object.entries(needs)){
  const filtered=records.filter(e=>declared(e,need));
  const path=`/evenements/handicap/${need}`;
  await save(path,page({title:`Sorties et événements avec adaptation ${label}`,description:`Explorez les événements en France pour lesquels une adaptation liée à ${label} est déclarée. Informations à confirmer auprès de l’organisateur.`,canonical:path,events:filtered,breadcrumbs:[{label:'Événements',href:'/evenements'},{label}],links:catalog.departments.map(d=>({href:`/evenements/departement/${d.code}/handicap/${need}`,label:d.nom}))}));
  if(filtered.length>=MIN_INDEXABLE) urls.push(path);
}

const sitemap=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url=>`<url><loc>${ORIGIN}${url}</loc></url>`).join('')}</urlset>`;
await writeFile(join(OUT,'sitemap.xml'),sitemap);
await writeFile(join(OUT,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /data/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
console.log(JSON.stringify({events:records.length,cities:cityMap.size,indexableUrls:new Set(urls).size,output:OUT},null,2));
