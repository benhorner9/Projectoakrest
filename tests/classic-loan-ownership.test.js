import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave,freshCharacterSave} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
const fresh=()=>{const s=validSave(defaultSave());s.onboarding={area:'world',complete:true};s.inventory.weapons={melee:[],magic:[],ranged:[]};s.gear={melee:'none',magic:'none',ranged:'none'};return s;};
test('practice weapons cannot become permanent property through banking',()=>{
 const s=fresh(),before=JSON.stringify(s),sim=createClassicCombat({save:s});
 for(const [style,id] of Object.entries({melee:'sword',magic:'frost',ranged:'bow'})){
  assert.equal(sim.itemAction({type:'equip',kind:'weapon',style,id:null},{x:0,z:39}).ok,true);
  assert.equal(sim.itemAction({type:'bank',kind:'weapon',style,id,direction:'deposit'},{x:-30,z:14}).ok,false);
  assert.deepEqual(sim.persistentSave().bank.weapons[style],[]);
  assert.deepEqual(sim.persistentSave().inventory.weapons[style],[]);
 }
 assert.equal(JSON.stringify(s),before,'source save remains untouched');
});
test('bank-only owned weapon withdraws and survives save validation',()=>{
 const s=fresh();s.bank.weapons.melee=['sword'];
 const sim=createClassicCombat({save:s});
 assert.equal(sim.itemAction({type:'bank',kind:'weapon',style:'melee',id:'sword',direction:'withdraw'},{x:-30,z:14}).ok,true);
 const persisted=validSave(sim.persistentSave());
 assert.deepEqual(persisted.inventory.weapons.melee,['sword']);
 assert.deepEqual(persisted.bank.weapons.melee,[]);
});
test('earned starter drop replaces a loan; rejected pickup keeps practice state',()=>{
 const s=fresh();s.groundLoot=[{id:'earned',kind:'weapon',style:'melee',itemId:'sword',amount:1,x:0,z:39}];
 const sim=createClassicCombat({save:s});
 assert.equal(sim.pickup({x:20,z:39},'earned').ok,false);
 assert.deepEqual(sim.sandboxSave().inventory.weapons.melee,['sword']);
 assert.deepEqual(sim.persistentSave().inventory.weapons.melee,[]);
 assert.equal(sim.pickup({x:0,z:39},'earned').ok,true);
 const persisted=validSave(sim.persistentSave());
 assert.deepEqual(persisted.inventory.weapons.melee,['sword']);
 assert.equal(persisted.coins,s.coins,'real first pickup must not salvage as duplicate');
 assert.deepEqual(persisted.groundLoot,[]);
});

test('fresh adventure starts visibly unarmed without hidden practice loans',()=>{
 const save=freshCharacterSave(),before=JSON.stringify(save),sim=createClassicCombat({save,adventure:true});
 for(const style of ['melee','magic','ranged'])assert.deepEqual(sim.sandboxSave().inventory.weapons[style],[]);
 assert.equal(JSON.stringify(save),before);
});
