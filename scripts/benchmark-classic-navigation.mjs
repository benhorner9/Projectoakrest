/** Repeatable CPU/navigation correctness probe; not a device FPS benchmark. */
import {findClassicPath,solidAt} from '../src/classic-presentation.js';
let seed=1947;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let routed=0,crossings=0,incomplete=0,unreachable=0,valid=0;const times=[];
const started=performance.now();
for(let i=0;i<350;i++){
 const start={x:random()*84-42,z:random()*100-10},end={x:random()*84-42,z:random()*100-10};
 if(solidAt(start.x,start.z)||solidAt(end.x,end.z))continue;
 valid++;const before=performance.now(),path=findClassicPath(start,end);times.push(performance.now()-before);
 if(!path.length){unreachable++;continue;}routed++;
 let previous=start,hit=false;
 for(const node of path){
  const n=Math.ceil(Math.hypot(node.x-previous.x,node.z-previous.z)/.05);
  for(let j=1;j<=n;j++)if(solidAt(previous.x+(node.x-previous.x)*j/n,previous.z+(node.z-previous.z)*j/n)){hit=true;break;}
  previous=node;
 }
 if(hit)crossings++;
 if(Math.hypot(previous.x-end.x,previous.z-end.z)>.01)incomplete++;
}
times.sort((a,b)=>a-b);
console.log(JSON.stringify({seed:1947,attempts:350,valid,routed,unreachable,crossings,incomplete,
 totalMs:performance.now()-started,routeMedianMs:times[Math.floor(times.length*.5)],
 routeP95Ms:times[Math.floor(times.length*.95)],routeMaxMs:times.at(-1),
 environment:'Node CPU only; not physical iPad Safari or FPS'},null,2));
if(crossings||incomplete)process.exitCode=1;
