import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {defaultSave,freshCharacterSave,validSave,levelFromXp} from '../src/rules.js';
import {OAKREST_SERVICES,OAKREST_GROVES,TOWN_SPECIALISATIONS,SHOP_STOCK,
  STARTER_GROVE_XP_CAP,isOakrestSafe,townInteraction,townBank,bankCoins,bankMaterials,
  bankEquipment,buyStarterStock,teachWoodcutting,harvestStarterGrove} from '../src/town-services.js';
import {buildOakrestTown} from '../src/town-world.js';
import {blocked,clearWorldObstacles,terrainHeight,moveOnGround} from '../src/terrain.js';

test('Oakrest has a protected town, peaceful approach and distributed skilling rules',()=>{
 assert.deepEqual(TOWN_SPECIALISATIONS.oakrest,['woodcutting']);
 assert.deepEqual(OAKREST_SERVICES.map(x=>x.id),['bank','trade-house','store','forester']);
 assert.equal(OAKREST_GROVES.length,3);
 assert.ok(isOakrestSafe(0,-13),'original gate is in protected zone');
 assert.ok(isOakrestSafe(0,-42),'peaceful approach extends beyond the gate');
 assert.ok(!isOakrestSafe(0,-55),'monster frontier is beyond the boundary');
 assert.equal(townInteraction(-29.6,14)?.id,'bank');
 assert.equal(townInteraction(29.6,14)?.id,'store');
 assert.equal(townInteraction(-29.6,46)?.id,'forester');
 assert.equal(townInteraction(-18,60)?.type,'grove');
 assert.equal(townInteraction(0,-35),null);
});
test('world extension builds solid services and supports the new frontier',()=>{
 clearWorldObstacles();
 const scene=new THREE.Scene(),world=buildOakrestTown(scene);
 assert.equal(world.services,OAKREST_SERVICES.length);
 assert.ok(world.buildings>=7);
 assert.equal(blocked(-30,14,.35),false,'bank floor is walkable');
 assert.equal(blocked(30,14,.35),false,'shop floor is walkable');
 assert.equal(blocked(-25.5,14,.35),false,'bank doorway is open');
 assert.equal(blocked(25.5,14,.35),false,'shop doorway is open');
 assert.equal(blocked(-24,18.5,.35),true,'grand bank front facade is a real wall away from doorway');
 assert.equal(blocked(0,-25,.35),false,'central gate road must remain traversable');
 assert.equal(blocked(0,-98,.35),false,'forest bandit area is inside world');
 assert.equal(blocked(0,-121,.35),true,'world is still bounded');
 const pos=moveOnGround({x:0,z:-15},0,-8);
 assert.ok(pos.z< -22,'walking from gate to greenbelt remains possible');
 assert.ok(Number.isFinite(terrainHeight(-6,-98)));
 clearWorldObstacles();
});
test('bank transfers money, materials and only unequipped equipment with save roundtrip',()=>{
 const d=defaultSave();d.coins=125;d.inventory.materials['softwood-logs']=3;
 d.inventory.weapons.melee.push('daggers');
 assert.equal(bankCoins(d,'deposit'),125);
 assert.equal(d.coins,0);
 assert.equal(townBank(d).coins,125);
 assert.equal(bankCoins(d,'withdraw'),125);
 assert.equal(d.coins,125);
 assert.equal(bankMaterials(d,'softwood-logs','deposit'),3);
 assert.equal(d.inventory.materials['softwood-logs']||0,0);
 assert.equal(bankMaterials(d,'softwood-logs','withdraw'),3);
 assert.equal(d.inventory.materials['softwood-logs'],3);
 assert.equal(bankEquipment(d,'weapon','sword','deposit','melee'),false,'worn weapon cannot be banked');
 assert.equal(bankEquipment(d,'weapon','daggers','deposit','melee'),true);
 assert.ok(d.bank.weapons.melee.includes('daggers'));
 assert.ok(!d.inventory.weapons.melee.includes('daggers'));
 assert.deepEqual(validSave(JSON.parse(JSON.stringify(d))),d);
 assert.equal(bankEquipment(d,'weapon','daggers','withdraw','melee'),true);
});
test('starting shop sells essentials without duplication or free stock',()=>{
 const d=freshCharacterSave();
 assert.equal(buyStarterStock(d,'starter-sword').ok,false,'new characters have no coins');
 d.coins=100;
 const bought=buyStarterStock(d,'starter-sword');
 assert.equal(bought.ok,true);assert.ok(d.inventory.weapons.melee.includes('sword'));
 assert.equal(d.coins,100-SHOP_STOCK.find(x=>x.id==='starter-sword').price);
 assert.equal(buyStarterStock(d,'starter-sword').ok,false,'a duplicate does not debit money');
 assert.equal(validSave(d).coins,d.coins);
});
test('the forester teaches only starter Woodcutting and restricts local XP to level five',()=>{
 const d=freshCharacterSave(),grove=OAKREST_GROVES[0].id,cd=new Map();
 assert.equal(harvestStarterGrove(d,grove,0,cd).ok,false,'skill training is required');
 assert.equal(teachWoodcutting(d),true);
 assert.equal(teachWoodcutting(d),false);
 assert.equal(harvestStarterGrove(d,grove,0,cd).ok,true);
 assert.equal(harvestStarterGrove(d,grove,1,cd).ok,false,'tree has a cooldown');
 for(let i=1;i<30;i++)harvestStarterGrove(d,grove,i*10,cd);
 assert.equal(d.professions.woodcuttingXp,STARTER_GROVE_XP_CAP);
 assert.equal(levelFromXp(d.professions.woodcuttingXp).level,5);
 assert.equal(harvestStarterGrove(d,grove,400,cd).ok,false,'starter trees cannot level beyond five');
 assert.deepEqual(validSave(d).professions,d.professions);
 assert.equal(validSave(d).inventory.materials['softwood-logs'],d.inventory.materials['softwood-logs']);
});
