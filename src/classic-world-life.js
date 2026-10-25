/** Ambient movement stays close to canonical interaction/map anchors. */
export function citizenRoutine(npc,time,player){
 const distance=Math.hypot(player.x-npc.x,player.z-npc.z);
 if(!['citizen','guard'].includes(npc.role)||distance<=3)
  return {x:npc.x,z:npc.z,moving:false,facing:{x:player.x-npc.x,z:player.z-npc.z}};
 const phase=time*.28+(npc.role==='guard'?0:Math.PI),fade=Math.min(1,(distance-3)/2),radius=.65*fade;
 return {x:npc.x+Math.sin(phase)*radius,z:npc.z+(1-Math.cos(phase))*.3*fade,
  moving:true,facing:{x:Math.cos(phase),z:Math.sin(phase)*.46}};
}
