/** Equipment ownership stays in the save's single owned-item catalogue.
 * A piece occupying one or several combat-style loadouts is not a spare bag item.
 * The same neutral accessory can appear in all three style loadouts without
 * creating additional physical copies, while each specific accessory remains
 * restricted to its matching style.
 *
 * This module deliberately has no imports so it can be used by both the
 * inventory position/capacity system and all item UIs without circular imports.
 */
export function equippedItemKeys(data){
 const keys=new Set();
 for(const style of ['melee','magic','ranged']){
  const weapon=data.gear?.[style];
  if(weapon&&weapon!=='none')keys.add('weapon.'+style+'.'+weapon);
  const chest=data.armour?.[style];
  if(chest&&chest!=='none')keys.add('armour.'+chest);
  for(const id of Object.values(data.equipment?.[style]||{})){
   if(typeof id==='string'&&id)keys.add('slot.'+id);
  }
 }
 return keys;
}
export function isSpareEquipment(data,canonical){
 return !equippedItemKeys(data).has(canonical);
}
