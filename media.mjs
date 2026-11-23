// Licensed event artwork, with attributed stock photos by activity when unavailable.
// Only URLs are stored; no image proxy or local copies.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hosts=new Set(['img.openagenda.com','cdn.openagenda.com','cibul.s3.amazonaws.com','cdn.paris.fr']);
export function imageURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&hosts.has(u.hostname)&&/\.(?:jpe?g|png|webp|avif)$/i.test(u.pathname)?u.href:null;}catch{return null;}}
const symbols={
 cinema:'<rect x="6" y="5" width="36" height="38" rx="3"/><path d="M14 5v38M34 5v38M6 15h8M6 25h8M6 35h8M34 15h8M34 25h8M34 35h8"/><path d="m21 17 9 7-9 7Z"/>',
 theatre:'<path d="M7 7h23v15c0 12-11 16-11 16S7 34 7 22Z"/><path d="M32 14h9v15c0 10-10 14-10 14l-5-3M12 16h3m6 0h3M13 25q5 6 11 0M34 24h3"/>',
 opera:'<path d="M5 43h38M9 43V18h30v25M6 18 24 5l18 13M16 24v13m8-13v13m8-13v13"/>',
 concert:'<path d="M19 34V12l22-5v23M19 20l22-5"/><ellipse cx="12" cy="35" rx="7" ry="5"/><ellipse cx="34" cy="31" rx="7" ry="5"/>',
 exhibition:'<rect x="5" y="7" width="38" height="34" rx="2"/><circle cx="17" cy="18" r="4"/><path d="m9 36 12-12 8 7 6-8 8 11"/>',
 sport:'<circle cx="24" cy="24" r="19"/><path d="m24 14 10 7-4 12H18l-4-12Zm0 0V5m10 16 9-3m-13 15 6 6m-18-6-6 6m2-18-9-3"/>',
 dance:'<circle cx="26" cy="8" r="4"/><path d="m10 17 13 3 12-5 7-9M23 20l-4 10 12 4 6 10M19 30 8 39M23 20l6-4"/>',
 workshop:'<path d="m10 33 23-23 7 7-23 23-11 3ZM29 14l7 7M10 33l7 7M7 10l6-5 9 9M33 29l10 10-6 5-9-10"/>',
 visit:'<path d="m6 12 12-5 12 5 12-5v31l-12 5-12-5-12 5Zm12-5v31m12-26v31"/>',
 other:'<rect x="6" y="10" width="36" height="33" rx="3"/><path d="M15 5v11M33 5v11M6 23h36m-25 9h2m10 0h2"/>'
};
export function illustrationKind(r){
 if(symbols[r.eventKind])return r.eventKind;
 const c=String(r.category||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /cinema/.test(c)?'cinema':/theatre|spectacle/.test(c)?'theatre':/musee|galerie/.test(c)?'exhibition':/piscine|sport/.test(c)?'sport':/jardin|tourisme|parc/.test(c)?'visit':'other';
}
export function imageLicense(image){
 if(image?.policy==='oa')return {label:'Licence Ouverte · source OpenAgenda',url:'https://public.opendatasoft.com/explore/dataset/evenements-publics-openagenda/'};
 if(image?.policy==='oa2')return {label:'Licence Ouverte 2.0',url:'https://www.data.gouv.fr/pages/legal/licences/etalab-2.0/'};
 if(image?.policy==='cc0')return {label:'CC0 1.0',url:'https://creativecommons.org/publicdomain/zero/1.0/'};
 const m=/^cc-(by|by-sa)-(2\.0|2\.5|3\.0|4\.0)$/.exec(image?.policy||'');
 return m?{label:`CC ${m[1].toUpperCase()} ${m[2]}`,url:`https://creativecommons.org/licenses/${m[1]}/${m[2]}/`}:null;
}
const ambience={
 market:{image:'1667084343067-fc200e22a073',page:'24cZizjVBk8',author:'Josh Hild',alt:'Un étal de produits frais sur un marché'},
 cinema:{image:'1489599849927-2ee91cede3ba',page:'evlkOfkQ5rE',author:'Felix Mooneeram',alt:'Les fauteuils rouges d’une salle de cinéma'},
 exhibition:{image:'1524014482380-0988169f598d',page:'oYETu7Tx-7M',author:'Sebastiano Piazzi',alt:'Un visiteur découvre des tableaux dans un musée'},
 theatre:{image:'1651437524278-b37b83a6e6d3',page:'qQQF4yDANm8',author:'Muha Ajjan',alt:'Une scène et les balcons d’un théâtre'},
 concert:{image:'1556340346-5e30da977c4d',page:'VSkeg0xHsss',author:'Lachy Spratt',alt:'Un public partage un concert en plein air'},
 sport:{image:'1516351464815-9a44f19888c2',page:'9cDFlabps0U',author:'Markus Spiske',alt:'Un terrain de sport et son panier de basket'},
 workshop:{image:'1682868067843-11fbc221174a',page:'aW3Sx84gB2w',author:'Jonathan Cosens Photography',alt:'Des personnes participent à un atelier de poterie'},
 visit:{image:'1720281835222-2be40edce94d',page:'txI9k9kOGX0',author:'Naoki Suzuki',alt:'Une allée fleurie dans un parc'},
 library:{image:'1521633313183-bee6321ae965',page:'sXyrbN3c7J4',author:'CHUTTERSNAP',alt:'Les rayonnages de livres d’une bibliothèque'},
 other:{image:'1758275557233-773c6c03614e',page:'6lkDaLeroEA',author:'Vitaly Gariev',alt:'Des amis partagent un bon moment en plein air'}
};
export function ambienceKind(r){
 const text=[r.title,r.category,r.eventKind].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\bmarche\b|brocante|vide.grenier|bourse|foire/.test(text))return 'market';
 if(/cinema|cine[ -]|projection|film\b/.test(text))return 'cinema';
 if(/bibliotheque|mediatheque|lecture|litteraire|livre/.test(text))return 'library';
 if(/musee|galerie|exposition|exhibition|photograph|vernissage|peinture|sculpture/.test(text))return 'exhibition';
 if(/theatre|spectacle|opera/.test(text))return 'theatre';
 if(/concert|musique|festival|danse|jazz|chant/.test(text))return 'concert';
 if(/atelier|workshop|poterie|bricolage/.test(text))return 'workshop';
 if(/sport|piscine|tennis|basket|football|course a pied/.test(text))return 'sport';
 if(/balade|randonnee|parc|jardin|nature|visite/.test(text))return 'visit';
 const kind=illustrationKind(r);return kind==='opera'?'theatre':kind==='dance'?'concert':kind;
}
export function illustrationMarkup(r,{detail=false}={}){
 const kind=illustrationKind(r),photo=ambience[ambienceKind(r)]||ambience.other,media=r.image,license=imageLicense(media),url=license&&imageURL(media?.url),photoURL='https://images.unsplash.com/photo-'+photo.image+'?auto=format&fit=crop&w=640&q=75',photoSource='https://unsplash.com/photos/'+photo.page;
 const source=(()=>{try{const u=new URL(r.sourceUrl);return u.protocol==='https:'?u.href:null;}catch{return null;}})();
 const credit=url?`${source?`<a href="${escape(source)}" target="_blank" rel="noopener noreferrer">${escape(media.credit||'Visuel : '+r.source)}</a>`:escape(media.credit||'Visuel : '+r.source)}${detail?` · <a href="${license.url}" target="_blank" rel="noopener noreferrer">${escape(license.label)}</a>`:''}`:`<a href="${photoSource}" target="_blank" rel="noopener noreferrer">${detail?'Photo d’ambiance · ':''}${escape(photo.author)} / Unsplash</a>`;
 return `<figure data-illustration-detail="${detail?'true':'false'}" class="illustration illustration--${kind}${detail?' illustration--detail':''} illustration--remote${url?'':' illustration--ambient'}"><div class="illustration-frame"><div class="illustration-fallback" aria-hidden="true"></div><img data-remote-image ${url?`data-fallback-src="${escape(photoURL)}" data-fallback-source="${photoSource}" data-fallback-author="${escape(photo.author)}" data-fallback-alt="${escape(photo.alt)}"`:''} src="${escape(url||photoURL)}" alt="${escape(url?(media.alt||''):'Photo d’ambiance : '+photo.alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="640" height="360"></div>${detail?`<figcaption class="illustration-credit">${credit}</figcaption>`:''}</figure>`;
}
export function settleIllustration(img,loaded){
 const figure=img.closest?.('.illustration');if(!figure)return;
 if(!loaded&&img.dataset?.fallbackSrc&&!img.dataset.fallbackTried){
  img.dataset.fallbackTried='1';figure.classList.remove('has-image');figure.classList.add('illustration--ambient');img.src=img.dataset.fallbackSrc;img.alt='Photo d’ambiance : '+img.dataset.fallbackAlt;img.hidden=false;
  const credit=figure.querySelector('.illustration-credit');if(credit)credit.innerHTML=`<a href="${escape(img.dataset.fallbackSource)}" target="_blank" rel="noopener noreferrer">${figure.dataset?.illustrationDetail==='true'?'Photo d’ambiance · ':''}${escape(img.dataset.fallbackAuthor)} / Unsplash</a>`;return;
 }
 const success=loaded&&img.naturalWidth>0;figure.classList.toggle('has-image',success);figure.classList.toggle('image-unavailable',!success);img.hidden=!success;
}
export function watchIllustrations(root){
 root.addEventListener('load',e=>{if(e.target.matches?.('[data-remote-image]'))settleIllustration(e.target,true);},true);
 root.addEventListener('error',e=>{if(e.target.matches?.('[data-remote-image]'))settleIllustration(e.target,false);},true);
}
