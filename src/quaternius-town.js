/** Peaceful civilian models and proximity budget. No NPC action/physics ownership. */
import {townOutfit} from './quaternius-catalog.js';
import {mountQuaterniusModel,unmountQuaterniusModel,updateQuaterniusModel,quaterniusState} from './quaternius-runtime.js';
const LIMIT=7,LOAD_DISTANCE=27,UNLOAD_DISTANCE=33;

export function createQuaterniusTownArt(citizens){
 const mounted=new Set(),pending=new Set(),failed=new Set();
 let active=false,timer=0,epoch=0;
 function toggle(value){
  active=!!value;epoch++;
  if(!active){
   for(const person of mounted)unmountQuaterniusModel(person.root);
   mounted.clear();pending.clear();
  }
 }
 function update(dt,player){
  if(!active||!player)return;
  timer+=dt;
  if(timer>=.45){
   timer=0;
   const choices=citizens.map((person,i)=>({person,i,d:Math.hypot(person.x-player.x,person.z-player.z)}))
    .filter(x=>x.d<(mounted.has(x.person)?UNLOAD_DISTANCE:LOAD_DISTANCE))
    .sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,LIMIT);
   const wanted=new Set(choices.map(x=>x.person));
   for(const person of mounted)if(!wanted.has(person)){
    unmountQuaterniusModel(person.root);mounted.delete(person);
   }
   for(const {person,i} of choices){
    if(mounted.has(person)||pending.has(person)||failed.has(person))continue;
    const token=epoch;pending.add(person);
    // Keep familiar face/head/hair/eyes on the Quaternius headless peasant
    // outfit. This avoids combining adult combat armour with civilians.
    const original=person.root.userData.civilianParts||[];
    const keep=original.slice(1,5);
    mountQuaterniusModel(person.root,townOutfit(person.role,i),2.38,{keepOriginals:keep})
     .then(ok=>{
      pending.delete(person);
      if(token!==epoch||!active||!ok){
       if(ok)unmountQuaterniusModel(person.root);
       if(!ok)failed.add(person);
       return;
      }
      if(mounted.size>=LIMIT){unmountQuaterniusModel(person.root);return;}
      mounted.add(person);
     }).catch(err=>{pending.delete(person);failed.add(person);console.warn('Civilian fallback',err);});
   }
  }
  for(const person of mounted)updateQuaterniusModel(person.root,dt,{moving:person.walking===true});
 }
 return {
  setEnabled:toggle,update,
  snapshot:()=>({enabled:active,loaded:mounted.size,max:LIMIT,
   citizens:[...mounted].map(person=>({name:person.name,role:person.role,...quaterniusState(person.root)}))})
 };
}
