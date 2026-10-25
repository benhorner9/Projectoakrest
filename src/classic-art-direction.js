/** Rebirth woodland palette and deterministic terrain grammar.
 * Presentation data only: no collision, item or saved progression changes.
 */
export const OAKREST_PALETTE=Object.freeze({
 meadow:'#637c55',fern:'#72845b',moss:'#4e684c',earth:'#736850',
 path:'#95866a',verge:'#77805b',stone:'#87918a',bark:'#504636',
 bronze:'#b49b65',sky:'#c1cabb',sun:'#ffe7bb',shade:'#526b62'
});
export function terrainVariation(x,z){
 return Math.max(0,Math.min(1,.5+Math.sin(x*.13+Math.sin(z*.09))*.23+Math.cos(z*.17-x*.05)*.19));
}
export function classicPixelRatio(width,height,dpr=1){
 const pixels=Math.max(1,width)*Math.max(1,height);
 return Math.max(.75,Math.min(Number.isFinite(dpr)?Math.max(.75,dpr):1,1.5,Math.sqrt(1500000/pixels)));
}
/** Road centres and widths stay navigable; only the edge develops a soft verge. */
export function organicRoadPolygons(paths,width=4.1){
 const quads=[];
 for(const path of paths)for(let i=1;i<path.length;i++){
  const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
  if(!len)continue;
  const nx=-dz/len,nz=dx/len,steps=Math.max(1,Math.ceil(len/2));
  const edge=t=>{const x=ax+dx*t,z=az+dz*t;const r=width/2+Math.sin(x*.7+z*.5)*.16;return [[x+nx*r,z+nz*r],[x-nx*r,z-nz*r]];};
  for(let j=0;j<steps;j++){const a=edge(j/steps),b=edge((j+1)/steps);quads.push([a[0],b[0],b[1],a[1]]);}
 }
 return quads;
}
export function plazaOutline(p){
 const cut=1.6;
 return [[p.x-p.w/2+cut,p.z-p.d/2],[p.x+p.w/2-cut,p.z-p.d/2],
 [p.x+p.w/2,p.z-p.d/2+cut],[p.x+p.w/2,p.z+p.d/2-cut],
 [p.x+p.w/2-cut,p.z+p.d/2],[p.x-p.w/2+cut,p.z+p.d/2],
 [p.x-p.w/2,p.z+p.d/2-cut],[p.x-p.w/2,p.z-p.d/2+cut]];
}
