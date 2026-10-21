import * as THREE from 'three';
import {TREE_BY_ID} from './woodcutting.js';

/** Species-specific low-poly trees, made from cached shared geometries/materials. */
const geometries=new Map(),materials=new Map();
function geometry(kind,...args){
 const key=kind+':'+args.join(':');
 if(!geometries.has(key))geometries.set(key,kind==='cone'?
  new THREE.ConeGeometry(...args):kind==='cylinder'?
  new THREE.CylinderGeometry(...args):kind==='sphere'?
  new THREE.IcosahedronGeometry(...args):new THREE.BoxGeometry(...args));
 return geometries.get(key);
}
function material(colour){if(!materials.has(colour))materials.set(colour,new THREE.MeshLambertMaterial({color:colour,flatShading:true}));return materials.get(colour);}
function part(group,geo,colour,x,y,z,sx=1,sy=1,sz=1,rz=0){
 const mesh=new THREE.Mesh(geo,material(colour));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.z=rz;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function trunk(group,bark,h,r=0.34,x=0,z=0,lean=0){
 return part(group,geometry('cylinder',r*.86,r,h,7),bark,x,h/2,z,1,1,1,lean);
}
function crown(group,leaf,x,y,z,rx=1,ry=1,rz=1,detail=0){
 return part(group,geometry('sphere',1,detail),leaf,x,y,z,rx,ry,rz);
}
function cone(group,leaf,x,y,z,rad=1,height=2){
 return part(group,geometry('cone',rad,height,7),leaf,x,y,z);
}
/** A pivot anchored to the base allows a whole-tree fall without ground tunnelling. */
export function createWoodcuttingTree(species,heightScale=1,seed=0){
 const spec=TREE_BY_ID[species]||TREE_BY_ID.softwood;
 const group=new THREE.Group();
 const tree=new THREE.Group();group.add(tree);tree.name=spec.name+' tree';
 const h=heightScale, bark=spec.bark,fol=spec.leaves;
 if(spec.shape==='round'){
  trunk(tree,bark,3.05*h,.28*h);
  crown(tree,fol,0,3.5*h,0,1.28*h,1.14*h,1.16*h,1);
  crown(tree,'#92b97c',-.53*h,3.18*h,.24*h,.70*h,.79*h,.65*h);
 }else if(spec.shape==='pine'){
  trunk(tree,bark,5*h,.22*h);
  for(let i=0;i<4;i++)cone(tree,i%2?'#315d43':fol,0,(3.15+i*.65)*h,0,(1.34-i*.21)*h,2.65*h);
 }else if(spec.shape==='oak'){
  trunk(tree,bark,3.8*h,.54*h);
  for(let i=0;i<4;i++){
   const theta=(i/4)*Math.PI*2+seed;
   const b=part(tree,geometry('cylinder',.14,.22,2.2,6),bark,Math.cos(theta)*.9*h,3.2*h,Math.sin(theta)*.8*h,1,1,1,-Math.cos(theta)*.58);
   b.rotation.x=Math.sin(theta)*.38;
   crown(tree,i%2?'#547d43':fol,Math.cos(theta)*1.5*h,4.25*h,Math.sin(theta)*1.4*h,1.4*h,1.23*h,1.3*h,1);
  }
  crown(tree,fol,0,4.62*h,0,1.65*h,1.24*h,1.6*h,1);
 }else if(spec.shape==='willow'){
  trunk(tree,bark,4.0*h,.31*h,0,0,.08);
  crown(tree,'#789e66',0,4.6*h,0,1.3*h,.63*h,1.4*h,1);
  for(let i=0;i<12;i++){
   const a=i*Math.PI*2/12+seed;
   const x=Math.cos(a)*1.2*h,z=Math.sin(a)*1.2*h;
   part(tree,geometry('cylinder',.025,.065,2.35*h,5),bark,x,3.2*h,z,1,1,1,Math.cos(a)*.20);
   crown(tree,fol,x*1.10,2.63*h,z*1.10,.22*h,1.26*h,.24*h,0);
  }
 }else if(spec.shape==='ironbark'){
  trunk(tree,bark,4.25*h,.65*h);
  for(let i=0;i<7;i++){
   const a=i*2*Math.PI/7+seed;
   const p=part(tree,geometry('box',1,1,1),i%2?'#4b4c49':'#282e2f',
     Math.cos(a)*.56*h,1.55*h,Math.sin(a)*.53*h,.13*h,2.7*h,.17*h);
   p.rotation.y=a;
  }
  for(let i=0;i<5;i++){
   const a=i*2*Math.PI/5;
   crown(tree,fol,Math.cos(a)*1.08*h,4.1*h,Math.sin(a)*1.08*h,1.05*h,.89*h,.94*h,1);
  }
  crown(tree,'#536b55',0,4.75*h,0,1.25*h,1.1*h,1.2*h,1);
 }else if(spec.shape==='moonwood'){
  trunk(tree,bark,4.25*h,.33*h);
  for(let i=0;i<5;i++){
   const a=i*2*Math.PI/5+seed;
   part(tree,geometry('cylinder',.09,.15,2.5*h,6),'#c7d5ca',
     Math.cos(a)*.64*h,3.52*h,Math.sin(a)*.63*h,1,1,1,-Math.cos(a)*.38);
   crown(tree,i%2?'#aacad0':fol,Math.cos(a)*1.1*h,4.7*h,Math.sin(a)*1.1*h,
     .65*h,1.2*h,.65*h,1);
  }
  crown(tree,'#d6dbcd',0,5.12*h,0,.83*h,.87*h,.86*h);
 }else if(spec.shape==='elderwood'){
  trunk(tree,bark,5.4*h,.75*h,.2*h,0,-.055);
  part(tree,geometry('cylinder',.54,.78,2.1*h,7),'#473b40',-.47*h,1.26*h,0,1,1,1,-.34);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3+seed;
   const cx=Math.cos(a)*1.6*h,cz=Math.sin(a)*1.5*h;
   const branch=part(tree,geometry('cylinder',.15,.29,3.3*h,7),bark,cx*.55,4.6*h,cz*.55,1,1,1,-Math.cos(a)*.65);
   branch.rotation.x=Math.sin(a)*.57;
   crown(tree,i%2?'#796887':fol,cx,5.5*h,cz,1.16*h,1.1*h,1.04*h,1);
  }
  crown(tree,fol,0,6.1*h,0,1.3*h,1.08*h,1.25*h,1);
 }
 group.userData.woodcuttingSpecies=spec.id;
 return group;
}
