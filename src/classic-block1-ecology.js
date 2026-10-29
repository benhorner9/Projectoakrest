/** Visual Block 1: stable, collision-free vegetation in town and forest. */
import * as THREE from 'three';
import {classicDetailAllowed} from './classic-ground-detail.js';
import {OAKREST_GROVES} from './town-services.js';
import {ADVENTURE_PATHS,ADVENTURE_TARGETS,ADVENTURE_TREES} from './adventure-content.js';
const rand=(n,salt)=>{
 let x=(Math.imul(n+salt*97,1664525)+1013904223)|0;
 x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;
 return (x>>>0)/4294967296;
};
const near=(x,z,points,r)=>points.some(p=>Math.hypot(x-p.x,z-p.z)<r);
const dist=(x,z,a,b)=>{
 const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;
 const t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;
 return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
};
export function block1EcologyAllowed(zone,x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 if(zone==='town')return classicDetailAllowed(x,z)&&!near(x,z,OAKREST_GROVES,2.9);
 if(zone!=='woodland'||Math.abs(x)>43||z<95||z>190)return false;
 if(near(x,z,ADVENTURE_TREES,3)||near(x,z,ADVENTURE_TARGETS,5.6))return false;
 for(const path of ADVENTURE_PATHS){
  if(path[0][1]>=195)continue;
  for(let k=1;k<path.length;k++)if(dist(x,z,path[k-1],path[k])<4.8)return false;
 }
 return true;
}
/** Pure and seeded. Paths, NPCs, resource targets and save data are unaffected. */
export function generateBlock1Ecology(zone,samples=zone==='town'?490:820){
 if(!['town','woodland'].includes(zone))throw Error('Invalid ecology zone');
 const result={shrub:[],fern:[],leaf:[],pebble:[]};
 for(let i=0;i<Math.max(0,Math.min(1500,Math.floor(samples)));i++){
  const x=(zone==='town'?-52:-43)+(zone==='town'?104:86)*rand(i,1);
  const z=(zone==='town'?-26:95)+(zone==='town'?120:95)*rand(i,2);
  if(!block1EcologyAllowed(zone,x,z))continue;
  const type=i%13===0?'shrub':i%7===0?'pebble':i%3===0?'leaf':'fern';
  result[type].push({x,z,scale:.62+rand(i,5)*.50,angle:rand(i,6)*Math.PI*2,tint:rand(i,7)});
 }
 return result;
}
export function addBlock1Ecology(root,zone){
 const scatter=generateBlock1Ecology(zone),group=new THREE.Group();
 group.name='oakrest-'+zone+'-environment-dressing';
 root.add(group);
 const colors={
  shrub:['#456b50','#5c835b','#385c46'],
  fern:['#688b60','#80a373','#567851'],
  leaf:['#ab936a','#b6a17b','#867d58'],
  pebble:['#929a89','#b1ae99','#778a80']
 };
 const geometries={
  shrub:new THREE.IcosahedronGeometry(.54,0),
  fern:new THREE.ConeGeometry(.42,.85,5),
  leaf:new THREE.TetrahedronGeometry(.26,0),
  pebble:new THREE.IcosahedronGeometry(.32,0)
 };
 const dummy=new THREE.Object3D(),counts={};
 for(const kind of ['shrub','fern','leaf','pebble']){
  const items=scatter[kind];counts[kind]=items.length;
  if(!items.length)continue;
  const mat=new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(geometries[kind],mat,items.length);
  mesh.name='oakrest-'+zone+'-'+kind+'-scatter';mesh.castShadow=false;
  mesh.userData.decorativeOnly=true;
  for(let i=0;i<items.length;i++){
   const p=items[i],small=kind==='leaf'?.16:kind==='pebble'?.45:1;
   dummy.position.set(p.x,(kind==='shrub'?.33:kind==='fern'?.39:kind==='leaf'?.03:.085)*p.scale,p.z);
   dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.scale,p.scale*small,p.scale);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   mesh.setColorAt(i,new THREE.Color(colors[kind][Math.floor(p.tint*colors[kind].length)]));
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.computeBoundingSphere();group.add(mesh);
 }
 group.userData.counts=counts;
 return {root:group,counts,draws:group.children.length};
}
