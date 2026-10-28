import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,skillCatalogue} from '../src/rules.js';
import {classicCombatBook} from '../src/classic-combat-book.js';

test('all three Classic combat styles use distinct real books, six authoritative abilities and four slots',()=>{
 const data=defaultSave();
 for(const [style,title] of [['melee','MELEE TECHNIQUES'],['magic','MAGIC SPELLBOOK'],['ranged','RANGED TECHNIQUES']]){
  const result=classicCombatBook(data,style,{style,time:0,abilities:[]});
  assert.equal(result.title,title);
  assert.equal(result.slots.length,4);
  assert.equal(result.skills.length,6);
  assert.deepEqual(result.skills.map(a=>a.id),skillCatalogue(style,data.gear[style]).map(a=>a.id));
  assert.ok(result.skills.some(a=>a.unlocked));
  assert.ok(result.skills.some(a=>a.locked));
  assert.ok(result.skills.every(a=>a.requiredLevel>0&&a.cooldown>0));
 }
});
test('book follows equipped family and real saved slot selection without mutating it',()=>{
 const data=defaultSave();
 const before=JSON.stringify(data);
 const melee=classicCombatBook(data,'melee',{style:'melee',time:0,abilities:[]});
 assert.equal(JSON.stringify(data),before);
 const family='sword';
 data.slots.melee[family]=['w0','s0',null,null];
 const selected=classicCombatBook(data,'melee',{style:'melee',time:4,abilities:[
  {available:false,cooldownEnd:8},{available:true,cooldownEnd:0}
 ]});
 assert.equal(selected.slots[0].id,'w0');
 assert.equal(selected.slots[0].remaining,4);
 assert.equal(selected.slots[0].status,'Ready in 4.0s');
 assert.equal(selected.slots[1].status,'Ready');
 assert.equal(selected.skills.find(a=>a.id==='s0').slot,1);
 assert.equal(classicCombatBook(data,'unknown',{style:'unknown'}),null);
});
