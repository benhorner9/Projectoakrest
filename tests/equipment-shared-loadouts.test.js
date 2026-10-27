import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave,STYLE_ORDER} from '../src/rules.js';
import {SLOT_ITEMS,equipmentModifiers} from '../src/equipment-slots.js';
import {equippedItemKeys} from '../src/equipment-ownership.js';
import {inventoryEntries} from '../src/equipment-ui.js';
import {inventoryKeyList} from '../src/item-slot-layout.js';
import {bankGridEntries} from '../src/town-ui.js';
import {classicItemAction,classicItemSnapshot,classicItemDetails} from '../src/classic-item-state.js';
import {buyStarterStock} from '../src/town-services.js';

const amulet='wayfarer-amulet';
const equip=(data,style,id=amulet)=>classicItemAction(data,{type:'equip',kind:'slot',style,slot:'amulet',id});
const spare=(d,key)=>inventoryEntries(d).some(x=>x.canonical===key);

test('equipped owned weapons and armour no longer appear as spare backpack/bank items',()=>{
 const d=defaultSave();
 assert.ok(equippedItemKeys(d).has('weapon.melee.sword'));
 assert.ok(equippedItemKeys(d).has('armour.traveller'));
 assert.equal(spare(d,'weapon.melee.sword'),false);
 assert.equal(spare(d,'armour.traveller'),false);
 assert.ok(!inventoryKeyList(d).includes('weapon.melee.sword'));
 assert.ok(!bankGridEntries(d,'bag').some(x=>x.canonical==='armour.traveller'));
 // Ownership stays in the save's catalogue, so the old character can still
 // attack, unequip, access bank, and migrate without losing any gear.
 assert.ok(d.inventory.weapons.melee.includes('sword'));
 assert.ok(d.inventory.armour.includes('traveller'));
 const before=inventoryKeyList(d).length;
 assert.equal(classicItemAction(d,{type:'equip',kind:'weapon',style:'melee',id:null}).ok,true);
 assert.equal(spare(d,'weapon.melee.sword'),true);
 assert.equal(inventoryKeyList(d).length,before+1);
 assert.equal(classicItemAction(d,{type:'equip',kind:'weapon',style:'melee',id:'sword'}).ok,true);
 assert.equal(spare(d,'weapon.melee.sword'),false);
});

test('one unrestricted amulet can occupy all three style loadouts without three bag copies',()=>{
 const d=defaultSave();d.inventory.slotted.push(amulet);
 assert.equal(SLOT_ITEMS[amulet].style,'all');
 assert.equal(spare(d,'slot.'+amulet),true);
 for(const style of STYLE_ORDER){
  const details=classicItemDetails(d,'slot.'+amulet,style);
  assert.deepEqual(details.action,{type:'equip',kind:'slot',style,slot:'amulet',id:amulet});
  assert.equal(equip(d,style).ok,true,style);
  assert.equal(d.equipment[style].amulet,amulet);
  assert.equal(classicItemSnapshot(d,style).equipment.find(x=>x.id==='amulet').itemId,'slot.'+amulet);
  assert.ok(equipmentModifiers(d,style).power>1);
  assert.equal(spare(d,'slot.'+amulet),false);
  assert.equal(bankGridEntries(d,'bag').some(x=>x.canonical==='slot.'+amulet),false);
 }
 assert.equal(d.inventory.slotted.filter(id=>id===amulet).length,1,'single physical owned amulet');
 assert.equal(classicItemAction(d,{type:'bank',kind:'slot',id:amulet,direction:'deposit'},{atBank:true}).ok,false,'a shared equipped item cannot be banked');
 assert.equal(classicItemAction(d,{type:'drop',id:'slot.'+amulet},{player:{x:0,z:39},dropId:()=> 'drop-1'}).ok,false);
 assert.equal(equip(d,'melee',null).ok,true);
 assert.equal(spare(d,'slot.'+amulet),false,'still equipped in two other styles');
 assert.equal(equip(d,'magic',null).ok,true);
 assert.equal(spare(d,'slot.'+amulet),false,'still equipped in ranged');
 assert.equal(equip(d,'ranged',null).ok,true);
 assert.equal(spare(d,'slot.'+amulet),true,'returns to bag after final unequip');
 assert.equal(inventoryEntries(d).filter(x=>x.canonical==='slot.'+amulet).length,1);
});

test('three style-specific amulets can occupy three independent loadouts',()=>{
 const d=defaultSave();
 for(const [style,id] of [['melee','recruit-amulet'],['magic','apprentice-amulet'],['ranged','scout-amulet']]){
  d.inventory.slotted.push(id);
  assert.equal(equip(d,style,id).ok,true);
  assert.equal(d.equipment[style].amulet,id);
  assert.equal(spare(d,'slot.'+id),false);
  assert.ok(equipmentModifiers(d,style).power>1);
 }
 assert.equal(equip(d,'melee','apprentice-amulet').ok,false,'magic-only amulet cannot go in melee');
 assert.equal(d.equipment.melee.amulet,'recruit-amulet');
 assert.equal(classicItemDetails(d,'slot.apprentice-amulet','melee').action.style,'magic',
  'the inventory Equip command targets the proper combat style');
 assert.equal(equip(d,'ranged',null).ok,true);
 assert.equal(spare(d,'slot.scout-amulet'),true);
 assert.equal(spare(d,'slot.recruit-amulet'),false);
});

test('a universal amulet survives real save reload and tracks all three styles',()=>{
 const d=defaultSave();d.inventory.slotted.push(amulet);
 for(const style of STYLE_ORDER)assert.equal(equip(d,style).ok,true);
 const restored=validSave(JSON.parse(JSON.stringify(d)));
 assert.deepEqual(STYLE_ORDER.map(s=>restored.equipment[s].amulet),[amulet,amulet,amulet]);
 assert.equal(restored.inventory.slotted.filter(x=>x===amulet).length,1);
 assert.equal(spare(restored,'slot.'+amulet),false);
 assert.equal(equip(restored,'magic',null).ok,true);
 assert.equal(spare(restored,'slot.'+amulet),false);
});

test('unrestricted amulet sold by the actual shop is one owned piece, not a copy per style',()=>{
 const d=defaultSave();d.coins=70;
 const bought=buyStarterStock(d,'wayfarer-amulet');
 assert.equal(bought.ok,true);assert.equal(d.coins,35);
 assert.deepEqual(d.inventory.slotted,[amulet]);
 assert.equal(buyStarterStock(d,'wayfarer-amulet').ok,false);
 for(const style of STYLE_ORDER)assert.equal(equip(d,style).ok,true);
 assert.equal(d.inventory.slotted.length,1);
});

test('legacy saves with equipped starter items preserve ownership and hide worn gear',()=>{
 const raw=defaultSave();raw.inventory.slotted=['recruit-helm','scout-amulet'];
 raw.equipment.melee.helm='recruit-helm';raw.equipment.ranged.amulet='scout-amulet';
 const d=validSave(raw);
 assert.equal(d.equipment.melee.helm,'recruit-helm');
 assert.equal(d.equipment.ranged.amulet,'scout-amulet');
 assert.ok(d.inventory.slotted.includes('recruit-helm'));
 assert.equal(spare(d,'slot.recruit-helm'),false);
 assert.equal(spare(d,'slot.scout-amulet'),false);
 assert.equal(classicItemAction(d,{type:'equip',kind:'slot',style:'melee',slot:'helm',id:null}).ok,true);
 assert.equal(spare(d,'slot.recruit-helm'),true);
});
