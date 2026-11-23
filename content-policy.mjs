// Shared by the import cleanup and the browser: incomplete never means unqualified.
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").replace(/[-–—]/g,' ');
export function hasDeclaredNeed(record){
 return Object.values(record.features||{}).some(feature=>feature?.value===true);
}
export function isEmploymentContent(record){
 if(record.type!=='event')return false;
 const title=normalize(record.title);
 const origin=normalize([record.producer,record.sourceUrl,record.website].join(' '));
 const description=normalize(record._selectionDescription??record.description);
 if(/france\s*travail|francetravail|pole[\s.]?emploi|mesevenementsemploi|mes evenements emploi/.test(origin))return true;
 const titleSignals=[
  /\boffres? d[' ]emploi\b/,
  /\b(?:session|journee|campagne|entretien|reunion)\b.{0,25}\brecrutement\b/,
  /\b(?:nous recrutons|recrute|recrutent|recrutons|recrutez)\b/,
  /\bpostes? a pourvoir\b/,
  /\bjob\s*(?:dating|date|etudiant|ete|saisonnier)\b/,
  /\b(?:forum|salon|tram|rencontres?|journee|semaine)\b.{0,35}\b(?:emploi|jobs?|recrutement|alternance)\b/,
  /\b(?:recherche|retour|acces)\b.{0,15}\bemploi\b/,
  /\b(?:atelier|booster|booste|creer|creation|rediger|ameliorer|optimiser)\b.{0,50}\bcv\b/,
  /\b(?:lettre de motivation|entretien d'embauche|candidature spontanee)\b/,
  /\b(?:decroche|decrocher)\b.{0,30}\b(?:emploi|mission|poste|contrat)\b/
 ];
 if(titleSignals.some(pattern=>pattern.test(title)))return true;
 // Cultural works and reduced prices for jobseekers are not job advertisements.
 if(/\b(?:theatre|comedie|spectacle|exposition|concert|lecture|projection|film|visite|musee)\b/.test(title))return false;
 return /\bjob\s*dating\b|\boffres? d[' ]emploi\b|\bpostes? a pourvoir\b|\bentreprises qui recrutent\b|\brencontrer (?:des|les|nos) recruteurs\b/.test(description);
}
export function isEligibleRecord(record){return hasDeclaredNeed(record)&&!isEmploymentContent(record);}
