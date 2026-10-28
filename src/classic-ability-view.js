import * as THREE from 'three';
/** One reusable tell and release arc. Reads authoritative state, never damage. */
export function createClassicAbilityView(scene,{reducedMotion=false}={}){
 const ring=new THREE.RingGeometry(.85,1,32);
 const arc=new THREE.RingGeometry(.8,1,32,1,Math.PI*.1,Math.PI*.8);
 const material=new THREE.MeshBasicMaterial({color:'#edc496',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
 const tell=new THREE.Mesh(arc,material);tell.rotation.x=-Math.PI/2;tell.visible=false;scene.add(tell);
 const shieldMaterial=new THREE.MeshBasicMaterial({color:'#b1d4dc',transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false});
 const shield=new THREE.Mesh(ring,shieldMaterial);shield.rotation.x=-Math.PI/2;shield.visible=false;scene.add(shield);
 let phase=null;
 function update(state,player){
  shield.visible=state.hp>0&&state.shieldUntil>state.time;
  if(shield.visible){shieldMaterial.color.set(state.shieldStyle==='magic'?'#9ee3ed':'#edc496');shield.position.set(player.x,.12,player.z);shield.scale.setScalar(1.15);
   shieldMaterial.opacity=.18+.16*Math.min(1,state.shieldUntil-state.time);}
  const supported=e=>['heavy-slash','piercing-arrow','ice-shard','heal'].includes(e);
  const a=state.action,r=state.lastRelease,duration=r?.effect==='heal'?.65:.28,preparing=supported(a?.effect),
   released=supported(r?.effect)&&state.time>=r.time&&state.time-r.time<duration;
  tell.visible=state.hp>0&&(preparing||released);phase=tell.visible?(preparing?'prepare':'release'):null;
  if(!tell.visible)return;
  const action=preparing?a:r,origin=preparing?player:r,target=state.target,melee=action.effect==='heavy-slash';
  tell.geometry=melee?arc:ring;material.color.set(melee?'#edc496':action.effect==='ice-shard'?'#96ddf5':action.effect==='heal'?'#a7e6ab':'#c9df9b');
  const dir=preparing&&target?{x:target.x-player.x,z:target.z-player.z}:r?.direction||{x:0,z:1};
  const progress=preparing?(state.time-a.startedAt)/Math.max(.001,a.until-a.startedAt):(state.time-r.time)/duration;
  tell.position.set(origin.x,.10,origin.z);tell.rotation.z=Math.atan2(-dir.z,dir.x)-Math.PI/2;
  const scale=melee?Math.min(3.7,action.reach)*(preparing?.8:1):preparing?1.1-progress*.25:.85+progress*(action.effect==='heal'?.8:.25);
  tell.scale.setScalar(scale);material.opacity=preparing?.12+Math.min(1,progress)*.15:.5*(1-progress);
  if(!reducedMotion&&!preparing)tell.rotation.z+=(progress-.5)*.35;
 }
 return {update,stats:()=>({phase,visible:tell.visible,shield:shield.visible}),dispose(){scene.remove(tell,shield);shieldMaterial.dispose();arc.dispose();ring.dispose();material.dispose();}};
}
