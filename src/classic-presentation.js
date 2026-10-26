import {adventureSolidAt,ADVENTURE_TARGETS,ADVENTURE_WALLS,ADVENTURE_TREES} from './adventure-content.js';
/** Oakrest Block 2: renderer-free 2.5D camera, navigation and presentation data.
 * Reuses canonical world coordinates and never mutates character saves.
 */
import {OAKREST_BUILDINGS,OAKREST_WELL,OAKREST_PATHS,localBuildingPosition} from './town-layout.js';
import {STYLE_ORDER,LOADOUTS,levelFromXp,combatLevelFromXp,defaultSave} from './rules.js';
import {EQUIPMENT_SLOTS,allowsOffhand} from './equipment-slots.js';
import {OAKREST_SERVICES,OAKREST_GROVES} from './town-services.js';
import {CLASSIC_ROADS,CLASSIC_PERIMETER,wallSolidAt} from './classic-town-plan.js';

// Canonical +Z is NORTH on the map. These values describe the INITIAL
// south-of-player oblique view. The player may orbit/tilt freely afterward;
// all live controls use the orbit offset rather than these defaults.
export const CLASSIC_CAMERA=Object.freeze({elevation:38,offsetX:12,offsetZ:-43,viewHeight:32,minZoom:.78,maxZoom:1.48});
/** Screen-aligned ground-plane axes for any live orbit offset.
 * Shared by controls and the corner minimap; geographic east is not
 * necessarily screen right once the camera rotates.
 */
export function classicScreenBasis(offset=CLASSIC_CAMERA){
 const x=offset.x??offset.offsetX,z=offset.z??offset.offsetZ;
 const length=Math.hypot(x,z)||1;
 return {
  right:{x:z/length,z:-x/length},
  up:{x:-x/length,z:-z/length}
 };
}
export const CLASSIC_LIMITS=Object.freeze({minX:-53,maxX:53,minZ:-24,maxZ:334});
export const CLASSIC_NPCS=Object.freeze([
 ...OAKREST_SERVICES.map(s=>Object.freeze({
  id:s.id==='store'?'shopkeeper':s.id==='forester'?'forester':s.id==='trade-house'?'trader':'banker',
  name:s.attendant,x:s.npcX,z:s.npcZ,role:s.kind,
  colour:s.kind==='bank'?'#5b8190':s.kind==='store'?'#ad8259':s.kind==='skill'?'#7d995d':'#8f799c',
  targetId:'service:'+s.id
 })),
 Object.freeze({id:'guard',name:'Village Guard',x:5,z:48,role:'guard',colour:'#a8695d',targetId:'citizen:guard'}),
 Object.freeze({id:'villager',name:'Townsfolk',x:9,z:30,role:'citizen',colour:'#9781a5',targetId:'citizen:villager'})
]);
export const CLASSIC_TREES=Object.freeze(Array.from({length:70},(_,i)=>{
 const column=i%14,row=Math.floor(i/14);
 const x=-50+column*7.5+(row%2?2:0),z=-13+row*23+(column%3)*2;
 return {x,z,r:.85+(i%4)*.1};
}).filter(t=>{
 // Trees outside the defensive ring still frame the village, but may not
 // puncture stonework, choke gateways or obstruct continuous side streets.
 if(t.x>CLASSIC_PERIMETER.west-2&&t.x<CLASSIC_PERIMETER.east+2&&
  t.z>CLASSIC_PERIMETER.south-2&&t.z<CLASSIC_PERIMETER.north+2)return false;
 return Math.abs(t.x)>38||t.z>86||t.z< -12;
}));

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function inBounds(x,z,radius=.4){
 return x>=CLASSIC_LIMITS.minX+radius&&x<=CLASSIC_LIMITS.maxX-radius&&
 z>=CLASSIC_LIMITS.minZ+radius&&z<=CLASSIC_LIMITS.maxZ-radius;
}
/** Test against discrete wall segments; each building has a real front doorway.
 * localBuildingPosition aligns the same footprints used by the main town.
 */
export function solidAt(x,z,radius=.38){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!inBounds(x,z,radius))return true;
 if(wallSolidAt(x,z,radius)||adventureSolidAt(x,z,radius))return true;
 if(Math.hypot(x-OAKREST_WELL.x,z-OAKREST_WELL.z)<OAKREST_WELL.r+radius)return true;
 for(const tree of CLASSIC_TREES)if(Math.hypot(x-tree.x,z-tree.z)<tree.r+radius)return true;
 for(const tree of OAKREST_GROVES)if(Math.hypot(x-tree.x,z-tree.z)<.85+radius)return true;
 for(const b of OAKREST_BUILDINGS){
  const p=localBuildingPosition(b,x,z),hx=b.w/2,hz=b.d/2,thick=.22+radius;
  if(Math.abs(p.x)>hx+thick||Math.abs(p.z)>hz+thick)continue;
  // Back wall and two side walls.
  if(Math.abs(p.x)<=hx+thick&&Math.abs(p.z+hz)<thick)return true;
  if(Math.abs(p.z)<=hz+thick&&Math.abs(Math.abs(p.x)-hx)<thick)return true;
  // Centre gap 2.8 world units: a traversable front doorway.
  if(Math.abs(p.z-hz)<thick&&Math.abs(p.x)>1.4-radius)return true;
 }
 return false;
}
export function occupantBuilding(x,z){
 for(const b of OAKREST_BUILDINGS){
  const p=localBuildingPosition(b,x,z);
  if(Math.abs(p.x)<b.w/2-.35&&Math.abs(p.z)<b.d/2-.35)return b;
 }
 return null;
}
export function slideMove(pos,dx,dz,radius=.38){
 let x=pos.x,z=pos.z;
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.24));
 for(let i=0;i<n;i++){
  if(!solidAt(x+dx/n,z,radius))x+=dx/n;
  if(!solidAt(x,z+dz/n,radius))z+=dz/n;
 }
 return {x,z};
}
function segmentCircle(a,b,x,z,r){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const t=length?clamp(((x-a.x)*dx+(z-a.z)*dz)/length,0,1):0;
 return (a.x+dx*t-x)**2+(a.z+dz*t-z)**2<=r*r;
}
function segmentRect(a,b,minX,maxX,minZ,maxZ){
 if(Math.max(a.x,b.x)<minX||Math.min(a.x,b.x)>maxX||
  Math.max(a.z,b.z)<minZ||Math.min(a.z,b.z)>maxZ)return false;
 let enter=0,leave=1;
 for(const [origin,delta,low,high] of [[a.x,b.x-a.x,minX,maxX],[a.z,b.z-a.z,minZ,maxZ]]){
  if(Math.abs(delta)<1e-12){if(origin<low||origin>high)return false;continue;}
  const near=(low-origin)/delta,far=(high-origin)/delta;
  enter=Math.max(enter,Math.min(near,far));leave=Math.min(leave,Math.max(near,far));
  if(enter>leave)return false;
 }
 return true;
}
const routeCircles=[
 {x:OAKREST_WELL.x,z:OAKREST_WELL.z,r:OAKREST_WELL.r},
 ...CLASSIC_TREES,...OAKREST_GROVES.map(t=>({x:t.x,z:t.z,r:.85})),
 ...ADVENTURE_TREES,...ADVENTURE_TARGETS
  .filter(t=>['station','resource','ward','heart','discovery'].includes(t.kind))
  .map(t=>({x:t.x,z:t.z,r:t.kind==='station'?.8:.45}))
];
/** Exact swept player footprint against the same canonical shapes as solidAt.
 * No distance samples: grazing a corner cannot slip between samples, and long
 * routes do not repeatedly scan the entire scene every few centimetres. */
export function clearClassicLine(a,b,radius=.38){
 if(!a||!b||![a.x,a.z,b.x,b.z].every(Number.isFinite)||
  !inBounds(a.x,a.z,radius)||!inBounds(b.x,b.z,radius))return false;
 for(const c of routeCircles)if(segmentCircle(a,b,c.x,c.z,c.r+radius))return false;
 for(const wall of ADVENTURE_WALLS)if(segmentRect(a,b,wall.x-wall.w/2-radius,
  wall.x+wall.w/2+radius,wall.z-wall.d/2-radius,wall.z+wall.d/2+radius))return false;
 for(const wall of CLASSIC_PERIMETER.walls){
  const [x1,z1]=wall.a,[x2,z2]=wall.b,r=radius+.45;
  if(segmentCircle(a,b,x1,z1,r)||segmentCircle(a,b,x2,z2,r)||
   (x1===x2?segmentRect(a,b,x1-r,x1+r,Math.min(z1,z2),Math.max(z1,z2)):
    segmentRect(a,b,Math.min(x1,x2),Math.max(x1,x2),z1-r,z1+r)))return false;
 }
 for(const building of OAKREST_BUILDINGS){
  const p=localBuildingPosition(building,a.x,a.z),q=localBuildingPosition(building,b.x,b.z);
  const hx=building.w/2,hz=building.d/2,t=.22+radius,door=1.4-radius;
  if(segmentRect(p,q,-hx-t,hx+t,-hz-t,-hz+t)||
   segmentRect(p,q,-hx-t,-hx+t,-hz-t,hz+t)||
   segmentRect(p,q,hx-t,hx+t,-hz-t,hz+t)||
   segmentRect(p,q,-hx-t,-door,hz-t,hz+t)||
   segmentRect(p,q,door,hx+t,hz-t,hz+t))return false;
 }
 return true;
}
const CELL=1.25, MOVES=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const snap=n=>Math.round(n/CELL);
const nodeAt=(ix,iz)=>({x:ix*CELL,z:iz*CELL});
const code=(ix,iz)=>ix+','+iz;
// A binary heap avoids scanning the entire frontier on every expansion.
function pathFrontier(){
 const heap=[];
 return {get size(){return heap.length;},push(node){
  let i=heap.length;heap.push(node);
  while(i>0){const parent=(i-1)>>1;if(heap[parent].f<=node.f)break;
   heap[i]=heap[parent];i=parent;}heap[i]=node;
 },pop(){
  const first=heap[0],last=heap.pop();
  if(heap.length){let i=0;
   while(i*2+1<heap.length){let child=i*2+1;
    if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;
    if(last.f<=heap[child].f)break;heap[i]=heap[child];i=child;
   }heap[i]=last;
  }return first;
 }};
}
/** Bounded 8-way A*. Both endpoints connect through verified clear segments.
 * Collision caches belong to this query, so changed world obstacles cannot
 * leave stale routes in future calls. No partial paths are reported as success. */
export function findClassicPath(start,end){
 if(!start||!end||![start.x,start.z,end.x,end.z].every(Number.isFinite)||solidAt(start.x,start.z))return [];
 let goal={x:clamp(end.x,CLASSIC_LIMITS.minX+1,CLASSIC_LIMITS.maxX-1),z:clamp(end.z,CLASSIC_LIMITS.minZ+1,CLASSIC_LIMITS.maxZ-1)};
 if(solidAt(goal.x,goal.z)){
  let near=null;
  for(let radius=CELL;radius<=5*CELL&&!near;radius+=CELL)for(let a=0;a<24;a++){
   const p={x:goal.x+Math.cos(a*Math.PI/12)*radius,z:goal.z+Math.sin(a*Math.PI/12)*radius};
   if(!solidAt(p.x,p.z)){near=p;break;}
  }
  if(!near)return [];
  goal=near;
 }
 if(clearClassicLine(start,goal))return [goal];
 const sx=snap(start.x),sz=snap(start.z);
 const h=(x,z)=>Math.hypot(x*CELL-goal.x,z*CELL-goal.z)/CELL;
 const records=new Map(),closed=new Set(),occupancy=new Map(),edges=new Map(),open=pathFrontier();
 const blocked=(x,z)=>{
  const key=code(x,z);if(!occupancy.has(key))occupancy.set(key,solidAt(x*CELL,z*CELL));
  return occupancy.get(key);
 };
 const clearEdge=(from,to)=>{
  const a=code(from.x,from.z),b=code(to.x,to.z),key=a<b?a+'|'+b:b+'|'+a;
  if(!edges.has(key))edges.set(key,clearClassicLine(nodeAt(from.x,from.z),nodeAt(to.x,to.z)));
  return edges.get(key);
 };
 // Rounding to one grid cell can place a valid player on the other side of a
 // facade. Seed only neighbours that are reachable from the REAL position.
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
  const x=sx+dx,z=sz+dz,point=nodeAt(x,z);
  if(blocked(x,z)||!clearClassicLine(start,point))continue;
  const g=Math.hypot(point.x-start.x,point.z-start.z)/CELL;
  const node={x,z,g,f:g+h(x,z),parent:null};records.set(code(x,z),node);open.push(node);
 }
 let found=null,iterations=0;
 while(open.size&&iterations++<8000){
  const current=open.pop(),currentKey=code(current.x,current.z);
  if(closed.has(currentKey)||records.get(currentKey)!==current)continue;
  closed.add(currentKey);
  // Being near the goal is insufficient: a wall may lie in the final metre.
  if(h(current.x,current.z)<=2&&clearClassicLine(nodeAt(current.x,current.z),goal)){found=current;break;}
  for(const [dx,dz] of MOVES){
   const x=current.x+dx,z=current.z+dz,key=code(x,z);
   if(closed.has(key)||blocked(x,z))continue;
   if(dx&&dz&&(blocked(current.x+dx,current.z)||blocked(current.x,current.z+dz)))continue;
   if(!clearEdge(current,{x,z}))continue;
   const g=current.g+Math.hypot(dx,dz),old=records.get(key);
   if(!old||g<old.g){const node={x,z,g,f:g+h(x,z),parent:current};records.set(key,node);open.push(node);}
  }
 }
 if(!found)return [];
 const path=[];
 for(let node=found;node;node=node.parent)path.push(nodeAt(node.x,node.z));
 path.reverse();path.push(goal);
 const compact=[];let cursor=start;
 for(let i=0;i<path.length;){
  let next=i;
  for(let j=path.length-1;j>i;j--)if(clearClassicLine(cursor,path[j])){next=j;break;}
  if(!clearClassicLine(cursor,path[next]))return [];
  compact.push(path[next]);cursor=path[next];i=next+1;
 }
 return compact;
}
/** Direction index 0 faces the viewer; 4 faces away; rest turn clockwise. */
export function spriteDirection(facingX,facingZ,cameraOffset=CLASSIC_CAMERA){
 const length=Math.hypot(facingX,facingZ)||1;
 const vx=cameraOffset.x??cameraOffset.offsetX,vz=cameraOffset.z??cameraOffset.offsetZ;
 const cameraLength=Math.hypot(vx,vz),front=(facingX*vx+facingZ*vz)/(length*cameraLength);
 const side=(facingX*vz-facingZ*vx)/(length*cameraLength);
 return (Math.round(Math.atan2(side,front)*4/Math.PI)+8)%8;
}
export function presentationSnapshot(save,style,position){
 const s=save||defaultSave();
 const chosen=STYLE_ORDER.includes(style)?style:'melee';
 const itemSlots=s.equipment?.[chosen]||{};
 const worn=Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot.id,
  slot.id==='weapon'?s.gear?.[chosen]||'none':slot.id==='chest'?s.armour?.[chosen]||'none':slot.id==='offhand'&&!allowsOffhand(s,chosen)?null:itemSlots[slot.id]||null]));
 return {style:chosen,styleLevel:levelFromXp(s.xp?.[chosen]||0).level,
  combatLevel:combatLevelFromXp(s.xp||{}),vitality:levelFromXp(s.xp?.vitality||0).level,
  weaponName:LOADOUTS[chosen]?.[s.gear?.[chosen]]?.title||'Unarmed',
  worn,position:{x:position.x,z:position.z},indoors:occupantBuilding(position.x,position.z)?.id||null};
}
export const classicStreetPaths=CLASSIC_ROADS;
