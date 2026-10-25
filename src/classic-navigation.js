/** Block 3: movement intent and interaction pathing without a canvas or DOM.
 * All positions use Oakrest world X/Z and the Block 2 collision footprint.
 * Presenter owns rendering and dialogue; controller never touches saves.
 */
import {CLASSIC_LIMITS,clamp,findClassicPath,slideMove,solidAt} from './classic-presentation.js';
import {canCompleteInteraction,interactionSight} from './classic-interactions.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const accessiblePath=(start,dest)=>{
 if(!valid(start)||!valid(dest)||solidAt(dest.x,dest.z))return null;
 if(distance(start,dest)<.18)return [];
 const path=findClassicPath(start,dest);
 return path.length&&distance(path.at(-1),dest)<.95?path:null;
};
const groundGoal=point=>({
 x:clamp(point.x,CLASSIC_LIMITS.minX+1,CLASSIC_LIMITS.maxX-1),
 z:clamp(point.z,CLASSIC_LIMITS.minZ+1,CLASSIC_LIMITS.maxZ-1)
});
function interactionApproach(start,target){
 const within=canCompleteInteraction(start,target);
 if(within)return [];
 const candidates=[];
 // Prefer nearest reachable position within the authoritative target's reach.
 // Do not path blindly through a bank facade to an NPC's centre.
 const radius=Math.max(.95,Math.min(target.reach-0.45,2.0));
 for(const r of [radius,radius*.65]){
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;
   const p={x:target.x+Math.cos(a)*r,z:target.z+Math.sin(a)*r};
   if(solidAt(p.x,p.z)||!interactionSight(p,target))continue;
   candidates.push({p,d:distance(start,p)});
  }
 }
 // Canonical attendant positions can be traversable too, but standing on the
 // same exact centre should not be a preferred choice over an approach point.
 candidates.sort((a,b)=>a.d-b.d);
 let best=null;
 // Limit expensive routing on Safari: try nearest candidates first.
 for(const {p} of candidates.slice(0,12)){
  const path=accessiblePath(start,p);
  if(path===null)continue;
  const length=path.reduce((sum,node,i)=>sum+distance(i?path[i-1]:start,node),0);
  if(!best||length<best.cost)best={path,cost:length};
  if(best&&best.cost<distance(start,target)+3)break;
 }
 return best?.path||null;
}
export function createClassicNavigation({speed=5.3}={}){
 let waypoints=[],pending=null,stalled=0,lastGoal=null,retries=0,lastStatus='idle';
 const reset=()=>{
  waypoints=[];pending=null;lastGoal=null;stalled=0;retries=0;lastStatus='idle';
 };
 const moveTo=(player,point)=>{
  reset();
  if(!valid(player)||!valid(point))return {ok:false,reason:'Invalid destination'};
  const goal=groundGoal(point);
  const path=accessiblePath(player,goal);
  if(path===null){lastStatus='unreachable';return {ok:false,reason:'That destination is blocked.'};}
  waypoints=path;lastGoal=goal;lastStatus=waypoints.length?'moving':'arrived';
  return {ok:true,arrived:waypoints.length===0};
 };
 const interactWith=(player,target)=>{
  reset();
  if(!valid(player)||!target||!valid(target))return {ok:false,reason:'Unknown interaction'};
  if(canCompleteInteraction(player,target))return {ok:true,interaction:target,arrived:true};
  const path=interactionApproach(player,target);
  if(path===null||!path.length){lastStatus='unreachable';return {ok:false,reason:'Cannot reach '+target.name+'.'};}
  waypoints=path;pending=target;lastGoal=path.at(-1);lastStatus='approaching';
  return {ok:true,arrived:false};
 };
 const step=(player,axes,dt)=>{
  if(!valid(player))throw new Error('Player position must be finite');
  const delta=clamp(Number(dt)||0,0,.1);
  let dx=Number(axes?.x)||0,dz=Number(axes?.z)||0,kind='idle';
  if(Math.hypot(dx,dz)>.12){
   // Physical player input always overrides autonomous walking.
   reset();kind='manual';
  }else{
   // Discard already-reached waypoints in the same update; never pause
   // for a frame at every A* grid node.
   while(waypoints.length&&distance(player,waypoints[0])<.28)waypoints.shift();
   const next=waypoints[0];
   if(next){
    const d=distance(player,next);
    dx=(next.x-player.x)/d;dz=(next.z-player.z)/d;
    kind=pending?'approach':'path';
   }
  }
  const magnitude=Math.hypot(dx,dz);
  let newPosition={x:player.x,z:player.z},moved=false;
  if(magnitude>.12&&delta>0){
   const unitX=dx/magnitude,unitZ=dz/magnitude;
   const limit=kind==='path'||kind==='approach'
    ?Math.min(speed*delta,distance(player,waypoints[0]))
    :speed*delta*Math.min(1,magnitude);
   newPosition=slideMove(player,unitX*limit,unitZ*limit);
   moved=distance(newPosition,player)>.0001;
  }
  let interaction=null,failed=null;
  if(pending&&canCompleteInteraction(newPosition,pending)){
   interaction=pending;reset();
  }else if(kind==='path'||kind==='approach'){
   if(waypoints.length&&distance(newPosition,waypoints[0])<.28)waypoints.shift();
   if(moved)stalled=0;
   else if(delta>0)stalled+=delta;
   if(!waypoints.length&&pending){
    if(canCompleteInteraction(newPosition,pending)){
     interaction=pending;reset();
    }else{
     failed='Could not reach '+pending.name+'.';reset();
    }
   }else if(!waypoints.length){
    reset();lastStatus='arrived';
   }else if(stalled>.35){
    if(retries<1&&lastGoal){
     retries++;stalled=0;
     const reroute=pending?interactionApproach(newPosition,pending):accessiblePath(newPosition,lastGoal);
     if(reroute?.length)waypoints=reroute;
     else{failed='Route blocked. Choose another destination.';reset();}
    }else{failed='Route blocked. Choose another destination.';reset();}
   }
  }
  const length=distance(newPosition,player);
  return {position:newPosition,moved,kind,heading:length>.0001?{
   x:(newPosition.x-player.x)/length,z:(newPosition.z-player.z)/length}:null,
   interaction,failed,remaining:waypoints.length,pending:pending?.id||null,status:lastStatus};
 };
 return {moveTo,interactWith,step,stop:reset,
  state:()=>({waypoints:waypoints.map(p=>({...p})),pending:pending?.id||null,
   goal:lastGoal?{...lastGoal}:null,status:lastStatus})};
}
