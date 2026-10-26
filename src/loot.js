/** Persistent, explicitly picked-up monster rewards. */
import {ITEMS_BY_ID,itemFromDrop} from './items.js';
import {rollDropTable} from './drop-tables.js';
export const MAX_GROUND_LOOT=36;
export function isValidDrop(d){
 if(!d||typeof d!=='object'||typeof d.id!=='string'||d.id.length>64||d.id.length<1)return false;
 if(!Number.isFinite(d.x)||!Number.isFinite(d.z)||Math.abs(d.x)>120||Math.abs(d.z)>340)return false;
 if(!Number.isSafeInteger(d.amount)||d.amount<1||d.amount>(d.playerDrop===true?9999:99))return false;
 const item=itemFromDrop(d);
 if(d.playerDrop===true)return !!item&&item.kind!=='scroll'&&!['material.ward-seal','material.warden-heart'].includes(item.id)&&(['coins','material'].includes(d.kind)||d.amount===1);
 return !!item?.dropAllowed&&(d.kind==='coins'||d.amount===1);
}
export function lootName(d){
 const name=itemFromDrop(d)?.title||'Loot';
 return d.kind==='coins'?d.amount+' coins':name;
}
export function createMonsterDrops(type,x,z,random,idFactory,tables){
 const items=rollDropTable(type,random,tables);
 return items.map((item,index)=>({...item,id:idFactory(),x:Math.max(-119,Math.min(119,x+(index?Math.cos(index*2.3)*.85:0))),
  z:Math.max(-119,Math.min(339,z+(index?Math.sin(index*2.3)*.85:0)))}));
}
export function closestDrop(drops,x,z,reach=3.2){
 let nearest=null,dist=reach;
 for(const drop of drops){
  if(!isValidDrop(drop))continue;
  const gap=Math.hypot(drop.x-x,drop.z-z);
  if(gap<dist){dist=gap;nearest=drop;}
 }
 return nearest;
}
export function collectDrop(data,d){
 if(!isValidDrop(d)||!data.inventory)return false;
 if(d.kind==='coins'){data.coins=Math.min(10000000,(data.coins||0)+d.amount);return true;}
 if(d.kind==='material'){
  const mat=data.inventory.materials||(data.inventory.materials={});
  mat[d.itemId]=Math.min(9999,(mat[d.itemId]||0)+d.amount);return true;
 }
 const list=d.kind==='armour'?data.inventory.armour:d.kind==='slot'?data.inventory.slotted:data.inventory.weapons?.[d.style];
 if(!Array.isArray(list))return false;
 const banked=d.kind==='armour'?data.bank?.armour:d.kind==='slot'?data.bank?.slotted:data.bank?.weapons?.[d.style];
 if(!list.includes(d.itemId)&&!banked?.includes(d.itemId))list.push(d.itemId);
 else data.coins=Math.min(10000000,(data.coins||0)+8); // duplicate starter gear salvaged for coins
 return true;
}
export function saveGroundDrops(raw){
 if(!Array.isArray(raw))return [];
 const ids=new Set(),out=[];
 for(const d of raw.slice(-MAX_GROUND_LOOT)){
  if(!isValidDrop(d)||ids.has(d.id))continue;
  ids.add(d.id);out.push({...d});
 }
 return out;
}
