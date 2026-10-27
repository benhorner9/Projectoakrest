import * as THREE from 'three';
import {generateClassicGroundDetails} from './classic-ground-detail.js';

/** Three instanced draws give the environment a woodland floor without billboards,
 * texture downloads, transparent overdraw or per-frame allocation. */
export function addClassicGroundDetails(root){
 const data=generateClassicGroundDetails();
 const blade=new THREE.BufferGeometry();
 blade.setAttribute('position',new THREE.Float32BufferAttribute([
  -.18,0,0,0,.58,0,.18,0,0,
  0,0,-.18,0,.47,0,0,0,.18
 ],3));blade.computeVertexNormals();
 const materials={
  grass:new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide}),
  flowers:new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true}),
  stones:new THREE.MeshLambertMaterial({color:'#ffffff',flatShading:true})
 };
 const shapes={grass:blade,flowers:new THREE.TetrahedronGeometry(.13,0),stones:new THREE.IcosahedronGeometry(.2,0)};
 const colors={
  grass:['#71945b','#789a65','#9da96b','#597d54'],
  flowers:['#ead6a2','#e9bd97','#c6caa3','#b2c7c5'],
  stones:['#9ca495','#b4aa91','#7d8e84','#a49b8b']
 };
 const dummy=new THREE.Object3D();
 for(const kind of ['grass','flowers','stones']){
  const positions=data[kind];if(!positions.length)continue;
  const instances=new THREE.InstancedMesh(shapes[kind],materials[kind],positions.length);
  instances.name='classic-ground-'+kind;
  for(let i=0;i<positions.length;i++){
   const p=positions[i],scale=p.scale;
   dummy.position.set(p.x,kind==='flowers'?.23:kind==='stones'?.085:.025,p.z);
   dummy.rotation.set(0,p.rotation,0);
   dummy.scale.set(scale,kind==='stones'?scale*.43:scale,scale);
   dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);
   instances.setColorAt(i,new THREE.Color(colors[kind][Math.floor(p.tint*colors[kind].length)]));
  }
  instances.instanceMatrix.needsUpdate=true;
  instances.computeBoundingSphere();root.add(instances);
 }
 return {grass:data.grass.length,flowers:data.flowers.length,stones:data.stones.length};
}
