import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createActor,equipActor} from '../src/actors.js';
import {animateFoundation,foundationState} from '../src/foundation-motion.js';
import {WEAPON_PROFILES,validateHumanoidRig} from '../src/rig-contract.js';
import {weaponMuzzle} from '../src/weapon-handling.js';
import {listAnimationSpecs} from '../src/ability-animation.js';
const point=new THREE.Vector3(),hand=new THREE.Vector3();
function checkGrip(a,profile,pull){
 a.updateMatrixWorld(true);
 const u=a.userData;
 u.weapon.getWorldPosition(point);u[profile.primary+'Hand'].getWorldPosition(hand);
 assert.ok(point.distanceTo(hand)<.001,`${u.family}: primary hand must touch grip (${point.distanceTo(hand)})`);
 if(profile.secondary||profile.draw){
  point.fromArray(profile.secondary||[0,0,.18+.34*pull]);u.weapon.localToWorld(point);
  u[(profile.draw?'right':'left')+'Hand'].getWorldPosition(hand);
  assert.ok(point.distanceTo(hand)<.001,`${u.family}: second hand must touch its target (${point.distanceTo(hand)})`);
 }
 assert.ok(u.gripError<.001,'unreachable target must fail');
 assert.ok(weaponMuzzle(a).toArray().every(Number.isFinite));
}
test('canonical rigs retain named joints and exact bone lengths across every family/action frame',()=>{
 for(const [family,profile] of Object.entries(WEAPON_PROFILES)){
  const a=createActor(false,{foundation:true});equipActor(a,profile.style,family,'none');
  a.position.set(8,3,-9);a.rotation.y=2.7;a.scale.setScalar(.85);
  assert.deepEqual(validateHumanoidRig(a),[]);
  assert.ok(a.userData.leftHand.children.filter(x=>x.isMesh).length>=5,'re-equipping must retain palm and fingers');
  const root=a.position.clone(),rotation=a.quaternion.clone();
  for(const spec of [null,...listAnimationSpecs().filter(s=>s.weaponFamily===family)]){
   const interval=spec?.recovery.seconds||1.2,impact=spec?.anticipation.seconds??.4;
   for(let i=0;i<61;i++){
    const t=i*interval/60;
    animateFoundation(a.userData,{t,dt:1/60,stride:t*9,speed:3,attack:{start:0,impactAt:impact,interval,abilityKind:spec?.motionCue},sample:true});
    const v=t<impact?Math.max(0,Math.min(1,t/Math.max(.001,impact))):0,pull=v*v*(3-2*v);
    checkGrip(a,profile,pull);
    assert.equal(a.userData.leftElbow.position.length(),.4);
    assert.equal(a.userData.rightHand.position.length(),.34);
    assert.deepEqual(a.position,root,'visual pose cannot move gameplay root');
    assert.deepEqual(a.quaternion.toArray(),rotation.toArray(),'visual pose cannot reset facing');
   }
  }
 }
});
test('state priority, interruption and end-of-action recovery are deterministic',()=>{
 const attack={start:2,impactAt:2.3,interval:1};
 assert.equal(foundationState({t:1,attack}),'idle');
 assert.equal(foundationState({t:2.1,attack}),'anticipation');
 assert.equal(foundationState({t:2.3,attack}),'recovery');
 assert.equal(foundationState({t:3,attack}),'idle');
 assert.equal(foundationState({t:2.1,attack,dead:true,hit:true,dodge:1}),'death');
 assert.equal(foundationState({t:2.1,attack,dodge:1}),'dodge');
 assert.equal(foundationState({t:2.2,attack:null,speed:4}),'run');
 const a=createActor(false,{foundation:true});equipActor(a,'melee','greatsword','none');
 animateFoundation(a.userData,{t:2.1,attack,sample:true});
 animateFoundation(a.userData,{t:4,attack:null,sample:true});
 const snapshot=a.userData.weapon.position.clone();
 for(let i=0;i<300;i++)animateFoundation(a.userData,{t:4,attack:null,sample:true});
 assert.deepEqual(a.userData.weapon.position,snapshot,'no cumulative offsets');
 assert.ok(Math.abs(a.userData.leftKnee.rotation.x)<1e-6,'no crouch at rest');
 assert.ok(Math.abs(a.userData.rightKnee.rotation.x)<1e-6);
});
test('bow draw touches string and nocked arrow; wand uses a genuinely shorter shaft',()=>{
 const a=createActor(false,{foundation:true});equipActor(a,'ranged','bow','none');
 animateFoundation(a.userData,{t:.4,attack:{start:0,impactAt:.5,interval:1.6},sample:true});
 const nock=a.userData.bowString.positions[5];
 point.set(0,0,nock);a.updateMatrixWorld(true);a.userData.weapon.localToWorld(point);
 a.userData.rightHand.getWorldPosition(hand);assert.ok(point.distanceTo(hand)<.001);
 assert.ok(Math.abs((a.userData.nockedArrow.position.z-.13)-nock)<.031);
 animateFoundation(a.userData,{t:.51,attack:{start:0,impactAt:.5,interval:1.6},sample:true});assert.equal(a.userData.nockedArrow.visible,false);
 equipActor(a,'magic','ember','none');assert.equal(a.userData.magicFocus.position.z,-.72);
 equipActor(a,'magic','frost','none');assert.equal(a.userData.magicFocus.position.z,-1.58);
});
test('unarmed reference civilian never inherits combat hand constraints or bent knees',()=>{
 const a=createActor(false,{foundation:true});a.userData.family='civilian';
 for(let t=0;t<20;t+=.1){animateFoundation(a.userData,{t,combat:false});assert.equal(a.userData.animationState,'idle');assert.ok(Math.abs(a.userData.leftKnee.rotation.x)<1e-6);assert.ok(Math.abs(a.userData.rightKnee.rotation.x)<1e-6);}
});

test('retained held-mesh transforms preserve grip origins and weapon forward direction',async()=>{
 const {HELD_ASSET_PROFILES}=await import('../src/held-asset-profiles.js');
 const {cloneHeldModel}=await import('../src/model-assets.js');
 for(const [name,profile] of Object.entries(HELD_ASSET_PROFILES)){
  const template=new THREE.Group(),grip=new THREE.Object3D();grip.position.fromArray(profile.grip);template.add(grip);
  const held=cloneHeldModel(template,name);held.updateMatrixWorld(true);
  held.children[0].children[0].getWorldPosition(point);assert.ok(point.length()<1e-6,name+' grip remains at hand');
  const forward=new THREE.Vector3(...(name.startsWith('crossbow')?[0,0,1]:[0,1,0])).applyQuaternion(held.quaternion);
  assert.ok(forward.distanceTo(new THREE.Vector3(0,0,-1))<1e-6,name+' authored forward is -Z');
  assert.equal(template.scale.x,1,'cached template cannot be resized by another actor');
 }
});
