import {REGIONAL_HUBS,REGIONAL_ROADS,REGIONAL_CAMPS,REGIONAL_GATHERING} from './classic-world-expansion.js';
import {OAKREST_PALETTE,organicRoadPolygons,plazaOutline} from './classic-art-direction.js';
import {ADVENTURE_PATHS,ADVENTURE_WALLS,ADVENTURE_TREES,ADVENTURE_TARGETS,ADVENTURE_SCENERY,DUNGEON_ROOMS} from './adventure-content.js';
/** Oakrest Classic minimap: one canonical village model, no secondary scene.
 * Roads, footprints and service anchors come from the gameplay modules.
 */
import {OAKREST_BUILDINGS,OAKREST_WELL,roadQuads} from './town-layout.js';
import {CLASSIC_ROADS,CLASSIC_PERIMETER,CLASSIC_DISTRICTS,CLASSIC_PLAZAS,CLASSIC_STALLS,classicRoofColour} from './classic-town-plan.js';
import {OAKREST_SERVICES,OAKREST_GROVES,OAKREST_NOTICES} from './town-services.js';
import {CLASSIC_LIMITS,CLASSIC_TREES,classicScreenBasis} from './classic-presentation.js';
import {QUEST_GIVER_IDS} from './classic-quest-indicators.js';
import {CLASSIC_WORLD_ZONES,findWorldZone} from './classic-world-atlas.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CLASSIC_MAP_FEATURES=Object.freeze({
 bounds:CLASSIC_LIMITS,buildings:OAKREST_BUILDINGS,roads:CLASSIC_ROADS,
 walls:CLASSIC_PERIMETER.walls,gates:CLASSIC_PERIMETER.gates,districts:CLASSIC_DISTRICTS,
 trees:[...CLASSIC_TREES,...OAKREST_GROVES],well:OAKREST_WELL,
 services:OAKREST_SERVICES,notices:OAKREST_NOTICES,adventure:ADVENTURE_TARGETS,
 scenery:ADVENTURE_SCENERY,plazas:CLASSIC_PLAZAS,stalls:CLASSIC_STALLS,questGivers:QUEST_GIVER_IDS,
 zones:CLASSIC_WORLD_ZONES,regionalHubs:REGIONAL_HUBS,regionalRoads:REGIONAL_ROADS,
 regionalCamps:REGIONAL_CAMPS,regionalGathering:REGIONAL_GATHERING
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
/** Overhead cartography derived from the same geometry declarations as the world.
 * No alternate village layout, invented path, or scenic landmarks.
 */
function rect(ctx,project,shape,scale,color){
 const p=project(shape);
 ctx.fillStyle=color||shape.color;
 ctx.fillRect(p.x-shape.w*scale/2,p.y-shape.d*scale/2,shape.w*scale,shape.d*scale);
}
function polygon(ctx,project,corners,color){
 ctx.beginPath();
 corners.forEach(([x,z],i)=>{const p=project({x,z});i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});
 ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function terrain(ctx,project,width,height,scale){
 ctx.fillStyle=OAKREST_PALETTE.meadow;ctx.fillRect(0,0,width,height);
 // Map biome patches, city footprints and roads are derived from the same
 // regional registry as the actual Three.js landscape (not background art).
 for(const hub of REGIONAL_HUBS){
  if(hub.existing)continue;
  const at=project(hub),radius=(hub.kind==='city'?68:hub.kind==='farm'?50:56)*scale;
  ctx.beginPath();ctx.arc(at.x,at.y,radius,0,Math.PI*2);
  ctx.fillStyle=({forest:'#49734f',marsh:'#52755d',river:'#70916e',
   snow:'#afc4bd',highlands:'#777d70',coast:'#8ca68b',farmland:'#a19b69'})[hub.biome]||'#75906a';
  ctx.fill();
 }
 rect(ctx,project,{x:0,z:38,w:126,d:154},scale,OAKREST_PALETTE.meadow);
 for(const [band,colour] of [[7.1,'#617953'],[5.5,'#85765c'],[3.7,'#b8a07a']]){
  ctx.strokeStyle=colour;ctx.lineWidth=Math.max(.6,band*scale);ctx.lineJoin='round';ctx.lineCap='round';
  for(const road of REGIONAL_ROADS){
   ctx.beginPath();
   road.displayPoints.forEach((p,i)=>{
    const point=project({x:p[0],z:p[1]});
    if(i)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);
   });
   ctx.stroke();
  }
 }
 for(const ground of ADVENTURE_SCENERY.ground)rect(ctx,project,ground,scale);
 for(const [i,room] of DUNGEON_ROOMS.entries()){
  rect(ctx,project,{x:0,z:(room.minZ+room.maxZ)/2,w:33,d:room.maxZ-room.minZ},
   scale,ADVENTURE_SCENERY.roomColours[i]);
 }
 // Town cartography uses the same continuous, tapered route geometry as the 2.5D world.
 for(const [width,colour] of [[5.2,OAKREST_PALETTE.verge],
  [4.35,OAKREST_PALETTE.earth],[3.35,OAKREST_PALETTE.trail],
  [1.85,OAKREST_PALETTE.path]])
  for(const quad of organicRoadPolygons(CLASSIC_ROADS,width))polygon(ctx,project,quad,colour);
 // Mirror the live 3D trail layers rather than a jagged centreline stroke.
 // Each layer uses the same sampled outdoor routes and polygon generator.
 const wild=ADVENTURE_PATHS.filter(path=>path[0][1]<195);
 const hollow=ADVENTURE_PATHS.filter(path=>path[0][1]>=195);
 for(const [paths,trailWidth,colour] of [
  [wild,6.4,OAKREST_PALETTE.verge],
  [wild,5.1,OAKREST_PALETTE.earth],
  [wild,3.55,OAKREST_PALETTE.path],
  [hollow,4.15,'#697671'],
  [hollow,2.7,'#8d9689']])
  for(const quad of organicRoadPolygons(paths,trailWidth))polygon(ctx,project,quad,colour);
 for(const plaza of CLASSIC_PLAZAS){
  polygon(ctx,project,plazaOutline(plaza),OAKREST_PALETTE.earth);
  polygon(ctx,project,plazaOutline({...plaza,w:plaza.w*.82,d:plaza.d*.82}),OAKREST_PALETTE.packed);
 }
 for(const creek of ADVENTURE_SCENERY.creek)rect(ctx,project,creek,scale,creek.color);
 // Stone defensive walls and separate dungeon corridors have real openings.
 ctx.strokeStyle='#879083';ctx.lineCap='butt';ctx.lineWidth=Math.max(1,.9*scale);
 for(const wall of CLASSIC_PERIMETER.walls){
  const a=project({x:wall.a[0],z:wall.a[1]}),b=project({x:wall.b[0],z:wall.b[1]});
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 for(const wall of ADVENTURE_WALLS)rect(ctx,project,wall,scale,'#65716b');
 for(const gate of CLASSIC_PERIMETER.gates){
  const p=project(gate),r=1.3*scale;
  ctx.fillStyle='#879083';ctx.fillRect(p.x-r,p.y-r,2*r,2*r);
  ctx.fillStyle='#b6a07e';
  if(gate.orientation==='horizontal')ctx.fillRect(p.x-4.5*scale,p.y-.45*scale,9*scale,.9*scale);
  else ctx.fillRect(p.x-.45*scale,p.y-4.5*scale,.9*scale,9*scale);
 }
 // The courtyard and well physically occupy these same coordinates.
 const well=project(OAKREST_WELL);
 ctx.fillStyle='#abb1a0';ctx.beginPath();ctx.arc(well.x,well.y,OAKREST_WELL.courtyardRadius*scale,0,Math.PI*2);ctx.fill();
 const townTrees=[...CLASSIC_TREES.map((t,i)=>({...t,canopy:2.7*(.85+.09*(i%4))})),
  ...OAKREST_GROVES.map(t=>({...t,canopy:2.7*1.02}))];
 for(const t of [...townTrees,...ADVENTURE_TREES.map(t=>({...t,canopy:2.7*.9}))]){
  const p=project(t),radius=Math.max(.65,t.canopy*scale);
  ctx.fillStyle=t.z>125?'#385743':'#527755';
  ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#708f65';ctx.beginPath();ctx.arc(p.x-radius*.22,p.y-radius*.24,radius*.35,0,Math.PI*2);ctx.fill();
 }
 for(const [i,b] of OAKREST_BUILDINGS.entries()){
  const lateral=b.face==='east'||b.face==='west',p=project(b);
  const w=(lateral?b.d:b.w)*scale,d=(lateral?b.w:b.d)*scale;
  ctx.fillStyle='#d7c5a1';ctx.fillRect(p.x-w/2,p.y-d/2,w,d);
  // Gabled Classic roofs: both halves and their ridge match the chosen roof material.
  ctx.fillStyle=classicRoofColour(b,i);ctx.fillRect(p.x-w/2,p.y-d/2,w,d);
  ctx.strokeStyle='#57432f';ctx.lineWidth=Math.max(.7,.16*scale);
  ctx.strokeRect(p.x-w/2,p.y-d/2,w,d);
  ctx.beginPath();
  // Roof ridges follow the building's actual rotated local X axis.
  if(lateral){ctx.moveTo(p.x,p.y-d/2);ctx.lineTo(p.x,p.y+d/2);}
  else {ctx.moveTo(p.x-w/2,p.y);ctx.lineTo(p.x+w/2,p.y);}
  ctx.stroke();
  // Dark entrance notch is on the same front face as the real doorway.
  ctx.fillStyle='#57432f';
  const door=3.1*scale,edge=.32*scale;
  if(b.face==='east')ctx.fillRect(p.x+w/2-edge,p.y-door/2,edge,door);
  else if(b.face==='west')ctx.fillRect(p.x-w/2,p.y-door/2,edge,door);
  else if(b.face==='north')ctx.fillRect(p.x-door/2,p.y+d/2-edge,door,edge);
  else ctx.fillRect(p.x-door/2,p.y-d/2,door,edge);
 }
 // The actual three market stalls, northwest wagon, outpost tent and fallen logs.
 for(const stall of CLASSIC_STALLS)rect(ctx,project,{...stall,w:4.65,d:3.2},scale,stall.roof);
 rect(ctx,project,ADVENTURE_SCENERY.wagon,scale,'#735c43');
 for(const [x,z] of ADVENTURE_SCENERY.logs)rect(ctx,project,{x,z,w:5,d:1},scale,'#4e4d3c');
 const camp=project(ADVENTURE_SCENERY.camp);
 ctx.fillStyle='#aa9b7c';ctx.beginPath();ctx.arc(camp.x,camp.y,2.5*scale,0,Math.PI*2);ctx.fill();
 const wp=project(OAKREST_WELL);
 ctx.fillStyle='#667b7c';ctx.beginPath();ctx.arc(wp.x,wp.y,1.65*scale,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#9b675e';ctx.beginPath();ctx.arc(wp.x,wp.y,.9*scale,0,Math.PI*2);ctx.fill();
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
function regionalMarkers(ctx,project,full=false){
 const c=ctx.canvas;
 const within=point=>point.x>=9&&point.x<=c.width-9&&point.y>=9&&point.y<=c.height-9;
 for(const hub of REGIONAL_HUBS){
  const p=project(hub);if(!within(p))continue;
  const radius=hub.kind==='city'?full?6.5:4.5:hub.kind==='town'?full?5:3.5:full?4:3;
  ctx.fillStyle=hub.kind==='city'?'#ffe2a2':hub.kind==='town'?'#d3e2a7':'#ebbc75';
  ctx.strokeStyle='#27382d';ctx.lineWidth=full?1.6:1.1;
  ctx.beginPath();
  if(hub.kind==='city')ctx.arc(p.x,p.y,radius,0,Math.PI*2);
  else ctx.rect(p.x-radius,p.y-radius,radius*2,radius*2);
  ctx.fill();ctx.stroke();
  if(full){
   ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='bold 11px Georgia,serif';
   ctx.lineWidth=2.8;ctx.strokeStyle='#1b2c25';ctx.strokeText(hub.name,p.x,p.y-radius-5,105);
   ctx.fillStyle='#fff0ca';ctx.fillText(hub.name,p.x,p.y-radius-5,105);
  }
 }
 if(!full)return;
 for(const site of REGIONAL_CAMPS){
  const p=project(site);if(!within(p))continue;
  ctx.fillStyle=site.live?'#d28e6e':'#8f9691';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();
  ctx.font='9px system-ui';ctx.textBaseline='top';ctx.textAlign='center';
  ctx.fillStyle='#f2dfc6';ctx.fillText(site.name,p.x,p.y+5,95);
 }
 for(const site of REGIONAL_GATHERING){
  if(site.skill==='farming')continue; // Same site as its named farm.
  const p=project(site);if(!within(p))continue;
  ctx.fillStyle=site.live?'#d8e6a4':'#9da69a';
  ctx.fillRect(p.x-2.5,p.y-2.5,5,5);
  ctx.font='9px system-ui';ctx.textBaseline='bottom';ctx.textAlign='center';
  ctx.fillStyle=site.live?'#e3eec2':'#bdc7bc';
  ctx.fillText(site.name,p.x,p.y-5,95);
 }
}
function markers(ctx,project,{player,facing,destination,monsters=[],drops=[],cameraOffset,objective,questGivers=[],adventure},full=false){
 for(const s of OAKREST_SERVICES){
  const p=project({x:s.x,z:s.z});
  if(p.x<6||p.y<6||p.x>ctx.canvas.width-6||p.y>ctx.canvas.height-6)continue;
  marker(ctx,p,s.kind,full);
 }
 for(const t of ADVENTURE_TARGETS){const p=project(t);ctx.fillStyle='#d9c18b';ctx.fillRect(p.x-2,p.y-2,4,4);if(full){ctx.font='9px system-ui';ctx.fillText(t.name.split(' · ')[0],p.x+4,p.y-4);}}
 // Dungeon ward gates disappear on the map when opened in the live world.
 for(const [i,z] of [241,269,297].entries()){
  if(adventure?.run?.wards?.includes(i))continue;
  const left=project({x:-3,z}),right=project({x:3,z});
  ctx.strokeStyle='#769b91';ctx.lineWidth=Math.max(2,full?4:3);
  ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(right.x,right.y);ctx.stroke();
 }
 // Quest icons share the same state as glowing NPC beacons (not generic golden dots).
 for(const giver of questGivers){
  const p=project(giver);
  if(p.x<8||p.y<8||p.x>ctx.canvas.width-8||p.y>ctx.canvas.height-8)continue;
  const colour=giver.status==='ready'?'#8cefcf':'#ffe59a';
  ctx.save();ctx.shadowColor=colour;ctx.shadowBlur=7;
  ctx.beginPath();ctx.arc(p.x,p.y,full?7:6,0,Math.PI*2);
  ctx.fillStyle='#273c32';ctx.fill();ctx.strokeStyle=colour;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=colour;ctx.font='bold '+(full?12:11)+'px Georgia,serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(giver.status==='ready'?'✓':'!',p.x,p.y+.5);
  ctx.restore();
 }
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
 regionalMarkers(ctx,project,full);
 playerArrow(ctx,project(player),facing,full,cameraOffset);
}
export function createClassicMinimap({canvas,fullCanvas,onDestination=()=>{},
 onInspect=()=>{},isInspecting=()=>false,selectedZoneId=()=>null}){
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
  // Zone outlines are the same canonical coordinates used by the Inspector,
  // not a separate drawing-only set of fictional map pins. Selecting them
  // changes cartographic highlighting only, never gameplay collision.
  const selected=findWorldZone(selectedZoneId());
  for(const zone of CLASSIC_WORLD_ZONES){
   const b=zone.bounds,left=p({x:b.minX,z:b.maxZ}),right=p({x:b.maxX,z:b.minZ});
   const x=left.x,y=left.y,w=right.x-x,h=right.y-y;
   if(selected?.id===zone.id){
    full.fillStyle='#f2d28b2c';full.fillRect(x,y,w,h);
    full.strokeStyle='#ffe4a0';full.lineWidth=2;
   }else{
    full.strokeStyle='#e6d29a70';full.lineWidth=.75;
   }
   full.strokeRect(x,y,w,h);
   if(w>36&&h>16&&(zone.id.startsWith('OAK-WD')||zone.id==='OAK-VL-001')){
    full.font='bold 9px system-ui';full.textAlign='center';full.textBaseline='middle';
    full.fillStyle=selected?.id===zone.id?'#fff2c5':'#f0e1b4';
    full.fillText(zone.name,x+w/2,y+h/2,Math.max(25,w-3));
   }
  }
  markers(full,p,data,true);
  full.font='bold 15px Georgia';full.fillStyle='#f4e5bb';full.textAlign='center';
  full.fillText('NORTH ↑',width/2,20);
   full.font='10px system-ui';full.fillStyle='#ebe0bd';
   full.fillText('Gold: settlements  ·  Red: active camps  ·  Green: gathering  ·  Grey: future content',
    width/2,height-7,Math.max(100,width-12));
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
     point.z>=CLASSIC_LIMITS.minZ&&point.z<=CLASSIC_LIMITS.maxZ){
    if(isInspecting()){onInspect(point);return;}
    onDestination(point);
  }
 });
 return {update,setExpanded,setZoom,redraw:()=>{if(last){drawSmall(last);if(expanded)drawLarge(last);}},
  zoom:()=>zoom,features:()=>CLASSIC_MAP_FEATURES,
  coordinates:()=>last?.player};
}
