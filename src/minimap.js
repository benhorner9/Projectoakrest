/**
 * Lightweight top-right minimap for Oakrest.
 * North is always up (-Z in Greenwood coordinates); the player stays centred.
 * This is a 2D canvas overlay, not a second Three.js renderer or a second
 * world simulation. Roads/buildings reuse authoritative town layout data.
 */
import {OAKREST_BUILDINGS,OAKREST_PATHS,OAKREST_WELL,FACING} from './town-layout.js';

export const MINIMAP_SPAN=104; // World metres across the visible diameter.
export function mapPoint(x,z,playerX,playerZ,size=160,span=MINIMAP_SPAN){
  const scale=size/span;
  return {x:size/2+(x-playerX)*scale,y:size/2+(z-playerZ)*scale};
}
export function minimapArea(area,z){
  if(area==='tutorial')return 'FIRST STEPS';
  if(area==='realm')return 'PORTAL REALM';
  if(z<-44)return 'GREENWOOD';
  if(z<-13)return 'FOREST ROAD';
  return 'OAKREST TOWN';
}
export function isNearbyMinimapPoint(x,z,playerX,playerZ,span=MINIMAP_SPAN){
  return Math.abs(x-playerX)<span*.62&&Math.abs(z-playerZ)<span*.62;
}
function silhouette(ctx,x,y,r,color){
  ctx.fillStyle=color;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function drawForest(ctx,point,px,pz,size,span){
  // World-anchored decorative terrain. Deterministic positions do not swim
  // when the player moves. These dots never affect combat or collision.
  for(let xi=-8;xi<=8;xi++)for(let zi=-13;zi<=13;zi++){
    const x=xi*14+Math.sin(zi*13+xi*7)*4;
    const z=zi*13+Math.cos(xi*8-zi*4)*3;
    if(x>-45&&x<46&&z>-13&&z<92)continue;
    if(Math.abs(x)<6&&z< -13)continue;
    if(!isNearbyMinimapPoint(x,z,px,pz,span))continue;
    const p=point(x,z),r=(1.6+(Math.abs(xi*17+zi*9)%3)*.5)*size/span;
    silhouette(ctx,p.x,p.y,Math.max(.8,r),'#315444');
    silhouette(ctx,p.x-r*.23,p.y-r*.19,Math.max(.6,r*.63),'#4f7754');
  }
}
function drawRoad(ctx,point,route,width,scale,color){
  if(route.length<2)return;
  ctx.beginPath();
  const p=point(route[0][0],route[0][1]);ctx.moveTo(p.x,p.y);
  for(let i=1;i<route.length;i++){const q=point(route[i][0],route[i][1]);ctx.lineTo(q.x,q.y);}
  ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,width*scale);
  ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
}
function drawBuildings(ctx,point,scale,px,pz,span){
  for(const b of OAKREST_BUILDINGS){
    if(!isNearbyMinimapPoint(b.x,b.z,px,pz,span))continue;
    const p=point(b.x,b.z);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-FACING[b.face]);
    const w=b.w*scale,d=b.d*scale;
    ctx.fillStyle=['bank','trade','hall'].includes(b.kind)?'#a5a493':b.kind==='forester'?'#809d7a':'#cfb997';
    ctx.strokeStyle='#32463e';ctx.lineWidth=Math.max(1,scale*.85);
    ctx.fillRect(-w/2,-d/2,w,d);ctx.strokeRect(-w/2,-d/2,w,d);
    ctx.restore();
    const icon={bank:'B',store:'S',forester:'F',trade:'T',hall:'H'}[b.kind];
    if(icon){
      silhouette(ctx,p.x,p.y,Math.max(5,3.7*scale),'#193c39');
      ctx.fillStyle='#f3d899';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='bold '+Math.max(9,6*scale)+'px system-ui';
      ctx.fillText(icon,p.x,p.y+.5);
    }
  }
}
function drawPlayer(ctx,size,yaw){
  const h=size/2;ctx.save();ctx.translate(h,h);ctx.rotate(yaw);
  ctx.shadowColor='#061b18';ctx.shadowBlur=5;ctx.shadowOffsetY=1;
  ctx.fillStyle='#fff4ce';ctx.strokeStyle='#113a32';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,7);ctx.lineTo(0,4);ctx.lineTo(-7,7);ctx.closePath();
  ctx.fill();ctx.stroke();ctx.restore();
}
export function drawMinimap(ctx,{x=0,z=0,yaw=0,area='world',enemies=[]},size=160){
  const span=MINIMAP_SPAN,scale=size/span,point=(wx,wz)=>mapPoint(wx,wz,x,z,size,span);
  ctx.clearRect(0,0,size,size);ctx.save();
  // Circular mask deliberately clips paths, props and hostile markers.
  ctx.beginPath();ctx.arc(size/2,size/2,size/2-1,0,Math.PI*2);ctx.clip();
  ctx.fillStyle=area==='realm'?'#414f65':area==='tutorial'?'#77876c':'#526c52';
  ctx.fillRect(0,0,size,size);
  if(area==='world'){
    drawForest(ctx,point,x,z,size,span);
    // Forest approach continues beyond the first town gate.
    drawRoad(ctx,point,[[0,-150],[0,-13]],3.1,scale,'#9f9b75');
    for(const route of OAKREST_PATHS)drawRoad(ctx,point,route,5.7,scale,'#ab9873');
    drawBuildings(ctx,point,scale,x,z,span);
    if(isNearbyMinimapPoint(OAKREST_WELL.x,OAKREST_WELL.z,x,z,span)){
      const well=point(OAKREST_WELL.x,OAKREST_WELL.z);
      silhouette(ctx,well.x,well.y,Math.max(3,2*scale),'#6b9ea4');
    }
    for(const enemy of enemies){
      if(enemy.dead||enemy.retreating||enemy.type==='dummy'||!isNearbyMinimapPoint(enemy.x,enemy.z,x,z,span))continue;
      const p=point(enemy.x,enemy.z);
      silhouette(ctx,p.x,p.y,Math.max(2.5,1.5*scale),'#c87365');
    }
  }else if(area==='tutorial'){
    ctx.strokeStyle='#c3bd94';ctx.lineWidth=3;
    ctx.strokeRect(size/2-25*scale,size/2-25*scale,50*scale,50*scale);
    silhouette(ctx,size/2-6*scale,size/2-3*scale,4,'#c9a96d');
  }else{
    silhouette(ctx,size/2,size/2,15*scale,'#53698a');
    ctx.strokeStyle='#9cc1ca';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(size/2,size/2,15*scale,0,Math.PI*2);ctx.stroke();
  }
  drawPlayer(ctx,size,Number.isFinite(yaw)?yaw:0);ctx.restore();
}
export function createOakrestMinimap(canvas,areaLabel){
  if(!canvas||!areaLabel)return {update(){}};
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return {update(){}};
  let last=-Infinity,prevSize=0,prevDpr=0;
  return {
    update(time,state){
      if(time-last<160)return;
      last=time;
      const size=Math.max(1,Math.round(canvas.getBoundingClientRect().width));
      const dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1);
      if(size!==prevSize||dpr!==prevDpr){
        canvas.width=Math.round(size*dpr);
        canvas.height=Math.round(size*dpr);
        prevSize=size;prevDpr=dpr;
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      drawMinimap(ctx,state,size);
      const name=minimapArea(state.area,state.z);
      if(areaLabel.textContent!==name)areaLabel.textContent=name;
    }
  };
}
