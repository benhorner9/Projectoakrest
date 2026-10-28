/** Read-only reward/upgrade guidance; transactions remain in combat/adventure. */
import {RECIPES,ADVENTURE_SPAWNS} from './adventure-content.js';
import {DEFAULT_DROP_TABLES} from './drop-tables.js';
import {getItem} from './items.js';
import {LOADOUTS,levelFromXp} from './rules.js';
import {woodcuttingLevel} from './woodcutting.js';
export const professionName=id=>id==='cooking'?'Fieldcraft':id[0].toUpperCase()+id.slice(1);
export const recipeItemId=r=>r.result.weapon?'weapon.'+r.result.style+'.'+r.result.weapon:
 r.result.armour?'armour.'+r.result.armour:r.result.slot?'slot.'+r.result.slot:'material.'+r.result.material;
export function recipeGuidance(save,r){
 const o=r.result,w=o.weapon?LOADOUTS[o.style][o.weapon]:null;
 const owned=o.weapon?[save.inventory.weapons[o.style],save.bank.weapons[o.style]].some(list=>list.includes(o.weapon)):
  o.armour?[save.inventory.armour,save.bank.armour].some(list=>list.includes(o.armour)):
  o.slot?[save.inventory.slotted,save.bank.slotted].some(list=>list.includes(o.slot)):false;
 return {owned,title:getItem(recipeItemId(r))?.title||r.title,
  training:`${professionName(r.profession)} ${r.level} · +${r.xp} XP per batch`,
  requirement:w?`Equip: ${o.style} level ${w.requiredLevel}`:'',
  ready:woodcuttingLevel(save.adventure?.skills?.[r.profession]||0).level>=r.level&&
   Object.entries(r.cost).every(([id,n])=>(save.inventory.materials[id]||0)>=n)};
}
export function materialUses(id){
 return RECIPES.filter(r=>Object.hasOwn(r.cost,id)).map(r=>r.title);
}
export function materialSource(id){
 if(id==='warden-heart')return 'Restore the Hollow heartstone: 1 guaranteed per completed expedition.';
 if(id==='hollow-shard')return 'Pick up 1 from each Hollow guardian; restore the heartstone for 4 more.';
 if(id==='softwood-logs')return 'Cut softwood with a carried axe; Alden teaches Woodcutting.';
 if(id==='copper-ore'||id==='tin-ore')return 'Mine the west quarry; smelt copper + tin at the village forge.';
 if(id==='reed')return 'Gather from either creek reed bed.';
 const sources=Object.entries(DEFAULT_DROP_TABLES).flatMap(([type,rows])=>rows.filter(r=>r.itemId==='material.'+id&&r.chancePercent>0).map(r=>`${type}: ${r.chancePercent}% per kill`));
 return sources.join(' · ');
}
export function hollowGoals(save){
 return RECIPES.filter(r=>r.cost['warden-heart']).map(r=>{
  const style=r.result.style,id=r.result.weapon,w=LOADOUTS[style][id];
  const owned=save.inventory.weapons[style].includes(id)||save.bank.weapons[style].includes(id);
  return {id:r.id,title:w.title,style,owned,requirement:`${professionName(r.profession)} ${r.level} · ${style} ${w.requiredLevel} to equip`,
   trained:levelFromXp(save.xp[style]).level>=w.requiredLevel,
   materials:Object.entries(r.cost).map(([id,required])=>({id,title:getItem('material.'+id)?.title||id,required,
    bag:save.inventory.materials[id]||0,bank:save.bank.materials[id]||0}))};
 });
}
export const hollowShardTotal=()=>ADVENTURE_SPAWNS.filter(m=>m.room!==undefined).length+4;
