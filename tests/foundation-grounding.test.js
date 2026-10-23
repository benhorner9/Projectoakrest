import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createActor,equipActor} from '../src/actors.js';
import {animateFoundation} from '../src/foundation-motion.js';
import {WEAPON_PROFILES} from '../src/rig-contract.js';
import {visualActionClock} from '../src/visual-action-clock.js';
import {listAnimationSpecs} from '../src/ability-animation.js';
const v=new THREE.Vector3(),q=new THREE.Quaternion();
const actor=family=>{const a=createActor(false,{foundation:true});equipActor(a,WEAPON_PROFILES[family].style,family,'none');return a;};

test('feet remain level on the ground through stationary family poses and upper-body aim',()=>{
 for(const [family] of Object.entries(WEAPON_PROFILES)){
  const a=actor(family);a.position.set(7,2,-5);a.rotation.y=2.1;a.scale.setScalar(.85);
  const original=a.matrix.clone();a.updateMatrix();original.copy(a.matrix);
  for(const spec of listAnimationSpecs().filter(s=>s.weaponFamily===family))for(let i=0;i<40;i++){
   const t=spec.recovery.seconds*i/40;
   animateFoundation(a.userData,{t,dt:1/60,combat:true,sample:true,attack:{start:0,impactAt:spec.anticipation.seconds,interval:spec.recovery.seconds,abilityKind:spec.motionCue}});
   a.updateMatrixWorld(true);
   assert.ok(a.userData.footError<1e-6,`${family}/${spec.id}`);
   for(const side of ['left','right']){
    const ankle=a.userData[side+'Ankle'];ankle.getWorldPosition(v);
    assert.ok(Math.abs(v.y-(2+.14*.85))<1e-6,`${family} ${side} ankle height`);
    ankle.getWorldQuaternion(q);v.set(0,1,0).applyQuaternion(q);
    assert.ok(v.distanceTo(new THREE.Vector3(0,1,0))<1e-6,'sole stays level');
    assert.equal(a.userData[side+'Knee'].position.length(),.46);assert.equal(ankle.position.length(),.4);
   }
   assert.deepEqual(a.matrix.toArray(),original.toArray(),'feet cannot translate or rotate simulation root');
  }
 }
});

test('stance foot cancels authoritative forward, backward and lateral travel',()=>{
 for(const [side,backwards] of [[0,false],[0,true],[1,false],[-1,false]]){
  const a=actor('sword'),u=a.userData,speed=3,dt=1/120;
  animateFoundation(u,{t:0,speed,side,backwards,stride:0,sample:true});a.updateMatrixWorld(true);
  const contact=u.leftAnkle.getWorldPosition(new THREE.Vector3());
  for(let i=1;i<=22;i++){
   a.position.x-=speed*dt*side;a.position.z-=speed*dt*(backwards?-1:1)*Math.sqrt(1-side*side);
   animateFoundation(u,{t:i*dt,dt,speed,side,backwards});a.updateMatrixWorld(true);
   assert.ok(u.locomotion.phase<.6);
   u.leftAnkle.getWorldPosition(v);
   assert.ok(v.distanceTo(contact)<1e-6,`planted foot slides: ${v.distanceTo(contact)}`);
  }
 }
});

test('start, stop, turn, equipment interruption and recovery stay bounded without changing facing',()=>{
 const a=actor('greatsword'),u=a.userData;a.rotation.y=1.9;
 const stages=new Set();let last=new THREE.Vector3(),largest=0;
 for(let i=0;i<240;i++){
  const speed=i<12?0:i<90?4.7:0;
  if(i===48)equipActor(a,'ranged','bow','none');
  if(i===60)equipActor(a,'magic','frost','none');
  if(i===175)a.rotation.y+=.2;
  animateFoundation(u,{t:i/60,dt:1/60,speed,hit:i===55,combat:i<90});a.updateMatrixWorld(true);
  const foot=u.leftAnkle.getWorldPosition(v);
  if(i>0&&i!==175)largest=Math.max(largest,foot.distanceTo(last));last.copy(foot);
  stages.add(u.locomotion.stage);assert.ok(u.footError<1e-6);assert.ok(u.gripError<.001);
 }
 for(const state of ['start','run','stop','idle','turn'])assert.ok(stages.has(state),state);
 assert.ok(largest<.2,`single-frame foot jump ${largest}`);
 assert.ok(Math.abs(a.rotation.y-2.1)<1e-6,'stopping retains commanded heading');
 assert.ok(u.locomotion.speed===0);
});

test('modest sampled steps affect visual feet only and never stretch a leg',()=>{
 const a=actor('sword'),u=a.userData;
 animateFoundation(u,{t:0,sample:true,groundHeightAt:x=>x<0?.12:0});a.updateMatrixWorld(true);
 u.leftAnkle.getWorldPosition(v);assert.ok(Math.abs(v.y-.26)<1e-6);
 u.rightAnkle.getWorldPosition(v);assert.ok(Math.abs(v.y-.14)<1e-6);
 assert.ok(u.footError<1e-6);assert.equal(a.position.y,0);
});

test('every timed action reaches impact continuously; instant effects invent no anticipation',()=>{
 for(const spec of listAnimationSpecs()){
  const impact=spec.anticipation.seconds,attack={start:2,impactAt:2+impact,interval:spec.recovery.seconds};
  assert.equal(visualActionClock(1.9,attack).active,false);
  const at=visualActionClock(attack.impactAt,attack);
  assert.equal(at.wind,0);assert.equal(at.contact,1);assert.equal(at.draw,0);
  if(impact){
   const before=visualActionClock(attack.impactAt-1e-7,attack);
   assert.ok(Math.abs(before.contact-at.contact)<1e-6,spec.id);
   assert.ok(before.wind<1e-6);assert.ok(before.draw>.999);
  }
  assert.equal(visualActionClock(2+attack.interval,attack).active,false);
 }
 for(const invalid of [null,{start:0,impactAt:NaN,interval:1},{start:0,impactAt:.2,interval:0}])assert.equal(visualActionClock(0,invalid).active,false);
});

test('melee and casting weapon control no longer teleports at authoritative contact',()=>{
 for(const family of ['sword','greatsword','daggers','frost','ember']){
  const a=actor(family),u=a.userData,attack={start:0,impactAt:.4,interval:1};
  animateFoundation(u,{t:.4-1e-6,attack,combat:true,sample:true});
  const position=u.weapon.position.clone(),rotation=u.weapon.quaternion.clone();
  animateFoundation(u,{t:.4,attack,combat:true,sample:true});
  assert.ok(u.weapon.position.distanceTo(position)<1e-5,family);
  assert.ok(u.weapon.quaternion.angleTo(rotation)<1e-5,family);
 }
});

test('normal playback reaches the same weapon contact pose as deterministic scrubbing',()=>{
 for(const family of ['sword','greatsword','daggers','frost','ember']){
  const a=actor(family),b=actor(family),attack={start:.2,impactAt:.6,interval:1};
  for(let i=0;i<=36;i++)animateFoundation(a.userData,{t:i/60,dt:1/60,attack,combat:true});
  animateFoundation(b.userData,{t:.6,attack,combat:true,sample:true});
  assert.ok(a.userData.weapon.position.distanceTo(b.userData.weapon.position)<1e-6,family);
  assert.ok(a.userData.weapon.quaternion.angleTo(b.userData.weapon.quaternion)<1e-6,family);
 }
});
