/** Oakrest Block 2: renderer-free 2.5D camera, navigation and presentation data.
 * Reuses canonical world coordinates and never mutates character saves.
 */
import {OAKREST_BUILDINGS,OAKREST_WELL,OAKREST_PATHS,localBuildingPosition} from './town-layout.js';
import {STYLE_ORDER,LOADOUTS,levelFromXp,combatLevelFromXp,defaultSave} from './rules.js';
import {EQUIPMENT_SLOTS} from './equipment-slots.js';

export const CLASSIC_CAMERA=Object.freeze({elevation:48,offsetX:27,offsetZ:35,viewHeight:32,minZoom:.78,maxZoom:1.48});
export const CLASSIC_LIMITS=Object.freeze({minX:-53,maxX:53,minZ:-24,maxZ:95});
export const CLASSIC_NPCS=Object.freeze([
 {id:'banker',name:'Banker',x:-26,z:14,role:'bank',colour:'#5b8190',message:'Your belongings are safe in Oakrest Bank. Banking transactions arrive in a later block.'},
 {id:'shopkeeper',name:'Shopkeeper',x:26,z:14,role:'shop',colour:'#ad8259',message:'Welcome to the General Store. Melee, Magic and Ranged starter equipment is stocked in the existing game.'},
 {id:'forester',name:'Forester',x:-25,z:46,role:'gathering',colour:'#7d995d',message:'The northern groves teach Woodcutting. Your existing skill progress is preserved.'},
 {id:'guard',name:'Village Guard',x:5,z:48,role:'guard',colour:'#a8695d',message:'The town is safe. Mosslings, boars and bandits wait beyond the greenbelt.'},
 {id:'villager',name:'Townsfolk',x:9,z:30,role:'citizen',colour:'#9781a5',message:'Oakrest is changing, but the same adventures are waiting.'}
]);
export const CLASSIC_TREES=Object.freeze(Array.from({length:70},(_,i)=>{
 const column=i%14,row=Math.floor(i/14);
 const x=-50+column*7.5+(row%2?2:0),z=-13+row*23+(column%3)*2;
 return {x,z,r:.85+(i%4)*.1};
}).filter(t=>Math.abs(t.x)>38||t.z>86||t.z< -12));

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
 if(Math.hypot(x-OAKREST_WELL.x,z-OAKREST_WELL.z)<OAKREST_WELL.r+radius)return true;
 for(const tree of CLASSIC_TREES)if(Math.hypot(x-tree.x,z-tree.z)<tree.r+radius)return true;
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
function clearLine(a,b){
 const d=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(d/.5);
 for(let i=1;i<=steps;i++)if(solidAt(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;
 return true;
}
const CELL=1.25, MOVES=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const snap=n=>Math.round(n/CELL);
const nodeAt=(ix,iz)=>({x:ix*CELL,z:iz*CELL});
const code=(ix,iz)=>ix+','+iz;
/** Bounded 8-way A*. Diagonals may not cut across collidable corners. */
export function findClassicPath(start,end){
 if(!start||!end||![start.x,start.z,end.x,end.z].every(Number.isFinite))return [];
 let goal={x:clamp(end.x,CLASSIC_LIMITS.minX+1,CLASSIC_LIMITS.maxX-1),z:clamp(end.z,CLASSIC_LIMITS.minZ+1,CLASSIC_LIMITS.maxZ-1)};
 if(solidAt(goal.x,goal.z)){
  let near=null;
  for(let radius=CELL;radius<=5*CELL;radius+=CELL)for(let a=0;a<24;a++){
   const p={x:goal.x+Math.cos(a*Math.PI/12)*radius,z:goal.z+Math.sin(a*Math.PI/12)*radius};
   if(!solidAt(p.x,p.z)&&(!near||radius<near.distance))near={...p,distance:radius};
  }
  if(!near)return [];
  goal={x:near.x,z:near.z};
 }
 if(clearLine(start,goal))return [goal];
 const sx=snap(start.x),sz=snap(start.z),gx=snap(goal.x),gz=snap(goal.z);
 const h=(x,z)=>Math.hypot(x-gx,z-gz);
 const startKey=code(sx,sz);
 const records=new Map([[startKey,{x:sx,z:sz,g:0,f:h(sx,sz),parent:null}]]);
 const open=new Set([startKey]),closed=new Set();
 let found=null,iterations=0;
 while(open.size&&iterations++<4200){
  let best=null,rank=Infinity;
  for(const key of open){const n=records.get(key);if(n.f<rank){rank=n.f;best=key;}}
  const current=records.get(best);open.delete(best);closed.add(best);
  if(h(current.x,current.z)<=1.3){found=current;break;}
  for(const [dx,dz] of MOVES){
   const x=current.x+dx,z=current.z+dz,key=code(x,z),point=nodeAt(x,z);
   if(closed.has(key)||solidAt(point.x,point.z))continue;
   if(dx&&dz&&(solidAt((current.x+dx)*CELL,current.z*CELL)||solidAt(current.x*CELL,(current.z+dz)*CELL)))continue;
   const g=current.g+Math.hypot(dx,dz),old=records.get(key);
   if(!old||g<old.g){records.set(key,{x,z,g,f:g+h(x,z),parent:best});open.add(key);}
  }
 }
 if(!found)return [];
 const path=[];
 let node=found;
 while(node?.parent){path.push(nodeAt(node.x,node.z));node=records.get(node.parent);}
 path.reverse();
 if(path.length&&clearLine(path[path.length-1],goal))path.push(goal);
 // Remove intermediate waypoints when direct movement is collision-free.
 const compact=[];let cursor=start;
 for(let i=0;i<path.length;){
  let next=i;
  for(let j=path.length-1;j>i;j--)if(clearLine(cursor,path[j])){next=j;break;}
  compact.push(path[next]);cursor=path[next];i=next+1;
 }
 return compact;
}
/** Direction index 0 faces the viewer; 4 faces away; rest turn clockwise. */
export function spriteDirection(facingX,facingZ){
 const length=Math.hypot(facingX,facingZ)||1;
 const vx=CLASSIC_CAMERA.offsetX, vz=CLASSIC_CAMERA.offsetZ;
 const cameraLength=Math.hypot(vx,vz),front=(facingX*vx+facingZ*vz)/(length*cameraLength);
 const side=(facingX*vz-facingZ*vx)/(length*cameraLength);
 return (Math.round(Math.atan2(side,front)*4/Math.PI)+8)%8;
}
export function presentationSnapshot(save,style,position){
 const s=save||defaultSave();
 const chosen=STYLE_ORDER.includes(style)?style:'melee';
 const itemSlots=s.equipment?.[chosen]||{};
 const worn=Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot.id,
  slot.id==='weapon'?s.gear?.[chosen]||'none':slot.id==='chest'?s.armour?.[chosen]||'none':itemSlots[slot.id]||null]));
 return {style:chosen,styleLevel:levelFromXp(s.xp?.[chosen]||0).level,
  combatLevel:combatLevelFromXp(s.xp||{}),vitality:levelFromXp(s.xp?.vitality||0).level,
  weaponName:LOADOUTS[chosen]?.[s.gear?.[chosen]]?.title||'Unarmed',
  worn,position:{x:position.x,z:position.z},indoors:occupantBuilding(position.x,position.z)?.id||null};
}
export const classicStreetPaths=OAKREST_PATHS;
