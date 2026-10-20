import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCharacterSave,validSave,ARMOUR} from '../src/rules.js';
import {EQUIPMENT_SLOTS,EXTRA_SLOTS,SLOT_ITEMS,STARTER_SETS,equipSlotItem,equipmentModifiers} from '../src/equipment-slots.js';
import {SHOP_STOCK,buyStarterStock,starterSetPrice,missingStarterSetPieces,bankEquipment} from '../src/town-services.js';
import {inventoryEntries} from '../src/equipment-ui.js';
import {getItem} from '../src/items.js';

test('equipment has nine named slots and the three beginner bundles are complete',()=>{
 assert.deepEqual(EQUIPMENT_SLOTS.map(x=>x.id),['helm','amulet','arrows','chest','legs','weapon','offhand','boots','ring']);
 assert.equal(EXTRA_SLOTS.length,7);
 for(const [style,set] of Object.entries(STARTER_SETS)){
  assert.equal(set.style,style);
  assert.equal(set.slotted.length,6);
  assert.equal(SHOP_STOCK.find(x=>x.id===set.id).kind,'bundle');
  assert.ok(ARMOUR[set.chest]);
  for(const id of set.slotted){
   assert.equal(SLOT_ITEMS[id].style,style);
   assert.ok(getItem('slot.'+id),'registry should provide an icon and examination description');
  }
 }
});
test('fresh character can buy, equip, examine and persist an entire starter set',()=>{
 const data=freshCharacterSave();data.coins=110;
 const result=buyStarterStock(data,STARTER_SETS.melee.id);
 assert.equal(result.ok,true);assert.equal(result.pieces,8);
 assert.equal(data.coins,0);
 assert.equal(data.inventory.slotted.length,6);
 for(const id of STARTER_SETS.melee.slotted)assert.equal(equipSlotItem(data,'melee',SLOT_ITEMS[id].slot,id),true);
 assert.equal(equipSlotItem(data,'melee','helm','scout-hood'),false);
 assert.ok(equipmentModifiers(data,'melee').power>1);
 assert.ok(equipmentModifiers(data,'melee').guard>0);
 const inventory=inventoryEntries(data);
 assert.ok(inventory.some(x=>x.canonical==='slot.recruit-helm'));
 assert.ok(inventory.some(x=>x.canonical==='armour.starter-mail'));
 const loaded=validSave(JSON.parse(JSON.stringify(data)));
 assert.deepEqual(loaded.inventory,data.inventory);
 assert.deepEqual(loaded.equipment,data.equipment);
 assert.equal(loaded.equipment.melee.helm,'recruit-helm');
 assert.equal(loaded.equipment.magic.helm,null);
});
test('shop charges only for missing pieces and rejects duplicate starter purchases',()=>{
 const d=freshCharacterSave();d.coins=300;
 assert.equal(buyStarterStock(d,'starter-sword').ok,true);
 assert.equal(missingStarterSetPieces(d,'melee').length,7);
 assert.equal(starterSetPrice(d,'melee'),Math.ceil(110*7/8));
 const price=starterSetPrice(d,'melee'),before=d.coins;
 const purchased=buyStarterStock(d,'starter-melee-set');
 assert.equal(purchased.ok,true);
 assert.equal(d.coins,before-price);
 assert.equal(d.inventory.weapons.melee.filter(x=>x==='sword').length,1);
 assert.equal(buyStarterStock(d,'starter-melee-set').ok,false);
 assert.equal(starterSetPrice(d,'melee'),0);
});
test('equipped slot gear cannot be banked and tampered save data cannot equip another style',()=>{
 const d=freshCharacterSave();d.coins=220;
 buyStarterStock(d,'starter-ranged-set');
 const id='scout-hood';assert.equal(equipSlotItem(d,'ranged','helm',id),true);
 assert.equal(bankEquipment(d,'slot',id,'deposit'),false);
 assert.equal(equipSlotItem(d,'ranged','helm',null),true);
 assert.equal(bankEquipment(d,'slot',id,'deposit'),true);
 assert.equal(d.bank.slotted.includes(id),true);
 assert.equal(equipSlotItem(d,'ranged','helm',id),false);
 assert.equal(bankEquipment(d,'slot',id,'withdraw'),true);
 assert.equal(equipSlotItem(d,'ranged','helm',id),true);
 d.equipment.melee.helm='scout-hood';
 d.inventory.slotted.push('unknown-item','scout-hood');
 const saved=validSave(d);
 assert.equal(saved.equipment.melee.helm,null);
 assert.equal(saved.equipment.ranged.helm,'scout-hood');
 assert.equal(saved.inventory.slotted.filter(x=>x==='scout-hood').length,1);
 assert.equal(saved.inventory.slotted.includes('unknown-item'),false);
 assert.deepEqual(saved.bank.slotted,[]);
});

test('weapons and chests unequip, bank and reload without resurrecting equipment',async()=>{
 const {defaultSave,equipPrimaryItem}=await import('../src/rules.js');
 let d=defaultSave();
 for(const style of ['melee','ranged','magic']){
  const id=d.gear[style];
  assert.equal(equipPrimaryItem(d,'weapon',style,null),true);
  assert.equal(bankEquipment(d,'weapon',id,'deposit',style),true);
 }
 for(const style of ['melee','ranged','magic'])assert.equal(equipPrimaryItem(d,'armour',style,null),true);
 assert.equal(bankEquipment(d,'armour','traveller','deposit'),true);
 const snapshot=structuredClone(d);d=validSave(d);
 assert.deepEqual(d,snapshot);
 for(const style of ['melee','ranged','magic']){
  assert.equal(d.gear[style],'none');assert.equal(d.armour[style],'none');
  const id=STARTER_SETS[style].weapon;
  assert.equal(equipPrimaryItem(d,'weapon',style,id),false);
  assert.equal(bankEquipment(d,'weapon',id,'withdraw',style),true);
  assert.equal(equipPrimaryItem(d,'weapon',style,id),true);
 }
 assert.equal(bankEquipment(d,'armour','traveller','withdraw'),true);
 assert.equal(equipPrimaryItem(d,'armour','melee','traveller'),true);
 assert.deepEqual(validSave(d),d);
});
test('all starter presets preserve exact bonuses, bank ownership and partial prices',()=>{
 let d=freshCharacterSave();d.coins=1000;
 const expected={melee:{power:1.03,guard:.08},ranged:{power:1.05,guard:.05},magic:{power:1.05,guard:.05}};
 for(const style of ['melee','ranged','magic']){
  assert.equal(buyStarterStock(d,STARTER_SETS[style].id).ok,true);
  for(const id of STARTER_SETS[style].slotted)equipSlotItem(d,style,SLOT_ITEMS[id].slot,id);
  assert.deepEqual(equipmentModifiers(d,style),expected[style]);
 }
 for(const style of ['melee','ranged','magic']){
  const id=STARTER_SETS[style].slotted[0];equipSlotItem(d,style,'helm',null);
  assert.equal(bankEquipment(d,'slot',id,'deposit'),true);
  assert.equal(starterSetPrice(d,style),0);
  const coins=d.coins;assert.equal(buyStarterStock(d,STARTER_SETS[style].id).ok,false);assert.equal(d.coins,coins);
 }
 assert.deepEqual(validSave(d).bank,d.bank);
 assert.deepEqual(validSave(d).equipment,d.equipment);
});
test('primary requirements reject high level equipment and malformed styles',async()=>{
 const {defaultSave,equipPrimaryItem,LOADOUTS}=await import('../src/rules.js');
 const d=defaultSave();
 for(const style of ['melee','ranged','magic']){
  const [id,w]=Object.entries(LOADOUTS[style]).find(([,w])=>w.requiredLevel>1);
  d.inventory.weapons[style].push(id);
  assert.equal(equipPrimaryItem(d,'weapon',style,id),false);
 }
 assert.equal(equipPrimaryItem(d,'weapon','invalid',null),false);
 assert.equal(equipPrimaryItem(d,'invalid','melee',null),false);
 assert.equal(equipPrimaryItem(freshCharacterSave(),'weapon','melee',null),false);
});
test('save sanitation removes duplicate ownership and banked armour grants no free protection',async()=>{
 const {defaultSave,defenceFor}=await import('../src/rules.js');
 const d=defaultSave();d.inventory.weapons.melee.push('sword');d.inventory.armour.push('traveller');
 const loaded=validSave(d);assert.deepEqual(loaded.inventory.weapons.melee,['sword']);assert.deepEqual(loaded.inventory.armour,['traveller']);
 d.inventory.armour=[];d.bank.armour=['traveller'];const banked=validSave(d);
 assert.equal(banked.armour.melee,'none');assert.equal(defenceFor(banked.armour.melee).physical,0);
});
