import test from 'node:test';
import assert from 'node:assert/strict';
import {abilityMotion} from '../src/animation-language.js';

test('specials have distinct silhouettes in each tribrid combat family',()=>{
 const cases=[
  ['greatsword','sweep','execute'],
  ['daggers','sweep','hit'],
  ['bow','burst','dashback'],
  ['crossbow','burst','retreat'],
  ['frost','nova','bolt'],
  ['ember','shield','heal']
 ];
 for(const [family,a,b] of cases){
  const first=abilityMotion(family,a,.75,.60,1);
  const second=abilityMotion(family,b,.75,.60,1);
  assert.notDeepEqual(first,second,family+' abilities need different visual tells');
 }
});

test('animation cues are visual-only, bounded and deterministic',()=>{
 for(const family of ['sword','daggers','greatsword','bow','shortbow','crossbow','frost','ember']){
  for(const kind of [null,'hit','execute','sweep','bolt','burst','nova','shield','heal','dash','dashback','retreat']){
   const pose=abilityMotion(family,kind,Infinity,-9,2);
   assert.ok(Object.values(pose).every(v=>Number.isFinite(v)&&Math.abs(v)<=1.35));
   assert.deepEqual(pose,abilityMotion(family,kind,Infinity,-9,2));
  }
 }
});

test('magic nova opens both arms while sword sweep emphasises torso twist',()=>{
 const nova=abilityMotion('frost','nova',.8,.8);
 const bolt=abilityMotion('frost','bolt',.8,.8);
 const sweep=abilityMotion('sword','sweep',.8,.8);
 const hit=abilityMotion('sword','hit',.8,.8);
 assert.ok(nova.left<bolt.left,'nova should spread offhand apart from bolt aiming');
 assert.ok(Math.abs(sweep.twist-hit.twist)>.1,'sweep should have a different body turn');
});
