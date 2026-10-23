import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,LOADOUTS,STYLE_ORDER} from '../src/rules.js';
import {EQUIPMENT_SLOTS,STARTER_SETS} from '../src/equipment-slots.js';
import {classicItemSnapshot,classicItemAction,classicItemDetails,classicPickup,classicAbilityCatalogue} from '../src/classic-item-state.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {itemFromDrop} from '../src/items.js';

test('nine canonical slots, 28 initial bag cells and three independent loadouts',()=>{
 const data=defaultSave();
 for(const style of STYLE_ORDER){
  const view=classicItemSnapshot(data,style);
  assert.deepEqual(view.equipment.map(x=>x.id),EQUIPMENT_SLOTS.map(x=>x.id));
  assert.equal(view.bag.length,28);
  assert.ok(view.vault.length>=32);
  assert.equal(view.equipment.find(x=>x.id==='weapon')?.itemId,'weapon.'+style+'.'+data.gear[style]);
 }
});
test('equipment requires owned items and exact combat style/level; never creates inventory',()=>{
 const data=defaultSave(),before=JSON.stringify(data.inventory);
 assert.equal(classicItemAction(data,{type:'equip',kind:'slot',style:'melee',slot:'helm',id:'recruit-helm'}).ok,false);
 data.inventory.slotted.push('recruit-helm');
 assert.equal(classicItemAction(data,{type:'equip',kind:'slot',style:'ranged',slot:'helm',id:'recruit-helm'}).ok,false);
 assert.equal(classicItemAction(data,{type:'equip',kind:'slot',style:'melee',slot:'helm',id:'recruit-helm'}).ok,true);
 assert.equal(data.equipment.melee.helm,'recruit-helm');
 assert.equal(data.equipment.ranged.helm,null);
 assert.equal(classicItemAction(data,{type:'equip',kind:'slot',style:'melee',slot:'helm',id:null}).ok,true);
 assert.equal(data.equipment.melee.helm,null);
 assert.notEqual(JSON.stringify(data.inventory),before,'ownership changed only because test deliberately granted item');
});
test('level-locked weapons cannot be equipped and Examine shows authentic stats',()=>{
 const data=defaultSave();
 const locked=Object.entries(LOADOUTS.melee).find(([id,w])=>w.requiredLevel>1);
 assert.ok(locked);
 data.inventory.weapons.melee.push(locked[0]);
 const detail=classicItemDetails(data,'weapon.melee.'+locked[0],'melee');
 assert.equal(detail.allowed,false);
 assert.ok(detail.facts.some(([k,v])=>k==='Requires'&&String(v).includes(String(locked[1].requiredLevel))));
 assert.equal(classicItemAction(data,{type:'equip',kind:'weapon',style:'melee',id:locked[0]}).ok,false);
});
test('starter set purchases use existing partial set pricing and no duplicate gear',()=>{
 const data=defaultSave();
 assert.equal(classicItemAction(data,{type:'buy',id:'starter-melee-set'}).ok,false,'must be at shop');
 data.coins=450;
 const first=classicItemAction(data,{type:'buy',id:'starter-melee-set'},{atStore:true});
 assert.equal(first.ok,true);
 assert.ok(first.price>0&&first.price<=STARTER_SETS.melee.price);
 for(const id of STARTER_SETS.melee.slotted)assert.equal(data.inventory.slotted.includes(id),true);
 const owned=classicItemAction(data,{type:'buy',id:'starter-melee-set'},{atStore:true});
 assert.equal(owned.ok,false,'already owned bundle cannot be bought twice');
 assert.equal(classicItemSnapshot(data,'melee').shop.find(s=>s.id==='starter-melee-set').owned,true);
});
test('bank transactions enforce bank proximity, count once and protect equipped items',()=>{
 const data=defaultSave();
 data.coins=125;data.inventory.materials['moss-fibre']=12;
 assert.equal(classicItemAction(data,{type:'bank',kind:'coins',direction:'deposit',quantity:'all'}).ok,false);
 assert.equal(classicItemAction(data,{type:'bank',kind:'coins',direction:'deposit',quantity:25},{atBank:true}).ok,true);
 assert.equal(data.coins,100);assert.equal(data.bank.coins,25);
 assert.equal(classicItemAction(data,{type:'bank',kind:'material',id:'moss-fibre',direction:'deposit',quantity:10},{atBank:true}).amount,10);
 assert.equal(data.inventory.materials['moss-fibre'],2);assert.equal(data.bank.materials['moss-fibre'],10);
 assert.equal(classicItemAction(data,{type:'bank',kind:'weapon',style:'melee',id:'sword',direction:'deposit'},{atBank:true}).ok,false,'equipped weapon protected');
 assert.equal(classicItemAction(data,{type:'equip',kind:'weapon',style:'melee',id:null}).ok,true);
 assert.equal(classicItemAction(data,{type:'bank',kind:'weapon',style:'melee',id:'sword',direction:'deposit'},{atBank:true}).ok,true);
 assert.equal(data.inventory.weapons.melee.includes('sword'),false);
 assert.equal(data.bank.weapons.melee.includes('sword'),true);
 assert.equal(classicItemAction(data,{type:'bank',kind:'weapon',style:'melee',id:'sword',direction:'withdraw'},{atBank:true}).ok,true);
 assert.equal(data.inventory.weapons.melee.filter(id=>id==='sword').length,1);
});
test('four ability slots use unchanged unlocks and reject locked skills',()=>{
 const data=defaultSave(),catalog=classicAbilityCatalogue(data,'melee');
 assert.equal(catalog.some(a=>a.requiredLevel>1&&!a.unlocked),true);
 const locked=catalog.find(a=>!a.unlocked);
 const bad=classicItemAction(data,{type:'ability',style:'melee',weapon:'sword',index:1,id:locked.id});
 assert.equal(bad.ok,false);
 assert.equal(classicItemAction(data,{type:'ability',style:'melee',weapon:'sword',index:0,id:'w0'}).ok,true);
});
test('ground drops are physical, within pickup reach and never double-collected',()=>{
 const data=defaultSave();
 const d={id:'classic-test-drop',kind:'coins',itemId:'coins',amount:9,x:1,z:88};
 assert.equal(itemFromDrop(d).title,'Gold Coins');
 data.groundLoot.push(d);
 assert.equal(classicPickup(data,{x:1,z:70},d.id).ok,false,'cannot pick up from afar');
 assert.equal(classicPickup(data,{x:1,z:87},d.id).ok,true);
 assert.equal(data.coins,9);
 assert.equal(data.groundLoot.length,0);
 assert.equal(classicPickup(data,{x:1,z:87},d.id).ok,false);
});
test('classic combat item actions modify only the session clone, never the original save',()=>{
 const original=defaultSave();original.coins=200;
 const prior=JSON.stringify(original);
 const sim=createClassicCombat({save:original,random:()=>.02});
 assert.equal(sim.itemAction({type:'buy',id:'starter-ranged-set'},{x:0,z:39}).ok,false);
 const bought=sim.itemAction({type:'buy',id:'starter-ranged-set'},{x:32,z:14});
 assert.equal(bought.ok,true);
 assert.equal(sim.itemSnapshot('ranged').shop.find(s=>s.id==='starter-ranged-set').owned,true);
 assert.equal(JSON.stringify(original),prior);
 const exposure=sim.sandboxSave();exposure.coins=99999;
 assert.notEqual(sim.sandboxSave().coins,99999);
});
test('inventory arrange moves positions only; no duplication',()=>{
 const data=defaultSave();
 const from=classicItemSnapshot(data,'melee').bag.findIndex(e=>e?.canonical==='weapon.melee.sword');
 assert.ok(from>=0);
 const before=JSON.stringify(data.inventory);
 const x=classicItemAction(data,{type:'reorder',scope:'bag',from,to:27});
 assert.equal(x.ok,true);assert.equal(data.inventorySlots[27],'weapon.melee.sword');
 assert.equal(JSON.stringify(data.inventory),before);
});
