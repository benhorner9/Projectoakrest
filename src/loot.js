/** Persistent, explicitly picked-up monster rewards. */
import {LOADOUTS,ARMOUR} from './rules.js';
import {MATERIAL_DROPS} from './combat-feel.js';
export const MAX_GROUND_LOOT=36;
const rare={
 mossling:[{chance:.08,kind:'weapon',style:'melee',itemId:'daggers'}],
 boar:[{chance:.13,kind:'armour',itemId:'leather'},{chance:.07,kind:'weapon',style:'ranged',itemId:'shortbow'}],
 bandit:[{chance:.19,kind:'weapon',style:'ranged',itemId:'crossbow'},{chance:.09,kind:'weapon',style:'melee',itemId:'forged_sword'}]
};
const coinValues={mossling:4,boar:7,bandit:13};
export function isValidDrop(d){
 if(!d||typeof d!=='object'||typeof d.id!=='string'||d.id.length>64||d.id.length<1)return false;
 if(!Number.isFinite(d.x)||!Number.isFinite(d.z)||Math.abs(d.x)>70||Math.abs(d.z)>70)return false;
 if(!Number.isSafeInteger(d.amount)||d.amount<1||d.amount>99)return false;
 if(d.kind==='coins')return d.itemId==='coins'&&d.amount<=99;
 if(d.kind==='material')return Object.values(MATERIAL_DROPS).some(x=>x.id===d.itemId);
 if(d.amount!==1)return false;
 if(d.kind==='armour')return Object.hasOwn(ARMOUR,d.itemId);
 if(d.kind==='weapon')return ['melee','ranged','magic'].includes(d.style)&&Object.hasOwn(LOADOUTS[d.style],d.itemId);
 return false;
}
export function lootName(d){
 if(d.kind==='coins')return d.amount+' coins';
 if(d.kind==='material')return Object.values(MATERIAL_DROPS).find(x=>x.id===d.itemId)?.title||'Material';
 if(d.kind==='armour')return ARMOUR[d.itemId]?.title||'Armour';
 if(d.kind==='weapon')return LOADOUTS[d.style]?.[d.itemId]?.title||'Weapon';
 return 'Loot';
}
export function createMonsterDrops(type,x,z,random,idFactory){
 if(!Object.hasOwn(coinValues,type))return [];
 const items=[{kind:'coins',itemId:'coins',amount:coinValues[type]}];
 const mat=MATERIAL_DROPS[type];
 if(mat&&random()<mat.chance)items.push({kind:'material',itemId:mat.id,amount:1});
 for(const e of rare[type]||[])if(random()<e.chance)items.push({kind:e.kind,itemId:e.itemId,amount:1,...(e.style?{style:e.style}:{})});
 return items.map((item,index)=>({...item,id:idFactory(),x:Math.max(-69,Math.min(69,x+(index?Math.cos(index*2.3)*.85:0))),
  z:Math.max(-69,Math.min(69,z+(index?Math.sin(index*2.3)*.85:0)))}));
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
 const list=d.kind==='armour'?data.inventory.armour:data.inventory.weapons?.[d.style];
 if(!Array.isArray(list))return false;
 if(!list.includes(d.itemId))list.push(d.itemId);
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
