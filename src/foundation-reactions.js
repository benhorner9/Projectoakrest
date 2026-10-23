/** Visual fall/recovery and impact response. The simulation root, health and
 * attack clocks are never written. Body support uses transformed mesh bounds;
 * weapons/capes cannot lever the character off the floor. */
import * as THREE from 'three';
const inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>v*v*(3-2*v);
export function reactionFrame(u,info){
 const dt=Math.max(0,Math.min(.1,info.dt||0));
 const state=u.reaction||(u.reaction={fall:0,hit:0});
 if(info.sample){state.fall=info.dead?clamp((info.deathElapsed??info.t??0)/.65):0;state.hit=info.hit&&!info.dead?1:0;}
 else{
  state.fall=clamp(state.fall+(info.dead?dt/.65:-dt/.45));
  state.hit+=((info.hit&&!info.dead?1:0)-state.hit)*(1-Math.exp(-28*dt));
 }
 state.weight=smooth(state.fall);return state;
}
export function poseFoundationReaction(u,reaction){
 const w=reaction.weight,hit=reaction.hit*(1-w);
 u.rig.rotation.z*=1-w;
 u.rig.rotation.x=u.rig.rotation.x*(1-w)+Math.PI*.5*w;u.rig.position.z=-.78*w;
 u.upperBody.rotation.y*=1-w;u.upperBody.rotation.x=-.10*hit;
 u.head.rotation.x=.10*hit-.10*w;u.head.rotation.z*=1-w;
 if(!w)return;
 for(const [side,thigh,knee] of [['left',.20,.45],['right',.10,.20]]){
  u[side+'Leg'].rotation.set(thigh*w,0,0);u[side+'Knee'].rotation.set(knee*w,0,0);u[side+'Ankle'].quaternion.identity();
  const arm=u[side+'Arm'],elbow=u[side+'Elbow'];
  arm.rotation.set(arm.rotation.x*(1-w)+.25*w,arm.rotation.y*(1-w),arm.rotation.z*(1-w)+(side==='left'?-.12:.12)*w);
  elbow.rotation.set(elbow.rotation.x*(1-w)-.20*w,0,0);
 }
 // Lay the shaft along the ground plane as the body settles. Hand constraints
 // run afterwards, preserving both grips even when a fall interrupts a swing.
 u.weapon.position.lerp(point.set(.20,1.30,-.15),w);
 u.weapon.rotation.set(u.weapon.rotation.x*(1-w),u.weapon.rotation.y*(1-w)-Math.PI*.5*w,u.weapon.rotation.z*(1-w));
}
export function supportFallenBody(u,info,reaction){
 if(!reaction.weight){u.bodyGroundCorrection=0;return;}
 const actor=u.rig.parent;actor.updateWorldMatrix(true,true);inverse.copy(actor.matrixWorld).invert();
 let lift=-Infinity;
 function visit(node){
  if(!node.visible||node===u.weapon||node===u.offhand||node===u.cape)return;
  if(node.isMesh){
   const geometry=node.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();
   const bounds=geometry.boundingBox;matrix.multiplyMatrices(inverse,node.matrixWorld);
   for(let corner=0;corner<8;corner++){
    point.set(corner&1?bounds.max.x:bounds.min.x,corner&2?bounds.max.y:bounds.min.y,corner&4?bounds.max.z:bounds.min.z).applyMatrix4(matrix);
    const sampled=info.groundHeightAt?.(point.x,point.z)??0,ground=Number.isFinite(sampled)?Math.max(-.18,Math.min(.18,sampled)):0;
    lift=Math.max(lift,ground+.006-point.y);
   }
  }
  for(const child of node.children)visit(child);
 }
 visit(u.rig);
 u.bodyGroundCorrection=Number.isFinite(lift)?Math.max(0,lift):0;
 u.rig.position.y+=u.bodyGroundCorrection;
}
