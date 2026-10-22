/** Fail-open boundary: town movement/interactions must survive optional art failure. */
import {CITIZEN_ART_LIMIT} from './town-citizen-art-rules.js';
export function createTownCitizenArtBridge(citizens){
 let enabled=false,active=null,loading=null;
 function setEnabled(value){
  enabled=!!value;
  if(!enabled){active?.setEnabled(false);return;}
  if(active){active.setEnabled(true);return;}
  if(!loading)loading=import('./town-citizen-art.js').then(mod=>{
   active=mod.createTownCitizenArt(citizens);
   active.setEnabled(enabled);
   return active;
  }).catch(err=>{console.warn('Town citizen art fallback enabled',err);});
 }
 return {
  setEnabled,
  update(dt,t,player,world=true){if(enabled&&world)active?.update(dt,t,player);},
  snapshot:()=>active?.snapshot()||{enabled,loaded:0,pending:0,max:CITIZEN_ART_LIMIT,models:[],citizens:[]}
 };
}
