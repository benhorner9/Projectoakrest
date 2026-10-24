import {ADVENTURE_PATHS,ADVENTURE_WALLS,ADVENTURE_TREES,ADVENTURE_TARGETS} from './adventure-content.js';
/** Oakrest Classic minimap: one canonical village model, no secondary scene.
 * Roads, footprints and service anchors come from the gameplay modules.
 */
import {OAKREST_BUILDINGS,OAKREST_WELL,localBuildingPosition} from './town-layout.js';
import {CLASSIC_ROADS,CLASSIC_PERIMETER,CLASSIC_DISTRICTS} from './classic-town-plan.js';
import {OAKREST_SERVICES,OAKREST_GROVES,OAKREST_NOTICES} from './town-services.js';
import {CLASSIC_LIMITS,CLASSIC_TREES,classicScreenBasis} from './classic-presentation.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CLASSIC_MAP_FEATURES=Object.freeze({
 bounds:CLASSIC_LIMITS,buildings:OAKREST_BUILDINGS,roads:CLASSIC_ROADS,
 walls:CLASSIC_PERIMETER.walls,gates:CLASSIC_PERIMETER.gates,districts:CLASSIC_DISTRICTS,
 trees:[...CLASSIC_TREES,...OAKREST_GROVES],well:OAKREST_WELL,
 services:OAKREST_SERVICES,notices:OAKREST_NOTICES,adventure:ADVENTURE_TARGETS
});
/** Match the ACTUAL control orientation on the angled 2.5D game view.
 * The large world map is north-up; the corner minimap is camera-aligned.
 */
export function worldToMinimap(point,centre,size=160,scale=3.45,cameraOffset){
 const {right,up}=classicScreenBasis(cameraOffset);
 const dx=point.x-centre.x,dz=point.z-centre.z;
 return {x:size/2+(dx*right.x+dz*right.z)*scale,
  y:size/2-(dx*up.x+dz*up.z)*scale};
}
export function minimapToWorld(point,centre,size=160,scale=3.45,cameraOffset){
 const {right,up}=classicScreenBasis(cameraOffset);
 const horizontal=(point.x-size/2)/scale,vertical=(size/2-point.y)/scale;
 return {x:centre.x+horizontal*right.x+vertical*up.x,
  z:centre.z+horizontal*right.z+vertical*up.z};
}
export function fullMapTransform(width,height,pad=16){
 const b=CLASSIC_LIMITS,spanX=b.maxX-b.minX,spanZ=b.maxZ-b.minZ;
 const scale=Math.min((width-2*pad)/spanX,(height-2*pad)/spanZ);
 return {scale,x:(width-spanX*scale)/2,y:(height-spanZ*scale)/2};
}
export function fullMapWorld(point,width,height){
 const t=fullMapTransform(width,height),b=CLASSIC_LIMITS;
 return {x:b.minX+(point.x-t.x)/t.scale,z:b.maxZ-(point.y-t.y)/t.scale};
}
function terrain(ctx,project,width,height,scale){
 ctx.fillStyle='#6b8664';ctx.fillRect(0,0,width,height);
 ctx.lineCap='round';ctx.lineJoin='round';
 ctx.strokeStyle='#b6a27d';ctx.lineWidth=Math.max(2,5.4*scale);
 for(const road of [...CLASSIC_ROADS,...ADVENTURE_PATHS]){
  ctx.beginPath();road.forEach(([x,z],i)=>{
   const p=project({x,z});i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);
  });ctx.stroke();
 }
 // Draw the very same collidable stone perimeter and the open gateways.
 ctx.strokeStyle='#5b6d64';ctx.lineCap='butt';ctx.lineWidth=Math.max(2,1.2*scale);
 for(const wall of CLASSIC_PERIMETER.walls){
  const a=project({x:wall.a[0],z:wall.a[1]}),b=project({x:wall.b[0],z:wall.b[1]});
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 for(const w of ADVENTURE_WALLS){const p=project(w);ctx.fillStyle='#53645b';ctx.fillRect(p.x-w.w*scale/2,p.y-w.d*scale/2,w.w*scale,Math.max(1,w.d*scale));}
 for(const gate of CLASSIC_PERIMETER.gates){
  const at=project(gate);
  ctx.fillStyle='#f2d49a';ctx.beginPath();ctx.arc(at.x,at.y,Math.max(2,scale*.48),0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle='#a59a79';
 const well=project(OAKREST_WELL);
 ctx.beginPath();ctx.arc(well.x,well.y,OAKREST_WELL.courtyardRadius*scale,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#798a6e';
 for(const t of [...CLASSIC_TREES,...ADVENTURE_TREES]){
  const p=project(t);
  ctx.fillStyle='#4e7351';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,t.r*scale),0,Math.PI*2);ctx.fill();
 }
 for(const t of OAKREST_GROVES){
  const p=project(t);
  ctx.fillStyle='#456c46';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(3,1.25*scale),0,Math.PI*2);ctx.fill();
 }
 for(const b of OAKREST_BUILDINGS){
  const p=project(b),lateral=b.face==='east'||b.face==='west';
  const w=(lateral?b.d:b.w)*scale,d=(lateral?b.w:b.d)*scale;
  ctx.fillStyle=b.kind==='bank'?'#718992':b.kind==='store'?'#9a7959':
   b.kind==='forester'?'#697c4d':b.kind==='trade'?'#8c7893':'#99866f';
  ctx.strokeStyle='#4d4b3b';ctx.lineWidth=Math.max(1,scale*.2);
  ctx.fillRect(p.x-w/2,p.y-d/2,w,d);ctx.strokeRect(p.x-w/2,p.y-d/2,w,d);
 }
 const wp=project(OAKREST_WELL);
 ctx.fillStyle='#647e83';ctx.beginPath();ctx.arc(wp.x,wp.y,1.8*scale,0,Math.PI*2);ctx.fill();
}
function marker(ctx,p,kind,full){
 const color={bank:'#97d6e6',store:'#f8cf82',skill:'#b7d38c',
  trade:'#d5baed'}[kind]||'#e8dfae';
 const r=full?9:7;
 ctx.fillStyle='#21382e';ctx.beginPath();ctx.arc(p.x,p.y,r+2,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#253a31';
 ctx.font='bold '+(full?12:10)+'px system-ui';
 ctx.fillText(({bank:'B',store:'S',skill:'F',trade:'T'})[kind]||'•',p.x,p.y+1);
}
function playerArrow(ctx,at,facing,large=false,cameraOffset){
 const basis=large?{right:{x:1,z:0},up:{x:0,z:1}}:classicScreenBasis(cameraOffset);
 const horizontal=(facing.x||0)*basis.right.x+(facing.z||0)*basis.right.z;
 const vertical=(facing.x||0)*basis.up.x+(facing.z||0)*basis.up.z;
 const angle=Math.atan2(horizontal,vertical);
 ctx.save();ctx.translate(at.x,at.y);ctx.rotate(angle);
 ctx.shadowColor='#0d2b20';ctx.shadowBlur=large?10:6;
 ctx.fillStyle='#fff0b9';ctx.strokeStyle='#2b3d2b';ctx.lineWidth=2;
 const r=large?13:10;
 ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.63,r*.7);ctx.lineTo(0,r*.3);
 ctx.lineTo(-r*.63,r*.7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function markers(ctx,project,{player,facing,destination,monsters=[],drops=[],cameraOffset,objective},full=false){
 for(const s of OAKREST_SERVICES){
  const p=project({x:s.x,z:s.z});
  if(p.x<6||p.y<6||p.x>ctx.canvas.width-6||p.y>ctx.canvas.height-6)continue;
  marker(ctx,p,s.kind,full);
 }
 for(const t of ADVENTURE_TARGETS){const p=project(t);ctx.fillStyle='#d9c18b';ctx.fillRect(p.x-2,p.y-2,4,4);if(full){ctx.font='9px system-ui';ctx.fillText(t.name.split(' · ')[0],p.x+4,p.y-4);}}
 if(objective){const p=project(objective);ctx.strokeStyle='#fff0ab';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.stroke();}
 if(destination&&Number.isFinite(destination.x)&&Number.isFinite(destination.z)){
  const p=project(destination);
  ctx.strokeStyle='#ffdc88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(p.x-12,p.y);ctx.lineTo(p.x+12,p.y);ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x,p.y+12);ctx.stroke();
 }
 for(const monster of monsters){
  if(monster.dead||monster.hidden||monster.hp<=0)continue;
  const p=project(monster);
  ctx.fillStyle='#ca796b';ctx.beginPath();ctx.arc(p.x,p.y,full?3:2,0,Math.PI*2);ctx.fill();
 }
 for(const drop of drops){
  const p=project(drop);ctx.fillStyle='#f4ce7d';ctx.fillRect(p.x-2,p.y-2,4,4);
 }
 playerArrow(ctx,project(player),facing,full,cameraOffset);
}
export function createClassicMinimap({canvas,fullCanvas,onDestination=()=>{}}){
 const ctx=canvas.getContext('2d'),full=fullCanvas.getContext('2d');
 if(!ctx||!full)throw Error('Canvas minimap is unavailable');
 const staticMap=document.createElement('canvas');staticMap.width=720;staticMap.height=800;
 const mapCtx=staticMap.getContext('2d');
 const t=fullMapTransform(staticMap.width,staticMap.height);
 const pos=p=>({x:t.x+(p.x-CLASSIC_LIMITS.minX)*t.scale,
  y:t.y+(CLASSIC_LIMITS.maxZ-p.z)*t.scale});
 terrain(mapCtx,pos,staticMap.width,staticMap.height,t.scale);
 let zoom=3.45,lastFrame=-Infinity,last=null,expanded=false;
 const sourceAt=(p)=>pos(p);
 const drawSmall=(data)=>{
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,canvas.width/2-2,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#647d5f';ctx.fillRect(0,0,canvas.width,canvas.height);
  const centre=sourceAt(data.player),size=canvas.width,ratio=zoom/t.scale;
  // Use exactly the same right/up vectors as WASD and the touch joystick.
  // Canvas source coordinates are east-right/north-up, and the transform
  // rotates/mirrors the cached village into the camera's actual orientation.
  const {right,up}=classicScreenBasis(data.cameraOffset);
  const a=right.x*ratio,b=-up.x*ratio,c=-right.z*ratio,d=up.z*ratio;
  ctx.save();
  ctx.transform(a,b,c,d,
   size/2-a*centre.x-c*centre.y,
   size/2-b*centre.x-d*centre.y);
  ctx.drawImage(staticMap,0,0);
  ctx.restore();
  const point=p=>worldToMinimap(p,data.player,size,zoom,data.cameraOffset);
  markers(ctx,point,data);
  ctx.restore();
  ctx.strokeStyle='#c3a779';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(size/2,size/2,size/2-2,0,Math.PI*2);ctx.stroke();
  ctx.font='bold 12px system-ui';ctx.fillStyle='#fff0bd';ctx.textAlign='center';
  const north=worldToMinimap({x:data.player.x,z:data.player.z+1},
   data.player,size,size/2-14,data.cameraOffset);
  ctx.fillText('N',north.x,north.y);
 };
 const drawLarge=(data)=>{
  const width=fullCanvas.width,height=fullCanvas.height;
  const tr=fullMapTransform(width,height);
  const p=point=>({x:tr.x+(point.x-CLASSIC_LIMITS.minX)*tr.scale,
   y:tr.y+(CLASSIC_LIMITS.maxZ-point.z)*tr.scale});
  terrain(full,p,width,height,tr.scale);
  markers(full,p,data,true);
  full.font='bold 15px Georgia';full.fillStyle='#f4e5bb';full.textAlign='center';
  full.fillText('NORTH ↑',width/2,20);
 };
 const update=(data,now=0,force=false)=>{
  last=data;
  if(!force&&now-lastFrame<.12)return;
  lastFrame=now;drawSmall(data);
  if(expanded)drawLarge(data);
 };
 const setExpanded=x=>{expanded=!!x;if(expanded&&last)drawLarge(last);};
 const setZoom=v=>{zoom=clamp(v,2.2,6);if(last)drawSmall(last);return zoom;};
 fullCanvas.addEventListener('click',e=>{
  const r=fullCanvas.getBoundingClientRect();
  const point=fullMapWorld({x:(e.clientX-r.left)*fullCanvas.width/r.width,
   y:(e.clientY-r.top)*fullCanvas.height/r.height},fullCanvas.width,fullCanvas.height);
  if(point.x>=CLASSIC_LIMITS.minX&&point.x<=CLASSIC_LIMITS.maxX&&
     point.z>=CLASSIC_LIMITS.minZ&&point.z<=CLASSIC_LIMITS.maxZ)onDestination(point);
 });
 return {update,setExpanded,setZoom,zoom:()=>zoom,features:()=>CLASSIC_MAP_FEATURES,
  coordinates:()=>last?.player};
}
