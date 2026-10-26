import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave,LOADOUTS} from '../src/rules.js';
import {SLOT_ITEMS} from '../src/equipment-slots.js';
import {inventoryKeyList} from '../src/item-slot-layout.js';
import {createAdventure} from '../src/adventure-state.js';
import {sanitizeAdventure,ADVENTURE_SPAWNS} from '../src/adventure-content.js';
import {skillBookSnapshot} from '../src/classic-skill-catalogue.js';
import {findClassicInteractable} from '../src/classic-interactions.js';

function create(save=defaultSave()){
 const events=[],world=createAdventure(save,{emit:(name,details)=>events.push({name,...details}),
  grantWeapon:(style,id)=>{if(!save.inventory.weapons[style].includes(id))save.inventory.weapons[style].push(id);save.gear[style]=id;},
  heal:()=>true,resetDungeon:()=>{},calmGuardian:()=>{},random:()=>.3});
 const act=(type,id,choice,time=0)=>{
  const target=id?findClassicInteractable(id):null;
  return world.action(type,{target,choice,time,player:target?{x:target.x,z:target.z-1}:{x:0,z:39}});
 };
 return {save,world,events,act};
}
function fillBag(save,count=28){
 for(const id of Object.keys(SLOT_ITEMS)){
  if(inventoryKeyList(save).length>=count)break;
  if(!save.inventory.slotted.includes(id))save.inventory.slotted.push(id);
 }
 for(const [style,weapons] of Object.entries(LOADOUTS))for(const id of Object.keys(weapons)){
  if(inventoryKeyList(save).length>=count)break;
  if(!save.inventory.weapons[style].includes(id))save.inventory.weapons[style].push(id);
 }
 assert.equal(inventoryKeyList(save).length,count);return save;
}
test('full quest coin cap does not silently discard payment or complete quest',()=>{
 const save=defaultSave();
 save.adventure=sanitizeAdventure({index:0,accepted:true,flags:[
  'visit:service:bank','visit:service:store','visit:service:forester']});
 save.coins=9999999;
 const h=create(save),before=structuredClone(save);
 assert.equal(h.act('finish','citizen:guard').ok,false);
 assert.deepEqual(save,before);
 save.coins=0;assert.equal(h.act('finish','citizen:guard').ok,true);
 assert.equal(save.coins,20);assert.equal(save.adventure.quests.welcome.status,'completed');
 assert.equal(h.act('finish','citizen:guard').ok,false,'quest reward is never paid twice');
});
test('quest acceptance and forester axe cannot overflow the backpack',()=>{
 const save=defaultSave();
 save.adventure=sanitizeAdventure({index:1});
 fillBag(save);const h=create(save),before=structuredClone(save);
 assert.equal(h.act('accept','adventure:rowan').ok,false);
 assert.deepEqual(save,before,'failed training grants no scrolls, weapons or quest progress');
 save.adventure=sanitizeAdventure({index:2});
 // A full backpack that already owns an axe legitimately needs no free slot.
 // Remove the tool and replace its slot to cover the no-tool full-bag case.
 if(save.inventory.weapons.melee.includes('bronze-axe')){
  save.inventory.weapons.melee=save.inventory.weapons.melee.filter(id=>id!=='bronze-axe');
  save.inventory.materials['copper-ore']=1;
 }
 assert.ok(inventoryKeyList(save).length>=28);
 const q=create(save),prior=structuredClone(save);
 assert.equal(q.act('accept','adventure:smith').ok,false);
 assert.deepEqual(save,prior);
 assert.equal(q.act('teach','service:forester').ok,false);
 assert.equal(save.professions.woodcuttingLearned,false);
});
test('crafting uses freed input slots at bag capacity without losing materials',()=>{
 const save=defaultSave();
 save.inventory.materials={'softwood-logs':1};
 fillBag(save);
 const h=create(save);
 assert.equal(h.act('craft',null,'arrows').ok,true);
 assert.equal(save.inventory.materials['softwood-logs']||0,0);
 assert.equal(save.inventory.materials['field-arrows'],30);
 assert.equal(inventoryKeyList(save).length,28);
 assert.equal(h.act('craft',null,'arrows').ok,false);
});
test('heartstone rewards reserve both stacks before completing the dungeon',()=>{
 const save=defaultSave();
 save.adventure=sanitizeAdventure({index:7,accepted:true,run:{
  kills:ADVENTURE_SPAWNS.filter(m=>m.room!==undefined).map(m=>m.id),
  wards:[0,1,2],complete:false}});
 fillBag(save,27);
 const h=create(save),prior=structuredClone(save);
 assert.equal(h.act('heart','adventure:heart').ok,false);
 assert.deepEqual(save,prior,'two different new stacks cannot share the same final slot');
 const slot=save.inventory.slotted.find(id=>!Object.values(save.equipment||{}).some(v=>Object.values(v).includes(id)));
 assert.ok(slot);save.inventory.slotted.splice(save.inventory.slotted.indexOf(slot),1);
 assert.equal(h.act('heart','adventure:heart').ok,true);
 assert.equal(save.adventure.clears,1);
 assert.equal(save.inventory.materials['warden-heart'],1);
 assert.equal(save.inventory.materials['hollow-shard'],4);
 assert.equal(h.act('heart','adventure:heart').ok,false);
});
test('optional discovery supplies remain claimable if bag is initially full',()=>{
 const save=defaultSave();fillBag(save);const h=create(save);
 const before=structuredClone(save);
 assert.equal(h.act('inspect','adventure:bells').ok,false);
 assert.deepEqual(save,before);
 save.inventory.slotted.pop();save.inventory.slotted.pop();
 assert.equal(h.act('inspect','adventure:bells').ok,true);
 assert.equal(save.inventory.materials['frost-scroll'],10);
 assert.equal(save.inventory.materials['field-arrows'],10);
 assert.deepEqual(save.adventure.discoveries,['bells']);
 assert.equal(h.act('inspect','adventure:bells').ok,true);
 assert.equal(save.inventory.materials['frost-scroll'],10,'revisiting does not duplicate rewards');
});
test('watch contract cannot burn shards at the coin cap or exceed ration limit',()=>{
 const save=defaultSave();save.adventure=sanitizeAdventure({index:8,clears:1,contracts:0});
 save.inventory.materials={'hollow-shard':2,ration:9998};save.coins=10000000;
 const h=create(save),before=structuredClone(save);
 assert.equal(h.act('contract','citizen:guard').ok,false);
 assert.deepEqual(save,before);
 save.coins=100;
 assert.equal(h.act('contract','citizen:guard').ok,false);
 assert.equal(save.inventory.materials['hollow-shard'],2);
 save.inventory.materials.ration=9996;
 assert.equal(h.act('contract','citizen:guard').ok,true);
 assert.equal(save.inventory.materials.ration,9999);
 assert.equal(save.inventory.materials['hollow-shard']||0,0);
 assert.equal(save.coins,135);assert.equal(save.adventure.contracts,1);
 assert.equal(h.act('contract','citizen:guard').ok,false,'no repeat payment for one clear');
});
test('creek foraging awards independent XP, unlocks a skill card and persists',()=>{
 const save=defaultSave(),h=create(save),t=findClassicInteractable('adventure:reed');
 assert.equal(h.act('gather','adventure:reed',null,0).ok,true);
 h.world.tick(4,4,{x:t.x,z:t.z-1});
 assert.equal(save.adventure.skills.foraging,18);
 const result=validSave(save);
 assert.equal(result.adventure.skills.foraging,18);
 const skill=skillBookSnapshot(result).find(s=>s.id==='foraging');
 assert.ok(skill);assert.equal(skill.milestones[0].name,'Creek reeds');
 assert.ok(skill.totalXp>=18);
});
