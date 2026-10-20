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
