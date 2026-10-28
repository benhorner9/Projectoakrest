import test from 'node:test';
import assert from 'node:assert/strict';
import {classicBookIcon,classicBookStyleName} from '../src/classic-combat-book.js';
import {defaultSave,skillCatalogue,LOADOUTS} from '../src/rules.js';
import {classicAbilityCatalogue} from '../src/classic-item-state.js';

test('combat book labels and icons use original Oakrest glyphs',()=>{
 assert.equal(classicBookStyleName('melee'),'Melee techniques');
 assert.equal(classicBookStyleName('magic'),'Magic spellbook');
 assert.equal(classicBookStyleName('ranged'),'Ranged techniques');
 for(const kind of ['hit','bolt','sweep','heal','shield','root','nova','burst','execute','dashback']){
  assert.ok(classicBookIcon(kind),'book tiles need an icon for '+kind);
 }
 assert.equal(classicBookIcon('unknown'),'combat');
});

test('combat book derives six weapon-family abilities from the existing authoritative catalogues',()=>{
 const data=defaultSave();
 for(const style of ['melee','magic','ranged']){
  for(const [id,weapon] of Object.entries(LOADOUTS[style])){
   data.gear[style]=id;
   const catalogue=classicAbilityCatalogue(data,style);
   assert.equal(catalogue.length,6,style+' '+id);
   assert.deepEqual(catalogue.map(a=>a.id),skillCatalogue(style,id).map(a=>a.id));
   assert.ok(catalogue.some(a=>a.unlocked));
   assert.ok(catalogue.some(a=>!a.unlocked));
   assert.ok(weapon.title);
  }
 }
 assert.deepEqual(classicAbilityCatalogue(data,'unknown'),[]);
});
