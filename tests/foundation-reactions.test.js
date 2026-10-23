import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createActor,equipActor} from '../src/actors.js';
import {animateFoundation} from '../src/foundation-motion.js';
import {WEAPON_PROFILES,validateHumanoidRig} from '../src/rig-contract.js';
const make=family=>{const actor=createActor(false,{foundation:true});equipActor(actor,WEAPON_PROFILES[family].style,family,'none');return actor;};
function bodyFloor(actor,ground=()=>0){
 const u=actor.userData,inverse=actor.matrixWorld.clone().invert(),matrix=new THREE.Matrix4(),point=new THREE.Vector3();let lowest=Infinity;
 function visit(node){
  if(!node.visible||node===u.weapon||node===u.offhand||node===u.cape)return;
  if(node.isMesh){
   if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();const b=node.geometry.boundingBox;matrix.multiplyMatrices(inverse,node.matrixWorld);
   for(let corner=0;corner<8;corner++){point.set(corner&1?b.max.x:b.min.x,corner&2?b.max.y:b.min.y,corner&4?b.max.z:b.min.z).applyMatrix4(matrix);lowest=Math.min(lowest,point.y-ground(point.x,point.z));}
  }
  for(const child of node.children)visit(child);
 }
 visit(u.rig);return lowest;
}
test('death fall grounds the visible body, keeps grips and never moves the gameplay root',()=>{
 for(const family of Object.keys(WEAPON_PROFILES)){
  const actor=make(family),u=actor.userData;actor.position.set(7,3,-2);actor.rotation.y=2.1;actor.scale.setScalar(.85);actor.updateMatrix();const original=actor.matrix.clone();
  for(const ground of [()=>0,(x,z)=>Math.max(-.12,Math.min(.12,x*.03+z*.025))])for(let frame=0;frame<80;frame++){
   animateFoundation(u,{t:frame/60,deathElapsed:frame/60,dt:1/60,dead:true,sample:true,groundHeightAt:ground});actor.updateMatrixWorld(true);
   assert.ok(bodyFloor(actor,ground)>=-1e-6,`${family} frame ${frame} penetrates body ground`);
   assert.ok(u.gripError<.001,family);assert.deepEqual(actor.matrix.toArray(),original.toArray());
  }
  assert.ok(Math.abs(u.rig.rotation.x-Math.PI/2)<1e-6);assert.ok(u.rig.position.y<.4,'body must not be raised by a long weapon');
 }
});
test('fall plays once, does not restart with an attack interval, and recovers to neutral',()=>{
 const actor=make('greatsword'),u=actor.userData;let last=null,maxJump=0;
 for(let frame=0;frame<210;frame++){
  animateFoundation(u,{t:frame/60,dt:1/60,dead:frame>=10&&frame<130,hit:frame===4});actor.updateMatrixWorld(true);
  const head=u.head.getWorldPosition(new THREE.Vector3());if(last)maxJump=Math.max(maxJump,head.distanceTo(last));last=head;
  assert.ok(u.gripError<.001);if(frame>=60&&frame<130)assert.equal(u.reaction.fall,1);
 }
 assert.ok(maxJump<.22,`single-frame head jump ${maxJump}`);assert.equal(u.reaction.fall,0);
 assert.ok(u.rig.position.length()<1e-6);assert.ok(Math.abs(u.rig.rotation.x)<1e-6);assert.ok(Math.abs(u.rig.rotation.z)<1e-6);assert.ok(u.footError<1e-6);
 assert.equal(u.animationState,'idle');assert.equal(u.visualActionStart,null);
});
test('wrist solves keep grip sockets fixed while shared hand skins pose independently',()=>{
 const actor=make('greatsword'),u=actor.userData,other=make('greatsword');
 assert.equal(u.leftHandSkin.geometry,other.userData.leftHandSkin.geometry);
 assert.notEqual(u.leftHandSkin.morphTargetInfluences,other.userData.leftHandSkin.morphTargetInfluences);
 for(const family of Object.keys(WEAPON_PROFILES)){
  equipActor(actor,WEAPON_PROFILES[family].style,family,'none');animateFoundation(u,{t:.3,attack:{start:0,impactAt:.5,interval:1},sample:true});actor.updateMatrixWorld(true);
  assert.deepEqual(validateHumanoidRig(actor),[]);assert.ok(u.gripError<.001);
  for(const side of ['left','right'])assert.equal(u[side+'Wrist'].position.length(),.34);
  if(WEAPON_PROFILES[family].draw)assert.deepEqual(u.rightHandSkin.morphTargetInfluences,[0,1]);
 }
 u.family='civilian';u.weapon.clear();u.offhand.clear();animateFoundation(u,{t:0,combat:false,sample:true});
 assert.deepEqual(u.leftHandSkin.morphTargetInfluences,[0,0]);assert.deepEqual(u.rightHandSkin.morphTargetInfluences,[0,0]);
});
