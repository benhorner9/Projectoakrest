import {ADVENTURE_MATERIAL_IDS} from './adventure-content.js';
import {STARTER_SETS,SLOT_ITEMS,EXTRA_SLOTS} from './equipment-slots.js';
import {WOODCUTTING_MATERIALS,WOODCUTTING_AXES} from './woodcutting.js';
/** Oakrest is a starter hub, not a universal skilling destination.
 * New settlements should register their own exclusive skills instead of
 * offering the entire skill catalogue in every bank/shop.
 */
export const TOWN_SPECIALISATIONS=Object.freeze({oakrest:Object.freeze(['woodcutting'])});
export const OAKREST_SERVICES=Object.freeze([
  Object.freeze({id:'bank',label:'Oakrest Bank',x:-30,z:14,npcX:-32.7,npcZ:14,reach:3.6,kind:'bank',attendant:'Mara the Banker'}),
  Object.freeze({id:'trade-house',label:'Oakrest Trade House',x:15,z:64.5,npcX:17.6,npcZ:64.5,reach:3.6,kind:'trade',attendant:'Tessa the Trade Steward'}),
  Object.freeze({id:'store',label:'Oakrest General Store',x:30,z:14,npcX:32.7,npcZ:14,reach:3.6,kind:'store',attendant:'Darrin the Shopkeeper'}),
  Object.freeze({id:'forester',label:"Forester's Lodge",x:-30,z:46,npcX:-32.7,npcZ:46,reach:3.6,kind:'skill',skill:'woodcutting',attendant:'Alden the Forester'})
]);
export const OAKREST_NOTICES=Object.freeze([
 Object.freeze({id:'heartwood-notice',label:'Heartwood Noticeboard',x:-12,z:49,reach:2.4,type:'notice',
  line:'The old oak marks the centre of Oakrest. Bank your belongings, visit the market and find the Warden’s Hall along the north-west lane.'}),
 Object.freeze({id:'wardens-notice',label:'Warden’s Notices',x:-13,z:42,reach:2.4,type:'notice',
  line:'The Southgate road remains safe for new travellers. Keep training beyond the greenbelt; the deeper forest is no place for an unprepared adventurer.'})
]);
export const OAKREST_GROVES=Object.freeze([
  Object.freeze({id:'pine-west',x:-18,z:59,reach:2.6}),
  Object.freeze({id:'pine-east',x:-8,z:56,reach:2.6}),
  Object.freeze({id:'pine-north',x:-13,z:65,reach:2.6})
]);
export const TOWN_MATERIALS=Object.freeze(['moss-fibre','boar-hide','bandit-token',...WOODCUTTING_MATERIALS,...ADVENTURE_MATERIAL_IDS]);
export const SHOP_STOCK=Object.freeze([
  ...Object.values(STARTER_SETS).map(set=>Object.freeze({id:set.id,label:set.title,kind:'bundle',style:set.style,price:set.price})),
  Object.freeze({id:'starter-sword',label:'Iron Longsword',kind:'weapon',style:'melee',itemId:'sword',price:45}),
  Object.freeze({id:'starter-staff',label:'Frostwood Staff',kind:'weapon',style:'magic',itemId:'frost',price:45}),
  Object.freeze({id:'starter-bow',label:'Oak Longbow',kind:'weapon',style:'ranged',itemId:'bow',price:45}),
  Object.freeze({id:'starter-robe',label:'Traveller Clothing',kind:'armour',itemId:'traveller',price:35}),
  ...WOODCUTTING_AXES.map(axe=>Object.freeze({id:'stock-'+axe.id,label:axe.name,kind:'weapon',style:'melee',itemId:axe.id,price:axe.price}))
]);
export const STARTER_GROVE_XP_CAP=710; // The level 5 ceiling sends advanced learners elsewhere.
export const WOODCUTTING_XP_PER_LOG=35;
export const WOODCUTTING_HARVEST_SECONDS=9;

/** The roads and streets are non-hostile. The first hostile spawns are well beyond this line. */
export const isOakrestSafe=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=40&&z>=-43&&z<=75;
export function townInteraction(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  const options=[
    ...OAKREST_SERVICES.map(s=>({...s,type:'service',x:s.npcX??s.x,z:s.npcZ??s.z})),
    ...OAKREST_GROVES.map(s=>({...s,type:'grove',species:'softwood',label:'Softwood tree'})),
    ...OAKREST_NOTICES
  ].map(point=>({...point,distance:Math.hypot(x-point.x,z-point.z)}))
   .filter(point=>point.distance<=point.reach)
   .sort((a,b)=>a.distance-b.distance);
  return options[0]||null;
}
export function townBank(data){
  if(!data.bank||typeof data.bank!=='object')data.bank={};
  const bank=data.bank;
  if(!Number.isSafeInteger(bank.coins)||bank.coins<0)bank.coins=0;
  if(!bank.materials||typeof bank.materials!=='object')bank.materials={};
  if(!bank.weapons||typeof bank.weapons!=='object')bank.weapons={};
  for(const style of ['melee','magic','ranged'])if(!Array.isArray(bank.weapons[style]))bank.weapons[style]=[];
  if(!Array.isArray(bank.armour))bank.armour=[];
  if(!Array.isArray(bank.slotted))bank.slotted=[];
  return bank;
}
export function bankCoins(data,direction,requested=Infinity){
  const bank=townBank(data),deposit=direction==='deposit';
  if(!deposit&&direction!=='withdraw')return 0;
  const src=deposit?data:bank,dest=deposit?bank:data;
  const available=Math.max(0,Math.floor(Number(src.coins)||0));
  const limit=requested===Infinity?Infinity:Number.isFinite(requested)?Math.max(0,Math.floor(requested)):0;
  const amount=Math.min(available,Math.max(0,10000000-Math.floor(Number(dest.coins)||0)),limit);
  if(amount<=0)return 0;
  src.coins-=amount;dest.coins+=amount;return amount;
}
export function bankMaterials(data,id,direction,requested=Infinity){
  if(!TOWN_MATERIALS.includes(id)||!['deposit','withdraw'].includes(direction))return 0;
  const bank=townBank(data),inventory=data.inventory;
  const src=direction==='deposit'?inventory.materials:bank.materials;
  const dest=direction==='deposit'?bank.materials:inventory.materials;
  const limit=requested===Infinity?Infinity:Number.isFinite(requested)?Math.max(0,Math.floor(requested)):0;
  const amount=Math.min(src[id]||0,9999-(dest[id]||0),limit);
  if(!Number.isSafeInteger(amount)||amount<=0)return 0;
  src[id]-=amount;if(src[id]===0)delete src[id];
  dest[id]=(dest[id]||0)+amount;
  return amount;
}
export function bankEquipment(data,kind,id,direction,style=null){
  if(!['deposit','withdraw'].includes(direction))return false;
  if(!['weapon','armour','slot'].includes(kind))return false;
  if(kind==='slot'&&!Object.hasOwn(SLOT_ITEMS,id))return false;
  if(kind==='weapon'&&!['melee','magic','ranged'].includes(style))return false;
  const bank=townBank(data);
  const sourceRoot=direction==='deposit'?data.inventory:bank,destRoot=direction==='deposit'?bank:data.inventory;
  const src=kind==='weapon'?sourceRoot.weapons[style]:kind==='slot'?sourceRoot.slotted:sourceRoot.armour;
  const dst=kind==='weapon'?destRoot.weapons[style]:kind==='slot'?destRoot.slotted:destRoot.armour;
  if(!src.includes(id)||dst.includes(id))return false;
  // Never silently unequip an active set when putting equipment in storage.
  if(direction==='deposit'&&(kind==='weapon'?data.gear?.[style]===id:
   kind==='slot'?Object.values(data.equipment||{}).some(slots=>EXTRA_SLOTS.some(slot=>slots?.[slot]===id)):
   Object.values(data.armour||{}).includes(id)))return false;
  src.splice(src.indexOf(id),1);dst.push(id);return true;
}
/** Return only pieces not owned or stored in the bank; no duplicate or wasted purchases. */
export function missingStarterSetPieces(data,style){
 const set=STARTER_SETS[style];if(!set)return [];
 const bank=townBank(data),bag=data.inventory;
 return [
  {kind:'weapon',style,id:set.weapon,owned:bag.weapons[style].includes(set.weapon)||bank.weapons[style].includes(set.weapon)},
  {kind:'armour',id:set.chest,owned:bag.armour.includes(set.chest)||bank.armour.includes(set.chest)},
  ...set.slotted.map(id=>({kind:'slot',id,owned:bag.slotted.includes(id)||bank.slotted.includes(id)}))
 ].filter(x=>!x.owned);
}
export function starterSetPrice(data,style){
 const set=STARTER_SETS[style];if(!set)return 0;
 return Math.ceil(set.price*missingStarterSetPieces(data,style).length/(set.slotted.length+2));
}
export function buyStarterStock(data,stockId){
 const item=SHOP_STOCK.find(x=>x.id===stockId);
 if(!item)return {ok:false,reason:'Unknown stock'};
 if(item.kind==='bundle'){
  const missing=missingStarterSetPieces(data,item.style),price=starterSetPrice(data,item.style);
  if(!missing.length)return {ok:false,reason:'Set already owned'};
  if(!Number.isFinite(data.coins)||data.coins<price)return {ok:false,reason:'Not enough coins'};
  for(const entry of missing){
   const bag=entry.kind==='weapon'?data.inventory.weapons[entry.style]:
     entry.kind==='armour'?data.inventory.armour:data.inventory.slotted;
   bag.push(entry.id);
  }
  data.coins-=price;
  return {ok:true,item,price,pieces:missing.length};
 }
 if(!Number.isFinite(data.coins)||data.coins<item.price)return {ok:false,reason:'Not enough coins'};
 const bag=item.kind==='weapon'?data.inventory.weapons[item.style]:data.inventory.armour;
 if(bag.includes(item.itemId))return {ok:false,reason:'Already owned'};
 if(townBank(data)[item.kind==='weapon'?'weapons':'armour'] &&
    (item.kind==='weapon'?data.bank.weapons[item.style]:data.bank.armour).includes(item.itemId))
   return {ok:false,reason:'Already stored in bank'};
 data.coins-=item.price;bag.push(item.itemId);
 return {ok:true,item,price:item.price};
}
export function teachWoodcutting(data){
  if(!data.professions||typeof data.professions!=='object')data.professions={};
  if(data.professions.woodcuttingLearned)return false;
  data.professions.woodcuttingLearned=true;
  if(!Number.isFinite(data.professions.woodcuttingXp))data.professions.woodcuttingXp=0;
  // The trainer provides a usable starter tool; higher tiers can be bought or crafted later.
  if(!data.inventory.weapons.melee.includes('bronze-axe'))data.inventory.weapons.melee.push('bronze-axe');
  return true;
}
export function claimTrainingAxe(data){
 if(!data.professions?.woodcuttingLearned||WOODCUTTING_AXES.some(a=>data.inventory?.weapons?.melee?.includes(a.id)||data.bank?.weapons?.melee?.includes(a.id)))return false;
 data.inventory.weapons.melee.push('bronze-axe');return true;
}
// Compatibility shim for old tests/saves. Gameplay uses the continuous Woodcutting controller.
export function harvestStarterGrove(data,groveId,time,cooldowns){
  if(!OAKREST_GROVES.some(g=>g.id===groveId))return {ok:false,reason:'Unknown tree'};
  if(!data.professions?.woodcuttingLearned)return {ok:false,reason:"Visit the Forester's Lodge to learn Woodcutting first"};
  const xp=data.professions.woodcuttingXp||0;
  if(xp>=STARTER_GROVE_XP_CAP)return {ok:false,reason:'You have outgrown these training pines. Explore other regions for higher-level trees'};
  if((cooldowns.get(groveId)||0)>time)return {ok:false,reason:'This tree needs time to recover'};
  const current=data.inventory.materials['softwood-logs']||0;
  if(current>=9999)return {ok:false,reason:'Your log inventory is full. Use the bank'};
  data.inventory.materials['softwood-logs']=current+1;
  data.professions.woodcuttingXp=Math.min(STARTER_GROVE_XP_CAP,xp+WOODCUTTING_XP_PER_LOG);
  cooldowns.set(groveId,time+WOODCUTTING_HARVEST_SECONDS);
  return {ok:true,xp:data.professions.woodcuttingXp,logs:data.inventory.materials['softwood-logs']};
}
