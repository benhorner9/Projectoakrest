/** Hand-painted Classic town terrain for both the 3D surface and cartography.
 * All centres come from the *real* town navigation plan, not a decorative clone.
 * The village commons are soft, irregular worn-earth clearings, never rectangular
 * slabs. No baked image assets, randomness at runtime or shaders on iPad.
 */
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from './classic-town-plan.js';

export const CLASSIC_TERRAIN_BOUNDS=Object.freeze({minX:-57.5,maxX:57.5,minZ:-31,maxZ:99});
export const TOWN_TRAIL_WIDTH=4.1;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const hash=(a,b)=>{let n=(Math.imul(a,73856093)^Math.imul(b,19349663))|0;
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};

/** Stable world-space flecks. Subtle variation means the ground is not flat
 * grass coloured square tiles; it also avoids costly per-frame material work. */
export function paintTownGrass(ctx,project,scale,detail=true){
 const b=CLASSIC_TERRAIN_BOUNDS,unit=Math.max(.5,scale);
 ctx.fillStyle='#69875e';
 ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
 if(!detail)return;
 for(let z=b.minZ;z<=b.maxZ;z+=1.8)for(let x=b.minX;x<=b.maxX;x+=1.8){
  const n=hash(Math.round(x*4),Math.round(z*4));
  const p=project({x:x+(n-.5)*1.6,z:z+(hash(Math.round(x*9),Math.round(z*9))-.5)*1.6});
  const size=(.2+n*.7)*unit;
  ctx.fillStyle=n<.37?'#86a06c':n>.78?'#526f50':'#748e62';
  ctx.globalAlpha=.08+n*.15;
  ctx.fillRect(p.x-size/2,p.y-size/2,size,size*.7);
 }
 ctx.globalAlpha=1;
}
function line(ctx,points,project){
 if(!points.length)return;
 const first=project({x:points[0][0],z:points[0][1]});
 ctx.beginPath();ctx.moveTo(first.x,first.y);
 for(let i=1;i<points.length;i++){
  const [x,z]=points[i],q=project({x,z});
  // Lightly rounded joins, no rect joins along the main street or at corners.
  if(i<points.length-1){
   const [nx,nz]=points[i+1],np=project({x:nx,z:nz});
   ctx.quadraticCurveTo(q.x,q.y,(q.x+np.x)/2,(q.y+np.y)/2);
  }else ctx.lineTo(q.x,q.y);
 }
}
function wornCommon(ctx,project,scale,p,index){
 const centre=project(p),rX=p.w*.58*scale,rZ=p.d*.58*scale;
 const point=(j,r=1)=>{
  const a=(j/36)*Math.PI*2;
  const wave=1+.08*Math.sin(a*3+index*.8)+.045*Math.cos(a*7+index);
  return {x:centre.x+Math.cos(a)*rX*wave*r,y:centre.y+Math.sin(a)*rZ*wave*r};
 };
 ctx.save();
 const grad=ctx.createRadialGradient(centre.x,centre.y,0,centre.x,centre.y,Math.max(rX,rZ));
 grad.addColorStop(0,'rgba(184,159,112,.42)');
 grad.addColorStop(.66,'rgba(185,164,121,.32)');
 grad.addColorStop(1,'rgba(178,156,106,.08)');
 ctx.fillStyle=grad;
 ctx.beginPath();
 for(let j=0;j<=36;j++){const v=point(j);if(j)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);}
 ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(93,105,73,.10)';ctx.lineWidth=.7*scale;ctx.stroke();
 ctx.restore();
}
/** Common painter: terrain art tracks the same shared paths and commons as
 * collision/navigation and the minimap, with no rectangular plaza meshes.
 * @param {{detail?:boolean}} options */
export function paintTownTrails(ctx,project,scale,{detail=false}={}){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 // Paths have muted irregular outlines and a sunken earth centre rather than
 // rows of paving rectangles. The darker verge naturally blends into grass.
 for(const path of CLASSIC_ROADS){
  if(path.length<2)continue;
  line(ctx,path,project);
  ctx.strokeStyle='rgba(79,89,64,.32)';ctx.lineWidth=(TOWN_TRAIL_WIDTH+1.25)*scale;ctx.stroke();
  line(ctx,path,project);
  ctx.strokeStyle='#a79772';ctx.lineWidth=(TOWN_TRAIL_WIDTH-.2)*scale;ctx.stroke();
  line(ctx,path,project);
  ctx.strokeStyle='rgba(202,179,131,.38)';ctx.lineWidth=(TOWN_TRAIL_WIDTH-1.4)*scale;ctx.stroke();
 }
 CLASSIC_PLAZAS.forEach((p,i)=>wornCommon(ctx,project,scale,p,i));
 if(detail){
  // Sparse native grass drifting across the edges makes the path fade into
  // the meadow. The placement is deterministic across builds / zoom levels.
  for(let i=0;i<480;i++){
   const x=CLASSIC_TERRAIN_BOUNDS.minX+hash(i,101)*115;
   const z=CLASSIC_TERRAIN_BOUNDS.minZ+hash(i,457)*130;
   const t=project({x,z}),size=.15+hash(i,211)*.32;
   ctx.globalAlpha=.16;
   ctx.fillStyle=hash(i,30)>.5?'#c8b98a':'#4f7b50';
   ctx.fillRect(t.x,t.y,size*scale,size*.56*scale);
  }
 }
 ctx.restore();
}
export function townTerrainPointToTexture({x,z},width,height){
 const b=CLASSIC_TERRAIN_BOUNDS;
 return {x:clamp((x-b.minX)/(b.maxX-b.minX),-1,2)*width,
  y:clamp((z-b.minZ)/(b.maxZ-b.minZ),-1,2)*height};
}
