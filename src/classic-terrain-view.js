import * as THREE from 'three';
import {OAKREST_PALETTE as P,terrainVariation,organicRoadPolygons,plazaOutline} from './classic-art-direction.js';
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from './classic-town-plan.js';

export function groundPolygons(polygons,y,color){
 const vertices=[];
 for(const points of polygons)for(let i=1;i<points.length-1;i++)
  for(const [x,z] of [points[0],points[i],points[i+1]])vertices.push(x,y,z);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
 return new THREE.Mesh(g,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
}
export function createClassicTerrain(root){
 const geometry=new THREE.PlaneGeometry(115,130,46,52);geometry.rotateX(-Math.PI/2);geometry.translate(0,-.025,34);
 const positions=geometry.attributes.position,colors=[],a=new THREE.Color(P.moss),b=new THREE.Color(P.fern);
 for(let i=0;i<positions.count;i++){
  const c=a.clone().lerp(b,terrainVariation(positions.getX(i),positions.getZ(i)));
  colors.push(c.r,c.g,c.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 root.add(new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true})));
 root.add(groundPolygons(organicRoadPolygons(CLASSIC_ROADS,5.5),.005,P.verge));
 root.add(groundPolygons(organicRoadPolygons(CLASSIC_ROADS),.012,P.path));
 root.add(groundPolygons(CLASSIC_PLAZAS.map(plazaOutline),.025,P.earth));
 // Small inset stones form broken paths across the square, leaving moss seams.
 // A single instance batch keeps the decoration cheap on tablet GPUs.
 const stones=[];
 for(const p of CLASSIC_PLAZAS)for(let x=-p.w/2+2;x<p.w/2-1;x+=1.5)
  for(let z=-p.d/2+2;z<p.d/2-1;z+=1.5)
   if(terrainVariation(x+p.x,z+p.z)>.35)stones.push([x+p.x,z+p.z]);
 const slabs=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.035,1),new THREE.MeshLambertMaterial({color:P.path}),stones.length);
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1.34,1,1.34);
 stones.forEach(([x,z],i)=>{rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.sin(x+z)*.035);matrix.compose(new THREE.Vector3(x,.052,z),rotation,scale);slabs.setMatrixAt(i,matrix);});
 slabs.computeBoundingSphere();root.add(slabs);
 return {ground:geometry,stones:stones.length};
}
