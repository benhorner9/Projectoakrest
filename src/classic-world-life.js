/** Read-only, deterministic street routines. Never writes character saves.
 * Stops look like stops: gait/stride is off while facing is held. Routes must
 * be validated against the very same swept collision used by navigation.
 */
const speeds=Object.freeze({porter:.88,gardener:.68,messenger:1.15,
 courier:1.34,baker:.93,caretaker:.72});
const pauses=Object.freeze({porter:1.3,gardener:3,messenger:1.3,
 courier:.85,baker:2.5,caretaker:3.6});
const offsets=Object.freeze({messenger:11,gardener:23,courier:3,baker:7,caretaker:13});
const stationary=npc=>({x:npc.x,z:npc.z,moving:false,facing:{x:0,z:-1}});
export function citizenRoutine(npc,time,player){
 const route=npc?.route;
 if(!Array.isArray(route)||route.length<2){
  const still=stationary(npc);
  const dx=(player?.x??npc.x)-npc.x,dz=(player?.z??npc.z-1)-npc.z;
  return {...still,facing:Math.hypot(dx,dz)>.15?{x:dx,z:dz}:still.facing};
 }
 const speed=speeds[npc.role]||1,pause=pauses[npc.role]??1.3;
 const points=[...route,...route.slice(0,-1).reverse()];
 const legs=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if(!Array.isArray(a)||!Array.isArray(b)||![...a,...b].every(Number.isFinite))return stationary(npc);
  const dx=b[0]-a[0],dz=b[1]-a[1],distance=Math.hypot(dx,dz);
  if(distance<.001)continue;
  legs.push({a,b,distance,duration:distance/speed,heading:{x:dx/distance,z:dz/distance}});
 }
 if(!legs.length)return stationary(npc);
 const cycle=legs.reduce((sum,leg)=>sum+leg.duration+pause,0);
 let t=((Math.max(0,Number(time)||0)+(offsets[npc.role]||0))%cycle+cycle)%cycle;
 for(const leg of legs){
  if(t<leg.duration){
   const fraction=t/leg.duration;
   return {x:leg.a[0]+(leg.b[0]-leg.a[0])*fraction,
    z:leg.a[1]+(leg.b[1]-leg.a[1])*fraction,
    moving:true,facing:leg.heading};
  }
  t-=leg.duration;
  if(t<pause)return {x:leg.b[0],z:leg.b[1],moving:false,facing:leg.heading};
  t-=pause;
 }
 return stationary(npc);
}
