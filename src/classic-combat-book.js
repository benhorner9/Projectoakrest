/** Display-only model for the Oakrest COMBAT book. No combat or save mutations. */
import {LOADOUTS,STYLE_ORDER} from './rules.js';
import {classicAbilityCatalogue} from './classic-item-state.js';
const BOOKS={
 melee:{title:'MELEE TECHNIQUES',section:'BLADE & GUARD',hint:'Prepare your melee techniques'},
 magic:{title:'MAGIC SPELLBOOK',section:'ARCANE ARTS',hint:'Prepare your spells'},
 ranged:{title:'RANGED TECHNIQUES',section:'MARKSMANSHIP',hint:'Prepare your shots'}
};
export function classicCombatBook(data,style,state){
 if(!STYLE_ORDER.includes(style))return null;
 const weaponId=data.gear?.[style],weapon=LOADOUTS[style]?.[weaponId];
 const slots=data.slots?.[style]?.[weapon?.family||weaponId]||[];
 const skills=weapon?classicAbilityCatalogue(data,style):[];
 return {
  style,weaponId,weaponName:weapon?.title||'No weapon equipped',...(BOOKS[style]||{}),
  slots:[0,1,2,3].map(i=>{
   const skill=skills.find(a=>a.id===slots[i]);
   const live=state?.style===style?state.abilities?.[i]:null;
   const remaining=Math.max(0,(live?.cooldownEnd||0)-(state?.time||0));
   return {index:i,id:slots[i]||null,name:skill?.name||'Empty',remaining,
    status:!skill?'Empty':remaining>0?'Ready in '+remaining.toFixed(1)+'s':live?.available?'Ready':live?.unavailableReason||'Not ready'};
  }),
  skills:skills.map(skill=>({...skill,slot:slots.indexOf(skill.id),locked:!skill.unlocked}))
 };
}
