import * as THREE from 'three';
/** One reusable tell and release arc. Reads authoritative state, never damage. */
export function createClassicAbilityView(scene,{reducedMotion=false}={}){
 const arc=new THREE.RingGeometry(.8,1,32,1,Math.PI*.1,Math.PI*.8);
 const material=new THREE.MeshBasicMaterial({color:'#edc496',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
 const tell=new THREE.Mesh(arc,material);tell.rotation.x=-Math.PI/2;tell.visible=false;scene.add(tell);
 let phase=null;
 function update(state,player){
  const a=state.action,r=state.lastRelease,preparing=a?.effect==='heavy-slash',
   released=r?.effect==='heavy-slash'&&state.time>=r.time&&state.time-r.time<.28;
  tell.visible=state.hp>0&&(preparing||released);phase=tell.visible?(preparing?'prepare':'release'):null;
  if(!tell.visible)return;
  const action=preparing?a:r,origin=preparing?player:r,target=state.target;
  const dir=preparing&&target?{x:target.x-player.x,z:target.z-player.z}:r?.direction||{x:0,z:1};
  const progress=preparing?(state.time-a.startedAt)/Math.max(.001,a.until-a.startedAt):(state.time-r.time)/.28;
  tell.position.set(origin.x,.10,origin.z);tell.rotation.z=Math.atan2(-dir.z,dir.x)-Math.PI/2;
  const scale=Math.min(3.7,action.reach)*(preparing?.8:1);
  tell.scale.setScalar(scale);material.opacity=preparing?.12+Math.min(1,progress)*.15:.5*(1-progress);
  if(!reducedMotion&&!preparing)tell.rotation.z+=(progress-.5)*.35;
 }
 return {update,stats:()=>({phase,visible:tell.visible}),dispose(){scene.remove(tell);arc.dispose();material.dispose();}};
}
