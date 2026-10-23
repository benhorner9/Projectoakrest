/** Two-bone hand constraints for the canonical actor, evaluated AFTER body pose.
 * Every vector is in rig-local space. A bounded weapon control drives the hands;
 * a hand never drives a weapon that then drives that same hand (no feedback loop).
 * This module does not know about player saves, physics, damage or projectile state.
 */
import * as THREE from 'three';
import {WEAPON_PROFILES} from './rig-contract.js';
import {solveTwoBone} from './two-bone-constraint.js';
const direction=new THREE.Vector3(),pole=new THREE.Vector3(),target=new THREE.Vector3(),wristGoal=new THREE.Vector3();
const UPPER=.40,LOWER=.34;
export function solveArm(u,side,goal,orientation){
 const upper=u[side+'Arm'],lower=u[side+'Elbow'],hand=u[side+'Hand'],wrist=u[side+'Wrist'];
 pole.set(side==='left'?-.75:.75,-.65,.25);
 wristGoal.copy(hand.position).applyQuaternion(orientation).negate().add(goal);
 return solveTwoBone(upper,lower,wrist,wristGoal,pole,orientation);
}
export function constrainWeaponHands(u,pull=0){
 const profile=WEAPON_PROFILES[u.family];if(!profile)return;
 const w=u.weapon;
 // Project the weapon control into the intersection of both reach spheres.
 // Correction translates the visual prop only; bones never stretch and the
 // simulation root/collider is never moved. Fixed iterations bound runtime cost.
 for(let pass=0;pass<12;pass++){
  const count=profile.secondary||profile.draw?2:1;
  for(let index=0;index<count;index++){
   const side=index===0?profile.primary:(profile.primary==='right'?'left':'right');
   if(index===0)target.set(0,0,0);
   else if(profile.draw)target.set(0,0,.18+.34*pull);
   else target.fromArray(profile.secondary);
   target.applyQuaternion(w.quaternion).add(w.position);
   wristGoal.copy(u[side+'Hand'].position).applyQuaternion(w.quaternion);
   direction.copy(target).sub(wristGoal).sub(u[side+'Arm'].position);
   const distance=direction.length(),limit=UPPER+LOWER-.012;
   if(distance>limit)w.position.addScaledVector(direction,-(distance-limit)/distance);
  }
 }
 target.copy(w.position);
 u.gripError=solveArm(u,profile.primary,target,w.quaternion);
 if(profile.draw){
  target.set(0,0,.18+.34*pull).applyQuaternion(w.quaternion).add(w.position);
  u.gripError=Math.max(u.gripError,solveArm(u,'right',target,w.quaternion));
 }else if(profile.secondary){
  target.fromArray(profile.secondary).applyQuaternion(w.quaternion).add(w.position);
  u.gripError=Math.max(u.gripError,solveArm(u,'left',target,w.quaternion));
 }
 u.weaponProfile=profile;
}
export function weaponMuzzle(actor,out=new THREE.Vector3()){
 const u=actor.userData,profile=WEAPON_PROFILES[u.family];
 out.fromArray(profile?.muzzle||[0,0,-.35]);
 return u.weapon.localToWorld(out);
}
