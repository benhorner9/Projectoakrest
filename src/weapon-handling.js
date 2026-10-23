/** Two-bone hand constraints for the canonical actor, evaluated AFTER body pose.
 * Every vector is in rig-local space. A bounded weapon control drives the hands;
 * a hand never drives a weapon that then drives that same hand (no feedback loop).
 * This module does not know about player saves, physics, damage or projectile state.
 */
import * as THREE from 'three';
import {WEAPON_PROFILES} from './rig-contract.js';
const down=new THREE.Vector3(0,-1,0),direction=new THREE.Vector3(),pole=new THREE.Vector3(),joint=new THREE.Vector3(),lowerDirection=new THREE.Vector3(),target=new THREE.Vector3(),q=new THREE.Quaternion(),inv=new THREE.Quaternion();
const UPPER=.40,LOWER=.34,EPS=1e-5;
export function solveArm(u,side,goal,orientation){
 const upper=u[side+'Arm'],lower=u[side+'Elbow'],hand=u[side+'Hand'];
 direction.copy(goal).sub(upper.position);
 const requested=direction.length(),distance=Math.min(UPPER+LOWER-EPS,Math.max(Math.abs(UPPER-LOWER)+EPS,requested));
 if(requested<EPS)direction.set(0,-1,0);else direction.divideScalar(requested);
 // Elbows point out and down; project a stable anatomical pole off the reach axis.
 pole.set(side==='left'?-.75:.75,-.65,.25).addScaledVector(direction,-pole.dot(direction));
 if(pole.lengthSq()<EPS)pole.set(0,0,1).addScaledVector(direction,-direction.z);
 pole.normalize();
 const along=(UPPER*UPPER-LOWER*LOWER+distance*distance)/(2*distance);
 const height=Math.sqrt(Math.max(0,UPPER*UPPER-along*along));
 joint.copy(direction).multiplyScalar(along).addScaledVector(pole,height);
 q.setFromUnitVectors(down,lowerDirection.copy(joint).normalize());upper.quaternion.copy(q);
 lowerDirection.copy(direction).multiplyScalar(distance).sub(joint).normalize();
 q.setFromUnitVectors(down,lowerDirection);
 inv.copy(upper.quaternion).invert();lower.quaternion.copy(inv).multiply(q);
 // Final wrist orientation is explicit and independent of elbow bend.
 hand.quaternion.copy(q).invert().multiply(orientation);
 return Math.max(0,requested-distance);
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
   direction.copy(target).sub(u[side+'Arm'].position);
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
