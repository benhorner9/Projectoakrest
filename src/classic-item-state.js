import {materialUses,materialSource} from './classic-progression.js';
import {QUICK_ACTIONS,normalizeQuickSlots,assignQuickSlot} from './quick-slots.js';
import {combatSourceSnapshot} from './gameplay-core.js';
import {classicWeaponInterval} from './classic-combat-clock.js';
/**
 * Oakrest Classic: authoritative gameplay item transactions on a
 * short-lived cloned session save. Never writes browser storage.
 * Reuses Oakrest item identity, level locks, shop costs and bank ownership.
 */
import {STYLE_ORDER,LOADOUTS,ARMOUR,canEquipWeapon,canEquipArmour,equipPrimaryItem,equipSkill,skillCatalogue,levelFromXp,defenceFor} from './rules.js';
import {EQUIPMENT_SLOTS,SLOT_ITEMS,canEquipSlotItem,equipSlotItem,allowsOffhand,equipmentModifiers} from './equipment-slots.js';
import {inventoryEntries} from './equipment-ui.js';
import {bankGridEntries,shopGridEntries} from './town-ui.js';
import {bankCoins,bankMaterials,bankEquipment,buyStarterStock,TOWN_MATERIALS,SHOP_STOCK} from './town-services.js';
import {collectDrop,isValidDrop,MAX_GROUND_LOOT} from './loot.js';
import {positionedEntries,reorderSlot,positionTransfer,inventoryKeyList,BAG_MIN_SLOTS,VAULT_MIN_SLOTS,VAULT_MAX_SLOTS} from './item-slot-layout.js';
import {getItem} from './items.js';

export const usableItem=id=>id==='material.ration'||id==='material.woodland-tonic';
export const quickBindable=id=>usableItem(id)||['weapon','armour','slot'].includes(getItem(id)?.kind);
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
   if(token&&(slot.id!=='offhand'||allowsOffhand(data,current))&&data.inventory?.slotted?.includes(token))id='slot.'+token;
  }
  return {...slot,itemId:id,item:getItem(id)};
 });
 const stats=equipmentModifiers(data,current),w=LOADOUTS[current]?.[weapon],defence=defenceFor(data.armour[current]);
 return {style:current,bonuses:{...stats,physical:defence.physical,magical:defence.magical,
  maxHit:w?combatSourceSnapshot(data,current,w).maxHit:0,interval:w?classicWeaponInterval(w):0,reach:w?.reach||0},
  capacity:{bag:inventoryKeyList(data).length,limit:BAG_MIN_SLOTS,vault:inventoryKeyList(data,'vault').length,vaultLimit:VAULT_MAX_SLOTS},
  bag:positionedEntries(items,data.inventorySlots,BAG_MIN_SLOTS),
  vault:positionedEntries(bankGridEntries(data,'vault'),data.bankSlots,VAULT_MIN_SLOTS),
  bagBank:bankGridEntries(data,'bag'),shop:shopGridEntries(data),equipment:equip,
  coins:data.coins||0,bankCoins:data.bank?.coins||0,
  ground:[...(data.groundLoot||[])],weapons:LOADOUTS[current],armour:ARMOUR};
}
/** Only gameplay-owned items; never equip shop inventory or a bank-only item. */
function mutateItem(data,action,{atBank=false,atStore=false,player,dropId}={}){
 if(!action||typeof action!=='object')return {ok:false,reason:'Unknown action'};
 const {type,kind,style,id,slot,scope,from,to,direction}=action;
 if(type==='quick-slot'){
  if(id!==null&&!QUICK_ACTIONS.includes(id)&&!quickBindable(id))return {ok:false,reason:'This item has no quick action.'};
  const next=assignQuickSlot(data.quickSlots,action.index,id);
  if(!next)return {ok:false,reason:'Choose one of the eight quick slots.'};
  data.quickSlots=next;return {ok:true,reason:id?'Quick slot assigned.':'Quick slot cleared.'};
 }
 if(type==='quick-slots'){
  const next=normalizeQuickSlots(action.bindings,quickBindable);
  if(!next)return {ok:false,reason:'Invalid quick slot assignments.'};
  data.quickSlots=next;return {ok:true,reason:'Quick slots updated.'};
 }
 if(type==='drop')return dropItem(data,action,player,dropId);
 if(type==='drag'){
  const {fromScope,toScope,fromIndex,toIndex,canonical}=action;
  if(!['bag','vault'].includes(fromScope)||!['bag','vault'].includes(toScope))return {ok:false,reason:'Unknown item grid.'};
  if((fromScope==='vault'||toScope==='vault')&&!atBank)return {ok:false,reason:'You must be at the banker.'};
  const src=fromScope==='bag'?inventoryEntries(data):bankGridEntries(data,'vault');
  const cells=positionedEntries(src,data[fromScope==='bag'?'inventorySlots':'bankSlots'],fromScope==='bag'?BAG_MIN_SLOTS:VAULT_MIN_SLOTS);
  const entry=cells[fromIndex];
  if(!entry||entry.canonical!==canonical)return {ok:false,reason:'That item has moved. Choose it again.'};
  if(fromScope===toScope)return mutateItem(data,{type:'reorder',scope:fromScope,from:fromIndex,to:toIndex},{atBank,atStore});
  const dest=toScope==='bag'?inventoryEntries(data):bankGridEntries(data,'vault');
  const result=mutateItem(data,{type:'bank',kind:entry.kind,id:entry.id,style:entry.style,direction:fromScope==='bag'?'deposit':'withdraw',quantity:'all'},{atBank,atStore});
  if(result.ok){
   const stillHeld=inventoryKeyList(data,fromScope).includes(canonical);
   if(!stillHeld)positionTransfer(data,fromScope,toScope,canonical,toIndex,src,dest);
  }
  return result;
 }
 if(type==='equip'){
  if(!STYLE_ORDER.includes(style))return {ok:false,reason:'Unknown combat style'};
  if(kind==='slot'&&slot==='offhand'&&id&&!allowsOffhand(data,style))return {ok:false,reason:'Unequip the two-handed weapon before equipping an off-hand.'};
  const previousOffhand=data.equipment?.[style]?.offhand;
  const valid=kind==='slot'?equipSlotItem(data,style,slot,id??null):
   (kind==='weapon'||kind==='armour')?equipPrimaryItem(data,kind,style,id??null):false;
  return valid?{ok:true,reason:previousOffhand&&!data.equipment?.[style]?.offhand?'Two-handed weapon equipped; off-hand kept in your backpack.':'Equipped loadout updated'}:{ok:false,reason:'Item not owned, wrong slot or level locked'};
 }
 if(type==='ability'){
  if(!STYLE_ORDER.includes(style))return {ok:false,reason:'Unknown combat style'};
  const valid=equipSkill(data,style,action.weapon,action.index,id??null);
  return {ok:valid,reason:valid?'Ability loadout updated':'Ability locked or invalid'};
 }
 if(type==='reorder'){
  if(scope==='vault'&&!atBank)return {ok:false,reason:'You must be at the banker.'};
  const entries=scope==='vault'?bankGridEntries(data,'vault'):inventoryEntries(data);
  if(!['bag','vault'].includes(scope))return {ok:false,reason:'Unknown item grid'};
  const valid=reorderSlot(data,scope,entries,from,to);
  return {ok:valid,reason:valid?'Item moved':'Invalid item position'};
 }
 if(type==='bank'){
  if(!atBank)return {ok:false,reason:'You must be at the banker'};
  if(!['deposit','withdraw'].includes(direction))return {ok:false,reason:'Invalid transfer'};
  const quantity=action.quantity==='all'?Infinity:Number(action.quantity??1);
  if((!Number.isSafeInteger(quantity)&&quantity!==Infinity)||quantity<=0)return {ok:false,reason:'Invalid quantity'};
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
function commitFields(target,source){
 for(const key of Object.keys(target))if(!Object.hasOwn(source,key))delete target[key];
 for(const [key,value] of Object.entries(source)){
  if(value&&typeof value==='object'&&!Array.isArray(value)&&target[key]&&typeof target[key]==='object'&&!Array.isArray(target[key]))commitFields(target[key],value);
  else if(Array.isArray(value)&&Array.isArray(target[key]))target[key].splice(0,target[key].length,...value);
  else target[key]=value;
 }
}
/** Copy/validate/commit: failed transfers and purchases never partially mutate ownership. */
export function classicItemAction(data,action,context={}){
 const candidate=structuredClone(data),result=mutateItem(candidate,action,context);
 if(!result.ok)return result;
 for(const [scope,capacity] of [['bag',BAG_MIN_SLOTS],['vault',VAULT_MAX_SLOTS]]){
  if(inventoryKeyList(candidate,scope).length>Math.max(capacity,inventoryKeyList(data,scope).length))
   return {ok:false,reason:scope==='bag'?'Your backpack is full. Bank or drop an item first.':'The bank is full.'};
 }
 for(const key of ['inventory','bank','coins','gear','armour','equipment','slots','inventorySlots','bankSlots','quickSlots','groundLoot'])
  if(Object.hasOwn(candidate,key)){
   if(candidate[key]&&typeof candidate[key]==='object'&&!Array.isArray(candidate[key])&&data[key])commitFields(data[key],candidate[key]);
   else data[key]=candidate[key];
  }
 return result;
}
export function canDropItem(item){
 return !!item&&item.kind!=='scroll'&&!['material.ward-seal','material.warden-heart'].includes(item.id);
}
function dropItem(data,action,player,dropId){
 const item=getItem(action.id),entry=inventoryEntries(data).find(e=>e.canonical===action.id);
 if(!entry||!canDropItem(item))return {ok:false,reason:'This item cannot be dropped.'};
 if(!Number.isFinite(player?.x)||!Number.isFinite(player?.z)||typeof dropId!=='function')return {ok:false,reason:'Invalid drop location.'};
 if((data.groundLoot||[]).length>=MAX_GROUND_LOOT)return {ok:false,reason:'Too many items on the ground. Collect nearby loot first.'};
 const equipped=entry.kind==='weapon'?data.gear[entry.style]===entry.id:entry.kind==='armour'?Object.values(data.armour).includes(entry.id):
  entry.kind==='slot'?Object.values(data.equipment).some(slots=>Object.values(slots).includes(entry.id)):false;
 if(equipped)return {ok:false,reason:'Unequip this item from every loadout before dropping it.'};
 const requested=action.quantity==='all'?entry.qty:Number(action.quantity??1);
 if(!Number.isSafeInteger(requested)||requested<1)return {ok:false,reason:'Enter a whole quantity.'};
 const amount=Math.min(entry.qty,requested,9999);
 const drop={...item.legacy,id:dropId(),amount,x:player.x,z:player.z,playerDrop:true};
 if(!isValidDrop(drop))return {ok:false,reason:'This item cannot be dropped here.'};
 if(entry.kind==='coins')data.coins-=amount;
 else if(entry.kind==='material'){
  data.inventory.materials[entry.id]-=amount;
  if(!data.inventory.materials[entry.id])delete data.inventory.materials[entry.id];
 }else{
  const list=entry.kind==='weapon'?data.inventory.weapons[entry.style]:entry.kind==='armour'?data.inventory.armour:data.inventory.slotted;
  list.splice(list.indexOf(entry.id),1);
 }
 data.groundLoot??=[];data.groundLoot.push(drop);
 return {ok:true,reason:'Dropped '+amount+' × '+item.title,amount};
}
export function classicPickup(data,player,id){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.z))return {ok:false,reason:'Invalid location'};
 const drop=(data.groundLoot||[]).find(d=>d.id===id);
 if(!drop||!isValidDrop(drop)||Math.hypot(player.x-drop.x,player.z-drop.z)>3.2)return {ok:false,reason:'Move closer to the dropped item'};
 const item=getItem(drop.kind==='weapon'?'weapon.'+drop.style+'.'+drop.itemId:drop.kind==='coins'?'currency.coins':drop.kind+'.'+drop.itemId);
 const banked=drop.kind==='weapon'?data.bank?.weapons?.[drop.style]:drop.kind==='armour'?data.bank?.armour:data.bank?.slotted;
 const duplicate=['weapon','armour','slot'].includes(drop.kind)&&(owned(data,item)||banked?.includes(drop.itemId));
 if(drop.kind==='material'&&(data.inventory.materials[drop.itemId]||0)+drop.amount>9999||
  (drop.kind==='coins'||duplicate)&&data.coins+(duplicate?8:drop.amount)>10000000)
  return {ok:false,reason:'That stack is full. Make room before collecting it.'};
 const candidate=structuredClone(data);
 if(!collectDrop(candidate,drop))return {ok:false,reason:'Item cannot be collected'};
 if(inventoryKeyList(candidate).length>Math.max(BAG_MIN_SLOTS,inventoryKeyList(data).length))
  return {ok:false,reason:'Your backpack is full. Bank or drop an item first.'};
 commitFields(data.inventory,candidate.inventory);data.coins=candidate.coins;
 data.groundLoot=data.groundLoot.filter(x=>x.id!==id);
 return {ok:true,reason:duplicate?'Already owned '+item.title+' · salvaged for 8 coins':'Picked up '+(drop.amount>1?drop.amount+' × ':'')+item.title};
}
export function classicItemDetails(data,id,style){
 const item=getItem(id);if(!item)return null;
 const {kind,legacy}=item;
 const facts=[];
 let allowed=false,equipped=false,action=null;
 if(kind==='weapon'){
  const w=LOADOUTS[legacy.style]?.[legacy.itemId];
  facts.push(['Style',legacy.style],['Hands',w.hands||1],['Requires',legacy.style+' '+w.requiredLevel],
   ['Weapon power',w.basic],['Interval',classicWeaponInterval(w).toFixed(1)+'s'],['Reach',w.reach+'m']);
  const equippedWeapon=LOADOUTS[legacy.style][data.gear[legacy.style]];
  const candidateHit=combatSourceSnapshot({...data,gear:{...data.gear,[legacy.style]:legacy.itemId}},legacy.style,w).maxHit;
  const currentHit=equippedWeapon?combatSourceSnapshot(data,legacy.style,equippedWeapon).maxHit:0;
  facts.push(['Max basic hit',candidateHit+' ('+(candidateHit-currentHit>=0?'+':'')+(candidateHit-currentHit)+' vs equipped)']);
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
   ['Style',def.style==='all'?'All three styles':def.style],['Requires',(def.style==='all'?'Any style':def.style)+' '+def.requiredLevel],
   ['Power',def.power+'%'],['Guard',def.guard+'%']);
  const targetStyle=def.style==='all'?style:def.style;
  allowed=canEquipSlotItem(data,targetStyle,legacy.itemId);
  equipped=data.equipment?.[targetStyle]?.[def.slot]===legacy.itemId;
  if(def.style==='all'){
   const equippedStyles=STYLE_ORDER.filter(s=>data.equipment?.[s]?.[def.slot]===legacy.itemId);
   facts.push(['Used by',equippedStyles.length?equippedStyles.map(s=>s.toUpperCase()).join(', '):'Not equipped']);
  }
  action={type:'equip',kind,style:targetStyle,slot:def.slot,id:equipped?null:legacy.itemId};
 }else if(kind==='material'){
  facts.push(['Owned',data.inventory?.materials?.[legacy.itemId]||0]);
  const source=materialSource(legacy.itemId),uses=materialUses(legacy.itemId);
  if(source)facts.push(['Find',source]);
  if(uses.length)facts.push(['Make',uses.join(' · ')]);
  if(legacy.itemId==='bandit-token')facts.push(['Trade','Elowen: 5 tokens for ammunition, scrolls or rations']);
 }
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
