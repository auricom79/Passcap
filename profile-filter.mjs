import {needs} from './signage.mjs';
let member=null;
const listeners=new Set();
export function activeProfileNeeds(){return member&&member.autoFilter!==false&&Array.isArray(member.needs)?member.needs.filter(k=>Object.hasOwn(needs,k)):[];}
export function subscribeProfileFilter(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
export function applyMemberProfile(profile){
 member=profile;
 if(typeof document!=='undefined'){
  const bar=document.getElementById('profile-filter-bar'),toggle=document.getElementById('profile-filter-toggle'),description=document.getElementById('profile-filter-description');
  const chosen=Array.isArray(member?.needs)?member.needs.filter(k=>Object.hasOwn(needs,k)):[];
  if(bar)bar.hidden=!chosen.length;
  if(toggle)toggle.checked=member?.autoFilter!==false;
  if(description)description.textContent=chosen.length?`${chosen.map(k=>needs[k].label).join(' · ')}. Lorsque le filtre est actif, seules les adaptations déclarées pour tous vos besoins sont retenues. Vous pouvez le désactiver pour élargir les résultats.`:'';
 }
 for(const fn of listeners)fn();
}
export function mountProfileFilter(savePreference){
 const toggle=document.getElementById('profile-filter-toggle'),status=document.getElementById('profile-filter-status');
 toggle?.addEventListener('change',async()=>{const enabled=toggle.checked;toggle.disabled=true;status.textContent='';try{const profile=await savePreference(enabled);applyMemberProfile(profile);status.textContent=enabled?'Filtre de mon profil activé.':'Filtre de mon profil désactivé : tous les événements peuvent être affichés.';}catch{toggle.checked=member?.autoFilter!==false;status.textContent='Le changement n’a pas été enregistré. Réessayez.';}finally{toggle.disabled=false;}});
 applyMemberProfile(member);
}
