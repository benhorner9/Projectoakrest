/** Visual Block 1: architectural details. Decorative, no collisions.
 * Roof accents belong to the existing cutaway group, never the world root.
 */
import * as THREE from 'three';
const ringGeo=new THREE.TorusGeometry(.30,.074,4,8);
const sealGeo=new THREE.IcosahedronGeometry(.23,0);
export const BLOCK1_BUILDING_STYLES=Object.freeze({
 civic:['bank','trade','hall','guard'],
 merchant:['store','workshop','forester'],
 homestead:['home']
});
const style=kind=>Object.keys(BLOCK1_BUILDING_STYLES).find(k=>BLOCK1_BUILDING_STYLES[k].includes(kind))||'homestead';
export function addBlock1BuildingIdentity({building,index,house,roofs,mat,cube,mesh}){
 const {w,d,kind,id}=building,h=kind==='bank'||kind==='hall'?4.9:4.1;
 const family=style(kind),rise=2.65,angle=Math.atan2(rise,d/2+.5),length=Math.hypot(d/2+.5,rise);
 const decor=family==='civic'?mat.brass:family==='merchant'?mat.trim:mat.wood;
 const shingles=family==='civic'?mat.stone:family==='merchant'?mat.roofDetail:mat.darkwood;
 let parts=0;
 // Low polygon ceramic/wood inlays follow the exact old roof pitch.
 for(const side of [-1,1])for(let row=0;row<3;row++){
  const offset=(-.30+row*.30)*length;
  for(let col=-1;col<=1;col++){
   const x=col*w*.26+(row%2?w*.07:0);
   const piece=cube(roofs,shingles,x,h+1.48-side*Math.sin(angle)*offset,
    side*(d/4+.25)+Math.cos(angle)*offset,w*.19,.043,.085);
   piece.rotation.x=side*angle;parts++;
  }
 }
 for(const side of [-1,1]){
  const z=side*(d/2+.10);
  const ring=mesh(roofs,ringGeo,decor,0,h+.86,z,.95,.95,.95);
  ring.name=id+' attic roundel';parts++;
  mesh(roofs,sealGeo,mat.darkwood,0,h+.86,z+side*.09,.9,.9,.3);parts++;
 }
 // Flower-box sills sit below real windows, outside the 3.1m entry corridor.
 for(const side of [-1,1]){
  const x=side*(w/2-.99),z=d/2+.48;
  cube(house,mat.wood,x,h*.64-.54,z,1.18,.20,.40);parts++;
  if(family==='civic'){
   cube(house,mat.brass,x,h*.64-.33,z,.46,.16,.32);parts++;
  }else for(const dx of [-.30,0,.30]){
   mesh(house,sealGeo,mat.leaf,x+dx,h*.64-.34,z,.6,.65,.48);parts++;
  }
 }
 if(family!=='homestead'){
  const emblem=mesh(roofs,sealGeo,decor,0,h+2.9,0,1.24,1.25,.84);
  emblem.name=id+' ridge crest';parts++;
 }
 house.userData.block1Architecture=Object.freeze({family,parts,cutaway:true,index});
 return house.userData.block1Architecture;
}
