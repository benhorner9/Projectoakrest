import {classicWeaponInterval} from './classic-combat-clock.js';
/**
 * Oakrest Classic Block 5: authoritative gameplay item transactions on a
 * short-lived cloned session save. Never writes browser storage.
 * Reuses Oakrest item identity, level locks, shop costs and bank ownership.
 */
import {STYLE_ORDER,LOADOUTS,ARMOUR,canEquipWeapon,canEquipArmour,equipPrimaryItem,equipSkill,skillCatalogue,levelFromXp} from './rules.js';
import {EQUIPMENT_SLOTS,SLOT_ITEMS,equipSlotItem} from './equipment-slots.js';
import {inventoryEntries} from './equipment-ui.js';
import {bankGridEntries,shopGridEntries} from './town-ui.js';
import {bankCoins,bankMaterials,bankEquipment,buyStarterStock,TOWN_MATERIALS,SHOP_STOCK} from './town-services.js';
import {closestDrop,collectDrop,isValidDrop} from './loot.js';
import {positionedEntries,reorderSlot,BAG_MIN_SLOTS,VAULT_MIN_SLOTS} from './item-slot-layout.js';
import {getItem} from './items.js';

const owned=(data,item)=>{
 if(!item)return false;
 const {kind,legacy}=item;
 if(kind==='weapon')return !!data.inventory?.weapons?.[legacy.style]?.includes(legacy.itemId);
 if(kind==='armour')return !!data.inventory?.armour?.includes(legacy.itemId);
 if(kind==='slot')return !!data.inventory?.slotted?.includes(legacy.itemId);
 return false;
};
export function classicItemSnapshot(data,style='melee'){
 const current=STYLE_ORDER.includes(style)?style:'melee',weapon=data.gear[current];
 const items=inventoryEntries(data);
 const equip=EQUIPMENT_SLOTS.map(slot=>{
  let id=null;
  if(slot.id==='weapon'&&weapon!=='none'&&data.inventory?.weapons?.[current]?.includes(weapon))id='weapon.'+current+'.'+weapon;
  else if(slot.id==='chest'&&data.armour[current]!=='none'&&data.inventory?.armour?.includes(data.armour[current]))
   id='armour.'+data.armour[current];
  else {
   const token=data.equipment?.[current]?.[slot.id];
   if(token&&data.inventory?.slotted?.includes(token))id='slot.'+token;
  }
  return {...slot,itemId:id,item:getItem(id)};
 });
 return {style:current,bag:positionedEntries(items,data.inventorySlots,BAG_MIN_SLOTS),
  vault:positionedEntries(bankGridEntries(data,'vault'),data.bankSlots,VAULT_MIN_SLOTS),
  bagBank:bankGridEntries(data,'bag'),shop:shopGridEntries(data),equipment:equip,
  coins:data.coins||0,bankCoins:data.bank?.coins||0,
  ground:[...(data.groundLoot||[])],weapons:LOADOUTS[current],armour:ARMOUR};
}
/** Only gameplay-owned items; never equip shop inventory or a bank-only item. */
export function classicItemAction(data,action,{atBank=false,atStore=false}={}){
 if(!action||typeof action!=='object')return {ok:false,reason:'Unknown action'};
 const {type,kind,style,id,slot,scope,from,to,direction}=action;
 if(type==='equip'){
  if(!STYLE_ORDER.includes(style))return {ok:false,reason:'Unknown combat style'};
  const valid=kind==='slot'?equipSlotItem(data,style,slot,id??null):
   (kind==='weapon'||kind==='armour')?equipPrimaryItem(data,kind,style,id??null):false;
  return valid?{ok:true,reason:'Equipped loadout updated'}:{ok:false,reason:'Item not owned, wrong slot or level locked'};
 }
 if(type==='ability'){
  if(!STYLE_ORDER.includes(style))return {ok:false,reason:'Unknown combat style'};
  const valid=equipSkill(data,style,action.weapon,action.index,id??null);
  return {ok:valid,reason:valid?'Ability loadout updated':'Ability locked or invalid'};
 }
 if(type==='reorder'){
  const entries=scope==='vault'?bankGridEntries(data,'vault'):inventoryEntries(data);
  if(!['bag','vault'].includes(scope))return {ok:false,reason:'Unknown item grid'};
  const valid=reorderSlot(data,scope,entries,from,to);
  return {ok:valid,reason:valid?'Item moved':'Invalid item position'};
 }
 if(type==='bank'){
  if(!atBank)return {ok:false,reason:'You must be at the banker'};
  if(!['deposit','withdraw'].includes(direction))return {ok:false,reason:'Invalid transfer'};
  const quantity=action.quantity==='all'?Infinity:Number(action.quantity??1);
  if(!Number.isFinite(quantity)&&quantity!==Infinity||quantity<=0)return {ok:false,reason:'Invalid quantity'};
  const amount=kind==='coins'?bankCoins(data,direction,quantity):
   kind==='material'&&TOWN_MATERIALS.includes(id)?bankMaterials(data,id,direction,quantity):0;
  if(kind==='coins'||kind==='material')
   return amount>0?{ok:true,reason:'Transferred '+amount,amount}:{ok:false,reason:'Nothing available to transfer'};
  if(!['weapon','armour','slot'].includes(kind))return {ok:false,reason:'Unsupported bank item'};
  const success=bankEquipment(data,kind,id,direction,style||null);
  return {ok:success,reason:success?'Equipment transferred':'Unequip this item first, or check ownership'};
 }
 if(type==='buy'){
  if(!atStore)return {ok:false,reason:'You must be at the shopkeeper'};
  if(!SHOP_STOCK.some(stock=>stock.id===id))return {ok:false,reason:'Unknown shop item'};
  return buyStarterStock(data,id);
 }
 return {ok:false,reason:'Unsupported action'};
}
export function classicPickup(data,player,id){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.z))return {ok:false,reason:'Invalid location'};
 const nearest=closestDrop(data.groundLoot||[],player.x,player.z,3.2);
 if(!nearest||nearest.id!==id||!isValidDrop(nearest))return {ok:false,reason:'Move closer to the dropped item'};
 const item=getItem(nearest.kind==='weapon'?'weapon.'+nearest.style+'.'+nearest.itemId:
  nearest.kind==='coins'?'currency.coins':nearest.kind+'.'+nearest.itemId);
 if(!collectDrop(data,nearest))return {ok:false,reason:'Item cannot be collected'};
 data.groundLoot=data.groundLoot.filter(x=>x.id!==id);
 return {ok:true,reason:'Picked up '+(item?.title||'item')};
}
export function classicItemDetails(data,id,style){
 const item=getItem(id);if(!item)return null;
 const {kind,legacy}=item;
 const facts=[];
 let allowed=false,equipped=false,action=null;
 if(kind==='weapon'){
  const w=LOADOUTS[legacy.style]?.[legacy.itemId];
  facts.push(['Style',legacy.style],['Requires',legacy.style+' '+w.requiredLevel],
   ['Weapon power',w.basic],['Interval',classicWeaponInterval(w).toFixed(1)+'s'],['Reach',w.reach+'m']);
  allowed=owned(data,item)&&canEquipWeapon(legacy.style,legacy.itemId,data.xp);
  equipped=data.gear[legacy.style]===legacy.itemId;
  action={type:'equip',kind,style:legacy.style,id:equipped?null:legacy.itemId};
 }else if(kind==='armour'){
  const a=ARMOUR[legacy.itemId];facts.push(['Requires','Vitality '+a.requiredVitality],
   ['Physical defence',Math.round(a.physical*100)+'%'],['Magic defence',Math.round(a.magical*100)+'%']);
  allowed=owned(data,item)&&canEquipArmour(legacy.itemId,data.xp);
  equipped=data.armour[style]===legacy.itemId;
  action={type:'equip',kind,style,id:equipped?null:legacy.itemId};
 }else if(kind==='slot'){
  const def=SLOT_ITEMS[legacy.itemId];
  facts.push(['Slot',EQUIPMENT_SLOTS.find(s=>s.id===def.slot)?.label||def.slot],
   ['Style',def.style],['Requires',def.style+' '+def.requiredLevel],
   ['Power',def.power+'%'],['Guard',def.guard+'%']);
  allowed=owned(data,item)&&levelFromXp(data.xp[def.style]).level>=def.requiredLevel;
  equipped=data.equipment?.[def.style]?.[def.slot]===legacy.itemId;
  action={type:'equip',kind,style:def.style,slot:def.slot,id:equipped?null:legacy.itemId};
 }else if(kind==='material')facts.push(['Owned',data.inventory?.materials?.[legacy.itemId]||0]);
 else if(kind==='coins')facts.push(['Owned',data.coins||0]);
 else if(kind==='scroll')facts.push(['Owned',data.onboarding?.teleportScrolls||0]);
 return {item,title:item.title,description:item.description||'An item found in Oakrest.',
  facts,allowed,equipped,action};
}
export function classicAbilityCatalogue(data,style){
 if(!STYLE_ORDER.includes(style))return [];
 const weapon=data.gear?.[style],level=levelFromXp(data.xp?.[style]||0).level;
 const w=LOADOUTS[style]?.[weapon];
 return w?skillCatalogue(style,weapon).map(skill=>({
  ...skill,unlocked:skill.requiredLevel<=level
 })):[];
}
