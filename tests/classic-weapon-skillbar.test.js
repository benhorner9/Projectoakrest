import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave,LOADOUTS} from '../src/rules.js';
import {DEFAULT_QUICK_SLOTS,normalizeQuickSlots} from '../src/quick-slots.js';
import {classicItemAction,classicItemDetails,classicAbilityCatalogue} from '../src/classic-item-state.js';

test('old item and equipment quick bindings cannot survive save migration',()=>{
 const prior=defaultSave();
 prior.quickSlots=['weapon.magic.frost','ability1','ability2','ability3','eat','drink','dodge','attack'];
 const loaded=validSave(prior);
 assert.deepEqual(loaded.quickSlots,DEFAULT_QUICK_SLOTS);
 assert.deepEqual(normalizeQuickSlots(['slot.wayfarer-amulet','map',null,null,null,null,null,null]),DEFAULT_QUICK_SLOTS);
 assert.equal(loaded.gear.magic,prior.gear.magic,'weapon ownership and equipment retained');
 assert.deepEqual(loaded.slots,prior.slots,'weapon-family combat abilities retained');
});

test('combat quick actions cannot assign weapons, armour or items',()=>{
 const save=defaultSave(),original=structuredClone(save);
 for(const id of ['weapon.melee.sword','armour.starter-mail','material.ration']){
  const result=classicItemAction(save,{type:'quick-slot',index:0,id});
  assert.equal(result.ok,false,'rejected '+id);
 }
 assert.equal(classicItemAction(save,{type:'quick-slots',bindings:[...DEFAULT_QUICK_SLOTS]}).ok,false);
 assert.deepEqual(save,original,'rejected quick-slot attempts never mutate the character');
});

test('inventory weapon equip uses native style and weapon-family combat book',()=>{
 const data=defaultSave();
 data.inventory.weapons.magic.push('ember');
 data.xp.magic=100000;
 const details=classicItemDetails(data,'weapon.magic.ember','melee');
 assert.equal(details.action.style,'magic','weapon chooses Magic even when Melee was active');
 assert.equal(details.allowed,true,'owned level-unlocked weapon can equip');
 assert.equal(classicItemAction(data,details.action).ok,true);
 assert.equal(data.gear.magic,'ember','equipped in Magic gear, not a skill slot');
 assert.equal(data.gear.melee,'sword','other combat styles retain their gear');
 assert.deepEqual(data.slots.magic.ember,['w0',null,null,null],'existing ability selection stays on the weapon family');
 assert.equal(LOADOUTS.magic.ember.abilities[0].name,'Firebolt');
 assert.ok(classicAbilityCatalogue(data,'magic').some(ability=>ability.name==='Firebolt'));
 assert.equal(data.quickSlots,null,'equipping never creates a weapon shortcut');
});
