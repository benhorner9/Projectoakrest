import {equippedItemKeys} from './equipment-ownership.js';
/**
 * Persistent positions for inventory and bank item tiles.
 * Ownership remains in the existing inventory and bank fields; these arrays
 * only remember the position of items that are actually owned.
 */
export const BAG_MIN_SLOTS=28;
export const VAULT_MIN_SLOTS=32;
export const BAG_MAX_SLOTS=96;
export const VAULT_MAX_SLOTS=240;

export function sanitizeSlotOrder(raw,owned,max=VAULT_MAX_SLOTS){
 const valid=new Set(owned),seen=new Set();
 if(!Array.isArray(raw))return [];
 return raw.slice(0,max).map(id=>{
  if(typeof id!=='string'||!valid.has(id)||seen.has(id))return null;
  seen.add(id);return id;
 });
}
export function inventoryKeyList(data,scope='bag'){
 const bag=scope==='vault'?data.bank:data.inventory;
 if(!bag||typeof bag!=='object')return [];
 const result=[];
 const worn=scope==='vault'?new Set():equippedItemKeys(data);
 const add=id=>{if(!worn.has(id)&&!result.includes(id))result.push(id);};
 const coins=scope==='vault'?data.bank?.coins:data.coins;
 if(Number(coins)>0)add('currency.coins');
 for(const style of ['melee','magic','ranged'])
  for(const id of bag.weapons?.[style]||[])add('weapon.'+style+'.'+id);
 for(const id of bag.armour||[])add('armour.'+id);
 for(const id of bag.slotted||[])add('slot.'+id);
 for(const [id,count] of Object.entries(bag.materials||{}))
  if(Number(count)>0)add('material.'+id);
 if(scope==='bag'&&data.onboarding?.teleportScrolls>0)add('scroll.teleport');
 return result;
}
/** Return a sparse array; unpositioned newly acquired items fill free spaces. */
export function positionedEntries(entries,order,minCount=BAG_MIN_SLOTS,maxCount=VAULT_MAX_SLOTS){
 const byId=new Map(entries.map(e=>[e.canonical,e]));
 const used=new Set();
 const size=Math.min(maxCount,Math.max(minCount,entries.length,Array.isArray(order)?order.length:0));
 const slots=Array(size).fill(null);
 if(Array.isArray(order))for(let i=0;i<Math.min(order.length,size);i++){
  const key=order[i];
  if(byId.has(key)&&!used.has(key)){slots[i]=byId.get(key);used.add(key);}
 }
 for(const e of entries)if(!used.has(e.canonical)){
  let index=slots.indexOf(null);
  if(index<0&&slots.length<maxCount){slots.push(null);index=slots.length-1;}
  if(index>=0){slots[index]=e;used.add(e.canonical);}
 }
 return slots;
}
export function slotOrder(slots){return slots.map(e=>e?.canonical||null);}
export function reorderSlot(data,scope,entries,from,to){
 const key=scope==='vault'?'bankSlots':'inventorySlots';
 const slots=positionedEntries(entries,data[key],scope==='vault'?VAULT_MIN_SLOTS:BAG_MIN_SLOTS,
  scope==='vault'?VAULT_MAX_SLOTS:BAG_MAX_SLOTS);
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=slots.length||to>=slots.length||!slots[from]||from===to)return false;
 [slots[from],slots[to]]=[slots[to],slots[from]];
 data[key]=slotOrder(slots);
 return true;
}
/**
 * Apply only the visual placement following an already-successful transfer.
 * Never modifies ownership or quantities, never creates item copies.
 */
export function positionTransfer(data,sourceScope,destScope,canonical,targetIndex,sourceEntries,destEntries){
 if(sourceScope===destScope||!['bag','vault'].includes(sourceScope)||!['bag','vault'].includes(destScope))return false;
 const srcKey=sourceScope==='vault'?'bankSlots':'inventorySlots',
  dstKey=destScope==='vault'?'bankSlots':'inventorySlots';
 // Take pre-transfer lists so source holes are preserved across transfers.
 const src=positionedEntries(sourceEntries,data[srcKey],
   sourceScope==='vault'?VAULT_MIN_SLOTS:BAG_MIN_SLOTS,
   sourceScope==='vault'?VAULT_MAX_SLOTS:BAG_MAX_SLOTS);
 const dst=positionedEntries(destEntries,data[dstKey],
   destScope==='vault'?VAULT_MIN_SLOTS:BAG_MIN_SLOTS,
   destScope==='vault'?VAULT_MAX_SLOTS:BAG_MAX_SLOTS);
 let old=src.findIndex(e=>e?.canonical===canonical);
 if(old>=0)src[old]=null;
 // A stack can remain on source after a partial deposit/withdraw; the caller
 // must only apply this helper when the source is no longer holding the item.
 // The bank UI currently drags the entire stack.
 const existing=dst.findIndex(e=>e?.canonical===canonical);
 if(existing<0){
  const max=destScope==='vault'?VAULT_MAX_SLOTS:BAG_MAX_SLOTS;
  let desired=Number.isInteger(targetIndex)&&targetIndex>=0&&targetIndex<dst.length?
   targetIndex:dst.indexOf(null);
  if(desired>=0&&dst[desired])desired=dst.indexOf(null);
  if(desired<0&&dst.length<max){desired=dst.length;dst.push(null);}
  if(desired>=0)dst[desired]={canonical};
 }
 data[srcKey]=slotOrder(src);
 data[dstKey]=slotOrder(dst);
 return true;
}
