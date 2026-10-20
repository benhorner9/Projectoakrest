/** Oakrest is a starter hub, not a universal skilling destination.
 * New settlements should register their own exclusive skills instead of
 * offering the entire skill catalogue in every bank/shop.
 */
export const TOWN_SPECIALISATIONS=Object.freeze({oakrest:Object.freeze(['woodcutting'])});
export const OAKREST_SERVICES=Object.freeze([
  Object.freeze({id:'bank',label:'Oakrest Bank',x:-30,z:14,reach:6,kind:'bank'}),
  Object.freeze({id:'store',label:'Oakrest General Store',x:30,z:14,reach:6,kind:'store'}),
  Object.freeze({id:'forester',label:"Forester's Lodge",x:-30,z:46,reach:6,kind:'skill',skill:'woodcutting'})
]);
export const OAKREST_GROVES=Object.freeze([
  Object.freeze({id:'pine-west',x:-18,z:59,reach:2.6}),
  Object.freeze({id:'pine-east',x:-8,z:56,reach:2.6}),
  Object.freeze({id:'pine-north',x:-13,z:65,reach:2.6})
]);
export const TOWN_MATERIALS=Object.freeze(['moss-fibre','boar-hide','bandit-token','softwood-logs']);
export const SHOP_STOCK=Object.freeze([
  Object.freeze({id:'starter-sword',label:'Iron Longsword',kind:'weapon',style:'melee',itemId:'sword',price:45}),
  Object.freeze({id:'starter-staff',label:'Frost Staff',kind:'weapon',style:'magic',itemId:'frost',price:45}),
  Object.freeze({id:'starter-bow',label:'Oak Bow',kind:'weapon',style:'ranged',itemId:'bow',price:45}),
  Object.freeze({id:'starter-robe',label:'Traveller Clothing',kind:'armour',itemId:'traveller',price:35})
]);
export const STARTER_GROVE_XP_CAP=710; // The level 5 ceiling sends advanced learners elsewhere.
export const WOODCUTTING_XP_PER_LOG=35;
export const WOODCUTTING_HARVEST_SECONDS=9;

/** The roads and streets are non-hostile. The first hostile spawns are well beyond this line. */
export const isOakrestSafe=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=40&&z>=-43&&z<=75;
export function townInteraction(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  const options=[
    ...OAKREST_SERVICES.map(s=>({...s,type:'service'})),
    ...OAKREST_GROVES.map(s=>({...s,type:'grove',label:'Training pine'}))
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
  return bank;
}
export function bankCoins(data,direction){
  const bank=townBank(data),deposit=direction==='deposit';
  if(!deposit&&direction!=='withdraw')return 0;
  const src=deposit?data:bank,dest=deposit?bank:data;
  const available=Math.max(0,Math.floor(Number(src.coins)||0));
  const amount=Math.min(available,Math.max(0,10000000-Math.floor(Number(dest.coins)||0)));
  if(amount<=0)return 0;
  src.coins-=amount;dest.coins+=amount;return amount;
}
export function bankMaterials(data,id,direction){
  if(!TOWN_MATERIALS.includes(id)||!['deposit','withdraw'].includes(direction))return 0;
  const bank=townBank(data),inventory=data.inventory;
  const src=direction==='deposit'?inventory.materials:bank.materials;
  const dest=direction==='deposit'?bank.materials:inventory.materials;
  const amount=Math.min(src[id]||0,9999-(dest[id]||0));
  if(!Number.isSafeInteger(amount)||amount<=0)return 0;
  src[id]-=amount;if(src[id]===0)delete src[id];
  dest[id]=(dest[id]||0)+amount;
  return amount;
}
export function bankEquipment(data,kind,id,direction,style=null){
  if(!['deposit','withdraw'].includes(direction))return false;
  if(kind!=='weapon'&&kind!=='armour')return false;
  if(kind==='weapon'&&!['melee','magic','ranged'].includes(style))return false;
  const bank=townBank(data);
  const sourceRoot=direction==='deposit'?data.inventory:bank,destRoot=direction==='deposit'?bank:data.inventory;
  const src=kind==='weapon'?sourceRoot.weapons[style]:sourceRoot.armour;
  const dst=kind==='weapon'?destRoot.weapons[style]:destRoot.armour;
  if(!src.includes(id)||dst.includes(id))return false;
  // Never silently unequip an active set when putting equipment in storage.
  if(direction==='deposit'&&(kind==='weapon'?data.gear?.[style]===id:Object.values(data.armour||{}).includes(id)))return false;
  src.splice(src.indexOf(id),1);dst.push(id);return true;
}
export function buyStarterStock(data,stockId){
  const item=SHOP_STOCK.find(x=>x.id===stockId);
  if(!item)return {ok:false,reason:'Unknown stock'};
  if(!Number.isFinite(data.coins)||data.coins<item.price)return {ok:false,reason:'Not enough coins'};
  const bag=item.kind==='weapon'?data.inventory.weapons[item.style]:data.inventory.armour;
  if(bag.includes(item.itemId))return {ok:false,reason:'Already owned'};
  if(townBank(data)[item.kind==='weapon'?'weapons':'armour'] && (item.kind==='weapon'?data.bank.weapons[item.style]:data.bank.armour).includes(item.itemId))
   return {ok:false,reason:'Already stored in bank'};
  data.coins-=item.price;bag.push(item.itemId);
  return {ok:true,item};
}
export function teachWoodcutting(data){
  if(!data.professions||typeof data.professions!=='object')data.professions={};
  if(data.professions.woodcuttingLearned)return false;
  data.professions.woodcuttingLearned=true;
  if(!Number.isFinite(data.professions.woodcuttingXp))data.professions.woodcuttingXp=0;
  return true;
}
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
