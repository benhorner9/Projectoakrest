/** Independently rolled, editor-configurable monster tables. Percentages never need to sum to 100. */
import {DROPPABLE_ITEMS,getItem} from './items.js';
import {MATERIAL_DROPS,ENEMY_COMBAT} from './combat-feel.js';
export const LOOT_ENEMIES=Object.freeze(Object.keys(ENEMY_COMBAT).filter(type=>type!=='dummy'));
export const MAX_DROP_ROWS=32;
const entry=(itemId,chancePercent)=>({itemId,chancePercent});
const tables={
 mossling:[entry('currency.coins',100),entry('material.moss-fibre',MATERIAL_DROPS.mossling.chance*100),entry('weapon.melee.daggers',8)],
 boar:[entry('currency.coins',100),entry('material.boar-hide',MATERIAL_DROPS.boar.chance*100),entry('armour.leather',13),entry('weapon.ranged.shortbow',7)],
 bandit:[entry('currency.coins',100),entry('material.bandit-token',MATERIAL_DROPS.bandit.chance*100),entry('weapon.ranged.crossbow',19),entry('weapon.melee.forged_sword',9)]
};
export const DEFAULT_DROP_TABLES=Object.freeze(Object.fromEntries(Object.entries(tables).map(([key,entries])=>[key,Object.freeze(entries.map(row=>Object.freeze(row)))])));
export const cloneDropTables=()=>Object.fromEntries(LOOT_ENEMIES.map(type=>[type,DEFAULT_DROP_TABLES[type].map(row=>({...row}))]));
const chanceIsValid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100&&Math.round(n*100)===n*100;
export function sanitizeDropTable(input){
 if(!Array.isArray(input)||input.length>MAX_DROP_ROWS)throw Error('Expected up to '+MAX_DROP_ROWS+' drop entries.');
 const seen=new Set(),result=[];
 for(const row of input){
  if(!row||typeof row.itemId!=='string'||!getItem(row.itemId)?.dropAllowed||seen.has(row.itemId)||!chanceIsValid(row.chancePercent))
   throw Error('Invalid item ID, duplicate or percentage. Use 0–100 with up to two decimals.');
  seen.add(row.itemId);result.push({itemId:row.itemId,chancePercent:row.chancePercent});
 }
 return result;
}
export function sanitizeDropTables(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid drop table configuration.');
 const output=cloneDropTables();
 for(const key of Object.keys(input))if(!LOOT_ENEMIES.includes(key))throw Error('Unknown enemy: '+key);
 for(const [type,rows] of Object.entries(input))output[type]=sanitizeDropTable(rows);
 return output;
}
export function readDropTables(storage,key){
 try{
  const stored=storage.getItem(key);
  return stored?sanitizeDropTables(JSON.parse(stored)):cloneDropTables();
 }catch{return cloneDropTables();}
}
export function rollDropTable(type,random=Math.random,tables=DEFAULT_DROP_TABLES){
 if(!LOOT_ENEMIES.includes(type))return [];
 const rows=tables[type]||[];
 const output=[];
 for(const row of rows){
  const item=getItem(row.itemId);
  // Every row has its own chance, irrespective of any other row's result.
  // No guaranteed-by-Nth-kill logic and no normalized probability sums.
  const value=random();
  if(item?.dropAllowed&&value>=0&&value<row.chancePercent/100)output.push({...item.legacy,amount:item.kind==='coins'?({mossling:4,boar:7,bandit:13}[type]||1):1});
 }
 return output;
}
export const allDroppableItems=()=>DROPPABLE_ITEMS.slice();
