import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {freshCharacterSave,defaultSave,validSave} from '../src/rules.js';
import {createOpeningLocations,START_POINTS} from '../src/opening-world.js';

test('fresh character begins in The First Steps with no items and unopened destinations',()=>{
 const s=freshCharacterSave();
 assert.equal(s.onboarding.area,'tutorial');
 assert.deepEqual(s.onboarding.tutorial.hitStyles,[]);
 assert.equal(s.onboarding.tutorial.skillsRead,false);
 assert.equal(s.onboarding.teleportScrolls,0);
 assert.deepEqual(s.onboarding.activatedPortals,[]);
 assert.deepEqual(s.inventory.weapons.melee,[]);
 assert.equal(s.inventory.armour.length,0);
 assert.deepEqual(validSave(structuredClone(s)),s);
});
test('portal realm cannot be loaded from an incomplete corrupted tutorial',()=>{
 const s=freshCharacterSave();
 s.onboarding.area='realm';
 assert.equal(validSave(s).onboarding.area,'tutorial');
 s.onboarding.tutorial.hitStyles=['melee','magic','ranged'];
 s.onboarding.tutorial.skillsRead=true;
 assert.equal(validSave(s).onboarding.area,'realm');
});
test('portal travel flags are sanitized without losing valid progress',()=>{
 const s=freshCharacterSave();
 s.onboarding={area:'world',tutorial:{hitStyles:['ranged','ranged','melee','invalid','magic'],skillsRead:true},teleportScrolls:-5,activatedPortals:['unknown','oakrest','oakrest']};
 const sanitized=validSave(s).onboarding;
 assert.deepEqual(sanitized.tutorial.hitStyles,['ranged','melee','magic']);
 assert.equal(sanitized.teleportScrolls,0);
 assert.deepEqual(sanitized.activatedPortals,['oakrest']);
});
test('legacy saves and existing created characters without onboarding remain in the world',()=>{
 const legacy=defaultSave();
 assert.equal(validSave(legacy).onboarding,undefined);
 const prior=freshCharacterSave();delete prior.onboarding;
 const kept=validSave(prior);
 assert.equal(kept.onboarding.area,'world');
 assert.deepEqual(kept.onboarding.activatedPortals,['oakrest']);
});
test('two independent scene groups represent training and Portal Realm',()=>{
 const scene=new THREE.Scene();
 const world=createOpeningLocations(scene);
 assert.equal(world.training.visible,false);
 assert.equal(world.realm.visible,false);
 assert.ok(world.training.children.length>15);
 assert.ok(world.realm.children.length>15);
 assert.deepEqual(world.getCurrent('tutorial'),world.training);
 assert.deepEqual(world.getCurrent('realm'),world.realm);
 assert.equal(world.getCurrent('world'),null);
 assert.ok(world.cityPortal.z<START_POINTS.realm.z);
 world.update('realm',1);
});
