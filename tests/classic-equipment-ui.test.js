import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave,LOADOUTS} from '../src/rules.js';
import {SLOT_ITEMS,equipmentModifiers} from '../src/equipment-slots.js';
import {classicItemAction as act,classicItemSnapshot,classicPickup} from '../src/classic-item-state.js';
import {inventoryKeyList} from '../src/item-slot-layout.js';
import {DEFAULT_QUICK_SLOTS} from '../src/quick-slots.js';
import {createAdventure} from '../src/adventure-state.js';
import {createClassicCombat} from '../src/classic-combat.js';
const at={atBank:true,atStore:true,player:{x:0,z:39},dropId:()=> 'player-drop'};
function fullBag(d,count=28){
 for(const id of Object.keys(SLOT_ITEMS)){
  if(inventoryKeyList(d).length>=count)break;
  if(!d.inventory.slotted.includes(id))d.inventory.slotted.push(id);
 }
 for(const [style,weapons] of Object.entries(LOADOUTS))for(const id of Object.keys(weapons)){
  if(inventoryKeyList(d).length>=count)break;
  if(!d.inventory.weapons[style].includes(id))d.inventory.weapons[style].push(id);
 }
 assert.equal(inventoryKeyList(d).length,count);return d;
}
test('two-handed equipment returns the shield to ownership, removes bonuses and survives all loadouts reload',()=>{
 const d=defaultSave();d.xp.melee=10000;d.inventory.slotted.push('recruit-shield');d.inventory.weapons.melee.push('greatsword');
 assert.ok(act(d,{type:'equip',kind:'slot',style:'melee',slot:'offhand',id:'recruit-shield'}).ok);
 assert.equal(equipmentModifiers(d,'melee').guard,.03);
 const ranged=d.gear.ranged,magic=d.gear.magic;
 assert.ok(act(d,{type:'equip',kind:'weapon',style:'melee',id:'greatsword'}).ok);
 assert.equal(d.equipment.melee.offhand,null);assert.ok(d.inventory.slotted.includes('recruit-shield'));
 assert.equal(equipmentModifiers(d,'melee').guard,0);
 assert.equal(act(d,{type:'equip',kind:'slot',style:'melee',slot:'offhand',id:'recruit-shield'}).ok,false);
 assert.equal(classicItemSnapshot(d).equipment.find(s=>s.id==='offhand').itemId,null);
 const loaded=validSave(d);assert.equal(loaded.gear.melee,'greatsword');assert.equal(loaded.gear.ranged,ranged);assert.equal(loaded.gear.magic,magic);
 d.equipment.melee.offhand='recruit-shield';assert.equal(validSave(d).equipment.melee.offhand,null,'old incompatible save is repaired without deleting ownership');
 assert.ok(act(d,{type:'equip',kind:'weapon',style:'melee',id:'sword'}).ok);
 assert.ok(act(d,{type:'equip',kind:'slot',style:'melee',slot:'offhand',id:'recruit-shield'}).ok);
});
test('28-slot capacity blocks new bank stacks atomically but allows existing stacks and overfull legacy saves',()=>{
 const d=defaultSave();d.inventory.materials.ration=2;fullBag(d);d.bank.materials['moss-fibre']=10;d.bank.materials.ration=4;
 const before=structuredClone(d);
 assert.equal(act(d,{type:'bank',kind:'material',id:'moss-fibre',direction:'withdraw',quantity:3},at).ok,false);
 assert.deepEqual(d,before);
 assert.equal(act(d,{type:'bank',kind:'material',id:'ration',direction:'withdraw',quantity:3},at).amount,3);
 assert.equal(d.inventory.materials.ration,5);assert.equal(d.bank.materials.ration,1);
 d.inventory.materials['softwood-logs']=10;
 const legacy=validSave(d);assert.equal(inventoryKeyList(legacy).length,29);
 assert.ok(act(legacy,{type:'bank',kind:'material',id:'softwood-logs',direction:'deposit',quantity:'all'},at).ok);
 assert.equal(inventoryKeyList(legacy).length,28);
});
test('shop bundle and fractional transfers cannot partially spend resources',()=>{
 const d=defaultSave();d.coins=300;fullBag(d);const before=structuredClone(d);
 assert.equal(act(d,{type:'buy',id:'starter-magic-set'},at).ok,false);assert.deepEqual(d,before);
 assert.equal(act(d,{type:'bank',kind:'coins',direction:'deposit',quantity:1.5},at).ok,false);assert.deepEqual(d,before);
 d.bank.coins=9999998;
 assert.equal(act(d,{type:'bank',kind:'coins',direction:'deposit',quantity:10},at).amount,2);
 assert.equal(d.coins,298);assert.equal(d.bank.coins,10000000);
});
test('bank drag validates item identity and reach and preserves stacks and selected positions',()=>{
 const d=defaultSave();d.inventory.materials.ration=17;
 const from=classicItemSnapshot(d).bag.findIndex(e=>e?.canonical==='material.ration');
 const action={type:'drag',fromScope:'bag',toScope:'vault',fromIndex:from,toIndex:12,canonical:'material.ration'};
 assert.equal(act(d,action).ok,false);assert.equal(act(d,{...action,canonical:'material.moss-fibre'},at).ok,false);
 assert.ok(act(d,action,at).ok);assert.equal(d.bank.materials.ration,17);assert.equal(d.inventory.materials.ration,undefined);assert.equal(d.bankSlots[12],'material.ration');
 assert.equal(act(d,action,at).ok,false,'stale repeat cannot duplicate');
 assert.ok(act(d,{type:'drag',fromScope:'vault',toScope:'bag',fromIndex:12,toIndex:27,canonical:'material.ration'},at).ok);
 assert.equal(d.inventory.materials.ration,17);assert.equal(d.bank.materials.ration,undefined);assert.equal(d.inventorySlots[27],'material.ration');
});
test('player drops persist registered quantities and slot items; pickup is once and capacity safe',()=>{
 let d=defaultSave();d.inventory.materials['softwood-logs']=700;d.inventory.slotted.push('recruit-helm');
 assert.ok(act(d,{type:'drop',id:'material.softwood-logs',quantity:500},at).ok);
 assert.equal(d.inventory.materials['softwood-logs'],200);d=validSave(d);
 assert.equal(d.groundLoot[0].amount,500);assert.equal(d.groundLoot[0].playerDrop,true);
 assert.ok(classicPickup(d,at.player,'player-drop').ok);assert.equal(d.inventory.materials['softwood-logs'],700);
 assert.equal(classicPickup(d,at.player,'player-drop').ok,false);
 assert.ok(act(d,{type:'drop',id:'slot.recruit-helm'},at).ok);d=validSave(d);
 assert.equal(d.groundLoot[0].kind,'slot');assert.ok(classicPickup(d,at.player,'player-drop').ok);
 assert.equal(d.inventory.slotted.filter(x=>x==='recruit-helm').length,1);
 assert.equal(act(d,{type:'drop',id:'weapon.melee.sword'},at).ok,false);
 d.inventory.materials['ward-seal']=1;assert.equal(act(d,{type:'drop',id:'material.ward-seal'},at).ok,false);
});
test('full stack or full bag leaves ground loot available, including duplicate equipment coin salvage',()=>{
 const d=defaultSave();fullBag(d);d.groundLoot=[{id:'dup',kind:'weapon',style:'melee',itemId:'sword',amount:1,x:0,z:39}];
 const before=structuredClone(d);assert.equal(classicPickup(d,at.player,'dup').ok,false);assert.deepEqual(d,before);
 d.coins=9999999;assert.equal(classicPickup(d,at.player,'dup').ok,false);assert.equal(d.groundLoot.length,1);
 d.coins=10;assert.ok(classicPickup(d,at.player,'dup').ok);assert.equal(d.coins,18);
 d.inventory.materials.ration=9999;d.groundLoot=[{id:'ration',kind:'material',itemId:'ration',playerDrop:true,amount:2,x:0,z:39}];
 assert.equal(classicPickup(d,at.player,'ration').ok,false);assert.equal(d.groundLoot.length,1);assert.equal(d.inventory.materials.ration,9999);
});
test('all eight character quick slots assign, swap, clear and sanitize without changing equipped abilities',()=>{
 const d=defaultSave(),abilities=structuredClone(d.slots);
 assert.ok(act(d,{type:'quick-slot',index:0,id:'eat'}).ok);assert.equal(d.quickSlots[0],'eat');assert.equal(d.quickSlots[4],'ability0');
 assert.ok(act(d,{type:'quick-slot',index:7,id:'material.ration'}).ok);
 assert.ok(act(d,{type:'quick-slot',index:1,id:null}).ok);
 assert.equal(act(d,{type:'quick-slot',index:8,id:'drink'}).ok,false);
 assert.equal(act(d,{type:'quick-slot',index:2,id:'material.softwood-logs'}).ok,false);
 assert.deepEqual(validSave(d).quickSlots,d.quickSlots);assert.deepEqual(d.slots,abilities);
 d.quickSlots=['eat','eat','bad','weapon.melee.sword',null];
 assert.deepEqual(validSave(d).quickSlots,['eat',null,null,'weapon.melee.sword',null,null,null,null]);
 assert.equal(defaultSave().quickSlots,null);assert.equal(DEFAULT_QUICK_SLOTS.length,8);
});
test('bank transactions preserve the live adventure material reference and consumable cooldown authority',()=>{
 const d=defaultSave();d.inventory.materials.ration=4;d.bank.materials.ration=3;
 const materials=d.inventory.materials;let hp=10;
 const adventure=createAdventure(d,{emit(){},grantWeapon(){},heal(n){if(hp===100)return false;hp=Math.min(100,hp+n);return true;},resetDungeon(){},calmGuardian(){}});
 assert.ok(act(d,{type:'bank',kind:'material',id:'ration',direction:'deposit',quantity:3},at).ok);
 assert.equal(d.inventory.materials,materials);assert.equal(materials.ration,1);
 assert.ok(adventure.action('eat',{time:0,player:at.player}).ok);assert.equal(materials.ration||0,0);
 assert.equal(adventure.action('eat',{time:0,player:at.player}).ok,false);
 assert.ok(act(d,{type:'bank',kind:'material',id:'ration',direction:'withdraw',quantity:2},at).ok);
 assert.equal(adventure.action('eat',{time:1,player:at.player}).ok,false);assert.equal(materials.ration,2);
 assert.ok(adventure.action('eat',{time:8,player:at.player}).ok);assert.equal(materials.ration,1);
});
test('practice loan equipment cannot be dropped and claimed as owned',()=>{
 const d=defaultSave();d.inventory.weapons.melee=[];d.gear.melee='none';
 const sim=createClassicCombat({save:d});
 assert.equal(sim.itemAction({type:'drop',id:'weapon.melee.sword'},at.player).ok,false);
 assert.deepEqual(sim.persistentSave().inventory.weapons.melee,[]);
});
test('loot never duplicates equipment held in the bank',()=>{
 const d=defaultSave();d.inventory.slotted=[];d.bank.slotted=['recruit-helm'];
 d.groundLoot=[{id:'banked',kind:'slot',itemId:'recruit-helm',playerDrop:true,amount:1,x:0,z:39}];
 assert.ok(classicPickup(d,at.player,'banked').ok);assert.equal(d.coins,8);
 assert.deepEqual(d.inventory.slotted,[]);assert.deepEqual(d.bank.slotted,['recruit-helm']);
});
test('selling timber at the coin cap keeps both logs and currency',()=>{
 const d=defaultSave();d.coins=9999999;d.inventory.materials['softwood-logs']=5;
 const a=createAdventure(d,{emit(){},grantWeapon(){},heal(){},resetDungeon(){},calmGuardian(){}});
 const before=structuredClone(d);
 assert.equal(a.action('timber',{time:0,player:{x:32,z:14},target:{id:'service:store',x:32.7,z:14,reach:3.6}}).ok,false);
 assert.deepEqual(d,before);
});
