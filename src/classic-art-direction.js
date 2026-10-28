/** Rebirth woodland palette and deterministic terrain grammar.
 * Presentation data only: no collision, item or saved progression changes.
 */
export const OAKREST_PALETTE=Object.freeze({
 meadow:'#6b885b',fern:'#78976b',moss:'#546f54',earth:'#9c825e',
 path:'#b29a77',verge:'#777f62',stone:'#a4a592',bark:'#504636',
 bronze:'#b49b65',sky:'#c1cabb',sun:'#ffe7bb',shade:'#526b62',
 packed:'#927a5e',trail:'#a78b68',gravel:'#c9b99b',ruts:'#9f896c'
});
/** Seamless two-dimensional value noise gives natural meadows rather than tiled triangles. */
const fract=x=>x-Math.floor(x);
const noiseHash=(x,z)=>fract(Math.sin(x*127.1+z*311.7+72.6)*43758.5453123);
function softNoise(x,z){
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
 const sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
 const a=noiseHash(ix,iz)*(1-sx)+noiseHash(ix+1,iz)*sx;
 const b=noiseHash(ix,iz+1)*(1-sx)+noiseHash(ix+1,iz+1)*sx;
 return a*(1-sz)+b*sz;
}
export function terrainVariation(x,z){
 const hills=softNoise(x/32,z/32),patches=softNoise(x/13+7,z/13-3),grain=softNoise(x/5.5,z/5.5);
 return Math.max(0,Math.min(1,hills*.5+patches*.35+grain*.15));
}
export function terrainPatch(x,z){return softNoise(x/19+12,z/19-8);}
export function classicPixelRatio(width,height,dpr=1){
 const pixels=Math.max(1,width)*Math.max(1,height);
 return Math.max(.75,Math.min(Number.isFinite(dpr)?Math.max(.75,dpr):1,1.5,Math.sqrt(1500000/pixels)));
}
/** Road centres and widths stay navigable; only the edge develops a soft verge. */
/** Continuous tapered strip, using shared corner normals so roads do not fracture at turns. */
export function organicRoadPolygons(paths,width=4.1){
 const quads=[];
 for(const path of paths){
  if(!Array.isArray(path)||path.length<2)continue;
  const normals=path.slice(1).map(([x,z],i)=>{
   const dx=x-path[i][0],dz=z-path[i][1],length=Math.hypot(dx,dz)||1;
   return {x:-dz/length,z:dx/length};
  });
  const corners=path.map((_,i)=>{
   const a=normals[Math.max(0,i-1)],b=normals[Math.min(normals.length-1,i)];
   const x=a.x+b.x,z=a.z+b.z,length=Math.hypot(x,z)||1;
   return {x:x/length,z:z/length};
  });
  for(let i=1;i<path.length;i++){
   const [ax,az]=path[i-1],[bx,bz]=path[i],len=Math.hypot(bx-ax,bz-az);
   if(len<.0001)continue;
   const steps=Math.max(1,Math.ceil(len/2));
   const edge=t=>{
    const x=ax+(bx-ax)*t,z=az+(bz-az)*t;
    const normalX=corners[i-1].x*(1-t)+corners[i].x*t;
    const normalZ=corners[i-1].z*(1-t)+corners[i].z*t;
    const scale=Math.hypot(normalX,normalZ)||1;
    const weave=(terrainVariation(x*.9+11,z*.9-13)-.5)*.17;
    const r=width/2+weave;
    return [[x+normalX/scale*r,z+normalZ/scale*r],
            [x-normalX/scale*r,z-normalZ/scale*r]];
   };
   for(let j=0;j<steps;j++){
    const first=edge(j/steps),last=edge((j+1)/steps);
    quads.push([first[0],last[0],last[1],first[1]]);
   }
  }
 }
 return quads;
}
/** Irregular gravel inlay and barely-visible wheel-wear; bounded static geometry. */
export function trailDetailPolygons(paths){
 const gravel=[],worn=[];
 let seed=0;
 for(const path of paths)for(let i=1;i<path.length;i++){
  const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az;
  const length=Math.hypot(dx,dz);if(length<1)continue;
  const tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
  for(let d=2.5;d<length-2.0;d+=4.1){
   const index=seed++,jitter=terrainVariation(index*6.37,index*3.71);
   if(jitter<.31)continue;
   const offset=(jitter-.5)*3.8,x=ax+tx*d+nx*offset,z=az+tz*d+nz*offset;
   const along=.18+jitter*.32,across=.1+jitter*.10;
   gravel.push([[x-tx*along-nx*across,z-tz*along-nz*across],
    [x+tx*along-nx*across,z+tz*along-nz*across],
    [x+tx*along+nx*across,z+tz*along+nz*across],
    [x-tx*along+nx*across,z-tz*along+nz*across]]);
   if(index%7===0){
    const rx=ax+tx*(d+1.3)+nx*.92,rz=az+tz*(d+1.3)+nz*.92;
    worn.push([[rx-tx*.85-nx*.08,rz-tz*.85-nz*.08],
     [rx+tx*.85-nx*.08,rz+tz*.85-nz*.08],
     [rx+tx*.85+nx*.08,rz+tz*.85+nz*.08],
     [rx-tx*.85+nx*.08,rz-tz*.85+nz*.08]]);
   }
  }
 }
 return {gravel,worn};
}
/** Natural packed-earth gathering spaces. Shape is shared by the live
 * 3D mesh and world map so neither displays old octagonal floor blocks. */
export function plazaOutline(p){
 const count=28,rx=p.w*.56,rz=p.d*.56;
 return Array.from({length:count},(_,i)=>{
  const angle=i*Math.PI*2/count;
  const taper=1+.065*Math.sin(angle*3+p.x*.04)+.038*Math.cos(angle*7+p.z*.05);
  return [p.x+Math.cos(angle)*rx*taper,p.z+Math.sin(angle)*rz*taper];
 });
}
