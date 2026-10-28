/** Stable, collision-free decorative scatter for Oakrest's Classic ground.
 * Details never change movement, targets, minimap, saves or interaction areas.
 */
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from './classic-town-plan.js';
import {OAKREST_BUILDINGS,OAKREST_WELL} from './town-layout.js';

const random01=(index,salt)=>{
 let n=(Math.imul(index+salt*101,1664525)+1013904223)>>>0;
 n^=n>>>16;n=Math.imul(n,2246822519);n^=n>>>13;
 return (n>>>0)/4294967296;
};
const distanceSquaredToSegment=(x,z,a,b)=>{
 const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
 const t=den?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/den)):0;
 return (x-a[0]-dx*t)**2+(z-a[1]-dz*t)**2;
};
/** Returns only safe grassland locations. No work is performed per frame. */
export function classicDetailAllowed(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>53||z<-28||z>96)return false;
 // Keep roads, their verges and village-gate approaches completely clear.
 for(const path of CLASSIC_ROADS)for(let j=1;j<path.length;j++)
  if(distanceSquaredToSegment(x,z,path[j-1],path[j])<3.8**2)return false;
 for(const plaza of CLASSIC_PLAZAS)
  if(Math.abs(x-plaza.x)<plaza.w*.59+1.4&&Math.abs(z-plaza.z)<plaza.d*.59+1.4)return false;
 for(const building of OAKREST_BUILDINGS){
  const exclusion=Math.hypot(building.w,building.d)*.5+1.1;
  if((x-building.x)**2+(z-building.z)**2<exclusion**2)return false;
 }
 if((x-OAKREST_WELL.x)**2+(z-OAKREST_WELL.z)**2<5**2)return false;
 return true;
}
export function generateClassicGroundDetails(samples=840){
 const output={grass:[],flowers:[],stones:[]};
 for(let i=0;i<samples;i++){
  const x=-53+106*random01(i,1),z=-28+124*random01(i,2);
  if(!classicDetailAllowed(x,z))continue;
  const item={x,z,rotation:random01(i,4)*Math.PI*2,scale:.65+random01(i,5)*.85,tint:random01(i,6)};
  if(i%13===0)output.flowers.push(item);
  else if(i%9===0)output.stones.push(item);
  else output.grass.push(item);
 }
 return output;
}
