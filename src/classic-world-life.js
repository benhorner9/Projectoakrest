/** Deterministic town routines: service NPCs stand; designated workers walk real paths. */
export function citizenRoutine(npc,time,player){
 const route=npc.route;
 if(!Array.isArray(route)||route.length<2){
  return {x:npc.x,z:npc.z,moving:false,
   facing:{x:(player?.x??npc.x)-npc.x,z:(player?.z??npc.z-1)-npc.z}};
 }
 const speed=npc.role==='porter'?.88:npc.role==='gardener'?.68:1.15;
 const pause=npc.role==='gardener'?3:1.3;
 const points=[...route,...route.slice(0,-1).reverse()];
 const segments=points.slice(1).map(([x,z],i)=>{
  const [ax,az]=points[i],distance=Math.hypot(x-ax,z-az);
  return {ax,az,x,z,distance,duration:distance/speed};
 });
 const cycle=segments.reduce((total,segment)=>total+segment.duration+pause,0);
 let t=((Math.max(0,Number(time)||0)+(npc.role==='messenger'?11:npc.role==='gardener'?23:0))%cycle+cycle)%cycle;
 for(const segment of segments){
  if(t<segment.duration){
   const progress=Math.min(1,t/Math.max(.001,segment.duration));
   return {x:segment.ax+(segment.x-segment.ax)*progress,
    z:segment.az+(segment.z-segment.az)*progress,moving:true,
    facing:{x:(segment.x-segment.ax)/segment.distance,z:(segment.z-segment.az)/segment.distance}};
  }
  t-=segment.duration;
  if(t<pause)return {x:segment.x,z:segment.z,moving:false,
   facing:{x:(segment.x-segment.ax)/segment.distance,z:(segment.z-segment.az)/segment.distance}};
  t-=pause;
 }
 return {x:npc.x,z:npc.z,moving:false,facing:{x:0,z:-1}};
}
